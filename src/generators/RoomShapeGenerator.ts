/**
 * RoomShapeGenerator: Generates non-rectangular room shapes
 *
 * The palace is not a series of boxes connected by tubes.
 * It is an organism—a space that grew without architect.
 *
 * Shape Types:
 * - Rectangle: The language of control (baseline)
 * - L-Shape: Can't see all at once (something behind the corner)
 * - H-Shape: Two spaces connected by vulnerable traverse
 * - Triangle: No back wall (impossible to feel oriented)
 * - Hexagon: Which door did you enter? Which will you leave?
 * - Spiral: Walking forward leads to center (no exit)
 * - Irregular: Procedural polygon (walls at wrong angles)
 * - Curved: No corners means no orientation
 */

import { SeededRandom } from '../utils/seededRandom';
import { RoomShape } from '../types/room';
import type {
  RoomShapeConfig,
  Point2D,
  HeightPoint,
  CurveDefinition,
  RoomDimensions,
} from '../types/room';

// Shape selection weights based on depth
interface ShapeWeights {
  rectangle: number;
  l_shape: number;
  h_shape: number;
  triangle: number;
  hexagon: number;
  spiral: number;
  irregular: number;
  curved: number;
}

/**
 * Get shape weights based on depth - more complex shapes appear deeper
 */
export function getShapeWeights(depth: number): ShapeWeights {
  const factor = Math.min(depth / 20, 1); // Max complexity at depth 20

  return {
    rectangle: Math.max(0.1, 0.7 - factor * 0.6),  // 70% -> 10%
    l_shape: 0.15 + factor * 0.1,                   // 15% -> 25%
    h_shape: 0.05 + factor * 0.1,                   // 5% -> 15%
    triangle: factor * 0.15,                         // 0% -> 15%
    hexagon: factor * 0.1,                           // 0% -> 10%
    spiral: factor * 0.15,                           // 0% -> 15%
    irregular: factor * 0.3,                         // 0% -> 30%
    curved: factor * 0.1,                            // 0% -> 10%
  };
}

/**
 * Select a room shape based on weighted probabilities
 */
