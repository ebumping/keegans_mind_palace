/**
 * Portal Variation System - MyHouse.wad-inspired Alternate Versions
 *
 * When players pass through doorways, there's a chance they'll enter
 * an "alternate version" of the expected room with subtle (or not-so-subtle)
 * differences. The deeper you explore and the longer the installation has
 * existed, the more likely and extreme these variations become.
 */

import * as THREE from 'three';
import { create } from 'zustand';
import { SeededRandom, getRoomSeed } from '../utils/seededRandom';
import { useTimeStore } from '../store/timeStore';
import type { RoomConfig } from '../types/room';

// ===== Variation Level Constants =====

export const VariationLevel = {
  NONE: 0,
  SUBTLE: 1,      // Nearly imperceptible changes
  NOTICEABLE: 2,  // Architectural oddities
  UNSETTLING: 3,  // Reality inconsistencies
  SURREAL: 4,     // Physics violations
  BIZARRE: 5,     // Total reality breakdown
} as const;

export type VariationLevel = typeof VariationLevel[keyof typeof VariationLevel];

// ===== Base Probabilities =====

const BASE_PROBABILITIES: Record<number, number> = {
  [VariationLevel.SUBTLE]: 0.15,
  [VariationLevel.NOTICEABLE]: 0.10,
  [VariationLevel.UNSETTLING]: 0.05,
  [VariationLevel.SURREAL]: 0.02,
  [VariationLevel.BIZARRE]: 0.005,
};

// ===== Variation Types =====

// Level 1: Subtle changes
export type SubtleChange =
  | { kind: 'wallpaper_seed'; newSeed: number }
  | { kind: 'furniture_offset'; offset: THREE.Vector3 }
  | { kind: 'light_color_shift'; shift: number }  // Degrees in hue
  | { kind: 'carpet_pattern_phase'; phase: number }
  | { kind: 'ceiling_height'; delta: number }
  | { kind: 'ambient_volume'; multiplier: number };

// Level 2: Noticeable changes
export type NoticeableChange =
  | { kind: 'door_target_remap'; doorIndex: number; newTarget: number }
  | { kind: 'extra_hallway'; position: THREE.Vector3; direction: THREE.Vector3 }
  | { kind: 'missing_door'; doorIndex: number }
  | { kind: 'extra_door'; position: THREE.Vector3; wall: string }
  | { kind: 'window_to_wall'; windowIndex: number }
  | { kind: 'room_stretched'; axis: 'x' | 'z'; factor: number };

// Level 3: Unsettling changes
export type UnsettlingChange =
  | { kind: 'text_reversed'; textureIds: string[] }
  | { kind: 'photos_wrong_faces'; faceSwapSeed: number }
  | { kind: 'mirror_shows_different'; differenceType: 'empty' | 'wrong_position' | 'watching' }
  | { kind: 'clock_wrong_time'; offset: number }
  | { kind: 'sounds_reversed' }
  | { kind: 'impossible_shadow'; sourcePosition: THREE.Vector3 }
  | { kind: 'footsteps_mismatch' };

// Level 4: Surreal changes
export type ImpossibleGeometry =
  | 'penrose_stairs'
  | 'klein_bottle_room'
  | 'mobius_hallway'
  | 'four_right_angles_triangle';

export type SurrealChange =
  | { kind: 'gravity_shift'; direction: THREE.Vector3; strength: number }
  | { kind: 'impossible_geometry'; geometryType: ImpossibleGeometry }
  | { kind: 'self_reflection'; position: THREE.Vector3 }
  | { kind: 'room_within_room'; scale: number }
  | { kind: 'escher_stairs' }
  | { kind: 'infinite_regression'; depth: number }
  | { kind: 'time_dilation'; factor: number };

// Level 5: Bizarre changes
export type AlternateAesthetic =
  | 'ps1_horror'
  | 'liminal_office'
  | 'vaporwave'
  | 'void_black'
  | 'digital_decay';

export type AbstractMode =
  | 'wireframe'
  | 'particle_only'
  | 'inverted_space'
  | 'impossible_colors';

export type MemoryFragment = {
  description: string;
  emotionalTone: 'nostalgic' | 'disturbing' | 'surreal';
};

export type BizarreChange =
  | { kind: 'reality_tear'; position: THREE.Vector3; size: number }
  | { kind: 'dimension_bleed'; sourceAesthetic: AlternateAesthetic }
  | { kind: 'void_room'; voidIntensity: number }
  | { kind: 'backrooms_transition' }
  | { kind: 'memory_palace'; memories: MemoryFragment[] }
  | { kind: 'abstract_space'; geometryMode: AbstractMode }
  | { kind: 'the_presence' };

