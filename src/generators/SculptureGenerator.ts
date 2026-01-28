/**
 * Sculpture Generator
 *
 * Creates procedural sculptures that suggest without showing.
 *
 * Art Direction Principles:
 * - Figure Facing Wall (always turns away)
 * - Accumulation (too many identical objects)
 * - The Weight (heavy on thin support)
 * - Threshold Guardian (in doorways)
 * - Suggest without depicting horror
 * - Full mesh collision—player navigates around
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import {
  SculptureType,
  type SculptureConfig,
} from '../types/art';
import { WrongnessLevel, type WrongnessConfig, type RoomDimensions, type DoorwayPlacement, Wall } from '../types/room';

// Material colors
const SCULPTURE_MATERIALS = {
  marble: {
    color: new THREE.Color('#e8e4de'),
    roughness: 0.3,
    metalness: 0.0,
  },
  bronze: {
    color: new THREE.Color('#8b6914'),
    roughness: 0.4,
    metalness: 0.8,
  },
  clay: {
    color: new THREE.Color('#9d7a5a'),
    roughness: 0.9,
    metalness: 0.0,
  },
  void: {
    color: new THREE.Color('#1a1834'),
    roughness: 0.1,
    metalness: 0.0,
  },
  organic: {
    color: new THREE.Color('#4a4540'),
    roughness: 0.6,
    metalness: 0.1,
  },
};

/**
 * Generate sculptures for a room based on its configuration
 */
export function generateSculpturesForRoom(
  roomDimensions: RoomDimensions,
  roomIndex: number,
  wrongness: WrongnessConfig | undefined,
  doorways: DoorwayPlacement[],
  seed: number
): SculptureConfig[] {
  const rng = new SeededRandom(seed + 9000);
  const sculptures: SculptureConfig[] = [];

  const level = wrongness?.level ?? WrongnessLevel.SUBTLE;
  const abnormality = 1 - Math.exp(-roomIndex / 20);

  // Number of sculptures based on room size and depth
  // Fewer sculptures than paintings—they're more significant
  const baseCount = Math.floor(roomDimensions.width * roomDimensions.depth / 80);
  const count = Math.max(0, Math.min(3, baseCount + (level >= WrongnessLevel.NOTICEABLE ? 1 : 0)));

  // Maybe add a threshold guardian at a doorway
  if (level >= WrongnessLevel.UNSETTLING && doorways.length > 0 && rng.chance(0.4)) {
    const doorway = rng.pick(doorways);
    const guardianConfig = generateThresholdGuardian(seed + 9001, doorway, roomDimensions, level, rng);
    sculptures.push(guardianConfig);
  }

  // Generate other sculptures
  for (let i = 0; i < count; i++) {
    const sculptureSeed = seed + 9000 + (i + 1) * 1000;
    const sculpture = generateSculpture(
      sculptureSeed,
      i,
      roomDimensions,
      level,
      abnormality,
      rng
    );
    sculptures.push(sculpture);
  }

  return sculptures;
}

/**
 * Generate a threshold guardian at a doorway
 */
function generateThresholdGuardian(
  seed: number,
  doorway: DoorwayPlacement,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel,
  rng: SeededRandom
): SculptureConfig {
  const { width, depth } = roomDimensions;

  // Position just inside the doorway
  let x = 0, z = 0;
  let rotationY = 0;

  switch (doorway.wall) {
    case Wall.NORTH:
      z = -depth / 2 + 0.8;
      x = (doorway.position - 0.5) * width;
      rotationY = Math.PI; // Face into room
      break;
    case Wall.SOUTH:
      z = depth / 2 - 0.8;
      x = (doorway.position - 0.5) * width;
      rotationY = 0;
      break;
    case Wall.EAST:
      x = width / 2 - 0.8;
      z = (doorway.position - 0.5) * depth;
      rotationY = Math.PI / 2;
      break;
    case Wall.WEST:
      x = -width / 2 + 0.8;
      z = (doorway.position - 0.5) * depth;
      rotationY = -Math.PI / 2;
      break;
  }

  // Guardian is slightly turned away (unsettling)
  rotationY += rng.range(-0.3, 0.3);

  return {
    id: `sculpture-guardian-${seed}`,
    type: SculptureType.THRESHOLD_GUARDIAN,
    position: new THREE.Vector3(x, 0, z),
    rotation: new THREE.Euler(0, rotationY, 0),
    scale: rng.range(0.8, 1.2),
    material: rng.pick(['marble', 'bronze', 'void']),
    wrongnessLevel: level,
    seed,
  };
}

