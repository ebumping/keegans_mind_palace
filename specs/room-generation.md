# Room Generation Specification

## Overview

The procedural room generation system creates infinite, unique rooms that become progressively stranger as the player explores deeper. Each room is deterministically generated from a seed, allowing consistent backtracking while enabling infinite forward exploration.

---

## Room Seed System

### Deterministic Generation

```typescript
function getRoomSeed(roomIndex: number, baseSeed: number = 42): number {
  // Prime multiplier ensures unique seeds with minimal collision
  return baseSeed + roomIndex * 7919;
}
```

**Properties:**
- Same `roomIndex` always produces identical room
- Sequential rooms have sufficiently different seeds
- Base seed can be user-configurable for different "palace" variants

### Seeded Random Number Generator

```typescript
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Mulberry32 PRNG - fast, good distribution
  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Utility methods
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}
```

---

## Room Dimensions

### Base Dimension Ranges

| Dimension | Minimum | Maximum | Unit |
|-----------|---------|---------|------|
| Width | 4 | 20 | meters |
| Height | 3 | 8 | meters |
| Depth | 4 | 20 | meters |

### Abnormality Factor

Room dimensions become more extreme with depth:

```typescript
function getAbnormalityFactor(roomIndex: number): number {
  // Starts at 0, approaches 1 asymptotically
  return 1 - Math.exp(-roomIndex / 20);
}

function getRoomDimensions(seed: number, roomIndex: number): RoomDimensions {
  const rng = new SeededRandom(seed);
  const abnormality = getAbnormalityFactor(roomIndex);

  // Base ranges
  const baseWidth = rng.range(4, 12);
  const baseHeight = rng.range(3, 5);
  const baseDepth = rng.range(4, 12);

  // Apply abnormality scaling
  const widthScale = 1 + abnormality * rng.range(-0.5, 2);
  const heightScale = 1 + abnormality * rng.range(-0.3, 1.5);
  const depthScale = 1 + abnormality * rng.range(-0.5, 2);

  return {
    width: baseWidth * widthScale,
    height: baseHeight * heightScale,
    depth: baseDepth * depthScale
  };
}
```

### Non-Euclidean Scaling

Rooms can be larger inside than doorways suggest:

```typescript
interface NonEuclideanConfig {
  interiorScale: number;  // 1.0 = normal, 1.5 = 50% larger inside
  enabled: boolean;
}

function getNonEuclideanConfig(seed: number, roomIndex: number): NonEuclideanConfig {
  const rng = new SeededRandom(seed);
  const abnormality = getAbnormalityFactor(roomIndex);

  // Chance increases with depth
  const enabled = rng.next() < abnormality * 0.4;

  return {
    enabled,
    interiorScale: enabled ? rng.range(1.2, 2.5) : 1.0
  };
}
```

---

## Room Types

### Type Definitions

```typescript
enum RoomType {
  STANDARD = 'standard',      // Regular rectangular room
  CORRIDOR = 'corridor',      // Long, narrow passage
  CHAMBER = 'chamber',        // Large open space
  ALCOVE = 'alcove',          // Small, intimate room
  JUNCTION = 'junction',      // Multiple doorways (3+)
  IMPOSSIBLE = 'impossible'   // Non-euclidean geometry
}

function getRoomType(seed: number, roomIndex: number): RoomType {
  const rng = new SeededRandom(seed);
  const abnormality = getAbnormalityFactor(roomIndex);

  const roll = rng.next();

  if (roll < 0.4) return RoomType.STANDARD;
  if (roll < 0.55) return RoomType.CORRIDOR;
  if (roll < 0.70) return RoomType.CHAMBER;
  if (roll < 0.80) return RoomType.ALCOVE;
  if (roll < 0.90) return RoomType.JUNCTION;

  // Impossible rooms only appear deeper
  if (abnormality > 0.3) return RoomType.IMPOSSIBLE;
  return RoomType.STANDARD;
}
```

### Type-Specific Constraints

| Type | Width:Depth Ratio | Height Range | Min Doorways |
|------|------------------|--------------|--------------|
| Standard | 0.5 - 2.0 | 3 - 5m | 2 |
| Corridor | 0.2 - 0.4 | 2.5 - 4m | 2 |
| Chamber | 0.8 - 1.2 | 5 - 8m | 2 |
| Alcove | 0.8 - 1.2 | 2.5 - 3.5m | 1 |
| Junction | 0.8 - 1.2 | 3 - 5m | 3-4 |
| Impossible | Variable | Variable | 2+ |

