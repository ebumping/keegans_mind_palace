/**
 * Furniture Generator
 *
 * Creates furniture that tells stories through arrangement and wrongness.
 *
 * Art Direction Principles:
 * - Chairs facing walls or corners
 * - Beds in wrong rooms (kitchen, hallway)
 * - Tables with items arranged for ritual
 * - Sofas for conversation with no conversants
 *
 * Wrongness Escalation:
 * - Level 1: Offset positions
 * - Level 2: Wrong orientations
 * - Level 3: Wrong rooms
 * - Level 4: Hostile arrangements (facing player)
 * - Level 5: Ceiling-mounted, gravity-defiant
 *
 * Every furniture piece MUST have collision mesh.
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import {
  FurnitureType,
  FurnitureIntent,
  type FurnitureConfig,
} from '../types/art';
import { WrongnessLevel, RoomArchetype, type WrongnessConfig, type RoomDimensions } from '../types/room';

// Furniture dimensions for collision
export const FURNITURE_DIMENSIONS: Record<FurnitureType, { width: number; height: number; depth: number }> = {
  [FurnitureType.CHAIR]: { width: 0.5, height: 0.9, depth: 0.5 },
  [FurnitureType.SOFA]: { width: 2.0, height: 0.8, depth: 0.9 },
  [FurnitureType.TABLE]: { width: 1.2, height: 0.75, depth: 0.8 },
  [FurnitureType.BED]: { width: 1.4, height: 0.5, depth: 2.0 },
  [FurnitureType.DESK]: { width: 1.2, height: 0.75, depth: 0.6 },
  [FurnitureType.CABINET]: { width: 0.8, height: 1.8, depth: 0.4 },
  [FurnitureType.LAMP]: { width: 0.3, height: 1.5, depth: 0.3 },
  [FurnitureType.CLOCK]: { width: 0.3, height: 0.4, depth: 0.1 },
  [FurnitureType.MIRROR]: { width: 0.6, height: 1.2, depth: 0.05 },
  [FurnitureType.PLANT]: { width: 0.4, height: 0.8, depth: 0.4 },
};

// Furniture appropriate for each archetype
const ARCHETYPE_FURNITURE: Record<RoomArchetype, FurnitureType[]> = {
  [RoomArchetype.LIVING_ROOM]: [FurnitureType.SOFA, FurnitureType.CHAIR, FurnitureType.TABLE, FurnitureType.LAMP, FurnitureType.PLANT],
  [RoomArchetype.KITCHEN]: [FurnitureType.TABLE, FurnitureType.CHAIR, FurnitureType.CABINET],
  [RoomArchetype.BEDROOM]: [FurnitureType.BED, FurnitureType.CABINET, FurnitureType.LAMP, FurnitureType.MIRROR],
  [RoomArchetype.BATHROOM]: [FurnitureType.MIRROR, FurnitureType.CABINET],
  [RoomArchetype.CORRIDOR_OF_DOORS]: [FurnitureType.LAMP, FurnitureType.PLANT],
  [RoomArchetype.WAITING_ROOM]: [FurnitureType.CHAIR, FurnitureType.TABLE, FurnitureType.PLANT, FurnitureType.CLOCK],
  [RoomArchetype.OFFICE]: [FurnitureType.DESK, FurnitureType.CHAIR, FurnitureType.CABINET, FurnitureType.LAMP, FurnitureType.CLOCK],
  [RoomArchetype.STAIRWELL]: [FurnitureType.LAMP],
  [RoomArchetype.ELEVATOR_BANK]: [FurnitureType.PLANT],
  [RoomArchetype.STORE]: [FurnitureType.TABLE, FurnitureType.CABINET],
  [RoomArchetype.RESTAURANT]: [FurnitureType.TABLE, FurnitureType.CHAIR],
  [RoomArchetype.ATRIUM]: [FurnitureType.SOFA, FurnitureType.PLANT, FurnitureType.LAMP],
  [RoomArchetype.PARKING]: [],
  [RoomArchetype.GENERIC]: [FurnitureType.CHAIR, FurnitureType.TABLE, FurnitureType.LAMP],
};

// Wrong furniture for each archetype (things that shouldn't be there)
const WRONG_FURNITURE: Record<RoomArchetype, FurnitureType[]> = {
  [RoomArchetype.LIVING_ROOM]: [FurnitureType.BED],
  [RoomArchetype.KITCHEN]: [FurnitureType.BED, FurnitureType.SOFA],
  [RoomArchetype.BEDROOM]: [FurnitureType.DESK, FurnitureType.DESK],
  [RoomArchetype.BATHROOM]: [FurnitureType.BED, FurnitureType.SOFA],
  [RoomArchetype.CORRIDOR_OF_DOORS]: [FurnitureType.BED, FurnitureType.SOFA],
  [RoomArchetype.WAITING_ROOM]: [FurnitureType.BED],
  [RoomArchetype.OFFICE]: [FurnitureType.BED],
  [RoomArchetype.STAIRWELL]: [FurnitureType.SOFA, FurnitureType.BED],
  [RoomArchetype.ELEVATOR_BANK]: [FurnitureType.BED],
  [RoomArchetype.STORE]: [FurnitureType.BED],
  [RoomArchetype.RESTAURANT]: [FurnitureType.BED],
  [RoomArchetype.ATRIUM]: [],
  [RoomArchetype.PARKING]: [FurnitureType.BED, FurnitureType.SOFA],
  [RoomArchetype.GENERIC]: [FurnitureType.BED],
};

/**
 * Generate furniture for a room based on its configuration
 */
