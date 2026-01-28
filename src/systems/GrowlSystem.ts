/**
 * Growl System - Time-Based Dread Mechanics
 *
 * Orchestrates all Growl-related effects:
 * - Sub-bass drone audio generation
 * - Shadow movement anomalies
 * - Light flickering
 * - Camera shake and FOV distortion
 * - Color/shader distortion integration
 *
 * The Growl represents an unseen presence that grows stronger over time.
 * The longer the installation exists, the more oppressive the atmosphere.
 */

import * as THREE from 'three';
import { useTimeStore } from '../store/timeStore';
import type { GrowlEffects } from '../store/timeStore';

// ===== Types =====

export interface ShadowAnomaly {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  intensity: number;
}

interface LightFlickerState {
  baseIntensity: number;
  currentIntensity: number;
  targetIntensity: number;
  flickerTimer: number;
  flickerDuration: number;
}

// ===== Sub-Bass Drone =====

/**
 * Generates the Growl's signature sub-bass drone.
 * Uses Web Audio API to create a barely perceptible rumble.
 */
export class GrowlDrone {
  private audioContext: AudioContext;
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  private filterNode: BiquadFilterNode;
  private lfoOscillator: OscillatorNode;
  private lfoGain: GainNode;
  private isStarted: boolean = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    // Primary oscillator for sub-bass
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 30;

    // LFO for subtle modulation
    this.lfoOscillator = audioContext.createOscillator();
    this.lfoOscillator.type = 'sine';
    this.lfoOscillator.frequency.value = 0.1; // Very slow modulation

    this.lfoGain = audioContext.createGain();
    this.lfoGain.gain.value = 5; // Modulate frequency by ±5Hz

    // Low-pass filter to soften harmonics
    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 80;
    this.filterNode.Q.value = 1;

    // Main gain for volume control
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 0; // Start silent

    // Connect LFO to oscillator frequency
    this.lfoOscillator.connect(this.lfoGain);
    this.lfoGain.connect(this.oscillator.frequency);

    // Connect main signal path: oscillator → filter → gain → destination
    this.oscillator.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(audioContext.destination);
  }

  start(): void {
    if (this.isStarted) return;
    this.oscillator.start();
    this.lfoOscillator.start();
    this.isStarted = true;
  }

  update(effects: GrowlEffects, _deltaTime: number): void {
    if (!this.isStarted) return;

    const now = this.audioContext.currentTime;

    // Smooth frequency transition
    this.oscillator.frequency.linearRampToValueAtTime(
      effects.droneFrequency,
      now + 0.1
    );

    // Smooth volume transition - keep it subtle!
    // Max volume is effects.droneVolume * 0.25 for barely perceptible effect
    this.gainNode.gain.linearRampToValueAtTime(
      effects.droneVolume * 0.25,
      now + 0.5
    );

    // Modulate LFO depth based on intensity
    this.lfoGain.gain.linearRampToValueAtTime(
      3 + effects.droneVolume * 4,
      now + 0.5
    );
  }

  dispose(): void {
    if (this.isStarted) {
      this.oscillator.stop();
      this.lfoOscillator.stop();
    }
    this.oscillator.disconnect();
    this.lfoOscillator.disconnect();
    this.lfoGain.disconnect();
    this.filterNode.disconnect();
    this.gainNode.disconnect();
  }
}

// ===== Shadow Anomaly System =====

/**
 * Manages shadow anomalies - dark shapes that move in the player's periphery.
 * Creates a sense of unseen presence watching the player.
 */
export class ShadowAnomalySystem {
  private anomalies: ShadowAnomaly[] = [];
  private maxAnomalies: number = 5;
  private shaderDataArray: Float32Array;

  constructor() {
    // 4 floats per anomaly: x, z, intensity, lifetime (normalized)
    this.shaderDataArray = new Float32Array(this.maxAnomalies * 4);
  }

