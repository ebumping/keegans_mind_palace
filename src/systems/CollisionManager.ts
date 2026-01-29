/**
 * CollisionManager: Comprehensive collision detection system for Keegan's Mind Palace
 *
 * Handles:
 * - Capsule-based player collision (replaces AABB)
 * - Static geometry (walls, floors, ceilings)
 * - Dynamic geometry (breathing walls)
 * - Furniture and art object collision
 * - Portal frame collision with trigger volumes
 * - Step climbing for stairs and small obstacles
 * - Slide collision response
 *
 * Per surreal-game-design skill: "Every boundary must be visible"
 */

import * as THREE from 'three';
import type { RoomConfig, DoorwayPlacement, Wall, RoomDimensions, Point2D } from '../types/room';

// ============================================================================
// Types
// ============================================================================

export interface CapsuleCollider {
  radius: number;
  height: number;
  offset: THREE.Vector3;
}

export interface CollisionResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  penetration: number;
  object: THREE.Object3D | null;
}

export interface FullCollisionResult {
  collided: boolean;
  normal: THREE.Vector3;
  penetration: number;
  inDoorway: boolean;
  doorway: DoorwayPlacement | null;
  groundInfo: GroundInfo;
  pushVector: THREE.Vector3;
}

export interface GroundInfo {
  isGrounded: boolean;
  normal: THREE.Vector3;
  angle: number;
  distance: number;
  canStand: boolean;
}

export interface Collider {
  id: string;
  type: 'static' | 'dynamic' | 'furniture' | 'art' | 'trigger';
  bounds: THREE.Box3;
  mesh?: THREE.Object3D;
  enabled: boolean;
  userData?: Record<string, unknown>;
}

export interface BreathingWallState {
  basePosition: THREE.Vector3;
  currentOffset: number;
  breatheDirection: THREE.Vector3;
  bounds: THREE.Box3;
}

export interface PortalCollider {
  doorway: DoorwayPlacement;
  frameBounds: THREE.Box3;
  triggerBounds: THREE.Box3;
  wall: Wall;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_CAPSULE: CapsuleCollider = {
  radius: 0.3,
  height: 1.8,
  offset: new THREE.Vector3(0, 0.9, 0)
};

export const MAX_STEP_HEIGHT = 0.4;
export const MAX_SLOPE_ANGLE = Math.PI / 4; // 45 degrees
export const SLIDE_FRICTION = 0.99;
export const MAX_SLIDE_ITERATIONS = 3;

// ============================================================================
// Polygon Utilities
// ============================================================================

/**
 * Ray-casting point-in-polygon test.
 * Works for any simple (non-self-intersecting) polygon.
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
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
 * Compute the centroid of a polygon.
 */
export function polygonCentroid(polygon: Point2D[]): Point2D {
  let cx = 0, cy = 0;
  for (const v of polygon) {
    cx += v.x;
    cy += v.y;
  }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

/**
 * Compute closest point on a line segment to a given point.
 * Returns the closest point and the distance.
 */
function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { x: number; y: number; dist: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  }

  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const distX = px - cx;
  const distY = py - cy;

  return { x: cx, y: cy, dist: Math.sqrt(distX * distX + distY * distY) };
}

/**
 * Compute signed distance from a point to the polygon boundary.
 * Positive = inside, negative = outside.
 */
export function signedDistanceToPolygon(point: Point2D, polygon: Point2D[]): number {
  let minDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const result = closestPointOnSegment(
      point.x, point.y,
      polygon[j].x, polygon[j].y,
      polygon[i].x, polygon[i].y
    );
    if (result.dist < minDist) {
      minDist = result.dist;
    }
  }
  return pointInPolygon(point, polygon) ? minDist : -minDist;
}

// ============================================================================
// CollisionManager
// ============================================================================

export class CollisionManager {
  // Collision layers
  private staticColliders: Collider[] = [];
  private dynamicColliders: Map<string, BreathingWallState> = new Map();
  private furnitureColliders: Collider[] = [];
  private artColliders: Collider[] = [];
  private portalColliders: PortalCollider[] = [];

  // Current room reference
  private currentRoomConfig: RoomConfig | null = null;
  private roomBounds: THREE.Box3 = new THREE.Box3();