export function selectShape(rng: SeededRandom, weights: ShapeWeights): RoomShape {
  const entries = Object.entries(weights) as [RoomShape, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const roll = rng.next() * total;

  let cumulative = 0;
  for (const [shape, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) {
      return shape;
    }
  }

  return RoomShape.RECTANGLE;
}

/**
 * Main shape generator class
 */
export class RoomShapeGenerator {

  /**
   * Generate a room shape configuration
   */
  generate(
    shapeType: RoomShape,
    baseDimensions: RoomDimensions,
    abnormality: number,
    seed: number
  ): RoomShapeConfig {
    const rng = new SeededRandom(seed);

    switch (shapeType) {
      case RoomShape.L_SHAPE:
        return this.generateLShape(baseDimensions, abnormality, rng);
      case RoomShape.H_SHAPE:
        return this.generateHShape(baseDimensions, abnormality, rng);
      case RoomShape.TRIANGLE:
        return this.generateTriangle(baseDimensions, abnormality, rng);
      case RoomShape.HEXAGON:
        return this.generateHexagon(baseDimensions, abnormality, rng);
      case RoomShape.SPIRAL:
        return this.generateSpiral(baseDimensions, abnormality, rng);
      case RoomShape.IRREGULAR:
        return this.generateIrregular(baseDimensions, abnormality, rng);
      case RoomShape.CURVED:
        return this.generateCurved(baseDimensions, abnormality, rng);
      default:
        return this.generateRectangle(baseDimensions, abnormality, rng);
    }
  }

  /**
   * Generate a simple rectangle (baseline)
   */
  private generateRectangle(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const hw = dims.width / 2;
    const hd = dims.depth / 2;

    // Apply slight skew based on abnormality
    const skew = abnormality * 0.1 * rng.range(-1, 1);

    const vertices: Point2D[] = [
      { x: -hw + skew, y: -hd },
      { x: hw + skew, y: -hd },
      { x: hw - skew, y: hd },
      { x: -hw - skew, y: hd },
    ];

    return {
      type: RoomShape.RECTANGLE,
      vertices,
      heightVariations: [],
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate an L-shaped room
   * You can never see all of it at once.
   * Something is always behind the corner.
   */
  private generateLShape(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const hw = dims.width / 2;
    const hd = dims.depth / 2;

    // L-shape cutout size (between 30-60% of room)
    const cutoutRatio = rng.range(0.3, 0.6);
    const cutX = hw * cutoutRatio * (rng.next() > 0.5 ? 1 : -1);
    const cutY = hd * cutoutRatio * (rng.next() > 0.5 ? 1 : -1);

    // Determine which corner to cut
    const corner = rng.int(0, 3);
    let vertices: Point2D[];

    switch (corner) {
      case 0: // Cut top-right
        vertices = [
          { x: -hw, y: -hd },
          { x: hw, y: -hd },
          { x: hw, y: cutY },
          { x: cutX, y: cutY },
          { x: cutX, y: hd },
          { x: -hw, y: hd },
        ];
        break;
      case 1: // Cut bottom-right
        vertices = [
          { x: -hw, y: -hd },
          { x: cutX, y: -hd },
          { x: cutX, y: -cutY },
          { x: hw, y: -cutY },
          { x: hw, y: hd },
          { x: -hw, y: hd },
        ];
        break;
      case 2: // Cut bottom-left
        vertices = [
          { x: -hw, y: -hd },
          { x: hw, y: -hd },
          { x: hw, y: hd },
          { x: -cutX, y: hd },
          { x: -cutX, y: -cutY },
          { x: -hw, y: -cutY },
        ];
        break;
      default: // Cut top-left
        vertices = [
          { x: -cutX, y: -hd },
          { x: hw, y: -hd },
          { x: hw, y: hd },
          { x: -hw, y: hd },
          { x: -hw, y: cutY },
          { x: -cutX, y: cutY },
        ];
    }

    // Add height variation in the alcove
    const heightVariations: HeightPoint[] = [];
    if (abnormality > 0.3 && rng.chance(0.5)) {
      heightVariations.push({
        position: { x: cutX * 0.5, y: cutY * 0.5 },
        height: rng.range(-0.3, 0.3),
        radius: Math.min(Math.abs(cutX), Math.abs(cutY)) * 0.8,
      });
    }

    return {
      type: RoomShape.L_SHAPE,
      vertices,
      heightVariations,
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate an H-shaped room
   * Two large spaces connected by narrow passage.
   * Must traverse vulnerability to move between securities.
   */
  private generateHShape(
    dims: RoomDimensions,
    _abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const hw = dims.width / 2;
    const hd = dims.depth / 2;

    // Corridor width (center passage)
    const corridorRatio = rng.range(0.25, 0.4);
    const cw = hw * corridorRatio;

    // Wing depth
    const wingRatio = rng.range(0.25, 0.4);
    const wd = hd * wingRatio;

    // H-shape (horizontal orientation)
    const vertices: Point2D[] = [
      // Top-left wing
      { x: -hw, y: -hd },
      { x: -cw, y: -hd },
      // Top corridor edge
      { x: -cw, y: -wd },
      { x: cw, y: -wd },
      // Top-right wing
      { x: cw, y: -hd },
      { x: hw, y: -hd },
      // Right side down
      { x: hw, y: hd },
      { x: cw, y: hd },
      // Bottom corridor edge
      { x: cw, y: wd },
      { x: -cw, y: wd },
      // Bottom-left wing
      { x: -cw, y: hd },
      { x: -hw, y: hd },
    ];

    return {
      type: RoomShape.H_SHAPE,
      vertices,
      heightVariations: [],
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate a triangular room
   * Three walls, three corners, three doors.
   * No wall is "the back wall".
   * Impossible to feel oriented.
   */
  private generateTriangle(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const hw = dims.width / 2;
    const hd = dims.depth / 2;

    // Add variance to make it less perfect
    const variance = abnormality * 0.3;

    const vertices: Point2D[] = [
      { x: rng.range(-variance, variance), y: -hd * rng.range(0.8, 1.2) },
      { x: hw * rng.range(0.8, 1.2), y: hd * rng.range(0.4, 0.8) },
      { x: -hw * rng.range(0.8, 1.2), y: hd * rng.range(0.4, 0.8) },
    ];

    return {
      type: RoomShape.TRIANGLE,
      vertices,
      heightVariations: [],
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate a hexagonal room
   * Six equal walls, each with a door.
   * Which door did you enter?
   * Which door will you leave?
   */
  private generateHexagon(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const radius = Math.min(dims.width, dims.depth) / 2;
    const vertices: Point2D[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6; // Start flat side at bottom
      const r = radius * rng.range(0.9, 1.1 + abnormality * 0.2);
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }

    return {
      type: RoomShape.HEXAGON,
      vertices,
      heightVariations: [],
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate a spiral room
   * Walls that curve inward.
   * Walking forward leads to center.
   * Center has no exit (or has the only exit).
   */
  private generateSpiral(
    dims: RoomDimensions,
    _abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const outerRadius = Math.min(dims.width, dims.depth) / 2;
    const innerRadius = outerRadius * rng.range(0.2, 0.4);
    const turns = rng.range(0.75, 1.5);
    const segments = 24;

    const vertices: Point2D[] = [];
    const wallCurves: CurveDefinition[] = [];

    // Outer spiral
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns;
      const r = outerRadius * (1 - t * 0.3); // Spiral inward slightly
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }

    // Connect to inner spiral (going back)
    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns;
      const r = innerRadius + (outerRadius - innerRadius) * 0.3 * (1 - t);
      vertices.push({
        x: Math.cos(angle) * r * 0.5,
        y: Math.sin(angle) * r * 0.5,
      });
    }

    // Mark all wall segments as curves
    for (let i = 0; i < segments; i++) {
      wallCurves.push({
        startIndex: i,
        endIndex: i + 1,
        controlPoints: [],
        segments: 4,
      });
    }

    return {
      type: RoomShape.SPIRAL,
      vertices,
      heightVariations: [],
      wallCurves,
      boundingBox: dims,
    };
  }

  /**
   * Generate an irregular polygon room
   * Walls at wrong angles.
   * Corners that aren't 90°.
   * Some corners acute (trapping), some obtuse (exposing).
   */
  private generateIrregular(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const radius = Math.min(dims.width, dims.depth) / 2;
    const numVertices = rng.int(5, 8 + Math.floor(abnormality * 4));
    const vertices: Point2D[] = [];

    // Generate vertices at random angles with varying radii
    const angles: number[] = [];
    for (let i = 0; i < numVertices; i++) {
      angles.push(rng.range(0, Math.PI * 2));
    }
    angles.sort((a, b) => a - b);

    for (const angle of angles) {
      const r = radius * rng.range(0.6, 1.2 + abnormality * 0.3);
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }

    // Add height variations for more complexity
    const heightVariations: HeightPoint[] = [];
    if (abnormality > 0.4) {
      const numVariations = rng.int(1, 3);
      for (let i = 0; i < numVariations; i++) {
        heightVariations.push({
          position: {
            x: rng.range(-radius * 0.5, radius * 0.5),
            y: rng.range(-radius * 0.5, radius * 0.5),
          },
          height: rng.range(-0.5, 0.5) * abnormality,
          radius: rng.range(1, 3),
        });
      }
    }

    return {
      type: RoomShape.IRREGULAR,
      vertices,
      heightVariations,
      wallCurves: [],
      boundingBox: dims,
    };
  }

  /**
   * Generate a room with curved walls
   * No corners means no orientation.
   * Endless wall, nowhere to put your back.
   * Sound behaves wrong.
   */
  private generateCurved(
    dims: RoomDimensions,
    abnormality: number,
    rng: SeededRandom
  ): RoomShapeConfig {
    const hw = dims.width / 2;
    const hd = dims.depth / 2;

    // Start with a rectangle but add curves
    const segments = 16;
    const vertices: Point2D[] = [];
    const wallCurves: CurveDefinition[] = [];

    // Generate elliptical/blob shape
    for (let i = 0; i < segments; i++) {
      const angle = (Math.PI * 2 * i) / segments;
      const radiusX = hw * (1 + rng.range(-0.2, 0.2) * abnormality);
      const radiusY = hd * (1 + rng.range(-0.2, 0.2) * abnormality);

      // Add wobble
      const wobble = abnormality * 0.3 * Math.sin(angle * rng.range(2, 5));

      vertices.push({
        x: Math.cos(angle) * radiusX * (1 + wobble),
        y: Math.sin(angle) * radiusY * (1 + wobble),
      });
    }

    // Mark all segments as curves
    for (let i = 0; i < segments; i++) {
      wallCurves.push({
        startIndex: i,
        endIndex: (i + 1) % segments,
        controlPoints: [],
        segments: 4,
      });
    }

    return {
      type: RoomShape.CURVED,
      vertices,
      heightVariations: [],
      wallCurves,
      boundingBox: dims,
    };
  }
}

// Singleton instance
let shapeGeneratorInstance: RoomShapeGenerator | null = null;

export function getRoomShapeGenerator(): RoomShapeGenerator {
  if (!shapeGeneratorInstance) {
    shapeGeneratorInstance = new RoomShapeGenerator();
  }
  return shapeGeneratorInstance;
}
