/**
 * Audio Reactive System
 *
 * Manages the binding between audio analysis data and shader uniforms.
 * Updates all audio-reactive materials each frame with current levels.
 */

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useAudioSmooth, useAudioLevels } from '../store/audioStore';
import { useGrowlIntensity, useTimeStore } from '../store/timeStore';

// Import shader sources
import liminalVertexShader from '../shaders/liminal.vert?raw';
import liminalFragmentShader from '../shaders/liminal.frag?raw';

// Pale-strata color palette
export const LIMINAL_COLORS = {
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
  background: new THREE.Color('#1a1834'),
  gradientStart: new THREE.Color('#3a3861'),
  gradientEnd: new THREE.Color('#2c2c4b'),
} as const;

/**
 * Configuration for creating a liminal material
 */
export interface LiminalMaterialConfig {
  seed: number;
  roomIndex: number;
  patternScale?: number;
  patternRotation?: number;
  breatheIntensity?: number;
  rippleFrequency?: number;
  rippleIntensity?: number;
  abnormality?: number;
}

/**
 * Default uniform values
 */
const DEFAULT_UNIFORMS = {
  // Time
  u_time: 0,
  u_deltaTime: 0,

  // Audio (raw)
  u_bass: 0,
  u_mid: 0,
  u_high: 0,
  u_transient: 0,

  // Audio (smoothed)
  u_bassSmooth: 0,
  u_midSmooth: 0,
  u_highSmooth: 0,

  // Environment
  u_seed: 0,
  u_roomIndex: 0,
  u_abnormality: 0,
  u_growlIntensity: 0,

  // Pattern
  u_patternScale: 1.0,
  u_patternRotation: 0,
  u_breatheIntensity: 1.0,
  u_rippleFrequency: 3.0,
  u_rippleIntensity: 0.5,

  // Glitch
  u_geometryGlitch: 0,
  u_glitchTime: 0,

  // Resolution
  u_resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
};

/**
 * Creates a complete set of uniforms for the liminal shader material
 */
export function createLiminalUniforms(config: LiminalMaterialConfig): Record<string, THREE.IUniform> {
  return {
    // Time
    u_time: { value: DEFAULT_UNIFORMS.u_time },
    u_deltaTime: { value: DEFAULT_UNIFORMS.u_deltaTime },

    // Audio (raw)
    u_bass: { value: DEFAULT_UNIFORMS.u_bass },
    u_mid: { value: DEFAULT_UNIFORMS.u_mid },
    u_high: { value: DEFAULT_UNIFORMS.u_high },
    u_transient: { value: DEFAULT_UNIFORMS.u_transient },

    // Audio (smoothed)
    u_bassSmooth: { value: DEFAULT_UNIFORMS.u_bassSmooth },
    u_midSmooth: { value: DEFAULT_UNIFORMS.u_midSmooth },
    u_highSmooth: { value: DEFAULT_UNIFORMS.u_highSmooth },

    // Environment
    u_seed: { value: config.seed },
    u_roomIndex: { value: config.roomIndex },
    u_abnormality: { value: config.abnormality ?? 0 },
    u_growlIntensity: { value: DEFAULT_UNIFORMS.u_growlIntensity },

    // Colors (pale-strata palette)
    u_colorPrimary: { value: LIMINAL_COLORS.primary.clone() },
    u_colorSecondary: { value: LIMINAL_COLORS.secondary.clone() },
    u_colorBackground: { value: LIMINAL_COLORS.background.clone() },
    u_colorGradientStart: { value: LIMINAL_COLORS.gradientStart.clone() },
    u_colorGradientEnd: { value: LIMINAL_COLORS.gradientEnd.clone() },

    // Pattern
    u_patternScale: { value: config.patternScale ?? DEFAULT_UNIFORMS.u_patternScale },
    u_patternRotation: { value: config.patternRotation ?? DEFAULT_UNIFORMS.u_patternRotation },
    u_breatheIntensity: { value: config.breatheIntensity ?? DEFAULT_UNIFORMS.u_breatheIntensity },
    u_rippleFrequency: { value: config.rippleFrequency ?? DEFAULT_UNIFORMS.u_rippleFrequency },
    u_rippleIntensity: { value: config.rippleIntensity ?? DEFAULT_UNIFORMS.u_rippleIntensity },

    // Glitch (consumed by vertex shader for geometry distortion)
    u_geometryGlitch: { value: DEFAULT_UNIFORMS.u_geometryGlitch },
    u_glitchTime: { value: DEFAULT_UNIFORMS.u_glitchTime },

    // Resolution
    u_resolution: { value: DEFAULT_UNIFORMS.u_resolution.clone() },
  };
}

/**
 * Creates a liminal ShaderMaterial with audio-reactive capabilities
 */
export function createLiminalMaterial(config: LiminalMaterialConfig): THREE.ShaderMaterial {
  const uniforms = createLiminalUniforms(config);

  return new THREE.ShaderMaterial({
    vertexShader: liminalVertexShader,
    fragmentShader: liminalFragmentShader,
    uniforms,
    side: THREE.DoubleSide,
    transparent: false,
  });
}

/**
 * Audio data interface for updates
 */
export interface AudioData {
  bass: number;
  mid: number;
  high: number;
  transient: number;
  bassSmooth: number;
  midSmooth: number;
  highSmooth: number;
}

/**
 * Updates a liminal material's uniforms with current audio data
 */
