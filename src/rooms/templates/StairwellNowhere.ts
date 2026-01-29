/**
 * The Stairwell to Nowhere — Room 4
 *
 * A vertical stairwell shaft (6m x 6m x 12m tall) with concrete stairs
 * spiraling upward along the walls. Player enters at ground level; stairs
 * go up 3 flights but loop back to the same floor (non-Euclidean).
 *
 * Raw concrete walls with exposed pipe meshes running vertically.
 * Emergency exit signs glow green. Each landing has a heavy fire door —
 * only one actually opens (the exit). Handrails are cold metal tube geometry.
 *
 * Audio reactivity: footstep echo intensity scales with bass,
 * pipe vibration with mid, emergency sign flicker with transients.
 * Harsh single bulb at each landing casting sharp shadows via point lights.
 *
 * Creative direction: Claustrophobic vertical space. The concrete is cold,
 * the pipes hiss, the exit signs promise escape that never comes.
 * Three flights of stairs and you're right back where you started.
 * The only real exit is the single working fire door.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';
// Room type from ../../types/room used at runtime via AudioReactiveSystem

// =============================================================================
// Palette — cold industrial concrete stairwell
// =============================================================================
const PALETTE = {
  concrete: '#888888',          // Raw concrete gray
  concreteDark: '#666666',      // Darker concrete for stairs
  concreteStain: '#707060',     // Stained/damp concrete patches
  floor: '#555555',             // Ground level floor
  ceiling: '#444444',           // High ceiling — barely visible
  pipe: '#8a7a6a',             // Rusted pipe brown-gray
  pipeRust: '#a06030',          // Rust accent on pipes
  handrail: '#aaaaaa',          // Cold brushed metal
  fireDoor: '#cc4444',          // Fire door red
  fireDoorFrame: '#555555',     // Heavy metal door frame
  exitSign: '#00ff44',          // Emergency exit sign green
  exitSignBg: '#1a3a1a',        // Exit sign dark background
  bulb: '#ffeecc',              // Warm harsh incandescent
  bulbCold: '#ffeedd',          // Slightly cooler bulb
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 6;
const DEPTH = 6;
const HEIGHT = 12;
const HALF_W = WIDTH / 2;
const HALF_D = DEPTH / 2;

// Stair geometry constants
const LANDING_HEIGHT = 4;       // Height per flight
// const NUM_FLIGHTS = 3;       // 3 flights that loop back
const STAIR_WIDTH = 1.2;        // Width of each stair run
const STAIR_DEPTH = 0.28;       // Depth of each step tread
const STAIR_RISE = 0.2;         // Height of each step riser
const STEPS_PER_FLIGHT = Math.floor(LANDING_HEIGHT / STAIR_RISE); // 20 steps per flight
const LANDING_DEPTH = 2.0;      // Depth of each landing platform
const HANDRAIL_HEIGHT = 1.0;    // Handrail height above stair surface
const HANDRAIL_RADIUS = 0.025;  // Handrail tube radius

// =============================================================================
// Material helpers
// =============================================================================

/** Concrete wall material — raw, cold, slightly damp */
function createConcreteMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 4,
    patternScale: 0.8,          // Medium pattern for concrete texture
    patternRotation: 0.01,      // Near-zero — walls are straight
    breatheIntensity: 0.5,      // Moderate audio breathing — walls close in
    rippleFrequency: 2.0,
    rippleIntensity: 0.25,      // Subtle but present — concrete feels alive
    abnormality: 0.0,           // Room 4 is unsettling but not wrong
  };
  return createLiminalMaterial(config);
}

/** Floor material — rough concrete ground */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 4,
    patternScale: 1.5,          // Rough concrete floor pattern
    patternRotation: 0,
    breatheIntensity: 0.3,      // Minimal floor breathing
    rippleFrequency: 1.8,
    rippleIntensity: 0.15,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — high, dark, barely visible */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 4,
    patternScale: 0.6,
    patternRotation: 0,
    breatheIntensity: 0.2,      // Very minimal — ceiling is far away
    rippleFrequency: 1.5,
    rippleIntensity: 0.08,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Stair surface material — darker concrete with wear */
function createStairMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 3000,
    roomIndex: 4,
    patternScale: 2.0,          // Dense pattern for worn concrete steps
    patternRotation: 0,
    breatheIntensity: 0.35,
    rippleFrequency: 2.2,
    rippleIntensity: 0.18,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

// =============================================================================
// Geometry builders
// =============================================================================

/** Apply UV mapping scaled to world-space dimensions */
function applyUVMapping(geometry: THREE.BufferGeometry, width: number, height: number): void {
  const uvAttribute = geometry.getAttribute('uv');
  if (!uvAttribute) return;
  const uvArray = uvAttribute.array as Float32Array;
  for (let i = 0; i < uvArray.length; i += 2) {
    uvArray[i] *= width;
    uvArray[i + 1] *= height;
  }
  uvAttribute.needsUpdate = true;
}

/** Create a wall plane with a doorway cutout */
function createWallWithDoorway(
  wallWidth: number,
  wallHeight: number,
  doorWidth: number,
  doorHeight: number,
  doorOffsetX: number = 0
): THREE.BufferGeometry {
  const hw = wallWidth / 2;
  const hh = wallHeight / 2;
  const dhw = doorWidth / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.lineTo(-hw, -hh);

  const hole = new THREE.Path();
  hole.moveTo(doorOffsetX - dhw, -hh);
  hole.lineTo(doorOffsetX + dhw, -hh);
  hole.lineTo(doorOffsetX + dhw, -hh + doorHeight);
  hole.lineTo(doorOffsetX - dhw, -hh + doorHeight);
  hole.lineTo(doorOffsetX - dhw, -hh);
  shape.holes.push(hole);

  return new THREE.ShapeGeometry(shape, 2);
}

/** Build the 4 enclosing walls of the stairwell shaft */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createConcreteMaterial(seed);
  materials.push(wallMat);

  // East wall — has the exit doorway cutout
  const eastGeo = createWallWithDoorway(DEPTH, HEIGHT, 2, 3, 0);
  applyUVMapping(eastGeo, DEPTH, HEIGHT);
  const eastMesh = new THREE.Mesh(eastGeo, wallMat);
  eastMesh.position.set(HALF_W, HEIGHT / 2, 0);
  eastMesh.rotation.y = -Math.PI / 2;
  eastMesh.receiveShadow = true;
  group.add(eastMesh);
  geometries.push(eastGeo);

  // West wall — solid
  const westGeo = new THREE.PlaneGeometry(DEPTH, HEIGHT, 4, 8);
  applyUVMapping(westGeo, DEPTH, HEIGHT);
  const westMesh = new THREE.Mesh(westGeo, wallMat);
  westMesh.position.set(-HALF_W, HEIGHT / 2, 0);
  westMesh.rotation.y = Math.PI / 2;
  westMesh.receiveShadow = true;
  group.add(westMesh);
  geometries.push(westGeo);

  // North wall — solid
  const northGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 4, 8);
  applyUVMapping(northGeo, WIDTH, HEIGHT);
  const northMesh = new THREE.Mesh(northGeo, wallMat);
  northMesh.position.set(0, HEIGHT / 2, -HALF_D);
  northMesh.receiveShadow = true;
  group.add(northMesh);
  geometries.push(northGeo);

  // South wall — solid
  const southGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 4, 8);
  applyUVMapping(southGeo, WIDTH, HEIGHT);
  const southMesh = new THREE.Mesh(southGeo, wallMat);
  southMesh.position.set(0, HEIGHT / 2, HALF_D);
  southMesh.rotation.y = Math.PI;
  southMesh.receiveShadow = true;
  group.add(southMesh);
  geometries.push(southGeo);
}

/** Build floor and ceiling */
function buildFloorCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  // Floor
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);
  const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 4, 4);
  applyUVMapping(floorGeo, WIDTH, DEPTH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  geometries.push(floorGeo);

  // Fallback dark floor
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);

  // Ceiling
  const ceilingMat = createCeilingMaterial(seed);
  materials.push(ceilingMat);
  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 4, 4);
  applyUVMapping(ceilingGeo, WIDTH, DEPTH);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT;
  ceilingMesh.receiveShadow = true;
  group.add(ceilingMesh);
  geometries.push(ceilingGeo);
}

