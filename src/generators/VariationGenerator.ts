/**
 * Variation Generator - Level-specific variation generation
 *
 * Generates the specific changes for each variation level,
 * from subtle wallpaper changes to complete reality breakdown.
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import type {
  SubtleChange,
  NoticeableChange,
  UnsettlingChange,
  SurrealChange,
  BizarreChange,
  ImpossibleGeometry,
  AlternateAesthetic,
  AbstractMode,
  MemoryFragment,
} from '../systems/PortalVariationSystem';

// ===== Helper Functions =====

/**
 * Shuffle an array using seeded random.
 */
function shuffleArray<T>(array: T[], rng: SeededRandom): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ===== Level 1: Subtle Variations =====

/**
 * Generate Level 1 (Subtle) changes.
 * Changes so minor that players might second-guess themselves.
 *
 * Effects:
 * - Different wallpaper pattern
 * - Furniture rotated/moved slightly
 * - Lights have warmer/cooler tint
 * - Floor texture scaled differently
 * - Room feels 6 inches taller/shorter
 */
export function generateLevel1Changes(rng: SeededRandom): SubtleChange[] {
  const changes: SubtleChange[] = [];

  // Pick 1-3 subtle changes
  const numChanges = 1 + Math.floor(rng.next() * 3);

  const possibleChanges: SubtleChange[] = [
    {
      kind: 'wallpaper_seed',
      newSeed: Math.floor(rng.next() * 10000),
    },
    {
      kind: 'furniture_offset',
      offset: new THREE.Vector3(
        (rng.next() - 0.5) * 0.3,
        0,
        (rng.next() - 0.5) * 0.3
      ),
    },
    {
      kind: 'light_color_shift',
      shift: (rng.next() - 0.5) * 20, // -10 to +10 degrees hue
    },
    {
      kind: 'carpet_pattern_phase',
      phase: rng.next() * Math.PI * 2,
    },
    {
      kind: 'ceiling_height',
      delta: (rng.next() - 0.5) * 0.2, // -0.1 to +0.1 units
    },
    {
      kind: 'ambient_volume',
      multiplier: 0.8 + rng.next() * 0.4, // 0.8 to 1.2
    },
  ];

  // Shuffle and pick
  const shuffled = shuffleArray(possibleChanges, rng);
  changes.push(...shuffled.slice(0, numChanges));

  return changes;
}

// ===== Level 2: Noticeable Variations =====

/**
 * Generate Level 2 (Noticeable) changes.
 * Clear architectural differences that players will definitely notice.
 *
 * Effects:
 * - Door leads to a different room than expected
 * - An extra hallway branches off where there wasn't one before
 * - A door is missing, replaced by blank wall
 * - Windows look out onto impossible views
 * - Room is noticeably longer/wider than before
 */
export function generateLevel2Changes(rng: SeededRandom): NoticeableChange[] {
  const changes: NoticeableChange[] = [];

  // Pick 1-2 noticeable changes
  const numChanges = 1 + Math.floor(rng.next() * 2);

  const changeGenerators: (() => NoticeableChange)[] = [
    // Door target remapping
    () => ({
      kind: 'door_target_remap',
      doorIndex: Math.floor(rng.next() * 4), // Assume max 4 doors
      newTarget: Math.floor(rng.next() * 100) + 50, // Random room ID
    }),

    // Extra hallway
    () => ({
      kind: 'extra_hallway',
      position: new THREE.Vector3(
        (rng.next() - 0.5) * 8,
        0,
        (rng.next() - 0.5) * 8
      ),
      direction: new THREE.Vector3(
        rng.next() > 0.5 ? 1 : -1,
        0,
        rng.next() > 0.5 ? 1 : -1
      ).normalize(),
    }),

    // Missing door
    () => ({
      kind: 'missing_door',
      doorIndex: Math.floor(rng.next() * 4),
    }),

    // Extra door
    () => ({
      kind: 'extra_door',
      position: new THREE.Vector3(
        (rng.next() - 0.5) * 8,
        0,
        (rng.next() - 0.5) * 8
      ),
      wall: ['north', 'south', 'east', 'west'][Math.floor(rng.next() * 4)],
    }),

    // Room stretched
    () => ({
      kind: 'room_stretched',
      axis: rng.next() > 0.5 ? 'x' : 'z',
      factor: 1.2 + rng.next() * 0.5, // 1.2x to 1.7x
    }),
  ];

  // Pick random generators
  for (let i = 0; i < numChanges; i++) {
    const generator = changeGenerators[Math.floor(rng.next() * changeGenerators.length)];
    changes.push(generator());
  }

  return changes;
}

// ===== Level 3: Unsettling Variations =====

