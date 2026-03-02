
/**
 * ECG Arrhythmia Detection - Frontend Application
 * Professional Interface for CBAM-ResNet18 Model
 */

// API Configuration
const API_BASE = window.location.origin;

// Class definitions
const CLASS_NAMES = ['Normal (N)', 'Supraventricular (S)', 'Ventricular (V)', 'Fusion (F)', 'Unknown (Q)'];
const CLASS_COLORS = ['#3fb950', '#58a6ff', '#f85149', '#a371f7', '#d29922'];
const CLASS_KEYS = ['normal', 'supra', 'vent', 'fusion', 'unknown'];

// DOM Elements
const elements = {
    // Status
    modelStatus: document.getElementById('modelStatus'),
    
    // Input
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    signalInput: document.getElementById('signalInput'),
    sampleGrid: document.getElementById('sampleGrid'),
    loadRandomBtn: document.getElementById('loadRandomBtn'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    
    // Visualization
    placeholderState: document.getElementById('placeholderState'),
    resultsContainer: document.getElementById('resultsContainer'),
    signalPlot: document.getElementById('signalPlot'),
    encodingPlot: document.getElementById('encodingPlot'),
    fusionPlot: document.getElementById('fusionPlot'),
    predictionPlot: document.getElementById('predictionPlot'),
    gradcamPlot: document.getElementById('gradcamPlot'),
    
    // Results
    waitingState: document.getElementById('waitingState'),
    diagnosisResults: document.getElementById('diagnosisResults'),
    primaryResult: document.getElementById('primaryResult'),
    resultClass: document.getElementById('resultClass'),
    confidenceFill: document.getElementById('confidenceFill'),
    confidenceValue: document.getElementById('confidenceValue'),
    resultDescription: document.getElementById('resultDescription'),
    probList: document.getElementById('probList'),
    exportBtn: document.getElementById('exportBtn')
};

// State
let currentSignal = null;
let currentResults = null;
let sampleCache = {};

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // Check model status
    await checkModelStatus();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load sample cache
    loadSampleCache();
}

async function checkModelStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        
        const statusDot = elements.modelStatus.querySelector('.status-dot');
        const statusText = elements.modelStatus.querySelector('.status-text');
        
        if (data.model_loaded) {
            statusDot.classList.add('connected');
            statusText.textContent = `Model Ready (${data.device.toUpperCase()})`;
        } else {
            statusDot.classList.add('error');
            statusText.textContent = 'Model Not Loaded';
        }
    } catch (error) {
        const statusDot = elements.modelStatus.querySelector('.status-dot');
        const statusText = elements.modelStatus.querySelector('.status-text');
        statusDot.classList.add('error');
        statusText.textContent = 'Connection Error';
        console.error('Health check failed:', error);
    }
}

async function loadSampleCache() {
    try {
        const response = await fetch(`${API_BASE}/api/batch-samples`);
        const data = await response.json();
        
        if (data.success && data.samples) {
            data.samples.forEach(sample => {
                sampleCache[sample.label] = sample.signal;
            });
        }
    } catch (error) {
        console.warn('Could not load sample cache:', error);
    }
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
    // File upload
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    
    // Manual input
    elements.signalInput.addEventListener('input', handleSignalInput);
    
    // Sample buttons
    elements.sampleGrid.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => loadSampleByClass(parseInt(btn.dataset.class)));
    });
    
    elements.loadRandomBtn.addEventListener('click', loadRandomSample);
    
    // Analyze button
    elements.analyzeBtn.addEventListener('click', analyzeSignal);
    
    // Export button
    elements.exportBtn.addEventListener('click', exportReport);
}

// ============ FILE HANDLING ============

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const content = e.target.result;
        try {
            // Parse CSV content
            const signal = parseSignalData(content);
            if (signal && signal.length > 0) {
                setSignal(signal);
                elements.signalInput.value = signal.slice(0, 50).join(', ') + '...';
            } else {
                showError('Could not parse signal data from file');
            }
        } catch (error) {
            showError('Error parsing file: ' + error.message);
        }
    };
    
    reader.onerror = () => {
        showError('Error reading file');
    };
    
    reader.readAsText(file);
}

function parseSignalData(content) {
    // Try to parse as CSV
    const lines = content.trim().split('\n');
    
    for (const line of lines) {
        const values = line.split(',')
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v));
        
        if (values.length >= 10) {
            // If line has label at end (like MIT-BIH format), remove it
            if (values.length === 188) {
                return values.slice(0, 187);
            }
            return values;
        }
    }
    
    // Try parsing as space-separated
    const allValues = content.trim().split(/[\s,]+/)
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v));
    
    return allValues;
}

// ============ SIGNAL INPUT ============

function handleSignalInput() {
    const text = elements.signalInput.value.trim();
    if (text) {
        const values = text.split(/[\s,]+/)
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v));
        
        if (values.length >= 10) {
            setSignal(values);
        } else {
            currentSignal = null;
            elements.analyzeBtn.disabled = true;
        }
    } else {
        currentSignal = null;
        elements.analyzeBtn.disabled = true;
    }
}

function setSignal(signal) {
    currentSignal = signal;
    elements.analyzeBtn.disabled = false;
}

// ============ SAMPLE LOADING ============

async function loadSampleByClass(classIdx) {
    // Check cache first
    if (sampleCache[classIdx]) {
        setSignal(sampleCache[classIdx]);
        elements.signalInput.value = `[Sample: ${CLASS_NAMES[classIdx]}] - ${sampleCache[classIdx].length} samples loaded`;
        return;
    }
    
    // Fetch from API
    await loadRandomSample();
}

