/**
 * React hooks for integrating the Growl System with React Three Fiber.
 *
 * Provides easy-to-use hooks for:
 * - Initializing and updating the Growl system
 * - Applying camera shake effects
 * - Getting shadow anomaly data for shaders
 * - Managing flickering lights
 */

import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GrowlSystem } from '../systems/GrowlSystem';
import {
  getGrowlSystem,
  calculateGrowlShake,
  calculateGrowlFOV,
} from '../systems/GrowlSystem';
import {
  useTimeStore,
  useGrowlIntensity,
  useGrowlEffects,
  useGrowlPhase,
  GrowlPhase,
} from '../store/timeStore';

/**
 * Initialize and manage the Growl system lifecycle.
 * Call this once in your main scene component.
 */
export function useGrowlSystemInit(audioContext?: AudioContext) {
  const systemRef = useRef<GrowlSystem | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const system = getGrowlSystem();
    systemRef.current = system;

    if (audioContext) {
      system.initialize(audioContext);
    } else {
      system.initializeWithoutAudio();
    }

    isInitializedRef.current = true;

    return () => {
      // Note: We don't dispose here as other components may still need it
      // Call disposeGrowlSystem() explicitly when completely done
    };
  }, [audioContext]);

  return systemRef.current;
}

/**
 * Update the Growl system each frame.
 * Use this in your main scene component alongside useGrowlSystemInit.
 */
export function useGrowlSystemUpdate(playerPosition: THREE.Vector3) {
  const positionRef = useRef(playerPosition);
  positionRef.current = playerPosition;

  useFrame((_, delta) => {
    const system = getGrowlSystem();
    if (system.getIsInitialized()) {
      system.update(delta, positionRef.current);
    }
  });
}

/**
 * Apply camera shake effect based on Growl intensity.
 * Modifies the camera position each frame.
 */
export function useGrowlCameraShake(enabled: boolean = true) {
  const { camera } = useThree();
  const growlEffects = useGrowlEffects();
  const basePositionRef = useRef<THREE.Vector3 | null>(null);

  // Store base camera position on first render
  useEffect(() => {
    if (!basePositionRef.current) {
      basePositionRef.current = camera.position.clone();
    }
  }, [camera]);

  useFrame((state) => {
    if (!enabled || !basePositionRef.current) return;

    const shake = calculateGrowlShake(growlEffects, state.clock.elapsedTime);

    // Apply shake offset from base position
    camera.position.copy(basePositionRef.current).add(shake);
  });

  // Reset camera position when unmounting or disabled
  useEffect(() => {
    return () => {
      if (basePositionRef.current) {
        camera.position.copy(basePositionRef.current);
      }
    };
  }, [camera, enabled]);
}

/**
 * Apply FOV distortion based on Growl intensity.
 * Only works with PerspectiveCamera.
 */
export function useGrowlFOVDistortion(baseFOV: number = 75, enabled: boolean = true) {
  const { camera } = useThree();
  const growlEffects = useGrowlEffects();

  useFrame((state) => {
    if (!enabled) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const distortedFOV = calculateGrowlFOV(
      baseFOV,
      growlEffects,
      state.clock.elapsedTime
    );

    camera.fov = distortedFOV;
    camera.updateProjectionMatrix();
  });

  // Reset FOV when unmounting or disabled
  useEffect(() => {
    return () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = baseFOV;
        camera.updateProjectionMatrix();
      }
    };
  }, [camera, baseFOV, enabled]);
}

/**
 * Get shadow anomaly data for shader uniforms.
 * Returns data that can be passed to shaders for shadow effects.
 */
export function useGrowlShadowData() {
  const dataRef = useRef<Float32Array>(new Float32Array(20)); // 5 anomalies * 4 floats
  const countRef = useRef(0);

  useFrame(() => {
    const system = getGrowlSystem();
    if (system.getIsInitialized()) {
      dataRef.current = system.getShadowData();
      countRef.current = system.getShadowCount();
    }
  });

  return {
    shadowData: dataRef.current,
    shadowCount: countRef.current,
  };
}

/**
 * Register a light for Growl-based flickering.
 * Returns a ref containing the current intensity multiplier.
 */
export function useGrowlFlickeringLight(
  lightId: string,
  baseIntensity: number = 1
) {
  const intensityRef = useRef(baseIntensity);

  useEffect(() => {
    const system = getGrowlSystem();
    system.registerLight(lightId, baseIntensity);

    return () => {
      system.unregisterLight(lightId);
    };
  }, [lightId, baseIntensity]);

  useFrame(() => {
    const system = getGrowlSystem();
    if (system.getIsInitialized()) {
      intensityRef.current = system.getLightIntensity(lightId);
    }
  });

  return intensityRef;
}

/**
 * Get the current Growl phase with phase change callbacks.
 */
export function useGrowlPhaseTransition(
  onPhaseChange?: (newPhase: GrowlPhase, oldPhase: GrowlPhase) => void
) {
  const phase = useGrowlPhase();
  const previousPhaseRef = useRef(phase);

  useEffect(() => {
    if (phase !== previousPhaseRef.current) {
      onPhaseChange?.(phase, previousPhaseRef.current);
      previousPhaseRef.current = phase;
    }
  }, [phase, onPhaseChange]);

  return phase;
}

/**
 * Debug hook for manually controlling Growl intensity.
 * Useful for testing different phases without waiting.
 */
export function useGrowlDebug() {
  const setDebugHours = useTimeStore((state) => state.setDebugHours);
  const resetTimestamp = useTimeStore((state) => state.resetDeploymentTimestamp);
  const intensity = useGrowlIntensity();
  const phase = useGrowlPhase();
  const effects = useGrowlEffects();

  const setPhase = useCallback(
    (targetPhase: GrowlPhase) => {
      const phaseHours: Record<GrowlPhase, number> = {
        [GrowlPhase.SILENT]: 0,
        [GrowlPhase.DISTANT]: 4,
        [GrowlPhase.PRESENT]: 9,
        [GrowlPhase.CLOSE]: 18,
        [GrowlPhase.IMMINENT]: 48,
      };
      setDebugHours(phaseHours[targetPhase]);
    },
    [setDebugHours]
  );

  const clearDebug = useCallback(() => {
    setDebugHours(null);
  }, [setDebugHours]);

  return {
    intensity,
    phase,
    effects,
    setDebugHours,
    setPhase,
    clearDebug,
    resetTimestamp,
  };
}

/**
 * Combined hook for all Growl camera effects.
 * Convenience hook that applies both shake and FOV distortion.
 */
export function useGrowlCameraEffects(
  options: {
    baseFOV?: number;
    enableShake?: boolean;
    enableFOV?: boolean;
  } = {}
) {
  const { baseFOV = 75, enableShake = true, enableFOV = true } = options;

  useGrowlCameraShake(enableShake);
  useGrowlFOVDistortion(baseFOV, enableFOV);
}
