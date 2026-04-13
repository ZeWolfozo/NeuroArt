// NeuroArt - EEG Data Handler
// WebSocket connection, data buffering, and mock data generator

class EEGDataHandler {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.mockDataEnabled = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;

        // Data buffers
        this.bandPowers = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        this.motorSpike = 0;
        this.lastSpikeTime = 0;

        // Signal history for smoothing
        this.history = {
            delta: [],
            theta: [],
            alpha: [],
            beta: [],
            gamma: []
        };

        this.historyLength = CONFIG.signal.smoothingWindow;

        // Normalization range (adaptive)
        this.normalizationRanges = {
            delta: { min: 0, max: 1 },
            theta: { min: 0, max: 1 },
            alpha: { min: 0, max: 1 },
            beta: { min: 0, max: 1 },
            gamma: { min: 0, max: 1 }
        };

        // Mock data generator
        this.mockDataInterval = null;
        this.mockPhase = 0;

        // Callbacks
        this.onConnectionChange = null;
        this.onDataUpdate = null;
    }

    /**
     * Initialize WebSocket connection to bridge server
     */
    connect() {
        if (this.mockDataEnabled) {
            console.log('Mock data enabled, skipping WebSocket connection');
            return;
        }

        try {
            this.ws = new WebSocket(CONFIG.websocket.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.connected = true;
                this.reconnectAttempts = 0;
                if (this.onConnectionChange) {
                    this.onConnectionChange('connected');
                }
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.connected = false;
                if (this.onConnectionChange) {
                    this.onConnectionChange('disconnected');
                }
                this.attemptReconnect();
            };

        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect to WebSocket server
     */
    attemptReconnect() {
        if (this.mockDataEnabled) return;

        if (this.reconnectAttempts >= CONFIG.websocket.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${CONFIG.websocket.maxReconnectAttempts}`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, CONFIG.websocket.reconnectInterval);
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.connected = false;
    }

    /**
     * Handle incoming WebSocket message
     * @param {string} data - JSON string with EEG data
     */
    handleMessage(data) {
        try {
            const eegData = JSON.parse(data);

            // Expected format:
            // {
            //   bands: { delta: 0.3, theta: 0.5, alpha: 0.7, beta: 0.4, gamma: 0.2 },
            //   motorSpike: 0.0,
            //   timestamp: 1234567890
            // }

            if (eegData.bands) {
                this.updateBandPowers(eegData.bands);
            }

            if (eegData.motorSpike !== undefined) {
                this.updateMotorSpike(eegData.motorSpike);
            }

            if (this.onDataUpdate) {
                this.onDataUpdate(this.getBandPowers(), this.motorSpike);
            }

        } catch (error) {
            console.error('Failed to parse EEG data:', error);
        }
    }

    /**
     * Update band power values with smoothing
     * @param {object} newBands - Object with band power values
     */
    updateBandPowers(newBands) {
        const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

        bands.forEach(band => {
            if (newBands[band] !== undefined) {
                // Add to history
                this.history[band].push(newBands[band]);
                if (this.history[band].length > this.historyLength) {
                    this.history[band].shift();
                }

                // Calculate smoothed value (moving average)
                const sum = this.history[band].reduce((a, b) => a + b, 0);
                const smoothed = sum / this.history[band].length;

                // Adaptive normalization
                this.updateNormalizationRange(band, smoothed);

                // Normalize to 0-1 range
                const range = this.normalizationRanges[band];
                this.bandPowers[band] = Utils.clamp(
                    (smoothed - range.min) / (range.max - range.min || 1),
                    0,
                    1
                );
            }
        });
    }

    /**
     * Update normalization range for adaptive scaling
     * @param {string} band - Band name
     * @param {number} value - New value
     */
    updateNormalizationRange(band, value) {
        const range = this.normalizationRanges[band];

        // Exponential moving average for min/max
        const alpha = 0.01; // Slow adaptation
        range.min = range.min * (1 - alpha) + Math.min(range.min, value) * alpha;
        range.max = range.max * (1 - alpha) + Math.max(range.max, value) * alpha;

        // Ensure minimum range
        if (range.max - range.min < 0.1) {
            range.max = range.min + 0.1;
        }
    }

    /**
     * Update motor spike value
     * @param {number} spike - Spike amplitude (0-1)
     */
    updateMotorSpike(spike) {
        this.motorSpike = spike;
        if (spike > CONFIG.motorSpike.threshold) {
            this.lastSpikeTime = Date.now();
        }
    }

    /**
     * Get current band powers
     * @returns {object} Band power values (0-1)
     */
    getBandPowers() {
        return { ...this.bandPowers };
    }

    /**
     * Get motor spike value
     * @returns {number} Spike value (0-1)
     */
    getMotorSpike() {
        return this.motorSpike;
    }

    /**
     * Check if motor spike recently occurred
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} True if spike in window
     */
    isRecentSpike(windowMs = 100) {
        return (Date.now() - this.lastSpikeTime) < windowMs;
    }

    /**
     * Enable mock data generation for testing
     */
    enableMockData() {
        this.mockDataEnabled = true;
        this.disconnect(); // Close WebSocket if open

        if (this.onConnectionChange) {
            this.onConnectionChange('mock');
        }

        // Start mock data generation
        this.mockDataInterval = setInterval(() => {
            this.generateMockData();
        }, 1000 / CONFIG.mockData.updateRate);

        console.log('Mock data enabled');
    }

    /**
     * Disable mock data and reconnect to WebSocket
     */
    disableMockData() {
        this.mockDataEnabled = false;

        if (this.mockDataInterval) {
            clearInterval(this.mockDataInterval);
            this.mockDataInterval = null;
        }

        // Reconnect to WebSocket
        this.connect();

        console.log('Mock data disabled');
    }

    /**
     * Generate realistic mock EEG data
     */
    generateMockData() {
        this.mockPhase += 0.05;

        const variability = CONFIG.mockData.variability;
        const defaults = CONFIG.mockData.defaultBandPowers;

        // Generate oscillating band powers with some randomness
        const mockBands = {
            delta: defaults.delta + Math.sin(this.mockPhase * 0.3) * 0.2 + (Math.random() - 0.5) * variability,
            theta: defaults.theta + Math.sin(this.mockPhase * 0.5) * 0.3 + (Math.random() - 0.5) * variability,
            alpha: defaults.alpha + Math.sin(this.mockPhase * 0.7) * 0.4 + (Math.random() - 0.5) * variability,
            beta: defaults.beta + Math.sin(this.mockPhase * 1.2) * 0.3 + (Math.random() - 0.5) * variability,
            gamma: defaults.gamma + Math.sin(this.mockPhase * 1.8) * 0.2 + (Math.random() - 0.5) * variability
        };

        // Clamp values to 0-1 range
        Object.keys(mockBands).forEach(band => {
            mockBands[band] = Utils.clamp(mockBands[band], 0, 1);
        });

        // Random motor spikes
        const spike = Math.random() < CONFIG.mockData.spikeFrequency ?
            Utils.random(0.7, 1.0) : 0;

        // Process as if received from WebSocket
        this.updateBandPowers(mockBands);
        this.updateMotorSpike(spike);

        if (this.onDataUpdate) {
            this.onDataUpdate(this.getBandPowers(), this.motorSpike);
        }
    }

    /**
     * Get connection status
     * @returns {string} 'connected', 'disconnected', or 'mock'
     */
    getStatus() {
        if (this.mockDataEnabled) return 'mock';
        return this.connected ? 'connected' : 'disconnected';
    }

    /**
     * Reset all data and history
     */
    reset() {
        this.bandPowers = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        this.motorSpike = 0;
        this.lastSpikeTime = 0;

        Object.keys(this.history).forEach(band => {
            this.history[band] = [];
        });
    }

    /**
     * Cleanup and disconnect
     */
    destroy() {
        this.disconnect();
        this.disableMockData();
    }
}

// Create global instance
const eegDataHandler = new EEGDataHandler();
