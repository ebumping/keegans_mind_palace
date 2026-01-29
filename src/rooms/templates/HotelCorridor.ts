/**
 * The Hotel Corridor — Room 5
 *
 * An L-shaped hotel hallway (4m wide, 30m on long arm, 20m on short arm,
 * 3.5m tall). Deep red/burgundy patterned carpet (Overlook Hotel inspired
 * geometric pattern via shader). Ornate wallpaper on upper walls, dark wood
 * wainscoting on lower third (two-tone wall materials).
 *
 * Room doors with brass number plates every 4m on both sides — numbers are
 * wrong/impossible (Room 237, Room -1, Room infinity). Warm wall sconce
 * lighting between doors casting pools of amber light.
 *
 * A single room service cart mesh abandoned mid-corridor with a covered plate.
 * Around the L-corner, the carpet pattern subtly shifts color (same pattern,
 * different hue — wrongness). Exit at the far end of the short arm.
 *
 * Creative direction: The Shining meets liminal horror. Warm, inviting colors
 * masking deep wrongness. The carpet pattern shift is the tell — you notice
 * it and can't un-notice it. The impossible room numbers confirm you are
 * somewhere that should not exist.
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
// Palette — warm hotel burgundy with amber lighting
// =============================================================================
const PALETTE = {
  carpetRed: '#8b2020',           // Deep burgundy carpet
  carpetRedShifted: '#6b2040',    // Shifted hue for wrongness past the L-corner
  wainscoting: '#4a2010',         // Dark wood wainscoting brown
  wainscotingTrim: '#5a3020',     // Slightly lighter trim strip
  wallpaper: '#d8c8b0',           // Upper wall warm cream/beige
  wallpaperAccent: '#c4a882',     // Wallpaper pattern accent
  ceiling: '#e8d8c0',             // Warm off-white ceiling
  doorWood: '#6a4020',            // Hotel room door — dark wood
  doorFrame: '#5a3018',           // Door frame — slightly darker
  brass: '#ccaa44',               // Brass number plates & hardware
  brassGlow: '#ffcc88',           // Brass glow / warm sconce light
  sconce: '#ffcc88',              // Amber sconce light color
  sconceMetal: '#aa8833',         // Sconce fixture metal
  cartMetal: '#aaaaaa',           // Room service cart — stainless steel
  cartCloth: '#f0ece0',           // White cloth on cart plate
  exitGlow: '#6688aa',            // Cool blue-gray exit glow (contrast)
};

// =============================================================================
// Dimensions — L-shaped corridor
// =============================================================================

// Long arm: runs along Z axis (from -15 to +15 = 30m), centered at X=0
const LONG_ARM_WIDTH = 4;
const LONG_ARM_DEPTH = 30;
const HALF_LAW = LONG_ARM_WIDTH / 2;   // 2
const HALF_LAD = LONG_ARM_DEPTH / 2;   // 15

// Short arm: branches off at the far end (+Z side), runs along +X axis
// Short arm starts at X = HALF_LAW (= 2), goes to X = HALF_LAW + 20 (= 22)
// Short arm Z range: from LONG_ARM_DEPTH/2 - LONG_ARM_WIDTH to LONG_ARM_DEPTH/2
//   = from 11 to 15
const SHORT_ARM_LENGTH = 20;
const SHORT_ARM_WIDTH = LONG_ARM_WIDTH; // Same width (4m)
const SHORT_ARM_Z_CENTER = HALF_LAD - SHORT_ARM_WIDTH / 2; // 13
const SHORT_ARM_X_START = HALF_LAW;     // 2
const SHORT_ARM_X_END = HALF_LAW + SHORT_ARM_LENGTH; // 22

const HEIGHT = 3.5;
const WAINSCOT_HEIGHT = HEIGHT / 3;     // ~1.17m — lower third of walls

// L-shape floor polygon vertices (counter-clockwise)
// This defines the walkable area as a closed polygon
// Currently unused but kept as reference for floor polygon construction
// const L_VERTICES: { x: number; z: number }[] = [
//   { x: -HALF_LAW, z: -HALF_LAD },                     // 0: bottom-left of long arm
//   { x: HALF_LAW, z: -HALF_LAD },                      // 1: bottom-right of long arm
//   { x: HALF_LAW, z: HALF_LAD - SHORT_ARM_WIDTH },     // 2: inner corner of L
//   { x: SHORT_ARM_X_END, z: HALF_LAD - SHORT_ARM_WIDTH }, // 3: bottom-right of short arm
//   { x: SHORT_ARM_X_END, z: HALF_LAD },                // 4: top-right of short arm (exit end)
//   { x: -HALF_LAW, z: HALF_LAD },                      // 5: top-left of long arm
// ];

// =============================================================================
// Material helpers
// =============================================================================

/** Carpet material — deep burgundy with geometric pattern */
function createCarpetMaterial(seed: number, shifted: boolean = false): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: shifted ? seed + 5555 : seed,
    roomIndex: 5,
    patternScale: 3.0,           // Dense geometric carpet pattern
    patternRotation: 0.02,       // Very slight rotation — hotel carpet grids
    breatheIntensity: 0.3,       // Carpet subtly breathes with audio
    rippleFrequency: 1.5,
    rippleIntensity: 0.12,       // Minimal ripple — carpet is grounded
    abnormality: shifted ? 0.15 : 0.0, // Shifted carpet is slightly wrong
  };
  return createLiminalMaterial(config);
}