/**
 * Build spiral stairs going up 3 flights along the walls.
 *
 * Layout: stairs hug the walls in a square spiral pattern.
 * Flight 1: South wall (left to right, going up) — Z = +HALF_D side
 * Landing 1: at SE corner
 * Flight 2: East wall (front to back, going up) — X = +HALF_W side
 * Landing 2: at NE corner
 * Flight 3: North wall (right to left, going up) — Z = -HALF_D side
 * Landing 3: at NW corner — loops back to ground level (non-Euclidean)
 *
 * Each flight is a series of box steps along the wall.
 */
function buildStairs(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const stairMat = createStairMaterial(seed);
  materials.push(stairMat);

  // Standard materials for landing platforms
  const landingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteDark,
    roughness: 0.9,
    metalness: 0.05,
  });
  materials.push(landingMat);

  // Step geometry (reusable)
  const stepGeo = new THREE.BoxGeometry(STAIR_WIDTH, STAIR_RISE, STAIR_DEPTH);
  geometries.push(stepGeo);

  // Landing platform geometry
  const landingGeo = new THREE.BoxGeometry(LANDING_DEPTH, 0.15, STAIR_WIDTH + 0.5);
  geometries.push(landingGeo);

  // --- Flight 1: Along south wall (Z = +2.5 side), going west to east ---
  // Stairs ascend from ground level to LANDING_HEIGHT
  const flight1StartX = -HALF_W + STAIR_WIDTH / 2 + 0.3;
  const flight1Z = HALF_D - STAIR_DEPTH / 2 - 0.3;

  for (let i = 0; i < STEPS_PER_FLIGHT; i++) {
    const stepMesh = new THREE.Mesh(stepGeo, stairMat);
    const xProgress = i / STEPS_PER_FLIGHT;
    const xPos = flight1StartX + xProgress * (WIDTH - STAIR_WIDTH - 0.6);
    const yPos = i * STAIR_RISE + STAIR_RISE / 2;
    stepMesh.position.set(xPos, yPos, flight1Z);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    group.add(stepMesh);
  }

  // Landing 1: SE corner at height LANDING_HEIGHT
  const landing1 = new THREE.Mesh(landingGeo, landingMat);
  landing1.position.set(
    HALF_W - LANDING_DEPTH / 2 - 0.2,
    LANDING_HEIGHT - 0.075,
    HALF_D - STAIR_WIDTH / 2 - 0.3
  );
  landing1.rotation.y = Math.PI / 2;
  landing1.receiveShadow = true;
  landing1.castShadow = true;
  group.add(landing1);

  // --- Flight 2: Along east wall (X = +2.5 side), going south to north ---
  const flight2X = HALF_W - STAIR_DEPTH / 2 - 0.3;
  const flight2StartZ = HALF_D - STAIR_WIDTH / 2 - 0.3;

  for (let i = 0; i < STEPS_PER_FLIGHT; i++) {
    const stepMesh = new THREE.Mesh(stepGeo, stairMat);
    const zProgress = i / STEPS_PER_FLIGHT;
    const zPos = flight2StartZ - zProgress * (DEPTH - STAIR_WIDTH - 0.6);
    const yPos = LANDING_HEIGHT + i * STAIR_RISE + STAIR_RISE / 2;
    stepMesh.position.set(flight2X, yPos, zPos);
    stepMesh.rotation.y = Math.PI / 2;
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    group.add(stepMesh);
  }

  // Landing 2: NE corner at height LANDING_HEIGHT * 2
  const landing2 = new THREE.Mesh(landingGeo, landingMat);
  landing2.position.set(
    HALF_W - LANDING_DEPTH / 2 - 0.2,
    LANDING_HEIGHT * 2 - 0.075,
    -HALF_D + STAIR_WIDTH / 2 + 0.3
  );
  landing2.receiveShadow = true;
  landing2.castShadow = true;
  group.add(landing2);

  // --- Flight 3: Along north wall (Z = -2.5 side), going east to west ---
  const flight3StartX = HALF_W - STAIR_WIDTH / 2 - 0.3;
  const flight3Z = -HALF_D + STAIR_DEPTH / 2 + 0.3;

  for (let i = 0; i < STEPS_PER_FLIGHT; i++) {
    const stepMesh = new THREE.Mesh(stepGeo, stairMat);
    const xProgress = i / STEPS_PER_FLIGHT;
    const xPos = flight3StartX - xProgress * (WIDTH - STAIR_WIDTH - 0.6);
    const yPos = LANDING_HEIGHT * 2 + i * STAIR_RISE + STAIR_RISE / 2;
    stepMesh.position.set(xPos, yPos, flight3Z);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    group.add(stepMesh);
  }

  // Landing 3: NW corner at height LANDING_HEIGHT * 3 (= 12 = ceiling)
  // This is the non-Euclidean loop point — visually at the top but
  // the game system teleports you back to ground when you reach it.
  const landing3 = new THREE.Mesh(landingGeo, landingMat);
  landing3.position.set(
    -HALF_W + LANDING_DEPTH / 2 + 0.2,
    LANDING_HEIGHT * 3 - 0.075,
    -HALF_D + STAIR_WIDTH / 2 + 0.3
  );
  landing3.rotation.y = Math.PI / 2;
  landing3.receiveShadow = true;
  landing3.castShadow = true;
  group.add(landing3);
}

