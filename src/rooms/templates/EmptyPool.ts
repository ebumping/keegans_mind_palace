/**
 * The Empty Pool — Room 2
 *
 * A large rectangular space (20m × 30m × 8m) with a drained swimming pool
 * depression in the center (sunken 2m). Cyan-tinted ceramic tile covers the
 * pool interior; beige concrete walls above pool level. Rusted pool ladders
 * at two corners, diving board platform at one end. Overhead skylight panels
 * emit diffuse blue-white light that pulses gently with audio bass. Pool
 * bottom has a dark drain grate at the center emitting faint dust motes.
 * Two exits: one at pool level (door in the wall) and one at the bottom of
 * the pool (dark corridor entrance).
 *
 * Creative direction: The first large-scale space after the claustrophobic
 * hallway. The emptiness is the point — a drained pool is a space defined by
 * absence. The cyan tiles and diffuse skylight create an ethereal, aquatic
 * atmosphere even without water. The cavernous echo makes every footstep
 * feel significant. The pool bottom exit is unsettling — you shouldn't be
 * going deeper.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — aquatic institutional
// =============================================================================
const PALETTE = {
  wallUpper: '#d4c9b0',       // Beige concrete above pool level
  wallLower: '#b8c8c0',       // Slightly cooler concrete near pool
  poolTile: '#66ccdd',        // Cyan ceramic tile
  poolTileDark: '#448899',    // Darker grout / tile accent
  poolTileGrid: '#55aabb',    // Tile grid lines
  floor: '#c8c0b0',           // Concrete deck around pool
  floorDeck: '#b8b0a0',       // Slightly worn deck tone
  ceiling: '#cccccc',         // Light gray ceiling
  skylight: '#ddeeff',        // Blue-white skylight
  skylightGlow: '#aaccee',    // Skylight ambient glow
  ladderRust: '#8b5a2b',      // Rusted metal
  ladderMetal: '#888888',     // Underlying metal
  divingBoard: '#e8e0d0',     // Off-white fiberglass
  divingBoardBase: '#777777', // Concrete/metal base
  drainGrate: '#333333',      // Dark iron grate
  exitGlowWall: '#ffdd88',    // Pool-level exit glow
  exitGlowDeep: '#334455',    // Pool-bottom exit glow (dark, unsettling)
  baseboard: '#9a8a7a',       // Deck edge trim
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 20;
const DEPTH = 30;
const HEIGHT = 8;
const HALF_W = WIDTH / 2;
const HALF_D = DEPTH / 2;

// Pool dimensions (centered within room)
const POOL_W = 14;
const POOL_D = 20;
const POOL_DEPTH = 2;  // Sunken depth
const POOL_HALF_W = POOL_W / 2;
const POOL_HALF_D = POOL_D / 2;

// =============================================================================
// Material helpers
// =============================================================================

/** Create upper wall material — beige concrete */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 2,
    patternScale: 0.8,
    patternRotation: 0.01,
    breatheIntensity: 0.35,
    rippleFrequency: 1.5,
    rippleIntensity: 0.15,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create pool tile material — cyan ceramic grid */
function createPoolTileMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 500,
    roomIndex: 2,
    patternScale: 3.0,        // Tight tile grid
    patternRotation: 0,        // Grid-aligned
    breatheIntensity: 0.5,     // Pool tiles breathe with audio
    rippleFrequency: 3.0,      // Subtle wave-like ripple
    rippleIntensity: 0.25,     // More visible in the pool
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create floor material — concrete deck */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 2,
    patternScale: 1.0,
    patternRotation: 0.0,
    breatheIntensity: 0.25,
    rippleFrequency: 1.5,
    rippleIntensity: 0.1,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create ceiling material — light gray with skylight panels */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 2,
    patternScale: 0.6,
    patternRotation: 0,
    breatheIntensity: 0.2,
    rippleFrequency: 1.0,
    rippleIntensity: 0.08,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create pool bottom material — slightly different tile */
function createPoolBottomMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1500,
    roomIndex: 2,
    patternScale: 3.5,        // Slightly denser tile grid on bottom
    patternRotation: 0,
    breatheIntensity: 0.6,     // Pool bottom breathes more
    rippleFrequency: 2.5,
    rippleIntensity: 0.3,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

// =============================================================================
// UV helpers
// =============================================================================

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

// =============================================================================
// Geometry builders
// =============================================================================

/** Create a wall plane with a centered doorway cutout */
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

/** Build the 4 outer walls of the room */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  // North wall (far end) — solid
  const northGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 4, 4);
  applyUVMapping(northGeo, WIDTH, HEIGHT);
  const northMesh = new THREE.Mesh(northGeo, wallMat);
  northMesh.position.set(0, HEIGHT / 2, -HALF_D);
  northMesh.receiveShadow = true;
  group.add(northMesh);
  geometries.push(northGeo);

  // South wall — has pool-bottom corridor exit (centered, at floor level of pool bottom)
  const southGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 4, 4);
  applyUVMapping(southGeo, WIDTH, HEIGHT);
  const southMesh = new THREE.Mesh(southGeo, wallMat);
  southMesh.position.set(0, HEIGHT / 2, HALF_D);
  southMesh.rotation.y = Math.PI;
  southMesh.receiveShadow = true;
  group.add(southMesh);
  geometries.push(southGeo);

  // East wall — solid
  const eastGeo = new THREE.PlaneGeometry(DEPTH, HEIGHT, 8, 4);
  applyUVMapping(eastGeo, DEPTH, HEIGHT);
  const eastMesh = new THREE.Mesh(eastGeo, wallMat);
  eastMesh.position.set(HALF_W, HEIGHT / 2, 0);
  eastMesh.rotation.y = -Math.PI / 2;
  eastMesh.receiveShadow = true;
  group.add(eastMesh);
  geometries.push(eastGeo);

  // West wall — has pool-level exit door
  const westGeo = createWallWithDoorway(DEPTH, HEIGHT, 3, 3.5, 0);
  applyUVMapping(westGeo, DEPTH, HEIGHT);
  const westMesh = new THREE.Mesh(westGeo, wallMat);
  westMesh.position.set(-HALF_W, HEIGHT / 2, 0);
  westMesh.rotation.y = Math.PI / 2;
  westMesh.receiveShadow = true;
  group.add(westMesh);
  geometries.push(westGeo);
}

/**
 * Build the floor — concrete deck with a sunken pool area.
 * The deck surrounds the pool; the pool has its own floor at -2m.
 */
function buildFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const deckMat = createFloorMaterial(seed);
  materials.push(deckMat);

  // The deck floor is the full room minus the pool hole.
  // Build as a shape with a rectangular hole cut out for the pool.
  const deckShape = new THREE.Shape();
  deckShape.moveTo(-HALF_W, -HALF_D);
  deckShape.lineTo(HALF_W, -HALF_D);
  deckShape.lineTo(HALF_W, HALF_D);
  deckShape.lineTo(-HALF_W, HALF_D);
  deckShape.lineTo(-HALF_W, -HALF_D);

  // Pool hole
  const poolHole = new THREE.Path();
  poolHole.moveTo(-POOL_HALF_W, -POOL_HALF_D);
  poolHole.lineTo(POOL_HALF_W, -POOL_HALF_D);
  poolHole.lineTo(POOL_HALF_W, POOL_HALF_D);
  poolHole.lineTo(-POOL_HALF_W, POOL_HALF_D);
  poolHole.lineTo(-POOL_HALF_W, -POOL_HALF_D);
  deckShape.holes.push(poolHole);

  const deckGeo = new THREE.ShapeGeometry(deckShape, 2);
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.rotation.x = -Math.PI / 2;
  deckMesh.position.y = 0;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);
  geometries.push(deckGeo);

  // Pool bottom floor — sunken 2m
  const poolBottomMat = createPoolBottomMaterial(seed);
  materials.push(poolBottomMat);

  const poolBottomGeo = new THREE.PlaneGeometry(POOL_W, POOL_D, 4, 4);
  applyUVMapping(poolBottomGeo, POOL_W, POOL_D);
  const poolBottomMesh = new THREE.Mesh(poolBottomGeo, poolBottomMat);
  poolBottomMesh.rotation.x = -Math.PI / 2;
  poolBottomMesh.position.set(0, -POOL_DEPTH, 0);
  poolBottomMesh.receiveShadow = true;
  group.add(poolBottomMesh);
  geometries.push(poolBottomGeo);

  // Dark fallback floor — prevents black void
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -POOL_DEPTH - 0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/**
 * Build the pool walls — 4 inner walls of the sunken pool, tiled with cyan ceramic.
 */
function buildPoolWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const tileMat = createPoolTileMaterial(seed);
  materials.push(tileMat);

  // North pool wall (inner face)
  const northPoolGeo = new THREE.PlaneGeometry(POOL_W, POOL_DEPTH, 4, 2);
  applyUVMapping(northPoolGeo, POOL_W, POOL_DEPTH);
  const northPool = new THREE.Mesh(northPoolGeo, tileMat);
  northPool.position.set(0, -POOL_DEPTH / 2, -POOL_HALF_D);
  northPool.receiveShadow = true;
  group.add(northPool);
  geometries.push(northPoolGeo);

  // South pool wall (inner face) — has the deep corridor exit cutout
  const southPoolGeo = createWallWithDoorway(POOL_W, POOL_DEPTH, 2, 2.0, 0);
  applyUVMapping(southPoolGeo, POOL_W, POOL_DEPTH);
  const southPool = new THREE.Mesh(southPoolGeo, tileMat);
  southPool.position.set(0, -POOL_DEPTH / 2, POOL_HALF_D);
  southPool.rotation.y = Math.PI;
  southPool.receiveShadow = true;
  group.add(southPool);
  geometries.push(southPoolGeo);

  // East pool wall (inner face)
  const eastPoolGeo = new THREE.PlaneGeometry(POOL_D, POOL_DEPTH, 4, 2);
  applyUVMapping(eastPoolGeo, POOL_D, POOL_DEPTH);
  const eastPool = new THREE.Mesh(eastPoolGeo, tileMat);
  eastPool.position.set(POOL_HALF_W, -POOL_DEPTH / 2, 0);
  eastPool.rotation.y = -Math.PI / 2;
  eastPool.receiveShadow = true;
  group.add(eastPool);
  geometries.push(eastPoolGeo);

  // West pool wall (inner face)
  const westPoolGeo = new THREE.PlaneGeometry(POOL_D, POOL_DEPTH, 4, 2);
  applyUVMapping(westPoolGeo, POOL_D, POOL_DEPTH);
  const westPool = new THREE.Mesh(westPoolGeo, tileMat);
  westPool.position.set(-POOL_HALF_W, -POOL_DEPTH / 2, 0);
  westPool.rotation.y = Math.PI / 2;
  westPool.receiveShadow = true;
  group.add(westPool);
  geometries.push(westPoolGeo);

  // Pool edge trim — thin strip along the deck-pool boundary
  const edgeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.baseboard,
    roughness: 0.7,
    metalness: 0.1,
  });
  materials.push(edgeMat);
  const edgeH = 0.08;
  const edgeW = 0.15;

  // North edge
  const edgeNGeo = new THREE.BoxGeometry(POOL_W + edgeW * 2, edgeH, edgeW);
  const edgeN = new THREE.Mesh(edgeNGeo, edgeMat);
  edgeN.position.set(0, edgeH / 2, -POOL_HALF_D - edgeW / 2);
  group.add(edgeN);
  geometries.push(edgeNGeo);

  // South edge
  const edgeSGeo = new THREE.BoxGeometry(POOL_W + edgeW * 2, edgeH, edgeW);
  const edgeS = new THREE.Mesh(edgeSGeo, edgeMat);
  edgeS.position.set(0, edgeH / 2, POOL_HALF_D + edgeW / 2);
  group.add(edgeS);
  geometries.push(edgeSGeo);

  // East edge
  const edgeEGeo = new THREE.BoxGeometry(edgeW, edgeH, POOL_D);
  const edgeE = new THREE.Mesh(edgeEGeo, edgeMat);
  edgeE.position.set(POOL_HALF_W + edgeW / 2, edgeH / 2, 0);
  group.add(edgeE);
  geometries.push(edgeEGeo);

  // West edge
  const edgeWGeo = new THREE.BoxGeometry(edgeW, edgeH, POOL_D);
  const edgeWMesh = new THREE.Mesh(edgeWGeo, edgeMat);
  edgeWMesh.position.set(-POOL_HALF_W - edgeW / 2, edgeH / 2, 0);
  group.add(edgeWMesh);
  geometries.push(edgeWGeo);
}