export function generateFurnitureForRoom(
  roomDimensions: RoomDimensions,
  roomIndex: number,
  archetype: RoomArchetype | undefined,
  wrongness: WrongnessConfig | undefined,
  seed: number
): FurnitureConfig[] {
  const rng = new SeededRandom(seed + 10000);
  const furniture: FurnitureConfig[] = [];

  const level = wrongness?.level ?? WrongnessLevel.SUBTLE;
  const arch = archetype ?? RoomArchetype.GENERIC;
  const abnormality = 1 - Math.exp(-roomIndex / 20);

  // Get appropriate furniture for this archetype
  const appropriateFurniture = ARCHETYPE_FURNITURE[arch] || [];
  const wrongFurniture = WRONG_FURNITURE[arch] || [];

  // Calculate count based on room size, archetype density, and depth
  // Room area drives a base count, but density label sets the range
  const roomArea = roomDimensions.width * roomDimensions.depth;

  // Density labels now map to meaningful count ranges
  // Each archetype's density label actually controls how furnished the room feels
  const densityConfig: Record<string, { min: number; max: number; perArea: number }> = {
    crowded:  { min: 8,  max: 20, perArea: 0.012 },  // Waiting rooms: packed
    high:     { min: 5,  max: 14, perArea: 0.008 },   // Living rooms, offices: well-furnished
    moderate: { min: 3,  max: 10, perArea: 0.005 },   // Kitchens, bathrooms: functional
    sparse:   { min: 2,  max: 6,  perArea: 0.003 },   // Bedrooms, corridors: minimal but present
    none:     { min: 0,  max: 2,  perArea: 0.001 },   // Parking, stairwells: almost empty
  };

  // Look up the archetype's density from the spec
  const densityLabels: Record<RoomArchetype, string> = {
    [RoomArchetype.LIVING_ROOM]: 'high',
    [RoomArchetype.KITCHEN]: 'moderate',
    [RoomArchetype.BEDROOM]: 'sparse',
    [RoomArchetype.BATHROOM]: 'moderate',
    [RoomArchetype.CORRIDOR_OF_DOORS]: 'sparse',
    [RoomArchetype.WAITING_ROOM]: 'crowded',
    [RoomArchetype.OFFICE]: 'high',
    [RoomArchetype.STAIRWELL]: 'none',
    [RoomArchetype.ELEVATOR_BANK]: 'sparse',
    [RoomArchetype.STORE]: 'high',
    [RoomArchetype.RESTAURANT]: 'high',
    [RoomArchetype.ATRIUM]: 'sparse',
    [RoomArchetype.PARKING]: 'none',
    [RoomArchetype.GENERIC]: 'moderate',
  };

  const densityLabel = densityLabels[arch] || 'moderate';
  const density = densityConfig[densityLabel];
  const areaBasedCount = Math.floor(roomArea * density.perArea);
  let count = Math.max(density.min, Math.min(density.max, areaBasedCount + density.min));

  // Generate furniture pieces
  for (let i = 0; i < count; i++) {
    const furnitureSeed = seed + 10000 + i * 1000;

    // Decide if this should be wrong furniture
    const useWrongFurniture = level >= WrongnessLevel.UNSETTLING &&
      wrongFurniture.length > 0 &&
      rng.chance(0.2 + (level - 2) * 0.15);

    const availableTypes = useWrongFurniture ? wrongFurniture : appropriateFurniture;
    if (availableTypes.length === 0) continue;

    const piece = generateFurniturePiece(
      furnitureSeed,
      i,
      rng.pick(availableTypes),
      roomDimensions,
      level,
      abnormality,
      rng
    );

    // Check for collision with existing furniture
    if (!hasCollision(piece, furniture, roomDimensions)) {
      furniture.push(piece);
    }
  }

  // At high wrongness, maybe duplicate some furniture
  if (level >= WrongnessLevel.SURREAL && furniture.length > 0 && rng.chance(0.3)) {
    const toMultiply = rng.pick(furniture);
    const multipliedCount = rng.int(2, 4);

    for (let i = 0; i < multipliedCount; i++) {
      const offset = new THREE.Vector3(
        rng.range(-0.5, 0.5),
        0,
        rng.range(-0.5, 0.5)
      );

      const multiplied: FurnitureConfig = {
        ...toMultiply,
        id: `${toMultiply.id}-mult-${i}`,
        position: toMultiply.position.clone().add(offset),
        intent: FurnitureIntent.MULTIPLIED,
      };

      if (!hasCollision(multiplied, furniture, roomDimensions)) {
        furniture.push(multiplied);
      }
    }
  }

  return furniture;
}