/**
 * Generate a single sculpture configuration
 */
function generateSculpture(
  seed: number,
  index: number,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel,
  _abnormality: number,
  _rng: SeededRandom
): SculptureConfig {
  const sculptureRng = new SeededRandom(seed);

  // Select type based on wrongness level
  const type = selectSculptureType(sculptureRng, level);

  // Calculate position
  const position = calculateSculpturePosition(sculptureRng, type, roomDimensions);

  // Calculate rotation (figures face walls at higher wrongness)
  const rotation = calculateSculptureRotation(sculptureRng, type, position, roomDimensions, level);

  // Select material
  const material = selectMaterial(sculptureRng, type, level);

  // Scale
  const scale = calculateScale(sculptureRng, type, level);

  return {
    id: `sculpture-${seed}-${index}`,
    type,
    position,
    rotation,
    scale,
    material,
    wrongnessLevel: level,
    seed,
  };
}

/**
 * Select sculpture type based on wrongness level
 */
function selectSculptureType(rng: SeededRandom, level: WrongnessLevel): SculptureType {
  if (level <= WrongnessLevel.SUBTLE) {
    return rng.pick([
      SculptureType.ABSTRACTION,
      SculptureType.VESSEL,
      SculptureType.FRAGMENT,
    ]);
  }

  if (level <= WrongnessLevel.NOTICEABLE) {
    return rng.pick([
      SculptureType.ABSTRACTION,
      SculptureType.FIGURE_FACING_WALL,
      SculptureType.FRAGMENT,
      SculptureType.VESSEL,
    ]);
  }

  if (level <= WrongnessLevel.UNSETTLING) {
    return rng.pick([
      SculptureType.FIGURE_FACING_WALL,
      SculptureType.THE_WEIGHT,
      SculptureType.ACCUMULATION,
      SculptureType.FRAGMENT,
    ]);
  }

  // High wrongness
  return rng.pick([
    SculptureType.FIGURE_FACING_WALL,
    SculptureType.THE_WEIGHT,
    SculptureType.ACCUMULATION,
    SculptureType.THRESHOLD_GUARDIAN,
  ]);
}

/**
 * Calculate sculpture position
 */
function calculateSculpturePosition(
  rng: SeededRandom,
  type: SculptureType,
  roomDimensions: RoomDimensions
): THREE.Vector3 {
  const { width, depth } = roomDimensions;
  const margin = 1.5; // Keep away from walls

  let x: number, z: number;

  switch (type) {
    case SculptureType.FIGURE_FACING_WALL:
      // Position near a wall, facing it
      const wall = rng.int(0, 3);
      if (wall === 0) {
        x = rng.range(-width / 2 + margin, width / 2 - margin);
        z = -depth / 2 + margin;
      } else if (wall === 1) {
        x = rng.range(-width / 2 + margin, width / 2 - margin);
        z = depth / 2 - margin;
      } else if (wall === 2) {
        x = width / 2 - margin;
        z = rng.range(-depth / 2 + margin, depth / 2 - margin);
      } else {
        x = -width / 2 + margin;
        z = rng.range(-depth / 2 + margin, depth / 2 - margin);
      }
      break;

    case SculptureType.ACCUMULATION:
      // Central position for accumulation
      x = rng.range(-width / 4, width / 4);
      z = rng.range(-depth / 4, depth / 4);
      break;

    default:
      // General positioning
      x = rng.range(-width / 2 + margin, width / 2 - margin);
      z = rng.range(-depth / 2 + margin, depth / 2 - margin);
  }

  return new THREE.Vector3(x, 0, z);
}

/**
 * Calculate sculpture rotation
 */
