/**
 * Portal Variation Hook
 *
 * React hook for using the Portal Variation System in components.
 * Provides access to variation state and shimmer effects for doorways.
 */

import { useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import {
  getPortalVariationSystem,
  useVariationStore,
  VariationLevel,
  getShimmerIntensity,
  getShimmerColor,
  type VariationState,
} from '../systems/PortalVariationSystem';

// ===== Types =====

export interface PortalShimmerData {
  intensity: number;
  color: THREE.Color;
  variationLevel: VariationLevel;
}

export interface UsePortalVariationReturn {
  /**
   * Process a portal transition and get variation state for destination.
   */
  processTransition: (
    fromRoomId: number,
    toRoomId: number,
    depth: number
  ) => VariationState;

  /**
   * Get shimmer data for a doorway leading to a specific room.
   */
  getShimmerData: (roomId: number) => PortalShimmerData;

  /**
   * Get variation state for a specific room (if already visited).
   */
  getVariationState: (roomId: number) => VariationState | undefined;

  /**
   * Check if a room has a variation applied.
   */
  hasVariation: (roomId: number) => boolean;

  /**
   * Force a specific variation level for debugging.
   */
  setDebugLevel: (level: VariationLevel | null) => void;

  /**
   * Clear all variation states (reset).
   */
  clearStates: () => void;

  /**
   * Current global shimmer boost from Growl.
   */
  globalShimmerBoost: number;
}

// ===== Hook =====

/**
 * Hook for accessing the Portal Variation System.
 */
export function usePortalVariation(): UsePortalVariationReturn {
  const system = useMemo(() => getPortalVariationSystem(), []);
  const states = useVariationStore((state) => state.states);
  const globalShimmerBoost = useVariationStore((state) => state.globalShimmerBoost);
  const setForceLevel = useVariationStore((state) => state.setForceLevel);
  const clearAllStates = useVariationStore((state) => state.clearAllStates);

  // Initialize system on mount
  useEffect(() => {
    system.initialize();
  }, [system]);

  // Process portal transition
  const processTransition = useCallback(
    (fromRoomId: number, toRoomId: number, depth: number): VariationState => {
      return system.processPortalTransition(fromRoomId, toRoomId, depth);
    },
    [system]
  );

  // Get shimmer data for a doorway
  const getShimmerData = useCallback(
    (roomId: number): PortalShimmerData => {
      const state = states.get(roomId);

      if (!state) {
        return {
          intensity: 0,
          color: new THREE.Color(0x000000),
          variationLevel: VariationLevel.NONE,
        };
      }

      const baseIntensity = getShimmerIntensity(state.variationLevel);
      const boostedIntensity = Math.min(baseIntensity + globalShimmerBoost * 0.3, 1.0);

      return {
        intensity: boostedIntensity,
        color: getShimmerColor(state.variationLevel),
        variationLevel: state.variationLevel,
      };
    },
    [states, globalShimmerBoost]
  );

  // Get variation state for a room
  const getVariationState = useCallback(
    (roomId: number): VariationState | undefined => {
      return states.get(roomId);
    },
    [states]
  );

  // Check if room has variation
  const hasVariation = useCallback(
    (roomId: number): boolean => {
      const state = states.get(roomId);
      return state ? state.variationLevel > VariationLevel.NONE : false;
    },
    [states]
  );

  // Set debug level
  const setDebugLevel = useCallback(
    (level: VariationLevel | null) => {
      setForceLevel(level);
    },
    [setForceLevel]
  );

  // Clear all states
  const clearStates = useCallback(() => {
    clearAllStates();
  }, [clearAllStates]);

  return {
    processTransition,
    getShimmerData,
    getVariationState,
    hasVariation,
    setDebugLevel,
    clearStates,
    globalShimmerBoost,
  };
}

// ===== Shader Uniform Helper =====

/**
 * Create shader uniforms for portal shimmer effect.
 */
export function createPortalShimmerUniforms(shimmerData: PortalShimmerData): Record<string, THREE.IUniform> {
  return {
    u_variationLevel: { value: shimmerData.variationLevel },
    u_shimmerIntensity: { value: shimmerData.intensity },
    u_shimmerColor: { value: shimmerData.color },
    u_time: { value: 0 },
    u_bass: { value: 0 },
    u_mid: { value: 0 },
    u_high: { value: 0 },
    u_transient: { value: 0 },
    u_growlIntensity: { value: 0 },
    u_backgroundColor: { value: new THREE.Color(0x1a1834) },
  };
}

/**
 * Update portal shimmer uniforms each frame.
 */
export function updatePortalShimmerUniforms(
  uniforms: Record<string, THREE.IUniform>,
  time: number,
  audioLevels: { bass: number; mid: number; high: number; transient: number },
  growlIntensity: number,
  shimmerData: PortalShimmerData
): void {
  uniforms.u_time.value = time;
  uniforms.u_bass.value = audioLevels.bass;
  uniforms.u_mid.value = audioLevels.mid;
  uniforms.u_high.value = audioLevels.high;
  uniforms.u_transient.value = audioLevels.transient;
  uniforms.u_growlIntensity.value = growlIntensity;
  uniforms.u_variationLevel.value = shimmerData.variationLevel;
  uniforms.u_shimmerIntensity.value = shimmerData.intensity;
  uniforms.u_shimmerColor.value = shimmerData.color;
}

// ===== Selector Hooks =====

/**
 * Select only the global shimmer boost.
 */
export const useGlobalShimmerBoost = () =>
  useVariationStore((state) => state.globalShimmerBoost);

/**
 * Select the debug force level.
 */
export const useDebugForceLevel = () =>
  useVariationStore((state) => state.forceLevel);

/**
 * Select state for a specific room.
 */
export const useRoomVariationState = (roomId: number) =>
  useVariationStore((state) => state.states.get(roomId));

export default usePortalVariation;
