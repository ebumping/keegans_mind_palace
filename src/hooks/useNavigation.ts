/**
 * React hooks for first-person navigation in Keegan's Mind Palace
 *
 * Provides:
 * - useNavigation: Main hook for first-person controls
 * - useNavigationInit: Initialize navigation system with canvas
 * - useNavigationCamera: Apply navigation state to camera
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  NavigationSystem,
  getNavigationSystem,
  DEFAULT_MOVEMENT_CONFIG,
  calculateEntryPosition,
  calculateEntryYaw,
  type MovementConfig,
  type TransitionTrigger,
  type CollisionResult,
} from '../systems/NavigationSystem';
import { calculateGrowlShake } from '../systems/GrowlSystem';
import type { RoomConfig, Wall } from '../types/room';
import { useAudioStore } from '../store/audioStore';
import { useTimeStore } from '../store/timeStore';

// ============================================
// Navigation System Init Hook
// ============================================

/**
 * Initialize the navigation system with the canvas element.
 * Call this once in your main scene component.
 */
export function useNavigationInit(): NavigationSystem | null {
  const { gl } = useThree();
  const systemRef = useRef<NavigationSystem | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;

    const system = getNavigationSystem();
    system.initialize(gl.domElement);
    systemRef.current = system;
    isInitializedRef.current = true;

    return () => {
      // Note: We don't dispose here as other components may still need it
      // Call disposeNavigationSystem() explicitly when completely done
    };
  }, [gl]);

  return systemRef.current;
}

// ============================================
// Main Navigation Hook
// ============================================

export interface UseNavigationOptions {
  config?: Partial<MovementConfig>;
  roomConfig?: RoomConfig | null;
  enabled?: boolean;
  onTransition?: (trigger: TransitionTrigger) => void;
  enableAudioSway?: boolean;
  baseFOV?: number;
}

export interface UseNavigationReturn {
  position: THREE.Vector3;
  isMoving: boolean;
  isPointerLocked: boolean;
  lockPointer: () => void;
  unlockPointer: () => void;
  teleportTo: (position: THREE.Vector3, yaw?: number) => void;
  enterRoom: (entryWall: Wall, entryPosition: number, dimensions: RoomConfig['dimensions']) => void;
}

/**
 * Main navigation hook for first-person controls.
 * Handles input, movement, collision, and camera updates.
 */
export function useNavigation(options: UseNavigationOptions = {}): UseNavigationReturn {
  const {
    roomConfig = null,
    enabled = true,
    onTransition,
    enableAudioSway = true,
    baseFOV = 75,
  } = options;

  const { camera } = useThree();
  const systemRef = useRef<NavigationSystem | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Get audio store directly (not using selector that creates new objects)
  const audioStore = useAudioStore;

  // Initialize system
  useEffect(() => {
    systemRef.current = getNavigationSystem();
  }, []);

  // Update room config when it changes
  useEffect(() => {
    if (systemRef.current) {
      systemRef.current.setRoomConfig(roomConfig);
    }
  }, [roomConfig]);

  // Set transition callback
  useEffect(() => {
    if (systemRef.current && onTransition) {
      systemRef.current.setOnTransition(onTransition);
    }
  }, [onTransition]);

  // Track pointer lock state via ref to avoid re-renders during useFrame
  const isPointerLockedRef = useRef(false);

  // Sync pointer lock state with document
  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement !== null;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, []);

  // Frame update - handle movement and camera
  useFrame((state, delta) => {
    if (!enabled || !systemRef.current) return;

    // Get audio levels directly from store state (avoids selector re-render issues)
    const storeState = audioStore.getState();
    const audioInput = enableAudioSway
      ? {
          bass: storeState.bass,
          mid: storeState.mid,
          high: storeState.high,
          transient: storeState.transient,
          transientIntensity: storeState.transientIntensity,
        }
      : undefined;

    // Pipe Growl intensity into navigation drift scaling
    const growlIntensity = useTimeStore.getState().growlIntensity;
    systemRef.current.setGrowlIntensity(growlIntensity);

    // Update navigation system
    systemRef.current.update(delta, audioInput, state.clock.elapsedTime);

    // Apply camera transform
    const transform = systemRef.current.getCameraTransform();

    camera.position.copy(transform.position);

    // Apply Growl camera shake — multi-frequency disorienting offset
    const { growlEffects: shakeEffects } = useTimeStore.getState();
    const shakeOffset = calculateGrowlShake(shakeEffects, state.clock.elapsedTime);
    camera.position.add(shakeOffset);

    // Apply rotation - use YXZ order to prevent gimbal lock
    // Now includes roll for transient stumbles
    camera.rotation.order = 'YXZ';
    camera.rotation.y = transform.yaw;
    camera.rotation.x = transform.pitch;
    camera.rotation.z = transform.roll; // Camera roll for stumbles and wrongness

    // Apply FOV offset — audio reactivity + Growl breathing distortion
    if (camera instanceof THREE.PerspectiveCamera) {
      const { growlEffects } = useTimeStore.getState();
      const growlFOV = growlEffects.fovDistortion > 0.01
        ? Math.sin(state.clock.elapsedTime * 0.3) * growlEffects.fovDistortion * 0.5
          + (Math.sin(state.clock.elapsedTime * 5) > 0.95 ? growlEffects.fovDistortion : 0)
        : 0;
      const audioFOV = enableAudioSway ? transform.fovOffset : 0;
      const targetFOV = baseFOV + audioFOV + growlFOV;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, delta * 10);
      camera.updateProjectionMatrix();
    }
  });

  // Lock pointer
  const lockPointer = useCallback(() => {
    systemRef.current?.initialize(
      document.querySelector('canvas') as HTMLCanvasElement
    );
  }, []);

  // Unlock pointer
  const unlockPointer = useCallback(() => {
    document.exitPointerLock();
  }, []);

  // Teleport to position
  const teleportTo = useCallback((position: THREE.Vector3, yaw?: number) => {
    if (systemRef.current) {
      systemRef.current.setPosition(position);
      if (yaw !== undefined) {
        systemRef.current.setYaw(yaw);
      }
    }
  }, []);

  // Enter room from doorway
  const enterRoom = useCallback(
    (entryWall: Wall, entryPosition: number, dimensions: RoomConfig['dimensions']) => {
      if (systemRef.current) {
        const position = calculateEntryPosition(
          entryWall,
          entryPosition,
          dimensions,
          DEFAULT_MOVEMENT_CONFIG.playerRadius
        );
        const yaw = calculateEntryYaw(entryWall);
        systemRef.current.setPosition(position);
        systemRef.current.setYaw(yaw);
      }
    },
    []
  );

  return {
    position: systemRef.current?.getPosition() ?? new THREE.Vector3(),
    isMoving: systemRef.current?.isMoving() ?? false,
    isPointerLocked,
    lockPointer,
    unlockPointer,
    teleportTo,
    enterRoom,
  };
}

