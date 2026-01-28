/**
 * Art type definitions for procedural generation
 *
 * Art Direction Principles:
 * - Beauty that knows pain
 * - NOT horror imagery—wrongness in the mundane
 * - Paintings with wrong horizons, composite faces
 * - Frame styles that don't match room era
 * - Placement slightly too low or too high
 */

import type * as THREE from 'three';
import type { WrongnessLevel } from './room';

// ============================================
// Painting Types
// ============================================

export const PaintingStyle = {
  LANDSCAPE: 'landscape',          // Horizons that don't quite align
  PORTRAIT: 'portrait',            // Faces that might be composite
  STILL_LIFE: 'still_life',        // Objects arranged with disturbing care
  ABSTRACT: 'abstract',            // Patterns that almost resolve
  WINDOW: 'window',                // Shows outside that doesn't exist
  RECURSIVE: 'recursive',          // Shows the room it's in
  MIRROR: 'mirror',                // Reflects wrong
} as const;
export type PaintingStyle = (typeof PaintingStyle)[keyof typeof PaintingStyle];

export const FrameStyle = {
  ORNATE: 'ornate',                // Gold, baroque, excessive
  MINIMAL: 'minimal',              // Thin black or white
  NONE: 'none',                    // Canvas only
  WRONG_ERA: 'wrong_era',          // Modern frame on old painting, etc.
  DAMAGED: 'damaged',              // Cracked, peeling gilt
  ORGANIC: 'organic',              // Frame that seems to grow
} as const;
export type FrameStyle = (typeof FrameStyle)[keyof typeof FrameStyle];

export const PaintingWrongnessType = {
  LIGHTING: 'lighting',            // Shadows fall wrong direction
  PERSPECTIVE: 'perspective',      // Vanishing points don't converge
  CONTENT: 'content',              // Subject matter is subtly wrong
  RECURSIVE: 'recursive',          // Shows the room, shows the viewer
  TEMPORAL: 'temporal',            // Shows different time of day than reality
  SPATIAL: 'spatial',              // Shows impossible space
  FACIAL: 'facial',                // Portrait faces are composite/wrong
  ANIMATE: 'animate',              // Seems to move when not observed
} as const;
export type PaintingWrongnessType = (typeof PaintingWrongnessType)[keyof typeof PaintingWrongnessType];

// ============================================
// Painting Configuration
// ============================================

export interface PaintingWrongness {
  type: PaintingWrongnessType;
  intensity: number;               // 0-1, based on depth + Growl
  subtleties: string[];            // Specific wrong details
}

export interface PaintingPlacement {
  height: number;                  // Y position (slightly too high or low)
  tilt: number;                    // Rotation around horizontal axis
  wallOffset: number;              // Distance from wall (frame depth)
  horizontalPosition?: number;     // 0-1 along wall (default 0.5 = center)
}

export interface PaintingDimensions {
  width: number;
  height: number;
  frameDepth: number;              // For collision
  frameWidth: number;              // Border thickness
}

export interface PaintingColors {
  dominant: THREE.Color;           // Main color in painting
  accent: THREE.Color;             // Secondary color
  frame: THREE.Color;              // Frame color
}

export interface PaintingConfig {
  id: string;
  style: PaintingStyle;
  frameStyle: FrameStyle;
  wrongness: PaintingWrongness;
  placement: PaintingPlacement;
  dimensions: PaintingDimensions;
  colors: PaintingColors;
  seed: number;
  wall: import('./room').Wall;     // Which wall this painting is on
  // Audio reactivity settings
  audioBand: 'bass' | 'mid' | 'high';
  audioReactivity: number;         // 0-1, how much audio affects the painting
}

// ============================================
// Sculpture Types
// ============================================

export const SculptureType = {
  FIGURE_FACING_WALL: 'figure_facing_wall',   // Always turns away
  ACCUMULATION: 'accumulation',                // Too many identical objects
  THE_WEIGHT: 'the_weight',                    // Heavy on thin support
  THRESHOLD_GUARDIAN: 'threshold_guardian',    // In doorways
  ABSTRACTION: 'abstraction',                  // Impossible geometry
  FRAGMENT: 'fragment',                        // Partial figure
  VESSEL: 'vessel',                            // Container that shouldn't hold what it holds
} as const;
export type SculptureType = (typeof SculptureType)[keyof typeof SculptureType];

export interface SculptureConfig {
  id: string;
  type: SculptureType;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  material: 'marble' | 'bronze' | 'clay' | 'void' | 'organic';
  wrongnessLevel: WrongnessLevel;
  seed: number;
}

// ============================================
// Furniture Types
// ============================================

export const FurnitureType = {
  CHAIR: 'chair',
  SOFA: 'sofa',
  TABLE: 'table',
  BED: 'bed',
  DESK: 'desk',
  CABINET: 'cabinet',
  LAMP: 'lamp',
  CLOCK: 'clock',
  MIRROR: 'mirror',
  PLANT: 'plant',
} as const;
export type FurnitureType = (typeof FurnitureType)[keyof typeof FurnitureType];

export const FurnitureIntent = {
  FACING_WALL: 'facing_wall',           // Chair facing corner
  WRONG_ROOM: 'wrong_room',             // Bed in kitchen
  RITUAL_ARRANGEMENT: 'ritual',          // Items arranged deliberately
  NO_CONVERSANTS: 'no_conversants',      // Sofa for conversation, no one there
  HOSTILE: 'hostile',                    // Facing the player
  GRAVITY_DEFIANT: 'gravity_defiant',    // On ceiling, on wall
  MULTIPLIED: 'multiplied',              // Too many of the same
} as const;
export type FurnitureIntent = (typeof FurnitureIntent)[keyof typeof FurnitureIntent];

export interface FurnitureConfig {
  id: string;
  type: FurnitureType;
  intent: FurnitureIntent;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  wrongnessLevel: WrongnessLevel;
  seed: number;
}

// ============================================
// Art Placement in Room
// ============================================

export interface RoomArtConfig {
  paintings: PaintingConfig[];
  sculptures: SculptureConfig[];
  furniture: FurnitureConfig[];
}
