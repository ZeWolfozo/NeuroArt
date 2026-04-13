// NeuroArt - Data Mapper
// Maps processed EEG signals to visual parameters

class DataMapper {
    constructor() {
        // Current band weights (user-adjustable)
        this.bandWeights = { ...CONFIG.defaultWeights };

        // Active preset
        this.activePreset = 'balanced';

        // Visual parameters (output)
        this.visualParams = {
            hue: 180,
            saturation: 70,
            lightness: 60,
            opacity: 0.6,
            velocity: 1.0,
            turbulence: 1.0,
            particleLife: 120,
            backgroundColor: { h: 240, s: 30, l: 5 }
        };

        // Transition state for smooth preset changes
        this.targetParams = { ...this.visualParams };
        this.transitionProgress = 1.0; // 0-1, 1 = complete

        // Color palette
        this.colorPalette = CONFIG.colorPalettes.spectrum;
    }

    /**
     * Map EEG data to visual parameters
     * @param {object} bandPowers - Processed band powers from signal processor
     * @param {number} spikeIntensity - Motor spike intensity
     */
    map(bandPowers, spikeIntensity) {
        // Apply band weights
        const weighted = {};
        Object.keys(bandPowers).forEach(band => {
            weighted[band] = bandPowers[band] * this.bandWeights[band];
        });

        // Map to color (theta/alpha dominant)
        this.mapToColor(weighted);

        // Map to motion (beta/gamma dominant)
        this.mapToMotion(weighted);

        // Map delta to background ambience
        this.mapToBackground(weighted.delta);

        // Apply smooth transitions if preset is changing
        this.updateTransition();
    }

    /**
     * Map band powers to color parameters
     * @param {object} weighted - Weighted band powers
     */
    mapToColor(weighted) {
        // Theta/Alpha primarily control hue
        const thetaAlpha = (weighted.theta + weighted.alpha) / 2;

        // Map to hue range from palette
        const hueRange = this.colorPalette.hueRange;
        this.targetParams.hue = Utils.map(
            thetaAlpha,
            0, 1,
            hueRange[0], hueRange[1]
        );

        // Beta/Gamma influence saturation
        const betaGamma = (weighted.beta + weighted.gamma) / 2;
        const satRange = this.colorPalette.saturation;
        this.targetParams.saturation = Utils.map(
            betaGamma,
            0, 1,
            satRange[0], satRange[1]
        );

        // Alpha influences lightness
        const lightRange = this.colorPalette.lightness;
        this.targetParams.lightness = Utils.map(
            weighted.alpha,
            0, 1,
            lightRange[0], lightRange[1]
        );

        // Combined alpha/theta controls opacity
        this.targetParams.opacity = Utils.map(
            thetaAlpha,
            0, 1,
            0.3, 0.9
        );
    }

    /**
     * Map band powers to motion parameters
     * @param {object} weighted - Weighted band powers
     */
    mapToMotion(weighted) {
        // Beta controls base velocity
        this.targetParams.velocity = Utils.map(
            weighted.beta,
            0, 1,
            CONFIG.particles.minSpeed,
            CONFIG.particles.maxSpeed
        );

        // Gamma controls turbulence/chaos
        this.targetParams.turbulence = Utils.map(
            weighted.gamma,
            0, 1,
            CONFIG.noise.turbulenceMin,
            CONFIG.noise.turbulenceMax
        );

        // Inverse relationship: higher beta = shorter particle life (fast movement)
        this.targetParams.particleLife = Utils.map(
            weighted.beta,
            0, 1,
            CONFIG.particles.maxLife,
            CONFIG.particles.minLife
        );
    }

    /**
     * Map delta to background ambience
     * @param {number} deltaWeighted - Weighted delta power
     */
    mapToBackground(deltaWeighted) {
        // Delta controls background darkness
        const bgLightness = Utils.map(deltaWeighted, 0, 1, 3, 12);

        this.targetParams.backgroundColor = {
            h: 240, // Deep blue
            s: 30,
            l: bgLightness
        };
    }

