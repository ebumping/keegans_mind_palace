/**
 * Transition System
 *
 * Manages smooth room-to-room transitions with audio-reactive effects:
 * - Fade/warp transitions between rooms
 * - Procedural room generation for infinite exploration
 * - Audio-synced transition effects (zoom, dissolve, color shift)
 * - Visited room seed storage for backtracking consistency
 * - Impossible transition effects (entering same room from different angles)
 */

import * as THREE from 'three';
import type { DoorwayPlacement, Wall, RoomConfig } from '../types/room';
import { RoomGenerator } from '../generators/RoomGenerator';
import { useAudioStore } from '../store/audioStore';
import { getPortalVariationSystem } from './PortalVariationSystem';
import type { VariationState } from './PortalVariationSystem';

// ============================================
// Types and Interfaces
// ============================================

// Transition type options
export const TransitionType = {
  FADE: 'fade',                    // Simple opacity fade
  WARP: 'warp',                    // Screen distortion effect
  ZOOM: 'zoom',                    // Camera zoom through doorway
  DISSOLVE: 'dissolve',            // Pixelated dissolve
  IMPOSSIBLE: 'impossible',        // Non-euclidean impossible transition
} as const;

export type TransitionType = (typeof TransitionType)[keyof typeof TransitionType];

// Transition state
export const TransitionState = {
  IDLE: 'idle',
  STARTING: 'starting',
  IN_PROGRESS: 'in_progress',
  ENDING: 'ending',
} as const;

export type TransitionState = typeof TransitionState[keyof typeof TransitionState];

export interface TransitionEffect {
  type: TransitionType;
  duration: number;        // Seconds
  audioSync: boolean;       // Whether effect syncs to audio
}

export interface TransitionConfig {
  // Timing
  minDuration: number;      // Minimum transition time (seconds)
  maxDuration: number;      // Maximum transition time (seconds)

  // Visual effects
  enableFade: boolean;
  enableWarp: boolean;
  enableZoom: boolean;
  enableDissolve: boolean;

  // Impossible transitions
  impossibleChance: number; // 0-1 probability per transition
  impossibleMinDepth: number; // Minimum room depth for impossible transitions
}

export interface TransitionData {
  trigger: {
    doorway: DoorwayPlacement;
    entryWall: Wall;
    exitWall: Wall;
  };
  fromRoom: RoomConfig;
  toRoom: RoomConfig;
  effect: TransitionEffect;
  state: TransitionState;
  progress: number;        // 0-1
  startTime: number;
}

export interface VisitedRoom {
  roomIndex: number;
  seed: number;
  visitedAt: number;      // Timestamp
  entryDoorway: DoorwayPlacement;
  config: RoomConfig;     // Full config for exact reproduction on revisit
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  minDuration: 1.0,
  maxDuration: 2.5,
  enableFade: true,
  enableWarp: true,
  enableZoom: true,
  enableDissolve: true,
  impossibleChance: 0.15,  // 15% chance per transition
  impossibleMinDepth: 5,    // Only in rooms 5+ deep
};

// ============================================
// Transition System
// ============================================

export class TransitionSystem {
  private config: TransitionConfig;
  private generator: RoomGenerator;
  private visitedRooms: Map<number, VisitedRoom>;
  private currentTransition: TransitionData | null = null;
  private transitionCallback: ((toRoom: RoomConfig, entryWall: Wall) => void) | null = null;
  private lastVariationState: VariationState | null = null;

  // Reusable vectors for calculations
  private _vector1 = new THREE.Vector3();
  private _vector2 = new THREE.Vector3();

  constructor(config?: Partial<TransitionConfig>, baseSeed?: number) {
    this.config = { ...DEFAULT_TRANSITION_CONFIG, ...config };
    this.generator = new RoomGenerator({ baseSeed });
    this.visitedRooms = new Map();
  }

  // ============================================
  // Room Generation
  // ============================================