// Combined variation type
export type VariationChange =
  | SubtleChange
  | NoticeableChange
  | UnsettlingChange
  | SurrealChange
  | BizarreChange;

export interface Variation {
  level: VariationLevel;
  changes: VariationChange[];
}

// ===== Variation State =====

export interface VariationState {
  roomId: number;
  variationLevel: VariationLevel;
  variationSeed: number;
  variation: Variation | null;
  visitCount: number;
  firstVisitTimestamp: number;
}

// ===== Probability Calculation =====

export interface VariationProbability {
  level: VariationLevel;
  probability: number;
}

/**
 * Calculate variation probabilities based on depth and Growl intensity.
 * Deeper rooms and higher Growl = more likely to see variations.
 *
 * @param depth - Number of rooms traversed from origin
 * @param growlIntensity - 0-1 intensity from Growl system
 * @returns Array of variation levels with their probabilities
 */
export function calculateVariationProbabilities(
  depth: number,
  growlIntensity: number
): VariationProbability[] {
  // Depth multiplier: deeper = more variations
  // Caps at 3x at depth 50
  const depthMultiplier = 1 + Math.min(depth / 50, 2);

  // Growl multiplier: time increases variation chance
  // At full Growl (1.0), probabilities double
  const growlMultiplier = 1 + growlIntensity;

  const probabilities: VariationProbability[] = [];

  for (const [levelStr, baseProbability] of Object.entries(BASE_PROBABILITIES)) {
    const level = parseInt(levelStr) as VariationLevel;
    const probability = Math.min(
      baseProbability * depthMultiplier * growlMultiplier,
      0.8  // Cap at 80% to always have chance of normal room
    );

    probabilities.push({ level, probability });
  }

  return probabilities;
}

/**
 * Select a variation level based on calculated probabilities.
 * Higher levels are checked first (rarer but more impactful).
 *
 * @param probabilities - Array of variation probabilities
 * @param rng - Seeded random number generator
 * @returns Selected variation level, or NONE for normal room
 */
export function selectVariationLevel(
  probabilities: VariationProbability[],
  rng: SeededRandom
): VariationLevel {
  // Sort by level descending (check higher levels first)
  const sorted = [...probabilities].sort((a, b) => b.level - a.level);

  for (const { level, probability } of sorted) {
    if (rng.next() < probability) {
      return level;
    }
  }

  return VariationLevel.NONE;
}

/**
 * Get shimmer intensity for a portal based on variation level.
 * Higher levels = more visible shimmer.
 */
export function getShimmerIntensity(level: VariationLevel): number {
  switch (level) {
    case VariationLevel.NONE:
      return 0;
    case VariationLevel.SUBTLE:
      return 0.1;
    case VariationLevel.NOTICEABLE:
      return 0.25;
    case VariationLevel.UNSETTLING:
      return 0.45;
    case VariationLevel.SURREAL:
      return 0.7;
    case VariationLevel.BIZARRE:
      return 1.0;
    default:
      return 0;
  }
}

/**
 * Get shimmer color based on variation level.
 * Subtle = purple, high levels = red/orange danger
 */
export function getShimmerColor(level: VariationLevel): THREE.Color {
  switch (level) {
    case VariationLevel.NONE:
      return new THREE.Color(0x000000);
    case VariationLevel.SUBTLE:
      return new THREE.Color(0xc792f5); // Soft purple
    case VariationLevel.NOTICEABLE:
      return new THREE.Color(0xa580e0); // Purple-pink
    case VariationLevel.UNSETTLING:
      return new THREE.Color(0xe070a0); // Pinkish
    case VariationLevel.SURREAL:
      return new THREE.Color(0xff5050); // Reddish
    case VariationLevel.BIZARRE:
      return new THREE.Color(0xff2020); // Danger red
    default:
      return new THREE.Color(0xc792f5);
  }
}

// ===== Variation Store =====

export interface VariationStore {
  // State map: roomId -> VariationState
  states: Map<number, VariationState>;

  // Global shimmer boost from Growl
  globalShimmerBoost: number;

  // Debug mode
  forceLevel: VariationLevel | null;

  // Actions
  getOrCreateState: (
    roomId: number,
    depth: number,
    growlIntensity: number
  ) => VariationState;
  setGlobalShimmerBoost: (boost: number) => void;
  setForceLevel: (level: VariationLevel | null) => void;
  clearAllStates: () => void;
  serialize: () => string;
  deserialize: (data: string) => void;
}

