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

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
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
