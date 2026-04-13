// NeuroArt - Fluid Particle System
// Smoke-like particle dynamics with Perlin noise flow fields

class Particle {
    constructor(x, y, p5Instance) {
        this.p = p5Instance; // P5.js instance
        this.pos = this.p.createVector(x, y);
        this.vel = this.p.createVector(0, 0);
        this.acc = this.p.createVector(0, 0);

        this.life = CONFIG.particles.defaultLife;
        this.maxLife = this.life;
        this.size = CONFIG.particles.defaultSize;

        // Color (HSL)
        this.color = { h: 180, s: 70, l: 60 };
        this.opacity = CONFIG.particles.defaultOpacity;

        // Trail history for motion blur
        this.trail = [];
        this.trailLength = 0;

        this.isDead = false;
    }

    /**
     * Apply force to particle
     * @param {p5.Vector} force - Force vector
     */
    applyForce(force) {
        this.acc.add(force);
    }

    /**
     * Update particle physics
     * @param {number} noiseScale - Perlin noise scale
     * @param {number} noiseZ - 3D noise z-coordinate (time)
     * @param {number} turbulence - Turbulence intensity
     * @param {number} velocity - Base velocity multiplier
     */
    update(noiseScale, noiseZ, turbulence, velocity) {
        // Sample Perlin noise at particle position
        const noiseValue = this.p.noise(
            this.pos.x * noiseScale,
            this.pos.y * noiseScale,
            noiseZ
        );

        // Convert noise to angle (0-2π)
        const angle = noiseValue * this.p.TWO_PI * turbulence;

        // Create flow field force
        const flowForce = this.p.createVector(
            Math.cos(angle),
            Math.sin(angle)
        );
        flowForce.mult(velocity * 0.3);

        this.applyForce(flowForce);

        // Update velocity (Verlet integration)
        this.vel.add(this.acc);
        this.vel.limit(CONFIG.particles.maxSpeed * velocity);

        // Update position
        this.pos.add(this.vel);

        // Reset acceleration
        this.acc.mult(0);

        // Add damping (fluid friction)
        this.vel.mult(0.97);

        // Wrap around edges (toroidal space)
        this.wrapEdges();

        // Update trail
        this.updateTrail();

        // Decrease life
        this.life--;
        if (this.life <= 0) {
            this.isDead = true;
        }
    }

    /**
     * Update trail positions
     */
    updateTrail() {
        if (this.trailLength > 0) {
            this.trail.unshift({ x: this.pos.x, y: this.pos.y });

            if (this.trail.length > this.trailLength) {
                this.trail.pop();
            }
        }
    }

    /**
     * Wrap particle position around canvas edges
     */
    wrapEdges() {
        if (this.pos.x < 0) this.pos.x = this.p.width;
        if (this.pos.x > this.p.width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = this.p.height;
        if (this.pos.y > this.p.height) this.pos.y = 0;
    }

    /**
     * Render particle
     */
    render() {
        // Calculate opacity based on life
        const lifeFade = this.life / this.maxLife;
        const alpha = this.opacity * lifeFade;

        // Convert HSL to RGB
        const rgb = Utils.hslToRgb(this.color.h, this.color.s, this.color.l);

        this.p.noStroke();

        // Render trail with fading opacity
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const trailAlpha = alpha * (1 - i / this.trail.length) * CONFIG.particles.trailAlphaDecay;
                this.p.fill(rgb.r, rgb.g, rgb.b, trailAlpha * 255);

                const size = this.size * (1 - i / this.trail.length);
                this.p.ellipse(this.trail[i].x, this.trail[i].y, size, size);
            }
        }

        // Render main particle with glow
        this.p.fill(rgb.r, rgb.g, rgb.b, alpha * 255);
        this.p.ellipse(this.pos.x, this.pos.y, this.size, this.size);

        // Subtle glow effect (outer circle)
        this.p.fill(rgb.r, rgb.g, rgb.b, alpha * 100);
        this.p.ellipse(this.pos.x, this.pos.y, this.size * 1.5, this.size * 1.5);
    }

    /**
     * Set particle color
     * @param {object} color - HSL color object { h, s, l }
     */
    setColor(color) {
        this.color = { ...color };
    }

    /**
     * Set particle size
     * @param {number} size - Particle size
     */
    setSize(size) {
        this.size = Utils.clamp(size, CONFIG.particles.minSize, CONFIG.particles.maxSize);
    }

    /**
     * Set trail length
     * @param {number} length - Trail length (number of points)
     */
    setTrailLength(length) {
        this.trailLength = length;
    }

    /**
     * Check if particle is dead
     * @returns {boolean} True if dead
     */
    dead() {
        return this.isDead;
    }
}