function calculateSculptureRotation(
  rng: SeededRandom,
  type: SculptureType,
  position: THREE.Vector3,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel
): THREE.Euler {
  let yRotation = 0;

  switch (type) {
    case SculptureType.FIGURE_FACING_WALL:
      // Face toward nearest wall
      const { width, depth } = roomDimensions;
      const distToNorth = Math.abs(position.z - (-depth / 2));
      const distToSouth = Math.abs(position.z - (depth / 2));
      const distToEast = Math.abs(position.x - (width / 2));
      const distToWest = Math.abs(position.x - (-width / 2));

      const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);

      if (minDist === distToNorth) yRotation = 0;
      else if (minDist === distToSouth) yRotation = Math.PI;
      else if (minDist === distToEast) yRotation = Math.PI / 2;
      else yRotation = -Math.PI / 2;
      break;

    case SculptureType.THRESHOLD_GUARDIAN:
      // Already handled in generator
      yRotation = rng.range(0, Math.PI * 2);
      break;

    default:
      yRotation = rng.range(0, Math.PI * 2);
  }

  // Add subtle wrongness tilt at higher levels
  const tiltX = level >= WrongnessLevel.UNSETTLING ? rng.range(-0.05, 0.05) : 0;
  const tiltZ = level >= WrongnessLevel.UNSETTLING ? rng.range(-0.05, 0.05) : 0;

  return new THREE.Euler(tiltX, yRotation, tiltZ);
}

/**
 * Select material based on type and wrongness
 */
function selectMaterial(
  rng: SeededRandom,
  type: SculptureType,
  level: WrongnessLevel
): SculptureConfig['material'] {
  if (level >= WrongnessLevel.SURREAL && rng.chance(0.3)) {
    return 'void';
  }

  if (type === SculptureType.FIGURE_FACING_WALL || type === SculptureType.THRESHOLD_GUARDIAN) {
    return rng.pick(['marble', 'bronze', 'clay']);
  }

  if (type === SculptureType.THE_WEIGHT) {
    return rng.pick(['marble', 'bronze']);
  }

  if (type === SculptureType.ACCUMULATION) {
    return rng.pick(['clay', 'bronze', 'organic']);
  }

  return rng.pick(['marble', 'bronze', 'clay', 'organic']);
}

/**
 * Calculate scale based on type
 */
function calculateScale(
  rng: SeededRandom,
  type: SculptureType,
  level: WrongnessLevel
): number {
  switch (type) {
    case SculptureType.FIGURE_FACING_WALL:
    case SculptureType.THRESHOLD_GUARDIAN:
      return rng.range(0.8, 1.2) * (1 + (level - 1) * 0.1);

    case SculptureType.THE_WEIGHT:
      return rng.range(1.0, 1.5);

    case SculptureType.ACCUMULATION:
      return rng.range(0.4, 0.6); // Individual pieces are small

    case SculptureType.FRAGMENT:
      return rng.range(0.5, 0.8);

    case SculptureType.VESSEL:
      return rng.range(0.3, 0.6);

    default:
      return rng.range(0.6, 1.0);
  }
}

/**
 * Get material properties for rendering
 */
export function getSculptureMaterialProps(material: SculptureConfig['material']): {
  color: THREE.Color;
  roughness: number;
  metalness: number;
} {
  return SCULPTURE_MATERIALS[material] || SCULPTURE_MATERIALS.marble;
}

// Singleton generator
let sculptureGeneratorInstance: SculptureGenerator | null = null;

export class SculptureGenerator {
  generateForRoom(
    roomDimensions: RoomDimensions,
    roomIndex: number,
    wrongness: WrongnessConfig | undefined,
    doorways: DoorwayPlacement[],
    seed: number
  ): SculptureConfig[] {
    return generateSculpturesForRoom(roomDimensions, roomIndex, wrongness, doorways, seed);
  }
}

export function getSculptureGenerator(): SculptureGenerator {
  if (!sculptureGeneratorInstance) {
    sculptureGeneratorInstance = new SculptureGenerator();
  }
  return sculptureGeneratorInstance;
}

export default SculptureGenerator;
