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
  WrongnessConfig,
  CuratedRoom,
  RoomPalette,
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
import {
  CircuitryGenerator,
  shouldSpawnCircuitry,
} from './CircuitryGenerator';
import { getCorridorGenerator } from './CorridorGenerator';
import { getCuratedBuilder, type CuratedBuilderFn } from '../rooms/CuratedRoomRegistry';
import { getCuratedTemplate } from '../rooms/RoomTemplates';

// Pale-strata color palette
const COLORS = {
  background: '#1a1834',
  fogColor: '#211f3c',
  primary: '#c792f5',
  secondary: '#8eecf5',
  gradientStart: '#3a3861',
  gradientEnd: '#2c2c4b',
};

// Archetype-specific atmosphere tints — subtle color shifts that differentiate spaces
// Each entry modifies the liminal shader's gradient colors to evoke the archetype's mood
interface ArchetypeAtmosphere {
  gradientStart: THREE.Color;
  gradientEnd: THREE.Color;
  primary: THREE.Color;
}

const ARCHETYPE_ATMOSPHERES: Partial<Record<RoomArchetype, ArchetypeAtmosphere>> = {
  // Domestic — warm, faded tones
  [RoomArchetype.LIVING_ROOM]: {
    gradientStart: new THREE.Color('#4a3850'),  // dusty mauve
    gradientEnd: new THREE.Color('#352a3a'),
    primary: new THREE.Color('#d4a5a5'),        // dusty rose warmth
  },
  [RoomArchetype.KITCHEN]: {
    gradientStart: new THREE.Color('#3d4a3d'),  // sickly green-grey
    gradientEnd: new THREE.Color('#2a332a'),
    primary: new THREE.Color('#a5c9a5'),        // pale institutional green
  },
  [RoomArchetype.BEDROOM]: {
    gradientStart: new THREE.Color('#3a3555'),  // deep twilight blue
    gradientEnd: new THREE.Color('#28253d'),
    primary: new THREE.Color('#9b8aa5'),        // muted lavender
  },
  [RoomArchetype.BATHROOM]: {
    gradientStart: new THREE.Color('#354550'),  // cold ceramic blue-grey
    gradientEnd: new THREE.Color('#252f38'),
    primary: new THREE.Color('#8eaab5'),        // sterile blue
  },
  // Institutional — cold, sterile
  [RoomArchetype.CORRIDOR_OF_DOORS]: {
    gradientStart: new THREE.Color('#3f3d38'),  // beige-brown corridor
    gradientEnd: new THREE.Color('#2e2c28'),
    primary: new THREE.Color('#c4b89b'),        // faded beige
  },
  [RoomArchetype.WAITING_ROOM]: {
    gradientStart: new THREE.Color('#404040'),  // neutral grey
    gradientEnd: new THREE.Color('#2d2d2d'),
    primary: new THREE.Color('#b0b0b0'),        // institutional grey
  },
  [RoomArchetype.OFFICE]: {
    gradientStart: new THREE.Color('#383d45'),  // corporate blue-grey
    gradientEnd: new THREE.Color('#282c32'),
    primary: new THREE.Color('#8ea5c5'),        // fluorescent-lit blue
  },
  // Transitional — stark, echoing
  [RoomArchetype.STAIRWELL]: {
    gradientStart: new THREE.Color('#3a3a3a'),  // raw concrete
    gradientEnd: new THREE.Color('#252525'),
    primary: new THREE.Color('#a0a0a0'),        // bare concrete grey
  },
  [RoomArchetype.ELEVATOR_BANK]: {
    gradientStart: new THREE.Color('#3d3835'),  // brushed metal warmth
    gradientEnd: new THREE.Color('#2a2825'),
    primary: new THREE.Color('#c0b0a0'),        // brass-tinted
  },
  // Commercial — artificial brightness gone wrong
  [RoomArchetype.STORE]: {
    gradientStart: new THREE.Color('#454038'),  // retail fluorescent yellow-ish
    gradientEnd: new THREE.Color('#302d28'),
    primary: new THREE.Color('#d5c8a0'),        // cheap fluorescent warmth
  },
  [RoomArchetype.RESTAURANT]: {
    gradientStart: new THREE.Color('#45352a'),  // warm wood tones
    gradientEnd: new THREE.Color('#302520'),
    primary: new THREE.Color('#d4a87c'),        // candlelit amber
  },
  // Void — oppressive, vast
  [RoomArchetype.ATRIUM]: {
    gradientStart: new THREE.Color('#2a2a3a'),  // void-touched indigo
    gradientEnd: new THREE.Color('#1a1a28'),
    primary: new THREE.Color('#7070a0'),        // distant blue
  },
  [RoomArchetype.PARKING]: {
    gradientStart: new THREE.Color('#353530'),  // sodium-lit concrete
    gradientEnd: new THREE.Color('#252520'),
    primary: new THREE.Color('#c0b080'),        // sodium vapor yellow
  },
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
    const type = this.getRoomType(rng, abnormality, roomIndex);
    let dimensions: RoomDimensions;

    if (archetype !== RoomArchetype.GENERIC) {
      dimensions = archetypeGenerator.generateDimensions(archetype, abnormality, rng);
    } else {
      dimensions = this.getRoomDimensions(rng, type, abnormality);
    }

    // Generate corridor data if this is a corridor-type room
    let corridorData = undefined;
    let shape: RoomShapeConfig;

    if (type === RoomType.CORRIDOR) {
      // Use CorridorGenerator for evolving corridor geometry
      const corridorGen = getCorridorGenerator();
      corridorData = corridorGen.generate(dimensions, roomIndex, abnormality, seed + 4000);
      // Convert corridor to room shape for wall/floor rendering
      shape = corridorGen.toRoomShape(corridorData, dimensions);
    } else {
      // Generate non-rectangular room shape
      const shapeWeights = getShapeWeights(roomIndex);
      const shapeType = selectShape(rng, shapeWeights);
      const shapeGenerator = getRoomShapeGenerator();
      shape = shapeGenerator.generate(shapeType, dimensions, abnormality, seed);
    }

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

    // Generate circuitry overlay if room qualifies
    let circuitry = undefined;
    if (shouldSpawnCircuitry(seed, roomIndex, growlIntensity)) {
      const circuitryGen = new CircuitryGenerator(24, 0.1);
      // Density scales with depth — deeper rooms get denser traces
      const density = 0.3 + Math.min(abnormality * 0.3, 0.3);
      circuitry = circuitryGen.generate(1, 1, seed + 7000, density);
    }

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
    const floorType = this.getFloorType(rng, abnormality, archetype);
    const ceilingConfig = this.getCeilingConfig(rng, abnormality, dimensions.height, archetype);
    const nonEuclidean = this.getNonEuclideanConfig(rng, abnormality);

    // Generate fake doors based on wrongness
    const fakeDoors = this.generateFakeDoors(wrongness, dimensions, doorways, rng);

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
      circuitry,
      corridor: corridorData,
      fakeDoors,
    };
  }

  /**
   * Place doorways on non-rectangular shapes along actual polygon edges.
   * Falls back to rectangular placement for rectangular shapes or when
   * polygon data is unavailable.
   */
  private placeDoorwaysForShape(
    roomIndex: number,
    dimensions: RoomDimensions,
    shape: RoomShapeConfig,
    count: number,
    seed: number,
    entryWall: Wall | null
  ): DoorwayPlacement[] {
    // For rectangular shapes or missing polygon data, use rectangular placement
    if (
      !shape ||
      shape.type === RoomShape.RECTANGLE ||
      shape.vertices.length < 3
    ) {
      return this.placeDoorways(roomIndex, dimensions, count, seed, entryWall);
    }

    return this.placeDoorwaysOnPolygonEdges(
      roomIndex,
      dimensions,
      shape,
      count,
      seed,
      entryWall
    );
  }

  /**
   * Calculate valid wall segments from shape vertices and place doorways
   * on polygon edges. Filters out edges that are too short for a doorway
   * and distributes doorways across different edges for spatial variety.
   */
  private placeDoorwaysOnPolygonEdges(
    roomIndex: number,
    dimensions: RoomDimensions,
    shape: RoomShapeConfig,
    count: number,
    seed: number,
    entryWall: Wall | null
  ): DoorwayPlacement[] {
    const rng = new SeededRandom(seed + 2000);
    const vertices = shape.vertices;
    const minDoorWidth = 3.0; // Minimum doorway width
    const defaultDoorWidth = rng.range(2.5, 4.0);

    // Build list of valid edges with their lengths and wall classifications
    interface EdgeInfo {
      index: number;
      start: Point2D;
      end: Point2D;
      length: number;
      wall: Wall; // Closest cardinal wall classification
      midX: number;
      midY: number;
      angle: number;
    }

    const edges: EdgeInfo[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      // Skip edges too short to fit a doorway (door width + margin)
      if (length < minDoorWidth + 1.0) continue;

      const angle = Math.atan2(dy, dx);
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      // Classify edge into nearest cardinal wall direction based on
      // the outward-facing normal. For a CCW polygon, the outward normal
      // of edge (dx,dy) points in direction (dy, -dx).
      const normalAngle = Math.atan2(-dx, dy);
      const wall = this.classifyEdgeAsWall(normalAngle);

      edges.push({ index: i, start, end, length, wall, midX, midY, angle });
    }

    // If no valid edges found, fall back to rectangular placement
    if (edges.length === 0) {
      return this.placeDoorways(roomIndex, dimensions, count, seed, entryWall);
    }

    // Filter out entry wall edges if we have an entry wall
    let availableEdges = entryWall
      ? edges.filter((e) => e.wall !== entryWall)
      : [...edges];

    // If filtering removed all edges, use all edges
    if (availableEdges.length === 0) {
      availableEdges = [...edges];
    }

    // Shuffle for variety
    const shuffled = rng.shuffle(availableEdges);

    // Place doorways on distinct edges, distributing across different walls
    const placements: DoorwayPlacement[] = [];
    const usedEdgeIndices = new Set<number>();

    for (let i = 0; i < count && shuffled.length > 0; i++) {
      // Prefer unused edges for variety
      let edge = shuffled.find((e) => !usedEdgeIndices.has(e.index));
      if (!edge) {
        // All edges used, allow reuse
        edge = shuffled[i % shuffled.length];
      }

      usedEdgeIndices.add(edge.index);

      // Place doorway at a random position along the edge, keeping away
      // from vertices (corners). Clamp so the door doesn't overhang.
      const doorWidth = Math.min(defaultDoorWidth, edge.length - 1.0);
      const margin = (doorWidth / 2 + 0.5) / edge.length; // Half door + buffer
      const position = rng.range(
        Math.max(0.15, margin),
        Math.min(0.85, 1 - margin)
      );

      placements.push({
        wall: edge.wall,
        position,
        width: doorWidth,
        height: rng.range(3.5, Math.min(5.0, dimensions.height - 1.0)),
        leadsTo: roomIndex + i + 1,
        edgeStart: edge.start,
        edgeEnd: edge.end,
      });
    }

    return placements;
  }

  /**
   * Classify a polygon edge's outward normal angle into the nearest
   * cardinal Wall direction. This allows the existing Wall-based systems
   * (collision, navigation) to work with polygon doorways.
   */
  private classifyEdgeAsWall(normalAngle: number): Wall {
    // Normalize to [0, 2π)
    const a = ((normalAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // North: normal points toward -Z (angle ≈ -π/2 or 3π/2)
    // South: normal points toward +Z (angle ≈ π/2)
    // East:  normal points toward +X (angle ≈ 0)
    // West:  normal points toward -X (angle ≈ π)
    if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return Wall.SOUTH;
    if (a >= Math.PI * 0.75 && a < Math.PI * 1.25) return Wall.WEST;
    if (a >= Math.PI * 1.25 && a < Math.PI * 1.75) return Wall.NORTH;
    return Wall.EAST;
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

    // Dark floor fallback — ensures no black void is ever visible beneath the player.
    // Placed slightly below the main floor so it's only visible through transparent/void floors.
    const fallbackFloorGeom = new THREE.PlaneGeometry(
      config.dimensions.width * 1.5,
      config.dimensions.depth * 1.5
    );
    const fallbackFloorMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const fallbackFloor = new THREE.Mesh(fallbackFloorGeom, fallbackFloorMat);
    fallbackFloor.rotation.x = -Math.PI / 2;
    fallbackFloor.position.y = -0.05; // Just below the main floor
    fallbackFloor.receiveShadow = true;
    group.add(fallbackFloor);
    geometries.push(fallbackFloorGeom);
    materials.push(fallbackFloorMat);

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

    // Corridor breathing state — walls reference for dynamic width animation
    const corridorData = config.corridor;
    const corridorWallMeshes = config.type === RoomType.CORRIDOR ? wallMeshes : [];
    const corridorGen = config.type === RoomType.CORRIDOR ? getCorridorGenerator() : null;

    const room: GeneratedRoom = {
      config,
      mesh: group,
      boundingBox,
      geometries,
      materials,

      update(audioLevels: AudioLevels, delta: number) {
        elapsedTime += delta;

        // Corridor breathing: pulse wall scale with bass frequency
        if (corridorData && corridorGen) {
          const breatheOffset = corridorGen.updateBreathing(
            corridorData,
            audioLevels.bass,
            elapsedTime
          );
          // Apply breathing as X-axis scale (width pulse) to wall meshes
          if (breatheOffset !== 0) {
            const breatheScale = 1 + breatheOffset * 0.15;
            corridorWallMeshes.forEach((mesh) => {
              mesh.scale.x = breatheScale;
            });
          }
        }

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
   * Convenience method to generate a room directly from index.
   *
   * Branching logic for curated rooms:
   * - If a curated template exists AND has a registered builder → delegate to wrapCuratedRoom()
   * - If a curated template exists but NO builder → generate procedurally, then apply palette
   * - If no template (room 0) → fully procedural (existing behavior)
   */
  generate(roomIndex: number, entryWall: Wall | null = null): GeneratedRoom {
    const curatedTemplate = getCuratedTemplate(roomIndex);

    if (curatedTemplate) {
      const builder = getCuratedBuilder(curatedTemplate.templateId);

      if (builder) {
        // Curated room with a full builder — delegate entirely
        return this.wrapCuratedRoom(curatedTemplate, builder, roomIndex, entryWall);
      }

      // Template exists but no builder — procedural generation with curated palette
      const config = this.generateConfig(roomIndex, entryWall);
      const room = this.generateRoom(config);
      this.applyRoomPalette(room, curatedTemplate.palette);
      return room;
    }

    // No template (room 0) — fully procedural
    const config = this.generateConfig(roomIndex, entryWall);
    return this.generateRoom(config);
  }

  // ============================================
  // Curated room methods (stubs for sections 3.4 / 3.5)
  // ============================================

  /**
   * Wrap a curated room builder result into the GeneratedRoom interface.
   * Calls the builder function, synthesizes a minimal RoomConfig, and
   * converts CuratedDoorway[] into DoorwayPlacement[] for NavigationSystem.
   */
  private wrapCuratedRoom(
    template: CuratedRoom,
    builder: CuratedBuilderFn,
    roomIndex: number,
    _entryWall: Wall | null
  ): GeneratedRoom {
    const seed = getRoomSeed(roomIndex, this.options.baseSeed);

    // Call the curated builder to get the Three.js scene
    const result = builder(seed);

    // Convert CuratedDoorway[] → DoorwayPlacement[] for NavigationSystem
    const doorways = this.convertCuratedDoorways(template);

    // Synthesize a minimal RoomConfig so downstream systems
    // (NavigationSystem, CollisionManager, Room.tsx) work correctly
    const config: RoomConfig = {
      index: roomIndex,
      seed,
      type: RoomType.STANDARD,
      dimensions: template.dimensions,
      doorways,
      doorwayGeometry: {
        frameThickness: 0.1,
        archType: 'rectangular',
        glowColor: COLORS.primary,
        glowIntensity: 0.5,
      },
      wallFeatures: [WallFeature.PLAIN],
      floorType: template.floorType,
      ceilingConfig: template.ceilingConfig,
      nonEuclidean: { enabled: false, interiorScale: 1.0 },
      abnormality: getAbnormalityFactor(roomIndex),
      complexity: 1,
      archetype: template.archetype,
      verticalElements: template.verticalElements,
      isCurated: true,
    };

    // Compute bounding box from the builder's mesh
    const boundingBox = new THREE.Box3().setFromObject(result.mesh);

    const room: GeneratedRoom = {
      config,
      mesh: result.mesh,
      boundingBox,
      geometries: result.geometries,
      materials: result.materials,

      update(audioLevels: AudioLevels, delta: number) {
        // Forward audio data to the curated builder's update
        const audioData: AudioData = {
          bass: audioLevels.bass,
          mid: audioLevels.mid,
          high: audioLevels.high,
          transient: audioLevels.transientIntensity,
          bassSmooth: audioLevels.bass,
          midSmooth: audioLevels.mid,
          highSmooth: audioLevels.high,
        };
        result.update(audioData, delta);
      },

      dispose() {
        result.dispose();
      },
    };

    return room;
  }

  /**
   * Convert CuratedDoorway[] from a template into DoorwayPlacement[]
   * that the NavigationSystem expects.
   *
   * CuratedDoorway uses explicit position + facingAngle, while
   * DoorwayPlacement uses wall + position-along-wall (0–1).
   */
  private convertCuratedDoorways(template: CuratedRoom): DoorwayPlacement[] {
    const { dimensions } = template;

    return template.doorways.map((cd) => {
      // Determine which wall the doorway sits on from its facingAngle.
      // facingAngle is the outward-facing direction of the doorway.
      const wall = this.angleToWall(cd.facingAngle);

      // Compute position as 0–1 along the wall length.
      // The NavigationSystem maps position=0.5 to the center of the wall.
      let position: number;
      if (wall === Wall.NORTH || wall === Wall.SOUTH) {
        position = (cd.position.x / dimensions.width) + 0.5;
      } else {
        // East/West walls run along the depth axis
        position = (cd.position.y / dimensions.depth) + 0.5;
      }
      // Clamp to valid range
      position = Math.max(0.05, Math.min(0.95, position));

      return {
        wall,
        position,
        width: cd.width,
        height: cd.height,
        leadsTo: cd.leadsTo,
      } as DoorwayPlacement;
    });
  }

  /**
   * Map a facing angle (radians) to the nearest cardinal Wall direction.
   * 0 = +X (East), π/2 = +Z (South), π = -X (West), 3π/2 = -Z (North)
   */
  private angleToWall(angle: number): Wall {
    // Normalize to [0, 2π)
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return Wall.SOUTH;
    if (a >= Math.PI * 0.75 && a < Math.PI * 1.25) return Wall.WEST;
    if (a >= Math.PI * 1.25 && a < Math.PI * 1.75) return Wall.NORTH;
    return Wall.EAST;
  }

  /**
   * Apply a curated palette's colors to a procedurally generated room's materials.
   * Sets shader uniforms on all liminal materials in the room so that procedural
   * geometry uses the curated room's color identity.
   *
   * Mapping:
   *   palette.primary   → u_colorPrimary
   *   palette.secondary  → u_colorSecondary
   *   palette.fog        → u_colorBackground, u_colorGradientEnd
   *   palette.wall       → u_colorGradientStart
   */
  private applyRoomPalette(room: GeneratedRoom, palette: RoomPalette): void {
    const primary = new THREE.Color(palette.primary);
    const secondary = new THREE.Color(palette.secondary);
    const fog = new THREE.Color(palette.fog);
    const wall = new THREE.Color(palette.wall);

    for (const material of room.materials) {
      if (!(material instanceof THREE.ShaderMaterial) || !material.uniforms.u_colorPrimary) {
        continue;
      }

      const u = material.uniforms;
      u.u_colorPrimary.value.copy(primary);
      u.u_colorSecondary.value.copy(secondary);
      u.u_colorBackground.value.copy(fog);
      u.u_colorGradientStart.value.copy(wall);
      u.u_colorGradientEnd.value.copy(fog);
    }
  }

  // ============================================
  // Configuration generation methods
  // ============================================

  private getRoomType(rng: SeededRandom, abnormality: number, roomIndex: number = 0): RoomType {
    // Every 3rd room (indices 2, 5, 8, 11...) is a corridor connecting standard rooms
    // This creates a rhythm: room → room → corridor → room → room → corridor
    if (roomIndex > 0 && roomIndex % 3 === 2) {
      return RoomType.CORRIDOR;
    }

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

  private getFloorType(rng: SeededRandom, abnormality: number, archetype?: RoomArchetype): FloorType {
    if (abnormality > 0.6 && rng.chance(abnormality * 0.3)) {
      return FloorType.VOID;
    }

    // Archetype-specific floor material mapping
    if (archetype) {
      const archetypeFloors: Partial<Record<RoomArchetype, FloorType>> = {
        [RoomArchetype.BEDROOM]: FloorType.CARPET,
        [RoomArchetype.LIVING_ROOM]: FloorType.CARPET,
        [RoomArchetype.KITCHEN]: FloorType.TILE,
        [RoomArchetype.BATHROOM]: FloorType.TILE,
        [RoomArchetype.OFFICE]: FloorType.CARPET,
        [RoomArchetype.WAITING_ROOM]: FloorType.TILE,
        [RoomArchetype.CORRIDOR_OF_DOORS]: FloorType.TILE,
        [RoomArchetype.STAIRWELL]: FloorType.CONCRETE,
        [RoomArchetype.ELEVATOR_BANK]: FloorType.TILE,
        [RoomArchetype.STORE]: FloorType.TILE,
        [RoomArchetype.RESTAURANT]: FloorType.WOOD,
        [RoomArchetype.ATRIUM]: FloorType.TILE,
        [RoomArchetype.PARKING]: FloorType.CONCRETE,
      };

      const mapped = archetypeFloors[archetype];
      if (mapped) return mapped;
    }

    const types = [FloorType.CARPET, FloorType.TILE, FloorType.WOOD, FloorType.CONCRETE];
    return rng.pick(types);
  }

  private getCeilingConfig(
    rng: SeededRandom,
    abnormality: number,
    baseHeight: number,
    archetype?: RoomArchetype
  ): CeilingConfig {
    // Archetype-specific ceiling treatment: lighting type and skylight probability
    interface CeilingPreset {
      lightingType: CeilingConfig['lightingType'];
      skylightChance: number;
      hasLighting: boolean;
    }

    const archetypeCeilings: Partial<Record<RoomArchetype, CeilingPreset>> = {
      // Domestic
      [RoomArchetype.LIVING_ROOM]: { lightingType: 'recessed', skylightChance: 0.15, hasLighting: true },
      [RoomArchetype.KITCHEN]: { lightingType: 'fluorescent', skylightChance: 0.05, hasLighting: true },
      [RoomArchetype.BEDROOM]: { lightingType: 'recessed', skylightChance: 0.1, hasLighting: true },
      [RoomArchetype.BATHROOM]: { lightingType: 'fluorescent', skylightChance: 0.0, hasLighting: true },
      // Institutional
      [RoomArchetype.CORRIDOR_OF_DOORS]: { lightingType: 'fluorescent', skylightChance: 0.0, hasLighting: true },
      [RoomArchetype.WAITING_ROOM]: { lightingType: 'fluorescent', skylightChance: 0.05, hasLighting: true },
      [RoomArchetype.OFFICE]: { lightingType: 'fluorescent', skylightChance: 0.0, hasLighting: true },
      // Transitional
      [RoomArchetype.STAIRWELL]: { lightingType: 'bare_bulb', skylightChance: 0.0, hasLighting: true },
      [RoomArchetype.ELEVATOR_BANK]: { lightingType: 'recessed', skylightChance: 0.0, hasLighting: true },
      // Commercial
      [RoomArchetype.STORE]: { lightingType: 'fluorescent', skylightChance: 0.1, hasLighting: true },
      [RoomArchetype.RESTAURANT]: { lightingType: 'recessed', skylightChance: 0.0, hasLighting: true },
      // Void
      [RoomArchetype.ATRIUM]: { lightingType: 'none', skylightChance: 0.4, hasLighting: false },
      [RoomArchetype.PARKING]: { lightingType: 'bare_bulb', skylightChance: 0.0, hasLighting: true },
    };

    const preset = archetype ? archetypeCeilings[archetype] : undefined;

    return {
      height: baseHeight,
      hasLighting: preset ? preset.hasLighting : rng.next() > abnormality * 0.5,
      lightingType: preset ? preset.lightingType : rng.pick(['recessed', 'fluorescent', 'bare_bulb', 'none']),
      hasSkylight: rng.chance(preset ? preset.skylightChance : 0.1),
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

  /**
   * Generate fake doors that lead nowhere — sealed shut, wrongly placed
   */
  private generateFakeDoors(
    wrongness: WrongnessConfig,
    dimensions: RoomDimensions,
    realDoorways: DoorwayPlacement[],
    rng: SeededRandom
  ): DoorwayPlacement[] {
    if (wrongness.fakeDoorChance <= 0) return [];

    const fakeDoors: DoorwayPlacement[] = [];
    const allWalls = Object.values(Wall);

    // Number of fake doors scales with wrongness level
    const maxFakeDoors = Math.min(wrongness.level, 3);

    for (let i = 0; i < maxFakeDoors; i++) {
      if (!rng.chance(wrongness.fakeDoorChance)) continue;

      // Pick a wall, preferring walls without real doors for maximum wrongness
      const wallsWithDoors = new Set(realDoorways.map(d => d.wall));
      const emptyWalls = allWalls.filter(w => !wallsWithDoors.has(w));
      const wall = emptyWalls.length > 0 ? rng.pick(emptyWalls) : rng.pick(allWalls);

      // Fake doors can be placed anywhere — even near corners (wrongness)
      const position = rng.range(0.1, 0.9);

      // Size variance: fake doors can be wrong-sized
      const sizeWrong = wrongness.level >= 3;
      const width = sizeWrong ? rng.range(1.5, 5.0) : rng.range(2.5, 3.5);
      const height = sizeWrong
        ? rng.range(2.0, Math.min(dimensions.height - 0.5, 6.0))
        : rng.range(3.0, Math.min(dimensions.height - 1.0, 4.5));

      fakeDoors.push({
        wall,
        position,
        width,
        height,
        leadsTo: -1, // Leads nowhere
      });
    }

    return fakeDoors;
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

    // For rectangular rooms with wrongness, use polygon-based rendering
    // so that skewed vertices actually affect wall geometry
    if (config.shape && config.wrongness && config.wrongness.proportionSkew > 0.01) {
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
   * Create walls from polygon vertices for non-rectangular room shapes.
   * For curved/spiral shapes, merges consecutive curved edges into single
   * smooth meshes to avoid visible faceting. Cuts doorway holes where needed.
   */
  private createWallsFromPolygon(config: RoomConfig): {
    wallMeshes: THREE.Mesh[];
    wallGeoms: THREE.BufferGeometry[];
    wallMats: THREE.Material[];
  } {
    const { shape, dimensions, doorways } = config;
    if (!shape) {
      return this.createWalls({ ...config, shape: undefined });
    }

    const wallMeshes: THREE.Mesh[] = [];
    const wallGeoms: THREE.BufferGeometry[] = [];
    const wallMats: THREE.Material[] = [];

    const material = this.createWallMaterial(config);
    wallMats.push(material);

    const height = dimensions.height;
    const vertices = shape.vertices;

    // Build a set of edge indices that belong to curves for fast lookup
    const curvedEdgeIndices = new Set<number>();
    if (shape.wallCurves) {
      for (const curve of shape.wallCurves) {
        curvedEdgeIndices.add(curve.startIndex);
      }
    }

    // Group consecutive curved edges into runs for merged rendering.
    // Non-curved edges render individually as flat planes.
    const edgeGroups = this.groupEdgesForRendering(vertices, curvedEdgeIndices);

    for (const group of edgeGroups) {
      if (group.isCurved && group.edgeIndices.length > 1) {
        // Merge consecutive curved edges into a single smooth wall mesh
        const mergedResult = this.createMergedCurvedWall(
          vertices,
          group.edgeIndices,
          height,
          doorways,
          material
        );
        if (mergedResult) {
          wallMeshes.push(...mergedResult.meshes);
          wallGeoms.push(...mergedResult.geometries);
        }
      } else {
        // Render individual edge(s) as flat wall planes
        for (const edgeIdx of group.edgeIndices) {
          const v1 = vertices[edgeIdx];
          const v2 = vertices[(edgeIdx + 1) % vertices.length];

          const dx = v2.x - v1.x;
          const dy = v2.y - v1.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);

          if (wallLength < 0.1) continue;

          const centerX = (v1.x + v2.x) / 2;
          const centerY = (v1.y + v2.y) / 2;
          const angle = Math.atan2(dy, dx);

          const edgeDoorways = this.findEdgeDoorways(doorways, v1, v2);
          let geometry: THREE.BufferGeometry;

          if (edgeDoorways.length > 0) {
            geometry = this.createWallWithCutouts(wallLength, height, edgeDoorways, 2);
          } else {
            geometry = new THREE.PlaneGeometry(wallLength, height, 2, 2);
            this.applyUVMapping(geometry, wallLength, height);
          }

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(centerX, height / 2, centerY);
          mesh.rotation.set(0, -angle + Math.PI / 2, 0);
          mesh.receiveShadow = true;

          wallMeshes.push(mesh);
          wallGeoms.push(geometry);
        }
      }
    }

    return { wallMeshes, wallGeoms, wallMats };
  }

  /**
   * Group consecutive polygon edges into runs of curved or flat edges.
   * Consecutive curved edges are merged into a single group for smooth rendering.
   */
  private groupEdgesForRendering(
    vertices: Point2D[],
    curvedEdgeIndices: Set<number>
  ): Array<{ isCurved: boolean; edgeIndices: number[] }> {
    const groups: Array<{ isCurved: boolean; edgeIndices: number[] }> = [];
    const totalEdges = vertices.length;

    let i = 0;
    while (i < totalEdges) {
      const isCurved = curvedEdgeIndices.has(i);
      const group: number[] = [i];
      i++;

      // Extend group while next edge has same curved status
      while (i < totalEdges && curvedEdgeIndices.has(i) === isCurved) {
        group.push(i);
        i++;
      }

      groups.push({ isCurved, edgeIndices: group });
    }

    return groups;
  }

  /**
   * Create a single merged wall mesh from consecutive curved polygon edges.
   * Uses BufferGeometry with a triangle strip to produce a smooth curved surface.
   */
  private createMergedCurvedWall(
    vertices: Point2D[],
    edgeIndices: number[],
    wallHeight: number,
    doorways: DoorwayPlacement[],
    material: THREE.Material
  ): { meshes: THREE.Mesh[]; geometries: THREE.BufferGeometry[] } | null {
    // Collect all vertices along the curve (including the last endpoint)
    const curvePoints: Point2D[] = [];
    for (const idx of edgeIndices) {
      curvePoints.push(vertices[idx]);
    }
    // Add the endpoint of the last edge
    const lastIdx = edgeIndices[edgeIndices.length - 1];
    curvePoints.push(vertices[(lastIdx + 1) % vertices.length]);

    if (curvePoints.length < 2) return null;

    // Check if any doorways are placed on edges in this group
    const groupDoorways: Array<{ doorway: DoorwayPlacement; edgeLocalIdx: number }> = [];
    for (let i = 0; i < edgeIndices.length; i++) {
      const idx = edgeIndices[i];
      const v1 = vertices[idx];
      const v2 = vertices[(idx + 1) % vertices.length];
      const edgeDoors = this.findEdgeDoorways(doorways, v1, v2);
      for (const d of edgeDoors) {
        groupDoorways.push({ doorway: d, edgeLocalIdx: i });
      }
    }

    // If doorways exist in this curve group, fall back to per-edge rendering
    // for those edges (doorway cutouts need flat wall segments)
    if (groupDoorways.length > 0) {
      const meshes: THREE.Mesh[] = [];
      const geometries: THREE.BufferGeometry[] = [];

      for (let i = 0; i < edgeIndices.length; i++) {
        const idx = edgeIndices[i];
        const v1 = vertices[idx];
        const v2 = vertices[(idx + 1) % vertices.length];

        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const wallLength = Math.sqrt(dx * dx + dy * dy);
        if (wallLength < 0.1) continue;

        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const angle = Math.atan2(dy, dx);

        const edgeDoors = this.findEdgeDoorways(doorways, v1, v2);
        let geometry: THREE.BufferGeometry;

        if (edgeDoors.length > 0) {
          geometry = this.createWallWithCutouts(wallLength, wallHeight, edgeDoors, 2);
        } else {
          geometry = new THREE.PlaneGeometry(wallLength, wallHeight, 1, 1);
          this.applyUVMapping(geometry, wallLength, wallHeight);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(centerX, wallHeight / 2, centerY);
        mesh.rotation.set(0, -angle + Math.PI / 2, 0);
        mesh.receiveShadow = true;

        meshes.push(mesh);
        geometries.push(geometry);
      }

      return { meshes, geometries };
    }

    // Build a single smooth curved wall as custom BufferGeometry.
    // Two rows of vertices: bottom (y=0) and top (y=wallHeight).
    // Each curve point becomes a column in the mesh.
    const numPoints = curvePoints.length;
    const posArray = new Float32Array(numPoints * 2 * 3); // 2 rows, 3 components
    const uvArray = new Float32Array(numPoints * 2 * 2);  // 2 rows, 2 components
    const indexArray: number[] = [];

    // Calculate cumulative arc length for UV mapping
    const arcLengths: number[] = [0];
    for (let i = 1; i < numPoints; i++) {
      const dx = curvePoints[i].x - curvePoints[i - 1].x;
      const dy = curvePoints[i].y - curvePoints[i - 1].y;
      arcLengths.push(arcLengths[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalArcLength = arcLengths[numPoints - 1] || 1;

    for (let i = 0; i < numPoints; i++) {
      const p = curvePoints[i];
      const u = arcLengths[i] / totalArcLength;

      // Bottom vertex (row 0)
      const bi = i * 2;
      posArray[bi * 3 + 0] = p.x;
      posArray[bi * 3 + 1] = 0;
      posArray[bi * 3 + 2] = p.y;
      uvArray[bi * 2 + 0] = u * totalArcLength; // Scale UV by real-world size
      uvArray[bi * 2 + 1] = 0;

      // Top vertex (row 1)
      const ti = i * 2 + 1;
      posArray[ti * 3 + 0] = p.x;
      posArray[ti * 3 + 1] = wallHeight;
      posArray[ti * 3 + 2] = p.y;
      uvArray[ti * 2 + 0] = u * totalArcLength;
      uvArray[ti * 2 + 1] = wallHeight;
    }

    // Build triangle indices: two triangles per quad between adjacent columns
    for (let i = 0; i < numPoints - 1; i++) {
      const bl = i * 2;       // bottom-left
      const tl = i * 2 + 1;   // top-left
      const br = (i + 1) * 2; // bottom-right
      const tr = (i + 1) * 2 + 1; // top-right

      // Triangle 1: bl, br, tl
      indexArray.push(bl, br, tl);
      // Triangle 2: tl, br, tr
      indexArray.push(tl, br, tr);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geometry.setIndex(indexArray);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    return { meshes: [mesh], geometries: [geometry] };
  }

  /**
   * Find doorways placed on a specific polygon edge by matching endpoints.
   */
  private findEdgeDoorways(
    doorways: DoorwayPlacement[],
    v1: Point2D,
    v2: Point2D
  ): DoorwayPlacement[] {
    return doorways.filter((d) => {
      if (!d.edgeStart || !d.edgeEnd) return false;
      const eps = 0.01;
      return (
        Math.abs(d.edgeStart.x - v1.x) < eps &&
        Math.abs(d.edgeStart.y - v1.y) < eps &&
        Math.abs(d.edgeEnd.x - v2.x) < eps &&
        Math.abs(d.edgeEnd.y - v2.y) < eps
      );
    });
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

    // Use polygon shape for non-rectangular rooms or wrongness-skewed rooms
    const usePolygonFloor = shape && shape.vertices.length >= 3 && (
      shape.type !== RoomShape.RECTANGLE ||
      (config.wrongness && config.wrongness.proportionSkew > 0.01)
    );

    if (usePolygonFloor) {
      geometry = this.createPolygonFloor(shape!.vertices);
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
   * Create floor geometry from polygon vertices.
   * Uses higher tessellation for shapes with many vertices (curved/spiral)
   * so that the floor outline matches smooth wall rendering.
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

    // Higher curveSegments for shapes with many vertices (curved/spiral rooms)
    const curveSegments = vertices.length > 20 ? 4 : 2;
    const geometry = new THREE.ShapeGeometry(shape, curveSegments);

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

    // Use polygon shape for non-rectangular rooms or wrongness-skewed rooms
    const usePolygonCeiling = shape && shape.vertices.length >= 3 && (
      shape.type !== RoomShape.RECTANGLE ||
      (config.wrongness && config.wrongness.proportionSkew > 0.01)
    );

    if (usePolygonCeiling) {
      geometry = this.createPolygonFloor(shape!.vertices);
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

    // Apply archetype-specific color tinting to ceiling material
    this.applyArchetypeAtmosphere(material, config.archetype);

    // Apply ceiling height variance from wrongness system
    // Displaces ceiling vertices to create uneven, unsettling ceiling geometry
    const ceilingVariance = config.wrongness?.ceilingVariance ?? 0;
    if (ceilingVariance > 0.01) {
      // For polygon ceilings, re-create with more subdivision for displacement
      if (!usePolygonCeiling) {
        geometry.dispose();
        const subSegs = Math.max(4, complexity * 2);
        geometry = new THREE.PlaneGeometry(width, depth, subSegs, subSegs);
        this.applyUVMapping(geometry, width, depth);
      }

      const posAttr = geometry.getAttribute('position');
      if (posAttr) {
        const ceilingRng = new SeededRandom(seed + 6000);
        const maxDisplace = height * ceilingVariance;
        for (let i = 0; i < posAttr.count; i++) {
          // PlaneGeometry lies in XY, Z is normal. After rotation x=PI/2, local Z becomes world Y.
          // Displace in Z (local) which becomes Y (world) — pushing ceiling sections down
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          // Use smooth noise-like displacement based on position
          const noiseVal = Math.sin(x * 0.5 + ceilingRng.next() * 3) *
                          Math.cos(y * 0.5 + ceilingRng.next() * 3);
          const displacement = noiseVal * maxDisplace;
          posAttr.setZ(i, displacement);
        }
        posAttr.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    }

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

    const material = createLiminalMaterial(materialConfig);

    // Apply archetype-specific color tinting to wall material
    this.applyArchetypeAtmosphere(material, config.archetype);

    return material;
  }

  /**
   * Apply archetype-specific atmosphere colors to a shader material.
   * Shifts gradient and primary colors to evoke the archetype's mood.
   */
  private applyArchetypeAtmosphere(material: THREE.ShaderMaterial, archetype?: RoomArchetype): void {
    if (!archetype) return;

    const atmosphere = ARCHETYPE_ATMOSPHERES[archetype];
    if (!atmosphere) return;

    const uniforms = material.uniforms;
    if (uniforms.u_colorGradientStart) {
      uniforms.u_colorGradientStart.value.copy(atmosphere.gradientStart);
    }
    if (uniforms.u_colorGradientEnd) {
      uniforms.u_colorGradientEnd.value.copy(atmosphere.gradientEnd);
    }
    if (uniforms.u_colorPrimary) {
      uniforms.u_colorPrimary.value.copy(atmosphere.primary);
    }
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

    // Apply archetype-specific color tinting to floor material
    this.applyArchetypeAtmosphere(material, config.archetype);

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