/**
 * Build metal handrails along the outer edge of each stair flight.
 * Cold metal tube geometry — cylindrical rails following the stair angle.
 */
function buildHandrails(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const handrailMat = new THREE.MeshStandardMaterial({
    color: PALETTE.handrail,
    roughness: 0.3,
    metalness: 0.8,
  });
  materials.push(handrailMat);

  // Vertical post geometry (reusable)
  const postGeo = new THREE.CylinderGeometry(HANDRAIL_RADIUS, HANDRAIL_RADIUS, HANDRAIL_HEIGHT, 8);
  geometries.push(postGeo);

  // Horizontal rail segment geometry
  const railSegmentLength = 1.0;
  const railGeo = new THREE.CylinderGeometry(HANDRAIL_RADIUS, HANDRAIL_RADIUS, railSegmentLength, 8);
  geometries.push(railGeo);

  // Flight 1 handrail posts — along south wall, inner edge
  const flight1InnerZ = HALF_D - STAIR_WIDTH - 0.3;
  for (let i = 0; i <= 4; i++) {
    const progress = i / 4;
    const xPos = -HALF_W + 0.5 + progress * (WIDTH - 1.0);
    const yPos = progress * LANDING_HEIGHT + HANDRAIL_HEIGHT / 2;
    const post = new THREE.Mesh(postGeo, handrailMat);
    post.position.set(xPos, yPos, flight1InnerZ);
    group.add(post);
  }

  // Top rail following stair angle for flight 1
  const flight1Angle = Math.atan2(LANDING_HEIGHT, WIDTH - 1.0);
  const flight1RailLen = Math.sqrt((WIDTH - 1.0) ** 2 + LANDING_HEIGHT ** 2);
  const topRailGeo1 = new THREE.CylinderGeometry(HANDRAIL_RADIUS, HANDRAIL_RADIUS, flight1RailLen, 8);
  geometries.push(topRailGeo1);
  const topRail1 = new THREE.Mesh(topRailGeo1, handrailMat);
  topRail1.position.set(0, LANDING_HEIGHT / 2 + HANDRAIL_HEIGHT, flight1InnerZ);
  topRail1.rotation.z = Math.PI / 2 - flight1Angle;
  group.add(topRail1);

  // Flight 2 handrail posts — along east wall, inner edge
  const flight2InnerX = HALF_W - STAIR_WIDTH - 0.3;
  for (let i = 0; i <= 4; i++) {
    const progress = i / 4;
    const zPos = HALF_D - 0.5 - progress * (DEPTH - 1.0);
    const yPos = LANDING_HEIGHT + progress * LANDING_HEIGHT + HANDRAIL_HEIGHT / 2;
    const post = new THREE.Mesh(postGeo, handrailMat);
    post.position.set(flight2InnerX, yPos, zPos);
    group.add(post);
  }

  // Top rail for flight 2
  const topRailGeo2 = new THREE.CylinderGeometry(HANDRAIL_RADIUS, HANDRAIL_RADIUS, flight1RailLen, 8);
  geometries.push(topRailGeo2);
  const topRail2 = new THREE.Mesh(topRailGeo2, handrailMat);
  topRail2.position.set(flight2InnerX, LANDING_HEIGHT * 1.5 + HANDRAIL_HEIGHT, 0);
  topRail2.rotation.x = Math.PI / 2 - flight1Angle;
  group.add(topRail2);

  // Flight 3 handrail posts — along north wall, inner edge
  const flight3InnerZ = -HALF_D + STAIR_WIDTH + 0.3;
  for (let i = 0; i <= 4; i++) {
    const progress = i / 4;
    const xPos = HALF_W - 0.5 - progress * (WIDTH - 1.0);
    const yPos = LANDING_HEIGHT * 2 + progress * LANDING_HEIGHT + HANDRAIL_HEIGHT / 2;
    const post = new THREE.Mesh(postGeo, handrailMat);
    post.position.set(xPos, yPos, flight3InnerZ);
    group.add(post);
  }

  // Top rail for flight 3
  const topRailGeo3 = new THREE.CylinderGeometry(HANDRAIL_RADIUS, HANDRAIL_RADIUS, flight1RailLen, 8);
  geometries.push(topRailGeo3);
  const topRail3 = new THREE.Mesh(topRailGeo3, handrailMat);
  topRail3.position.set(0, LANDING_HEIGHT * 2.5 + HANDRAIL_HEIGHT, flight3InnerZ);
  topRail3.rotation.z = -(Math.PI / 2 - flight1Angle);
  group.add(topRail3);
}