  /**
   * Generate or retrieve a room configuration for a transition.
   * If the room was already visited, returns the same config for consistency.
   * Otherwise generates a new procedurally unique room.
   * Applies portal variations based on depth and Growl intensity.
   */
  generateRoom(targetRoomIndex: number, entryWall: Wall | null = null, fromRoomIndex?: number): RoomConfig {
    // Check if this room was already visited — return exact stored config
    const visited = this.visitedRooms.get(targetRoomIndex);

    if (visited) {
      // Return the stored config verbatim for backtracking consistency.
      // This ensures re-entering a room produces an identical layout.
      return visited.config;
    }

    // Generate new room
    let config: RoomConfig = this.generator.generateConfig(targetRoomIndex, entryWall);

    // Apply portal variation system — calculate and apply variation to config
    const variationSystem = getPortalVariationSystem();
    variationSystem.initialize();

    const variationState = variationSystem.processPortalTransition(
      fromRoomIndex ?? 0,
      targetRoomIndex,
      targetRoomIndex // depth = roomIndex (distance from origin)
    );

    // Store variation state on the transition system for doorway shimmer access
    this.lastVariationState = variationState;

    // Apply variation changes to room config
    if (variationState.variation) {
      config = variationSystem.applyVariation(config, variationState.variation);
      // Store variation metadata on config for rendering components
      (config as RoomConfig & { variationLevel?: number }).variationLevel =
        variationState.variationLevel;
      (config as RoomConfig & { variationChanges?: unknown[] }).variationChanges =
        variationState.variation.changes;
    }

    return config;
  }

  /**
   * Store a visited room for backtracking consistency.
   * Stores the full RoomConfig so revisiting produces an identical layout.
   */
  markRoomVisited(roomIndex: number, entryDoorway: DoorwayPlacement, config: RoomConfig): void {
    const visited: VisitedRoom = {
      roomIndex,
      seed: config.seed,
      visitedAt: Date.now(),
      entryDoorway,
      config,
    };
    this.visitedRooms.set(roomIndex, visited);
  }

  /**
   * Check if a room has been visited before.
   */
  isRoomVisited(roomIndex: number): boolean {
    return this.visitedRooms.has(roomIndex);
  }

  /**
   * Get visited room data.
   */
  getVisitedRoom(roomIndex: number): VisitedRoom | undefined {
    return this.visitedRooms.get(roomIndex);
  }

  /**
   * Clear all visited rooms (for testing or reset).
   */
  clearVisitedRooms(): void {
    this.visitedRooms.clear();
  }

  // ============================================
  // Transition Effects
  // ============================================

  /**
   * Select a transition effect based on available types and randomness.
   * Impossible transitions only occur in deeper rooms with low probability.
   */
  selectTransitionEffect(
    roomDepth: number,
    audioLevels?: { bass: number; mid: number; high: number; transient: boolean; transientIntensity: number }
  ): TransitionEffect {
    // Determine if this should be an impossible transition
    const isImpossible =
      roomDepth >= this.config.impossibleMinDepth &&
      Math.random() < this.config.impossibleChance;

    // Available effect types
    const availableTypes: TransitionType[] = [];

    if (isImpossible) {
      availableTypes.push(TransitionType.IMPOSSIBLE);
    } else {
      if (this.config.enableFade) availableTypes.push(TransitionType.FADE);
      if (this.config.enableWarp) availableTypes.push(TransitionType.WARP);
      if (this.config.enableZoom) availableTypes.push(TransitionType.ZOOM);
      if (this.config.enableDissolve) availableTypes.push(TransitionType.DISSOLVE);
    }

    // Select random type
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

    // Duration varies by type and audio
    let duration = THREE.MathUtils.randFloat(
      this.config.minDuration,
      this.config.maxDuration
    );

    // Audio sync: sync to transient if available
    let audioSync = false;
    if (audioLevels && audioLevels.transientIntensity > 0.1) {
      audioSync = true;
      duration = THREE.MathUtils.lerp(duration, duration * 0.7, audioLevels.bass);
    }

    return { type, duration, audioSync };
  }

  /**
   * Calculate transition camera parameters for smooth effect.
   */
  calculateTransitionParams(
    progress: number,
    effectType: TransitionType
  ): {
    fov: number;
    opacity: number;
    warpStrength: number;
    zoom: number;
  } {
    const baseFOV = 75;
    const progressEased = this.easeInOutCubic(progress);

    let params = {
      fov: baseFOV,
      opacity: 1,
      warpStrength: 0,
      zoom: 1,
    };

    switch (effectType) {
      case TransitionType.FADE:
        params.opacity = 1 - progressEased;
        break;

      case TransitionType.WARP:
        // Warp effect: FOV distortion + radial blur simulation
        const warpAmount = Math.sin(progressEased * Math.PI);

        params.fov = baseFOV + warpAmount * 30;
        params.warpStrength = warpAmount;
        break;

      case TransitionType.ZOOM:
        // Zoom through doorway effect
        params.zoom = 1 + progressEased * 0.5;
        params.fov = baseFOV * (1 - progressEased * 0.3);
        break;

      case TransitionType.DISSOLVE:
        // Pixelated dissolve: combine fade with noise
        params.opacity = 1 - progressEased;
        // Warp adds noise texture effect
        params.warpStrength = progressEased * 0.3;
        break;

      case TransitionType.IMPOSSIBLE:
        // Impossible geometry: dramatic FOV shift + rotation
        const impossibleWarp = Math.sin(progressEased * Math.PI * 2);
        params.fov = baseFOV + impossibleWarp * 50;
        params.warpStrength = Math.abs(impossibleWarp);
        params.opacity = 1 - progressEased * 0.5;
        break;
    }

    return params;
  }