// ============================================
// Particle System Manager
// ============================================

class ParticleSystem {
    constructor(p5Instance) {
        this.p = p5Instance;
        this.particles = [];

        this.maxParticles = CONFIG.performance.defaultParticleCount;
        this.spawnRate = 5; // Particles per frame

        // Noise parameters
        this.noiseZ = 0;
        this.noiseScale = CONFIG.noise.scale;

        // Visual parameters from data mapper
        this.turbulence = 1.0;
        this.velocity = 1.0;
        this.particleColor = { h: 180, s: 70, l: 60 };
        this.particleLife = CONFIG.particles.defaultLife;
        this.trailLength = 10;
    }

    /**
     * Initialize particle system
     */
    init() {
        // Spawn initial particles
        for (let i = 0; i < this.maxParticles * 0.5; i++) {
            this.spawnParticle(
                this.p.random(this.p.width),
                this.p.random(this.p.height)
            );
        }
    }

    /**
     * Update all particles
     */
    update() {
        // Update noise z-coordinate (3D noise evolution)
        this.noiseZ += CONFIG.noise.zIncrement * this.velocity;

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            particle.update(
                this.noiseScale,
                this.noiseZ,
                this.turbulence,
                this.velocity
            );

            // Remove dead particles
            if (particle.dead()) {
                this.particles.splice(i, 1);
            }
        }

        // Spawn new particles
        this.spawnParticles();
    }

    /**
     * Spawn new particles to maintain population
     */
    spawnParticles() {
        const deficit = this.maxParticles - this.particles.length;
        const toSpawn = Math.min(deficit, this.spawnRate);

        for (let i = 0; i < toSpawn; i++) {
            // Spawn from edges with some randomness
            const edge = this.p.floor(this.p.random(4));
            let x, y;

            switch (edge) {
                case 0: // Top
                    x = this.p.random(this.p.width);
                    y = this.p.random(-20, 20);
                    break;
                case 1: // Right
                    x = this.p.random(this.p.width - 20, this.p.width + 20);
                    y = this.p.random(this.p.height);
                    break;
                case 2: // Bottom
                    x = this.p.random(this.p.width);
                    y = this.p.random(this.p.height - 20, this.p.height + 20);
                    break;
                case 3: // Left
                    x = this.p.random(-20, 20);
                    y = this.p.random(this.p.height);
                    break;
            }

            this.spawnParticle(x, y);
        }
    }

    /**
     * Spawn a single particle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Particle} Created particle
     */
    spawnParticle(x, y) {
        const particle = new Particle(x, y, this.p);

        // Apply current visual parameters
        particle.setColor(this.particleColor);
        particle.life = this.particleLife;
        particle.maxLife = this.particleLife;
        particle.setTrailLength(this.trailLength);

        // Random size variation
        const sizeVariation = this.p.random(0.8, 1.2);
        particle.setSize(CONFIG.particles.defaultSize * sizeVariation);

        this.particles.push(particle);
        return particle;
    }

    /**
     * Render all particles
     */
    render() {
        // Use additive blending for smoke effect
        this.p.blendMode(this.p.BLEND); // or LIGHTEST for glow

        for (const particle of this.particles) {
            particle.render();
        }

        this.p.blendMode(this.p.BLEND);
    }

    /**
     * Update visual parameters from data mapper
     * @param {object} visualParams - Visual parameters
     */
    updateVisualParams(visualParams) {
        this.particleColor = {
            h: visualParams.hue,
            s: visualParams.saturation,
            l: visualParams.lightness
        };

        this.turbulence = visualParams.turbulence;
        this.velocity = visualParams.velocity;
        this.particleLife = visualParams.particleLife;

        // Update existing particles' colors gradually
        for (const particle of this.particles) {
            particle.setColor(this.particleColor);
        }
    }

    /**
     * Set maximum particle count
     * @param {number} count - Max particle count
     */
    setMaxParticles(count) {
        this.maxParticles = Utils.clamp(
            count,
            CONFIG.performance.minParticleCount,
            CONFIG.performance.maxParticleCount
        );
    }

    /**
     * Set trail length for all particles
     * @param {number} length - Trail length
     */
    setTrailLength(length) {
        this.trailLength = length;
        for (const particle of this.particles) {
            particle.setTrailLength(length);
        }
    }

    /**
     * Get current particle count
     * @returns {number} Particle count
     */
    getParticleCount() {
        return this.particles.length;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Reset particle system
     */
    reset() {
        this.clear();
        this.noiseZ = 0;
        this.init();
    }
}
