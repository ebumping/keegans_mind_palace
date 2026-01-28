/**
 * VerticalElementGenerator: Creates vertical complexity within rooms
 *
 * The floor is not flat. The space has depth.
 *
 * Vertical Element Types:
 * - Sunken: Pits within rooms (lower spaces feel like traps)
 * - Raised: Islands of floor above main level (exposed)
 * - Mezzanine: Half-floors overlooking (verticality within horizontal)
 * - Split: Steps interrupting space (what's "the floor" is ambiguous)
 * - Pit: Deep voids (looking down into darkness)
 * - Shaft: Vertical rooms (well that goes up)
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import { VerticalElementType } from '../types/room';
import type {
  VerticalElement,
  RoomShapeConfig,
  RoomDimensions,
  Point2D,
} from '../types/room';

// Vertical element generation parameters
interface VerticalElementParams {
  minSize: number;          // Minimum footprint size as ratio of room
  maxSize: number;          // Maximum footprint size as ratio of room
  minHeight: number;        // Minimum height delta in meters
  maxHeight: number;        // Maximum height delta in meters
  railChance: number;       // Probability of having rails
  accessibleChance: number; // Probability of being accessible
}

const ELEMENT_PARAMS: Record<VerticalElementType, VerticalElementParams> = {
  sunken: {
    minSize: 0.15,
    maxSize: 0.4,
    minHeight: -0.3,
    maxHeight: -1.5,
    railChance: 0.3,
    accessibleChance: 0.9,
  },
  raised: {
    minSize: 0.1,
    maxSize: 0.35,
    minHeight: 0.3,
    maxHeight: 1.2,
    railChance: 0.5,
    accessibleChance: 0.8,
  },
  mezzanine: {
    minSize: 0.2,
    maxSize: 0.5,
    minHeight: 1.5,
    maxHeight: 3.0,
    railChance: 0.9,
    accessibleChance: 0.95,
  },
  split: {
    minSize: 0.3,
    maxSize: 0.6,
    minHeight: 0.15,
    maxHeight: 0.4,
    railChance: 0.1,
    accessibleChance: 1.0,
  },
  pit: {
    minSize: 0.1,
    maxSize: 0.25,
    minHeight: -2.0,
    maxHeight: -5.0,
    railChance: 0.7,
    accessibleChance: 0.2,
  },
  shaft: {
    minSize: 0.15,
    maxSize: 0.35,
    minHeight: 3.0,
    maxHeight: 10.0,
    railChance: 0.8,
    accessibleChance: 0.3,
  },
};

/**
 * Generate a footprint polygon within room bounds
 */
function generateFootprint(
  roomBounds: RoomDimensions,
  sizeFactor: number,
  position: Point2D,
  rng: SeededRandom,
  shapeType: 'rectangle' | 'circle' | 'irregular'
): Point2D[] {
  const halfWidth = (roomBounds.width * sizeFactor) / 2;
  const halfDepth = (roomBounds.depth * sizeFactor) / 2;

  switch (shapeType) {
    case 'circle': {
      const radius = Math.min(halfWidth, halfDepth);
      const segments = 8;
      const points: Point2D[] = [];
      for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 * i) / segments;
        points.push({
          x: position.x + Math.cos(angle) * radius,
          y: position.y + Math.sin(angle) * radius,
        });
      }
      return points;
    }

    case 'irregular': {
      const points: Point2D[] = [];
      const numPoints = rng.int(5, 8);
      for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i) / numPoints + rng.range(-0.2, 0.2);
        const r = rng.range(0.7, 1.0) * Math.min(halfWidth, halfDepth);
        points.push({
          x: position.x + Math.cos(angle) * r,
          y: position.y + Math.sin(angle) * r,
        });
      }
      return points;
    }

    default: // rectangle
      return [
        { x: position.x - halfWidth, y: position.y - halfDepth },
        { x: position.x + halfWidth, y: position.y - halfDepth },
        { x: position.x + halfWidth, y: position.y + halfDepth },
        { x: position.x - halfWidth, y: position.y + halfDepth },
      ];
  }
}

