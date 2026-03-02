/**
 * Stress Detection Dashboard - Frontend JavaScript
 * Handles UI interactions and API communication
 */

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initTabs();
    initModels();
    initEncodings();
    initSignals();
    initExperimentForm();
    loadLosoResults();
    loadGradcamVisualizations();
});

// ==========================================
// Particle Animation
// ==========================================

function initParticles() {
    const container = document.getElementById('particles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.animationDuration = `${15 + Math.random() * 10}s`;

        // Random colors
        const colors = ['#6366f1', '#22d3ee', '#f472b6', '#10b981'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];

        container.appendChild(particle);
    }
}

// ==========================================
// Tab Navigation
// ==========================================

function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update buttons
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ==========================================
// Models Section
// ==========================================

const modelsData = [
    {
        id: 'custom',
        name: 'Custom CNN',
        icon: '🔧',
        description: 'Basic 2-layer CNN architecture for baseline comparison',
        color: '#94a3b8'
    },
    {
        id: 'resnet',
        name: 'ResNet-18',
        icon: '🏗️',
        description: 'Deep residual network with pretrained ImageNet weights',
        color: '#6366f1'
    },
    {
        id: 'vgg',
        name: 'VGG-16',
        icon: '📐',
        description: 'Classic deep architecture with fine-tuned classifier',
        color: '#8b5cf6'
    },
    {
        id: 'attention',
        name: 'Attention CNN (CBAM)',
        icon: '👁️',
        description: 'CNN with channel + spatial attention for interpretability',
        color: '#22d3ee'
    },
    {
        id: 'attention_se',
        name: 'Attention CNN (SE)',
        icon: '🎯',
        description: 'CNN with Squeeze-and-Excitation blocks',
        color: '#10b981'
    },
    {
        id: 'efficientnet',
        name: 'EfficientNet-B0',
        icon: '⚡',
        description: 'Efficient architecture - great accuracy/compute ratio',
        color: '#f472b6'
    }
];

function initModels() {
    const grid = document.getElementById('modelsGrid');
    if (!grid) return;

    grid.innerHTML = modelsData.map(model => `
        <div class="model-card" style="border-left: 3px solid ${model.color}">
            <h3>${model.icon} ${model.name}</h3>
            <p>${model.description}</p>
        </div>
    `).join('');
}

// ==========================================
// Encoding Methods Section
// ==========================================

const encodingsData = [
    {
        id: 'gaf_summation',
        name: 'GAF Summation',
        icon: '📊',
        description: 'Gramian Angular Field using summation - best for ResNet',
        color: '#6366f1'
    },
    {
        id: 'gaf_difference',
        name: 'GAF Difference',
        icon: '📈',
        description: 'Gramian Angular Field using difference - best for VGG',
        color: '#8b5cf6'
    },
    {
        id: 'mtf',
        name: 'Markov Transition Field',
        icon: '🔀',
        description: 'Encodes transition probabilities between quantile bins',
        color: '#22d3ee'
    },
    {
        id: 'rp_euclidean',
        name: 'Recurrence Plot (Euclidean)',
        icon: '🔄',
        description: 'Shows recurring patterns using Euclidean distance',
        color: '#10b981'
    },
    {
        id: 'rp_dtw',
        name: 'Recurrence Plot (DTW)',
        icon: '🌊',
        description: 'Dynamic Time Warping distance for temporal alignment',
        color: '#f472b6'
    }
];

function initEncodings() {
    const grid = document.getElementById('encodingGrid');
    if (!grid) return;

    grid.innerHTML = encodingsData.map(enc => `
        <div class="model-card" style="border-left: 3px solid ${enc.color}">
            <h3>${enc.icon} ${enc.name}</h3>
            <p>${enc.description}</p>
        </div>
    `).join('');
}

// ==========================================
// Signals Section
// ==========================================

