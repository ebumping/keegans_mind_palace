/**
 * Room type definitions for procedural generation
 */

import type * as THREE from 'three';

// Room types as const objects (erasableSyntaxOnly compatible)
export const RoomType = {
  STANDARD: 'standard',
  CORRIDOR: 'corridor',
  CHAMBER: 'chamber',
  ALCOVE: 'alcove',
  JUNCTION: 'junction',
  IMPOSSIBLE: 'impossible',
} as const;
export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export const Wall = {
  NORTH: 'north',
  SOUTH: 'south',
  EAST: 'east',
  WEST: 'west',
} as const;
export type Wall = (typeof Wall)[keyof typeof Wall];

export const WallFeature = {
  PLAIN: 'plain',
  PANELED: 'paneled',
  TILED: 'tiled',
  TEXTURED: 'textured',
  DAMAGED: 'damaged',
  ORGANIC: 'organic',
} as const;
export type WallFeature = (typeof WallFeature)[keyof typeof WallFeature];

export const FloorType = {
  CARPET: 'carpet',
  TILE: 'tile',
  WOOD: 'wood',
  CONCRETE: 'concrete',
  VOID: 'void',
} as const;
export type FloorType = (typeof FloorType)[keyof typeof FloorType];

// Room shapes - beyond the rectangle
export const RoomShape = {
  RECTANGLE: 'rectangle',
  L_SHAPE: 'l_shape',
  H_SHAPE: 'h_shape',
  TRIANGLE: 'triangle',
  HEXAGON: 'hexagon',
  SPIRAL: 'spiral',
  IRREGULAR: 'irregular',
  CURVED: 'curved',
} as const;
export type RoomShape = (typeof RoomShape)[keyof typeof RoomShape];

// Room archetypes - the soul of each space
export const RoomArchetype = {
  // Domestic
  LIVING_ROOM: 'living_room',
  KITCHEN: 'kitchen',
  BEDROOM: 'bedroom',
  BATHROOM: 'bathroom',
  // Institutional
  CORRIDOR_OF_DOORS: 'corridor_of_doors',
  WAITING_ROOM: 'waiting_room',
  OFFICE: 'office',
  // Transitional
  STAIRWELL: 'stairwell',
  ELEVATOR_BANK: 'elevator_bank',
  // Commercial
  STORE: 'store',
  RESTAURANT: 'restaurant',
  // Void
  ATRIUM: 'atrium',
  PARKING: 'parking',
  // Generic
  GENERIC: 'generic',
} as const;
export type RoomArchetype = (typeof RoomArchetype)[keyof typeof RoomArchetype];

// Vertical element types
export const VerticalElementType = {
  SUNKEN: 'sunken',
  RAISED: 'raised',
  MEZZANINE: 'mezzanine',
  SPLIT: 'split',
  PIT: 'pit',
  SHAFT: 'shaft',
} as const;
export type VerticalElementType = (typeof VerticalElementType)[keyof typeof VerticalElementType];

// Wrongness levels
export const WrongnessLevel = {
  SUBTLE: 1,
  NOTICEABLE: 2,
  UNSETTLING: 3,
  SURREAL: 4,
  BIZARRE: 5,
} as const;
export type WrongnessLevel = (typeof WrongnessLevel)[keyof typeof WrongnessLevel];

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
}

// 2D point for floor polygon vertices
export interface Point2D {
  x: number;
  y: number;
}

// Height variation point for split-level floors
export interface HeightPoint {
  position: Point2D;
  height: number;
  radius: number; // Falloff radius for height blending
}

// Curve definition for curved walls
export interface CurveDefinition {
  startIndex: number;  // Which vertex the curve starts from
  endIndex: number;    // Which vertex the curve ends at
  controlPoints: Point2D[];  // Bezier control points
  segments: number;    // Number of segments to approximate curve
}

// Room shape configuration for non-rectangular rooms
export interface RoomShapeConfig {
  type: RoomShape;
  vertices: Point2D[];          // Floor polygon vertices
  heightVariations: HeightPoint[];  // Split levels within room
  wallCurves: CurveDefinition[];    // Curved wall sections
  boundingBox: RoomDimensions;  // Axis-aligned bounding box
}

// Vertical element (sunken areas, raised platforms, mezzanines)
export interface VerticalElement {
  type: VerticalElementType;
  footprint: Point2D[];    // Polygon defining the element
  heightDelta: number;     // Height difference from main floor
  hasRail: boolean;        // Railing to prevent falls
  accessible: boolean;     // Can player access this area
  connectsVia: 'step' | 'ramp' | 'stairs' | 'jump' | 'none';
}

// Wrongness configuration
export interface WrongnessConfig {
  level: WrongnessLevel;
  proportionSkew: number;      // How much room proportions are wrong
  wallAngleVariance: number;   // Wall angle deviation in radians
  furnitureOrientation: 'normal' | 'offset' | 'wrong' | 'hostile' | 'gravity_defiant';
  doorPlacement: 'logical' | 'wrong' | 'impossible';
  lightingBehavior: 'normal' | 'flicker' | 'sourceless' | 'wrong_direction';
  clockBehavior: 'normal' | 'stopped' | 'wrong_time' | 'backwards' | 'impossible';
}

export interface DoorwayPlacement {
  wall: Wall;
  position: number; // 0-1 along wall length
  width: number;
  height: number;
  leadsTo: number; // Target room index
}

export interface DoorwayGeometry {
  frameThickness: number;
  archType: 'rectangular' | 'arched' | 'gothic' | 'irregular';
  glowColor: string;
  glowIntensity: number;
}

export interface CeilingConfig {
  height: number;
  hasLighting: boolean;
  lightingType: 'recessed' | 'fluorescent' | 'bare_bulb' | 'none';
  hasSkylight: boolean;
  isVisible: boolean;
}

export interface NonEuclideanConfig {
  enabled: boolean;
  interiorScale: number;
}

export interface RoomConfig {
  index: number;
  seed: number;
  type: RoomType;
  dimensions: RoomDimensions;
  doorways: DoorwayPlacement[];
  doorwayGeometry: DoorwayGeometry;
  wallFeatures: WallFeature[];
  floorType: FloorType;
  ceilingConfig: CeilingConfig;
  nonEuclidean: NonEuclideanConfig;
  abnormality: number;
  complexity: number;
  // New spatial design properties
  shape?: RoomShapeConfig;           // Non-rectangular room shape
  archetype?: RoomArchetype;         // Room archetype (living room, kitchen, etc.)
  verticalElements?: VerticalElement[];  // Sunken areas, platforms, mezzanines
  wrongness?: WrongnessConfig;       // Wrongness configuration
}

export interface AudioLevels {
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;
}

export interface GeneratedRoom {
  config: RoomConfig;
  mesh: THREE.Group;
  boundingBox: THREE.Box3;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];

  update(audioLevels: AudioLevels, delta: number): void;
  dispose(): void;
}