/**
 * Generate a single furniture piece
 */
function generateFurniturePiece(
  seed: number,
  index: number,
  type: FurnitureType,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel,
  _abnormality: number,
  _rng: SeededRandom
): FurnitureConfig {
  const furnitureRng = new SeededRandom(seed);

  // Determine intent based on wrongness level
  const intent = selectIntent(furnitureRng, type, level);

  // Calculate position
  const position = calculatePosition(furnitureRng, type, intent, roomDimensions, level);

  // Calculate rotation
  const rotation = calculateRotation(furnitureRng, type, intent, position, roomDimensions, level);

  // Calculate scale (slight variations, more at high wrongness)
  const baseScale = 1.0;
  const scaleVariance = level >= WrongnessLevel.NOTICEABLE ? furnitureRng.range(-0.1, 0.15) : 0;
  const scale = baseScale + scaleVariance;

  return {
    id: `furniture-${seed}-${index}`,
    type,
    intent,
    position,
    rotation,
    scale,
    wrongnessLevel: level,
    seed,
  };
}

/**
 * Select furniture intent based on wrongness level
 */
function selectIntent(
  rng: SeededRandom,
  type: FurnitureType,
  level: WrongnessLevel
): FurnitureIntent {
  // Chairs and sofas have the most intent options
  if (type === FurnitureType.CHAIR || type === FurnitureType.SOFA) {
    if (level <= WrongnessLevel.SUBTLE) {
      return rng.chance(0.2) ? FurnitureIntent.FACING_WALL : FurnitureIntent.NO_CONVERSANTS;
    }

    if (level <= WrongnessLevel.NOTICEABLE) {
      return rng.pick([
        FurnitureIntent.FACING_WALL,
        FurnitureIntent.NO_CONVERSANTS,
        FurnitureIntent.NO_CONVERSANTS,
      ]);
    }

    if (level <= WrongnessLevel.UNSETTLING) {
      return rng.pick([
        FurnitureIntent.FACING_WALL,
        FurnitureIntent.HOSTILE,
        FurnitureIntent.RITUAL_ARRANGEMENT,
      ]);
    }

    if (level <= WrongnessLevel.SURREAL) {
      return rng.pick([
        FurnitureIntent.HOSTILE,
        FurnitureIntent.GRAVITY_DEFIANT,
        FurnitureIntent.MULTIPLIED,
      ]);
    }

    // BIZARRE
    return rng.pick([
      FurnitureIntent.GRAVITY_DEFIANT,
      FurnitureIntent.HOSTILE,
    ]);
  }

  // Beds
  if (type === FurnitureType.BED) {
    if (level >= WrongnessLevel.UNSETTLING) {
      return FurnitureIntent.WRONG_ROOM;
    }
    return rng.chance(0.3) ? FurnitureIntent.FACING_WALL : FurnitureIntent.NO_CONVERSANTS;
  }

  // Tables
  if (type === FurnitureType.TABLE) {
    if (level >= WrongnessLevel.UNSETTLING && rng.chance(0.4)) {
      return FurnitureIntent.RITUAL_ARRANGEMENT;
    }
    return FurnitureIntent.NO_CONVERSANTS;
  }

  // Default
  if (level >= WrongnessLevel.SURREAL && rng.chance(0.2)) {
    return FurnitureIntent.GRAVITY_DEFIANT;
  }

  return FurnitureIntent.NO_CONVERSANTS;
}

