/**
 * Glitch Animation System
 *
 * Orchestrates glitch effects triggered by:
 * - Audio transients (immediate response to peaks)
 * - Time-based chance (scales with Growl intensity)
 * - Random events (rare unpredictable glitches)
 *
 * Effects include:
 * - Screen tear (horizontal slice displacement)
 * - RGB channel separation
 * - Geometry distortion (vertex jitter)
 * - Color inversion
 * - UV distortion
 * - Reality break (layered chaos)
 */

import * as THREE from 'three';
import { useTimeStore } from '../store/timeStore';
import { useAudioStore } from '../store/audioStore';

// ===== Types =====

export type GlitchType =
  | 'screen_tear'
  | 'rgb_split'
  | 'geometry_jitter'
  | 'color_inversion'
  | 'uv_distortion'
  | 'reality_break';

export interface GlitchTrigger {
  type: 'transient' | 'time' | 'random';
  intensity: number;  // 0-1
  duration: number;   // Milliseconds
}

export interface GlitchState {
  active: boolean;
  currentGlitch: GlitchType | null;
  intensity: number;
  remainingDuration: number;
  cooldown: number;
  time: number;
}

export interface GlitchScaling {
  triggerMultiplier: number;
  durationMultiplier: number;
  intensityBoost: number;
  realityBreakEnabled: boolean;
  minCooldown: number;
}

// ===== Glitch Trigger System =====

/**
 * Handles glitch trigger detection and selection.
 * Evaluates conditions each frame and determines when to start glitches.
 */
export class GlitchTriggerSystem {
  private state: GlitchState = {
    active: false,
    currentGlitch: null,
    intensity: 0,
    remainingDuration: 0,
    cooldown: 0,
    time: 0,
  };

  private baseCooldown: number = 500; // ms between glitches

  /**
   * Update the trigger system each frame.
   * Returns the current glitch state.
   */
  update(
    delta: number,
    transientIntensity: number,
    isTransient: boolean,
    growlIntensity: number,
    audioLevel: number,
    glitchChanceMultiplier: number = 1
  ): GlitchState {
    // Increment time
    this.state.time += delta;

    // Get Growl-based scaling
    const scaling = this.getGlitchScaling(growlIntensity);

    // Reduce cooldown
    this.state.cooldown = Math.max(0, this.state.cooldown - delta * 1000);

    // If glitch active, reduce duration
    if (this.state.active) {
      this.state.remainingDuration -= delta * 1000;
      if (this.state.remainingDuration <= 0) {
        this.endGlitch();
      }
      return { ...this.state };
    }

    // Check for triggers (only if not on cooldown)
    if (this.state.cooldown <= 0) {
      const trigger = this.checkTriggers(
        delta,
        transientIntensity,
        isTransient,
        growlIntensity,
        audioLevel,
        scaling,
        glitchChanceMultiplier
      );
      if (trigger) {
        this.startGlitch(trigger, scaling);
      }
    }

    return { ...this.state };
  }