/** Wallpaper material — upper wall cream with subtle pattern */
function createWallpaperMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 5,
    patternScale: 1.2,           // Ornate wallpaper pattern
    patternRotation: 0.0,
    breatheIntensity: 0.4,       // Walls breathe with audio
    rippleFrequency: 2.0,
    rippleIntensity: 0.2,        // Subtle pattern movement
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Wainscoting material — dark wood paneling on lower walls */
function createWainscotMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 5,
    patternScale: 2.5,           // Wood grain pattern
    patternRotation: 0.01,
    breatheIntensity: 0.2,       // Minimal — wood is solid
    rippleFrequency: 1.0,
    rippleIntensity: 0.08,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 3000,
    roomIndex: 5,
    patternScale: 0.8,
    patternRotation: 0,
    breatheIntensity: 0.15,
    rippleFrequency: 1.2,
    rippleIntensity: 0.06,
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
  hole.lineTo(doorOffsetX - dhw + doorWidth, -hh + doorHeight);
  hole.lineTo(doorOffsetX - dhw, -hh + doorHeight);
  hole.lineTo(doorOffsetX - dhw, -hh);
  shape.holes.push(hole);

  return new THREE.ShapeGeometry(shape, 2);
}

/**
 * Build the L-shaped walls with two-tone materials:
 * - Lower third: dark wood wainscoting
 * - Upper two-thirds: cream wallpaper
 *
 * Wall segments follow the L-shaped polygon.
 */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallpaperMat = createWallpaperMaterial(seed);
  const wainscotMat = createWainscotMaterial(seed);
  materials.push(wallpaperMat, wainscotMat);

  // Wainscoting trim strip — thin line at the wainscoting/wallpaper boundary
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.wainscotingTrim,
    roughness: 0.4,
    metalness: 0.2,
  });
  materials.push(trimMat);

  // Define wall segments as start/end points (following L-shape perimeter)
  const wallDefs = [
    // Long arm walls
    // Segment 0: South wall of long arm (bottom, z = -15)
    { sx: -HALF_LAW, sz: -HALF_LAD, ex: HALF_LAW, ez: -HALF_LAD, nx: 0, nz: 1, hasDoor: true, doorOffset: 0 },
    // Segment 1: East wall of long arm (x = +2, from z=-15 to z=11)
    { sx: HALF_LAW, sz: -HALF_LAD, ex: HALF_LAW, ez: HALF_LAD - SHORT_ARM_WIDTH, nx: -1, nz: 0, hasDoor: false },
    // Segment 2: Inner bottom of short arm (z = 11, from x=2 to x=22)
    { sx: HALF_LAW, sz: HALF_LAD - SHORT_ARM_WIDTH, ex: SHORT_ARM_X_END, ez: HALF_LAD - SHORT_ARM_WIDTH, nx: 0, nz: 1, hasDoor: false },
    // Segment 3: East end wall of short arm — EXIT doorway (x = 22)
    { sx: SHORT_ARM_X_END, sz: HALF_LAD - SHORT_ARM_WIDTH, ex: SHORT_ARM_X_END, ez: HALF_LAD, nx: -1, nz: 0, hasDoor: true, doorOffset: 0 },
    // Segment 4: Outer top of short arm (z = 15, from x=22 back to x=-2)
    { sx: SHORT_ARM_X_END, sz: HALF_LAD, ex: -HALF_LAW, ez: HALF_LAD, nx: 0, nz: -1, hasDoor: false },
    // Segment 5: West wall of long arm (x = -2, from z=15 to z=-15)
    { sx: -HALF_LAW, sz: HALF_LAD, ex: -HALF_LAW, ez: -HALF_LAD, nx: 1, nz: 0, hasDoor: false },
  ];

  wallDefs.forEach((wd) => {
    const dx = wd.ex - wd.sx;
    const dz = wd.ez - wd.sz;
    const wallLength = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const mx = (wd.sx + wd.ex) / 2;
    const mz = (wd.sz + wd.ez) / 2;

    // Upper wallpaper section (above wainscoting)
    const upperHeight = HEIGHT - WAINSCOT_HEIGHT;
    let upperGeo: THREE.BufferGeometry;
    if (wd.hasDoor) {
      // Wall with doorway cutout in the upper section
      upperGeo = createWallWithDoorway(wallLength, upperHeight, 2.5, 3.2 - WAINSCOT_HEIGHT, wd.doorOffset);
    } else {
      upperGeo = new THREE.PlaneGeometry(wallLength, upperHeight, 4, 4);
    }
    applyUVMapping(upperGeo, wallLength, upperHeight);
    const upperMesh = new THREE.Mesh(upperGeo, wallpaperMat);
    upperMesh.position.set(mx + wd.nx * 0.001, WAINSCOT_HEIGHT + upperHeight / 2, mz + wd.nz * 0.001);
    upperMesh.rotation.y = angle;
    upperMesh.receiveShadow = true;
    group.add(upperMesh);
    geometries.push(upperGeo);

    // Lower wainscoting section
    let wainscotGeo: THREE.BufferGeometry;
    if (wd.hasDoor) {
      wainscotGeo = createWallWithDoorway(wallLength, WAINSCOT_HEIGHT, 2.5, WAINSCOT_HEIGHT, wd.doorOffset);
    } else {
      wainscotGeo = new THREE.PlaneGeometry(wallLength, WAINSCOT_HEIGHT, 4, 2);
    }
    applyUVMapping(wainscotGeo, wallLength, WAINSCOT_HEIGHT);
    const wainscotMesh = new THREE.Mesh(wainscotGeo, wainscotMat);
    wainscotMesh.position.set(mx + wd.nx * 0.001, WAINSCOT_HEIGHT / 2, mz + wd.nz * 0.001);
    wainscotMesh.rotation.y = angle;
    wainscotMesh.receiveShadow = true;
    group.add(wainscotMesh);
    geometries.push(wainscotGeo);

    // Trim strip at wainscoting/wallpaper boundary
    const trimGeo = new THREE.BoxGeometry(wallLength, 0.04, 0.02);
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.set(
      mx + wd.nx * 0.02,
      WAINSCOT_HEIGHT,
      mz + wd.nz * 0.02
    );
    trimMesh.rotation.y = angle;
    group.add(trimMesh);
    geometries.push(trimGeo);
  });
}

