/**
 * CorridorGenerator: Creates evolving corridors
 *
 * Corridors are not tubes—they are spaces.
 * The living corridor breathes, narrows, branches.
 *
 * Corridor Types:
 * - Widening: Pressure → Release (narrow to wide)
 * - Narrowing: Comfort → Claustrophobia (wide to narrow)
 * - Breathing: Width pulses with audio
 * - Branching: Fractal multiplication of paths
 * - Terminated: Hallway that ends in wall
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import { RoomShape } from '../types/room';
import type {
  RoomShapeConfig,
  RoomDimensions,
  Point2D,
  CurveDefinition,
} from '../types/room';

// Corridor evolution types
export const CorridorEvolutionType = {
  CONSTANT: 'constant',
  WIDENING: 'widening',
  NARROWING: 'narrowing',
  BREATHING: 'breathing',
  BRANCHING: 'branching',
  TERMINATED: 'terminated',
  SERPENTINE: 'serpentine',
} as const;
export type CorridorEvolutionType = (typeof CorridorEvolutionType)[keyof typeof CorridorEvolutionType];

// Corridor segment
export interface CorridorSegment {
  startWidth: number;
  endWidth: number;
  length: number;
  heightStart: number;
  heightEnd: number;
  curveAngle: number;  // Horizontal curve in radians
  tiltAngle: number;   // Vertical tilt (ramp)
}

// Corridor branch
export interface CorridorBranch {
  position: number;      // 0-1 along parent corridor
  angle: number;         // Angle from parent direction
  segments: CorridorSegment[];
  terminates: boolean;   // Does this branch end in a wall?
  branches: CorridorBranch[];
}

// Evolving corridor configuration
export interface EvolvingCorridor {
  evolutionType: CorridorEvolutionType;
  segments: CorridorSegment[];
  branches: CorridorBranch[];
  breatheAmplitude: number;   // For breathing type
  breatheFrequency: number;   // For breathing type
}

export class CorridorGenerator {
  /**
   * Generate an evolving corridor
   */
  generate(
    dimensions: RoomDimensions,
    depth: number,
    abnormality: number,
    seed: number
  ): EvolvingCorridor {
    const rng = new SeededRandom(seed);

    // Select evolution type based on abnormality
    const evolutionType = this.selectEvolutionType(abnormality, rng);

    // Generate segments
    const segments = this.generateSegments(
      dimensions,
      evolutionType,
      abnormality,
      rng
    );

    // Generate branches for branching type
    const branches =
      evolutionType === CorridorEvolutionType.BRANCHING
        ? this.generateBranches(dimensions, depth, abnormality, rng)
        : [];

    // Breathing parameters
    const breatheAmplitude = evolutionType === CorridorEvolutionType.BREATHING
      ? rng.range(0.2, 0.5)
      : 0;
    const breatheFrequency = evolutionType === CorridorEvolutionType.BREATHING
      ? rng.range(0.5, 2.0)
      : 0;

    return {
      evolutionType,
      segments,
      branches,
      breatheAmplitude,
      breatheFrequency,
    };
  }

  /**
   * Select evolution type based on abnormality
   */
  private selectEvolutionType(
    abnormality: number,
    rng: SeededRandom
  ): CorridorEvolutionType {
    const weights: [CorridorEvolutionType, number][] = [
      [CorridorEvolutionType.CONSTANT, Math.max(0.1, 0.4 - abnormality * 0.3)],
      [CorridorEvolutionType.WIDENING, 0.15 + abnormality * 0.1],
      [CorridorEvolutionType.NARROWING, 0.15 + abnormality * 0.15],
      [CorridorEvolutionType.BREATHING, abnormality * 0.2],
      [CorridorEvolutionType.BRANCHING, abnormality * 0.15],
      [CorridorEvolutionType.TERMINATED, abnormality * 0.1],
      [CorridorEvolutionType.SERPENTINE, abnormality * 0.1],
    ];

    const total = weights.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng.next() * total;

    for (const [type, weight] of weights) {
      roll -= weight;
      if (roll <= 0) return type;
    }

    return CorridorEvolutionType.CONSTANT;
  }

  /**
   * Generate corridor segments
   */
  private generateSegments(
    dimensions: RoomDimensions,
    evolutionType: CorridorEvolutionType,
    abnormality: number,
    rng: SeededRandom
  ): CorridorSegment[] {
    const numSegments = rng.int(3, 6 + Math.floor(abnormality * 4));
    const totalLength = dimensions.depth;
    const segments: CorridorSegment[] = [];

    let currentWidth = dimensions.width;
    let currentHeight = dimensions.height;
    let remainingLength = totalLength;

    for (let i = 0; i < numSegments; i++) {
      const isLast = i === numSegments - 1;
      const segmentLength = isLast
        ? remainingLength
        : remainingLength * rng.range(0.15, 0.35);
      remainingLength -= segmentLength;

      let endWidth = currentWidth;
      let endHeight = currentHeight;
      let curveAngle = 0;
      let tiltAngle = 0;

      switch (evolutionType) {
        case CorridorEvolutionType.WIDENING:
          // Progressively wider
          endWidth = currentWidth * rng.range(1.1, 1.4);
          break;

        case CorridorEvolutionType.NARROWING:
          // Progressively narrower (minimum 0.8m for passage)
          endWidth = Math.max(0.8, currentWidth * rng.range(0.7, 0.9));
          break;

        case CorridorEvolutionType.BREATHING:
          // Width oscillates
          const phase = (i / numSegments) * Math.PI * 2;
          endWidth = dimensions.width * (1 + Math.sin(phase) * 0.3);
          break;

        case CorridorEvolutionType.SERPENTINE:
          // Curves back and forth
          curveAngle = (i % 2 === 0 ? 1 : -1) * rng.range(0.1, 0.3) * (1 + abnormality);
          break;

        case CorridorEvolutionType.TERMINATED:
          // Last segment narrows to nothing
          if (isLast) {
            endWidth = 0; // Wall
          }
          break;
      }

      // Height changes (ceiling lowering/raising)
      if (abnormality > 0.3 && rng.chance(0.3)) {
        endHeight = currentHeight * rng.range(0.8, 1.2);
        // Minimum ceiling height
        endHeight = Math.max(2.0, Math.min(5.0, endHeight));
      }

      // Slight tilt (ramps)
      if (abnormality > 0.4 && rng.chance(0.2)) {
        tiltAngle = rng.range(-0.05, 0.05); // ~3 degree max
      }

      segments.push({
        startWidth: currentWidth,
        endWidth,
        length: segmentLength,
        heightStart: currentHeight,
        heightEnd: endHeight,
        curveAngle,
        tiltAngle,
      });

      currentWidth = endWidth;
      currentHeight = endHeight;
    }

    return segments;
  }

  /**
   * Generate branches for branching corridors
   */
  private generateBranches(
    dimensions: RoomDimensions,
    depth: number,
    abnormality: number,
    rng: SeededRandom,
    recursionDepth: number = 0
  ): CorridorBranch[] {
    if (recursionDepth >= 3) return []; // Max 3 levels of branching

    const numBranches = rng.int(1, 2 + Math.floor(abnormality));
    const branches: CorridorBranch[] = [];

    for (let i = 0; i < numBranches; i++) {
      const position = rng.range(0.2, 0.8); // Where along the corridor
      const angle = rng.pick([-1, 1]) * rng.range(Math.PI / 4, Math.PI / 2);

      // Branches are smaller
      const branchDimensions: RoomDimensions = {
        width: dimensions.width * rng.range(0.6, 0.9),
        height: dimensions.height * rng.range(0.8, 1.0),
        depth: dimensions.depth * rng.range(0.3, 0.6),
      };

      const segments = this.generateSegments(
        branchDimensions,
        rng.chance(0.5)
          ? CorridorEvolutionType.NARROWING
          : CorridorEvolutionType.CONSTANT,
        abnormality,
        rng
      );

      const terminates = rng.chance(0.3 + abnormality * 0.3);

      // Recursive branching
      const subBranches = rng.chance(0.3 + abnormality * 0.2)
        ? this.generateBranches(
            branchDimensions,
            depth,
            abnormality,
            rng,
            recursionDepth + 1
          )
        : [];

      branches.push({
        position,
        angle,
        segments,
        terminates,
        branches: subBranches,
      });
    }

    return branches;
  }

  /**
   * Convert evolving corridor to room shape config
   */
  toRoomShape(corridor: EvolvingCorridor, dimensions: RoomDimensions): RoomShapeConfig {
    const vertices: Point2D[] = [];
    const wallCurves: CurveDefinition[] = [];

    // Build left and right wall points along segments
    let currentX = 0;
    let currentAngle = 0;
    const leftPoints: Point2D[] = [];
    const rightPoints: Point2D[] = [];

    for (const segment of corridor.segments) {
      const startHalfWidth = segment.startWidth / 2;
      const endHalfWidth = segment.endWidth / 2;

      // Start points
      const startLeft: Point2D = {
        x: currentX - startHalfWidth * Math.cos(currentAngle + Math.PI / 2),
        y: -dimensions.depth / 2 + currentX + startHalfWidth * Math.sin(currentAngle + Math.PI / 2),
      };
      const startRight: Point2D = {
        x: currentX + startHalfWidth * Math.cos(currentAngle + Math.PI / 2),
        y: -dimensions.depth / 2 + currentX - startHalfWidth * Math.sin(currentAngle + Math.PI / 2),
      };

      leftPoints.push(startLeft);
      rightPoints.push(startRight);

      // Apply curve
      currentAngle += segment.curveAngle;
      currentX += segment.length;

      // End points
      const endLeft: Point2D = {
        x: currentX - endHalfWidth * Math.cos(currentAngle + Math.PI / 2),
        y: -dimensions.depth / 2 + currentX + endHalfWidth * Math.sin(currentAngle + Math.PI / 2),
      };
      const endRight: Point2D = {
        x: currentX + endHalfWidth * Math.cos(currentAngle + Math.PI / 2),
        y: -dimensions.depth / 2 + currentX - endHalfWidth * Math.sin(currentAngle + Math.PI / 2),
      };

      leftPoints.push(endLeft);
      rightPoints.push(endRight);
    }

    // Build polygon: left side forward, then right side backward
    vertices.push(...leftPoints);
    vertices.push(...rightPoints.reverse());

    // Mark curved sections if serpentine
    if (corridor.evolutionType === CorridorEvolutionType.SERPENTINE) {
      for (let i = 0; i < leftPoints.length - 1; i++) {
        wallCurves.push({
          startIndex: i,
          endIndex: i + 1,
          controlPoints: [],
          segments: 4,
        });
      }
    }

    return {
      type: RoomShape.IRREGULAR,
      vertices,
      heightVariations: [],
      wallCurves,
      boundingBox: dimensions,
    };
  }

  /**
   * Create geometry for corridor segments
   */
  createGeometry(
    corridor: EvolvingCorridor,
    dimensions: RoomDimensions
  ): {
    floorGeometry: THREE.BufferGeometry;
    ceilingGeometry: THREE.BufferGeometry;
    wallGeometries: THREE.BufferGeometry[];
  } {
    // Use room shape to create floor
    const shape = this.toRoomShape(corridor, dimensions);

    // Create floor shape
    const floorShape = new THREE.Shape();
    if (shape.vertices.length > 0) {
      floorShape.moveTo(shape.vertices[0].x, shape.vertices[0].y);
      for (let i = 1; i < shape.vertices.length; i++) {
        floorShape.lineTo(shape.vertices[i].x, shape.vertices[i].y);
      }
      floorShape.closePath();
    }

    const floorGeometry = new THREE.ShapeGeometry(floorShape, 2);
    const ceilingGeometry = floorGeometry.clone();

    // Wall geometries for each segment
    const wallGeometries: THREE.BufferGeometry[] = [];

    // Create walls between vertices
    for (let i = 0; i < shape.vertices.length; i++) {
      const v1 = shape.vertices[i];
      const v2 = shape.vertices[(i + 1) % shape.vertices.length];

      const wallLength = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
      );

      // Average height for this segment
      const segmentIndex = Math.min(
        Math.floor((i / shape.vertices.length) * corridor.segments.length),
        corridor.segments.length - 1
      );
      const segment = corridor.segments[segmentIndex];
      const avgHeight = (segment.heightStart + segment.heightEnd) / 2;

      const wallGeom = new THREE.PlaneGeometry(wallLength, avgHeight, 1, 1);
      wallGeometries.push(wallGeom);
    }

    return {
      floorGeometry,
      ceilingGeometry,
      wallGeometries,
    };
  }

  /**
   * Update breathing corridor width based on audio
   */
  updateBreathing(
    corridor: EvolvingCorridor,
    bassLevel: number,
    time: number
  ): number {
    if (corridor.evolutionType !== CorridorEvolutionType.BREATHING) {
      return 0;
    }

    const breathe =
      Math.sin(time * corridor.breatheFrequency * Math.PI * 2) *
      corridor.breatheAmplitude *
      (1 + bassLevel * 0.5);

    return breathe;
  }
}

// Singleton
let corridorGeneratorInstance: CorridorGenerator | null = null;

export function getCorridorGenerator(): CorridorGenerator {
  if (!corridorGeneratorInstance) {
    corridorGeneratorInstance = new CorridorGenerator();
  }
  return corridorGeneratorInstance;
}