  /**
   * Check all trigger conditions.
   * Uses delta-time-based probability so trigger rates are frame-rate independent.
   */
  private checkTriggers(
    delta: number,
    transientIntensity: number,
    isTransient: boolean,
    growlIntensity: number,
    _audioLevel: number,
    scaling: GlitchScaling,
    glitchChanceMultiplier: number
  ): GlitchTrigger | null {
    // Normalize probability to per-second rate, then scale by delta
    // This makes trigger rates frame-rate independent
    const dt = Math.min(delta, 0.1); // Cap to prevent burst after tab-switch

    // 1. Transient trigger (immediate response to audio peaks)
    // Triggers when transient is detected with sufficient intensity
    if (isTransient && transientIntensity > 0.5) {
      return {
        type: 'transient',
        intensity: Math.min(transientIntensity * 1.2, 1.0),
        duration: 50 + transientIntensity * 150, // 50-200ms
      };
    }

    // 2. Growl-driven time-based trigger
    // Base rate: ~3.6 glitches/hour at no Growl, scaling up to ~36/hour at max Growl
    // Uses glitchChanceMultiplier from GrowlEffects for proper integration
    const baseRatePerSecond = 0.001; // ~3.6 per hour base
    const growlRate = baseRatePerSecond * scaling.triggerMultiplier * glitchChanceMultiplier;
    const timeChance = 1 - Math.pow(1 - growlRate, dt * 60); // Convert to per-update probability
    if (Math.random() < timeChance) {
      return {
        type: 'time',
        intensity: Math.min(0.3 + growlIntensity * 0.5 + scaling.intensityBoost, 1.0),
        duration: (100 + growlIntensity * 400) * scaling.durationMultiplier,
      };
    }

    // 3. Random ambient trigger (works even with zero Growl and no audio)
    // Ensures the palace always feels slightly off — rare surprise glitches
    // Rate: ~1 glitch per 5 minutes baseline
    const randomRatePerSecond = 0.0033;
    const randomChance = 1 - Math.pow(1 - randomRatePerSecond, dt * 60);
    if (Math.random() < randomChance) {
      return {
        type: 'random',
        intensity: 0.2 + Math.random() * 0.3,
        duration: 50 + Math.random() * 100,
      };
    }

    return null;
  }

  /**
   * Start a new glitch effect.
   */
  private startGlitch(trigger: GlitchTrigger, scaling: GlitchScaling): void {
    this.state.active = true;
    this.state.intensity = Math.min(trigger.intensity + scaling.intensityBoost, 1.0);
    this.state.remainingDuration = trigger.duration * scaling.durationMultiplier;
    this.state.currentGlitch = this.selectGlitchType(trigger, scaling);
    this.state.cooldown = Math.max(scaling.minCooldown, this.baseCooldown);
  }

  /**
   * End the current glitch.
   */
  private endGlitch(): void {
    this.state.active = false;
    this.state.currentGlitch = null;
    this.state.intensity = 0;
    this.state.remainingDuration = 0;
  }

  /**
   * Select which type of glitch to show based on trigger and context.
   */
  private selectGlitchType(
    trigger: GlitchTrigger,
    scaling: GlitchScaling
  ): GlitchType {
    // Weight selection based on trigger type and intensity
    const weights: Record<GlitchType, number> = {
      screen_tear: trigger.type === 'transient' ? 0.35 : 0.20,
      rgb_split: 0.25,
      geometry_jitter: trigger.type === 'transient' ? 0.20 : 0.10,
      color_inversion: 0.12,
      uv_distortion: 0.15,
      // Reality break only available at high Growl or high intensity
      reality_break: (scaling.realityBreakEnabled || trigger.intensity > 0.8) ? 0.13 : 0.02,
    };

    // Weighted random selection
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return type as GlitchType;
    }

    return 'screen_tear'; // Fallback
  }

  /**
   * Calculate Growl-based scaling factors.
   */
  private getGlitchScaling(growlIntensity: number): GlitchScaling {
    return {
      // Trigger chance multiplier (1x to 3x)
      triggerMultiplier: 1 + growlIntensity * 2,

      // Duration multiplier (1x to 1.5x)
      durationMultiplier: 1 + growlIntensity * 0.5,

      // Intensity boost (0 to 0.3)
      intensityBoost: growlIntensity * 0.3,

      // Reality break becomes possible at 50% Growl
      realityBreakEnabled: growlIntensity > 0.5,

      // Minimum cooldown decreases (500ms to 200ms)
      minCooldown: Math.max(200, 500 - growlIntensity * 300),
    };
  }

  /**
   * Force a specific glitch (for testing/events).
   */
  forceGlitch(type: GlitchType, intensity: number, duration: number): void {
    this.state.active = true;
    this.state.currentGlitch = type;
    this.state.intensity = Math.min(intensity, 1.0);
    this.state.remainingDuration = duration;
    this.state.cooldown = this.baseCooldown;
  }

  /**
   * Get current glitch state (read-only).
   */
  getState(): Readonly<GlitchState> {
    return { ...this.state };
  }

  /**
   * Reset the system state.
   */
  reset(): void {
    this.state = {
      active: false,
      currentGlitch: null,
      intensity: 0,
      remainingDuration: 0,
      cooldown: 0,
      time: 0,
    };
  }
}