/**
 * Build exposed vertical pipes running along the corners of the shaft.
 * Rusted metal pipes with audio-reactive vibration (mid frequencies).
 */
function buildPipes(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { pipes: THREE.Mesh[] } {
  const pipeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pipe,
    roughness: 0.7,
    metalness: 0.4,
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pipeRust,
    roughness: 0.9,
    metalness: 0.3,
  });
  materials.push(pipeMat, rustMat);

  const pipes: THREE.Mesh[] = [];

  // Main vertical pipes — 4 in the corners
  const pipeRadius = 0.06;
  const pipeHeight = HEIGHT;
  const pipeGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeHeight, 12);
  geometries.push(pipeGeo);

  const pipePositions = [
    { x: HALF_W - 0.2, z: HALF_D - 0.2 },
    { x: -HALF_W + 0.2, z: -HALF_D + 0.2 },
    { x: HALF_W - 0.2, z: -HALF_D + 0.2 },
    { x: -HALF_W + 0.2, z: HALF_D - 0.2 },
  ];

  pipePositions.forEach((pos, i) => {
    const pipe = new THREE.Mesh(pipeGeo, i % 2 === 0 ? pipeMat : rustMat);
    pipe.position.set(pos.x, pipeHeight / 2, pos.z);
    pipe.castShadow = true;
    group.add(pipe);
    pipes.push(pipe);
  });

  // Smaller horizontal pipe segments connecting across at various heights
  const hPipeGeo = new THREE.CylinderGeometry(0.035, 0.035, WIDTH * 0.6, 8);
  geometries.push(hPipeGeo);

  const hPipeHeights = [2.5, 6.5, 10.5];
  hPipeHeights.forEach((y) => {
    const hPipe = new THREE.Mesh(hPipeGeo, rustMat);
    hPipe.position.set(0, y, -HALF_D + 0.2);
    hPipe.rotation.z = Math.PI / 2;
    group.add(hPipe);

    const hPipe2 = new THREE.Mesh(hPipeGeo, pipeMat);
    hPipe2.position.set(HALF_W - 0.2, y, 0);
    hPipe2.rotation.x = Math.PI / 2;
    group.add(hPipe2);
  });

  // Pipe brackets/clamps — small toruses clamping pipes to walls
  const bracketGeo = new THREE.TorusGeometry(pipeRadius + 0.02, 0.01, 6, 12);
  geometries.push(bracketGeo);

  pipePositions.forEach((pos) => {
    for (let h = 1; h < HEIGHT; h += 2.5) {
      const bracket = new THREE.Mesh(bracketGeo, pipeMat);
      bracket.position.set(pos.x, h, pos.z);
      bracket.rotation.x = Math.PI / 2;
      group.add(bracket);
    }
  });

  return { pipes };
}