  /**
   * Calculate color shift during transition (audio-reactive).
   */
  calculateTransitionColor(
    progress: number
  ): THREE.Color {
    // Pale-strata color palette
    const primaryColor = new THREE.Color('#c792f5');
    const secondaryColor = new THREE.Color('#8eecf5');
    const bgColor = new THREE.Color('#1a1834');

    // Base transition: background -> primary -> secondary -> background
    let color: THREE.Color;

    if (progress < 0.25) {
      // Background to primary
      const t = progress / 0.25;
      color = bgColor.clone().lerp(primaryColor, t);
    } else if (progress < 0.5) {
      // Primary to secondary
      const t = (progress - 0.25) / 0.25;
      color = primaryColor.clone().lerp(secondaryColor, t);
    } else if (progress < 0.75) {
      // Secondary to primary
      const t = (progress - 0.5) / 0.25;
      color = secondaryColor.clone().lerp(primaryColor, t);
    } else {
      // Primary to background
      const t = (progress - 0.75) / 0.25;
      color = primaryColor.clone().lerp(bgColor, t);
    }

    // Audio-reactive color modulation (get fresh audio levels)
    const audioState = useAudioStore.getState();
    const freshAudioLevels = {
      bass: audioState.bass,
      mid: audioState.mid,
      high: audioState.high,
    };

    // Add subtle tint based on frequency
    const bassTint = primaryColor.clone().multiplyScalar(freshAudioLevels.bass * 0.3);
    const midTint = secondaryColor.clone().multiplyScalar(freshAudioLevels.mid * 0.2);
    color.add(bassTint).add(midTint);
    // Clamp manually since Color doesn't have clamp method
    color.r = Math.min(Math.max(color.r, 0), 1);
    color.g = Math.min(Math.max(color.g, 0), 1);
    color.b = Math.min(Math.max(color.b, 0), 1);

    return color;
  }

  // ============================================
  // Impossible Transitions
  // ============================================

  /**
   * Create impossible transition effect where entering a room from
   * different angles leads to the same space with subtle differences.
   */
  createImpossibleTransition(
    entryAngle: number
  ): {
    rotationOffset: THREE.Euler;
    scaleOffset: THREE.Vector3;
    mirrored: boolean;
  } {
    const angleDiff = Math.abs(entryAngle) % (Math.PI * 2);

    // Calculate impossible geometry effect
    // Entering from different angles creates different perceptions of the same space
    const rotationOffset = new THREE.Euler(
      0,
      Math.sin(angleDiff) * 0.3,  // Subtle Y rotation
      Math.cos(angleDiff) * 0.1   // Slight tilt
    );

    // Non-euclidean scaling
    const scaleFactor = 1 + Math.sin(angleDiff * 2) * 0.2;
    const scaleOffset = new THREE.Vector3(scaleFactor, 1, scaleFactor);

    // Mirror effect for certain angles
    const mirrored = angleDiff > Math.PI;

    return {
      rotationOffset,
      scaleOffset,
      mirrored,
    };
  }

  /**
   * Check if a transition should be impossible based on conditions.
   */
  shouldCreateImpossibleTransition(
    roomDepth: number
  ): boolean {
    // Must be deep enough
    if (roomDepth < this.config.impossibleMinDepth) {
      return false;
    }

    // Must pass random chance
    if (Math.random() > this.config.impossibleChance) {
      return false;
    }

    return true;
  }

  // ============================================
  // Transition State Management
  // ============================================

