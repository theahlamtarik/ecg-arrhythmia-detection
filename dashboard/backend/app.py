"""
ECG Arrhythmia Detection - Professional Backend API
ResNet-18 + CBAM with Grad-CAM Visualization
"""

import os
import io
import base64
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import resnet18, ResNet18_Weights
from pyts.image import GramianAngularField
from sklearn.metrics import pairwise_distances
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import cv2

# Get absolute path to public folder
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BACKEND_DIR, '..', 'public')

app = Flask(__name__, static_folder=PUBLIC_DIR, static_url_path='')
CORS(app)

# Configuration
CONFIG = {
    'image_size': 64,
    'num_classes': 5,
    'dropblock_size': 7,
    'dropblock_prob': 0.15,
    'stochastic_depth_prob': 0.2,
}

CLASS_NAMES = ['Normal (N)', 'Supraventricular (S)', 'Ventricular (V)', 'Fusion (F)', 'Unknown (Q)']
CLASS_COLORS = ['#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B']
CLASS_DESCRIPTIONS = [
    'Normal sinus rhythm - Regular heartbeat pattern',
    'Supraventricular ectopic beat - Abnormal beat originating above ventricles',
    'Ventricular ectopic beat - Abnormal beat originating in ventricles',
    'Fusion beat - Combination of normal and ectopic beat',
    'Unknown/Unclassifiable beat - Requires further analysis'
]

# Device setup
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"[INFO] Using device: {device}")

# ============ MODEL ARCHITECTURE ============