export function updateLiminalMaterial(
  material: THREE.ShaderMaterial,
  time: number,
  deltaTime: number,
  audioData: AudioData,
  growlIntensity: number = 0
): void {
  const uniforms = material.uniforms;

  // Time
  uniforms.u_time.value = time;
  uniforms.u_deltaTime.value = deltaTime;

  // Audio (raw)
  uniforms.u_bass.value = audioData.bass;
  uniforms.u_mid.value = audioData.mid;
  uniforms.u_high.value = audioData.high;
  uniforms.u_transient.value = audioData.transient;

  // Audio (smoothed)
  uniforms.u_bassSmooth.value = audioData.bassSmooth;
  uniforms.u_midSmooth.value = audioData.midSmooth;
  uniforms.u_highSmooth.value = audioData.highSmooth;

  // Growl
  uniforms.u_growlIntensity.value = growlIntensity;
}

/**
 * React hook for managing liminal material with automatic audio updates
 *
 * @param config Material configuration
 * @returns Material ref and update function
 */
export function useLiminalMaterial(config: LiminalMaterialConfig) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Create material once
  const material = useMemo(() => {
    const mat = createLiminalMaterial(config);
    materialRef.current = mat;
    return mat;
  }, [config.seed, config.roomIndex]);

  // Get audio store state
  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();

  // Get Growl intensity from time store
  const growlIntensity = useGrowlIntensity();

  // Initialize time store on mount
  useEffect(() => {
    const timeStore = useTimeStore.getState();
    if (timeStore.deploymentTimestamp === 0) {
      timeStore.initialize();
    }
  }, []);

  // Update material each frame
  useFrame((state, delta) => {
    if (!materialRef.current) return;

    const audioData: AudioData = {
      bass: audioLevels.bass,
      mid: audioLevels.mid,
      high: audioLevels.high,
      transient: audioLevels.transientIntensity,
      bassSmooth: audioSmooth.bassSmooth,
      midSmooth: audioSmooth.midSmooth,
      highSmooth: audioSmooth.highSmooth,
    };

    // Update time store to recalculate Growl intensity
    useTimeStore.getState().update();

    updateLiminalMaterial(
      materialRef.current,
      state.clock.elapsedTime,
      delta,
      audioData,
      growlIntensity
    );
  });

  return { material, materialRef };
}

/**
 * Hook for batch-updating multiple materials with audio data
 * Useful for rooms with multiple surfaces
 */
export function useAudioReactiveUpdate() {
  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();
  const materialsRef = useRef<Set<THREE.ShaderMaterial>>(new Set());

  // Initialize time store on mount
  useEffect(() => {
    const timeStore = useTimeStore.getState();
    if (timeStore.deploymentTimestamp === 0) {
      timeStore.initialize();
    }
  }, []);

  // Register a material for updates
  const registerMaterial = useCallback((material: THREE.ShaderMaterial) => {
    materialsRef.current.add(material);
    return () => materialsRef.current.delete(material);
  }, []);

  // Update all registered materials
  useFrame((state, delta) => {
    const audioData: AudioData = {
      bass: audioLevels.bass,
      mid: audioLevels.mid,
      high: audioLevels.high,
      transient: audioLevels.transientIntensity,
      bassSmooth: audioSmooth.bassSmooth,
      midSmooth: audioSmooth.midSmooth,
      highSmooth: audioSmooth.highSmooth,
    };

    // Update time store to recalculate Growl intensity
    useTimeStore.getState().update();

    materialsRef.current.forEach((material) => {
      updateLiminalMaterial(
        material,
        state.clock.elapsedTime,
        delta,
        audioData,
        growlIntensity
      );
    });
  });

  return { registerMaterial, materialsRef };
}

/**
 * Calculate abnormality factor based on room depth
 * Rooms get progressively stranger the deeper you go
 */
export function getAbnormalityFactor(roomIndex: number): number {
  // Exponential curve: starts slow, accelerates
  // 0 at room 0, ~0.5 at room 10, ~0.8 at room 20, approaches 1.0
  return 1 - Math.exp(-roomIndex * 0.05);
}

/**
 * Interpolate between colors based on audio level
 * Used for smooth color transitions in pale-strata style
 */
export function interpolateColor(
  colorA: THREE.Color,
  colorB: THREE.Color,
  t: number,
  smoothing: number = 0.1
): THREE.Color {
  const result = colorA.clone();
  result.lerp(colorB, Math.min(1, Math.max(0, t)) * smoothing);
  return result;
}

/**
 * Create color interpolation function for state transitions
 * Returns a function that smoothly transitions between colors over time
 */
export function createColorInterpolator(
  startColor: THREE.Color,
  endColor: THREE.Color,
  duration: number = 1.0
) {
  let progress = 0;
  const current = startColor.clone();

  return (delta: number): THREE.Color => {
    progress = Math.min(1, progress + delta / duration);
    // Ease-out cubic for smooth deceleration
    const t = 1 - Math.pow(1 - progress, 3);
    current.copy(startColor).lerp(endColor, t);
    return current;
  };
}

export default {
  createLiminalMaterial,
  createLiminalUniforms,
  updateLiminalMaterial,
  useLiminalMaterial,
  useAudioReactiveUpdate,
  getAbnormalityFactor,
  interpolateColor,
  createColorInterpolator,
  LIMINAL_COLORS,
};