// ============================================
// Navigation Camera Hook
// ============================================

/**
 * Hook that only applies navigation state to camera.
 * Use this if you want to separate navigation logic from camera updates.
 */
export function useNavigationCamera(
  enabled: boolean = true,
  enableAudioSway: boolean = true,
  baseFOV: number = 75
): void {
  const { camera } = useThree();
  const audioStore = useAudioStore;

  useFrame((state, delta) => {
    if (!enabled) return;

    const system = getNavigationSystem();
    if (!system) return;

    // Get audio levels directly from store state
    const storeState = audioStore.getState();
    const audioInput = enableAudioSway
      ? {
          bass: storeState.bass,
          mid: storeState.mid,
          high: storeState.high,
          transient: storeState.transient,
          transientIntensity: storeState.transientIntensity,
        }
      : undefined;

    // Update the system (without setting room config - assumes already set)
    system.update(delta, audioInput, state.clock.elapsedTime);

    // Apply camera transform
    const transform = system.getCameraTransform();

    camera.position.copy(transform.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = transform.yaw;
    camera.rotation.x = transform.pitch;
    camera.rotation.z = transform.roll; // Camera roll for stumbles

    // Apply FOV offset
    if (camera instanceof THREE.PerspectiveCamera && enableAudioSway) {
      const targetFOV = baseFOV + transform.fovOffset;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, delta * 10);
      camera.updateProjectionMatrix();
    }
  });
}

// ============================================
// Pointer Lock Status Hook
// ============================================

/**
 * Simple hook to track pointer lock status.
 */
export function usePointerLockStatus(): {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
} {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement !== null);
    };

    document.addEventListener('pointerlockchange', handleLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, []);

  const lock = useCallback(() => {
    const canvas = document.querySelector('canvas');
    canvas?.requestPointerLock();
  }, []);

  const unlock = useCallback(() => {
    document.exitPointerLock();
  }, []);

  return { isLocked, lock, unlock };
}

// ============================================
// Collision Debug Hook
// ============================================

/**
 * Debug hook for visualizing collision state.
 */
export function useNavigationDebug(): {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  isMoving: boolean;
  lastCollision: CollisionResult | null;
} {
  const positionRef = useRef(new THREE.Vector3());
  const velocityRef = useRef(new THREE.Vector3());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isMovingRef = useRef(false);
  const lastCollisionRef = useRef<CollisionResult | null>(null);

  useFrame(() => {
    const system = getNavigationSystem();
    if (!system) return;

    positionRef.current.copy(system.getPosition());
    yawRef.current = system.getYaw();
    pitchRef.current = system.getPitch();
    isMovingRef.current = system.isMoving();
  });

  return {
    position: positionRef.current,
    velocity: velocityRef.current,
    yaw: yawRef.current,
    pitch: pitchRef.current,
    isMoving: isMovingRef.current,
    lastCollision: lastCollisionRef.current,
  };
}

export default useNavigation;
