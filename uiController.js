// NeuroArt - UI Controller
// Manages user interface interactions and updates

class UIController {
    constructor() {
        this.initialized = false;
        this.panelCollapsed = false;

        // UI elements (will be set on init)
        this.elements = {};

        // Update throttling
        this.lastUIUpdate = 0;
        this.uiUpdateInterval = 1000 / CONFIG.ui.updateRate; // 100ms for 10Hz
    }

    /**
     * Initialize UI controller and attach event listeners
     */
    init() {
        if (this.initialized) return;

        // Get all UI elements
        this.elements = {
            // Panel
            panel: document.getElementById('control-panel'),
            panelToggle: document.getElementById('panel-toggle'),

            // Connection status
            connectionStatus: document.getElementById('connection-status'),
            connectionText: document.getElementById('connection-text'),
            mockDataBtn: document.getElementById('toggle-mock-data'),

            // Presets
            presetBtns: document.querySelectorAll('.preset-btn'),

            // Sliders
            deltaWeight: document.getElementById('delta-weight'),
            thetaWeight: document.getElementById('theta-weight'),
            alphaWeight: document.getElementById('alpha-weight'),
            betaWeight: document.getElementById('beta-weight'),
            gammaWeight: document.getElementById('gamma-weight'),
            spikeWeight: document.getElementById('spike-weight'),

            // Slider value displays
            deltaValue: document.getElementById('delta-value'),
            thetaValue: document.getElementById('theta-value'),
            alphaValue: document.getElementById('alpha-value'),
            betaValue: document.getElementById('beta-value'),
            gammaValue: document.getElementById('gamma-value'),
            spikeValue: document.getElementById('spike-value'),

            // Band visualization bars
            deltaBar: document.getElementById('delta-bar'),
            thetaBar: document.getElementById('theta-bar'),
            alphaBar: document.getElementById('alpha-bar'),
            betaBar: document.getElementById('beta-bar'),
            gammaBar: document.getElementById('gamma-bar'),

            // Performance
            qualitySelect: document.getElementById('quality-select'),
            fpsDisplay: document.getElementById('fps-display'),
            particleCount: document.getElementById('particle-count'),

            // Action buttons
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),
            resetBtn: document.getElementById('reset-btn'),

            // Help
            helpBtn: document.getElementById('help-btn'),
            infoOverlay: document.getElementById('info-overlay'),
            closeInfo: document.getElementById('close-info')
        };

        // Attach event listeners
        this.attachEventListeners();

        // Load saved settings
        this.loadSettings();

