/**
 * WrongnessSystem: Escalates wrongness with depth and Growl intensity
 *
 * The goal is not to scare. The goal is to unsettle.
 * The goal is wrongness.
 *
 * Wrongness Levels:
 * 1. Subtle - Offset furniture, slightly wrong proportions
 * 2. Noticeable - Wrong door connections, furniture facing walls
 * 3. Unsettling - Backwards text, wrong faces in photos
 * 4. Surreal - Gravity shifts, see yourself in photos
 * 5. Bizarre - Reality breaks, multiple instances of same space
 */

import { SeededRandom } from '../utils/seededRandom';
import { WrongnessLevel, RoomArchetype } from '../types/room';
import type {
  WrongnessConfig,
  RoomShapeConfig,
} from '../types/room';

export interface WrongnessParameters {
  // Spatial wrongness
  proportionSkew: number;      // 0-0.15: Room proportion distortion
  wallAngleVariance: number;   // 0-5 degrees: Wall angle deviation
  ceilingVariance: number;     // 0-0.3: Ceiling height inconsistency

  // Object wrongness
  furnitureOffset: number;     // 0-0.5: How much furniture is displaced
  furnitureRotation: number;   // 0-180: How much furniture is rotated wrong
  objectMultiplicity: number;  // 0-1: Chance of duplicated objects

  // Door wrongness
  doorSizeVariance: number;    // 0-0.3: Door size inconsistency
  fakeDoorChance: number;      // 0-0.4: Chance of fake doors

  // Light wrongness
  flickerChance: number;       // 0-0.3: Light flicker probability
  sourcelessChance: number;    // 0-0.2: Light without visible source

  // Time wrongness
  clockWrongness: number;      // 0-1: How wrong clocks are
}

/**
 * Calculate wrongness level based on depth and Growl intensity
 */
export function calculateWrongnessLevel(
  depth: number,
  growlIntensity: number
): WrongnessLevel {
  // Combined factor from both depth and Growl
  const depthFactor = Math.min(depth / 30, 1);
  const growlFactor = growlIntensity;

  // Higher of the two determines base level, other adds bonus
  const combinedFactor = Math.max(depthFactor, growlFactor) +
    Math.min(depthFactor, growlFactor) * 0.5;

  if (combinedFactor >= 0.9) return WrongnessLevel.BIZARRE;
  if (combinedFactor >= 0.7) return WrongnessLevel.SURREAL;
  if (combinedFactor >= 0.45) return WrongnessLevel.UNSETTLING;
  if (combinedFactor >= 0.2) return WrongnessLevel.NOTICEABLE;
  return WrongnessLevel.SUBTLE;
}

/**
 * Get wrongness parameters based on level
 */
export function getWrongnessParameters(
  level: WrongnessLevel,
  _seed: number
): WrongnessParameters {
  // Base parameters that scale with level
  const levelFactor = (level - 1) / 4; // 0 to 1

  return {
    proportionSkew: 0.02 + levelFactor * 0.13,
    wallAngleVariance: (0.5 + levelFactor * 4.5) * (Math.PI / 180),
    ceilingVariance: 0.02 + levelFactor * 0.28,

    furnitureOffset: levelFactor * 0.5,
    furnitureRotation: levelFactor * 180,
    objectMultiplicity: levelFactor * 0.6 + (level >= WrongnessLevel.SURREAL ? 0.3 : 0),

    doorSizeVariance: levelFactor * 0.3,
    fakeDoorChance: levelFactor * 0.4,

    flickerChance: levelFactor * 0.3,
    sourcelessChance: levelFactor * 0.2,

    clockWrongness: levelFactor,
  };
}

/**
 * Generate a complete wrongness configuration
 */
export function generateWrongnessConfig(
  depth: number,
  growlIntensity: number,
  seed: number
): WrongnessConfig {
  const rng = new SeededRandom(seed);
  const level = calculateWrongnessLevel(depth, growlIntensity);
  const params = getWrongnessParameters(level, seed);

  // Determine furniture orientation based on level
  let furnitureOrientation: WrongnessConfig['furnitureOrientation'];
  if (level <= WrongnessLevel.SUBTLE) {
    furnitureOrientation = 'normal';
  } else if (level <= WrongnessLevel.NOTICEABLE) {
    furnitureOrientation = rng.chance(0.5) ? 'normal' : 'offset';
  } else if (level <= WrongnessLevel.UNSETTLING) {
    furnitureOrientation = rng.pick(['offset', 'wrong']);
  } else if (level <= WrongnessLevel.SURREAL) {
    furnitureOrientation = rng.pick(['wrong', 'hostile']);
  } else {
    furnitureOrientation = rng.pick(['hostile', 'gravity_defiant']);
  }

  // Door placement logic
  let doorPlacement: WrongnessConfig['doorPlacement'];
  if (level <= WrongnessLevel.NOTICEABLE) {
    doorPlacement = 'logical';
  } else if (level <= WrongnessLevel.UNSETTLING) {
    doorPlacement = rng.chance(0.6) ? 'logical' : 'wrong';
  } else {
    doorPlacement = rng.pick(['wrong', 'impossible']);
  }

  // Lighting behavior
  let lightingBehavior: WrongnessConfig['lightingBehavior'];
  if (level <= WrongnessLevel.NOTICEABLE) {
    lightingBehavior = rng.chance(params.flickerChance) ? 'flicker' : 'normal';
  } else if (level <= WrongnessLevel.UNSETTLING) {
    lightingBehavior = rng.pick(['normal', 'flicker', 'sourceless']);
  } else {
    lightingBehavior = rng.pick(['flicker', 'sourceless', 'wrong_direction']);
  }

  // Clock behavior
  let clockBehavior: WrongnessConfig['clockBehavior'];
  if (level <= WrongnessLevel.SUBTLE) {
    clockBehavior = 'normal';
  } else if (level <= WrongnessLevel.NOTICEABLE) {
    clockBehavior = rng.pick(['normal', 'stopped']);
  } else if (level <= WrongnessLevel.UNSETTLING) {
    clockBehavior = rng.pick(['stopped', 'wrong_time']);
  } else if (level <= WrongnessLevel.SURREAL) {
    clockBehavior = rng.pick(['wrong_time', 'backwards']);
  } else {
    clockBehavior = rng.pick(['backwards', 'impossible']);
  }

  return {
    level,
    proportionSkew: params.proportionSkew,
    wallAngleVariance: params.wallAngleVariance,
    furnitureOrientation,
    doorPlacement,
    lightingBehavior,
    clockBehavior,
  };
}