  update(
    delta: number,
    growlEffects: GrowlEffects,
    playerPosition: THREE.Vector3
  ): void {
    // Spawn new anomalies based on Growl intensity
    if (
      this.anomalies.length < this.maxAnomalies &&
      Math.random() < growlEffects.shadowMovementChance
    ) {
      this.spawnAnomaly(playerPosition);
    }

    // Update existing anomalies
    for (let i = this.anomalies.length - 1; i >= 0; i--) {
      const anomaly = this.anomalies[i];

      // Decrease lifetime
      anomaly.lifetime -= delta;

      // Move anomaly
      anomaly.position.add(
        anomaly.velocity.clone().multiplyScalar(delta)
      );

      // Drift toward player's peripheral vision
      const toPlayer = new THREE.Vector3()
        .subVectors(playerPosition, anomaly.position)
        .normalize();

      // Add perpendicular drift for eerie movement
      const perpendicular = new THREE.Vector3(
        -toPlayer.z,
        0,
        toPlayer.x
      ).multiplyScalar(Math.sin(anomaly.lifetime * 2) * 0.5);

      anomaly.velocity.lerp(
        toPlayer.clone().add(perpendicular).multiplyScalar(0.8),
        delta * 0.5
      );

      // Remove expired anomalies
      if (anomaly.lifetime <= 0) {
        this.anomalies.splice(i, 1);
      }
    }
  }

  private spawnAnomaly(playerPosition: THREE.Vector3): void {
    // Spawn in player's peripheral vision (sides and behind)
    const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.5; // 45° to 315°
    const distance = 5 + Math.random() * 10;
    const lifetime = 2 + Math.random() * 3;

    this.anomalies.push({
      position: new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0.1, // Near floor for creepy shadow effect
        playerPosition.z + Math.sin(angle) * distance
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ),
      lifetime,
      maxLifetime: lifetime,
      intensity: 0.3 + Math.random() * 0.4,
    });
  }

  /**
   * Get anomaly data formatted for shader uniforms.
   * Returns Float32Array with [x, z, intensity, normalizedLifetime] per anomaly.
   */
  getShaderData(): Float32Array {
    // Clear the array
    this.shaderDataArray.fill(0);

    // Fill with active anomaly data
    for (let i = 0; i < this.anomalies.length && i < this.maxAnomalies; i++) {
      const a = this.anomalies[i];
      const baseIndex = i * 4;
      this.shaderDataArray[baseIndex + 0] = a.position.x;
      this.shaderDataArray[baseIndex + 1] = a.position.z;
      this.shaderDataArray[baseIndex + 2] = a.intensity;
      this.shaderDataArray[baseIndex + 3] = a.lifetime / a.maxLifetime; // Normalized for fade
    }

    return this.shaderDataArray;
  }

  getAnomalyCount(): number {
    return this.anomalies.length;
  }

  dispose(): void {
    this.anomalies = [];
  }
}

// ===== Light Flicker System =====

/**
 * Manages light flickering based on Growl intensity.
 * Creates an unstable, unsettling lighting atmosphere.
 */
export class LightFlickerSystem {
  private lights: Map<string, LightFlickerState> = new Map();

  registerLight(id: string, baseIntensity: number): void {
    this.lights.set(id, {
      baseIntensity,
      currentIntensity: baseIntensity,
      targetIntensity: baseIntensity,
      flickerTimer: 0,
      flickerDuration: 0,
    });
  }

  unregisterLight(id: string): void {
    this.lights.delete(id);
  }

  update(delta: number, growlEffects: GrowlEffects): Map<string, number> {
    const intensities = new Map<string, number>();

    for (const [id, light] of this.lights) {
      // Chance to start a new flicker
      if (
        light.flickerTimer <= 0 &&
        Math.random() < growlEffects.lightFlickerIntensity * 0.1
      ) {
        // Start flicker
        light.flickerDuration = 0.05 + Math.random() * 0.2;
        light.flickerTimer = light.flickerDuration;
        // Flicker to random reduced intensity
        light.targetIntensity =
          light.baseIntensity * (0.1 + Math.random() * 0.5);
      }

      // Update flicker timer
      if (light.flickerTimer > 0) {
        light.flickerTimer -= delta;

        if (light.flickerTimer <= 0) {
          // End flicker - return to normal
          light.targetIntensity = light.baseIntensity;
        }
      }

      // Smooth intensity transition
      light.currentIntensity = THREE.MathUtils.lerp(
        light.currentIntensity,
        light.targetIntensity,
        delta * 20
      );

      intensities.set(id, light.currentIntensity);
    }

    return intensities;
  }

  getLightIntensity(id: string): number {
    return this.lights.get(id)?.currentIntensity ?? 1;
  }

  dispose(): void {
    this.lights.clear();
  }
}

// ===== Camera Effects =====

/**
 * Calculate camera shake offset based on Growl intensity.
 * Creates a subtle disorienting effect.
 */
