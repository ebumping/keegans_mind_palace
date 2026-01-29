/**
 * Curated Room Templates
 *
 * Hand-crafted liminal room definitions for rooms 1–15.
 * Each template defines exact wall positions, floor plan shape, lighting,
 * color palette, furniture, and doorway positions.
 *
 * Rooms 16+ cycle through these templates with increasing wrongness.
 *
 * Every template guarantees:
 * - Closed polygon boundary (no gaps, no open edges)
 * - Walls, floor, and ceiling always present
 * - At least one exit doorway
 * - Visible audio reactivity hooks
 */

import {
  RoomArchetype,
  RoomShape,
  FloorType,
} from '../types/room';
import type {
  CuratedRoom,
  WallSegment,
  Point2D,
} from '../types/room';

// ============================================
// Helper: create wall segments from a closed polygon
// ============================================

function wallsFromPolygon(vertices: Point2D[], height: number): WallSegment[] {
  const walls: WallSegment[] = [];
  for (let i = 0; i < vertices.length; i++) {
    walls.push({
      start: vertices[i],
      end: vertices[(i + 1) % vertices.length],
      height,
    });
  }
  return walls;
}

/** Rectangular polygon helper (centered at origin) */
function rectVertices(w: number, d: number): Point2D[] {
  const hw = w / 2;
  const hd = d / 2;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];
}

/** L-shaped polygon helper */
function lShapeVertices(
  longArmW: number, longArmD: number,
  shortArmW: number, shortArmD: number
): Point2D[] {
  // L-shape: long arm along +Z, short arm branches off at the far end to the right
  return [
    { x: -longArmW / 2, y: -longArmD / 2 },
    { x: longArmW / 2, y: -longArmD / 2 },
    { x: longArmW / 2, y: longArmD / 2 - shortArmD },
    { x: longArmW / 2 + shortArmW, y: longArmD / 2 - shortArmD },
    { x: longArmW / 2 + shortArmW, y: longArmD / 2 },
    { x: -longArmW / 2, y: longArmD / 2 },
  ];
}

