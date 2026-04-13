// NeuroArt - Utility Functions
// Helper functions for math, color, performance, and data processing

const Utils = {
    // ============================================
    // Math Utilities
    // ============================================

    /**
     * Linear interpolation between two values
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Clamp value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Map value from one range to another
     * @param {number} value - Input value
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },

    /**
     * Smooth step interpolation (ease-in-out)
     * @param {number} t - Input value (0-1)
     * @returns {number} Smoothed value
     */
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    },

    /**
     * Ease-in-out cubic interpolation
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    /**
     * Ease-out quadratic
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeOutQuad(t) {
        return t * (2 - t);
    },

    /**
     * Ease-in-out exponential
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    easeInOutExpo(t) {
        if (t === 0 || t === 1) return t;
        return t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    /**
     * Generate random value in range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Random integer in range (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // ============================================
    // Color Utilities
    // ============================================

    /**
     * Convert HSL to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {object} { r, g, b } values (0-255)
     */
    hslToRgb(h, s, l) {
        h = h % 360;
        s = s / 100;
        l = l / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r, g, b;
        if (h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    },

    /**
     * Convert RGB to HSL
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {object} { h, s, l } values
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

            if (max === r) {
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
            } else if (max === g) {
                h = ((b - r) / delta + 2) / 6;
            } else {
                h = ((r - g) / delta + 4) / 6;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    },

    /**
     * Interpolate between two colors in HSL space
     * @param {object} color1 - { h, s, l }
     * @param {object} color2 - { h, s, l }
     * @param {number} t - Interpolation factor (0-1)
     * @returns {object} Interpolated color { h, s, l }
     */
    lerpColor(color1, color2, t) {
        // Handle hue interpolation (shortest path on color wheel)
        let h1 = color1.h;
        let h2 = color2.h;
        let hDiff = h2 - h1;

        if (hDiff > 180) {
            h1 += 360;
        } else if (hDiff < -180) {
            h2 += 360;
        }

        return {
            h: (this.lerp(h1, h2, t) + 360) % 360,
            s: this.lerp(color1.s, color2.s, t),
            l: this.lerp(color1.l, color2.l, t)
        };
    },

    /**
     * Get color string from HSL values with alpha
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @param {number} a - Alpha (0-1)
     * @returns {string} CSS color string
     */
    hsla(h, s, l, a = 1) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    },

    // ============================================
    // Vector Math
    // ============================================

    /**
     * Create 2D vector
     * @param {number} x - X component
     * @param {number} y - Y component
     * @returns {object} Vector { x, y }
     */
    createVector(x, y) {
        return { x, y };
    },

    /**
     * Add two vectors
     * @param {object} v1 - Vector 1
     * @param {object} v2 - Vector 2
     * @returns {object} Result vector
     */
    addVectors(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    },

    /**
     * Subtract vectors (v1 - v2)
     * @param {object} v1 - Vector 1
     * @param {object} v2 - Vector 2
     * @returns {object} Result vector
     */
    subtractVectors(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    },

    /**
     * Multiply vector by scalar
     * @param {object} v - Vector
     * @param {number} scalar - Scalar value
     * @returns {object} Result vector
     */
    multiplyVector(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar };
    },

    /**
     * Get vector magnitude
     * @param {object} v - Vector
     * @returns {number} Magnitude
     */
    vectorMagnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },

    /**
     * Normalize vector to unit length
     * @param {object} v - Vector
     * @returns {object} Normalized vector
     */
    normalizeVector(v) {
        const mag = this.vectorMagnitude(v);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: v.x / mag, y: v.y / mag };
    },

    /**
     * Limit vector magnitude
     * @param {object} v - Vector
     * @param {number} max - Maximum magnitude
     * @returns {object} Limited vector
     */
    limitVector(v, max) {
        const mag = this.vectorMagnitude(v);
        if (mag > max) {
            const normalized = this.normalizeVector(v);
            return this.multiplyVector(normalized, max);
        }
        return v;
    },

    /**
     * Get angle from vector
     * @param {object} v - Vector
     * @returns {number} Angle in radians
     */
    vectorAngle(v) {
        return Math.atan2(v.y, v.x);
    },

    /**
     * Vector from angle (unit vector)
     * @param {number} angle - Angle in radians
     * @returns {object} Unit vector
     */
    vectorFromAngle(angle) {
        return { x: Math.cos(angle), y: Math.sin(angle) };
    },

    // ============================================
    // Performance Monitoring
    // ============================================

    /**
     * FPS counter
     */
    fpsCounter: {
        frames: [],
        lastTime: performance.now(),

        update() {
            const now = performance.now();
            const delta = now - this.lastTime;
            this.lastTime = now;

            this.frames.push(1000 / delta);
            if (this.frames.length > 60) {
                this.frames.shift();
            }
        },

        getFPS() {
            if (this.frames.length === 0) return 0;
            const sum = this.frames.reduce((a, b) => a + b, 0);
            return Math.round(sum / this.frames.length);
        },

        getAvgFrameTime() {
            const fps = this.getFPS();
            return fps > 0 ? (1000 / fps).toFixed(2) : 0;
        }
    },

    /**
     * Simple moving average calculator
     */
    createMovingAverage(windowSize = 10) {
        return {
            values: [],
            windowSize,

            add(value) {
                this.values.push(value);
                if (this.values.length > this.windowSize) {
                    this.values.shift();
                }
            },

            get() {
                if (this.values.length === 0) return 0;
                const sum = this.values.reduce((a, b) => a + b, 0);
                return sum / this.values.length;
            },

            reset() {
                this.values = [];
            }
        };
    },

    // ============================================
    // Data Processing
    // ============================================

    /**
     * Normalize array of values to 0-1 range
     * @param {Array} arr - Array of numbers
     * @returns {Array} Normalized array
     */
    normalizeArray(arr) {
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const range = max - min;

        if (range === 0) return arr.map(() => 0.5);
        return arr.map(val => (val - min) / range);
    },

    /**
     * Apply smoothing to value using exponential moving average
     * @param {number} currentValue - Current value
     * @param {number} newValue - New value
     * @param {number} smoothingFactor - Smoothing factor (0-1)
     * @returns {number} Smoothed value
     */
    exponentialSmooth(currentValue, newValue, smoothingFactor) {
        return currentValue * (1 - smoothingFactor) + newValue * smoothingFactor;
    },

    /**
     * Detect threshold crossing (for spike detection)
     * @param {number} value - Current value
     * @param {number} threshold - Threshold value
     * @param {number} previousValue - Previous value
     * @returns {boolean} True if threshold was crossed
     */
    detectThresholdCrossing(value, threshold, previousValue) {
        return previousValue < threshold && value >= threshold;
    },

    // ============================================
    // Storage Utilities
    // ============================================

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {*} data - Data to store (will be JSON stringified)
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    },

    /**
     * Load data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Parsed data or default value
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return defaultValue;
        }
    },

    /**
     * Check if localStorage is available
     * @returns {boolean} True if available
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    // ============================================
    // Time Utilities
    // ============================================

    /**
     * Format milliseconds to readable string
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted string
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / 60000) % 60;
        const hours = Math.floor(ms / 3600000);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    },

    /**
     * Simple debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Simple throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