export const useVariationStore = create<VariationStore>((set, get) => ({
  states: new Map(),
  globalShimmerBoost: 0,
  forceLevel: null,

  getOrCreateState: (roomId, depth, growlIntensity) => {
    const state = get();
    const existing = state.states.get(roomId);

    if (existing) {
      // Increment visit count and return existing state
      existing.visitCount++;
      return existing;
    }

    // First visit - determine variation
    const seed = getRoomSeed(roomId, 42) + 5000; // Offset seed for variations
    const rng = new SeededRandom(seed);

    // Check for forced level in debug mode
    const forceLevel = state.forceLevel;
    let level: VariationLevel;

    if (forceLevel !== null) {
      level = forceLevel;
    } else {
      const probabilities = calculateVariationProbabilities(depth, growlIntensity);
      level = selectVariationLevel(probabilities, rng);
    }

    // Generate variation if level > 0
    let variation: Variation | null = null;
    if (level > VariationLevel.NONE) {
      variation = generateVariation(level, roomId, rng);
    }

    const newState: VariationState = {
      roomId,
      variationLevel: level,
      variationSeed: seed,
      variation,
      visitCount: 1,
      firstVisitTimestamp: Date.now(),
    };

    // Update state map
    const newStates = new Map(state.states);
    newStates.set(roomId, newState);
    set({ states: newStates });

    return newState;
  },

  setGlobalShimmerBoost: (boost) => set({ globalShimmerBoost: boost }),

  setForceLevel: (level) => set({ forceLevel: level }),

  clearAllStates: () => set({ states: new Map() }),

  serialize: () => {
    const state = get();
    const entries = Array.from(state.states.entries()).map(([key, value]) => [
      key,
      {
        ...value,
        // Convert THREE.Vector3 objects to plain objects for serialization
        variation: value.variation
          ? {
              ...value.variation,
              changes: value.variation.changes.map(serializeChange),
            }
          : null,
      },
    ]);
    return JSON.stringify(entries);
  },

  deserialize: (data) => {
    try {
      const entries = JSON.parse(data) as [number, VariationState][];
      const states = new Map<number, VariationState>();

      for (const [key, value] of entries) {
        states.set(key, {
          ...value,
          // Reconstruct THREE.Vector3 objects
          variation: value.variation
            ? {
                ...value.variation,
                changes: value.variation.changes.map(deserializeChange),
              }
            : null,
        });
      }

      set({ states });
    } catch (e) {
      console.error('Failed to deserialize variation state:', e);
    }
  },
}));

// ===== Serialization Helpers =====

function serializeChange(change: VariationChange): object {
  const result: Record<string, unknown> = { ...change };

  // Convert Vector3 to plain object
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof THREE.Vector3) {
      result[key] = { x: value.x, y: value.y, z: value.z };
    }
  }

  return result;
}

function deserializeChange(obj: Record<string, unknown>): VariationChange {
  const result = { ...obj };

  // Convert plain objects back to Vector3 where applicable
  const vectorKeys = ['offset', 'position', 'direction', 'sourcePosition'];
  for (const key of vectorKeys) {
    if (result[key] && typeof result[key] === 'object') {
      const v = result[key] as { x: number; y: number; z: number };
      if ('x' in v && 'y' in v && 'z' in v) {
        result[key] = new THREE.Vector3(v.x, v.y, v.z);
      }
    }
  }

  return result as VariationChange;
}

// ===== Variation Generation =====

/**
 * Generate a variation based on level.
 */
function generateVariation(
  level: VariationLevel,
  _roomId: number,
  rng: SeededRandom
): Variation {
  const changes: VariationChange[] = [];

  switch (level) {
    case VariationLevel.SUBTLE:
      changes.push(...generateLevel1Changes(rng));
      break;
    case VariationLevel.NOTICEABLE:
      changes.push(...generateLevel2Changes(rng));
      break;
    case VariationLevel.UNSETTLING:
      changes.push(...generateLevel3Changes(rng));
      break;
    case VariationLevel.SURREAL:
      changes.push(...generateLevel4Changes(rng));
      break;
    case VariationLevel.BIZARRE:
      changes.push(...generateLevel5Changes(rng));
      break;
  }

  return { level, changes };
}

// Import generation functions (implemented in VariationGenerator.ts)
import {
  generateLevel1Changes,
  generateLevel2Changes,
  generateLevel3Changes,
  generateLevel4Changes,
  generateLevel5Changes,
} from '../generators/VariationGenerator';

// ===== Portal Variation System Class =====

/**
 * Main class that orchestrates portal variation effects.
 */
export class PortalVariationSystem {
  private isInitialized: boolean = false;

