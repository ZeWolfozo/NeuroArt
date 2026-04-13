// NeuroArt - Visual Effects
// Special effects for motor spikes, bursts, and atmospheric elements

class VisualEffects {
    constructor(p5Instance) {
        this.p = p5Instance;

        // Active burst particles
        this.burstParticles = [];

        // Active sparks
        this.sparks = [];

        // Background glow effect
        this.glowIntensity = 0;
        this.targetGlowIntensity = 0;

        // Moving spike source position
        this.spikeSource = this.p.createVector(this.p.width / 2, this.p.height / 2);
        this.spikeVelocity = this.p.createVector(0, 0);
        this.spikeNoiseOffset = this.p.random(1000);
    }

    /**
     * Trigger motor spike burst effect
     * @param {number} intensity - Burst intensity (0-1)
     * @param {number} weight - Motor spike weight multiplier
     * @param {object} color - Particle color { h, s, l }
     */
    triggerBurst(intensity, weight, color) {
        const particleCount = Math.floor(
            CONFIG.motorSpike.burstParticles * intensity * weight
        );

        // Spawn from current moving source
        const centerX = this.spikeSource.x;
        const centerY = this.spikeSource.y;

        for (let i = 0; i < particleCount; i++) {
            const angle = this.p.random(this.p.TWO_PI);
            const speed = this.p.random(
                CONFIG.motorSpike.burstSpeed * 0.5,
                CONFIG.motorSpike.burstSpeed
            ) * intensity;

            const particle = {
                pos: this.p.createVector(centerX, centerY),
                vel: this.p.createVector(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                ),
                acc: this.p.createVector(0, 0), // Added acceleration for flow
                life: CONFIG.motorSpike.burstLife,
                maxLife: CONFIG.motorSpike.burstLife,
                size: this.p.random(3, 8),
                color: { ...color },
                intensity: intensity
            };

            // Add some color variation
            particle.color.h += this.p.random(-20, 20);
            particle.color.l += this.p.random(-10, 10);

            this.burstParticles.push(particle);
        }

        // Trigger sparks
        this.triggerSparks(intensity, weight, color, centerX, centerY);

        // Trigger glow pulse
        this.targetGlowIntensity = intensity * weight * 0.3;
    }

    /**
     * Trigger spark effects
     * @param {number} intensity - Spark intensity (0-1)
     * @param {number} weight - Motor spike weight multiplier
     * @param {object} color - Spark color { h, s, l }
     * @param {number} centerX - X position
     * @param {number} centerY - Y position
     */
    triggerSparks(intensity, weight, color, centerX, centerY) {
        const sparkCount = Math.floor(
            CONFIG.motorSpike.sparkCount * intensity * weight
        );

        for (let i = 0; i < sparkCount; i++) {
            const angle = this.p.random(this.p.TWO_PI);
            const length = this.p.random(20, CONFIG.motorSpike.sparkLength) * intensity;

            const spark = {
                startX: centerX,
                startY: centerY,
                endX: centerX + Math.cos(angle) * length,
                endY: centerY + Math.sin(angle) * length,
                velX: Math.cos(angle) * 2, // Drift velocity
                velY: Math.sin(angle) * 2,
                life: 15, // Short-lived
                maxLife: 15,
                color: { ...color },
                intensity: intensity
            };

            // Brighter sparks
            spark.color.l = Math.min(80, spark.color.l + 20);

            this.sparks.push(spark);
        }
    }

    /**
     * Update all visual effects
     * @param {number} noiseScale - Flow field scale
     * @param {number} noiseZ - Flow field time
     * @param {number} turbulence - Flow intensity
     */
    update(noiseScale = 0.005, noiseZ = 0, turbulence = 1.0) {
        // Update Spike Source Position (wandering)
        this.updateSpikeSource(noiseScale, noiseZ, turbulence);

        // Update burst particles with flow field
        for (let i = this.burstParticles.length - 1; i >= 0; i--) {
            const particle = this.burstParticles[i];

            // Calculate flow force
            const noiseValue = this.p.noise(
                particle.pos.x * noiseScale,
                particle.pos.y * noiseScale,
                noiseZ
            );
            const angle = noiseValue * this.p.TWO_PI * turbulence;
            const flowForce = this.p.createVector(Math.cos(angle), Math.sin(angle));
            flowForce.mult(0.5 * turbulence); // Gentle flow influence

            // Apply forces
            particle.acc.add(flowForce);
            particle.vel.add(particle.acc);
            particle.vel.mult(0.96); // Friction

            // Move
            particle.pos.add(particle.vel);
            particle.acc.mult(0); // Reset acceleration

            // Decrease life
            particle.life--;

            if (particle.life <= 0) {
                this.burstParticles.splice(i, 1);
            }
        }

        // Update sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i];

            // Drift sparks
            spark.startX += spark.velX;
            spark.startY += spark.velY;
            spark.endX += spark.velX;
            spark.endY += spark.velY;

            spark.life--;

            if (spark.life <= 0) {
                this.sparks.splice(i, 1);
            }
        }