/**
 * Calculate furniture position
 */
function calculatePosition(
  rng: SeededRandom,
  type: FurnitureType,
  intent: FurnitureIntent,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel
): THREE.Vector3 {
  const { width, height, depth } = roomDimensions;
  const dims = FURNITURE_DIMENSIONS[type];
  const margin = Math.max(dims.width, dims.depth) / 2 + 0.5;

  let x: number, y: number, z: number;

  if (intent === FurnitureIntent.FACING_WALL) {
    // Position near a wall
    const wall = rng.int(0, 3);
    if (wall === 0) { // North
      x = rng.range(-width / 2 + margin, width / 2 - margin);
      z = -depth / 2 + margin;
    } else if (wall === 1) { // South
      x = rng.range(-width / 2 + margin, width / 2 - margin);
      z = depth / 2 - margin;
    } else if (wall === 2) { // East
      x = width / 2 - margin;
      z = rng.range(-depth / 2 + margin, depth / 2 - margin);
    } else { // West
      x = -width / 2 + margin;
      z = rng.range(-depth / 2 + margin, depth / 2 - margin);
    }
    y = 0;
  } else if (intent === FurnitureIntent.GRAVITY_DEFIANT) {
    // On the ceiling!
    x = rng.range(-width / 2 + margin, width / 2 - margin);
    z = rng.range(-depth / 2 + margin, depth / 2 - margin);
    y = height - dims.height; // Hanging from ceiling
  } else if (intent === FurnitureIntent.HOSTILE) {
    // Center of room, facing entry
    x = rng.range(-width / 4, width / 4);
    z = rng.range(-depth / 4, depth / 4);
    y = 0;
  } else {
    // General positioning with offset based on level
    const offsetAmount = level >= WrongnessLevel.NOTICEABLE ? 0.3 : 0;
    x = rng.range(-width / 2 + margin, width / 2 - margin) + rng.range(-offsetAmount, offsetAmount);
    z = rng.range(-depth / 2 + margin, depth / 2 - margin) + rng.range(-offsetAmount, offsetAmount);
    y = 0;
  }

  return new THREE.Vector3(x, y, z);
}

/**
 * Calculate furniture rotation
 */