class ChannelAttention(nn.Module):
    def __init__(self, channels, reduction=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(
            nn.Conv2d(channels, channels // reduction, 1, bias=False),
            nn.ReLU(),
            nn.Conv2d(channels // reduction, channels, 1, bias=False)
        )
        self.sigmoid = nn.Sigmoid()
    
    def forward(self, x):
        return self.sigmoid(self.fc(self.avg_pool(x)) + self.fc(self.max_pool(x)))


class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super().__init__()
        self.conv = nn.Conv2d(2, 1, kernel_size, padding=kernel_size//2, bias=False)
        self.sigmoid = nn.Sigmoid()
    
    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        return self.sigmoid(self.conv(torch.cat([avg_out, max_out], dim=1)))


class CBAM(nn.Module):
    def __init__(self, channels, reduction=16):
        super().__init__()
        self.ca = ChannelAttention(channels, reduction)
        self.sa = SpatialAttention()
    
    def forward(self, x):
        x = x * self.ca(x)
        x = x * self.sa(x)
        return x


class DropBlock2D(nn.Module):
    def __init__(self, block_size=7, drop_prob=0.15):
        super().__init__()
        self.block_size = block_size
        self.drop_prob = drop_prob
    
    def forward(self, x):
        if not self.training or self.drop_prob == 0:
            return x
        gamma = self.drop_prob / (self.block_size ** 2)
        gamma *= (x.shape[-1] ** 2) / ((x.shape[-1] - self.block_size + 1) ** 2)
        mask = (torch.rand_like(x[:, :1, :, :]) < gamma).float()
        mask = F.max_pool2d(mask, kernel_size=(self.block_size, self.block_size),
                           stride=1, padding=self.block_size // 2)
        mask = 1 - mask
        normalize = mask.numel() / (mask.sum() + 1e-8)
        return x * mask * normalize


class ResNetCBAM_Enhanced(nn.Module):
    def __init__(self, num_classes=5, dropblock_prob=0.15, stochastic_depth_prob=0.2):
        super().__init__()
        self.backbone = resnet18(weights=ResNet18_Weights.IMAGENET1K_V1)
        
        self.cbam1 = CBAM(64)
        self.cbam2 = CBAM(128)
        self.cbam3 = CBAM(256)
        self.cbam4 = CBAM(512)
        
        self.dropblock3 = DropBlock2D(block_size=7, drop_prob=dropblock_prob * 0.5)
        self.dropblock4 = DropBlock2D(block_size=7, drop_prob=dropblock_prob)
        
        self.survival_probs = [1.0 - stochastic_depth_prob * (i / 4) for i in range(1, 5)]
        
        # Classification head (matching checkpoint structure: fc.1, fc.4, fc.6)
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(in_features, 256),  # fc.1
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),  # fc.4
            nn.ReLU(),
            nn.Linear(128, num_classes)  # fc.6
        )
        
        # Store feature maps for Grad-CAM
        self.feature_maps = {}
        self.gradients = {}
    
    def save_gradient(self, name):
        def hook(grad):
            self.gradients[name] = grad
        return hook
    
    def forward(self, x, return_features=False):
        x = self.backbone.conv1(x)
        x = self.backbone.bn1(x)
        x = self.backbone.relu(x)
        x = self.backbone.maxpool(x)
        
        x = self.backbone.layer1(x)
        x = self.cbam1(x)
        
        x = self.backbone.layer2(x)
        x = self.cbam2(x)
        
        x = self.backbone.layer3(x)
        x = self.cbam3(x)
        
        x = self.backbone.layer4(x)
        x = self.cbam4(x)
        
        # Store features for Grad-CAM
        if return_features:
            self.feature_maps['layer4'] = x
            if x.requires_grad:
                x.register_hook(self.save_gradient('layer4'))
        
        pooled = self.backbone.avgpool(x)
        flat = torch.flatten(pooled, 1)
        out = self.backbone.fc(flat)
        
        return out


# ============ ENCODING FUNCTIONS ============

gaf = GramianAngularField(image_size=CONFIG['image_size'], method='summation')

def create_rp(signal, size):
    """Create Recurrence Plot"""
    idx = np.linspace(0, len(signal)-1, size).astype(int)
    s = signal[idx].reshape(-1, 1)
    D = pairwise_distances(s, metric='euclidean')
    return (D < np.percentile(D, 20)).astype(float)

def create_mtf(signal, size, n_bins=5):
    """Create Markov Transition Field"""
    bins = np.percentile(signal, np.linspace(0, 100, n_bins + 1))
    digitized = np.clip(np.digitize(signal, bins[:-1]) - 1, 0, n_bins - 1)
    trans = np.zeros((n_bins, n_bins))
    for i in range(len(digitized) - 1):
        trans[digitized[i], digitized[i+1]] += 1
    trans = trans / (trans.sum(axis=1, keepdims=True) + 1e-8)
    idx = np.linspace(0, len(digitized)-1, size).astype(int)
    mtf = np.zeros((size, size))
    for i in range(size):
        for j in range(size):
            mtf[i, j] = trans[digitized[idx[i]], digitized[idx[j]]]
    return mtf

def encode_signal(signal):
    """Encode 1D signal to 3-channel image (GAF + RP + MTF)"""
    gaf_img = gaf.transform(signal.reshape(1, -1))[0]
    rp_img = create_rp(signal, CONFIG['image_size'])
    mtf_img = create_mtf(signal, CONFIG['image_size'])
    return gaf_img, rp_img, mtf_img


# ============ VISUALIZATION FUNCTIONS ============

def fig_to_base64(fig):
    """Convert matplotlib figure to base64 string"""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', 
                facecolor='#1a1a2e', edgecolor='none')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return f"data:image/png;base64,{img_str}"

def plot_signal(signal):
    """Plot ECG signal"""
    fig, ax = plt.subplots(figsize=(12, 3))
    ax.set_facecolor('#1a1a2e')
    fig.patch.set_facecolor('#1a1a2e')
    
    x = np.arange(len(signal))
    ax.plot(x, signal, color='#00d4ff', linewidth=1.2, alpha=0.9)
    ax.fill_between(x, signal, alpha=0.1, color='#00d4ff')
    
    ax.set_xlabel('Sample', color='#e0e0e0', fontsize=10)
    ax.set_ylabel('Amplitude', color='#e0e0e0', fontsize=10)
    ax.set_title('ECG Signal Waveform', color='#ffffff', fontsize=12, fontweight='bold')
    ax.tick_params(colors='#a0a0a0')
    ax.grid(True, alpha=0.2, color='#404040')
    
    for spine in ax.spines.values():
        spine.set_color('#404040')
    
    return fig_to_base64(fig)

def plot_encoding(gaf_img, rp_img, mtf_img):
    """Plot encoding pipeline"""
    fig, axes = plt.subplots(1, 3, figsize=(12, 4))
    fig.patch.set_facecolor('#1a1a2e')
    
    titles = ['Gramian Angular Field (GAF)', 'Recurrence Plot (RP)', 'Markov Transition Field (MTF)']
    images = [gaf_img, rp_img, mtf_img]
    cmaps = ['viridis', 'plasma', 'inferno']
    
    for ax, img, title, cmap in zip(axes, images, titles, cmaps):
        ax.set_facecolor('#1a1a2e')
        im = ax.imshow(img, cmap=cmap, aspect='auto')
        ax.set_title(title, color='#ffffff', fontsize=11, fontweight='bold', pad=10)
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_color('#404040')
    
    plt.tight_layout()
    return fig_to_base64(fig)

def plot_fusion_image(gaf_img, rp_img, mtf_img):
    """Plot the fused 3-channel image"""
    fig, ax = plt.subplots(figsize=(5, 5))
    fig.patch.set_facecolor('#1a1a2e')
    ax.set_facecolor('#1a1a2e')
    
    # Normalize each channel
    gaf_norm = (gaf_img - gaf_img.min()) / (gaf_img.max() - gaf_img.min() + 1e-8)
    rp_norm = (rp_img - rp_img.min()) / (rp_img.max() - rp_img.min() + 1e-8)
    mtf_norm = (mtf_img - mtf_img.min()) / (mtf_img.max() - mtf_img.min() + 1e-8)
    
    # Create RGB image
    rgb_img = np.stack([gaf_norm, rp_norm, mtf_norm], axis=-1)
    
    ax.imshow(rgb_img)
    ax.set_title('Fused 3-Channel Input', color='#ffffff', fontsize=12, fontweight='bold')
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_color('#404040')
    
    plt.tight_layout()
    return fig_to_base64(fig)

def compute_gradcam(model, input_tensor, target_class=None):
    """Compute Grad-CAM heatmap"""
    model.eval()
    input_tensor = input_tensor.to(device)
    input_tensor.requires_grad = True
    
    # Forward pass
    output = model(input_tensor, return_features=True)
    
    if target_class is None:
        target_class = output.argmax(dim=1).item()
    
    # Backward pass
    model.zero_grad()
    one_hot = torch.zeros_like(output)
    one_hot[0, target_class] = 1
    output.backward(gradient=one_hot, retain_graph=True)
    
    # Get gradients and features
    gradients = model.gradients.get('layer4')
    features = model.feature_maps.get('layer4')
    
    if gradients is None or features is None:
        return None
    
    # Compute weights
    weights = torch.mean(gradients, dim=(2, 3), keepdim=True)
    
    # Compute Grad-CAM
    cam = torch.sum(weights * features, dim=1, keepdim=True)
    cam = F.relu(cam)
    cam = cam.squeeze().cpu().detach().numpy()
    
    # Normalize
    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    
    # Resize to input size
    cam = cv2.resize(cam, (CONFIG['image_size'], CONFIG['image_size']))
    
    return cam

def plot_gradcam(cam, gaf_img, rp_img, mtf_img):
    """Plot Grad-CAM overlay"""
    fig, axes = plt.subplots(1, 4, figsize=(16, 4))
    fig.patch.set_facecolor('#1a1a2e')
    
    # Create custom colormap for heatmap
    colors = ['#000033', '#0066ff', '#00ff00', '#ffff00', '#ff0000']
    cmap = LinearSegmentedColormap.from_list('gradcam', colors)
    
    titles = ['Attention on GAF', 'Attention on RP', 'Attention on MTF', 'Combined Attention']
    images = [gaf_img, rp_img, mtf_img]
    base_cmaps = ['viridis', 'plasma', 'inferno']
    
    for i, (ax, img, title, base_cmap) in enumerate(zip(axes[:3], images, titles[:3], base_cmaps)):
        ax.set_facecolor('#1a1a2e')
        ax.imshow(img, cmap=base_cmap, alpha=0.7)
        ax.imshow(cam, cmap=cmap, alpha=0.5)
        ax.set_title(title, color='#ffffff', fontsize=11, fontweight='bold')
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_color('#404040')
    
    # Combined view
    axes[3].set_facecolor('#1a1a2e')
    im = axes[3].imshow(cam, cmap=cmap)
    axes[3].set_title(titles[3], color='#ffffff', fontsize=11, fontweight='bold')
    axes[3].set_xticks([])
    axes[3].set_yticks([])
    for spine in axes[3].spines.values():
        spine.set_color('#404040')
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=axes[3], fraction=0.046, pad=0.04)
    cbar.ax.tick_params(colors='#a0a0a0')
    cbar.set_label('Attention Intensity', color='#e0e0e0')
    
    plt.tight_layout()
    return fig_to_base64(fig)

def plot_prediction_chart(probabilities):
    """Plot prediction probabilities"""
    fig, ax = plt.subplots(figsize=(10, 4))
    fig.patch.set_facecolor('#1a1a2e')
    ax.set_facecolor('#1a1a2e')
    
    y_pos = np.arange(len(CLASS_NAMES))
    bars = ax.barh(y_pos, probabilities * 100, color=CLASS_COLORS, edgecolor='#ffffff', linewidth=0.5)
    
    ax.set_yticks(y_pos)
    ax.set_yticklabels(CLASS_NAMES, color='#e0e0e0', fontsize=10)
    ax.set_xlabel('Confidence (%)', color='#e0e0e0', fontsize=10)
    ax.set_title('Classification Probabilities', color='#ffffff', fontsize=12, fontweight='bold')
    ax.set_xlim(0, 100)
    ax.tick_params(colors='#a0a0a0')
    ax.grid(True, axis='x', alpha=0.2, color='#404040')
    
    for spine in ax.spines.values():
        spine.set_color('#404040')
    
    # Add percentage labels
    for bar, prob in zip(bars, probabilities):
        width = bar.get_width()
        ax.text(width + 1, bar.get_y() + bar.get_height()/2, 
                f'{prob*100:.1f}%', va='center', color='#e0e0e0', fontsize=9)
    
    plt.tight_layout()
    return fig_to_base64(fig)


# ============ MODEL LOADING ============

model = None

def load_model():
    global model
    model_path = os.path.join(os.path.dirname(__file__), '..', 'ecg_cbam_best_model.pth')
    
    if not os.path.exists(model_path):
        print(f"[ERROR] Model file not found: {model_path}")
        return False
    
    try:
        model = ResNetCBAM_Enhanced(
            num_classes=CONFIG['num_classes'],
            dropblock_prob=CONFIG['dropblock_prob'],
            stochastic_depth_prob=CONFIG['stochastic_depth_prob']
        ).to(device)
        
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        
        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                # Checkpoint format with metadata
                state_dict = checkpoint['model_state_dict']
                print(f"[INFO] Loaded checkpoint from epoch {checkpoint.get('best_epoch', '?')}")
                print(f"[INFO] Best F1 score: {checkpoint.get('best_f1', 'N/A')}")
            elif 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            else:
                # Assume it's a raw state dict
                state_dict = checkpoint
        else:
            state_dict = checkpoint
        
        # Load the state dict
        model.load_state_dict(state_dict)
        model.eval()
        print("[INFO] Model loaded successfully")
        return True
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] Failed to load model: {e}")
        return False


