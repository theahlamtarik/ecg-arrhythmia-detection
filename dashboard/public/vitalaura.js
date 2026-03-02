/**
 * VitalAura - Enhanced JavaScript
 * Professional animations and interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavScroll();
    initSampleSelector();
    initSmoothScroll();
    initNavHighlight();
    animateECG();
    animateHeartRate();
    initIntersectionObserver();
    initAIClassification();  // NEW: Initialize API integration
});

// ==========================================
// Flask API Configuration
// ==========================================
const API_BASE_URL = 'http://localhost:5000';

// Sample ECG signals for live classification (187 data points each)
const realECGSamples = {
    normal: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.18, 0.25, 0.35, 0.5, 0.7, 0.85, 0.95, 1.0, 0.95, 0.85, 0.7, 0.5, 0.35, 0.25, 0.18, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    vent: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.02, 0.05, 0.1, 0.2, 0.35, 0.55, 0.75, 0.9, 1.0, 0.95, 0.85, 0.7, 0.5, 0.35, 0.2, 0.1, 0.05, 0.02, 0.0, -0.05, -0.1, -0.15, -0.2, -0.25, -0.3, -0.35, -0.4, -0.35, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
};

// Initialize AI Classification button
function initAIClassification() {
    const classifyBtn = document.getElementById('classifyBtn');
    if (classifyBtn) {
        classifyBtn.addEventListener('click', classifyWithAI);
    }

    // Check API health on load
    checkAPIHealth();
}

// Check if Flask API is running
async function checkAPIHealth() {
    const statusEl = document.getElementById('apiStatus');
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: #22c55e;">🟢 AI Model Online</span>`;
        }
        console.log('✅ Flask API connected:', data);
    } catch (error) {
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: #ef4444;">🔴 AI Model Offline</span>`;
        }
        console.error('❌ Flask API not available:', error.message);
    }
}

// Classify ECG with Flask AI API
async function classifyWithAI() {
    const selector = document.getElementById('sampleSelect');
    const classifyBtn = document.getElementById('classifyBtn');
    const resultClass = document.getElementById('resultClass');
    const resultConfidence = document.getElementById('resultConfidence');

    if (!selector) return;

    const sampleType = selector.value;
    const signal = realECGSamples[sampleType] || realECGSamples.normal;

    // Show loading state
    if (classifyBtn) {
        classifyBtn.disabled = true;
        classifyBtn.innerHTML = '<span class="loading-spinner"></span> Classifying...';
    }
    if (resultClass) resultClass.textContent = 'Analyzing...';

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signal: signal })
        });

        const result = await response.json();

        // Update display with real AI prediction
        if (resultClass) {
            resultClass.textContent = result.predicted_class;
            resultClass.style.animation = 'pulse 0.5s ease';
        }
        if (resultConfidence) {
            animateNumber(resultConfidence, result.confidence * 100, '%');
        }

        // Update probability bars
        const barRows = document.querySelectorAll('.bar-row');
        const classOrder = ['N (Normal)', 'S (Supra)', 'V (Vent)', 'F (Fusion)', 'Q (Unknown)'];
        const colors = { 'N (Normal)': '#22c55e', 'S (Supra)': '#3b82f6', 'V (Vent)': '#ef4444', 'F (Fusion)': '#8b5cf6', 'Q (Unknown)': '#f59e0b' };

        barRows.forEach((row, index) => {
            const fill = row.querySelector('.bar-fill');
            const value = row.querySelector('.bar-value');
            const className = classOrder[index];
            const prob = result.probabilities[className] * 100;

            if (fill) {
                fill.style.width = prob + '%';
                if (className === result.predicted_class) {
                    fill.style.background = `linear-gradient(90deg, ${colors[className]}, ${lightenColor(colors[className], 20)})`;
                }
            }
            if (value) {
                value.textContent = prob.toFixed(1) + '%';
            }
        });

        console.log('🧠 AI Classification:', result);

    } catch (error) {
        console.error('Classification error:', error);
        if (resultClass) resultClass.textContent = 'API Error - Is Flask running?';
    } finally {
        // Reset button
        if (classifyBtn) {
            classifyBtn.disabled = false;
            classifyBtn.innerHTML = '🧠 Classify with AI';
        }
    }
}

// ==========================================
// Navigation Scroll Effect
// ==========================================

function initNavScroll() {
    const nav = document.getElementById('nav');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// ==========================================
// Sample Selector - Demo Section
// ==========================================

const sampleData = {
    normal: {
        class: 'Normal (N)',
        confidence: 98.7,
        bars: [98.7, 0.8, 0.3, 0.1, 0.1],
        signal: 'M0,40 L20,40 L30,40 L35,20 L40,40 L50,40 L55,40 L60,10 L65,70 L70,35 L80,40 L100,40 L110,40 L115,20 L120,40 L130,40 L135,40 L140,10 L145,70 L150,35 L160,40 L200,40',
        color: '#22c55e',
        resultClass: 'normal'
    },
    supra: {
        class: 'Supraventricular (S)',
        confidence: 91.2,
        bars: [4.2, 91.2, 2.8, 1.1, 0.7],
        signal: 'M0,40 L15,40 L20,35 L25,45 L30,40 L35,40 L40,15 L45,65 L50,35 L55,40 L65,40 L70,35 L75,45 L80,40 L85,40 L90,15 L95,65 L100,35 L105,40 L115,40 L120,35 L125,45 L130,40 L135,40 L140,15 L145,65 L150,35 L155,40 L200,40',
        color: '#3b82f6',
        resultClass: 'supra'
    },
    vent: {
        class: 'Ventricular (V)',
        confidence: 94.5,
        bars: [2.1, 1.5, 94.5, 1.2, 0.7],
        signal: 'M0,40 L20,40 L25,40 L30,60 L40,5 L50,75 L60,30 L70,40 L90,40 L95,40 L100,60 L110,5 L120,75 L130,30 L140,40 L160,40 L165,40 L170,60 L180,5 L190,75 L200,30',
        color: '#ef4444',
        resultClass: 'danger'
    },
    fusion: {
        class: 'Fusion (F)',
        confidence: 87.3,
        bars: [5.8, 3.2, 2.4, 87.3, 1.3],
        signal: 'M0,40 L20,40 L25,30 L30,50 L35,40 L40,40 L45,15 L48,60 L52,25 L60,40 L80,40 L85,30 L90,50 L95,40 L100,40 L105,15 L108,60 L112,25 L120,40 L140,40 L145,30 L150,50 L155,40 L160,40 L165,15 L168,60 L172,25 L180,40 L200,40',
        color: '#8b5cf6',
        resultClass: 'fusion'
    },
    unknown: {
        class: 'Unknown (Q)',
        confidence: 78.9,
        bars: [8.5, 4.2, 5.1, 3.3, 78.9],
        signal: 'M0,40 L10,42 L20,38 L30,43 L40,37 L50,41 L60,39 L70,40 L75,35 L80,45 L85,40 L90,40 L95,30 L100,50 L105,40 L110,42 L120,38 L130,43 L140,37 L150,41 L160,39 L170,40 L180,42 L190,38 L200,40',
        color: '#f59e0b',
        resultClass: 'unknown'
    }
};

function initSampleSelector() {
    const selector = document.getElementById('sampleSelect');
    if (!selector) return;

    selector.addEventListener('change', (e) => {
        updateDemoDisplay(e.target.value);
    });
}

function updateDemoDisplay(sampleType) {
    const data = sampleData[sampleType];
    if (!data) return;

    // Update signal preview with animation
    const signalPath = document.querySelector('.sample-signal path');
    if (signalPath) {
        signalPath.style.transition = 'all 0.5s ease';
        signalPath.setAttribute('d', data.signal);
        signalPath.setAttribute('stroke', data.color);
    }

    // Update result class
    const resultClass = document.getElementById('resultClass');
    if (resultClass) {
        resultClass.textContent = data.class;
    }

    // Update result confidence with animation
    const resultConfidence = document.getElementById('resultConfidence');
    if (resultConfidence) {
        animateNumber(resultConfidence, data.confidence, '%');
    }

    // Update confidence bars with animation
    const barRows = document.querySelectorAll('.bar-row');
    barRows.forEach((row, index) => {
        const fill = row.querySelector('.bar-fill');
        const value = row.querySelector('.bar-value');
        if (fill) {
            fill.style.width = data.bars[index] + '%';
            // Highlight the highest bar
            if (data.bars[index] === Math.max(...data.bars)) {
                fill.style.background = `linear-gradient(90deg, ${data.color}, ${lightenColor(data.color, 20)})`;
            } else {
                fill.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
            }
        }
        if (value) {
            value.textContent = data.bars[index].toFixed(1) + '%';
        }
    });
}

function animateNumber(element, target, suffix = '') {
    const start = parseFloat(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * easeOut;
        element.textContent = current.toFixed(1) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function lightenColor(color, percent) {
    // Convert hex to RGB and lighten
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ==========================================
// Smooth Scroll Navigation
// ==========================================

function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.offsetTop - navHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================
// Navigation Highlight on Scroll
// ==========================================

function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';
        const navHeight = document.querySelector('.nav').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navHeight - 100;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// ==========================================
// ECG Animation
// ==========================================

function animateECG() {
    const ecgPath = document.getElementById('ecgPath');
    if (!ecgPath) return;

    // Create flowing animation effect
    const length = ecgPath.getTotalLength();
    ecgPath.style.strokeDasharray = length;
    ecgPath.style.strokeDashoffset = length;

    // Animate
    function animate() {
        ecgPath.style.transition = 'none';
        ecgPath.style.strokeDashoffset = length;

        setTimeout(() => {
            ecgPath.style.transition = 'stroke-dashoffset 2s linear';
            ecgPath.style.strokeDashoffset = 0;
        }, 50);
    }

    animate();
    setInterval(animate, 2500);
}

// ==========================================
// Heart Rate Animation
// ==========================================

function animateHeartRate() {
    const heartRate = document.getElementById('heartRate');
    if (!heartRate) return;

    // Simulate slight heart rate variation
    setInterval(() => {
        const baseRate = 72;
        const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
        heartRate.textContent = (baseRate + variation) + ' BPM';
    }, 3000);
}

// ==========================================
// Intersection Observer for Animations
// ==========================================

function initIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';

                // Animate metric values when they come into view
                if (entry.target.classList.contains('metric')) {
                    const value = entry.target.querySelector('.metric-value');
                    if (value && value.dataset.animated !== 'true') {
                        value.dataset.animated = 'true';
                        animateMetricValue(value);
                    }
                }
            }
        });
    }, observerOptions);

    // Observe cards and metrics
    const elements = document.querySelectorAll('.tech-card, .feature-card, .usecase-card, .metric');
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

function animateMetricValue(element) {
    const text = element.textContent;
    const match = text.match(/[\d.]+/);
    if (!match) return;

    const target = parseFloat(match[0]);
    const suffix = text.replace(match[0], '');
    const duration = 1500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = target * easeOut;

        if (text.includes('%')) {
            element.textContent = current.toFixed(1) + suffix;
        } else {
            element.textContent = Math.floor(current) + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = text; // Restore original
        }
    }

    element.textContent = '0' + suffix;
    requestAnimationFrame(update);
}

// ==========================================
// Copy Command (legacy support)
// ==========================================

function copyCommand() {
    const commandBox = document.getElementById('commandBox');
    if (!commandBox) return;

    const command = commandBox.textContent;
    navigator.clipboard.writeText(command).then(() => {
        const btn = document.querySelector('.btn-secondary');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Copied!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    });
}

window.copyCommand = copyCommand;
