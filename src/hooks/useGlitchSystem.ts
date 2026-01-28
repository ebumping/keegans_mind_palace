/**
 * React hooks for integrating the Glitch System with React Three Fiber.
 *
 * Provides easy-to-use hooks for:
 * - Initializing and updating the Glitch system
 * - Getting glitch state for post-processing
 * - Registering materials for geometry glitches
 * - Debug controls for testing
 */

import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GlitchSystem,
  getGlitchSystem,
  type GlitchState,
  type GlitchType,
  type GlitchUniforms,
} from '../systems/GlitchSystem';

/**
 * Initialize and manage the Glitch system lifecycle.
 * Call this once in your main scene component.
 */
export function useGlitchSystemInit() {
  const systemRef = useRef<GlitchSystem | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const system = getGlitchSystem();
    system.initialize();
    systemRef.current = system;
    isInitializedRef.current = true;

    return () => {
      // Note: We don't dispose here as other components may still need it
      // Call disposeGlitchSystem() explicitly when completely done
    };
  }, []);

  return systemRef.current;
}

/**
 * Update the Glitch system each frame and return current state.
 * Use this in your main scene component alongside useGlitchSystemInit.
 */
export function useGlitchSystemUpdate(): GlitchState {
  const stateRef = useRef<GlitchState>({
    active: false,
    currentGlitch: null,
    intensity: 0,
    remainingDuration: 0,
    cooldown: 0,
    time: 0,
  });

  useFrame((_, delta) => {
    const system = getGlitchSystem();
    stateRef.current = system.update(delta);
  });

  return stateRef.current;
}

/**
 * Combined hook for initializing and updating the Glitch system.
 * Returns current glitch state.
 */
export function useGlitchSystem(): GlitchState {
  useGlitchSystemInit();
  return useGlitchSystemUpdate();
}

/**
 * Get glitch uniforms for post-processing shader.
 * Updates automatically each frame.
 */
export function useGlitchUniforms(): GlitchUniforms {
  const uniformsRef = useRef<GlitchUniforms | null>(null);

  useEffect(() => {
    const system = getGlitchSystem();
    uniformsRef.current = system.getUniforms();
  }, []);

  return uniformsRef.current ?? getGlitchSystem().getUniforms();
}

/**
 * Register a shader material for geometry glitch effects.
 * The material must have u_geometryGlitch and u_glitchTime uniforms.
 */
export function useGlitchMaterial(
  materialId: string,
  material: THREE.ShaderMaterial | null
) {
  useEffect(() => {
    if (!material) return;

    const system = getGlitchSystem();
    system.registerMaterial(materialId, material);

    return () => {
      system.unregisterMaterial(materialId);
    };
  }, [materialId, material]);
}

/**
 * Check if a glitch is currently active.
 */
export function useGlitchActive(): boolean {
  const activeRef = useRef(false);

  useFrame(() => {
    activeRef.current = getGlitchSystem().isActive();
  });

  return activeRef.current;
}

/**
 * Get the current glitch type (or null if no glitch active).
 */
export function useCurrentGlitchType(): GlitchType | null {
  const typeRef = useRef<GlitchType | null>(null);

  useFrame(() => {
    typeRef.current = getGlitchSystem().getCurrentGlitchType();
  });

  return typeRef.current;
}

/**
 * Get the current glitch intensity (0-1).
 */
export function useGlitchIntensity(): number {
  const intensityRef = useRef(0);

  useFrame(() => {
    intensityRef.current = getGlitchSystem().getIntensity();
  });

  return intensityRef.current;
}

/**
 * Force a specific glitch effect (for testing/scripted events).
 */
export function useGlitchForce() {
  return useCallback(
    (type: GlitchType, intensity: number, duration: number) => {
      getGlitchSystem().forceGlitch(type, intensity, duration);
    },
    []
  );
}

/**
 * Debug hook for manually controlling glitch effects.
 */
export function useGlitchDebug() {
  const forceGlitch = useGlitchForce();
  const activeRef = useRef(false);
  const typeRef = useRef<GlitchType | null>(null);
  const intensityRef = useRef(0);

  useFrame(() => {
    const system = getGlitchSystem();
    activeRef.current = system.isActive();
    typeRef.current = system.getCurrentGlitchType();
    intensityRef.current = system.getIntensity();
  });

  const testGlitch = useCallback(
    (type: GlitchType) => {
      forceGlitch(type, 0.8, 1000);
    },
    [forceGlitch]
  );

  const testAllGlitches = useCallback(() => {
    const types: GlitchType[] = [
      'screen_tear',
      'rgb_split',
      'geometry_jitter',
      'color_inversion',
      'uv_distortion',
      'reality_break',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index >= types.length) {
        clearInterval(interval);
        return;
      }
      forceGlitch(types[index], 0.8, 800);
      index++;
    }, 1000);

    return () => clearInterval(interval);
  }, [forceGlitch]);

  return {
    isActive: activeRef.current,
    currentType: typeRef.current,
    intensity: intensityRef.current,
    forceGlitch,
    testGlitch,
    testAllGlitches,
  };
}

/**
 * Hook that provides full glitch controller capabilities.
 * Includes initialization, updating, and uniforms.
 */
export function useGlitchController() {
  const system = useGlitchSystemInit();
  const state = useGlitchSystemUpdate();
  const uniforms = useGlitchUniforms();
  const forceGlitch = useGlitchForce();

  return {
    system,
    state,
    uniforms,
    forceGlitch,
    isActive: state.active,
    currentGlitch: state.currentGlitch,
    intensity: state.intensity,
  };
}

export default useGlitchSystem;