---

## Doorway Placement

### Doorway Count

```typescript
function getDoorwayCount(roomType: RoomType, seed: number, roomIndex: number): number {
  const rng = new SeededRandom(seed + 1000); // Offset seed for doorways

  switch (roomType) {
    case RoomType.ALCOVE:
      return 1;
    case RoomType.CORRIDOR:
      return 2;
    case RoomType.JUNCTION:
      return rng.int(3, 4);
    default:
      return rng.int(2, 3);
  }
}
```

### Wall Assignment

Doorways are placed on walls, ensuring logical flow:

```typescript
enum Wall {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west'
}

interface DoorwayPlacement {
  wall: Wall;
  position: number;  // 0-1 along wall length
  width: number;     // Doorway width
  height: number;    // Doorway height
  leadsTo: number;   // Target room index
}

function placeDoorways(
  roomIndex: number,
  dimensions: RoomDimensions,
  count: number,
  seed: number,
  entryWall: Wall | null
): DoorwayPlacement[] {
  const rng = new SeededRandom(seed + 2000);
  const placements: DoorwayPlacement[] = [];

  // Always place exit opposite to entry (if applicable)
  const availableWalls = Object.values(Wall).filter(w => w !== entryWall);

  for (let i = 0; i < count; i++) {
    const wall = rng.pick(availableWalls);
    const wallLength = wall === Wall.NORTH || wall === Wall.SOUTH
      ? dimensions.width
      : dimensions.depth;

    placements.push({
      wall,
      position: rng.range(0.2, 0.8),  // Keep away from corners
      width: rng.range(1.2, 2.0),
      height: rng.range(2.2, Math.min(2.8, dimensions.height - 0.5)),
      leadsTo: roomIndex + i + 1  // Sequential rooms forward
    });
  }

  return placements;
}
```

### Doorway Frame Geometry

```typescript
interface DoorwayGeometry {
  frameThickness: number;
  archType: 'rectangular' | 'arched' | 'gothic' | 'irregular';
  glowColor: string;
  glowIntensity: number;
}

function getDoorwayGeometry(seed: number, roomIndex: number): DoorwayGeometry {
  const rng = new SeededRandom(seed + 3000);
  const abnormality = getAbnormalityFactor(roomIndex);

  const archTypes: DoorwayGeometry['archType'][] = [
    'rectangular', 'arched', 'gothic', 'irregular'
  ];

  // Irregular doorways more common deeper
  const typeWeights = [
    0.5 - abnormality * 0.3,
    0.3,
    0.15,
    0.05 + abnormality * 0.3
  ];

  return {
    frameThickness: rng.range(0.05, 0.15),
    archType: weightedPick(archTypes, typeWeights, rng),
    glowColor: '#c792f5',  // Primary accent from palette
    glowIntensity: rng.range(0.3, 0.8)
  };
}
```

---

## Wall Geometry

### Subdivision Levels

```typescript
function getWallSubdivision(roomType: RoomType, seed: number): number {
  const rng = new SeededRandom(seed + 4000);

  const base = {
    [RoomType.STANDARD]: 2,
    [RoomType.CORRIDOR]: 1,
    [RoomType.CHAMBER]: 3,
    [RoomType.ALCOVE]: 1,
    [RoomType.JUNCTION]: 2,
    [RoomType.IMPOSSIBLE]: 4
  }[roomType];

  return base + rng.int(0, 1);
}
```

### Wall Features

```typescript
enum WallFeature {
  PLAIN = 'plain',
  PANELED = 'paneled',
  TILED = 'tiled',
  TEXTURED = 'textured',
  DAMAGED = 'damaged',
  ORGANIC = 'organic'
}

function getWallFeatures(seed: number, roomIndex: number): WallFeature[] {
  const rng = new SeededRandom(seed + 5000);
  const abnormality = getAbnormalityFactor(roomIndex);

  const features: WallFeature[] = [];

  // Base feature
  if (rng.next() < 0.4) features.push(WallFeature.PANELED);
  else if (rng.next() < 0.3) features.push(WallFeature.TILED);
  else features.push(WallFeature.TEXTURED);

  // Abnormality-based additions
  if (abnormality > 0.2 && rng.next() < abnormality) {
    features.push(WallFeature.DAMAGED);
  }

  if (abnormality > 0.5 && rng.next() < abnormality * 0.5) {
    features.push(WallFeature.ORGANIC);
  }

  return features;
}
```