        // Update glow intensity
        this.glowIntensity = Utils.lerp(this.glowIntensity, this.targetGlowIntensity, 0.1);
        this.targetGlowIntensity *= 0.95; // Decay
    }

    /**
     * Update the wandering position of the spike source
     */
    updateSpikeSource(noiseScale, noiseZ, turbulence) {
        // Use separate noise offset for source movement to make it distinct but related
        const nX = this.p.noise(this.spikeNoiseOffset, noiseZ * 0.5);
        const nY = this.p.noise(this.spikeNoiseOffset + 1000, noiseZ * 0.5);

        // Map noise to velocity
        const angle = nX * this.p.TWO_PI * 2;
        const speed = 2 + (turbulence * 2);

        const targetVel = this.p.createVector(Math.cos(angle), Math.sin(angle));
        targetVel.mult(speed);

        // Smooth steering
        this.spikeVelocity.lerp(targetVel, 0.05);
        this.spikeSource.add(this.spikeVelocity);

        // Wrap edges
        if (this.spikeSource.x < 0) this.spikeSource.x = this.p.width;
        if (this.spikeSource.x > this.p.width) this.spikeSource.x = 0;
        if (this.spikeSource.y < 0) this.spikeSource.y = this.p.height;
        if (this.spikeSource.y > this.p.height) this.spikeSource.y = 0;

        // Evolve noise
        this.spikeNoiseOffset += 0.005;
    }

    /**
     * Render visual effects
     */
    render() {
        // Render background glow at source position
        this.renderBackgroundGlow();

        // Render sparks (under particles)
        this.renderSparks();

        // Render burst particles
        this.renderBurstParticles();

        // Debug: visualize source position (optional)
        // this.p.fill(255, 0, 0);
        // this.p.circle(this.spikeSource.x, this.spikeSource.y, 10);
    }

    /**
     * Render background glow effect
     */
    renderBackgroundGlow() {
        if (this.glowIntensity > 0.01) {
            this.p.push();
            this.p.noStroke();

            // Radial gradient approximation centered on current source
            const centerX = this.spikeSource.x;
            const centerY = this.spikeSource.y;
            const maxRadius = Math.max(this.p.width, this.p.height) * 0.8;

            for (let r = maxRadius; r > 0; r -= 50) {
                const alpha = (1 - r / maxRadius) * this.glowIntensity * 20;
                this.p.fill(99, 102, 241, alpha); // Accent color
                this.p.ellipse(centerX, centerY, r * 2, r * 2);
            }

            this.p.pop();
        }
    }

    /**
     * Render spark effects
     */
    renderSparks() {
        if (this.sparks.length === 0) return;

        this.p.push();

        for (const spark of this.sparks) {
            const lifeFade = spark.life / spark.maxLife;
            const alpha = lifeFade * spark.intensity;

            const rgb = Utils.hslToRgb(spark.color.h, spark.color.s, spark.color.l);

            // Draw spark line with glow
            this.p.strokeWeight(2);
            this.p.stroke(rgb.r, rgb.g, rgb.b, alpha * 255);
            this.p.line(spark.startX, spark.startY, spark.endX, spark.endY);

            // Glow
            this.p.strokeWeight(4);
            this.p.stroke(rgb.r, rgb.g, rgb.b, alpha * 100);
            this.p.line(spark.startX, spark.startY, spark.endX, spark.endY);
        }

        this.p.pop();
    }

    /**
     * Render burst particles
     */
    renderBurstParticles() {
        if (this.burstParticles.length === 0) return;

        this.p.push();
        this.p.noStroke();

        for (const particle of this.burstParticles) {
            const lifeFade = particle.life / particle.maxLife;
            const alpha = lifeFade * particle.intensity * 0.8;

            const rgb = Utils.hslToRgb(particle.color.h, particle.color.s, particle.color.l);

            // Main particle
            this.p.fill(rgb.r, rgb.g, rgb.b, alpha * 255);
            this.p.ellipse(particle.pos.x, particle.pos.y, particle.size, particle.size);

            // Glow
            this.p.fill(rgb.r, rgb.g, rgb.b, alpha * 100);
            this.p.ellipse(particle.pos.x, particle.pos.y, particle.size * 2, particle.size * 2);
        }

        this.p.pop();
    }

    /**
     * Clear all effects
     */
    clear() {
        this.burstParticles = [];
        this.sparks = [];
        this.glowIntensity = 0;
        this.targetGlowIntensity = 0;
    }

    /**
     * Get active effect count
     * @returns {number} Total active effects
     */
    getActiveEffectCount() {
        return this.burstParticles.length + this.sparks.length;
    }
}