// ============================================
// Template 1: The Infinite Hallway
// ============================================
const infiniteHallway: CuratedRoom = {
  templateId: 'infinite_hallway',
  name: 'The Infinite Hallway',
  archetype: RoomArchetype.CORRIDOR_OF_DOORS,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 3, height: 4, depth: 40 },
  floorVertices: rectVertices(3, 40),
  wallSegments: wallsFromPolygon(rectVertices(3, 40), 4),
  lightSources: [
    // Pools of warm fluorescent light every 6m
    ...Array.from({ length: 7 }, (_, i) => ({
      position: { x: 0, y: 3.8, z: -18 + i * 6 },
      color: '#fff5e0',
      intensity: 0.8,
      type: 'rect' as const,
      distance: 8,
      decay: 1.5,
    })),
    // Flickering light midway
    {
      position: { x: 0, y: 3.8, z: 0 },
      color: '#fff5e0',
      intensity: 1.2,
      type: 'point' as const,
      flicker: true,
      distance: 6,
      decay: 2,
    },
  ],
  palette: {
    primary: '#f5e6c8',
    secondary: '#d4c5a0',
    accent: '#fff5e0',
    fog: '#2a2520',
    floor: '#8b7d6b',
    ceiling: '#c8b898',
    wall: '#e8dcc8',
  },
  atmosphere: {
    fogDensity: 0.04,
    fogColor: '#2a2520',
    particleType: 'dust',
    particleCount: 30,
    ambientSoundHint: 'fluorescent_hum',
  },
  furniture: [
    // 12 identical doors (6 per side) - all decorative
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'wooden_door',
      position: { x: -1.45, y: 0, z: -15 + i * 5.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'wooden_door',
      position: { x: 1.45, y: 0, z: -15 + i * 5.5 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
  ],
  doorways: [
    {
      position: { x: 0, y: 20 },
      facingAngle: 0,
      width: 2.5,
      height: 3.5,
      wallSegmentIndex: 2, // far end
      leadsTo: 2,
      glowColor: '#88ccdd',
    },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 4,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 2: The Empty Pool
// ============================================
const emptyPool: CuratedRoom = {
  templateId: 'empty_pool',
  name: 'The Empty Pool',
  archetype: RoomArchetype.ATRIUM,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 20, height: 8, depth: 30 },
  floorVertices: rectVertices(20, 30),
  wallSegments: wallsFromPolygon(rectVertices(20, 30), 8),
  lightSources: [
    // Skylight panels
    { position: { x: -4, y: 7.8, z: -5 }, color: '#ddeeff', intensity: 0.6, type: 'rect' },
    { position: { x: 4, y: 7.8, z: -5 }, color: '#ddeeff', intensity: 0.6, type: 'rect' },
    { position: { x: -4, y: 7.8, z: 5 }, color: '#ddeeff', intensity: 0.6, type: 'rect' },
    { position: { x: 4, y: 7.8, z: 5 }, color: '#ddeeff', intensity: 0.6, type: 'rect' },
    // Subtle pool-bottom glow
    { position: { x: 0, y: -1.8, z: 0 }, color: '#66ccdd', intensity: 0.3, type: 'point', distance: 10 },
  ],
  palette: {
    primary: '#66ccdd',
    secondary: '#d4c9b0',
    accent: '#88eeff',
    fog: '#1a2a35',
    floor: '#88ccbb',
    ceiling: '#cccccc',
    wall: '#d4c9b0',
  },
  atmosphere: {
    fogDensity: 0.02,
    fogColor: '#1a2a35',
    particleType: 'dust',
    particleCount: 50,
    ambientSoundHint: 'cavernous_echo',
  },
  furniture: [
    // Pool ladders
    { type: 'pool_ladder', position: { x: -6, y: -2, z: -8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    { type: 'pool_ladder', position: { x: 6, y: -2, z: 8 }, rotation: { x: 0, y: Math.PI, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Diving board
    { type: 'diving_board', position: { x: 0, y: 0, z: -12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Drain grate at pool center
    { type: 'drain_grate', position: { x: 0, y: -2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  ],
  doorways: [
    // Pool-level exit
    {
      position: { x: -10, y: 0 },
      facingAngle: Math.PI / 2,
      width: 3,
      height: 3.5,
      wallSegmentIndex: 3,
      leadsTo: 3,
      glowColor: '#ffdd88',
    },
    // Pool-bottom corridor
    {
      position: { x: 0, y: -15 },
      facingAngle: 0,
      width: 2,
      height: 2.5,
      wallSegmentIndex: 0,
      leadsTo: 4,
      glowColor: '#334455',
    },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 8,
    hasLighting: true,
    lightingType: 'recessed',
    hasSkylight: true,
    isVisible: true,
  },
  verticalElements: [
    {
      type: 'sunken' as const,
      footprint: rectVertices(14, 20),
      heightDelta: -2,
      hasRail: false,
      accessible: true,
      connectsVia: 'stairs',
    },
  ],
};

// ============================================
// Template 3: The Backrooms Office
// ============================================
const backroomsOffice: CuratedRoom = {
  templateId: 'backrooms_office',
  name: 'The Backrooms Office',
  archetype: RoomArchetype.OFFICE,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 25, height: 3, depth: 25 },
  floorVertices: rectVertices(25, 25),
  wallSegments: wallsFromPolygon(rectVertices(25, 25), 3),
  lightSources: [
    // Grid of harsh fluorescent panels
    ...Array.from({ length: 9 }, (_, i) => ({
      position: { x: -8 + (i % 3) * 8, y: 2.9, z: -8 + Math.floor(i / 3) * 8 },
      color: '#fffff0',
      intensity: 1.0,
      type: 'rect' as const,
      flicker: true,
      distance: 10,
    })),
  ],
  palette: {
    primary: '#d4c9a0',
    secondary: '#c8b888',
    accent: '#fffff0',
    fog: '#2a2818',
    floor: '#5a5040',
    ceiling: '#e8e0d0',
    wall: '#f0e8d8',
  },
  atmosphere: {
    fogDensity: 0.03,
    fogColor: '#2a2818',
    particleType: 'dust',
    particleCount: 40,
    ambientSoundHint: 'fluorescent_buzz',
  },
  furniture: [
    // Grid of cubicle partitions (simplified — actual mesh generation happens at render time)
    ...Array.from({ length: 12 }, (_, i) => ({
      type: 'cubicle',
      position: { x: -8 + (i % 4) * 5, y: 0, z: -8 + Math.floor(i / 4) * 5 },
      rotation: { x: 0, y: (i % 2) * Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Water cooler
    { type: 'water_cooler', position: { x: -11, y: 0, z: -11 }, rotation: { x: 0, y: 0.3, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  ],
  doorways: [
    { position: { x: 0, y: -12.5 }, facingAngle: Math.PI, width: 3, height: 2.8, wallSegmentIndex: 0, leadsTo: 4, glowColor: '#99ccaa' },
    { position: { x: 12.5, y: 0 }, facingAngle: -Math.PI / 2, width: 3, height: 2.8, wallSegmentIndex: 1, leadsTo: 5, glowColor: '#cc9988' },
    { position: { x: -12.5, y: 5 }, facingAngle: Math.PI / 2, width: 3, height: 2.8, wallSegmentIndex: 3, leadsTo: 6, glowColor: '#8899cc' },
  ],
  floorType: FloorType.CARPET,
  ceilingConfig: {
    height: 3,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 4: The Stairwell to Nowhere
// ============================================
const stairwellNowhere: CuratedRoom = {
  templateId: 'stairwell_nowhere',
  name: 'The Stairwell to Nowhere',
  archetype: RoomArchetype.STAIRWELL,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 6, height: 12, depth: 6 },
  floorVertices: rectVertices(6, 6),
  wallSegments: wallsFromPolygon(rectVertices(6, 6), 12),
  lightSources: [
    // Harsh bulb at each landing (3 landings)
    { position: { x: 0, y: 2, z: 0 }, color: '#ffeecc', intensity: 0.9, type: 'point', distance: 5, decay: 2 },
    { position: { x: 0, y: 6, z: 0 }, color: '#ffeecc', intensity: 0.7, type: 'point', distance: 5, decay: 2 },
    { position: { x: 0, y: 10, z: 0 }, color: '#ffeecc', intensity: 0.5, type: 'point', distance: 5, decay: 2 },
    // Emergency exit signs
    { position: { x: 2.8, y: 3.5, z: 0 }, color: '#00ff44', intensity: 0.4, type: 'point', distance: 3 },
    { position: { x: -2.8, y: 7.5, z: 0 }, color: '#00ff44', intensity: 0.4, type: 'point', distance: 3 },
  ],
  palette: {
    primary: '#888888',
    secondary: '#666666',
    accent: '#00ff44',
    fog: '#1a1a22',
    floor: '#555555',
    ceiling: '#444444',
    wall: '#999999',
  },
  atmosphere: {
    fogDensity: 0.05,
    fogColor: '#1a1a22',
    particleType: 'dust',
    particleCount: 15,
    ambientSoundHint: 'stairwell_echo',
  },
  furniture: [
    // Spiral stair meshes (simplified placement data)
    { type: 'stair_section', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Handrails
    { type: 'handrail', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Exposed pipes
    { type: 'pipe_vertical', position: { x: 2.8, y: 0, z: 2.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 12, z: 1 } },
    { type: 'pipe_vertical', position: { x: -2.8, y: 0, z: -2.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 12, z: 1 } },
  ],
  doorways: [
    // Single working fire door exit
    {
      position: { x: 3, y: 0 },
      facingAngle: -Math.PI / 2,
      width: 2,
      height: 3,
      wallSegmentIndex: 1,
      leadsTo: 5,
      glowColor: '#665544',
      label: 'EXIT',
    },
  ],
  floorType: FloorType.CONCRETE,
  ceilingConfig: {
    height: 12,
    hasLighting: false,
    lightingType: 'bare_bulb',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 5: The Hotel Corridor
// ============================================
const hotelCorridor: CuratedRoom = {
  templateId: 'hotel_corridor',
  name: 'The Hotel Corridor',
  archetype: RoomArchetype.CORRIDOR_OF_DOORS,
  shapeType: RoomShape.L_SHAPE,
  dimensions: { width: 4, height: 3.5, depth: 30 },
  floorVertices: lShapeVertices(4, 30, 20, 4),
  wallSegments: wallsFromPolygon(lShapeVertices(4, 30, 20, 4), 3.5),
  lightSources: [
    // Warm wall sconces every 4m along long arm
    ...Array.from({ length: 8 }, (_, i) => ({
      position: { x: -1.8, y: 2.5, z: -13 + i * 4 },
      color: '#ffcc88',
      intensity: 0.5,
      type: 'point' as const,
      distance: 4,
      decay: 2,
    })),
    // Sconces along short arm
    ...Array.from({ length: 5 }, (_, i) => ({
      position: { x: 2 + i * 4, y: 2.5, z: 13 },
      color: '#ffcc88',
      intensity: 0.5,
      type: 'point' as const,
      distance: 4,
      decay: 2,
    })),
  ],
  palette: {
    primary: '#8b2020',
    secondary: '#4a2010',
    accent: '#ffcc88',
    fog: '#1a1015',
    floor: '#6b1818',
    ceiling: '#e8d8c0',
    wall: '#d8c8b0',
  },
  atmosphere: {
    fogDensity: 0.03,
    fogColor: '#1a1015',
    particleType: 'dust',
    particleCount: 20,
    ambientSoundHint: 'hotel_ambient',
  },
  furniture: [
    // Room doors with brass numbers along both sides of long arm
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'hotel_door',
      position: { x: -1.95, y: 0, z: -11 + i * 4 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'hotel_door',
      position: { x: 1.95, y: 0, z: -11 + i * 4 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Room service cart abandoned mid-corridor
    { type: 'room_service_cart', position: { x: 0.5, y: 0, z: 3 }, rotation: { x: 0, y: 0.2, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  ],
  doorways: [
    {
      position: { x: 22, y: 15 },
      facingAngle: -Math.PI / 2,
      width: 3,
      height: 3.2,
      wallSegmentIndex: 4,
      leadsTo: 6,
      glowColor: '#6688aa',
    },
  ],
  floorType: FloorType.CARPET,
  ceilingConfig: {
    height: 3.5,
    hasLighting: true,
    lightingType: 'recessed',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 6: The Sunken Mall Atrium
// ============================================
const mallAtrium: CuratedRoom = {
  templateId: 'mall_atrium',
  name: 'The Sunken Mall Atrium',
  archetype: RoomArchetype.ATRIUM,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 30, height: 10, depth: 30 },
  floorVertices: rectVertices(30, 30),
  wallSegments: wallsFromPolygon(rectVertices(30, 30), 10),
  lightSources: [
    // Orange sodium-vapor emergency lighting
    ...Array.from({ length: 4 }, (_, i) => ({
      position: { x: -10 + (i % 2) * 20, y: 9, z: -10 + Math.floor(i / 2) * 20 },
      color: '#ff9940',
      intensity: 0.4,
      type: 'point' as const,
      distance: 15,
      decay: 1.5,
    })),
    // Fountain basin glow (audio reactive)
    { position: { x: 0, y: 0.5, z: 0 }, color: '#66aacc', intensity: 0.3, type: 'point', distance: 8 },
  ],
  palette: {
    primary: '#ff9940',
    secondary: '#805020',
    accent: '#66aacc',
    fog: '#1a1510',
    floor: '#d4c8b8',
    ceiling: '#333333',
    wall: '#8a7a6a',
  },
  atmosphere: {
    fogDensity: 0.025,
    fogColor: '#1a1510',
    particleType: 'dust',
    particleCount: 60,
    ambientSoundHint: 'mall_muzak',
  },
  furniture: [
    // Dead fountain
    { type: 'fountain_basin', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 3, y: 1, z: 3 } },
    // Empty planters
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'planter_box',
      position: { x: -5 + (i % 2) * 10, y: 0, z: -5 + Math.floor(i / 2) * 10 },
      rotation: { x: 0, y: i * Math.PI / 4, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Broken escalators
    { type: 'escalator_broken', position: { x: -12, y: 0, z: -12 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    { type: 'escalator_broken', position: { x: 12, y: 0, z: 12 }, rotation: { x: 0, y: -Math.PI * 3 / 4, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Shuttered storefronts (decorative wall features)
    ...Array.from({ length: 8 }, (_, i) => ({
      type: 'storefront_shuttered',
      position: { x: -13 + i * 3.5, y: 0, z: -14.8 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
  ],
  doorways: [
    { position: { x: 15, y: 0 }, facingAngle: -Math.PI / 2, width: 4, height: 4, wallSegmentIndex: 1, leadsTo: 7, glowColor: '#ffffff' },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 10,
    hasLighting: false,
    lightingType: 'none',
    hasSkylight: true,
    isVisible: true,
  },
  verticalElements: [
    {
      type: 'mezzanine' as const,
      footprint: [
        { x: -14, y: -14 }, { x: 14, y: -14 }, { x: 14, y: -11 }, { x: -14, y: -11 },
      ],
      heightDelta: 5,
      hasRail: true,
      accessible: false,
      connectsVia: 'none',
    },
  ],
};

// ============================================
// Template 7: The Bathroom
// ============================================
const bathroom: CuratedRoom = {
  templateId: 'bathroom',
  name: 'The Bathroom',
  archetype: RoomArchetype.BATHROOM,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 8, height: 3, depth: 12 },
  floorVertices: rectVertices(8, 12),
  wallSegments: wallsFromPolygon(rectVertices(8, 12), 3),
  lightSources: [
    // Harsh overhead fluorescent strips
    { position: { x: 0, y: 2.9, z: -3 }, color: '#f0f8ff', intensity: 1.2, type: 'rect', distance: 6 },
    { position: { x: 0, y: 2.9, z: 3 }, color: '#f0f8ff', intensity: 1.2, type: 'rect', distance: 6 },
  ],
  palette: {
    primary: '#f0f0f0',
    secondary: '#e0e8f0',
    accent: '#88ccdd',
    fog: '#202830',
    floor: '#dddddd',
    ceiling: '#f8f8f8',
    wall: '#f0f0f0',
  },
  atmosphere: {
    fogDensity: 0.02,
    fogColor: '#202830',
    particleType: 'drip',
    particleCount: 5,
    ambientSoundHint: 'dripping_echo',
  },
  furniture: [
    // 4 bathroom stalls
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'bathroom_stall',
      position: { x: -3.5, y: 0, z: -4.5 + i * 2.5 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Row of mirrors and sinks
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'sink_mirror',
      position: { x: 3.5, y: 0.9, z: -3 + i * 3 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
  ],
  doorways: [
    {
      position: { x: 0, y: 6 },
      facingAngle: Math.PI,
      width: 2.5,
      height: 2.8,
      wallSegmentIndex: 2,
      leadsTo: 8,
      glowColor: '#556677',
      label: 'EMPLOYEES ONLY',
    },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 3,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 8: The Subway Platform
// ============================================
const subwayPlatform: CuratedRoom = {
  templateId: 'subway_platform',
  name: 'The Subway Platform',
  archetype: RoomArchetype.GENERIC,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 5, height: 5, depth: 50 },
  floorVertices: rectVertices(5, 50),
  wallSegments: wallsFromPolygon(rectVertices(5, 50), 5),
  lightSources: [
    // Platform lights
    ...Array.from({ length: 6 }, (_, i) => ({
      position: { x: 0, y: 4.5, z: -20 + i * 8 },
      color: '#ffeecc',
      intensity: 0.6,
      type: 'point' as const,
      distance: 8,
      decay: 1.5,
    })),
  ],
  palette: {
    primary: '#cc9966',
    secondary: '#445566',
    accent: '#ffdd00',
    fog: '#111118',
    floor: '#888888',
    ceiling: '#555555',
    wall: '#ccbbaa',
  },
  atmosphere: {
    fogDensity: 0.035,
    fogColor: '#111118',
    particleType: 'dust',
    particleCount: 30,
    ambientSoundHint: 'subway_distant_rumble',
  },
  furniture: [
    // Metal benches
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'metal_bench',
      position: { x: -2, y: 0, z: -16 + i * 8 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Track rails (decorative)
    { type: 'track_rail', position: { x: 2.5, y: -1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 50 } },
    // Map display
    { type: 'transit_map', position: { x: -2.4, y: 1.5, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 2, y: 1.5, z: 1 } },
    // Yellow safety line (decorative)
    { type: 'safety_line', position: { x: 1.5, y: 0.01, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.3, y: 1, z: 50 } },
  ],
  doorways: [
    {
      position: { x: 0, y: -25 },
      facingAngle: 0,
      width: 3,
      height: 3.5,
      wallSegmentIndex: 0,
      leadsTo: 9,
      glowColor: '#aabb99',
      label: 'EXIT',
    },
  ],
  floorType: FloorType.CONCRETE,
  ceilingConfig: {
    height: 5,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
  verticalElements: [
    {
      type: 'pit' as const,
      footprint: [
        { x: 1.5, y: -25 }, { x: 2.5, y: -25 }, { x: 2.5, y: 25 }, { x: 1.5, y: 25 },
      ],
      heightDelta: -1.5,
      hasRail: false,
      accessible: false,
      connectsVia: 'none',
    },
  ],
};

// ============================================
// Template 9: The Server Room
// ============================================
const serverRoom: CuratedRoom = {
  templateId: 'server_room',
  name: 'The Server Room',
  archetype: RoomArchetype.GENERIC,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 6, height: 3.5, depth: 20 },
  floorVertices: rectVertices(6, 20),
  wallSegments: wallsFromPolygon(rectVertices(6, 20), 3.5),
  lightSources: [
    // Cool blue under-rack LED strips
    ...Array.from({ length: 8 }, (_, i) => ({
      position: { x: -2.5, y: 0.1, z: -8 + i * 2.5 },
      color: '#4488ff',
      intensity: 0.3,
      type: 'point' as const,
      distance: 3,
      decay: 2,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      position: { x: 2.5, y: 0.1, z: -8 + i * 2.5 },
      color: '#4488ff',
      intensity: 0.3,
      type: 'point' as const,
      distance: 3,
      decay: 2,
    })),
    // Overhead dim whites
    { position: { x: 0, y: 3.3, z: -5 }, color: '#ccddff', intensity: 0.2, type: 'point', distance: 6 },
    { position: { x: 0, y: 3.3, z: 5 }, color: '#ccddff', intensity: 0.2, type: 'point', distance: 6 },
  ],
  palette: {
    primary: '#4488ff',
    secondary: '#222233',
    accent: '#00ff88',
    fog: '#0a0a15',
    floor: '#333340',
    ceiling: '#222230',
    wall: '#2a2a3a',
  },
  atmosphere: {
    fogDensity: 0.04,
    fogColor: '#0a0a15',
    particleType: 'none',
    particleCount: 0,
    ambientSoundHint: 'server_hum',
  },
  furniture: [
    // Server racks on both sides
    ...Array.from({ length: 7 }, (_, i) => ({
      type: 'server_rack',
      position: { x: -2.5, y: 0, z: -7.5 + i * 2.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      type: 'server_rack',
      position: { x: 2.5, y: 0, z: -7.5 + i * 2.5 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Cable trays overhead
    { type: 'cable_tray', position: { x: 0, y: 3.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 1, z: 20 } },
    // Temperature display
    { type: 'temp_display', position: { x: -2.9, y: 2, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  ],
  doorways: [
    {
      position: { x: 0, y: 10 },
      facingAngle: Math.PI,
      width: 2.5,
      height: 3,
      wallSegmentIndex: 2,
      leadsTo: 10,
      glowColor: '#888844',
      label: 'SECURITY',
    },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 3.5,
    hasLighting: false,
    lightingType: 'none',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 10: The Liminal Classroom
// ============================================
const classroom: CuratedRoom = {
  templateId: 'classroom',
  name: 'The Liminal Classroom',
  archetype: RoomArchetype.GENERIC,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 10, height: 3.5, depth: 12 },
  floorVertices: rectVertices(10, 12),
  wallSegments: wallsFromPolygon(rectVertices(10, 12), 3.5),
  lightSources: [
    // Overhead fluorescents
    { position: { x: -2.5, y: 3.3, z: 0 }, color: '#fffff0', intensity: 0.8, type: 'rect', distance: 8 },
    { position: { x: 2.5, y: 3.3, z: 0 }, color: '#fffff0', intensity: 0.8, type: 'rect', distance: 8 },
    // Window light (overexposed white)
    { position: { x: 4.8, y: 2, z: 0 }, color: '#ffffff', intensity: 1.5, type: 'rect', distance: 6 },
  ],
  palette: {
    primary: '#d4d0c0',
    secondary: '#557755',
    accent: '#ffffff',
    fog: '#1a1a20',
    floor: '#a09880',
    ceiling: '#e0dcd0',
    wall: '#e8e4d8',
  },
  atmosphere: {
    fogDensity: 0.02,
    fogColor: '#1a1a20',
    particleType: 'dust',
    particleCount: 25,
    ambientSoundHint: 'classroom_silence',
  },
  furniture: [
    // 5 rows of 6 student desks
    ...Array.from({ length: 30 }, (_, i) => ({
      type: 'student_desk',
      position: { x: -3.5 + (i % 6) * 1.5, y: 0, z: -4 + Math.floor(i / 6) * 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Teacher's desk
    { type: 'teacher_desk', position: { x: 0, y: 0, z: -5.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1, z: 1 } },
    // Chalkboard
    { type: 'chalkboard', position: { x: 0, y: 1.5, z: -5.9 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 4, y: 1.5, z: 0.1 } },
    // Clock (hands don't move)
    { type: 'wall_clock', position: { x: -4.9, y: 2.8, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 0.4, y: 0.4, z: 0.1 } },
  ],
  doorways: [
    // Main door
    { position: { x: -5, y: 4 }, facingAngle: Math.PI / 2, width: 2.5, height: 3, wallSegmentIndex: 3, leadsTo: 11, glowColor: '#aabb88' },
    // Supply closet (deeper path)
    { position: { x: 3, y: 6 }, facingAngle: Math.PI, width: 2, height: 2.5, wallSegmentIndex: 2, leadsTo: 12, glowColor: '#443344' },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 3.5,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 11: The Parking Garage
// ============================================
const parkingGarage: CuratedRoom = {
  templateId: 'parking_garage',
  name: 'The Parking Garage',
  archetype: RoomArchetype.PARKING,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 30, height: 3, depth: 20 },
  floorVertices: rectVertices(30, 20),
  wallSegments: wallsFromPolygon(rectVertices(30, 20), 3),
  lightSources: [
    // Sparse sodium-vapor lights
    ...Array.from({ length: 4 }, (_, i) => ({
      position: { x: -10 + i * 7, y: 2.8, z: 0 },
      color: '#ff9930',
      intensity: 0.5,
      type: 'point' as const,
      distance: 10,
      decay: 1.5,
    })),
  ],
  palette: {
    primary: '#ff9930',
    secondary: '#555555',
    accent: '#ffcc00',
    fog: '#0a0a10',
    floor: '#555560',
    ceiling: '#444450',
    wall: '#666670',
  },
  atmosphere: {
    fogDensity: 0.04,
    fogColor: '#0a0a10',
    particleType: 'mist',
    particleCount: 40,
    ambientSoundHint: 'garage_drip',
  },
  furniture: [
    // Concrete pillars
    ...Array.from({ length: 6 }, (_, i) => ({
      type: 'concrete_pillar',
      position: { x: -10 + i * 5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.6, y: 3, z: 0.6 },
    })),
    // Painted lane markings
    { type: 'lane_marking', position: { x: 0, y: 0.01, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 30, y: 1, z: 20 } },
  ],
  doorways: [
    { position: { x: 15, y: 0 }, facingAngle: -Math.PI / 2, width: 4, height: 2.8, wallSegmentIndex: 1, leadsTo: 12, glowColor: '#889988' },
  ],
  floorType: FloorType.CONCRETE,
  ceilingConfig: {
    height: 3,
    hasLighting: false,
    lightingType: 'bare_bulb',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 12: The Laundromat
// ============================================
const laundromat: CuratedRoom = {
  templateId: 'laundromat',
  name: 'The Laundromat',
  archetype: RoomArchetype.STORE,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 10, height: 3.5, depth: 15 },
  floorVertices: rectVertices(10, 15),
  wallSegments: wallsFromPolygon(rectVertices(10, 15), 3.5),
  lightSources: [
    // Fluorescent tubes
    { position: { x: -2.5, y: 3.3, z: -3 }, color: '#f0f8ff', intensity: 0.9, type: 'rect', distance: 7 },
    { position: { x: 2.5, y: 3.3, z: 3 }, color: '#f0f8ff', intensity: 0.9, type: 'rect', distance: 7 },
    // Gentle blue glow from machines
    { position: { x: -4, y: 0.8, z: 0 }, color: '#aaddff', intensity: 0.2, type: 'point', distance: 4 },
  ],
  palette: {
    primary: '#b0c8e0',
    secondary: '#e0d8c8',
    accent: '#aaddff',
    fog: '#181820',
    floor: '#c0b8a8',
    ceiling: '#e8e4dc',
    wall: '#e0dcd0',
  },
  atmosphere: {
    fogDensity: 0.02,
    fogColor: '#181820',
    particleType: 'mist',
    particleCount: 10,
    ambientSoundHint: 'washing_hum',
  },
  furniture: [
    // Row of washing machines
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'washing_machine',
      position: { x: -4.2, y: 0, z: -5 + i * 2.5 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Row of dryers
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'dryer',
      position: { x: 4.2, y: 0, z: -5 + i * 2.5 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Folding table
    { type: 'folding_table', position: { x: 0, y: 0, z: 5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 1, z: 1 } },
    // Plastic chair
    { type: 'plastic_chair', position: { x: 0, y: 0, z: -6 }, rotation: { x: 0, y: 0.5, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
  ],
  doorways: [
    { position: { x: 0, y: 7.5 }, facingAngle: Math.PI, width: 3, height: 3, wallSegmentIndex: 2, leadsTo: 13, glowColor: '#998877' },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 3.5,
    hasLighting: true,
    lightingType: 'fluorescent',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 13: The Waiting Room
// ============================================
const waitingRoom: CuratedRoom = {
  templateId: 'waiting_room',
  name: 'The Waiting Room',
  archetype: RoomArchetype.WAITING_ROOM,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 12, height: 3.5, depth: 10 },
  floorVertices: rectVertices(12, 10),
  wallSegments: wallsFromPolygon(rectVertices(12, 10), 3.5),
  lightSources: [
    // Recessed ceiling lights
    { position: { x: -3, y: 3.3, z: 0 }, color: '#fff8e8', intensity: 0.6, type: 'rect', distance: 6 },
    { position: { x: 3, y: 3.3, z: 0 }, color: '#fff8e8', intensity: 0.6, type: 'rect', distance: 6 },
    // TV glow
    { position: { x: 0, y: 2, z: -4.8 }, color: '#8888ff', intensity: 0.15, type: 'point', distance: 4 },
  ],
  palette: {
    primary: '#d0c8b0',
    secondary: '#a09080',
    accent: '#8888ff',
    fog: '#181818',
    floor: '#b0a890',
    ceiling: '#e0dcd0',
    wall: '#d8d0c0',
  },
  atmosphere: {
    fogDensity: 0.02,
    fogColor: '#181818',
    particleType: 'none',
    particleCount: 0,
    ambientSoundHint: 'waiting_room_silence',
  },
  furniture: [
    // Rows of connected chairs
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'waiting_chairs',
      position: { x: -4 + i * 4, y: 0, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Magazine table
    { type: 'coffee_table', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Dead TV on wall
    { type: 'wall_tv', position: { x: 0, y: 2, z: -4.9 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 1.2, z: 0.1 } },
    // Reception window (shuttered)
    { type: 'reception_window', position: { x: -5.9, y: 1.2, z: -2 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 2, y: 1.5, z: 0.1 } },
  ],
  doorways: [
    { position: { x: 0, y: -5 }, facingAngle: 0, width: 3, height: 3, wallSegmentIndex: 0, leadsTo: 14, glowColor: '#aabbaa' },
  ],
  floorType: FloorType.CARPET,
  ceilingConfig: {
    height: 3.5,
    hasLighting: true,
    lightingType: 'recessed',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 14: The Elevator Bank
// ============================================
const elevatorBank: CuratedRoom = {
  templateId: 'elevator_bank',
  name: 'The Elevator Bank',
  archetype: RoomArchetype.ELEVATOR_BANK,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 8, height: 4, depth: 6 },
  floorVertices: rectVertices(8, 6),
  wallSegments: wallsFromPolygon(rectVertices(8, 6), 4),
  lightSources: [
    // Recessed downlights
    { position: { x: -2, y: 3.8, z: 0 }, color: '#fff0d0', intensity: 0.6, type: 'point', distance: 5, decay: 2 },
    { position: { x: 2, y: 3.8, z: 0 }, color: '#fff0d0', intensity: 0.6, type: 'point', distance: 5, decay: 2 },
    // Elevator indicator glow
    { position: { x: 0, y: 3.2, z: -2.8 }, color: '#ff4400', intensity: 0.15, type: 'point', distance: 2 },
  ],
  palette: {
    primary: '#c0a880',
    secondary: '#886644',
    accent: '#ff4400',
    fog: '#151520',
    floor: '#8a7a6a',
    ceiling: '#c0b8a8',
    wall: '#b8a890',
  },
  atmosphere: {
    fogDensity: 0.03,
    fogColor: '#151520',
    particleType: 'none',
    particleCount: 0,
    ambientSoundHint: 'elevator_ding',
  },
  furniture: [
    // 3 elevator doors (all closed, none functional)
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'elevator_door',
      position: { x: -3 + i * 3, y: 0, z: -2.9 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    })),
    // Floor indicator display
    { type: 'floor_indicator', position: { x: 0, y: 3.2, z: -2.85 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.5, y: 0.3, z: 0.05 } },
  ],
  doorways: [
    { position: { x: 0, y: 3 }, facingAngle: Math.PI, width: 3.5, height: 3.5, wallSegmentIndex: 2, leadsTo: 15, glowColor: '#776655' },
  ],
  floorType: FloorType.TILE,
  ceilingConfig: {
    height: 4,
    hasLighting: true,
    lightingType: 'recessed',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Template 15: The Living Room
// ============================================
const livingRoom: CuratedRoom = {
  templateId: 'living_room',
  name: 'The Living Room',
  archetype: RoomArchetype.LIVING_ROOM,
  shapeType: RoomShape.RECTANGLE,
  dimensions: { width: 8, height: 3, depth: 10 },
  floorVertices: rectVertices(8, 10),
  wallSegments: wallsFromPolygon(rectVertices(8, 10), 3),
  lightSources: [
    // Warm table lamp
    { position: { x: 3, y: 1, z: -3 }, color: '#ffdd99', intensity: 0.4, type: 'point', distance: 5, decay: 2 },
    // Dim overhead
    { position: { x: 0, y: 2.8, z: 0 }, color: '#ffe8cc', intensity: 0.3, type: 'point', distance: 6, decay: 1.5 },
    // TV glow
    { position: { x: 0, y: 1, z: -4.8 }, color: '#6688aa', intensity: 0.2, type: 'point', distance: 4 },
  ],
  palette: {
    primary: '#c8b090',
    secondary: '#8a7060',
    accent: '#6688aa',
    fog: '#151210',
    floor: '#6a5a48',
    ceiling: '#d8d0c0',
    wall: '#d0c8b8',
  },
  atmosphere: {
    fogDensity: 0.025,
    fogColor: '#151210',
    particleType: 'dust',
    particleCount: 10,
    ambientSoundHint: 'living_room_clock',
  },
  furniture: [
    // Couch
    { type: 'couch', position: { x: 0, y: 0, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2.5, y: 1, z: 1 } },
    // Coffee table
    { type: 'coffee_table', position: { x: 0, y: 0, z: -0.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.2, y: 0.5, z: 0.8 } },
    // TV on stand
    { type: 'tv_stand', position: { x: 0, y: 0, z: -4.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 1, z: 0.4 } },
    // Bookshelf
    { type: 'bookshelf', position: { x: -3.8, y: 0, z: -2 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 2, z: 0.4 } },
    // Floor lamp
    { type: 'floor_lamp', position: { x: 3, y: 0, z: -3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
    // Wall clock
    { type: 'wall_clock', position: { x: 3.9, y: 2.2, z: 0 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 }, scale: { x: 0.3, y: 0.3, z: 0.05 } },
  ],
  doorways: [
    { position: { x: -4, y: 3 }, facingAngle: Math.PI / 2, width: 2.5, height: 2.8, wallSegmentIndex: 3, leadsTo: 16, glowColor: '#554466' },
  ],
  floorType: FloorType.WOOD,
  ceilingConfig: {
    height: 3,
    hasLighting: true,
    lightingType: 'bare_bulb',
    hasSkylight: false,
    isVisible: true,
  },
};

// ============================================
// Master template registry
// ============================================

/** All 15 curated room templates, indexed 1–15 */
export const CURATED_ROOM_TEMPLATES: CuratedRoom[] = [
  infiniteHallway,   // Room 1
  emptyPool,         // Room 2
  backroomsOffice,   // Room 3
  stairwellNowhere,  // Room 4
  hotelCorridor,     // Room 5
  mallAtrium,        // Room 6
  bathroom,          // Room 7
  subwayPlatform,    // Room 8
  serverRoom,        // Room 9
  classroom,         // Room 10
  parkingGarage,     // Room 11
  laundromat,        // Room 12
  waitingRoom,       // Room 13
  elevatorBank,      // Room 14
  livingRoom,        // Room 15
];

/**
 * Get the curated room template for a given room index.
 * - Rooms 1–15: direct template lookup
 * - Rooms 16+: cycle through templates (index % 15)
 * - Room 0: returns null (entry room handled separately)
 *
 * @returns The curated template, or null for room 0
 */
export function getCuratedTemplate(roomIndex: number): CuratedRoom | null {
  if (roomIndex <= 0) return null;

  // Direct lookup for rooms 1–15
  if (roomIndex <= CURATED_ROOM_TEMPLATES.length) {
    return CURATED_ROOM_TEMPLATES[roomIndex - 1];
  }

  // Rooms 16+: cycle through templates
  const templateIndex = (roomIndex - 1) % CURATED_ROOM_TEMPLATES.length;
  return CURATED_ROOM_TEMPLATES[templateIndex];
}

/**
 * Check whether a room index has a curated template available.
 * All rooms index >= 1 have templates (direct or cycled).
 */
export function hasCuratedTemplate(roomIndex: number): boolean {
  return roomIndex >= 1;
}