/**
 * Check if a point is inside a polygon (ray casting)
 */
function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if footprint is valid (within room bounds and not overlapping existing elements)
 */
function isFootprintValid(
  footprint: Point2D[],
  roomShape: RoomShapeConfig,
  existingElements: VerticalElement[],
  minDistance: number
): boolean {
  // Check all points are within room bounds
  for (const point of footprint) {
    if (!pointInPolygon(point, roomShape.vertices)) {
      return false;
    }
  }

  // Check no overlap with existing elements (simplified: check centroids)
  const centroid = footprint.reduce(
    (acc, p) => ({ x: acc.x + p.x / footprint.length, y: acc.y + p.y / footprint.length }),
    { x: 0, y: 0 }
  );

  for (const existing of existingElements) {
    const existingCentroid = existing.footprint.reduce(
      (acc, p) => ({
        x: acc.x + p.x / existing.footprint.length,
        y: acc.y + p.y / existing.footprint.length,
      }),
      { x: 0, y: 0 }
    );

    const dist = Math.sqrt(
      Math.pow(centroid.x - existingCentroid.x, 2) +
        Math.pow(centroid.y - existingCentroid.y, 2)
    );

    if (dist < minDistance) {
      return false;
    }
  }

  return true;
}

export class VerticalElementGenerator {
  /**
   * Generate vertical elements for a room
   */
  generate(
    roomShape: RoomShapeConfig,
    roomDimensions: RoomDimensions,
    depth: number,
    abnormality: number,
    seed: number
  ): VerticalElement[] {
    const rng = new SeededRandom(seed);
    const elements: VerticalElement[] = [];

    // Probability of having vertical elements increases with depth and abnormality
    const baseChance = 0.2 + abnormality * 0.4 + Math.min(depth / 30, 0.3);

    if (!rng.chance(baseChance)) {
      return elements;
    }

    // Number of elements (1-3 based on room size and abnormality)
    const roomArea = roomDimensions.width * roomDimensions.depth;
    const maxElements = Math.min(3, Math.floor(roomArea / 30) + 1);
    const numElements = rng.int(1, maxElements);

    // Select element types based on abnormality
    const typeWeights = this.getTypeWeights(abnormality);

    for (let i = 0; i < numElements; i++) {
      const element = this.generateElement(
        roomShape,
        roomDimensions,
        elements,
        typeWeights,
        abnormality,
        rng
      );

      if (element) {
        elements.push(element);
      }
    }

    return elements;
  }

  /**
   * Get type weights based on abnormality
   */
  private getTypeWeights(abnormality: number): Map<VerticalElementType, number> {
    const weights = new Map<VerticalElementType, number>();

    // More common at low abnormality
    weights.set(VerticalElementType.SPLIT, 0.3 - abnormality * 0.1);
    weights.set(VerticalElementType.RAISED, 0.25);
    weights.set(VerticalElementType.SUNKEN, 0.2 + abnormality * 0.1);

    // More common at high abnormality
    weights.set(VerticalElementType.MEZZANINE, 0.1 + abnormality * 0.15);
    weights.set(VerticalElementType.PIT, abnormality * 0.2);
    weights.set(VerticalElementType.SHAFT, abnormality * 0.15);

    return weights;
  }