/** Build ceiling with skylight panel recesses */
function buildCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
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
 * Build rusted pool ladders at two corners of the pool.
 * Each ladder: two vertical rails + horizontal rungs.
 */
function buildPoolLadders(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const rustMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ladderRust,
    roughness: 0.85,
    metalness: 0.4,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ladderMetal,
    roughness: 0.5,
    metalness: 0.6,
  });
  materials.push(rustMat, metalMat);

  // Rail geometry
  const railRadius = 0.04;
  const railHeight = POOL_DEPTH + 0.8; // extends above deck
  const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, railHeight, 8);
  geometries.push(railGeo);

  // Rung geometry
  const rungLength = 0.4;
  const rungGeo = new THREE.CylinderGeometry(0.025, 0.025, rungLength, 6);
  geometries.push(rungGeo);

  // Ladder 1: northeast corner of pool
  const ladder1X = POOL_HALF_W - 1;
  const ladder1Z = -POOL_HALF_D + 1;
  buildSingleLadder(group, railGeo, rungGeo, rustMat, metalMat, ladder1X, ladder1Z, 0);

  // Ladder 2: southwest corner of pool
  const ladder2X = -POOL_HALF_W + 1;
  const ladder2Z = POOL_HALF_D - 1;
  buildSingleLadder(group, railGeo, rungGeo, rustMat, metalMat, ladder2X, ladder2Z, Math.PI);
}

function buildSingleLadder(
  group: THREE.Group,
  railGeo: THREE.CylinderGeometry,
  rungGeo: THREE.CylinderGeometry,
  rustMat: THREE.MeshStandardMaterial,
  metalMat: THREE.MeshStandardMaterial,
  x: number, z: number, rotation: number
): void {
  const ladderGroup = new THREE.Group();
  const railSpacing = 0.35;

  // Left rail
  const leftRail = new THREE.Mesh(railGeo, rustMat);
  leftRail.position.set(-railSpacing / 2, -POOL_DEPTH / 2 + 0.4, 0);
  ladderGroup.add(leftRail);

  // Right rail
  const rightRail = new THREE.Mesh(railGeo, rustMat);
  rightRail.position.set(railSpacing / 2, -POOL_DEPTH / 2 + 0.4, 0);
  ladderGroup.add(rightRail);

  // Rungs — 4 rungs evenly spaced
  for (let i = 0; i < 4; i++) {
    const rungY = -POOL_DEPTH + 0.3 + i * 0.55;
    const rung = new THREE.Mesh(rungGeo, metalMat);
    rung.position.set(0, rungY, 0);
    rung.rotation.z = Math.PI / 2;
    ladderGroup.add(rung);
  }

  // Curved grab handles at top
  const handleGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 8, Math.PI);
  const handleL = new THREE.Mesh(handleGeo, rustMat);
  handleL.position.set(-railSpacing / 2, 0.5, -0.1);
  handleL.rotation.y = Math.PI / 2;
  ladderGroup.add(handleL);

  const handleR = new THREE.Mesh(handleGeo, rustMat);
  handleR.position.set(railSpacing / 2, 0.5, -0.1);
  handleR.rotation.y = Math.PI / 2;
  ladderGroup.add(handleR);

  ladderGroup.position.set(x, 0, z);
  ladderGroup.rotation.y = rotation;
  group.add(ladderGroup);
}