/**
 * Build L-shaped floor with carpet.
 * The long arm uses the normal burgundy carpet;
 * the short arm (past the L-corner) uses a subtly color-shifted carpet.
 */
function buildFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const carpetMat = createCarpetMaterial(seed, false);
  const carpetShiftedMat = createCarpetMaterial(seed, true);
  materials.push(carpetMat, carpetShiftedMat);

  // Long arm floor (rectangular: 4m x 30m)
  const longFloorGeo = new THREE.PlaneGeometry(LONG_ARM_WIDTH, LONG_ARM_DEPTH, 4, 16);
  applyUVMapping(longFloorGeo, LONG_ARM_WIDTH, LONG_ARM_DEPTH);
  const longFloor = new THREE.Mesh(longFloorGeo, carpetMat);
  longFloor.rotation.x = -Math.PI / 2;
  longFloor.position.set(0, 0, 0);
  longFloor.receiveShadow = true;
  group.add(longFloor);
  geometries.push(longFloorGeo);

  // Short arm floor (rectangular: 20m x 4m) — SHIFTED hue
  const shortFloorGeo = new THREE.PlaneGeometry(SHORT_ARM_LENGTH, SHORT_ARM_WIDTH, 12, 4);
  applyUVMapping(shortFloorGeo, SHORT_ARM_LENGTH, SHORT_ARM_WIDTH);
  const shortFloor = new THREE.Mesh(shortFloorGeo, carpetShiftedMat);
  shortFloor.rotation.x = -Math.PI / 2;
  shortFloor.position.set(
    SHORT_ARM_X_START + SHORT_ARM_LENGTH / 2,
    0,
    SHORT_ARM_Z_CENTER
  );
  shortFloor.receiveShadow = true;
  group.add(shortFloor);
  geometries.push(shortFloorGeo);

  // Fallback dark floor underneath
  const fallbackGeo = new THREE.PlaneGeometry(50, 50);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/** Build L-shaped ceiling */
function buildCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const ceilingMat = createCeilingMaterial(seed);
  materials.push(ceilingMat);

  // Long arm ceiling
  const longCeilGeo = new THREE.PlaneGeometry(LONG_ARM_WIDTH, LONG_ARM_DEPTH, 4, 8);
  applyUVMapping(longCeilGeo, LONG_ARM_WIDTH, LONG_ARM_DEPTH);
  const longCeil = new THREE.Mesh(longCeilGeo, ceilingMat);
  longCeil.rotation.x = Math.PI / 2;
  longCeil.position.set(0, HEIGHT, 0);
  longCeil.receiveShadow = true;
  group.add(longCeil);
  geometries.push(longCeilGeo);

  // Short arm ceiling
  const shortCeilGeo = new THREE.PlaneGeometry(SHORT_ARM_LENGTH, SHORT_ARM_WIDTH, 8, 4);
  applyUVMapping(shortCeilGeo, SHORT_ARM_LENGTH, SHORT_ARM_WIDTH);
  const shortCeil = new THREE.Mesh(shortCeilGeo, ceilingMat);
  shortCeil.rotation.x = Math.PI / 2;
  shortCeil.position.set(
    SHORT_ARM_X_START + SHORT_ARM_LENGTH / 2,
    HEIGHT,
    SHORT_ARM_Z_CENTER
  );
  shortCeil.receiveShadow = true;
  group.add(shortCeil);
  geometries.push(shortCeilGeo);
}

/**
 * Build hotel room doors with brass number plates on both sides of the long arm.
 * Numbers are wrong/impossible: 237, -1, infinity, 404, 000, 13.13, etc.
 */
function buildDoors(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const doorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.doorWood,
    roughness: 0.6,
    metalness: 0.1,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.doorFrame,
    roughness: 0.5,
    metalness: 0.15,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.brass,
    roughness: 0.3,
    metalness: 0.8,
    emissive: PALETTE.brass,
    emissiveIntensity: 0.1,
  });
  materials.push(doorMat, frameMat, brassMat);

  // Door dimensions
  const doorWidth = 1.0;
  const doorHeight = 2.4;
  const doorDepth = 0.06;
  const frameWidth = 0.08;
  const frameDepth = 0.1;

  // Door geometry (reusable)
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  const frameSideGeo = new THREE.BoxGeometry(frameWidth, doorHeight + frameWidth, frameDepth);
  const frameTopGeo = new THREE.BoxGeometry(doorWidth + frameWidth * 2, frameWidth, frameDepth);
  const numberPlateGeo = new THREE.BoxGeometry(0.12, 0.08, 0.015);
  const doorKnobGeo = new THREE.SphereGeometry(0.025, 8, 6);
  geometries.push(doorGeo, frameSideGeo, frameTopGeo, numberPlateGeo, doorKnobGeo);

  // Impossible room numbers
  const roomNumbers = ['237', '-1', '\u221E', '404', '000', '13.13', 'NaN', '\u03C0', '???', '42', '0xDEAD', 'NULL'];

  // Long arm doors: 6 per side, every 4m along Z axis
  const doorSpacing = 4;
  const doorStartZ = -11;

  for (let i = 0; i < 6; i++) {
    const z = doorStartZ + i * doorSpacing;

    // Left side door (x = -HALF_LAW)
    createDoorAssembly(group, doorGeo, frameSideGeo, frameTopGeo, numberPlateGeo, doorKnobGeo,
      doorMat, frameMat, brassMat,
      -HALF_LAW + doorDepth / 2, z, Math.PI / 2, doorWidth, doorHeight, doorDepth, frameWidth,
      roomNumbers[i] || '???');

    // Right side door (x = +HALF_LAW)
    createDoorAssembly(group, doorGeo, frameSideGeo, frameTopGeo, numberPlateGeo, doorKnobGeo,
      doorMat, frameMat, brassMat,
      HALF_LAW - doorDepth / 2, z, -Math.PI / 2, doorWidth, doorHeight, doorDepth, frameWidth,
      roomNumbers[i + 6] || '???');
  }

  // Short arm doors: a few doors along the short arm inner/outer walls
  const shortArmDoorZs = [
    { z: HALF_LAD - SHORT_ARM_WIDTH + doorDepth / 2, rotY: 0 },  // Inner wall (z = 11)
    { z: HALF_LAD - doorDepth / 2, rotY: Math.PI },               // Outer wall (z = 15)
  ];

  for (let i = 0; i < 4; i++) {
    const x = SHORT_ARM_X_START + 3 + i * 4;
    shortArmDoorZs.forEach((def, wallIdx) => {
      createDoorAssembly(group, doorGeo, frameSideGeo, frameTopGeo, numberPlateGeo, doorKnobGeo,
        doorMat, frameMat, brassMat,
        x, def.z, def.rotY, doorWidth, doorHeight, doorDepth, frameWidth,
        roomNumbers[(i + wallIdx * 4) % roomNumbers.length]);
    });
  }
}

