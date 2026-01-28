/**
 * React hook for using TransitionSystem in components
 *
 * Provides:
 * - useTransition: Hook for room transition management
 * - useTransitionEffect: Hook for transition visual effects
 */

import { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import {
  TransitionSystem,
  getTransitionSystem,
  type TransitionData,
  type TransitionState,
  TransitionType,
} from '../systems/TransitionSystem';
import type { DoorwayPlacement, Wall, RoomConfig } from '../types/room';
import { useAudioStore } from '../store/audioStore';

// ============================================
// Transition Hook
// ============================================

export interface UseTransitionOptions {
  baseSeed?: number;
  onTransitionComplete?: (toRoom: RoomConfig) => void;
}

export interface UseTransitionReturn {
  isTransitioning: boolean;
  transitionState: TransitionState | null;
  transitionProgress: number;
  transitionType: TransitionType | null;
  startTransition: (
    doorway: DoorwayPlacement,
    fromRoom: RoomConfig,
    toRoomIndex: number
  ) => void;
  cancelTransition: () => void;
  getTransitionParams: () => {
    fov: number;
    opacity: number;
    warpStrength: number;
    zoom: number;
    color: THREE.Color;
  } | null;
}

/**
 * Hook for managing room transitions.
 * Handles the transition lifecycle and provides visual effect parameters.
 */
export function useTransition(options: UseTransitionOptions = {}): UseTransitionReturn {
  const {
    onTransitionComplete,
  } = options;

  const systemRef = useRef<TransitionSystem | null>(null);
  const currentTransitionRef = useRef<TransitionData | null>(null);

  const audioLevels = useAudioStore(
    useShallow((state) => ({
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      transient: state.transient,
    }))
  );

  // Initialize system
  useEffect(() => {
    systemRef.current = getTransitionSystem();

    return () => {
      // Don't dispose on unmount - system is shared
    };
  }, []);

  // Handle transition completion
  const handleTransitionComplete = useCallback((toRoom: RoomConfig) => {
    onTransitionComplete?.(toRoom);
  }, [onTransitionComplete]);

  // Update transition state
  useFrame((_, delta) => {
    const system = systemRef.current;
    if (!system) return;

    const transition = system.getCurrentTransition();
    currentTransitionRef.current = transition;

    if (transition) {
      system.updateTransition(delta);

      // Check if completed
      if (!system.isTransitioning()) {
        currentTransitionRef.current = null;
      }
    }
  });

  // Start transition
  const startTransition = useCallback((
    doorway: DoorwayPlacement,
    fromRoom: RoomConfig,
    toRoomIndex: number
  ) => {
    const system = systemRef.current;
    if (!system) return;

    // Determine entry and exit walls
    const entryWall = getOppositeWall(doorway.wall);

    const trigger = {
      doorway,
      entryWall,
      exitWall: doorway.wall,
    };

    // Get system as any to access private method
    (system as any).startTransition(
      trigger,
      fromRoom,
      toRoomIndex,
      handleTransitionComplete
    );
  }, [handleTransitionComplete]);

  // Cancel transition
  const cancelTransition = useCallback(() => {
    const system = systemRef.current;
    if (system) {
      system.cancelTransition();
    }
  }, []);

  // Get current transition effect parameters
  const getTransitionParams = useCallback(() => {
    const transition = currentTransitionRef.current;
    if (!transition) return null;

    const system = systemRef.current;
    if (!system) return null;

    const params = system.getTransitionParams(
      transition.trigger.doorway,
      transition.progress,
      transition.effect.type,
      transition.trigger.entryWall
    );

    const color = system.getTransitionColor(
      transition.progress,
      audioLevels
    );

    return {
      ...params,
      color,
    };
  }, [audioLevels]);

  const currentTransition = currentTransitionRef.current;

  return {
    isTransitioning: currentTransition !== null,
    transitionState: currentTransition?.state ?? null,
    transitionProgress: currentTransition?.progress ?? 0,
    transitionType: currentTransition?.effect.type ?? null,
    startTransition,
    cancelTransition,
    getTransitionParams,
  };
}

// ============================================
// Transition Effect Hook
// ============================================

export interface UseTransitionEffectReturn {
  shouldRender: boolean;
  opacity: number;
  fov: number;
  warpStrength: number;
  zoom: number;
  color: THREE.Color;
}

/**
 * Hook for rendering transition effects in React Three Fiber.
 * Returns visual parameters for post-processing or custom effects.
 */
export function useTransitionEffect(): UseTransitionEffectReturn {
  const transition = useTransition();
  const paramsRef = useRef<ReturnType<typeof getTransitionSystem()['getTransitionParams']>>(null);

  // Update params each frame
  useFrame(() => {
    paramsRef.current = transition.getTransitionParams();
  });

  const params = paramsRef.current;

  return {
    shouldRender: transition.isTransitioning,
    opacity: params?.opacity ?? 1,
    fov: params?.fov ?? 75,
    warpStrength: params?.warpStrength ?? 0,
    zoom: params?.zoom ?? 1,
    color: params?.color ?? new THREE.Color('#1a1834'),
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get opposite wall for transition calculation.
 */
function getOppositeWall(wall: Wall): Wall {
  const opposites: Record<Wall, Wall> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[wall];
}

// ============================================
// Default Exports
// ============================================

// Fix naming conflict for default export
export { useTransition as default };