  // Polygon room data (null for rectangular rooms)
  private roomPolygon: Point2D[] | null = null;
  private roomPolygonCentroid: Point2D = { x: 0, y: 0 };

  // Collision objects from scene
  private sceneColliders: THREE.Object3D[] = [];

  // Raycaster for sphere/capsule casts
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  constructor() {
    // Initialize raycaster with layer mask if needed
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  setRoom(config: RoomConfig): void {
    this.clear();
    this.currentRoomConfig = config;

    // Calculate room bounds (AABB fallback)
    const { width, height, depth } = config.dimensions;
    this.roomBounds.set(
      new THREE.Vector3(-width / 2, 0, -depth / 2),
      new THREE.Vector3(width / 2, height, depth / 2)
    );

    // Store polygon data for non-rectangular rooms
    if (config.shape && config.shape.vertices && config.shape.vertices.length >= 3) {
      this.roomPolygon = config.shape.vertices;
      this.roomPolygonCentroid = polygonCentroid(config.shape.vertices);
    } else {
      // Synthesize a rectangle polygon for uniform handling
      const hw = width / 2;
      const hd = depth / 2;
      this.roomPolygon = [
        { x: -hw, y: -hd },
        { x: hw, y: -hd },
        { x: hw, y: hd },
        { x: -hw, y: hd },
      ];
      this.roomPolygonCentroid = { x: 0, y: 0 };
    }

    // Create wall colliders
    this.createWallColliders(config);

    // Create portal colliders for doorways
    this.createPortalColliders(config);
  }

  private createWallColliders(config: RoomConfig): void {
    const { width, height, depth } = config.dimensions;
    const wallThickness = 0.3;

    // Create wall colliders from polygon edges (works for both rectangular and non-rectangular)
    if (this.roomPolygon && this.roomPolygon.length >= 3) {
      const vertices = this.roomPolygon;
      const centroid = this.roomPolygonCentroid;

      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        // Edge direction
        const edgeDx = v2.x - v1.x;
        const edgeDy = v2.y - v1.y;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
        if (edgeLen < 0.001) continue;

        // Outward normal (perpendicular to edge, pointing away from centroid)
        let nx = edgeDy / edgeLen;
        let nz = -edgeDx / edgeLen;
        const midX = (v1.x + v2.x) / 2;
        const midZ = (v1.y + v2.y) / 2;
        const toCentroidX = centroid.x - midX;
        const toCentroidZ = centroid.y - midZ;
        if (nx * toCentroidX + nz * toCentroidZ > 0) {
          nx = -nx;
          nz = -nz;
        }

        // Create a thin oriented box along this edge
        // The box extends wallThickness outward from the edge
        const halfLen = edgeLen / 2 + wallThickness; // Extend past corners to seal gaps
        const halfThick = wallThickness / 2;

        // Box center: midpoint of edge, offset outward by half thickness
        const boxCenterX = midX + nx * halfThick;
        const boxCenterZ = midZ + nz * halfThick;

        // Create an AABB that bounds the rotated wall collider
        // For simplicity and robustness, use an oriented AABB that covers the wall segment
        const angle = Math.atan2(edgeDy, edgeDx);
        const cosA = Math.abs(Math.cos(angle));
        const sinA = Math.abs(Math.sin(angle));

        // AABB half-extents for the rotated box
        const hx = halfLen * cosA + halfThick * sinA;
        const hz = halfLen * sinA + halfThick * cosA;

        this.addStaticCollider(`wall_poly_${i}`, new THREE.Box3(
          new THREE.Vector3(boxCenterX - hx, 0, boxCenterZ - hz),
          new THREE.Vector3(boxCenterX + hx, height, boxCenterZ + hz)
        ));
      }
    }

    // Floor (using bounding box for floor/ceiling is fine — polygon containment handles XZ)
    this.addStaticCollider('floor', new THREE.Box3(
      new THREE.Vector3(-width / 2, -wallThickness, -depth / 2),
      new THREE.Vector3(width / 2, 0, depth / 2)
    ));

    // Ceiling
    this.addStaticCollider('ceiling', new THREE.Box3(
      new THREE.Vector3(-width / 2, height, -depth / 2),
      new THREE.Vector3(width / 2, height + wallThickness, depth / 2)
    ));
  }