/** Helper to create a single door assembly with frame, knob, and number plate */
function createDoorAssembly(
  group: THREE.Group,
  doorGeo: THREE.BufferGeometry,
  frameSideGeo: THREE.BufferGeometry,
  frameTopGeo: THREE.BufferGeometry,
  numberPlateGeo: THREE.BufferGeometry,
  doorKnobGeo: THREE.BufferGeometry,
  doorMat: THREE.Material,
  frameMat: THREE.Material,
  brassMat: THREE.Material,
  x: number, z: number, rotY: number,
  doorWidth: number, doorHeight: number, doorDepth: number, frameWidth: number,
  _roomNumber: string
): void {
  const perpX = Math.sin(rotY);
  const perpZ = Math.cos(rotY);

  // Door panel
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(x, doorHeight / 2, z);
  door.rotation.y = rotY;
  door.castShadow = true;
  door.receiveShadow = true;
  group.add(door);

  // Frame sides
  const frameL = new THREE.Mesh(frameSideGeo, frameMat);
  frameL.position.set(
    x - perpZ * (doorWidth / 2 + frameWidth / 2),
    doorHeight / 2 + frameWidth / 4,
    z + perpX * (doorWidth / 2 + frameWidth / 2)
  );
  frameL.rotation.y = rotY;
  group.add(frameL);

  const frameR = new THREE.Mesh(frameSideGeo, frameMat);
  frameR.position.set(
    x + perpZ * (doorWidth / 2 + frameWidth / 2),
    doorHeight / 2 + frameWidth / 4,
    z - perpX * (doorWidth / 2 + frameWidth / 2)
  );
  frameR.rotation.y = rotY;
  group.add(frameR);

  // Frame top
  const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
  frameTop.position.set(x, doorHeight + frameWidth / 2, z);
  frameTop.rotation.y = rotY;
  group.add(frameTop);

  // Brass number plate (centered on door face, upper third)
  const plateOffset = doorDepth / 2 + 0.01;
  const plate = new THREE.Mesh(numberPlateGeo, brassMat);
  plate.position.set(
    x + perpX * plateOffset,
    doorHeight * 0.75,
    z + perpZ * plateOffset
  );
  plate.rotation.y = rotY;
  group.add(plate);

  // Door knob (on one side)
  const knobOffsetX = doorWidth * 0.35;
  const knob = new THREE.Mesh(doorKnobGeo, brassMat);
  knob.position.set(
    x + perpX * plateOffset + perpZ * knobOffsetX,
    doorHeight * 0.45,
    z + perpZ * plateOffset - perpX * knobOffsetX
  );
  group.add(knob);
}

/**
 * Build warm wall sconce lights between every pair of doors.
 * Amber point lights casting pools of warm light along the corridor.
 */
