/**
 * Stress Detection Dashboard - Node.js Backend API
 * Serves the frontend and provides API endpoints for model inference
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from Results folder
app.use('/results', express.static(path.join(__dirname, '..', 'Results')));

// API Routes

// Get list of available results
app.get('/api/results', (req, res) => {
    const resultsDir = path.join(__dirname, '..', 'Results');

    try {
        if (!fs.existsSync(resultsDir)) {
            return res.json({ results: [] });
        }

        const items = fs.readdirSync(resultsDir, { withFileTypes: true });
        const results = items
            .filter(item => item.isDirectory())
            .map(item => ({
                name: item.name,
                path: `/results/${item.name}`
            }));

        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get LOSO results
app.get('/api/loso-results', (req, res) => {
    const losoDir = path.join(__dirname, '..', 'Results', 'LOSO');

    try {
        if (!fs.existsSync(losoDir)) {
            return res.json({ experiments: [] });
        }

        const experiments = [];
        const items = fs.readdirSync(losoDir, { withFileTypes: true });

        for (const item of items) {
            if (item.isDirectory()) {
                const resultsFile = path.join(losoDir, item.name, 'loso_results.json');
                if (fs.existsSync(resultsFile)) {
                    const data = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
                    experiments.push({
                        name: item.name,
                        ...data.aggregated_metrics,
                        config: data.args
                    });
                }
            }
        }

        res.json({ experiments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get model info
app.get('/api/models', (req, res) => {
    const models = [
        { id: 'custom', name: 'Custom CNN', description: 'Basic CNN architecture' },
        { id: 'resnet', name: 'ResNet-18', description: 'ResNet with pretrained weights' },
        { id: 'vgg', name: 'VGG-16', description: 'VGG16 with fine-tuning' },
        { id: 'attention', name: 'Attention CNN (CBAM)', description: 'CNN with CBAM attention' },
        { id: 'attention_se', name: 'Attention CNN (SE)', description: 'CNN with SE blocks' },
        { id: 'efficientnet', name: 'EfficientNet-B0', description: 'Efficient and accurate' }
    ];
    res.json({ models });
});

// Get encoding methods info
app.get('/api/encodings', (req, res) => {
    const encodings = [
        { id: 'gaf_summation', name: 'GAF Summation', description: 'Gramian Angular Field (Sum)' },
        { id: 'gaf_difference', name: 'GAF Difference', description: 'Gramian Angular Field (Diff)' },
        { id: 'mtf', name: 'MTF', description: 'Markov Transition Field' },
        { id: 'rp_euclidean', name: 'RP Euclidean', description: 'Recurrence Plot (Euclidean)' },
        { id: 'rp_dtw', name: 'RP DTW', description: 'Recurrence Plot (DTW)' }
    ];
    res.json({ encodings });
});

// Get subjects info
app.get('/api/subjects', (req, res) => {
    const subjects = [
        'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S13', 'S14', 'S15', 'S16', 'S17'
    ];
    res.json({ subjects, count: subjects.length });
});

// Get available GradCAM visualizations
app.get('/api/gradcam', (req, res) => {
    const gradcamDir = path.join(__dirname, '..', 'gradcam_outputs');

    try {
        if (!fs.existsSync(gradcamDir)) {
            return res.json({ visualizations: [] });
        }

        const files = fs.readdirSync(gradcamDir)
            .filter(f => f.endsWith('.png'))
            .map(f => ({
                filename: f,
                path: `/gradcam/${f}`
            }));

        res.json({ visualizations: files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve gradcam images
app.use('/gradcam', express.static(path.join(__dirname, '..', 'gradcam_outputs')));

// Serve the VitalAura startup interface
app.get('/vitalaura', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vitalaura.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🧠 Stress Detection Dashboard                               ║
║   ──────────────────────────────────────────────────────────  ║
║                                                               ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                               ║
║   Features:                                                   ║
║   • View encoding visualizations                              ║
║   • Explore model comparisons                                 ║
║   • Analyze LOSO cross-validation results                     ║
║   • Visualize Grad-CAM heatmaps                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});