/**
 * Generate Level 3 (Unsettling) changes.
 * Reality inconsistencies that cannot be rationalized.
 *
 * Effects:
 * - All text in the room appears mirrored/backwards
 * - Photos on walls show different faces (wrong people, or the player)
 * - Mirrors show the room empty, or show you in a different position
 * - Clocks show the wrong time (and different clocks disagree)
 * - Your footsteps don't match your movement speed
 */
export function generateLevel3Changes(rng: SeededRandom): UnsettlingChange[] {
  const changes: UnsettlingChange[] = [];

  // Pick 1-2 unsettling changes
  const numChanges = 1 + Math.floor(rng.next() * 2);

  const changeOptions: UnsettlingChange[] = [
    {
      kind: 'text_reversed',
      textureIds: ['signs', 'books', 'labels'],
    },
    {
      kind: 'photos_wrong_faces',
      faceSwapSeed: Math.floor(rng.next() * 10000),
    },
    {
      kind: 'mirror_shows_different',
      differenceType: (['empty', 'wrong_position', 'watching'] as const)[
        Math.floor(rng.next() * 3)
      ],
    },
    {
      kind: 'clock_wrong_time',
      offset: Math.floor(rng.next() * 12) - 6, // -6 to +6 hours
    },
    {
      kind: 'sounds_reversed',
    },
    {
      kind: 'impossible_shadow',
      sourcePosition: new THREE.Vector3(
        (rng.next() - 0.5) * 10,
        2,
        (rng.next() - 0.5) * 10
      ),
    },
    {
      kind: 'footsteps_mismatch',
    },
  ];

  // Shuffle and pick
  const shuffled = shuffleArray(changeOptions, rng);
  changes.push(...shuffled.slice(0, numChanges));

  return changes;
}

// ===== Level 4: Surreal Variations =====

/**
 * Generate Level 4 (Surreal) changes.
 * Physics and geometry violations.
 *
 * Effects:
 * - Gravity pulls slightly sideways (objects lean, player movement affected)
 * - Stairs that go up on all sides (Escher-like)
 * - You see yourself standing across the room, watching
 * - A smaller version of the room exists inside the room
 * - Looking down a hallway shows infinite copies receding
 */
export function generateLevel4Changes(rng: SeededRandom): SurrealChange[] {
  const changes: SurrealChange[] = [];

  // Level 4 gets exactly one major effect
  const changeOptions: (() => SurrealChange)[] = [
    // Gravity shift
    () => ({
      kind: 'gravity_shift',
      direction: new THREE.Vector3(
        (rng.next() - 0.5) * 0.3,
        -1,
        (rng.next() - 0.5) * 0.3
      ).normalize(),
      strength: 0.8 + rng.next() * 0.4,
    }),

    // Impossible geometry
    () => ({
      kind: 'impossible_geometry',
      geometryType: ([
        'penrose_stairs',
        'klein_bottle_room',
        'mobius_hallway',
        'four_right_angles_triangle',
      ] as ImpossibleGeometry[])[Math.floor(rng.next() * 4)],
    }),

    // Self reflection (see yourself)
    () => ({
      kind: 'self_reflection',
      position: new THREE.Vector3(
        (rng.next() - 0.5) * 6,
        0,
        (rng.next() - 0.5) * 6
      ),
    }),

    // Room within room
    () => ({
      kind: 'room_within_room',
      scale: 0.5 + rng.next() * 0.3, // 0.5 to 0.8
    }),

    // Escher stairs
    () => ({
      kind: 'escher_stairs',
    }),

    // Infinite regression
    () => ({
      kind: 'infinite_regression',
      depth: 3 + Math.floor(rng.next() * 5), // 3 to 7 visible copies
    }),

    // Time dilation
    () => ({
      kind: 'time_dilation',
      factor: 0.5 + rng.next() * 1.5, // 0.5x to 2x time speed
    }),
  ];

  const generator = changeOptions[Math.floor(rng.next() * changeOptions.length)];
  changes.push(generator());

  return changes;
}

// ===== Level 5: Bizarre Variations =====

/**
 * Generate Level 5 (Bizarre) changes.
 * Complete reality breakdown.
 *
 * Effects:
 * - A tear in reality showing pure void with glowing edges
 * - Room suddenly has PS1-era graphics and dithered textures
 * - Endless empty office space with fluorescent lights
 * - Everything fades to near-black void
 * - Textures corrupted, geometry missing pieces
 * - The Growl becomes visible as a dark presence
 */