  /**
   * Initialize the portal variation system.
   */
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /**
   * Process a portal transition and get the variation state.
   *
   * @param fromRoomId - Source room ID
   * @param toRoomId - Destination room ID
   * @param depth - Current exploration depth
   * @returns Variation state for the destination room
   */
  processPortalTransition(
    _fromRoomId: number,
    toRoomId: number,
    depth: number
  ): VariationState {
    const { growlIntensity } = useTimeStore.getState();
    const state = useVariationStore.getState().getOrCreateState(
      toRoomId,
      depth,
      growlIntensity
    );

    return state;
  }

  /**
   * Apply variation effects to a room config.
   *
   * @param baseConfig - Original room configuration
   * @param variation - Variation to apply
   * @returns Modified room configuration
   */
  applyVariation(
    baseConfig: RoomConfig,
    variation: Variation | null
  ): RoomConfig {
    if (!variation || variation.level === VariationLevel.NONE) {
      return baseConfig;
    }

    // Clone config to avoid mutation
    const config = JSON.parse(JSON.stringify(baseConfig)) as RoomConfig;

    for (const change of variation.changes) {
      this.applyChange(config, change);
    }

    return config;
  }

  /**
   * Apply a single variation change to a room config.
   */
  private applyChange(config: RoomConfig, change: VariationChange): void {
    switch (change.kind) {
      // Level 1: Subtle
      case 'wallpaper_seed':
        config.seed = change.newSeed;
        break;
      case 'ceiling_height':
        config.dimensions.height += change.delta;
        config.ceilingConfig.height += change.delta;
        break;
      case 'light_color_shift':
        // Store for material application
        (config as RoomConfig & { lightColorShift?: number }).lightColorShift = change.shift;
        break;

      // Level 2: Noticeable
      case 'door_target_remap':
        if (config.doorways[change.doorIndex]) {
          config.doorways[change.doorIndex].leadsTo = change.newTarget;
        }
        break;
      case 'missing_door':
        config.doorways = config.doorways.filter((_, i) => i !== change.doorIndex);
        break;
      case 'room_stretched':
        if (change.axis === 'x') {
          config.dimensions.width *= change.factor;
        } else {
          config.dimensions.depth *= change.factor;
        }
        break;

      // Level 3: Unsettling
      case 'text_reversed':
        (config as RoomConfig & { textReversed?: boolean }).textReversed = true;
        break;

      // Level 4: Surreal
      case 'gravity_shift':
        (config as RoomConfig & { gravityShift?: THREE.Vector3 }).gravityShift =
          new THREE.Vector3(change.direction.x, change.direction.y, change.direction.z);
        break;

      // Level 5: Bizarre
      case 'dimension_bleed':
        (config as RoomConfig & { dimensionBleed?: AlternateAesthetic }).dimensionBleed =
          change.sourceAesthetic;
        break;
      case 'void_room':
        (config as RoomConfig & { voidIntensity?: number }).voidIntensity =
          change.voidIntensity;
        break;

      // Other changes are handled at render time
      default:
        break;
    }
  }

  /**
   * Get shimmer level for a doorway.
   */
  getShimmerLevel(roomId: number): number {
    const state = useVariationStore.getState().states.get(roomId);
    if (!state) return 0;

    const baseShimmer = getShimmerIntensity(state.variationLevel);
    const boost = useVariationStore.getState().globalShimmerBoost;

    return Math.min(baseShimmer + boost * 0.3, 1.0);
  }

  /**
   * Get shimmer color for a doorway.
   */
  getShimmerColorForRoom(roomId: number): THREE.Color {
    const state = useVariationStore.getState().states.get(roomId);
    if (!state) return new THREE.Color(0x000000);

    return getShimmerColor(state.variationLevel);
  }

  /**
   * Update the system each frame.
   */
  update(_delta: number): void {
    // Update global shimmer boost based on Growl intensity
    const { growlIntensity } = useTimeStore.getState();
    useVariationStore.getState().setGlobalShimmerBoost(growlIntensity * 0.5);
  }

  /**
   * Dispose the system.
   */
  dispose(): void {
    useVariationStore.getState().clearAllStates();
    this.isInitialized = false;
  }
}

// ===== Singleton Instance =====

let portalVariationSystemInstance: PortalVariationSystem | null = null;

/**
 * Get the singleton PortalVariationSystem instance.
 */
export function getPortalVariationSystem(): PortalVariationSystem {
  if (!portalVariationSystemInstance) {
    portalVariationSystemInstance = new PortalVariationSystem();
  }
  return portalVariationSystemInstance;
}

/**
 * Dispose the singleton instance (for cleanup/testing).
 */
export function disposePortalVariationSystem(): void {
  if (portalVariationSystemInstance) {
    portalVariationSystemInstance.dispose();
    portalVariationSystemInstance = null;
  }
}

export default PortalVariationSystem;
