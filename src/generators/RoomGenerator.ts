/**
 * Room Geometry Generator
 *
 * Creates procedural room geometry with configurable dimensions,
 * doorway cutouts, and audio-reactive scaling.
 */

import * as THREE from 'three';
import { SeededRandom, getRoomSeed, getAbnormalityFactor } from '../utils/seededRandom';
import {
  RoomType,
  Wall,
  WallFeature,
  FloorType,
} from '../types/room';
import type {
  RoomDimensions,
  DoorwayPlacement,
  DoorwayGeometry,
  CeilingConfig,
  NonEuclideanConfig,
  RoomConfig,
  AudioLevels,
  GeneratedRoom,
} from '../types/room';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type AudioData,
  type LiminalMaterialConfig,
} from '../systems/AudioReactiveSystem';

// Pale-strata color palette
const COLORS = {
  background: '#1a1834',
  fogColor: '#211f3c',
  primary: '#c792f5',
  secondary: '#8eecf5',
  gradientStart: '#3a3861',
  gradientEnd: '#2c2c4b',
};

export interface RoomGeneratorOptions {
  baseSeed?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minDepth?: number;
  maxDepth?: number;
}

const DEFAULT_OPTIONS: Required<RoomGeneratorOptions> = {
  baseSeed: 42,
  minWidth: 4,
  maxWidth: 20,
  minHeight: 3,
  maxHeight: 8,
  minDepth: 4,
  maxDepth: 20,
};

export class RoomGenerator {
  private options: Required<RoomGeneratorOptions>;

  constructor(options: RoomGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a complete room configuration for a given room index
   */
  generateConfig(roomIndex: number, entryWall: Wall | null = null): RoomConfig {
    const seed = getRoomSeed(roomIndex, this.options.baseSeed);
    const rng = new SeededRandom(seed);
    const abnormality = getAbnormalityFactor(roomIndex);

    const type = this.getRoomType(rng, abnormality);
    const dimensions = this.getRoomDimensions(rng, type, abnormality);
    const complexity = this.getComplexity(type, rng, abnormality);
    const doorwayCount = this.getDoorwayCount(type, rng);
    const doorways = this.placeDoorways(roomIndex, dimensions, doorwayCount, seed, entryWall);
    const doorwayGeometry = this.getDoorwayGeometry(rng, abnormality);
    const wallFeatures = this.getWallFeatures(rng, abnormality);
    const floorType = this.getFloorType(rng, abnormality);
    const ceilingConfig = this.getCeilingConfig(rng, abnormality, dimensions.height);
    const nonEuclidean = this.getNonEuclideanConfig(rng, abnormality);

    return {
      index: roomIndex,
      seed,
      type,
      dimensions,
      doorways,
      doorwayGeometry,
      wallFeatures,
      floorType,
      ceilingConfig,
      nonEuclidean,
      abnormality,
      complexity,
    };
  }

  /**
   * Generate a complete room with geometry from a config
   */
  generateRoom(config: RoomConfig): GeneratedRoom {
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // Generate walls, floor, ceiling
    const { wallMeshes, wallGeoms, wallMats } = this.createWalls(config);
    wallMeshes.forEach((mesh) => group.add(mesh));
    geometries.push(...wallGeoms);
    materials.push(...wallMats);

    const { floorMesh, floorGeom, floorMat } = this.createFloor(config);
    group.add(floorMesh);
    geometries.push(floorGeom);
    materials.push(floorMat);

    if (config.ceilingConfig.isVisible) {
      const { ceilingMesh, ceilingGeom, ceilingMat } = this.createCeiling(config);
      group.add(ceilingMesh);
      geometries.push(ceilingGeom);
      materials.push(ceilingMat);
    }

    // Calculate bounding box
    const boundingBox = new THREE.Box3().setFromObject(group);

    // Create breathing scale state
    let currentScale = 1;
    let targetScale = 1;

    // Track elapsed time for shader updates
    let elapsedTime = 0;

    const room: GeneratedRoom = {
      config,
      mesh: group,
      boundingBox,
      geometries,
      materials,

      update(audioLevels: AudioLevels, delta: number) {
        elapsedTime += delta;

        // Non-euclidean room scaling based on audio levels
        const breatheAmount = audioLevels.bass * 0.02;
        targetScale = 1 + breatheAmount;

        // Smooth interpolation
        currentScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2);
        group.scale.setScalar(currentScale * config.nonEuclidean.interiorScale);

        // Update all shader materials with audio data
        const audioData: AudioData = {
          bass: audioLevels.bass,
          mid: audioLevels.mid,
          high: audioLevels.high,
          transient: audioLevels.transientIntensity,
          // Use raw values as smooth values too (smoothing happens in store)
          bassSmooth: audioLevels.bass,
          midSmooth: audioLevels.mid,
          highSmooth: audioLevels.high,
        };

        materials.forEach((material) => {
          if (material instanceof THREE.ShaderMaterial && material.uniforms.u_time) {
            updateLiminalMaterial(material, elapsedTime, delta, audioData, 0);
          }
        });
      },

      dispose() {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
      },
    };

    return room;
  }