function buildSconceLights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { sconceLights: THREE.PointLight[] } {
  const sconceLights: THREE.PointLight[] = [];

  // Sconce fixture mesh — small decorative box with emissive panel
  const sconceBodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.08);
  const sconceShadeGeo = new THREE.BoxGeometry(0.16, 0.10, 0.12);
  geometries.push(sconceBodyGeo, sconceShadeGeo);

  const sconceMetalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sconceMetal,
    roughness: 0.3,
    metalness: 0.7,
  });
  const sconceGlowMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sconce,
    emissive: PALETTE.sconce,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.0,
  });
  materials.push(sconceMetalMat, sconceGlowMat);

  // Long arm sconces — on both walls, offset between doors (every 4m, starting at -13)
  const sconceSpacing = 4;
  const sconceStartZ = -13;
  const sconceY = 2.5;

  for (let i = 0; i < 8; i++) {
    const z = sconceStartZ + i * sconceSpacing;

    // Left wall sconce (x = -HALF_LAW)
    const leftBody = new THREE.Mesh(sconceBodyGeo, sconceMetalMat);
    leftBody.position.set(-HALF_LAW + 0.05, sconceY, z);
    leftBody.rotation.y = Math.PI / 2;
    group.add(leftBody);

    const leftShade = new THREE.Mesh(sconceShadeGeo, sconceGlowMat);
    leftShade.position.set(-HALF_LAW + 0.10, sconceY - 0.08, z);
    group.add(leftShade);

    const leftLight = new THREE.PointLight(PALETTE.sconce, 0.5, 4, 2);
    leftLight.position.set(-HALF_LAW + 0.3, sconceY, z);
    group.add(leftLight);
    sconceLights.push(leftLight);

    // Right wall sconce (x = +HALF_LAW)
    const rightBody = new THREE.Mesh(sconceBodyGeo, sconceMetalMat);
    rightBody.position.set(HALF_LAW - 0.05, sconceY, z);
    rightBody.rotation.y = -Math.PI / 2;
    group.add(rightBody);

    const rightShade = new THREE.Mesh(sconceShadeGeo, sconceGlowMat);
    rightShade.position.set(HALF_LAW - 0.10, sconceY - 0.08, z);
    group.add(rightShade);

    const rightLight = new THREE.PointLight(PALETTE.sconce, 0.5, 4, 2);
    rightLight.position.set(HALF_LAW - 0.3, sconceY, z);
    group.add(rightLight);
    sconceLights.push(rightLight);
  }

  // Short arm sconces — on both walls
  for (let i = 0; i < 5; i++) {
    const x = SHORT_ARM_X_START + 2 + i * 4;

    // Inner wall sconce (z = 11)
    const innerLight = new THREE.PointLight(PALETTE.sconce, 0.5, 4, 2);
    innerLight.position.set(x, sconceY, HALF_LAD - SHORT_ARM_WIDTH + 0.3);
    group.add(innerLight);
    sconceLights.push(innerLight);

    const innerShade = new THREE.Mesh(sconceShadeGeo, sconceGlowMat);
    innerShade.position.set(x, sconceY - 0.08, HALF_LAD - SHORT_ARM_WIDTH + 0.10);
    group.add(innerShade);

    // Outer wall sconce (z = 15)
    const outerLight = new THREE.PointLight(PALETTE.sconce, 0.5, 4, 2);
    outerLight.position.set(x, sconceY, HALF_LAD - 0.3);
    group.add(outerLight);
    sconceLights.push(outerLight);

    const outerShade = new THREE.Mesh(sconceShadeGeo, sconceGlowMat);
    outerShade.position.set(x, sconceY - 0.08, HALF_LAD - 0.10);
    group.add(outerShade);
  }

  // Dim ambient fill — never pitch black
  const ambient = new THREE.AmbientLight(PALETTE.brassGlow, 0.06);
  group.add(ambient);

  return { sconceLights };
}

/**
 * Build the abandoned room service cart mid-corridor.
 * A stainless steel cart with a covered plate (white cloth dome)
 * sitting slightly askew in the hallway.
 */