  /**
   * Generate a single vertical element
   */
  private generateElement(
    roomShape: RoomShapeConfig,
    roomDimensions: RoomDimensions,
    existingElements: VerticalElement[],
    typeWeights: Map<VerticalElementType, number>,
    abnormality: number,
    rng: SeededRandom
  ): VerticalElement | null {
    // Select type
    const types = Array.from(typeWeights.entries());
    const totalWeight = types.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng.next() * totalWeight;

    let type: VerticalElementType = VerticalElementType.SPLIT;
    for (const [t, w] of types) {
      roll -= w;
      if (roll <= 0) {
        type = t;
        break;
      }
    }

    const params = ELEMENT_PARAMS[type];

    // Generate position (within safe zone of room)
    const safeMargin = 0.2;
    const position: Point2D = {
      x: rng.range(
        -roomDimensions.width * (0.5 - safeMargin),
        roomDimensions.width * (0.5 - safeMargin)
      ),
      y: rng.range(
        -roomDimensions.depth * (0.5 - safeMargin),
        roomDimensions.depth * (0.5 - safeMargin)
      ),
    };

    // Generate size
    const sizeFactor = rng.range(params.minSize, params.maxSize);

    // Generate footprint shape
    const shapeTypes: ('rectangle' | 'circle' | 'irregular')[] = ['rectangle', 'circle', 'irregular'];
    const shapeType = rng.pick(shapeTypes);

    const footprint = generateFootprint(roomDimensions, sizeFactor, position, rng, shapeType);

    // Validate footprint
    if (!isFootprintValid(footprint, roomShape, existingElements, 2.0)) {
      return null;
    }

    // Generate height
    let heightDelta = rng.range(params.minHeight, params.maxHeight);

    // Scale height with abnormality for dramatic elements
    if (type === VerticalElementType.PIT || type === VerticalElementType.SHAFT) {
      heightDelta *= 1 + abnormality * 0.5;
    }

    // Determine accessibility
    const hasRail = rng.chance(params.railChance);
    const accessible = rng.chance(params.accessibleChance);

    // Determine connection type
    let connectsVia: VerticalElement['connectsVia'];
    if (!accessible) {
      connectsVia = 'none';
    } else if (Math.abs(heightDelta) <= 0.4) {
      connectsVia = 'step';
    } else if (Math.abs(heightDelta) <= 1.2) {
      connectsVia = rng.pick(['step', 'ramp']);
    } else if (Math.abs(heightDelta) <= 3.0) {
      connectsVia = 'stairs';
    } else {
      connectsVia = rng.chance(0.3) ? 'stairs' : 'jump';
    }

    return {
      type,
      footprint,
      heightDelta,
      hasRail,
      accessible,
      connectsVia,
    };
  }

  /**
   * Create Three.js geometry for a vertical element
   */
  createGeometry(
    element: VerticalElement,
    baseHeight: number
  ): {
    floorGeometry: THREE.BufferGeometry;
    wallGeometries: THREE.BufferGeometry[];
    railGeometry: THREE.BufferGeometry | null;
  } {
    const vertices = element.footprint;

    // Create floor geometry using ShapeGeometry
    const shape = new THREE.Shape();
    shape.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i].x, vertices[i].y);
    }
    shape.closePath();

    const floorGeometry = new THREE.ShapeGeometry(shape, 1);

    // Create wall geometries (for sunken/raised areas)
    const wallGeometries: THREE.BufferGeometry[] = [];
    const wallHeight = Math.abs(element.heightDelta);

    if (wallHeight > 0.1) {
      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        const wallWidth = Math.sqrt(
          Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
        );

        const wallGeom = new THREE.PlaneGeometry(wallWidth, wallHeight, 1, 1);
        wallGeometries.push(wallGeom);
      }
    }

    // Create rail geometry if needed
    let railGeometry: THREE.BufferGeometry | null = null;
    if (element.hasRail && wallHeight > 0.3) {
      // Simple tube for rail
      const railPoints = vertices.map(v => new THREE.Vector3(v.x, baseHeight + element.heightDelta + 0.9, v.y));
      railPoints.push(railPoints[0].clone()); // Close the loop

      const railPath = new THREE.CatmullRomCurve3(railPoints, true);
      railGeometry = new THREE.TubeGeometry(railPath, vertices.length * 4, 0.03, 8, true);
    }

    return {
      floorGeometry,
      wallGeometries,
      railGeometry,
    };
  }
}

// Singleton
let verticalElementGeneratorInstance: VerticalElementGenerator | null = null;

export function getVerticalElementGenerator(): VerticalElementGenerator {
  if (!verticalElementGeneratorInstance) {
    verticalElementGeneratorInstance = new VerticalElementGenerator();
  }
  return verticalElementGeneratorInstance;
}
