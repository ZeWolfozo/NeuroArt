// NeuroArt - Main P5.js Sketch
// Orchestrates all modules and rendering

// Global variables
let particleSystem;
let visualEffects;
let canvas;

// Performance tracking
let qualitySetting = 'medium';
let adaptiveQuality = true;
let lastQualityCheck = 0;

/**
 * P5.js setup function
 */
function setup() {
    // Create canvas
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');

    // Set pixel density for retina displays
    pixelDensity(CONFIG.canvas.pixelDensity);

    // Color mode
    colorMode(RGB, 255, 255, 255, 255);

    // Initialize particle system
    particleSystem = new ParticleSystem(window);
    particleSystem.init();

    // Initialize visual effects
    visualEffects = new VisualEffects(window);

    // Initialize UI controller
    uiController.init();

    // Set up EEG data handler callbacks
    eegDataHandler.onConnectionChange = (status) => {
        uiController.updateConnectionStatus(status);
    };

    eegDataHandler.onDataUpdate = (bandPowers, motorSpike) => {
        signalProcessor.process(bandPowers, motorSpike);
    };

    // Start with mock data enabled for testing
    eegDataHandler.enableMockData();

    // Apply initial quality settings
    applyQualitySettings(qualitySetting);

    console.log('NeuroArt initialized');
    console.log('Canvas size:', width, 'x', height);
}

/**
 * P5.js draw function (main render loop)
 */
function draw() {
    // Update FPS counter
    Utils.fpsCounter.update();

    // Get processed EEG data
    const bandPowers = signalProcessor.getAllBandPowers();
    const spikeActive = signalProcessor.isSpikeActive();
    const spikeIntensity = signalProcessor.getSpikeIntensity();

    // Map EEG data to visual parameters
    dataMapper.map(bandPowers, spikeIntensity);
    const visualParams = dataMapper.getVisualParams();

    // Set background color
    const bgColor = Utils.hslToRgb(
        visualParams.backgroundColor.h,
        visualParams.backgroundColor.s,
        visualParams.backgroundColor.l
    );
    background(bgColor.r, bgColor.g, bgColor.b);

    // Update particle system with visual parameters
    particleSystem.updateVisualParams(visualParams);
    particleSystem.update();

    // Update visual effects (with flow parameters from particle system)
    visualEffects.update(
        particleSystem.noiseScale,
        particleSystem.noiseZ,
        particleSystem.turbulence
    );

    // Trigger motor spike burst
    if (spikeActive) {
        const weights = dataMapper.getBandWeights();
        const color = {
            h: visualParams.hue,
            s: visualParams.saturation,
            l: visualParams.lightness
        };
        visualEffects.triggerBurst(spikeIntensity, weights.motorSpike, color);
    }

    // Render effects (background glow, sparks)
    visualEffects.render();

    // Render particles
    particleSystem.render();

    // Update UI (throttled)
    uiController.update();
    uiController.updateParticleCount(particleSystem.getParticleCount());

    // Adaptive quality adjustment
    if (adaptiveQuality) {
        checkAdaptiveQuality();
    }

    // Handle quality change requests from UI
    if (window.requestedQuality) {
        applyQualitySettings(window.requestedQuality);
        window.requestedQuality = null;
    }
}

/**
 * P5.js window resize handler
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    console.log('Canvas resized:', width, 'x', height);
}

/**
 * Apply quality settings
 * @param {string} quality - Quality level ('low', 'medium', 'high', 'ultra', 'auto')
 */
function applyQualitySettings(quality) {
    if (quality === 'auto') {
        adaptiveQuality = true;
        quality = 'medium'; // Start with medium
    } else {
        adaptiveQuality = false;
    }

    qualitySetting = quality;

    if (!CONFIG.performance.quality[quality]) {
        console.warn(`Unknown quality setting: ${quality}`);
        return;
    }

    const settings = CONFIG.performance.quality[quality];

    // Apply particle count
    particleSystem.setMaxParticles(settings.particles);

    // Apply trail length
    particleSystem.setTrailLength(settings.trailLength);

    console.log(`Quality set to ${quality}:`, settings);
}

/**
 * Check and adjust quality based on FPS (adaptive mode)
 */
function checkAdaptiveQuality() {
    const now = performance.now();
    if (now - lastQualityCheck < 2000) return; // Check every 2 seconds

    lastQualityCheck = now;
    const fps = Utils.fpsCounter.getFPS();

    const thresholds = CONFIG.performance.fpsThreshold;

    if (fps < thresholds.dropToLow && qualitySetting !== 'low') {
        console.log(`FPS too low (${fps}), dropping to low quality`);
        applyQualitySettings('low');
    } else if (fps < thresholds.dropToMedium && qualitySetting === 'high') {
        console.log(`FPS low (${fps}), dropping to medium quality`);
        applyQualitySettings('medium');
    } else if (fps > thresholds.upgradeToHigh && qualitySetting === 'medium') {
        console.log(`FPS good (${fps}), upgrading to high quality`);
        applyQualitySettings('high');
    }
}

/**
 * Keyboard shortcuts
 */
function keyPressed() {
    // Space - toggle panel
    if (key === ' ') {
        uiController.togglePanel();
        return false; // Prevent default
    }

    // F - toggle fullscreen
    if (key === 'f' || key === 'F') {
        uiController.toggleFullscreen();
        return false;
    }

    // M - toggle mock data
    if (key === 'm' || key === 'M') {
        uiController.toggleMockData();
        return false;
    }

    // H - toggle help
    if (key === 'h' || key === 'H') {
        uiController.showHelp();
        return false;
    }

    // R - reset settings
    if (key === 'r' || key === 'R') {
        uiController.resetSettings();
        return false;
    }

    // S - save settings
    if (key === 's' || key === 'S') {
        uiController.saveSettings();
        return false;
    }

    // Number keys - load presets
    const presets = ['calming', 'balanced', 'energetic', 'meditative', 'focused'];
    if (key >= '1' && key <= '5') {
        const index = parseInt(key) - 1;
        uiController.loadPreset(presets[index]);
        return false;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (eegDataHandler) {
        eegDataHandler.destroy();
    }
});