  private createPortalColliders(config: RoomConfig): void {
    const { width, depth } = config.dimensions;

    for (const doorway of config.doorways) {
      const halfWidth = doorway.width / 2;
      const frameThickness = config.doorwayGeometry?.frameThickness || 0.1;

      let frameBounds: THREE.Box3;
      let triggerBounds: THREE.Box3;

      // Check if this doorway is placed on a polygon edge (non-cardinal)
      if (doorway.edgeStart && doorway.edgeEnd) {
        // Polygon edge doorway: compute bounds along arbitrary edge direction
        const esx = doorway.edgeStart.x;
        const esz = doorway.edgeStart.y; // Point2D.y maps to world Z
        const eex = doorway.edgeEnd.x;
        const eez = doorway.edgeEnd.y;

        const edgeDx = eex - esx;
        const edgeDz = eez - esz;
        const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDz * edgeDz);
        if (edgeLen < 0.001) continue;

        // Edge direction (unit)
        const dirX = edgeDx / edgeLen;
        const dirZ = edgeDz / edgeLen;

        // Outward normal
        const centroid = this.roomPolygonCentroid;
        let nx = edgeDz / edgeLen;
        let nz = -edgeDx / edgeLen;
        const midX = (esx + eex) / 2;
        const midZ = (esz + eez) / 2;
        if (nx * (centroid.x - midX) + nz * (centroid.y - midZ) > 0) {
          nx = -nx;
          nz = -nz;
        }

        // Doorway center along edge
        const t = doorway.position; // 0-1 along edge
        const cx = esx + edgeDx * t;
        const cz = esz + edgeDz * t;

        // Frame bounds: AABB encompassing the doorway along the edge
        const fHalfAlong = halfWidth + frameThickness;
        const fHalfNormal = 0.2;

        const corners = [
          { x: cx + dirX * fHalfAlong + nx * fHalfNormal, z: cz + dirZ * fHalfAlong + nz * fHalfNormal },
          { x: cx + dirX * fHalfAlong - nx * fHalfNormal, z: cz + dirZ * fHalfAlong - nz * fHalfNormal },
          { x: cx - dirX * fHalfAlong + nx * fHalfNormal, z: cz - dirZ * fHalfAlong + nz * fHalfNormal },
          { x: cx - dirX * fHalfAlong - nx * fHalfNormal, z: cz - dirZ * fHalfAlong - nz * fHalfNormal },
        ];
        const minX = Math.min(...corners.map(c => c.x));
        const maxX = Math.max(...corners.map(c => c.x));
        const minZ = Math.min(...corners.map(c => c.z));
        const maxZ = Math.max(...corners.map(c => c.z));

        frameBounds = new THREE.Box3(
          new THREE.Vector3(minX, 0, minZ),
          new THREE.Vector3(maxX, doorway.height + frameThickness, maxZ)
        );

        // Trigger bounds: slightly larger zone for transition detection
        const tHalfAlong = halfWidth;
        const tHalfNormal = 0.5;

        const tCorners = [
          { x: cx + dirX * tHalfAlong + nx * tHalfNormal, z: cz + dirZ * tHalfAlong + nz * tHalfNormal },
          { x: cx + dirX * tHalfAlong - nx * tHalfNormal, z: cz + dirZ * tHalfAlong - nz * tHalfNormal },
          { x: cx - dirX * tHalfAlong + nx * tHalfNormal, z: cz - dirZ * tHalfAlong + nz * tHalfNormal },
          { x: cx - dirX * tHalfAlong - nx * tHalfNormal, z: cz - dirZ * tHalfAlong - nz * tHalfNormal },
        ];
        const tMinX = Math.min(...tCorners.map(c => c.x));
        const tMaxX = Math.max(...tCorners.map(c => c.x));
        const tMinZ = Math.min(...tCorners.map(c => c.z));
        const tMaxZ = Math.max(...tCorners.map(c => c.z));

        triggerBounds = new THREE.Box3(
          new THREE.Vector3(tMinX, 0, tMinZ),
          new THREE.Vector3(tMaxX, doorway.height, tMaxZ)
        );
      } else {
        // Cardinal wall doorway (existing behavior)
        const doorwayPos = this.getDoorwayWorldPosition(doorway, config.dimensions);

        switch (doorway.wall) {
          case 'north':
            frameBounds = new THREE.Box3(
              new THREE.Vector3(doorwayPos.x - halfWidth - frameThickness, 0, -depth / 2 - 0.2),
              new THREE.Vector3(doorwayPos.x + halfWidth + frameThickness, doorway.height + frameThickness, -depth / 2)
            );
            triggerBounds = new THREE.Box3(
              new THREE.Vector3(doorwayPos.x - halfWidth, 0, -depth / 2 - 0.5),
              new THREE.Vector3(doorwayPos.x + halfWidth, doorway.height, -depth / 2 + 0.5)
            );
            break;
          case 'south':
            frameBounds = new THREE.Box3(
              new THREE.Vector3(doorwayPos.x - halfWidth - frameThickness, 0, depth / 2),
              new THREE.Vector3(doorwayPos.x + halfWidth + frameThickness, doorway.height + frameThickness, depth / 2 + 0.2)
            );
            triggerBounds = new THREE.Box3(
              new THREE.Vector3(doorwayPos.x - halfWidth, 0, depth / 2 - 0.5),
              new THREE.Vector3(doorwayPos.x + halfWidth, doorway.height, depth / 2 + 0.5)
            );
            break;
          case 'east':
            frameBounds = new THREE.Box3(
              new THREE.Vector3(width / 2, 0, doorwayPos.z - halfWidth - frameThickness),
              new THREE.Vector3(width / 2 + 0.2, doorway.height + frameThickness, doorwayPos.z + halfWidth + frameThickness)
            );
            triggerBounds = new THREE.Box3(
              new THREE.Vector3(width / 2 - 0.5, 0, doorwayPos.z - halfWidth),
              new THREE.Vector3(width / 2 + 0.5, doorway.height, doorwayPos.z + halfWidth)
            );
            break;
          case 'west':
            frameBounds = new THREE.Box3(
              new THREE.Vector3(-width / 2 - 0.2, 0, doorwayPos.z - halfWidth - frameThickness),
              new THREE.Vector3(-width / 2, doorway.height + frameThickness, doorwayPos.z + halfWidth + frameThickness)
            );
            triggerBounds = new THREE.Box3(
              new THREE.Vector3(-width / 2 - 0.5, 0, doorwayPos.z - halfWidth),
              new THREE.Vector3(-width / 2 + 0.5, doorway.height, doorwayPos.z + halfWidth)
            );
            break;
        }
      }

      this.portalColliders.push({
        doorway,
        frameBounds: frameBounds!,
        triggerBounds: triggerBounds!,
        wall: doorway.wall
      });
    }
  }

  clear(): void {
    this.staticColliders = [];
    this.dynamicColliders.clear();
    this.furnitureColliders = [];
    this.artColliders = [];
    this.portalColliders = [];
    this.sceneColliders = [];
    this.currentRoomConfig = null;
    this.roomPolygon = null;
    this.roomPolygonCentroid = { x: 0, y: 0 };
  }

  // ============================================================================
  // Collider Management
  // ============================================================================

  addStaticCollider(id: string, bounds: THREE.Box3, mesh?: THREE.Object3D): void {
    this.staticColliders.push({
      id,
      type: 'static',
      bounds: bounds.clone(),
      mesh,
      enabled: true
    });
  }

  addFurnitureCollider(id: string, bounds: THREE.Box3, mesh?: THREE.Object3D): void {
    this.furnitureColliders.push({
      id,
      type: 'furniture',
      bounds: bounds.clone(),
      mesh,
      enabled: true
    });
  }

  addArtCollider(id: string, bounds: THREE.Box3, mesh?: THREE.Object3D): void {
    this.artColliders.push({
      id,
      type: 'art',
      bounds: bounds.clone(),
      mesh,
      enabled: true
    });
  }

  addBreathingWall(id: string, state: BreathingWallState): void {
    this.dynamicColliders.set(id, state);
  }

  updateBreathingWall(id: string, offset: number): void {
    const wall = this.dynamicColliders.get(id);
    if (wall) {
      wall.currentOffset = offset;
      // Update bounds based on new offset
      const offsetVector = wall.breatheDirection.clone().multiplyScalar(offset);
      const newCenter = wall.basePosition.clone().add(offsetVector);
      const size = new THREE.Vector3();
      wall.bounds.getSize(size);
      wall.bounds.setFromCenterAndSize(newCenter, size);
    }
  }

  addSceneCollider(object: THREE.Object3D): void {
    this.sceneColliders.push(object);
  }

  removeSceneCollider(object: THREE.Object3D): void {
    const index = this.sceneColliders.indexOf(object);
    if (index !== -1) {
      this.sceneColliders.splice(index, 1);
    }
  }

  // ============================================================================
  // Capsule Collision Detection
  // ============================================================================

  /**
   * Multi-ray capsule collision check
   * Casts rays from multiple points on the capsule to detect collisions
   */
  multiRayCapsuleCheck(
    start: THREE.Vector3,
    end: THREE.Vector3,
    capsule: CapsuleCollider = DEFAULT_CAPSULE
  ): CollisionResult {
    const direction = end.clone().sub(start);
    const distance = direction.length();

    if (distance < 0.0001) {
      return this.createEmptyResult(distance);
    }

    direction.normalize();

    // Cast from multiple points on capsule
    const offsets = [
      new THREE.Vector3(0, capsule.height * 0.4, 0),   // Head
      new THREE.Vector3(0, 0, 0),                       // Center
      new THREE.Vector3(0, -capsule.height * 0.3, 0),  // Feet
      new THREE.Vector3(capsule.radius, 0, 0),          // Right
      new THREE.Vector3(-capsule.radius, 0, 0),         // Left
      new THREE.Vector3(0, 0, capsule.radius),          // Front
      new THREE.Vector3(0, 0, -capsule.radius)          // Back
    ];

    let closestHit = this.createEmptyResult(distance);

    for (const offset of offsets) {
      const rayStart = start.clone().add(offset);
      const result = this.sphereCast(rayStart, direction, distance + capsule.radius);

      if (result.hit && result.distance < closestHit.distance) {
        closestHit = result;
      }
    }

    return closestHit;
  }

  /**
   * Sphere cast using raycaster
   */
  private sphereCast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): CollisionResult {
    this.raycaster.set(origin, direction.clone().normalize());
    this.raycaster.far = maxDistance;

    // Check scene colliders
    if (this.sceneColliders.length > 0) {
      const intersects = this.raycaster.intersectObjects(this.sceneColliders, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        return {
          hit: true,
          point: hit.point.clone(),
          normal: hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0),
          distance: hit.distance,
          penetration: 0,
          object: hit.object
        };
      }
    }

    // Check against box colliders (static, furniture, art)
    const allColliders = [
      ...this.staticColliders,
      ...this.furnitureColliders,
      ...this.artColliders
    ];

    let closestHit = this.createEmptyResult(maxDistance);

    for (const collider of allColliders) {
      if (!collider.enabled) continue;

      const intersection = this.rayBoxIntersection(origin, direction, collider.bounds, maxDistance);
      if (intersection && intersection.distance < closestHit.distance) {
        closestHit = intersection;
      }
    }

    // Check dynamic colliders (breathing walls)
    for (const [, wall] of this.dynamicColliders) {
      const intersection = this.rayBoxIntersection(origin, direction, wall.bounds, maxDistance);
      if (intersection && intersection.distance < closestHit.distance) {
        closestHit = intersection;
      }
    }

    return closestHit;
  }

  /**
   * Ray-box intersection test
   */
  private rayBoxIntersection(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    box: THREE.Box3,
    maxDistance: number
  ): CollisionResult | null {
    const ray = new THREE.Ray(origin, direction);
    const target = new THREE.Vector3();

    if (ray.intersectBox(box, target)) {
      const distance = origin.distanceTo(target);
      if (distance <= maxDistance) {
        // Calculate normal based on which face was hit
        const normal = this.calculateBoxNormal(target, box);
        return {
          hit: true,
          point: target.clone(),
          normal,
          distance,
          penetration: 0,
          object: null
        };
      }
    }

    return null;
  }

  /**
   * Calculate the normal of the box face that was hit
   */
  private calculateBoxNormal(point: THREE.Vector3, box: THREE.Box3): THREE.Vector3 {
    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    const halfSize = size.multiplyScalar(0.5);
    const localPoint = point.clone().sub(center);

    // Find which face is closest
    const xDist = Math.abs(Math.abs(localPoint.x) - halfSize.x);
    const yDist = Math.abs(Math.abs(localPoint.y) - halfSize.y);
    const zDist = Math.abs(Math.abs(localPoint.z) - halfSize.z);

    if (xDist <= yDist && xDist <= zDist) {
      return new THREE.Vector3(Math.sign(localPoint.x), 0, 0);
    } else if (yDist <= xDist && yDist <= zDist) {
      return new THREE.Vector3(0, Math.sign(localPoint.y), 0);
    } else {
      return new THREE.Vector3(0, 0, Math.sign(localPoint.z));
    }
  }

  private createEmptyResult(distance: number): CollisionResult {
    return {
      hit: false,
      point: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      distance,
      penetration: 0,
      object: null
    };
  }

  // ============================================================================
  // Ground Detection
  // ============================================================================

  detectGround(position: THREE.Vector3, capsule: CapsuleCollider = DEFAULT_CAPSULE): GroundInfo {
    const rayStart = position.clone();
    rayStart.y += 0.1; // Slight offset up

    const result = this.sphereCast(
      rayStart,
      new THREE.Vector3(0, -1, 0),
      capsule.height * 0.5 + 0.2
    );

    if (result.hit) {
      const angle = Math.acos(Math.min(1, result.normal.dot(new THREE.Vector3(0, 1, 0))));

      return {
        isGrounded: result.distance < capsule.height * 0.5 + 0.1,
        normal: result.normal.clone(),
        angle,
        distance: result.distance - 0.1,
        canStand: angle < MAX_SLOPE_ANGLE
      };
    }

    return {
      isGrounded: false,
      normal: new THREE.Vector3(0, 1, 0),
      angle: 0,
      distance: Infinity,
      canStand: true
    };
  }

  // ============================================================================
  // Step Climbing
  // ============================================================================

  attemptStep(
    position: THREE.Vector3,
    movement: THREE.Vector3,
    capsule: CapsuleCollider = DEFAULT_CAPSULE
  ): { success: boolean; newPosition: THREE.Vector3 } {
    const startPos = position.clone();
    const targetPos = startPos.clone().add(movement);

    // 1. Check if blocked at current height
    const directTest = this.multiRayCapsuleCheck(startPos, targetPos, capsule);
    if (!directTest.hit) {
      return { success: false, newPosition: targetPos }; // Not blocked, normal movement
    }

    // 2. Try stepping up
    const stepUpPos = startPos.clone();
    stepUpPos.y += MAX_STEP_HEIGHT;

    const stepUpTest = this.multiRayCapsuleCheck(startPos, stepUpPos, capsule);
    if (stepUpTest.hit && stepUpTest.distance < MAX_STEP_HEIGHT) {
      return { success: false, newPosition: startPos }; // Can't step up
    }

    // 3. Move forward at stepped-up height
    const stepForwardPos = stepUpPos.clone().add(movement);
    const stepForwardTest = this.multiRayCapsuleCheck(stepUpPos, stepForwardPos, capsule);
    if (stepForwardTest.hit) {
      return { success: false, newPosition: startPos }; // Still blocked at height
    }

    // 4. Step back down
    const finalPos = stepForwardPos.clone();
    const stepDownResult = this.sphereCast(
      stepForwardPos,
      new THREE.Vector3(0, -1, 0),
      MAX_STEP_HEIGHT + 0.1
    );

    if (stepDownResult.hit) {
      finalPos.y = stepForwardPos.y - stepDownResult.distance + capsule.height * 0.5;
    }

    return { success: true, newPosition: finalPos };
  }

  // ============================================================================
  // Slide Collision Response
  // ============================================================================

  slideAlongSurface(
    position: THREE.Vector3,
    movement: THREE.Vector3,
    normal: THREE.Vector3,
    capsule: CapsuleCollider = DEFAULT_CAPSULE,
    depth: number = 0
  ): THREE.Vector3 {
    if (depth >= MAX_SLIDE_ITERATIONS) {
      return new THREE.Vector3();
    }

    // Project movement onto surface
    const dot = movement.dot(normal);
    const slideMovement = movement.clone().sub(normal.clone().multiplyScalar(dot));

    // Apply friction to prevent tunneling
    slideMovement.multiplyScalar(SLIDE_FRICTION);

    if (slideMovement.lengthSq() < 0.0001) {
      return new THREE.Vector3();
    }

    // Test slide movement
    const targetPos = position.clone().add(slideMovement);
    const slideTest = this.multiRayCapsuleCheck(position, targetPos, capsule);

    if (!slideTest.hit) {
      return slideMovement;
    }

    // Secondary collision - try sliding along that too
    return this.slideAlongSurface(position, slideMovement, slideTest.normal, capsule, depth + 1);
  }

  // ============================================================================
  // Portal/Doorway Detection
  // ============================================================================

  checkDoorwayBounds(
    position: THREE.Vector3,
    radius: number
  ): DoorwayPlacement | null {
    for (const portal of this.portalColliders) {
      // Expand trigger bounds by player radius
      const expandedTrigger = portal.triggerBounds.clone();
      expandedTrigger.expandByScalar(radius);

      if (expandedTrigger.containsPoint(position)) {
        // Check if within doorway opening (not hitting frame)
        // If position is within trigger but outside frame opening, we're in the doorway
        return portal.doorway;
      }
    }

    return null;
  }

  isInDoorway(position: THREE.Vector3, radius: number): boolean {
    return this.checkDoorwayBounds(position, radius) !== null;
  }

  // ============================================================================
  // Breathing Wall Collision
  // ============================================================================

  resolveBreathingWallCollisions(
    position: THREE.Vector3,
    radius: number
  ): THREE.Vector3 {
    const totalPush = new THREE.Vector3();

    for (const [, wall] of this.dynamicColliders) {
      // Expand wall bounds by player radius
      const expandedBounds = wall.bounds.clone();
      expandedBounds.expandByScalar(radius);

      if (expandedBounds.containsPoint(position)) {
        // Calculate push direction
        const center = new THREE.Vector3();
        wall.bounds.getCenter(center);

        const closestPoint = new THREE.Vector3();
        wall.bounds.clampPoint(position, closestPoint);

        const pushDirection = position.clone().sub(closestPoint);
        const penetration = radius - pushDirection.length();

        if (penetration > 0) {
          pushDirection.normalize();
          totalPush.add(pushDirection.multiplyScalar(penetration * 1.1)); // 10% extra to prevent re-collision
        }
      }
    }

    return totalPush;
  }

  // ============================================================================
  // Full Movement Test
  // ============================================================================

  testMovement(
    start: THREE.Vector3,
    end: THREE.Vector3,
    capsule: CapsuleCollider = DEFAULT_CAPSULE
  ): FullCollisionResult {
    const result: FullCollisionResult = {
      collided: false,
      normal: new THREE.Vector3(),
      penetration: 0,
      inDoorway: false,
      doorway: null,
      groundInfo: this.detectGround(start, capsule),
      pushVector: new THREE.Vector3()
    };

    // Check doorway first
    const doorway = this.checkDoorwayBounds(end, capsule.radius);
    if (doorway) {
      result.inDoorway = true;
      result.doorway = doorway;
    }

    // Multi-ray capsule collision
    const collision = this.multiRayCapsuleCheck(start, end, capsule);
    if (collision.hit) {
      result.collided = true;
      result.normal = collision.normal;
      result.penetration = collision.penetration;
    }

    // Breathing wall push
    result.pushVector = this.resolveBreathingWallCollisions(end, capsule.radius);

    return result;
  }

  // ============================================================================
  // Utility
  // ============================================================================

  private getDoorwayWorldPosition(
    doorway: DoorwayPlacement,
    dimensions: RoomDimensions
  ): THREE.Vector3 {
    const { width, depth } = dimensions;
    const pos = new THREE.Vector3();

    switch (doorway.wall) {
      case 'north':
        pos.x = (doorway.position - 0.5) * width;
        pos.z = -depth / 2;
        break;
      case 'south':
        pos.x = (doorway.position - 0.5) * width;
        pos.z = depth / 2;
        break;
      case 'east':
        pos.x = width / 2;
        pos.z = (doorway.position - 0.5) * depth;
        break;
      case 'west':
        pos.x = -width / 2;
        pos.z = (doorway.position - 0.5) * depth;
        break;
    }

    pos.y = doorway.height / 2;
    return pos;
  }

  getRoomConfig(): RoomConfig | null {
    return this.currentRoomConfig;
  }

  getRoomPolygon(): Point2D[] | null {
    return this.roomPolygon;
  }

  getRoomPolygonCentroid(): Point2D {
    return this.roomPolygonCentroid;
  }

  /**
   * Test if an XZ position is inside the room polygon.
   * Uses point-in-polygon for non-rectangular rooms.
   */
  isInsideRoom(x: number, z: number): boolean {
    if (!this.roomPolygon) return true; // No polygon = no constraint
    return pointInPolygon({ x, y: z }, this.roomPolygon);
  }

  /**
   * Clamp an XZ position to stay inside the room polygon.
   * If the point is outside, project it back to the nearest edge.
   * Returns the clamped position.
   */
  clampToRoom(x: number, z: number, margin: number = 0): { x: number; z: number } {
    if (!this.roomPolygon) return { x, z };

    const polygon = this.roomPolygon;
    const point: Point2D = { x, y: z };

    if (pointInPolygon(point, polygon)) {
      // Inside — optionally enforce margin from walls
      if (margin > 0) {
        const dist = signedDistanceToPolygon(point, polygon);
        if (dist < margin) {
          // Too close to edge, push inward
          return this.pushInsidePolygon(x, z, margin);
        }
      }
      return { x, z };
    }

    // Outside — find closest point on polygon boundary and push inside
    return this.pushInsidePolygon(x, z, margin);
  }

  private pushInsidePolygon(x: number, z: number, margin: number): { x: number; z: number } {
    const polygon = this.roomPolygon!;
    let closestX = x, closestZ = z;
    let minDist = Infinity;

    // Find closest point on polygon boundary
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const ax = polygon[j].x, ay = polygon[j].y;
      const bx = polygon[i].x, by = polygon[i].y;

      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      let t = 0;
      if (lenSq > 0) {
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - ay) * dy) / lenSq));
      }
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      const dist = Math.sqrt((x - cx) * (x - cx) + (z - cy) * (z - cy));

      if (dist < minDist) {
        minDist = dist;
        // Push inward along the edge normal by margin
        const edgeLen = Math.sqrt(lenSq);
        if (edgeLen > 0.001) {
          // Inward normal (toward centroid)
          let nx = dy / edgeLen;
          let nz = -dx / edgeLen;
          const toCx = this.roomPolygonCentroid.x - (ax + bx) / 2;
          const toCz = this.roomPolygonCentroid.y - (ay + by) / 2;
          if (nx * toCx + nz * toCz < 0) {
            nx = -nx;
            nz = -nz;
          }
          closestX = cx + nx * margin;
          closestZ = cy + nz * margin;
        } else {
          closestX = cx;
          closestZ = cy;
        }
      }
    }

    return { x: closestX, z: closestZ };
  }

  // ============================================================================
  // Debug
  // ============================================================================

  setDebugMode(_enabled: boolean): void {
    // Debug mode placeholder
  }

  getDebugColliders(): { type: string; bounds: THREE.Box3 }[] {
    const colliders: { type: string; bounds: THREE.Box3 }[] = [];

    for (const c of this.staticColliders) {
      colliders.push({ type: 'static', bounds: c.bounds });
    }

    for (const c of this.furnitureColliders) {
      colliders.push({ type: 'furniture', bounds: c.bounds });
    }

    for (const c of this.artColliders) {
      colliders.push({ type: 'art', bounds: c.bounds });
    }

    for (const [, wall] of this.dynamicColliders) {
      colliders.push({ type: 'dynamic', bounds: wall.bounds });
    }

    for (const portal of this.portalColliders) {
      colliders.push({ type: 'trigger', bounds: portal.triggerBounds });
    }

    return colliders;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let collisionManagerInstance: CollisionManager | null = null;

export function getCollisionManager(): CollisionManager {
  if (!collisionManagerInstance) {
    collisionManagerInstance = new CollisionManager();
  }
  return collisionManagerInstance;
}

export function disposeCollisionManager(): void {
  if (collisionManagerInstance) {
    collisionManagerInstance.clear();
    collisionManagerInstance = null;
  }
}