const signalsData = [
    { name: 'chest_ecg', icon: '❤️', label: 'ECG' },
    { name: 'chest_eda', icon: '💧', label: 'EDA (Chest)' },
    { name: 'chest_emg', icon: '💪', label: 'EMG' },
    { name: 'chest_resp', icon: '🌬️', label: 'Respiration' },
    { name: 'chest_temp', icon: '🌡️', label: 'Temp (Chest)' },
    { name: 'chest_acc_x', icon: '📱', label: 'ACC X (Chest)' },
    { name: 'chest_acc_y', icon: '📱', label: 'ACC Y (Chest)' },
    { name: 'chest_acc_z', icon: '📱', label: 'ACC Z (Chest)' },
    { name: 'wrist_bvp', icon: '💓', label: 'BVP' },
    { name: 'wrist_eda', icon: '💧', label: 'EDA (Wrist)' },
    { name: 'wrist_temp', icon: '🌡️', label: 'Temp (Wrist)' },
    { name: 'wrist_acc_x', icon: '⌚', label: 'ACC X (Wrist)' },
    { name: 'wrist_acc_y', icon: '⌚', label: 'ACC Y (Wrist)' },
    { name: 'wrist_acc_z', icon: '⌚', label: 'ACC Z (Wrist)' }
];

function initSignals() {
    const grid = document.getElementById('signalsGrid');
    if (!grid) return;

    grid.innerHTML = signalsData.map(signal => `
        <div class="signal-item">
            <div class="signal-icon">${signal.icon}</div>
            <div class="signal-name">${signal.label}</div>
        </div>
    `).join('');
}

// ==========================================
// Experiment Form
// ==========================================

function initExperimentForm() {
    const form = document.getElementById('experimentForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        updateCommand();
    });

    // Update command on any change
    const inputs = form.querySelectorAll('select, input');
    inputs.forEach(input => {
        input.addEventListener('change', updateCommand);
    });

    // Initial update
    updateCommand();
}

function updateCommand() {
    const model = document.getElementById('modelSelect').value;
    const encoding = document.getElementById('encodingSelect').value;
    const epochs = document.getElementById('epochsInput').value;

    const command = `python loso_trainer.py --model ${model} --method ${encoding} --epochs ${epochs}`;

    const commandBox = document.getElementById('commandBox');
    if (commandBox) {
        commandBox.innerHTML = `<code>${command}</code>`;
    }
}

function copyCommand() {
    const commandBox = document.getElementById('commandBox');
    if (!commandBox) return;

    const command = commandBox.textContent;
    navigator.clipboard.writeText(command).then(() => {
        // Show feedback
        const btn = document.querySelector('.btn-secondary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>✅</span> Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

// ==========================================
// Load LOSO Results
// ==========================================

async function loadLosoResults() {
    try {
        const response = await fetch('/api/loso-results');
        const data = await response.json();

        if (data.experiments && data.experiments.length > 0) {
            displayLosoResults(data.experiments);
        }
    } catch (error) {
        console.log('No LOSO results available yet');
    }
}

function displayLosoResults(experiments) {
    const container = document.getElementById('resultsContainer');
    const table = document.getElementById('resultsTable');
    const placeholder = container.querySelector('.placeholder-text');

    if (placeholder) placeholder.style.display = 'none';
    if (table) table.style.display = 'block';

    if (!table) return;

    table.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <th style="padding: 1rem; text-align: left;">Experiment</th>
                    <th style="padding: 1rem; text-align: center;">Accuracy</th>
                    <th style="padding: 1rem; text-align: center;">F1 Score</th>
                    <th style="padding: 1rem; text-align: center;">AUC-ROC</th>
                </tr>
            </thead>
            <tbody>
                ${experiments.map(exp => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 1rem;">${exp.name}</td>
                        <td style="padding: 1rem; text-align: center;">${(exp.accuracy_mean * 100 || 0).toFixed(2)}%</td>
                        <td style="padding: 1rem; text-align: center;">${(exp.f1_mean * 100 || 0).toFixed(2)}%</td>
                        <td style="padding: 1rem; text-align: center;">${(exp.auc_roc_mean * 100 || 0).toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==========================================
// Load Grad-CAM Visualizations
// ==========================================

async function loadGradcamVisualizations() {
    try {
        const response = await fetch('/api/gradcam');
        const data = await response.json();

        if (data.visualizations && data.visualizations.length > 0) {
            displayGradcamVisualizations(data.visualizations);
        }
    } catch (error) {
        console.log('No Grad-CAM visualizations available yet');
    }
}

function displayGradcamVisualizations(visualizations) {
    const container = document.getElementById('gradcamContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="viz-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
            ${visualizations.map(viz => `
                <div class="viz-card glass" style="padding: 1rem; border-radius: 12px;">
                    <img src="${viz.path}" alt="${viz.filename}" style="width: 100%; border-radius: 8px;">
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">${viz.filename}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// Make copyCommand available globally
window.copyCommand = copyCommand;