/**
 * Build diving board platform at the north end of the pool.
 */
function buildDivingBoard(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const boardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.divingBoard,
    roughness: 0.6,
    metalness: 0.05,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.divingBoardBase,
    roughness: 0.7,
    metalness: 0.3,
  });
  materials.push(boardMat, baseMat);

  // Base/pedestal — concrete block
  const baseGeo = new THREE.BoxGeometry(1.0, 0.6, 1.2);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.3, -POOL_HALF_D + 0.6);
  group.add(base);
  geometries.push(baseGeo);

  // Board — long, slightly tapered plank extending over pool
  const boardGeo = new THREE.BoxGeometry(0.5, 0.06, 3.0);
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 0.63, -POOL_HALF_D + 0.6 + 1.5);
  // Slight downward tilt at the end
  board.rotation.x = 0.02;
  board.castShadow = true;
  group.add(board);
  geometries.push(boardGeo);

  // Support struts under the board
  const strutGeo = new THREE.BoxGeometry(0.06, 0.3, 0.06);
  const strutL = new THREE.Mesh(strutGeo, baseMat);
  strutL.position.set(-0.2, 0.45, -POOL_HALF_D + 0.6);
  group.add(strutL);

  const strutR = new THREE.Mesh(strutGeo, baseMat);
  strutR.position.set(0.2, 0.45, -POOL_HALF_D + 0.6);
  group.add(strutR);
  geometries.push(strutGeo);

  // Non-slip surface strip on the board (darker strip)
  const stripGeo = new THREE.BoxGeometry(0.45, 0.005, 2.8);
  const stripMat = new THREE.MeshStandardMaterial({
    color: '#b0a890',
    roughness: 0.95,
    metalness: 0.0,
  });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(0, 0.665, -POOL_HALF_D + 0.6 + 1.5);
  group.add(strip);
  geometries.push(stripGeo);
  materials.push(stripMat);
}

/**
 * Build drain grate at the center of the pool bottom.
 * A dark circular grate with subtle dust mote particle hints.
 */
function buildDrainGrate(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { drainLight: THREE.PointLight } {
  const grateMat = new THREE.MeshStandardMaterial({
    color: PALETTE.drainGrate,
    roughness: 0.9,
    metalness: 0.5,
  });
  materials.push(grateMat);

  // Circular grate base
  const grateGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
  const grate = new THREE.Mesh(grateGeo, grateMat);
  grate.position.set(0, -POOL_DEPTH + 0.02, 0);
  group.add(grate);
  geometries.push(grateGeo);

  // Grate crossbars
  const barMat = new THREE.MeshStandardMaterial({
    color: '#444444',
    roughness: 0.8,
    metalness: 0.6,
  });
  materials.push(barMat);

  const barGeo = new THREE.BoxGeometry(0.55, 0.02, 0.03);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, -POOL_DEPTH + 0.04, 0);
    bar.rotation.y = (i * Math.PI) / 4;
    group.add(bar);
  }
  geometries.push(barGeo);

  // Outer ring
  const ringGeo = new THREE.TorusGeometry(0.3, 0.03, 8, 24);
  const ring = new THREE.Mesh(ringGeo, barMat);
  ring.position.set(0, -POOL_DEPTH + 0.04, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  geometries.push(ringGeo);

  // Faint upward-pointing light from drain (dust motes hint)
  const drainLight = new THREE.PointLight('#556677', 0.15, 4, 2);
  drainLight.position.set(0, -POOL_DEPTH + 0.1, 0);
  group.add(drainLight);

  // Dust mote particle simulation — small glowing spheres drifting upward
  const dustMat = new THREE.MeshBasicMaterial({
    color: '#aabbcc',
    transparent: true,
    opacity: 0.3,
  });
  materials.push(dustMat);

  const dustGeo = new THREE.SphereGeometry(0.015, 4, 4);
  geometries.push(dustGeo);

  for (let i = 0; i < 8; i++) {
    const dust = new THREE.Mesh(dustGeo, dustMat);
    const angle = (i / 8) * Math.PI * 2;
    const radius = 0.1 + Math.random() * 0.15;
    dust.position.set(
      Math.cos(angle) * radius,
      -POOL_DEPTH + 0.2 + (i * 0.25),
      Math.sin(angle) * radius
    );
    dust.userData.dustMote = true;
    dust.userData.baseY = dust.position.y;
    dust.userData.phase = i * 0.8;
    group.add(dust);
  }

  return { drainLight };
}