export function generateLevel5Changes(rng: SeededRandom): BizarreChange[] {
  const changes: BizarreChange[] = [];

  const changeOptions: (() => BizarreChange)[] = [
    // Reality tear
    () => ({
      kind: 'reality_tear',
      position: new THREE.Vector3(
        (rng.next() - 0.5) * 6,
        1 + rng.next() * 2,
        (rng.next() - 0.5) * 6
      ),
      size: 1 + rng.next() * 2,
    }),

    // Dimension bleed
    () => ({
      kind: 'dimension_bleed',
      sourceAesthetic: ([
        'ps1_horror',
        'liminal_office',
        'vaporwave',
        'void_black',
        'digital_decay',
      ] as AlternateAesthetic[])[Math.floor(rng.next() * 5)],
    }),

    // Void room
    () => ({
      kind: 'void_room',
      voidIntensity: 0.7 + rng.next() * 0.3,
    }),

    // Backrooms transition
    () => ({
      kind: 'backrooms_transition',
    }),

    // Memory palace
    () => ({
      kind: 'memory_palace',
      memories: generateMemoryFragments(rng),
    }),

    // Abstract space
    () => ({
      kind: 'abstract_space',
      geometryMode: ([
        'wireframe',
        'particle_only',
        'inverted_space',
        'impossible_colors',
      ] as AbstractMode[])[Math.floor(rng.next() * 4)],
    }),

    // The Presence (Growl manifests)
    () => ({
      kind: 'the_presence',
    }),
  ];

  const generator = changeOptions[Math.floor(rng.next() * changeOptions.length)];
  changes.push(generator());

  return changes;
}

/**
 * Generate memory fragment content for memory_palace variation.
 */
function generateMemoryFragments(rng: SeededRandom): MemoryFragment[] {
  const fragments: MemoryFragment[] = [];
  const numFragments = 2 + Math.floor(rng.next() * 3);

  const descriptions = [
    'A childhood bedroom with toys you almost recognize',
    'A school hallway that stretches too far',
    'A family dinner where all the faces are wrong',
    'A sunset that never quite ends',
    'A phone call where the voice is your own',
    'A mirror that shows you younger',
    'A door that leads to where you started',
    'Rain on a window that opens to nothing',
    'A photograph of a place you never visited',
    'Music playing from an empty room',
  ];

  const tones: Array<'nostalgic' | 'disturbing' | 'surreal'> = [
    'nostalgic',
    'disturbing',
    'surreal',
  ];

  const shuffledDescriptions = shuffleArray(descriptions, rng);

  for (let i = 0; i < numFragments; i++) {
    fragments.push({
      description: shuffledDescriptions[i],
      emotionalTone: tones[Math.floor(rng.next() * tones.length)],
    });
  }

  return fragments;
}

// ===== Aesthetic Configuration =====

export interface AestheticConfig {
  colorPalette: THREE.Color[];
  textureStyle: string;
  geometryResolution: number;
  fogDensity: number;
  postProcessing: string[];
}

/**
 * Get aesthetic configuration for dimension bleed variations.
 */
export function getAestheticConfig(aesthetic: AlternateAesthetic): AestheticConfig {
  switch (aesthetic) {
    case 'ps1_horror':
      return {
        colorPalette: [
          new THREE.Color(0x1a1a2e),
          new THREE.Color(0x16213e),
          new THREE.Color(0x0f3460),
        ],
        textureStyle: 'dithered_lowres',
        geometryResolution: 0.3, // Reduce vertex count
        fogDensity: 0.15,
        postProcessing: ['pixelate', 'dither', 'vertex_jitter'],
      };

    case 'liminal_office':
      return {
        colorPalette: [
          new THREE.Color(0xf5f5dc),
          new THREE.Color(0xd3d3d3),
          new THREE.Color(0x808080),
        ],
        textureStyle: 'fluorescent_lit',
        geometryResolution: 1.0,
        fogDensity: 0.02,
        postProcessing: ['bloom_harsh', 'desaturate'],
      };

    case 'vaporwave':
      return {
        colorPalette: [
          new THREE.Color(0xff71ce),
          new THREE.Color(0x01cdfe),
          new THREE.Color(0x05ffa1),
        ],
        textureStyle: 'grid_neon',
        geometryResolution: 1.0,
        fogDensity: 0.05,
        postProcessing: ['chromatic_aberration', 'bloom_strong', 'scanlines'],
      };

    case 'void_black':
      return {
        colorPalette: [
          new THREE.Color(0x000000),
          new THREE.Color(0x050505),
          new THREE.Color(0x0a0a0a),
        ],
        textureStyle: 'none',
        geometryResolution: 0.5,
        fogDensity: 0.3,
        postProcessing: ['darkness', 'grain'],
      };

    case 'digital_decay':
      return {
        colorPalette: [
          new THREE.Color(0xff0000),
          new THREE.Color(0x00ff00),
          new THREE.Color(0x0000ff),
        ],
        textureStyle: 'corrupted',
        geometryResolution: 0.7,
        fogDensity: 0.08,
        postProcessing: ['glitch_heavy', 'color_corruption', 'uv_distortion'],
      };
  }
}

export default {
  generateLevel1Changes,
  generateLevel2Changes,
  generateLevel3Changes,
  generateLevel4Changes,
  generateLevel5Changes,
  getAestheticConfig,
};