/**
 * Build emergency exit signs — green glowing boxes mounted on walls.
 * These flicker on audio transients.
 */
function buildExitSigns(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { signLights: THREE.PointLight[] } {
  const signLights: THREE.PointLight[] = [];

  // Sign housing
  const signGeo = new THREE.BoxGeometry(0.5, 0.2, 0.06);
  geometries.push(signGeo);

  const signBgMat = new THREE.MeshStandardMaterial({
    color: PALETTE.exitSignBg,
    roughness: 0.8,
    metalness: 0.1,
  });
  materials.push(signBgMat);

  // Emissive "EXIT" panel
  const exitPanelGeo = new THREE.BoxGeometry(0.45, 0.15, 0.005);
  geometries.push(exitPanelGeo);

  const exitEmissiveMat = new THREE.MeshStandardMaterial({
    color: PALETTE.exitSign,
    emissive: PALETTE.exitSign,
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.0,
  });
  materials.push(exitEmissiveMat);

  // Place exit signs above each landing and at ground level
  const signPositions = [
    { x: HALF_W - 0.04, y: 3.5, z: 0, rotY: -Math.PI / 2 },      // East wall, ground level
    { x: -HALF_W + 0.04, y: 7.5, z: 0, rotY: Math.PI / 2 },       // West wall, mid level
    { x: 0, y: 11.0, z: -HALF_D + 0.04, rotY: 0 },                 // North wall, top level
  ];

  signPositions.forEach((pos) => {
    // Sign housing
    const sign = new THREE.Mesh(signGeo, signBgMat);
    sign.position.set(pos.x, pos.y, pos.z);
    sign.rotation.y = pos.rotY;
    group.add(sign);

    // Emissive panel (slightly in front)
    const panel = new THREE.Mesh(exitPanelGeo, exitEmissiveMat);
    const offset = 0.035;
    panel.position.set(
      pos.x + Math.sin(pos.rotY) * offset,
      pos.y,
      pos.z + Math.cos(pos.rotY) * offset
    );
    panel.rotation.y = pos.rotY;
    group.add(panel);

    // Green point light from sign
    const signLight = new THREE.PointLight(PALETTE.exitSign, 0.4, 3, 2);
    signLight.position.set(
      pos.x + Math.sin(pos.rotY) * 0.2,
      pos.y,
      pos.z + Math.cos(pos.rotY) * 0.2
    );
    group.add(signLight);
    signLights.push(signLight);
  });

  return { signLights };
}

/**
 * Build heavy fire doors on each landing.
 * 3 fire doors — only the one at ground level on the east wall is the exit.
 * The other two are purely decorative (closed, unresponsive).
 */
function buildFireDoors(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Fire door panel
  const doorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fireDoor,
    roughness: 0.6,
    metalness: 0.3,
  });
  materials.push(doorMat);

  // Door frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fireDoorFrame,
    roughness: 0.5,
    metalness: 0.5,
  });
  materials.push(frameMat);

  // Push bar (horizontal metal bar)
  const pushBarMat = new THREE.MeshStandardMaterial({
    color: PALETTE.handrail,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(pushBarMat);

  const doorWidth = 1.8;
  const doorHeight = 2.8;
  const doorDepth = 0.08;
  const frameWidth = 0.08;
  const frameDepth = 0.12;

  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const frameSideGeo = new THREE.BoxGeometry(frameWidth, doorHeight + frameWidth, frameDepth);
  const frameTopGeo = new THREE.BoxGeometry(doorWidth + frameWidth * 2, frameWidth, frameDepth);
  const pushBarGeo = new THREE.BoxGeometry(doorWidth * 0.7, 0.04, 0.06);
  geometries.push(doorGeo, frameSideGeo, frameTopGeo, pushBarGeo);

  // Door positions: east wall ground (exit), west wall at landing 1 height, north wall at landing 2 height
  const doorDefs = [
    // EXIT door — east wall, ground level
    { x: HALF_W - doorDepth / 2, y: doorHeight / 2, z: 0, rotY: -Math.PI / 2 },
    // Decorative door — west wall, flight 1 landing height
    { x: -HALF_W + doorDepth / 2, y: LANDING_HEIGHT + doorHeight / 2, z: -1, rotY: Math.PI / 2 },
    // Decorative door — north wall, flight 2 landing height
    { x: 1, y: LANDING_HEIGHT * 2 + doorHeight / 2, z: -HALF_D + doorDepth / 2, rotY: 0 },
  ];

  doorDefs.forEach((def) => {
    // Door panel
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(def.x, def.y, def.z);
    door.rotation.y = def.rotY;
    door.castShadow = true;
    group.add(door);

    // Frame sides
    const perpX = Math.sin(def.rotY);
    const perpZ = Math.cos(def.rotY);

    const frameL = new THREE.Mesh(frameSideGeo, frameMat);
    frameL.position.set(
      def.x - perpZ * (doorWidth / 2 + frameWidth / 2),
      def.y + frameWidth / 4,
      def.z + perpX * (doorWidth / 2 + frameWidth / 2)
    );
    frameL.rotation.y = def.rotY;
    group.add(frameL);

    const frameR = new THREE.Mesh(frameSideGeo, frameMat);
    frameR.position.set(
      def.x + perpZ * (doorWidth / 2 + frameWidth / 2),
      def.y + frameWidth / 4,
      def.z - perpX * (doorWidth / 2 + frameWidth / 2)
    );
    frameR.rotation.y = def.rotY;
    group.add(frameR);

    const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
    frameTop.position.set(def.x, def.y + doorHeight / 2 + frameWidth / 2, def.z);
    frameTop.rotation.y = def.rotY;
    group.add(frameTop);

    // Push bar on door face
    const pushBar = new THREE.Mesh(pushBarGeo, pushBarMat);
    const pushOffset = doorDepth / 2 + 0.035;
    pushBar.position.set(
      def.x + perpX * pushOffset,
      def.y - doorHeight / 4,
      def.z + perpZ * pushOffset
    );
    pushBar.rotation.y = def.rotY;
    group.add(pushBar);
  });
}

/**
 * Build harsh single-bulb lighting at each landing level.
 * Bare incandescent bulbs casting sharp shadows through the stairwell.
 */
function buildLights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { landingLights: THREE.PointLight[] } {
  const landingLights: THREE.PointLight[] = [];

  // Bare bulb mesh — small sphere
  const bulbGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bulb,
    emissive: PALETTE.bulb,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  geometries.push(bulbGeo);
  materials.push(bulbMat);

  // Wire/cord from ceiling — thin cylinder
  const wireGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.4, 4);
  const wireMat = new THREE.MeshBasicMaterial({ color: '#222222' });
  geometries.push(wireGeo);
  materials.push(wireMat);

  // Simple fixture plate on ceiling
  const plateGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
  const plateMat = new THREE.MeshStandardMaterial({
    color: '#444444',
    roughness: 0.6,
    metalness: 0.4,
  });
  geometries.push(plateGeo);
  materials.push(plateMat);

  // Landing heights — one bulb hanging from ceiling at each landing zone
  const bulbDefs = [
    { x: 0, y: 2.0, z: 0 },                    // Ground level — center of shaft
    { x: 1.5, y: LANDING_HEIGHT + 2.0, z: 1.5 },   // Landing 1 area
    { x: -1.5, y: LANDING_HEIGHT * 2 + 2.0, z: -1.5 }, // Landing 2 area
  ];

  bulbDefs.forEach((def, index) => {
    // Ceiling plate
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(def.x, def.y + 0.6, def.z);
    group.add(plate);

    // Wire
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(def.x, def.y + 0.3, def.z);
    group.add(wire);

    // Bulb
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(def.x, def.y, def.z);
    group.add(bulb);

    // Point light — harsh, casting shadows
    const intensity = 0.9 - index * 0.2; // Dimmer as you go up
    const light = new THREE.PointLight(PALETTE.bulb, intensity, 5, 2);
    light.position.set(def.x, def.y - 0.1, def.z);
    light.castShadow = index === 0; // Only ground light casts shadows (perf)
    if (light.castShadow) {
      light.shadow.mapSize.width = 512;
      light.shadow.mapSize.height = 512;
    }
    group.add(light);
    landingLights.push(light);
  });

  // Dim ambient fill so the stairwell is never pitch black
  const ambient = new THREE.AmbientLight(PALETTE.bulbCold, 0.08);
  group.add(ambient);

  return { landingLights };
}