        this.initialized = true;
        console.log('UI Controller initialized');
    }

    /**
     * Attach all event listeners
     */
    attachEventListeners() {
        // Panel toggle
        this.elements.panelToggle.addEventListener('click', () => {
            this.togglePanel();
        });

        // Mock data toggle
        this.elements.mockDataBtn.addEventListener('click', () => {
            this.toggleMockData();
        });

        // Preset buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.dataset.preset;
                this.loadPreset(preset);
            });
        });

        // Weight sliders
        const sliders = [
            { element: this.elements.deltaWeight, display: this.elements.deltaValue, band: 'delta' },
            { element: this.elements.thetaWeight, display: this.elements.thetaValue, band: 'theta' },
            { element: this.elements.alphaWeight, display: this.elements.alphaValue, band: 'alpha' },
            { element: this.elements.betaWeight, display: this.elements.betaValue, band: 'beta' },
            { element: this.elements.gammaWeight, display: this.elements.gammaValue, band: 'gamma' },
            { element: this.elements.spikeWeight, display: this.elements.spikeValue, band: 'motorSpike' }
        ];

        sliders.forEach(({ element, display, band }) => {
            element.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                display.textContent = value.toFixed(1);
                dataMapper.setBandWeight(band, value);
                this.setActivePreset('custom');
            });
        });

        // Quality select
        this.elements.qualitySelect.addEventListener('change', (e) => {
            this.setQuality(e.target.value);
        });

        // Fullscreen button
        this.elements.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Save settings button
        this.elements.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset button
        this.elements.resetBtn.addEventListener('click', () => {
            this.resetSettings();
        });

        // Help button
        this.elements.helpBtn.addEventListener('click', () => {
            this.showHelp();
        });

        this.elements.closeInfo.addEventListener('click', () => {
            this.hideHelp();
        });

        // Close help on overlay click
        this.elements.infoOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.infoOverlay) {
                this.hideHelp();
            }
        });
    }

    /**
     * Update UI elements (throttled)
     */
    update() {
        const now = performance.now();
        if (now - this.lastUIUpdate < this.uiUpdateInterval) return;

        this.lastUIUpdate = now;

        // Update band visualization bars
        const bandPowers = signalProcessor.getAllBandPowers();
        this.updateBandBars(bandPowers);

        // Update FPS display
        this.elements.fpsDisplay.textContent = Utils.fpsCounter.getFPS();

        // Update particle count (will be set by sketch)
        // this.elements.particleCount.textContent is updated externally
    }

    /**
     * Update band visualization bars
     * @param {object} bandPowers - Current band powers
     */
    updateBandBars(bandPowers) {
        this.elements.deltaBar.style.width = `${bandPowers.delta * 100}%`;
        this.elements.thetaBar.style.width = `${bandPowers.theta * 100}%`;
        this.elements.alphaBar.style.width = `${bandPowers.alpha * 100}%`;
        this.elements.betaBar.style.width = `${bandPowers.beta * 100}%`;
        this.elements.gammaBar.style.width = `${bandPowers.gamma * 100}%`;
    }

    /**
     * Update connection status display
     * @param {string} status - 'connected', 'disconnected', or 'mock'
     */
    updateConnectionStatus(status) {
        this.elements.connectionStatus.className = `status-dot ${status}`;

        const statusText = {
            connected: 'Connected',
            disconnected: 'Disconnected',
            mock: 'Mock Data'
        };

        this.elements.connectionText.textContent = statusText[status] || 'Unknown';
    }

    /**
     * Toggle control panel
     */
    togglePanel() {
        this.panelCollapsed = !this.panelCollapsed;

        if (this.panelCollapsed) {
            this.elements.panel.classList.add('panel-collapsed');
        } else {
            this.elements.panel.classList.remove('panel-collapsed');
        }
    }

    /**
     * Toggle mock data
     */
    toggleMockData() {
        if (eegDataHandler.mockDataEnabled) {
            eegDataHandler.disableMockData();
            this.elements.mockDataBtn.innerHTML = '<i class="ph ph-flask"></i><span>Enable Mock Data</span>';
        } else {
            eegDataHandler.enableMockData();
            this.elements.mockDataBtn.innerHTML = '<i class="ph ph-flask"></i><span>Disable Mock Data</span>';
        }
    }

    /**
     * Load visual preset
     * @param {string} presetName - Preset name
     */
    loadPreset(presetName) {
        dataMapper.loadPreset(presetName);
        this.setActivePreset(presetName);

        // Update sliders to match preset
        const weights = dataMapper.getBandWeights();
        this.updateSliders(weights);
    }

    /**
     * Set active preset UI state
     * @param {string} presetName - Preset name
     */
    setActivePreset(presetName) {
        this.elements.presetBtns.forEach(btn => {
            if (btn.dataset.preset === presetName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Update slider values
     * @param {object} weights - Band weights
     */
    updateSliders(weights) {
        this.elements.deltaWeight.value = weights.delta;
        this.elements.deltaValue.textContent = weights.delta.toFixed(1);

        this.elements.thetaWeight.value = weights.theta;
        this.elements.thetaValue.textContent = weights.theta.toFixed(1);

        this.elements.alphaWeight.value = weights.alpha;
        this.elements.alphaValue.textContent = weights.alpha.toFixed(1);

        this.elements.betaWeight.value = weights.beta;
        this.elements.betaValue.textContent = weights.beta.toFixed(1);

        this.elements.gammaWeight.value = weights.gamma;
        this.elements.gammaValue.textContent = weights.gamma.toFixed(1);

        this.elements.spikeWeight.value = weights.motorSpike;
        this.elements.spikeValue.textContent = weights.motorSpike.toFixed(1);
    }

    /**
     * Set graphics quality
     * @param {string} quality - Quality level
     */
    setQuality(quality) {
        // Quality setting will be handled by sketch.js
        window.requestedQuality = quality;
        console.log(`Quality set to: ${quality}`);
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.elements.fullscreenBtn.innerHTML = '<i class="ph ph-corners-in"></i><span>Exit Fullscreen</span>';
        } else {
            document.exitFullscreen();
            this.elements.fullscreenBtn.innerHTML = '<i class="ph ph-corners-out"></i><span>Fullscreen</span>';
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settings = {
            weights: dataMapper.getBandWeights(),
            preset: dataMapper.getActivePreset(),
            quality: this.elements.qualitySelect.value,
            mockDataEnabled: eegDataHandler.mockDataEnabled
        };

        if (Utils.saveToStorage('neuroart-settings', settings)) {
            console.log('Settings saved');
            this.showNotification('Settings saved!');
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const settings = Utils.loadFromStorage('neuroart-settings');

        if (settings) {
            if (settings.preset) {
                this.loadPreset(settings.preset);
            } else if (settings.weights) {
                dataMapper.bandWeights = { ...settings.weights };
                this.updateSliders(settings.weights);
            }

            if (settings.quality) {
                this.elements.qualitySelect.value = settings.quality;
            }

            if (settings.mockDataEnabled) {
                eegDataHandler.enableMockData();
                this.elements.mockDataBtn.innerHTML = '<i class="ph ph-flask"></i><span>Disable Mock Data</span>';
            }

            console.log('Settings loaded');
        }
    }

    /**
     * Reset all settings to defaults
     */
    resetSettings() {
        dataMapper.reset();
        this.loadPreset('balanced');
        this.elements.qualitySelect.value = 'medium';
        console.log('Settings reset to defaults');
        this.showNotification('Settings reset!');
    }

    /**
     * Show help overlay
     */
    showHelp() {
        this.elements.infoOverlay.classList.remove('hidden');
    }

    /**
     * Hide help overlay
     */
    hideHelp() {
        this.elements.infoOverlay.classList.add('hidden');
    }

    /**
     * Show notification (simple)
     * @param {string} message - Notification message
     */
    showNotification(message) {
        // Simple console log for now, could be enhanced with UI toast
        console.log(`[Notification] ${message}`);
    }

    /**
     * Update particle count display
     * @param {number} count - Particle count
     */
    updateParticleCount(count) {
        this.elements.particleCount.textContent = count;
    }
}

// Create global instance
const uiController = new UIController();
