/**
 * Room Geometry Generator
 *
 * Creates procedural room geometry with configurable dimensions,
 * doorway cutouts, and audio-reactive scaling.
 *
 * Now enhanced with:
 * - Non-rectangular room shapes (L, H, triangle, hexagon, spiral, irregular, curved)
 * - Room archetypes with specific architectural intent
 * - Vertical complexity (sunken, raised, mezzanine, split)
 * - Wrongness escalation based on depth and Growl
 */

import * as THREE from 'three';
import { SeededRandom, getRoomSeed, getAbnormalityFactor } from '../utils/seededRandom';
import {
  RoomType,
  Wall,
  WallFeature,
  FloorType,
  RoomShape,
  RoomArchetype,
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
  RoomShapeConfig,
  Point2D,
} from '../types/room';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type AudioData,
  type LiminalMaterialConfig,
} from '../systems/AudioReactiveSystem';
import {
  getRoomShapeGenerator,
  getShapeWeights,
  selectShape,
} from './RoomShapeGenerator';
import {
  getArchetypeRoomGenerator,
  selectArchetype,
} from './ArchetypeRoomGenerator';
import { getVerticalElementGenerator } from './VerticalElementGenerator';
import {
  generateWrongnessConfig,
  applyWrongnessToShape,
  getWrongnessSystem,
} from '../systems/WrongnessSystem';

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
  minWidth: 15,
  maxWidth: 60,
  minHeight: 6,
  maxHeight: 20,
  minDepth: 15,
  maxDepth: 60,
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

    // Get Growl intensity for wrongness calculation
    const wrongnessSystem = getWrongnessSystem();
    const growlIntensity = wrongnessSystem.getGrowlIntensity();

    // Select room archetype based on depth and abnormality
    const archetype = selectArchetype(roomIndex, abnormality, rng);
    const archetypeGenerator = getArchetypeRoomGenerator();

    // Generate dimensions based on archetype
    const type = this.getRoomType(rng, abnormality);
    let dimensions: RoomDimensions;

    if (archetype !== RoomArchetype.GENERIC) {
      dimensions = archetypeGenerator.generateDimensions(archetype, abnormality, rng);
    } else {
      dimensions = this.getRoomDimensions(rng, type, abnormality);
    }

    // Generate non-rectangular room shape
    const shapeWeights = getShapeWeights(roomIndex);
    const shapeType = selectShape(rng, shapeWeights);
    const shapeGenerator = getRoomShapeGenerator();
    let shape = shapeGenerator.generate(shapeType, dimensions, abnormality, seed);

    // Generate wrongness configuration
    const wrongness = generateWrongnessConfig(roomIndex, growlIntensity, seed);

    // Apply wrongness to shape (skew, angle variance)
    shape = applyWrongnessToShape(shape, wrongness, seed + 5000);

    // Generate vertical elements
    const verticalElementGenerator = getVerticalElementGenerator();
    const verticalElements = verticalElementGenerator.generate(
      shape,
      dimensions,
      roomIndex,
      abnormality,
      seed + 3000
    );

    const complexity = this.getComplexity(type, rng, abnormality);
    const doorwayCount = this.getDoorwayCount(type, rng);
    const doorways = this.placeDoorwaysForShape(
      roomIndex,
      dimensions,
      shape,
      doorwayCount,
      seed,
      entryWall
    );
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
      // New spatial design properties
      shape,
      archetype,
      verticalElements,
      wrongness,
    };
  }

  /**
   * Place doorways on non-rectangular shapes
   */
  private placeDoorwaysForShape(
    roomIndex: number,
    dimensions: RoomDimensions,
    _shape: RoomShapeConfig,
    count: number,
    seed: number,
    entryWall: Wall | null
  ): DoorwayPlacement[] {
    // For now, fall back to rectangular doorway placement
    // TODO: Place doorways on polygon edges for non-rectangular shapes
    return this.placeDoorways(roomIndex, dimensions, count, seed, entryWall);
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
    // Base ranges by type - scaled up for proper first-person feel
    let baseWidth: number;
    let baseHeight: number;
    let baseDepth: number;

    switch (type) {
      case RoomType.CORRIDOR:
        baseWidth = rng.range(8, 12);
        baseHeight = rng.range(6, 10);
        baseDepth = rng.range(30, 60);
        break;
      case RoomType.CHAMBER:
        baseWidth = rng.range(30, 50);
        baseHeight = rng.range(12, 20);
        baseDepth = rng.range(30, 50);
        break;
      case RoomType.ALCOVE:
        baseWidth = rng.range(10, 15);
        baseHeight = rng.range(6, 8);
        baseDepth = rng.range(10, 15);
        break;
      case RoomType.JUNCTION:
        baseWidth = rng.range(20, 35);
        baseHeight = rng.range(8, 12);
        baseDepth = rng.range(20, 35);
        break;
      case RoomType.IMPOSSIBLE:
        baseWidth = rng.range(15, 45);
        baseHeight = rng.range(8, 25);
        baseDepth = rng.range(15, 45);
        break;
      default: // STANDARD
        baseWidth = rng.range(this.options.minWidth, 40);
        baseHeight = rng.range(this.options.minHeight, 12);
        baseDepth = rng.range(this.options.minDepth, 40);
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
        width: rng.range(2.5, 4.0), // Wider doorways for larger spaces
        height: rng.range(3.5, Math.min(5.0, dimensions.height - 1.0)), // Taller doorways
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
    // Use polygon-based wall creation for non-rectangular shapes
    if (config.shape && config.shape.type !== RoomShape.RECTANGLE) {
      return this.createWallsFromPolygon(config);
    }

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

  /**
   * Create walls from polygon vertices for non-rectangular room shapes
   */
  private createWallsFromPolygon(config: RoomConfig): {
    wallMeshes: THREE.Mesh[];
    wallGeoms: THREE.BufferGeometry[];
    wallMats: THREE.Material[];
  } {
    const { shape, dimensions } = config;
    if (!shape) {
      // Fallback to rectangular
      return this.createWalls({ ...config, shape: undefined });
    }

    const wallMeshes: THREE.Mesh[] = [];
    const wallGeoms: THREE.BufferGeometry[] = [];
    const wallMats: THREE.Material[] = [];

    const material = this.createWallMaterial(config);
    wallMats.push(material);

    const height = dimensions.height;
    const vertices = shape.vertices;

    // Create a wall segment for each edge of the polygon
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];

      // Calculate wall dimensions and orientation
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const wallLength = Math.sqrt(dx * dx + dy * dy);

      if (wallLength < 0.1) continue; // Skip degenerate edges

      // Wall center position (x, y are floor coordinates, z is height)
      const centerX = (v1.x + v2.x) / 2;
      const centerY = (v1.y + v2.y) / 2;

      // Rotation to face inward (perpendicular to edge)
      const angle = Math.atan2(dy, dx);

      // Create wall geometry
      const geometry = new THREE.PlaneGeometry(wallLength, height, 2, 2);
      this.applyUVMapping(geometry, wallLength, height);

      const mesh = new THREE.Mesh(geometry, material);

      // Position: center of wall edge, half height up
      // Note: v1.x,v1.y are floor coordinates (x, z in 3D), y is up
      mesh.position.set(centerX, height / 2, centerY);

      // Rotate to align with edge and face inward
      mesh.rotation.set(0, -angle + Math.PI / 2, 0);

      mesh.receiveShadow = true;

      wallMeshes.push(mesh);
      wallGeoms.push(geometry);
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
    const { dimensions, floorType, complexity, shape } = config;
    const { width, depth } = dimensions;

    const material = this.createFloorMaterial(floorType, config.abnormality, config);
    let geometry: THREE.BufferGeometry;

    // Use polygon shape for non-rectangular rooms
    if (shape && shape.type !== RoomShape.RECTANGLE && shape.vertices.length >= 3) {
      geometry = this.createPolygonFloor(shape.vertices);
    } else {
      const segments = Math.max(1, complexity);
      geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
      this.applyUVMapping(geometry, width, depth);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.receiveShadow = true;

    return { floorMesh: mesh, floorGeom: geometry, floorMat: material };
  }

  /**
   * Create floor geometry from polygon vertices
   */
  private createPolygonFloor(vertices: Point2D[]): THREE.BufferGeometry {
    const shape = new THREE.Shape();

    if (vertices.length < 3) {
      return new THREE.PlaneGeometry(1, 1);
    }

    // Build shape from vertices
    shape.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i].x, vertices[i].y);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape, 2);

    // Apply UV mapping based on bounding box
    const positions = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');

    if (positions && uvs) {
      // Find bounds
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const v of vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }

      const width = maxX - minX || 1;
      const depth = maxY - minY || 1;

      // Remap UVs to maintain texture density
      const uvArray = uvs.array as Float32Array;
      for (let i = 0; i < uvArray.length; i += 2) {
        uvArray[i] *= width;
        uvArray[i + 1] *= depth;
      }
      uvs.needsUpdate = true;
    }

    return geometry;
  }

  private createCeiling(config: RoomConfig): {
    ceilingMesh: THREE.Mesh;
    ceilingGeom: THREE.BufferGeometry;
    ceilingMat: THREE.Material;
  } {
    const { dimensions, complexity, seed, index, abnormality, shape } = config;
    const { width, height, depth } = dimensions;

    let geometry: THREE.BufferGeometry;

    // Use polygon shape for non-rectangular rooms
    if (shape && shape.type !== RoomShape.RECTANGLE && shape.vertices.length >= 3) {
      geometry = this.createPolygonFloor(shape.vertices);
    } else {
      const segments = Math.max(1, complexity);
      geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
      this.applyUVMapping(geometry, width, depth);
    }

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