  /**
   * Convenience method to generate a room directly from index
   */
  generate(roomIndex: number, entryWall: Wall | null = null): GeneratedRoom {
    const config = this.generateConfig(roomIndex, entryWall);
    return this.generateRoom(config);
  }

  // ============================================
  // Configuration generation methods
  // ============================================

  private getRoomType(rng: SeededRandom, abnormality: number): RoomType {
    const roll = rng.next();

    if (roll < 0.4) return RoomType.STANDARD;
    if (roll < 0.55) return RoomType.CORRIDOR;
    if (roll < 0.7) return RoomType.CHAMBER;
    if (roll < 0.8) return RoomType.ALCOVE;
    if (roll < 0.9) return RoomType.JUNCTION;

    // Impossible rooms only appear deeper
    if (abnormality > 0.3) return RoomType.IMPOSSIBLE;
    return RoomType.STANDARD;
  }

  private getRoomDimensions(
    rng: SeededRandom,
    type: RoomType,
    abnormality: number
  ): RoomDimensions {
    // Base ranges by type
    let baseWidth: number;
    let baseHeight: number;
    let baseDepth: number;

    switch (type) {
      case RoomType.CORRIDOR:
        baseWidth = rng.range(3, 5);
        baseHeight = rng.range(2.5, 4);
        baseDepth = rng.range(10, 20);
        break;
      case RoomType.CHAMBER:
        baseWidth = rng.range(10, 16);
        baseHeight = rng.range(5, 8);
        baseDepth = rng.range(10, 16);
        break;
      case RoomType.ALCOVE:
        baseWidth = rng.range(3, 5);
        baseHeight = rng.range(2.5, 3.5);
        baseDepth = rng.range(3, 5);
        break;
      case RoomType.JUNCTION:
        baseWidth = rng.range(6, 10);
        baseHeight = rng.range(3, 5);
        baseDepth = rng.range(6, 10);
        break;
      case RoomType.IMPOSSIBLE:
        baseWidth = rng.range(4, 15);
        baseHeight = rng.range(3, 10);
        baseDepth = rng.range(4, 15);
        break;
      default: // STANDARD
        baseWidth = rng.range(this.options.minWidth, 12);
        baseHeight = rng.range(this.options.minHeight, 5);
        baseDepth = rng.range(this.options.minDepth, 12);
    }

    // Apply abnormality scaling - rooms get more extreme deeper
    const widthScale = 1 + abnormality * rng.range(-0.5, 2);
    const heightScale = 1 + abnormality * rng.range(-0.3, 1.5);
    const depthScale = 1 + abnormality * rng.range(-0.5, 2);

    return {
      width: Math.min(baseWidth * widthScale, this.options.maxWidth),
      height: Math.min(baseHeight * heightScale, this.options.maxHeight),
      depth: Math.min(baseDepth * depthScale, this.options.maxDepth),
    };
  }

  private getComplexity(type: RoomType, rng: SeededRandom, abnormality: number): number {
    const base: Record<RoomType, number> = {
      [RoomType.STANDARD]: 2,
      [RoomType.CORRIDOR]: 1,
      [RoomType.CHAMBER]: 3,
      [RoomType.ALCOVE]: 1,
      [RoomType.JUNCTION]: 2,
      [RoomType.IMPOSSIBLE]: 4,
    };

    // Complexity increases with abnormality
    return base[type] + rng.int(0, 1) + Math.floor(abnormality * 2);
  }