---

## Floor and Ceiling

### Floor Types

```typescript
enum FloorType {
  CARPET = 'carpet',
  TILE = 'tile',
  WOOD = 'wood',
  CONCRETE = 'concrete',
  VOID = 'void'  // Transparent/missing sections
}

function getFloorType(seed: number, roomIndex: number): FloorType {
  const rng = new SeededRandom(seed + 6000);
  const abnormality = getAbnormalityFactor(roomIndex);

  if (abnormality > 0.6 && rng.next() < abnormality * 0.3) {
    return FloorType.VOID;
  }

  const types = [FloorType.CARPET, FloorType.TILE, FloorType.WOOD, FloorType.CONCRETE];
  return rng.pick(types);
}
```

### Ceiling Features

```typescript
interface CeilingConfig {
  height: number;
  hasLighting: boolean;
  lightingType: 'recessed' | 'fluorescent' | 'bare_bulb' | 'none';
  hasSkylight: boolean;
  isVisible: boolean;  // false = void ceiling (infinite darkness)
}

function getCeilingConfig(
  seed: number,
  roomIndex: number,
  baseHeight: number
): CeilingConfig {
  const rng = new SeededRandom(seed + 7000);
  const abnormality = getAbnormalityFactor(roomIndex);

  return {
    height: baseHeight,
    hasLighting: rng.next() > abnormality * 0.5,
    lightingType: rng.pick(['recessed', 'fluorescent', 'bare_bulb', 'none']),
    hasSkylight: rng.next() < 0.1,
    isVisible: !(abnormality > 0.4 && rng.next() < abnormality * 0.3)
  };
}
```

---

## Room Pool System

### Pool Configuration

```typescript
const POOL_SIZE = 5;  // Current room ±2

interface RoomPool {
  rooms: Map<number, GeneratedRoom>;
  currentIndex: number;
}

function updatePool(pool: RoomPool, newIndex: number): void {
  const minIndex = newIndex - 2;
  const maxIndex = newIndex + 2;

  // Remove rooms outside range
  for (const [index] of pool.rooms) {
    if (index < minIndex || index > maxIndex) {
      pool.rooms.get(index)?.dispose();
      pool.rooms.delete(index);
    }
  }

  // Generate rooms in range
  for (let i = minIndex; i <= maxIndex; i++) {
    if (i >= 0 && !pool.rooms.has(i)) {
      pool.rooms.set(i, generateRoom(i));
    }
  }

  pool.currentIndex = newIndex;
}
```

### Memory Management

```typescript
interface GeneratedRoom {
  index: number;
  geometry: THREE.BufferGeometry[];
  materials: THREE.Material[];
  mesh: THREE.Group;

  dispose(): void {
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
    // Mesh is removed from scene automatically
  }
}
```

---

## Audio Reactivity Integration

### Breathing Effect

Rooms subtly expand/contract with bass frequencies:

```typescript
function applyBreathingEffect(
  room: GeneratedRoom,
  bassLevel: number,
  delta: number
): void {
  const breatheAmount = bassLevel * 0.02;  // Max 2% scale change
  const smoothedScale = THREE.MathUtils.lerp(
    room.mesh.scale.x,
    1 + breatheAmount,
    delta * 2  // Smooth interpolation
  );

  room.mesh.scale.setScalar(smoothedScale);
}
```

### Wall Ripple

Vertex displacement based on mid frequencies (applied in shader):

```typescript
// Uniform passed to wall material
material.uniforms.u_rippleIntensity.value = midLevel * 0.05;
material.uniforms.u_rippleFrequency.value = 3.0 + midLevel * 2.0;
```

---

## Generated Room Interface

```typescript
interface GeneratedRoom {
  index: number;
  seed: number;
  type: RoomType;
  dimensions: RoomDimensions;
  doorways: DoorwayPlacement[];
  wallFeatures: WallFeature[];
  floorType: FloorType;
  ceilingConfig: CeilingConfig;
  nonEuclidean: NonEuclideanConfig;
  abnormality: number;

  // Three.js objects
  mesh: THREE.Group;
  boundingBox: THREE.Box3;

  // Methods
  update(audioLevels: AudioLevels, delta: number): void;
  dispose(): void;
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/generators/RoomGenerator.ts` | Main room generation class |
| `src/utils/seededRandom.ts` | Deterministic RNG utilities |
| `src/types/room.ts` | TypeScript interfaces |
| `src/components/Room.tsx` | React Three Fiber room component |