function calculateRotation(
  rng: SeededRandom,
  _type: FurnitureType,
  intent: FurnitureIntent,
  position: THREE.Vector3,
  roomDimensions: RoomDimensions,
  level: WrongnessLevel
): THREE.Euler {
  const { width, depth } = roomDimensions;
  let yRotation = 0;

  if (intent === FurnitureIntent.FACING_WALL) {
    // Face toward nearest wall
    const distToNorth = Math.abs(position.z - (-depth / 2));
    const distToSouth = Math.abs(position.z - (depth / 2));
    const distToEast = Math.abs(position.x - (width / 2));
    const distToWest = Math.abs(position.x - (-width / 2));

    const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);

    if (minDist === distToNorth) yRotation = 0;
    else if (minDist === distToSouth) yRotation = Math.PI;
    else if (minDist === distToEast) yRotation = Math.PI / 2;
    else yRotation = -Math.PI / 2;
  } else if (intent === FurnitureIntent.HOSTILE) {
    // Face toward room center (as if watching)
    yRotation = Math.atan2(-position.x, -position.z);
  } else if (intent === FurnitureIntent.NO_CONVERSANTS) {
    // Seating arranged for conversation, but no one there
    // Angle toward center
    yRotation = Math.atan2(-position.x, -position.z) + rng.range(-0.3, 0.3);
  } else if (intent === FurnitureIntent.RITUAL_ARRANGEMENT) {
    // Precise angles (multiples of 45 degrees)
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI];
    yRotation = rng.pick(angles);
  } else if (intent === FurnitureIntent.GRAVITY_DEFIANT) {
    // Upside down rotation
    yRotation = rng.range(0, Math.PI * 2);
  } else {
    // Random with level-based offset
    yRotation = rng.range(0, Math.PI * 2);
  }

  // X/Z tilt for wrongness
  let xTilt = 0;
  let zTilt = 0;

  if (intent === FurnitureIntent.GRAVITY_DEFIANT) {
    xTilt = Math.PI; // Upside down
  } else if (level >= WrongnessLevel.SURREAL) {
    xTilt = rng.range(-0.05, 0.05);
    zTilt = rng.range(-0.05, 0.05);
  }

  return new THREE.Euler(xTilt, yRotation, zTilt);
}

/**
 * Check if a furniture piece collides with existing furniture
 */
function hasCollision(
  newPiece: FurnitureConfig,
  existing: FurnitureConfig[],
  _roomDimensions: RoomDimensions
): boolean {
  const newDims = FURNITURE_DIMENSIONS[newPiece.type];
  const newBox = new THREE.Box3(
    new THREE.Vector3(
      newPiece.position.x - newDims.width / 2,
      newPiece.position.y,
      newPiece.position.z - newDims.depth / 2
    ),
    new THREE.Vector3(
      newPiece.position.x + newDims.width / 2,
      newPiece.position.y + newDims.height,
      newPiece.position.z + newDims.depth / 2
    )
  );

  // Expand slightly for clearance
  newBox.expandByScalar(0.3);

  for (const piece of existing) {
    const dims = FURNITURE_DIMENSIONS[piece.type];
    const box = new THREE.Box3(
      new THREE.Vector3(
        piece.position.x - dims.width / 2,
        piece.position.y,
        piece.position.z - dims.depth / 2
      ),
      new THREE.Vector3(
        piece.position.x + dims.width / 2,
        piece.position.y + dims.height,
        piece.position.z + dims.depth / 2
      )
    );

    if (newBox.intersectsBox(box)) {
      return true;
    }
  }

  return false;
}

// Singleton generator
let furnitureGeneratorInstance: FurnitureGenerator | null = null;

export class FurnitureGenerator {
  generateForRoom(
    roomDimensions: RoomDimensions,
    roomIndex: number,
    archetype: RoomArchetype | undefined,
    wrongness: WrongnessConfig | undefined,
    seed: number
  ): FurnitureConfig[] {
    return generateFurnitureForRoom(roomDimensions, roomIndex, archetype, wrongness, seed);
  }
}

export function getFurnitureGenerator(): FurnitureGenerator {
  if (!furnitureGeneratorInstance) {
    furnitureGeneratorInstance = new FurnitureGenerator();
  }
  return furnitureGeneratorInstance;
}

export default FurnitureGenerator;