    /**
     * Update parameter transition (smooth preset changes)
     */
    updateTransition() {
        if (this.transitionProgress < 1.0) {
            this.transitionProgress += 0.05; // 20 frames to complete
            this.transitionProgress = Math.min(1.0, this.transitionProgress);

            const t = Utils.easeInOutCubic(this.transitionProgress);

            // Interpolate all parameters
            this.visualParams.hue = Utils.lerp(this.visualParams.hue, this.targetParams.hue, t);
            this.visualParams.saturation = Utils.lerp(this.visualParams.saturation, this.targetParams.saturation, t);
            this.visualParams.lightness = Utils.lerp(this.visualParams.lightness, this.targetParams.lightness, t);
            this.visualParams.opacity = Utils.lerp(this.visualParams.opacity, this.targetParams.opacity, t);
            this.visualParams.velocity = Utils.lerp(this.visualParams.velocity, this.targetParams.velocity, t);
            this.visualParams.turbulence = Utils.lerp(this.visualParams.turbulence, this.targetParams.turbulence, t);
            this.visualParams.particleLife = Utils.lerp(this.visualParams.particleLife, this.targetParams.particleLife, t);

            this.visualParams.backgroundColor.l = Utils.lerp(
                this.visualParams.backgroundColor.l,
                this.targetParams.backgroundColor.l,
                t
            );
        } else {
            // No transition, directly use target
            const smoothness = 0.15; // Smooth following
            this.visualParams.hue = Utils.lerp(this.visualParams.hue, this.targetParams.hue, smoothness);
            this.visualParams.saturation = Utils.lerp(this.visualParams.saturation, this.targetParams.saturation, smoothness);
            this.visualParams.lightness = Utils.lerp(this.visualParams.lightness, this.targetParams.lightness, smoothness);
            this.visualParams.opacity = Utils.lerp(this.visualParams.opacity, this.targetParams.opacity, smoothness);
            this.visualParams.velocity = Utils.lerp(this.visualParams.velocity, this.targetParams.velocity, smoothness);
            this.visualParams.turbulence = Utils.lerp(this.visualParams.turbulence, this.targetParams.turbulence, smoothness);
            this.visualParams.particleLife = Utils.lerp(this.visualParams.particleLife, this.targetParams.particleLife, smoothness);
            this.visualParams.backgroundColor.l = Utils.lerp(this.visualParams.backgroundColor.l, this.targetParams.backgroundColor.l, smoothness);
        }
    }

    /**
     * Get current visual parameters
     * @returns {object} Visual parameter values
     */
    getVisualParams() {
        return { ...this.visualParams };
    }

    /**
     * Get specific parameter
     * @param {string} param - Parameter name
     * @returns {number} Parameter value
     */
    getParam(param) {
        return this.visualParams[param];
    }

    /**
     * Set band weight
     * @param {string} band - Band name
     * @param {number} weight - Weight value (0-3)
     */
    setBandWeight(band, weight) {
        if (this.bandWeights.hasOwnProperty(band)) {
            this.bandWeights[band] = Utils.clamp(weight, 0, 3);
            this.activePreset = 'custom';
        }
    }

    /**
     * Get current band weights
     * @returns {object} Band weights
     */
    getBandWeights() {
        return { ...this.bandWeights };
    }

    /**
     * Load preset configuration
     * @param {string} presetName - Preset name
     */
    loadPreset(presetName) {
        if (!CONFIG.presets[presetName]) {
            console.warn(`Preset "${presetName}" not found`);
            return;
        }

        const preset = CONFIG.presets[presetName];

        // Update weights
        this.bandWeights = { ...preset.weights };

        // Update color palette
        if (preset.colorPalette && CONFIG.colorPalettes[preset.colorPalette]) {
            this.colorPalette = CONFIG.colorPalettes[preset.colorPalette];
        }

        // Start transition
        this.transitionProgress = 0;
        this.activePreset = presetName;

        console.log(`Loaded preset: ${presetName}`);
    }

    /**
     * Get active preset name
     * @returns {string} Active preset name
     */
    getActivePreset() {
        return this.activePreset;
    }

    /**
     * Get color as CSS string
     * @param {number} alpha - Alpha override (optional)
     * @returns {string} CSS color string
     */
    getColorString(alpha = null) {
        const a = alpha !== null ? alpha : this.visualParams.opacity;
        return Utils.hsla(
            this.visualParams.hue,
            this.visualParams.saturation,
            this.visualParams.lightness,
            a
        );
    }

    /**
     * Get background color as CSS string
     * @returns {string} CSS color string
     */
    getBackgroundColorString() {
        const bg = this.visualParams.backgroundColor;
        return Utils.hsla(bg.h, bg.s, bg.l, 1.0);
    }

    /**
     * Export current settings
     * @returns {object} Settings object
     */
    exportSettings() {
        return {
            weights: this.getBandWeights(),
            preset: this.activePreset,
            colorPalette: this.colorPalette
        };
    }

    /**
     * Import settings
     * @param {object} settings - Settings object
     */
    importSettings(settings) {
        if (settings.weights) {
            this.bandWeights = { ...settings.weights };
        }
        if (settings.preset) {
            this.activePreset = settings.preset;
        }
        if (settings.colorPalette) {
            this.colorPalette = settings.colorPalette;
        }
    }

    /**
     * Reset to default settings
     */
    reset() {
        this.bandWeights = { ...CONFIG.defaultWeights };
        this.loadPreset('balanced');
    }
}

// Create global instance
const dataMapper = new DataMapper();
