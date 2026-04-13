// NeuroArt - Signal Processor
// Processes EEG band powers and extracts features for visualization

class SignalProcessor {
    constructor() {
        // Current processed values
        this.processedBands = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        // Smoothed values for visual parameters
        this.smoothedBands = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        // Motor spike detection
        this.motorSpikeActive = false;
        this.spikeIntensity = 0;
        this.spikeCooldown = 0;

        // Temporal features
        this.bandVariance = {
            delta: 0,
            theta: 0,
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        // History for variance calculation
        this.varianceWindow = 30; // frames
        this.bandHistory = {
            delta: [],
            theta: [],
            alpha: [],
            beta: [],
            gamma: []
        };
    }

    /**
     * Process incoming EEG band powers
     * @param {object} bandPowers - Raw band powers from data handler (0-1)
     * @param {number} motorSpike - Motor spike value (0-1)
     */
    process(bandPowers, motorSpike) {
        // Update processed bands
        this.processedBands = { ...bandPowers };

        // Apply exponential smoothing for stable visuals
        const smoothingFactor = 0.15; // Higher = more responsive

        Object.keys(this.smoothedBands).forEach(band => {
            this.smoothedBands[band] = Utils.exponentialSmooth(
                this.smoothedBands[band],
                this.processedBands[band],
                smoothingFactor
            );
        });

        // Update band history and calculate variance
        this.updateVariance();

        // Process motor spike
        this.processMotorSpike(motorSpike);
    }

    /**
     * Update variance calculation for each band
     */
    updateVariance() {
        Object.keys(this.bandHistory).forEach(band => {
            // Add current value to history
            this.bandHistory[band].push(this.smoothedBands[band]);

            if (this.bandHistory[band].length > this.varianceWindow) {
                this.bandHistory[band].shift();
            }

            // Calculate variance
            if (this.bandHistory[band].length > 1) {
                const mean = this.bandHistory[band].reduce((a, b) => a + b, 0) /
                    this.bandHistory[band].length;

                const squaredDiffs = this.bandHistory[band].map(val =>
                    Math.pow(val - mean, 2)
                );

                const variance = squaredDiffs.reduce((a, b) => a + b, 0) /
                    this.bandHistory[band].length;

                this.bandVariance[band] = Math.sqrt(variance); // Standard deviation
            }
        });
    }

    /**
     * Process motor spike detection
     * @param {number} spike - Raw spike value (0-1)
     */
    processMotorSpike(spike) {
        // Cooldown counter
        if (this.spikeCooldown > 0) {
            this.spikeCooldown--;
        }

        // Detect threshold crossing
        if (spike > CONFIG.motorSpike.threshold && this.spikeCooldown === 0) {
            this.motorSpikeActive = true;
            this.spikeIntensity = spike;
            this.spikeCooldown = CONFIG.motorSpike.cooldown;
        } else {
            this.motorSpikeActive = false;
            // Decay spike intensity
            this.spikeIntensity *= 0.9;
        }
    }

    /**
     * Get smoothed band power value
     * @param {string} band - Band name
     * @returns {number} Smoothed value (0-1)
     */
    getBandPower(band) {
        return this.smoothedBands[band] || 0;
    }

    /**
     * Get all smoothed band powers
     * @returns {object} All band powers
     */
    getAllBandPowers() {
        return { ...this.smoothedBands };
    }

    /**
     * Get raw (unsmoothed) band power
     * @param {string} band - Band name
     * @returns {number} Raw value (0-1)
     */
    getRawBandPower(band) {
        return this.processedBands[band] || 0;
    }

    /**
     * Get band variance (temporal variability)
     * @param {string} band - Band name
     * @returns {number} Variance value
     */
    getBandVariance(band) {
        return this.bandVariance[band] || 0;
    }

    /**
     * Check if motor spike is active
     * @returns {boolean} True if spike active
     */
    isSpikeActive() {
        return this.motorSpikeActive;
    }

    /**
     * Get current spike intensity
     * @returns {number} Intensity (0-1)
     */
    getSpikeIntensity() {
        return this.spikeIntensity;
    }

    /**
     * Get dominant frequency band
     * @returns {string} Band name with highest power
     */
    getDominantBand() {
        let maxBand = 'alpha';
        let maxPower = 0;

        Object.keys(this.smoothedBands).forEach(band => {
            if (this.smoothedBands[band] > maxPower) {
                maxPower = this.smoothedBands[band];
                maxBand = band;
            }
        });

        return maxBand;
    }

    /**
     * Get overall brain activity level (combined band powers)
     * @returns {number} Activity level (0-1)
     */
    getActivityLevel() {
        const bands = Object.values(this.smoothedBands);
        const sum = bands.reduce((a, b) => a + b, 0);
        return Utils.clamp(sum / bands.length, 0, 1);
    }

    /**
     * Get mental state estimate based on band ratios
     * @returns {object} State scores
     */
    getMentalState() {
        const alpha = this.smoothedBands.alpha;
        const beta = this.smoothedBands.beta;
        const theta = this.smoothedBands.theta;
        const delta = this.smoothedBands.delta;

        return {
            relaxed: alpha + theta - beta, // High alpha/theta, low beta
            focused: beta - theta,          // High beta, low theta
            drowsy: delta + theta - alpha,  // High delta/theta, low alpha
            alert: beta + gamma - delta     // High beta/gamma, low delta
        };
    }

    /**
     * Reset all values
     */
    reset() {
        Object.keys(this.smoothedBands).forEach(band => {
            this.smoothedBands[band] = 0;
            this.processedBands[band] = 0;
            this.bandVariance[band] = 0;
            this.bandHistory[band] = [];
        });

        this.motorSpikeActive = false;
        this.spikeIntensity = 0;
        this.spikeCooldown = 0;
    }
}

// Create global instance
const signalProcessor = new SignalProcessor();