# ============ API ROUTES ============

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'ecg_interface.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': str(device),
        'classes': CLASS_NAMES
    })

@app.route('/api/analyze', methods=['POST'])
def analyze_ecg():
    """Main analysis endpoint"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        
        if 'signal' not in data:
            return jsonify({'error': 'No signal data provided'}), 400
        
        signal = np.array(data['signal'], dtype=np.float32)
        
        # Ensure signal is 187 samples (MIT-BIH format)
        if len(signal) != 187:
            # Resample to 187
            signal = np.interp(
                np.linspace(0, len(signal)-1, 187),
                np.arange(len(signal)),
                signal
            )
        
        # Normalize
        signal = (signal - signal.mean()) / (signal.std() + 1e-8)
        
        # Encode signal
        gaf_img, rp_img, mtf_img = encode_signal(signal)
        
        # Prepare input tensor
        img = np.stack([gaf_img, rp_img, mtf_img], axis=0)
        input_tensor = torch.tensor(img, dtype=torch.float32).unsqueeze(0)
        
        # Get prediction
        with torch.no_grad():
            output = model(input_tensor.to(device))
            probabilities = F.softmax(output, dim=1).cpu().numpy()[0]
        
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])
        
        # Compute Grad-CAM
        cam = compute_gradcam(model, input_tensor, predicted_class)
        
        # Generate visualizations
        signal_plot = plot_signal(signal)
        encoding_plot = plot_encoding(gaf_img, rp_img, mtf_img)
        fusion_plot = plot_fusion_image(gaf_img, rp_img, mtf_img)
        gradcam_plot = plot_gradcam(cam, gaf_img, rp_img, mtf_img) if cam is not None else None
        prediction_plot = plot_prediction_chart(probabilities)
        
        return jsonify({
            'success': True,
            'prediction': {
                'class': predicted_class,
                'label': CLASS_NAMES[predicted_class],
                'confidence': confidence,
                'description': CLASS_DESCRIPTIONS[predicted_class],
                'probabilities': probabilities.tolist()
            },
            'visualizations': {
                'signal': signal_plot,
                'encoding': encoding_plot,
                'fusion': fusion_plot,
                'gradcam': gradcam_plot,
                'prediction_chart': prediction_plot
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sample', methods=['GET'])
def get_sample():
    """Get a sample ECG signal from test data"""
    try:
        # Try to load from MIT-BIH test file
        test_path = os.path.join(os.path.dirname(__file__), '..', '..', 'MIT_BIH', 'mitbih_test.csv')
        
        if os.path.exists(test_path):
            df = pd.read_csv(test_path, header=None)
            # Get random sample
            idx = np.random.randint(0, len(df))
            signal = df.iloc[idx, :-1].values.astype(float)
            label = int(df.iloc[idx, -1])
            
            return jsonify({
                'success': True,
                'signal': signal.tolist(),
                'actual_label': label,
                'actual_class': CLASS_NAMES[label]
            })
        else:
            # Generate synthetic sample
            t = np.linspace(0, 1, 187)
            signal = np.sin(2 * np.pi * 5 * t) + 0.5 * np.sin(2 * np.pi * 10 * t)
            signal += np.random.normal(0, 0.1, len(signal))
            
            return jsonify({
                'success': True,
                'signal': signal.tolist(),
                'actual_label': None,
                'actual_class': 'Synthetic Sample'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-samples', methods=['GET'])
def get_batch_samples():
    """Get multiple sample ECG signals"""
    try:
        test_path = os.path.join(os.path.dirname(__file__), '..', '..', 'MIT_BIH', 'mitbih_test.csv')
        count = int(request.args.get('count', 5))
        
        if os.path.exists(test_path):
            df = pd.read_csv(test_path, header=None)
            samples = []
            
            # Get samples from each class
            for class_idx in range(5):
                class_samples = df[df.iloc[:, -1] == class_idx]
                if len(class_samples) > 0:
                    idx = np.random.randint(0, len(class_samples))
                    signal = class_samples.iloc[idx, :-1].values.astype(float)
                    samples.append({
                        'signal': signal.tolist(),
                        'label': class_idx,
                        'class_name': CLASS_NAMES[class_idx]
                    })
            
            return jsonify({'success': True, 'samples': samples})
        else:
            return jsonify({'error': 'Test data not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============ MAIN ============

if __name__ == '__main__':
    print("\n" + "="*60)
    print("ECG Arrhythmia Detection - Professional Interface")
    print("="*60)
    
    if load_model():
        print("[INFO] Starting server on http://localhost:5001")
        app.run(host='127.0.0.1', port=5001, debug=True, use_reloader=False)
    else:
        print("[ERROR] Failed to start server - model not loaded")