function buildRoomServiceCart(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const cartMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cartMetal,
    roughness: 0.2,
    metalness: 0.9,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cartCloth,
    roughness: 0.8,
    metalness: 0.0,
  });
  materials.push(cartMat, clothMat);

  // Cart body — flat rectangular platform on legs
  const cartTopGeo = new THREE.BoxGeometry(0.8, 0.03, 0.5);
  const cartLegGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6);
  const cartWheelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
  geometries.push(cartTopGeo, cartLegGeo, cartWheelGeo);

  const cartX = 0.5;
  const cartZ = 3.0;
  const cartY = 0.7;
  const cartAngle = 0.2; // Slightly askew

  // Cart top surface
  const cartTop = new THREE.Mesh(cartTopGeo, cartMat);
  cartTop.position.set(cartX, cartY, cartZ);
  cartTop.rotation.y = cartAngle;
  cartTop.castShadow = true;
  group.add(cartTop);

  // 4 legs
  const legOffsets = [
    { x: -0.35, z: -0.2 },
    { x: 0.35, z: -0.2 },
    { x: -0.35, z: 0.2 },
    { x: 0.35, z: 0.2 },
  ];

  legOffsets.forEach((lo) => {
    const rotX = Math.cos(cartAngle) * lo.x - Math.sin(cartAngle) * lo.z;
    const rotZ = Math.sin(cartAngle) * lo.x + Math.cos(cartAngle) * lo.z;

    const leg = new THREE.Mesh(cartLegGeo, cartMat);
    leg.position.set(cartX + rotX, cartY / 2, cartZ + rotZ);
    group.add(leg);

    // Wheel at bottom
    const wheel = new THREE.Mesh(cartWheelGeo, cartMat);
    wheel.position.set(cartX + rotX, 0.03, cartZ + rotZ);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
  });

  // Covered plate — dome cloche
  const clocheGeo = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  geometries.push(clocheGeo);
  const cloche = new THREE.Mesh(clocheGeo, cartMat);
  cloche.position.set(cartX, cartY + 0.015, cartZ);
  cloche.rotation.y = cartAngle;
  cloche.castShadow = true;
  group.add(cloche);

  // White cloth napkin draped beside the cloche
  const napkinGeo = new THREE.PlaneGeometry(0.2, 0.25);
  geometries.push(napkinGeo);
  const napkin = new THREE.Mesh(napkinGeo, clothMat);
  napkin.position.set(cartX + 0.25, cartY + 0.02, cartZ);
  napkin.rotation.x = -Math.PI / 2;
  napkin.rotation.z = 0.3;
  group.add(napkin);
}

/**
 * Build the glowing exit doorway at the far end of the short arm.
 * Cool blue-gray glow contrasts the warm amber interior.
 */
function buildExitGlow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const glowGeo = new THREE.PlaneGeometry(2.5, 3.2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlow,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  // Exit at east end of short arm (x = 22), centered in z between 11 and 15
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.set(SHORT_ARM_X_END + 0.1, 1.6, SHORT_ARM_Z_CENTER);
  glowMesh.rotation.y = -Math.PI / 2;
  group.add(glowMesh);
  geometries.push(glowGeo);
  materials.push(glowMat);

  const exitLight = new THREE.PointLight(PALETTE.exitGlow, 0.3, 6, 1.5);
  exitLight.position.set(SHORT_ARM_X_END - 0.5, 1.6, SHORT_ARM_Z_CENTER);
  group.add(exitLight);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface HotelCorridorRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Hotel Corridor scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildHotelCorridor(seed: number = 42): HotelCorridorRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildDoors(group, geometries, materials);
  const { sconceLights } = buildSconceLights(group, geometries, materials);
  buildRoomServiceCart(group, geometries, materials);
  buildExitGlow(group, geometries, materials);

  // Track elapsed time for shader updates
  let elapsedTime = 0;

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

      // --- Audio reactivity: Sconce light warmth pulsing with bass ---
      // Bass frequencies make the warm amber sconces pulse brighter,
      // creating a breathing warmth effect along the corridor.
      const bassIntensity = audioData.bass || 0;
      const midIntensity = audioData.mid || 0;

      sconceLights.forEach((light, i) => {
        const baseIntensity = 0.5;
        // Bass makes lights pulse warmer/brighter
        light.intensity = baseIntensity + bassIntensity * 0.3;

        // Mid frequencies create subtle flicker — old wiring in an old hotel
        if (midIntensity > 0.4) {
          const flicker = 1.0 - Math.random() * midIntensity * 0.08;
          light.intensity *= flicker;
        }

        // Occasional transient flicker — a single sconce dims briefly
        if (audioData.transient > 0.5 && i === Math.floor(elapsedTime * 2) % sconceLights.length) {
          light.intensity *= 0.3;
        }
      });
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}

/**
 * Get the CuratedRoom template data for the Hotel Corridor.
 */
export { getCuratedTemplate } from '../RoomTemplates';