/**
 * Build overhead skylight panels in ceiling.
 * 4 rectangular panels that emit diffuse blue-white light.
 * Light intensity pulses gently with audio bass.
 */
function buildSkylights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { skylightLights: THREE.RectAreaLight[]; skylightMeshes: THREE.Mesh[] } {
  const skylightLights: THREE.RectAreaLight[] = [];
  const skylightMeshes: THREE.Mesh[] = [];

  // Skylight panel geometry (recessed into ceiling)
  const panelW = 4;
  const panelD = 6;
  const panelGeo = new THREE.PlaneGeometry(panelW, panelD);
  geometries.push(panelGeo);

  const panelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.skylight,
    emissive: PALETTE.skylightGlow,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
  materials.push(panelMat);

  // Frame around each skylight
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#888888',
    roughness: 0.6,
    metalness: 0.3,
  });
  materials.push(frameMat);

  const positions = [
    { x: -4, z: -5 },
    { x: 4, z: -5 },
    { x: -4, z: 5 },
    { x: 4, z: 5 },
  ];

  for (const pos of positions) {
    // Skylight panel (glowing surface)
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(pos.x, HEIGHT - 0.02, pos.z);
    group.add(panel);
    skylightMeshes.push(panel);

    // Frame border
    const frameGeo = new THREE.BoxGeometry(panelW + 0.2, 0.08, panelD + 0.2);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(pos.x, HEIGHT - 0.04, pos.z);
    group.add(frame);
    geometries.push(frameGeo);

    // Point light beneath panel casting diffuse pool of light
    const light = new THREE.PointLight(PALETTE.skylight, 0.6, 12, 1.5);
    light.position.set(pos.x, HEIGHT - 0.15, pos.z);
    light.castShadow = false;
    group.add(light);
    skylightLights.push(light as unknown as THREE.RectAreaLight);
  }

  return { skylightLights, skylightMeshes };
}

/**
 * Build exit doorway glows.
 * Exit 1: Pool-level door in west wall — warm glow.
 * Exit 2: Pool-bottom corridor at south pool wall — dark, unsettling glow.
 */