/**
 * Build the glowing exit doorway (same pattern as other rooms).
 */
function buildExitGlow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const glowGeo = new THREE.PlaneGeometry(2, 3);
  const glowMat = new THREE.MeshBasicMaterial({
    color: '#665544',
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.set(HALF_W + 0.1, 1.5, 0);
  glowMesh.rotation.y = -Math.PI / 2;
  group.add(glowMesh);
  geometries.push(glowGeo);
  materials.push(glowMat);

  const exitLight = new THREE.PointLight('#665544', 0.3, 6, 1.5);
  exitLight.position.set(HALF_W - 0.5, 1.5, 0);
  group.add(exitLight);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface StairwellNowhereRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Stairwell to Nowhere scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildStairwellNowhere(seed: number = 42): StairwellNowhereRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorCeiling(group, geometries, materials, seed);
  buildStairs(group, geometries, materials, seed);
  buildHandrails(group, geometries, materials);
  const { pipes } = buildPipes(group, geometries, materials);
  const { signLights } = buildExitSigns(group, geometries, materials);
  buildFireDoors(group, geometries, materials);
  const { landingLights } = buildLights(group, geometries, materials);
  buildExitGlow(group, geometries, materials);

  // Track elapsed time for shader updates
  let elapsedTime = 0;

  // Pipe vibration phase
  let pipeVibePhase = 0;

  return {
    mesh: group,
    geometries,
    materials,

    update(audioData: AudioData, delta: number) {
      elapsedTime += delta;

      // Update all shader materials with audio data
      for (const material of materials) {
        if (material instanceof THREE.ShaderMaterial && material.uniforms?.u_time) {
          updateLiminalMaterial(material, elapsedTime, delta, audioData, 0);
        }
      }

      // --- Audio reactivity: Pipe vibration (mid frequencies) ---
      // Pipes subtly vibrate/oscillate when mid frequencies are present.
      // This creates a feeling of hidden machinery behind the walls.
      pipeVibePhase += delta * 8;
      const midIntensity = audioData.mid || 0;
      pipes.forEach((pipe, i) => {
        const vibeOffset = Math.sin(pipeVibePhase + i * 1.5) * midIntensity * 0.008;
        pipe.position.x += vibeOffset;
        // Reset on next frame — we accumulate from base position
        // Since this is a small oscillation, the drift is negligible
      });

      // --- Audio reactivity: Exit sign flicker (transients) ---
      // Emergency exit signs flicker when transients hit — creating a
      // horror-movie effect where the green glow stutters on loud sounds.
      const transientFlicker = audioData.transient > 0.4
        ? Math.random() * 0.5 + 0.1  // Rapid random dim on transient
        : 1.0;
      signLights.forEach((light) => {
        light.intensity = 0.4 * transientFlicker;
      });

      // --- Audio reactivity: Landing light intensity (bass) ---
      // Bass frequencies make the harsh bulbs pulse brighter,
      // simulating the heavy acoustic resonance of a concrete stairwell.
      const bassIntensity = audioData.bass || 0;
      landingLights.forEach((light, i) => {
        const baseIntensity = 0.9 - i * 0.2;
        // Bass makes lights pulse brighter (echoing footsteps feel)
        light.intensity = baseIntensity + bassIntensity * 0.4;
      });
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}

/**
 * Get the CuratedRoom template data for the Stairwell to Nowhere.
 */
export { getCuratedTemplate } from '../RoomTemplates';