  /**
   * Start a new room transition.
   */
  startTransition(
    trigger: {
      doorway: DoorwayPlacement;
      entryWall: Wall;
      exitWall: Wall;
    },
    fromRoom: RoomConfig,
    toRoomIndex: number,
    transitionCallback: (toRoom: RoomConfig) => void
  ): TransitionData {
    // Get audio levels for sync
    const audioState = useAudioStore.getState();
    const audioLevels = {
      bass: audioState.bass,
      mid: audioState.mid,
      high: audioState.high,
      transient: audioState.transientIntensity > 0.1,
      transientIntensity: audioState.transientIntensity,
    };

    // Generate target room with variation system integration
    const fromRoomIndex = fromRoom.index;
    const toRoom = this.generateRoom(toRoomIndex, trigger.entryWall, fromRoomIndex);

    // Mark as visited (stores full config for backtracking consistency)
    this.markRoomVisited(toRoomIndex, trigger.doorway, toRoom);

    // Select transition effect
    const roomDepth = toRoomIndex;
    const effect = this.selectTransitionEffect(roomDepth, audioLevels);

    // Calculate impossible transition if applicable
    if (effect.type === TransitionType.IMPOSSIBLE) {
      const entryAngleDiff = this._vector1.set(0, 1, 0).angleTo(this._vector2.set(0, 1, 0));
      this.createImpossibleTransition(entryAngleDiff);
    }

    // Create transition data
    const transition: TransitionData = {
      trigger,
      fromRoom,
      toRoom,
      effect,
      state: TransitionState.STARTING,
      progress: 0,
      startTime: Date.now(),
    };

    this.currentTransition = transition;
    this.transitionCallback = transitionCallback;

    // Start the transition sequence
    this.beginTransitionSequence();

    return transition;
  }

  /**
   * Update transition progress.
   * Returns true if transition is complete.
   */
  updateTransition(_delta: number): boolean {
    if (!this.currentTransition) {
      return false;
    }

    const transition = this.currentTransition;
    const elapsed = (Date.now() - transition.startTime) / 1000;
    transition.progress = Math.min(elapsed / transition.effect.duration, 1);

    // Update state
    if (transition.progress < 0.1) {
      transition.state = TransitionState.STARTING;
    } else if (transition.progress < 0.9) {
      transition.state = TransitionState.IN_PROGRESS;
    } else {
      transition.state = TransitionState.ENDING;
    }

    // Check if complete
    if (transition.progress >= 1) {
      this.completeTransition();
      return true;
    }

    return false;
  }

  /**
   * Get current transition data.
   */
  getCurrentTransition(): TransitionData | null {
    return this.currentTransition;
  }

  /**
   * Check if currently transitioning.
   */
  isTransitioning(): boolean {
    return this.currentTransition !== null;
  }

  /**
   * Get the last variation state computed during room generation.
   * Used by doorway rendering to apply shimmer effects.
   */
  getLastVariationState(): VariationState | null {
    return this.lastVariationState;
  }

  /**
   * Cancel current transition (emergency abort).
   */
  cancelTransition(): void {
    this.currentTransition = null;
    this.transitionCallback = null;
  }

  /**
   * Get transition params for visual effects.
   * Exposed for React hooks to use.
   */
  getTransitionParams(
    progress: number,
    effectType: TransitionType
  ): {
    fov: number;
    opacity: number;
    warpStrength: number;
    zoom: number;
  } {
    return this.calculateTransitionParams(progress, effectType);
  }

  /**
   * Get transition color for visual effects.
   * Exposed for React hooks to use.
   */
  getTransitionColor(
    progress: number
  ): THREE.Color {
    return this.calculateTransitionColor(progress);
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Begin transition sequence.
   */
  private beginTransitionSequence(): void {
    if (!this.currentTransition) return;

    // Callback to trigger room change at midpoint
    setTimeout(() => {
      if (this.currentTransition && this.transitionCallback) {
        this.transitionCallback(
          this.currentTransition.toRoom,
          this.currentTransition.trigger.entryWall
        );
      }
    }, (this.currentTransition.effect.duration * 1000) / 2);
  }

  /**
   * Complete transition sequence.
   */
  private completeTransition(): void {
    // Store impossible transition state if applicable
    if (this.currentTransition?.effect.type === TransitionType.IMPOSSIBLE) {
      // TODO: Store impossible state for reference
    }

    this.currentTransition = null;
    this.transitionCallback = null;
  }

  /**
   * Easing function for smooth transitions.
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// ============================================
// Singleton Instance
// ============================================

let transitionSystemInstance: TransitionSystem | null = null;

export function getTransitionSystem(): TransitionSystem {
  if (!transitionSystemInstance) {
    transitionSystemInstance = new TransitionSystem();
  }
  return transitionSystemInstance;
}

export function disposeTransitionSystem(): void {
  if (transitionSystemInstance) {
    transitionSystemInstance.clearVisitedRooms();
    transitionSystemInstance = null;
  }
}

export default TransitionSystem;
