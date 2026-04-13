// NeuroArt - Configuration Settings
// Centralized configuration for EEG visualization system

const CONFIG = {
  // WebSocket Connection Settings
  websocket: {
    url: 'ws://localhost:8080',
    reconnectInterval: 3000, // ms
    maxReconnectAttempts: 10
  },

  // DSI-Streamer Settings
  dsi: {
    serverOutport: 8944,
    clientInport: 8844
  },

  // Performance Settings
  performance: {
    targetFPS: 60,
    minParticleCount: 500,
    maxParticleCount: 2000,
    defaultParticleCount: 1000,
    
    // Quality presets
    quality: {
      low: { particles: 500, trailLength: 5, blur: false },
      medium: { particles: 1000, trailLength: 10, blur: false },
      high: { particles: 1500, trailLength: 15, blur: true },
      ultra: { particles: 2000, trailLength: 20, blur: true, glow: true }
    },
    
    // Auto-detect quality based on FPS
    autoQuality: true,
    fpsThreshold: {
      dropToLow: 40,
      dropToMedium: 50,
      upgradeToHigh: 58
    }
  },

  // EEG Band Frequency Ranges (Hz)
  eegBands: {
    delta: { min: 0.5, max: 4, color: '#1a0033' },
    theta: { min: 4, max: 8, color: '#6B46C1' },
    alpha: { min: 8, max: 13, color: '#14B8A6' },
    beta: { min: 13, max: 30, color: '#F97316' },
    gamma: { min: 30, max: 100, color: '#DC2626' }
  },

  // Default Band Weights (multipliers for visual influence)
  defaultWeights: {
    delta: 0.3,
    theta: 1.0,
    alpha: 1.2,
    beta: 1.0,
    gamma: 0.8,
    motorSpike: 1.5
  },

  // Visual Presets
  presets: {
    calming: {
      weights: { delta: 0.5, theta: 1.5, alpha: 1.8, beta: 0.3, gamma: 0.2, motorSpike: 0.5 },
      colorPalette: 'cool',
      flowSpeed: 0.6,
      particleLife: 180
    },
    energetic: {
      weights: { delta: 0.2, theta: 0.5, alpha: 0.8, beta: 1.8, gamma: 1.5, motorSpike: 2.0 },
      colorPalette: 'warm',
      flowSpeed: 1.4,
      particleLife: 90
    },
    balanced: {
      weights: { delta: 0.3, theta: 1.0, alpha: 1.2, beta: 1.0, gamma: 0.8, motorSpike: 1.5 },
      colorPalette: 'spectrum',
      flowSpeed: 1.0,
      particleLife: 120
    },
    meditative: {
      weights: { delta: 0.8, theta: 1.5, alpha: 1.0, beta: 0.2, gamma: 0.1, motorSpike: 0.3 },
      colorPalette: 'deep',
      flowSpeed: 0.4,
      particleLife: 200
    },
    focused: {
      weights: { delta: 0.2, theta: 0.6, alpha: 1.0, beta: 1.8, gamma: 1.2, motorSpike: 1.0 },
      colorPalette: 'sharp',
      flowSpeed: 1.2,
      particleLife: 100
    }
  },

  // Color Palettes (HSL values)
  colorPalettes: {
    cool: {
      hueRange: [180, 240],
      saturation: [60, 80],
      lightness: [40, 70]
    },
    warm: {
      hueRange: [0, 60],
      saturation: [70, 90],
      lightness: [50, 75]
    },
    spectrum: {
      hueRange: [0, 360],
      saturation: [60, 85],
      lightness: [45, 70]
    },
    deep: {
      hueRange: [240, 280],
      saturation: [50, 70],
      lightness: [20, 50]
    },
    sharp: {
      hueRange: [160, 220],
      saturation: [70, 95],
      lightness: [50, 80]
    }
  },

  // Particle System Settings
  particles: {
    defaultLife: 120, // frames
    minLife: 60,
    maxLife: 240,
    defaultSize: 4,
    minSize: 2,
    maxSize: 12,
    defaultSpeed: 1.0,
    minSpeed: 0.3,
    maxSpeed: 3.0,
    defaultOpacity: 0.6,
    trailAlphaDecay: 0.95
  },

  // Perlin Noise Settings
  noise: {
    scale: 0.008,
    octaves: 4,
    falloff: 0.5,
    zIncrement: 0.01, // 3D noise evolution speed
    turbulenceMin: 0.5,
    turbulenceMax: 2.5
  },

  // Motor Spike Burst Settings
  motorSpike: {
    threshold: 0.7, // Detection threshold (normalized)
    burstParticles: 80,
    burstSpeed: 2.5,
    burstLife: 60,
    sparkCount: 12,
    sparkLength: 40,
    cooldown: 15 // frames between bursts
  },

  // Signal Processing
  signal: {
    bufferSize: 512, // samples
    smoothingWindow: 10, // frames
    normalizationMethod: 'adaptive', // 'adaptive' or 'fixed'
    adaptiveTimeWindow: 5000, // ms for adaptive normalization
    spikeDetectionWindow: 50, // ms
    minSpikeAmplitude: 0.5
  },

  // UI Settings
  ui: {
    updateRate: 10, // Hz (control panel updates)
    transitionDuration: 500, // ms for preset transitions
    tooltipDelay: 700, // ms
    saveToLocalStorage: true
  },

  // Canvas Settings
  canvas: {
    backgroundColor: '#0a0a0f',
    useWebGL: false, // Enable for VR/high-end systems
    antialias: true,
    pixelDensity: 1 // Set to 2 for retina displays
  },

  // VR Settings (Meta Quest 3, etc.)
  vr: {
    enabled: false, // Auto-detect or user toggle
    fov: 110, // degrees
    ipd: 63, // mm, interpupillary distance
    renderScale: 1.2,
    controllerInput: true
  },

  // Mock Data Generator Settings
  mockData: {
    enabled: false, // Toggle for testing without hardware
    updateRate: 30, // Hz
    variability: 0.3, // 0-1, randomness factor
    defaultBandPowers: {
      delta: 0.3,
      theta: 0.4,
      alpha: 0.6,
      beta: 0.5,
      gamma: 0.3
    },
    spikeFrequency: 0.05 // Probability per frame
  },

  // Debug Settings
  debug: {
    showFPS: true,
    showParticleCount: true,
    showBandValues: true,
    showConnectionStatus: true,
    logSignalData: false,
    logPerformance: false
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