export function calculateGrowlShake(
  growlEffects: GrowlEffects,
  time: number
): THREE.Vector3 {
  if (growlEffects.shakeIntensity < 0.001) {
    return new THREE.Vector3(0, 0, 0);
  }

  const intensity = growlEffects.shakeIntensity;

  // Multiple frequencies for organic feel
  const x =
    (Math.sin(time * 15) * 0.3 +
      Math.sin(time * 23) * 0.2 +
      Math.sin(time * 37) * 0.1) *
    intensity;

  const y =
    (Math.sin(time * 17) * 0.2 + Math.sin(time * 29) * 0.15) * intensity;

  const z = Math.sin(time * 19) * 0.1 * intensity;

  return new THREE.Vector3(x, y, z);
}

/**
 * Calculate FOV distortion based on Growl intensity.
 * Creates subtle breathing effect on field of view.
 */
export function calculateGrowlFOV(
  baseFOV: number,
  growlEffects: GrowlEffects,
  time: number
): number {
  const distortion = growlEffects.fovDistortion;
  if (distortion < 0.01) return baseFOV;

  // Slow breathing FOV change
  const breathe = Math.sin(time * 0.3) * distortion * 0.5;

  // Occasional sharp changes
  const spike = Math.sin(time * 5) > 0.95 ? distortion : 0;

  return baseFOV + breathe + spike;
}

// ===== Main Growl System =====

/**
 * Main GrowlSystem class that orchestrates all dread effects.
 */
export class GrowlSystem {
  private drone: GrowlDrone | null = null;
  private shadowSystem: ShadowAnomalySystem;
  private flickerSystem: LightFlickerSystem;
  private isInitialized: boolean = false;

  constructor() {
    this.shadowSystem = new ShadowAnomalySystem();
    this.flickerSystem = new LightFlickerSystem();
  }

  /**
   * Initialize the Growl system with an AudioContext.
   * Call this after user interaction to satisfy autoplay policy.
   */
  async initialize(audioContext: AudioContext): Promise<void> {
    if (this.isInitialized) return;

    this.drone = new GrowlDrone(audioContext);
    this.drone.start();

    // Initialize time store
    useTimeStore.getState().initialize();

    this.isInitialized = true;
  }

  /**
   * Initialize without audio (for when audio context isn't available).
   */
  initializeWithoutAudio(): void {
    if (this.isInitialized) return;

    // Initialize time store
    useTimeStore.getState().initialize();

    this.isInitialized = true;
  }

  /**
   * Update the Growl system each frame.
   */
  update(delta: number, playerPosition: THREE.Vector3): void {
    if (!this.isInitialized) return;

    // Update time store
    useTimeStore.getState().update();

    const { growlEffects } = useTimeStore.getState();

    // Update subsystems
    this.drone?.update(growlEffects, delta);
    this.shadowSystem.update(delta, growlEffects, playerPosition);
    this.flickerSystem.update(delta, growlEffects);
  }

  /**
   * Get shadow anomaly data for shaders.
   */
  getShadowData(): Float32Array {
    return this.shadowSystem.getShaderData();
  }

  /**
   * Get current shadow anomaly count.
   */
  getShadowCount(): number {
    return this.shadowSystem.getAnomalyCount();
  }

  /**
   * Register a light for flickering.
   */
  registerLight(id: string, intensity: number): void {
    this.flickerSystem.registerLight(id, intensity);
  }

  /**
   * Unregister a light from flickering.
   */
  unregisterLight(id: string): void {
    this.flickerSystem.unregisterLight(id);
  }

  /**
   * Get current intensity for a registered light.
   */
  getLightIntensity(id: string): number {
    return this.flickerSystem.getLightIntensity(id);
  }

  /**
   * Get all light intensities.
   */
  getAllLightIntensities(): Map<string, number> {
    const { growlEffects } = useTimeStore.getState();
    return this.flickerSystem.update(0, growlEffects);
  }

  /**
   * Check if the system is initialized.
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.drone?.dispose();
    this.shadowSystem.dispose();
    this.flickerSystem.dispose();
    this.drone = null;
    this.isInitialized = false;
  }
}

// ===== Singleton Instance =====

let growlSystemInstance: GrowlSystem | null = null;

/**
 * Get the singleton GrowlSystem instance.
 */
export function getGrowlSystem(): GrowlSystem {
  if (!growlSystemInstance) {
    growlSystemInstance = new GrowlSystem();
  }
  return growlSystemInstance;
}

/**
 * Dispose the singleton instance (for cleanup/testing).
 */
export function disposeGrowlSystem(): void {
  if (growlSystemInstance) {
    growlSystemInstance.dispose();
    growlSystemInstance = null;
  }
}

export default GrowlSystem;