// ===== Glitch Uniforms =====

/**
 * Uniform structure for glitch shaders.
 */
export interface GlitchUniforms {
  u_glitchIntensity: { value: number };
  u_glitchType: { value: number };
  u_glitchTime: { value: number };
  u_geometryGlitch: { value: number };
  u_screenTearOffset: { value: number };
  u_rgbSplitOffset: { value: THREE.Vector2 };
  u_growlIntensity: { value: number };
  u_transientIntensity: { value: number };
  u_pixelDissolve: { value: number };
  u_resolution: { value: THREE.Vector2 };
}

/**
 * Create default glitch uniforms for shader materials.
 */
export function createGlitchUniforms(): GlitchUniforms {
  return {
    u_glitchIntensity: { value: 0 },
    u_glitchType: { value: -1 },
    u_glitchTime: { value: 0 },
    u_geometryGlitch: { value: 0 },
    u_screenTearOffset: { value: 0 },
    u_rgbSplitOffset: { value: new THREE.Vector2(0, 0) },
    u_growlIntensity: { value: 0 },
    u_transientIntensity: { value: 0 },
    u_pixelDissolve: { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  };
}

/**
 * Map GlitchType to shader integer.
 */
function glitchTypeToInt(type: GlitchType | null): number {
  if (!type) return -1;
  const types: GlitchType[] = [
    'screen_tear',
    'rgb_split',
    'geometry_jitter',
    'color_inversion',
    'uv_distortion',
    'reality_break',
  ];
  return types.indexOf(type);
}

// ===== Main Glitch System =====

/**
 * Main GlitchSystem class that orchestrates all glitch effects.
 * Integrates with audio and Growl systems for trigger detection.
 */
export class GlitchSystem {
  private triggerSystem: GlitchTriggerSystem;
  private geometryMaterials: Map<string, THREE.ShaderMaterial>;
  private uniforms: GlitchUniforms;
  private isInitialized: boolean = false;

  constructor() {
    this.triggerSystem = new GlitchTriggerSystem();
    this.geometryMaterials = new Map();
    this.uniforms = createGlitchUniforms();
  }

  /**
   * Initialize the glitch system.
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Update resolution on window resize
    window.addEventListener('resize', this.handleResize);

    this.isInitialized = true;
  }

  private handleResize = (): void => {
    this.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  };

  /**
   * Register a material for geometry glitch effects.
   * Materials must have u_geometryGlitch and u_glitchTime uniforms.
   */
  registerMaterial(id: string, material: THREE.ShaderMaterial): void {
    if (material.uniforms.u_geometryGlitch) {
      this.geometryMaterials.set(id, material);
    }
  }

  /**
   * Unregister a material.
   */
  unregisterMaterial(id: string): void {
    this.geometryMaterials.delete(id);
  }

  /**
   * Update the glitch system each frame.
   */
  update(delta: number): GlitchState {
    if (!this.isInitialized) {
      return this.triggerSystem.getState();
    }

    // Get audio data
    const audioState = useAudioStore.getState();
    const transientIntensity = audioState.transientIntensity;
    const isTransient = audioState.transientIntensity > 0.1;
    const audioLevel = audioState.overall;

    // Get Growl intensity and effects
    const timeState = useTimeStore.getState();
    const growlIntensity = timeState.growlIntensity;
    const glitchChanceMultiplier = timeState.growlEffects.glitchChanceMultiplier;

    // Update trigger system
    const state = this.triggerSystem.update(
      delta,
      transientIntensity,
      isTransient,
      growlIntensity,
      audioLevel,
      glitchChanceMultiplier
    );

    // Update uniforms
    this.updateUniforms(state, delta);

    // Update registered geometry materials
    this.updateGeometryMaterials(state);

    return state;
  }

  /**
   * Update shader uniforms based on glitch state.
   */
  private updateUniforms(state: GlitchState, delta: number): void {
    this.uniforms.u_glitchIntensity.value = state.intensity;
    this.uniforms.u_glitchType.value = glitchTypeToInt(state.currentGlitch);
    this.uniforms.u_glitchTime.value += delta;

    // Pass audio/Growl data for shader-level scaling
    const audioState = useAudioStore.getState();
    const timeState = useTimeStore.getState();
    this.uniforms.u_transientIntensity.value = audioState.transientIntensity;
    this.uniforms.u_growlIntensity.value = timeState.growlIntensity;

    // Compute pixel dissolve: active at high Growl, scales with intensity
    // Dissolve kicks in at Growl > 0.4 and scales up
    const growl = timeState.growlIntensity;
    this.uniforms.u_pixelDissolve.value = state.active
      ? Math.max(0, (growl - 0.4) / 0.6) * state.intensity
      : 0;

    // Calculate specific effect parameters
    if (state.active && state.currentGlitch) {
      switch (state.currentGlitch) {
        case 'screen_tear':
          // Random tear position
          this.uniforms.u_screenTearOffset.value = Math.random();
          break;

        case 'rgb_split': {
          // RGB split scaled by transient + Growl for proportional response
          const angle = Math.random() * Math.PI * 2;
          const transientBoost = audioState.transientIntensity * 0.015;
          const growlBoost = growl * 0.01;
          const offset = state.intensity * 0.02 + transientBoost + growlBoost;
          this.uniforms.u_rgbSplitOffset.value.set(
            Math.cos(angle) * offset,
            Math.sin(angle) * offset
          );
          break;
        }

        case 'geometry_jitter':
          this.uniforms.u_geometryGlitch.value = state.intensity;
          break;

        default:
          this.uniforms.u_geometryGlitch.value = 0;
      }
    } else {
      this.uniforms.u_geometryGlitch.value = 0;
      this.uniforms.u_screenTearOffset.value = 0;
      this.uniforms.u_rgbSplitOffset.value.set(0, 0);
    }
  }

  /**
   * Update registered geometry materials with glitch uniforms.
   */
  private updateGeometryMaterials(state: GlitchState): void {
    const geometryIntensity =
      state.currentGlitch === 'geometry_jitter' || state.currentGlitch === 'reality_break'
        ? state.intensity
        : 0;

    for (const material of this.geometryMaterials.values()) {
      if (material.uniforms.u_geometryGlitch) {
        material.uniforms.u_geometryGlitch.value = geometryIntensity;
      }
      if (material.uniforms.u_glitchTime) {
        material.uniforms.u_glitchTime.value = this.uniforms.u_glitchTime.value;
      }
    }
  }

  /**
   * Get glitch uniforms for post-processing shader.
   */
  getUniforms(): GlitchUniforms {
    return this.uniforms;
  }

  /**
   * Check if a glitch is currently active.
   */
  isActive(): boolean {
    return this.triggerSystem.getState().active;
  }

  /**
   * Get the current glitch type.
   */
  getCurrentGlitchType(): GlitchType | null {
    return this.triggerSystem.getState().currentGlitch;
  }

  /**
   * Get current glitch intensity.
   */
  getIntensity(): number {
    return this.triggerSystem.getState().intensity;
  }

  /**
   * Force a specific glitch effect (for testing/scripted events).
   */
  forceGlitch(type: GlitchType, intensity: number, duration: number): void {
    this.triggerSystem.forceGlitch(type, intensity, duration);
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.geometryMaterials.clear();
    this.triggerSystem.reset();
    this.isInitialized = false;
  }
}

// ===== Singleton Instance =====

let glitchSystemInstance: GlitchSystem | null = null;

/**
 * Get the singleton GlitchSystem instance.
 */
export function getGlitchSystem(): GlitchSystem {
  if (!glitchSystemInstance) {
    glitchSystemInstance = new GlitchSystem();
  }
  return glitchSystemInstance;
}

/**
 * Dispose the singleton instance (for cleanup/testing).
 */
export function disposeGlitchSystem(): void {
  if (glitchSystemInstance) {
    glitchSystemInstance.dispose();
    glitchSystemInstance = null;
  }
}

export default GlitchSystem;