async function loadRandomSample() {
    try {
        elements.loadRandomBtn.disabled = true;
        elements.loadRandomBtn.textContent = 'Loading...';
        
        const response = await fetch(`${API_BASE}/api/sample`);
        const data = await response.json();
        
        if (data.success && data.signal) {
            setSignal(data.signal);
            const label = data.actual_class || 'Unknown';
            elements.signalInput.value = `[Sample: ${label}] - ${data.signal.length} samples loaded`;
        } else {
            showError('Could not load sample');
        }
    } catch (error) {
        showError('Error loading sample: ' + error.message);
    } finally {
        elements.loadRandomBtn.disabled = false;
        elements.loadRandomBtn.textContent = 'Load Random Sample';
    }
}

// ============ ANALYSIS ============

async function analyzeSignal() {
    if (!currentSignal || currentSignal.length === 0) {
        showError('No signal data to analyze');
        return;
    }
    
    try {
        // Update UI state
        setAnalyzing(true);
        updatePipelineSteps(1);
        
        // Send request
        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ signal: currentSignal })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentResults = data;
            displayResults(data);
        } else {
            showError(data.error || 'Analysis failed');
        }
    } catch (error) {
        showError('Error during analysis: ' + error.message);
    } finally {
        setAnalyzing(false);
    }
}

function setAnalyzing(analyzing) {
    const btnText = elements.analyzeBtn.querySelector('.btn-text');
    const btnLoader = elements.analyzeBtn.querySelector('.btn-spinner');
    
    if (analyzing) {
        elements.analyzeBtn.disabled = true;
        btnText.textContent = 'Analyzing...';
        btnLoader.hidden = false;
    } else {
        elements.analyzeBtn.disabled = false;
        btnText.textContent = 'Analyze Signal';
        btnLoader.hidden = true;
    }
}

// ============ DISPLAY RESULTS ============

function displayResults(data) {
    // Show results containers
    elements.placeholderState.hidden = true;
    elements.resultsContainer.hidden = false;
    elements.waitingState.hidden = true;
    elements.diagnosisResults.hidden = false;
    
    // Display visualizations with animation
    displayVisualizations(data.visualizations);
    
    // Display prediction
    displayPrediction(data.prediction);
    
    // Update pipeline steps
    updatePipelineSteps(5);
}

function displayVisualizations(viz) {
    // Animate image loading
    const images = [
        { element: elements.signalPlot, src: viz.signal, step: 1 },
        { element: elements.encodingPlot, src: viz.encoding, step: 2 },
        { element: elements.fusionPlot, src: viz.fusion, step: 3 },
        { element: elements.predictionPlot, src: viz.prediction_chart, step: 4 },
        { element: elements.gradcamPlot, src: viz.gradcam, step: 5 }
    ];
    
    images.forEach((img, index) => {
        setTimeout(() => {
            if (img.src) {
                img.element.src = img.src;
                img.element.style.opacity = '0';
                img.element.onload = () => {
                    img.element.style.transition = 'opacity 0.3s ease';
                    img.element.style.opacity = '1';
                };
            }
            updatePipelineSteps(img.step);
        }, index * 200);
    });
}

function displayPrediction(prediction) {
    // Update primary result
    const classIdx = prediction.class;
    elements.resultClass.textContent = prediction.label;
    
    // Update confidence
    const confidence = prediction.confidence * 100;
    elements.confidenceFill.style.width = `${confidence}%`;
    elements.confidenceValue.textContent = `${confidence.toFixed(1)}%`;
    
    // Update description
    elements.resultDescription.textContent = prediction.description;
    
    // Update card styling
    elements.primaryResult.className = 'diagnosis-card primary ' + CLASS_KEYS[classIdx];
    
    // Update confidence bar color
    elements.confidenceFill.style.background = CLASS_COLORS[classIdx];
    
    // Update probability list
    displayProbabilities(prediction.probabilities);
}

function displayProbabilities(probabilities) {
    elements.probList.innerHTML = '';
    
    probabilities.forEach((prob, idx) => {
        const item = document.createElement('div');
        item.className = 'prob-item';
        
        const percentage = (prob * 100).toFixed(1);
        
        item.innerHTML = `
            <div class="prob-label">
                <span class="prob-dot" style="background: ${CLASS_COLORS[idx]}"></span>
                ${CLASS_NAMES[idx]}
            </div>
            <div class="prob-bar">
                <div class="prob-fill" style="width: ${percentage}%; background: ${CLASS_COLORS[idx]}"></div>
            </div>
            <span class="prob-value">${percentage}%</span>
        `;
        
        elements.probList.appendChild(item);
    });
}

function updatePipelineSteps(activeStep) {
    const steps = document.querySelectorAll('.pipeline-bar .pip-step');
    
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum < activeStep) {
            step.classList.add('completed');
        } else if (stepNum === activeStep) {
            step.classList.add('active');
        }
    });
}

// ============ EXPORT ============

function exportReport() {
    if (!currentResults) {
        showError('No results to export');
        return;
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        prediction: currentResults.prediction,
        signalLength: currentSignal ? currentSignal.length : 0,
        model: 'ResNet-18 + CBAM',
        dataset: 'MIT-BIH Arrhythmia Database'
    };
    
    // Create downloadable JSON
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecg_analysis_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============ UTILITIES ============

function showError(message) {
    console.error(message);
    // You could implement a toast notification here
    alert(message);
}

// Reset function
function resetAnalysis() {
    elements.placeholderState.hidden = false;
    elements.resultsContainer.hidden = true;
    elements.waitingState.hidden = false;
    elements.diagnosisResults.hidden = true;
    
    updatePipelineSteps(0);
    
    currentSignal = null;
    currentResults = null;
    elements.signalInput.value = '';
    elements.analyzeBtn.disabled = true;
}