/**
 * Apply wrongness to room shape vertices
 */
export function applyWrongnessToShape(
  shape: RoomShapeConfig,
  wrongness: WrongnessConfig,
  seed: number
): RoomShapeConfig {
  const rng = new SeededRandom(seed);

  // Apply proportion skew to vertices
  const skewedVertices = shape.vertices.map((v) => {
    const skewX = rng.range(-wrongness.proportionSkew, wrongness.proportionSkew);
    const skewY = rng.range(-wrongness.proportionSkew, wrongness.proportionSkew);

    return {
      x: v.x * (1 + skewX),
      y: v.y * (1 + skewY),
    };
  });

  // Apply wall angle variance (rotate each wall segment slightly)
  const angledVertices = skewedVertices.map((v) => {
    if (wrongness.wallAngleVariance > 0) {
      const angle = rng.range(-wrongness.wallAngleVariance, wrongness.wallAngleVariance);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Small rotation around centroid
      return {
        x: v.x * cos - v.y * sin * 0.1,
        y: v.y + v.x * sin * 0.1,
      };
    }
    return v;
  });

  return {
    ...shape,
    vertices: angledVertices,
  };
}

/**
 * Get wrongness description for debug display
 */
export function getWrongnessDescription(level: WrongnessLevel): string {
  switch (level) {
    case WrongnessLevel.SUBTLE:
      return 'Subtle - Something feels slightly off';
    case WrongnessLevel.NOTICEABLE:
      return 'Noticeable - This isn\'t right';
    case WrongnessLevel.UNSETTLING:
      return 'Unsettling - This shouldn\'t be';
    case WrongnessLevel.SURREAL:
      return 'Surreal - Reality is uncertain';
    case WrongnessLevel.BIZARRE:
      return 'Bizarre - Nothing makes sense';
    default:
      return 'Unknown';
  }
}

/**
 * Archetype-specific wrongness modifiers
 */
export function getArchetypeWrongnessModifiers(
  archetype: RoomArchetype
): Partial<WrongnessConfig> {
  // Each archetype has specific wrongness tendencies
  const modifiers: Record<RoomArchetype, Partial<WrongnessConfig>> = {
    living_room: {
      furnitureOrientation: 'wrong', // Furniture facing walls
    },
    kitchen: {
      lightingBehavior: 'flicker', // Fluorescent flicker
    },
    bedroom: {
      clockBehavior: 'stopped', // Time stopped here
    },
    bathroom: {
      lightingBehavior: 'wrong_direction', // Light from wrong angle
    },
    corridor_of_doors: {
      doorPlacement: 'wrong', // Too many doors, wrong spacing
    },
    waiting_room: {
      furnitureOrientation: 'hostile', // Chairs facing you
    },
    office: {
      clockBehavior: 'wrong_time', // Wrong time on all clocks
    },
    stairwell: {
      proportionSkew: 0.1, // Steps that don't add up
    },
    elevator_bank: {
      lightingBehavior: 'flicker',
    },
    store: {
      doorPlacement: 'impossible', // Exit that doesn't lead out
    },
    restaurant: {
      furnitureOrientation: 'offset', // Tables arranged wrong
    },
    atrium: {
      proportionSkew: 0.15, // Scale wrongness
    },
    parking: {
      lightingBehavior: 'sourceless', // Light from nowhere
    },
    generic: {},
  };

  return modifiers[archetype] || {};
}

/**
 * Get human-readable name for variation level
 */
export function getVariationLevelName(level: number): string {
  switch (level) {
    case 1: return 'Subtle';
    case 2: return 'Noticeable';
    case 3: return 'Unsettling';
    case 4: return 'Surreal';
    case 5: return 'Bizarre';
    default: return 'Unknown';
  }
}

// Singleton instance
let wrongnessSystemInstance: WrongnessSystem | null = null;

export class WrongnessSystem {
  private currentGrowlIntensity: number = 0;
  private currentDepth: number = 0;

  setGrowlIntensity(intensity: number): void {
    this.currentGrowlIntensity = intensity;
  }

  getGrowlIntensity(): number {
    return this.currentGrowlIntensity;
  }

  setDepth(depth: number): void {
    this.currentDepth = depth;
  }

  getDepth(): number {
    return this.currentDepth;
  }

  getCurrentVariationLevel(): number {
    const level = calculateWrongnessLevel(this.currentDepth, this.currentGrowlIntensity);
    return level;
  }

  calculateForRoom(depth: number, seed: number): WrongnessConfig {
    this.currentDepth = depth;
    return generateWrongnessConfig(depth, this.currentGrowlIntensity, seed);
  }
}

export function getWrongnessSystem(): WrongnessSystem {
  if (!wrongnessSystemInstance) {
    wrongnessSystemInstance = new WrongnessSystem();
  }
  return wrongnessSystemInstance;
}