  private getDoorwayCount(type: RoomType, rng: SeededRandom): number {
    switch (type) {
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

  private placeDoorways(
    roomIndex: number,
    dimensions: RoomDimensions,
    count: number,
    seed: number,
    entryWall: Wall | null
  ): DoorwayPlacement[] {
    const rng = new SeededRandom(seed + 2000);
    const placements: DoorwayPlacement[] = [];

    // Get available walls (exclude entry wall)
    const allWalls = Object.values(Wall);
    const availableWalls = entryWall
      ? allWalls.filter((w) => w !== entryWall)
      : [...allWalls];

    // Shuffle to randomize
    const shuffledWalls = rng.shuffle(availableWalls);

    for (let i = 0; i < count && i < shuffledWalls.length; i++) {
      const wall = shuffledWalls[i];

      placements.push({
        wall,
        position: rng.range(0.2, 0.8), // Keep away from corners
        width: rng.range(1.2, 2.0),
        height: rng.range(2.2, Math.min(2.8, dimensions.height - 0.5)),
        leadsTo: roomIndex + i + 1,
      });
    }

    return placements;
  }

  private getDoorwayGeometry(rng: SeededRandom, abnormality: number): DoorwayGeometry {
    const archTypes: DoorwayGeometry['archType'][] = [
      'rectangular',
      'arched',
      'gothic',
      'irregular',
    ];

    // Irregular doorways more common deeper
    const typeWeights = [
      0.5 - abnormality * 0.3,
      0.3,
      0.15,
      0.05 + abnormality * 0.3,
    ];

    return {
      frameThickness: rng.range(0.05, 0.15),
      archType: rng.weightedPick(archTypes, typeWeights),
      glowColor: COLORS.primary,
      glowIntensity: rng.range(0.3, 0.8),
    };
  }

  private getWallFeatures(rng: SeededRandom, abnormality: number): WallFeature[] {
    const features: WallFeature[] = [];

    // Base feature
    if (rng.next() < 0.4) features.push(WallFeature.PANELED);
    else if (rng.next() < 0.3) features.push(WallFeature.TILED);
    else features.push(WallFeature.TEXTURED);

    // Abnormality-based additions
    if (abnormality > 0.2 && rng.chance(abnormality)) {
      features.push(WallFeature.DAMAGED);
    }

    if (abnormality > 0.5 && rng.chance(abnormality * 0.5)) {
      features.push(WallFeature.ORGANIC);
    }

    return features;
  }

  private getFloorType(rng: SeededRandom, abnormality: number): FloorType {
    if (abnormality > 0.6 && rng.chance(abnormality * 0.3)) {
      return FloorType.VOID;
    }

    const types = [FloorType.CARPET, FloorType.TILE, FloorType.WOOD, FloorType.CONCRETE];
    return rng.pick(types);
  }

  private getCeilingConfig(
    rng: SeededRandom,
    abnormality: number,
    baseHeight: number
  ): CeilingConfig {
    return {
      height: baseHeight,
      hasLighting: rng.next() > abnormality * 0.5,
      lightingType: rng.pick(['recessed', 'fluorescent', 'bare_bulb', 'none']),
      hasSkylight: rng.chance(0.1),
      isVisible: !(abnormality > 0.4 && rng.chance(abnormality * 0.3)),
    };
  }

  private getNonEuclideanConfig(rng: SeededRandom, abnormality: number): NonEuclideanConfig {
    // Chance increases with depth
    const enabled = rng.chance(abnormality * 0.4);

    return {
      enabled,
      interiorScale: enabled ? rng.range(1.2, 2.5) : 1.0,
    };
  }

  // ============================================
  // Geometry generation methods
  // ============================================

  private createWalls(config: RoomConfig): {
    wallMeshes: THREE.Mesh[];
    wallGeoms: THREE.BufferGeometry[];
    wallMats: THREE.Material[];
  } {
    const { dimensions, doorways, complexity } = config;
    const { width, height, depth } = dimensions;

    const wallMeshes: THREE.Mesh[] = [];
    const wallGeoms: THREE.BufferGeometry[] = [];
    const wallMats: THREE.Material[] = [];

    // Create material based on wall features
    const material = this.createWallMaterial(config);
    wallMats.push(material);

    // Subdivision segments based on complexity
    const segments = Math.max(1, complexity);

    // Wall configurations: [wall, position, rotation, wallWidth, wallHeight]
    const wallConfigs: Array<{
      wall: Wall;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      wallWidth: number;
      wallHeight: number;
    }> = [
      {
        wall: Wall.NORTH,
        position: new THREE.Vector3(0, height / 2, -depth / 2),
        rotation: new THREE.Euler(0, 0, 0),
        wallWidth: width,
        wallHeight: height,
      },
      {
        wall: Wall.SOUTH,
        position: new THREE.Vector3(0, height / 2, depth / 2),
        rotation: new THREE.Euler(0, Math.PI, 0),
        wallWidth: width,
        wallHeight: height,
      },
      {
        wall: Wall.EAST,
        position: new THREE.Vector3(width / 2, height / 2, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        wallWidth: depth,
        wallHeight: height,
      },
      {
        wall: Wall.WEST,
        position: new THREE.Vector3(-width / 2, height / 2, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        wallWidth: depth,
        wallHeight: height,
      },
    ];

    for (const wallConfig of wallConfigs) {
      // Find doorways for this wall
      const wallDoorways = doorways.filter((d) => d.wall === wallConfig.wall);

      if (wallDoorways.length === 0) {
        // Simple wall without cutouts
        const geometry = new THREE.PlaneGeometry(
          wallConfig.wallWidth,
          wallConfig.wallHeight,
          segments,
          segments
        );
        this.applyUVMapping(geometry, wallConfig.wallWidth, wallConfig.wallHeight);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(wallConfig.position);
        mesh.rotation.copy(wallConfig.rotation);
        mesh.receiveShadow = true;

        wallMeshes.push(mesh);
        wallGeoms.push(geometry);
      } else {
        // Wall with doorway cutouts
        const cutoutGeometry = this.createWallWithCutouts(
          wallConfig.wallWidth,
          wallConfig.wallHeight,
          wallDoorways,
          segments
        );

        const mesh = new THREE.Mesh(cutoutGeometry, material);
        mesh.position.copy(wallConfig.position);
        mesh.rotation.copy(wallConfig.rotation);
        mesh.receiveShadow = true;

        wallMeshes.push(mesh);
        wallGeoms.push(cutoutGeometry);
      }
    }

    return { wallMeshes, wallGeoms, wallMats };
  }

  private createWallWithCutouts(
    wallWidth: number,
    wallHeight: number,
    doorways: DoorwayPlacement[],
    segments: number
  ): THREE.BufferGeometry {
    // Use ShapeGeometry to create wall with cutouts
    const shape = new THREE.Shape();

    // Outer wall rectangle (centered at origin)
    const hw = wallWidth / 2;
    const hh = wallHeight / 2;
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.lineTo(-hw, -hh);

    // Create holes for doorways
    for (const doorway of doorways) {
      const hole = new THREE.Path();

      // Calculate doorway position (centered on wall)
      const doorX = (doorway.position - 0.5) * wallWidth;
      const doorHalfWidth = doorway.width / 2;
      const doorTop = -hh + doorway.height;

      // Doorway hole (from floor up)
      hole.moveTo(doorX - doorHalfWidth, -hh);
      hole.lineTo(doorX + doorHalfWidth, -hh);
      hole.lineTo(doorX + doorHalfWidth, doorTop);
      hole.lineTo(doorX - doorHalfWidth, doorTop);
      hole.lineTo(doorX - doorHalfWidth, -hh);

      shape.holes.push(hole);
    }

    const geometry = new THREE.ShapeGeometry(shape, segments);
    this.applyUVMapping(geometry, wallWidth, wallHeight);

    return geometry;
  }

  private createFloor(config: RoomConfig): {
    floorMesh: THREE.Mesh;
    floorGeom: THREE.BufferGeometry;
    floorMat: THREE.Material;
  } {
    const { dimensions, floorType, complexity } = config;
    const { width, depth } = dimensions;

    const segments = Math.max(1, complexity);
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    this.applyUVMapping(geometry, width, depth);

    const material = this.createFloorMaterial(floorType, config.abnormality, config);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = true;

    return { floorMesh: mesh, floorGeom: geometry, floorMat: material };
  }

  private createCeiling(config: RoomConfig): {
    ceilingMesh: THREE.Mesh;
    ceilingGeom: THREE.BufferGeometry;
    ceilingMat: THREE.Material;
  } {
    const { dimensions, complexity, seed, index, abnormality } = config;
    const { width, height, depth } = dimensions;

    const segments = Math.max(1, complexity);
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    this.applyUVMapping(geometry, width, depth);

    // Create audio-reactive liminal material for ceiling
    const materialConfig: LiminalMaterialConfig = {
      seed: seed + 2000, // Different seed for ceiling
      roomIndex: index,
      patternScale: 0.7,
      patternRotation: 0,
      breatheIntensity: 0.5, // Subtle ceiling breathing
      rippleFrequency: 2.0,
      rippleIntensity: 0.3,
      abnormality,
    };

    const material = createLiminalMaterial(materialConfig);
    material.side = THREE.BackSide;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = height;
    mesh.receiveShadow = true;

    return { ceilingMesh: mesh, ceilingGeom: geometry, ceilingMat: material };
  }

  private createWallMaterial(config: RoomConfig): THREE.Material {
    const { wallFeatures, abnormality, seed, index } = config;

    // Calculate pattern parameters based on wall features
    let patternScale = 1.0;
    let breatheIntensity = 1.0;
    let rippleIntensity = 0.5;

    if (wallFeatures.includes(WallFeature.PANELED)) {
      patternScale = 0.8;
      breatheIntensity = 0.8;
    }
    if (wallFeatures.includes(WallFeature.TILED)) {
      patternScale = 1.5;
      rippleIntensity = 0.3;
    }
    if (wallFeatures.includes(WallFeature.DAMAGED)) {
      breatheIntensity = 1.5;
      rippleIntensity = 0.8;
    }
    if (wallFeatures.includes(WallFeature.ORGANIC)) {
      patternScale = 0.6;
      breatheIntensity = 1.3;
      rippleIntensity = 0.7;
    }

    // Create audio-reactive liminal material
    const materialConfig: LiminalMaterialConfig = {
      seed,
      roomIndex: index,
      patternScale,
      patternRotation: (seed % 100) / 100 * Math.PI * 0.5, // Slight rotation based on seed
      breatheIntensity,
      rippleFrequency: 3.0 + abnormality * 2.0, // More ripples in deeper rooms
      rippleIntensity,
      abnormality,
    };

    return createLiminalMaterial(materialConfig);
  }

  private createFloorMaterial(floorType: FloorType, abnormality: number, config: RoomConfig): THREE.Material {
    // Floor-specific pattern parameters
    const patternParams: Record<FloorType, { scale: number; breathe: number; ripple: number }> = {
      [FloorType.CARPET]: { scale: 0.5, breathe: 0.6, ripple: 0.3 },
      [FloorType.TILE]: { scale: 2.0, breathe: 0.4, ripple: 0.2 },
      [FloorType.WOOD]: { scale: 1.2, breathe: 0.5, ripple: 0.4 },
      [FloorType.CONCRETE]: { scale: 0.8, breathe: 0.7, ripple: 0.5 },
      [FloorType.VOID]: { scale: 0.3, breathe: 1.5, ripple: 1.0 },
    };

    const params = patternParams[floorType];

    // Create audio-reactive liminal material for floor
    const materialConfig: LiminalMaterialConfig = {
      seed: config.seed + 1000, // Different seed for floor
      roomIndex: config.index,
      patternScale: params.scale,
      patternRotation: Math.PI * 0.25, // 45 degree rotation for floor patterns
      breatheIntensity: params.breathe,
      rippleFrequency: 2.0 + abnormality,
      rippleIntensity: params.ripple,
      abnormality,
    };

    const material = createLiminalMaterial(materialConfig);

    // Special handling for void floors
    if (floorType === FloorType.VOID) {
      material.transparent = true;
      material.opacity = 0.3;
    }

    return material;
  }

  private applyUVMapping(geometry: THREE.BufferGeometry, width: number, height: number): void {
    const uvAttribute = geometry.getAttribute('uv');
    if (!uvAttribute) return;

    const uvArray = uvAttribute.array as Float32Array;

    // Scale UVs to maintain consistent texture density
    const textureScale = 1; // 1 unit = 1 texture repeat
    for (let i = 0; i < uvArray.length; i += 2) {
      uvArray[i] *= width * textureScale;
      uvArray[i + 1] *= height * textureScale;
    }

    uvAttribute.needsUpdate = true;
  }
}

export default RoomGenerator;