function buildExitGlows(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Exit 1: West wall door (pool level)
  const glowGeo1 = new THREE.PlaneGeometry(3, 3.5);
  const glowMat1 = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlowWall,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const glow1 = new THREE.Mesh(glowGeo1, glowMat1);
  glow1.position.set(-HALF_W - 0.1, 3.5 / 2, 0);
  glow1.rotation.y = Math.PI / 2;
  group.add(glow1);
  geometries.push(glowGeo1);
  materials.push(glowMat1);

  const exitLight1 = new THREE.PointLight(PALETTE.exitGlowWall, 0.3, 6, 1.5);
  exitLight1.position.set(-HALF_W + 0.5, 2, 0);
  group.add(exitLight1);

  // Exit 2: Pool-bottom corridor (south pool wall, at pool floor level)
  const glowGeo2 = new THREE.PlaneGeometry(2, 2.0);
  const glowMat2 = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlowDeep,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const glow2 = new THREE.Mesh(glowGeo2, glowMat2);
  glow2.position.set(0, -POOL_DEPTH + 1.0, POOL_HALF_D + 0.1);
  glow2.rotation.y = Math.PI;
  group.add(glow2);
  geometries.push(glowGeo2);
  materials.push(glowMat2);

  const exitLight2 = new THREE.PointLight(PALETTE.exitGlowDeep, 0.25, 5, 2);
  exitLight2.position.set(0, -POOL_DEPTH + 1.0, POOL_HALF_D - 0.5);
  group.add(exitLight2);
}

/**
 * Build ambient lighting — fill light so the space is never pitch black,
 * plus the subtle pool-bottom glow.
 */
function buildAmbientLighting(
  group: THREE.Group
): THREE.Light[] {
  const lights: THREE.Light[] = [];

  // Ambient fill
  const ambient = new THREE.AmbientLight('#ddeeff', 0.12);
  group.add(ambient);
  lights.push(ambient);

  // Subtle uplight from pool bottom (suggests residual water glow)
  const poolGlow = new THREE.PointLight('#66ccdd', 0.3, 10, 1.5);
  poolGlow.position.set(0, -POOL_DEPTH + 0.1, 0);
  group.add(poolGlow);
  lights.push(poolGlow);

  return lights;
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface EmptyPoolRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Empty Pool scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildEmptyPool(seed: number = 84): EmptyPoolRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildPoolWalls(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildPoolLadders(group, geometries, materials);
  buildDivingBoard(group, geometries, materials);
  const { drainLight } = buildDrainGrate(group, geometries, materials);
  const { skylightLights, skylightMeshes } = buildSkylights(group, geometries, materials);
  buildExitGlows(group, geometries, materials);
  const ambientLights = buildAmbientLighting(group);

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

      // Skylight panels pulse with audio bass — the space breathes
      const bassPulse = 0.5 + audioData.bass * 0.5;
      for (const mesh of skylightMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.4 + bassPulse * 0.4;
      }

      // Skylight point lights track bass
      for (const light of skylightLights) {
        (light as unknown as THREE.PointLight).intensity = 0.4 + bassPulse * 0.4;
      }

      // Drain grate light subtly fluctuates
      drainLight.intensity = 0.1 + audioData.mid * 0.15 + Math.sin(elapsedTime * 0.5) * 0.05;

      // Dust motes drift upward from drain
      group.traverse((child) => {
        if (child.userData.dustMote) {
          const phase = child.userData.phase as number;
          const baseY = child.userData.baseY as number;
          // Slow upward drift with gentle oscillation
          const drift = (elapsedTime * 0.15 + phase) % 2.0;
          child.position.y = baseY + drift * 0.8;
          // Gentle horizontal sway
          child.position.x += Math.sin(elapsedTime * 0.3 + phase) * 0.001;
          child.position.z += Math.cos(elapsedTime * 0.25 + phase * 1.3) * 0.001;
          // Fade out as motes rise, reset when they reach top
          const opacity = 1.0 - drift / 2.0;
          (child as THREE.Mesh).material = (child as THREE.Mesh).material;
          if ((child as THREE.Mesh).material instanceof THREE.MeshBasicMaterial) {
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity * 0.3);
          }
        }
      });

      // Pool bottom glow breathes with bass
      for (const light of ambientLights) {
        if (light instanceof THREE.PointLight) {
          light.intensity = 0.2 + audioData.bass * 0.2;
        }
      }
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}

/**
 * Get the CuratedRoom template data for the Empty Pool.
 * This is the declarative config used by the room system for collision,
 * doorway placement, and palette information.
 */
export { getCuratedTemplate } from '../RoomTemplates';
