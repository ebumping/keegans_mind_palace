/**
 * The Bathroom — Room 7
 *
 * A public restroom (8m × 12m × 3m) with clinical white tile walls and floor.
 * Row of 4 bathroom stall partitions along one wall — all doors slightly ajar,
 * all empty. Row of mirrors and sinks along opposite wall — mirrors show the
 * room but NOT the player (render a static room texture in mirror material).
 *
 * Harsh overhead fluorescent strip lighting that makes everything look washed
 * out (high color temperature shader tint). One sink drips with particle
 * effect, creating a rhythmic drip that syncs with audio if present.
 *
 * Wet floor patches with reflective shader areas on the tile. Single exit
 * door with "EMPLOYEES ONLY" text mesh — this is the way forward.
 *
 * Audio reactivity: drip frequency matches bass, fluorescent buzz with mid,
 * mirror flicker on transients.
 *
 * Creative direction: The public bathroom is one of the most universally
 * unsettling liminal spaces — a place of vulnerability and transience.
 * The clinical white tiles and harsh fluorescent lighting strip away any
 * warmth or comfort. The mirrors that refuse to show your reflection
 * create a deep wrongness — you exist in this space but the space
 * doesn't acknowledge you. The dripping sink is the heartbeat of this
 * room, the only sign of life in an otherwise sterile void. The
 * "EMPLOYEES ONLY" exit implies a threshold into spaces not meant
 * for you — deeper, more forbidden territory.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — clinical white with cold fluorescent tint
// =============================================================================
const PALETTE = {
  // Walls & tiles
  tileWhite: '#f0f0f0',           // Clinical white tile
  tileGrout: '#c8c8c8',           // Grout lines between tiles
  tileAccent: '#e0e8f0',          // Slight blue-cold tint on tiles
  wallUpper: '#e8e8e8',           // Upper wall above tile line

  // Floor
  floorTile: '#dddddd',           // Light grey floor tile
  floorGrout: '#b0b0b0',          // Floor grout
  wetFloor: '#aabbcc',            // Wet patches — slightly reflective blue-grey

  // Ceiling
  ceiling: '#f8f8f8',             // Bright white ceiling
  fluorescentTube: '#f0f8ff',     // Blue-white fluorescent light color
  fluorescentHousing: '#cccccc',  // Light fixture housing

  // Stalls
  stallPartition: '#c0c0c0',      // Metal/laminate partition grey
  stallDoor: '#b8b8b8',           // Slightly darker stall door
  stallHinge: '#888888',          // Door hinge/hardware
  stallLatch: '#999999',          // Latch mechanism

  // Mirrors & sinks
  mirrorFrame: '#aaaaaa',         // Mirror frame/border
  mirrorSurface: '#d8dce0',       // Mirror reflective surface (static)
  sinkBowl: '#e8e8e8',           // White porcelain sink
  sinkFaucet: '#bbbbbb',          // Chrome faucet
  sinkCounter: '#cccccc',         // Counter surface
  sinkDrip: '#88bbdd',            // Water drip color

  // Exit
  exitDoor: '#777777',            // Heavy grey door
  exitText: '#cc3333',            // Red "EMPLOYEES ONLY" text
  exitGlow: '#556677',            // Faint glow from beyond

  // Atmosphere
  fogColor: '#202830',            // Slight blue-grey fog
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 8;
const DEPTH = 12;
const HEIGHT = 3;
const HALF_W = WIDTH / 2;     // 4
const HALF_D = DEPTH / 2;     // 6

const STALL_WIDTH = 1.8;
const STALL_DEPTH = 2.2;
const STALL_HEIGHT = 2.2;     // Partitions don't go to ceiling
const STALL_GAP_BOTTOM = 0.25; // Gap at bottom of stall walls
const STALL_COUNT = 4;

const SINK_COUNT = 3;
const SINK_SPACING = 3;

// =============================================================================
// Material helpers
// =============================================================================

/** Clinical white tile wall material — cold fluorescent tint, subtle audio breathing */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 7,
    patternScale: 1.5,          // Tile grid visible
    patternRotation: 0.0,       // Grid-aligned
    breatheIntensity: 0.15,     // Subtle breathing
    rippleFrequency: 1.0,
    rippleIntensity: 0.08,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Floor tile material — slightly reflective, grid pattern */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 700,
    roomIndex: 7,
    patternScale: 2.0,          // Floor tile grid
    patternRotation: 0.0,
    breatheIntensity: 0.1,
    rippleFrequency: 1.5,       // Wet floor shimmer
    rippleIntensity: 0.15,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — bright white, fluorescent-lit */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1400,
    roomIndex: 7,
    patternScale: 0.5,
    patternRotation: 0.0,
    breatheIntensity: 0.05,
    rippleFrequency: 0.5,
    rippleIntensity: 0.03,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Mirror surface material — static, slightly reflective, uncanny */
function createMirrorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.mirrorSurface,
    roughness: 0.05,
    metalness: 0.8,
    envMapIntensity: 0.5,
  });
}

/** Wet floor patch material — highly reflective */
function createWetFloorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PALETTE.wetFloor,
    roughness: 0.05,
    metalness: 0.3,
    transparent: true,
    opacity: 0.4,
  });
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
// Geometry: Wall with doorway cutout
// =============================================================================

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

// =============================================================================
// Geometry builders
// =============================================================================

/** Build the 4 outer walls */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  // Wall definitions: position, rotation, doorway info
  // Exit is on the south wall (z = +6), "EMPLOYEES ONLY"
  const wallDefs = [
    // North wall (z = -6) — solid
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH, hasExit: false },
    // East wall (x = +4) — sinks/mirrors side, solid
    { x: HALF_W, z: 0, rotY: -Math.PI / 2, w: DEPTH, hasExit: false },
    // South wall (z = +6) — exit doorway
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH, hasExit: true },
    // West wall (x = -4) — stalls side, solid
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH, hasExit: false },
  ];

  wallDefs.forEach((wd) => {
    let geo: THREE.BufferGeometry;
    if (wd.hasExit) {
      geo = createWallWithDoorway(wd.w, HEIGHT, 2.5, 2.8, 0);
    } else {
      geo = new THREE.PlaneGeometry(wd.w, HEIGHT, 4, 3);
    }
    applyUVMapping(geo, wd.w, HEIGHT);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(wd.x, HEIGHT / 2, wd.z);
    mesh.rotation.y = wd.rotY;
    mesh.receiveShadow = true;
    group.add(mesh);
    geometries.push(geo);
  });
}

/** Build clinical white tile floor */
function buildFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 6, 6);
  applyUVMapping(floorGeo, WIDTH, DEPTH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  geometries.push(floorGeo);

  // Dark fallback floor — prevents black void
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 2, DEPTH * 2);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/** Build bright white ceiling with fluorescent fixture housings */
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

  // Fluorescent light fixture housings (two long strips)
  const housingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescentHousing,
    roughness: 0.3,
    metalness: 0.4,
  });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescentTube,
    emissive: PALETTE.fluorescentTube,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(housingMat, tubeMat);

  // Two long fluorescent strip fixtures running along room length
  const fixturePositions = [
    { x: -1.5, z: 0 },
    { x: 1.5, z: 0 },
  ];

  fixturePositions.forEach((pos) => {
    // Housing box
    const housingGeo = new THREE.BoxGeometry(0.3, 0.08, DEPTH * 0.75);
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(pos.x, HEIGHT - 0.04, pos.z);
    group.add(housing);
    geometries.push(housingGeo);

    // Glowing tube surface
    const tubeGeo = new THREE.PlaneGeometry(0.2, DEPTH * 0.7);
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(pos.x, HEIGHT - 0.09, pos.z);
    group.add(tube);
    geometries.push(tubeGeo);
  });
}

/**
 * Build 4 bathroom stall partitions along the west wall (-x side).
 * All doors slightly ajar, all empty. Metal/laminate partitions with
 * a gap at the bottom (classic public restroom style).
 */
function buildStalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const partitionMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stallPartition,
    roughness: 0.5,
    metalness: 0.3,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stallDoor,
    roughness: 0.5,
    metalness: 0.2,
  });
  const hingeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stallHinge,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(partitionMat, doorMat, hingeMat);

  const stallStartZ = -HALF_D + 1.5; // Start 1.5m from north wall

  for (let i = 0; i < STALL_COUNT; i++) {
    const stallZ = stallStartZ + i * (STALL_WIDTH + 0.3);
    const stallX = -HALF_W + 0.1; // Against west wall

    // Side partition wall (between stalls)
    const partitionGeo = new THREE.BoxGeometry(
      STALL_DEPTH, STALL_HEIGHT, 0.04
    );
    geometries.push(partitionGeo);

    // Left partition (or back wall for first stall)
    const leftPartition = new THREE.Mesh(partitionGeo, partitionMat);
    leftPartition.position.set(
      stallX + STALL_DEPTH / 2,
      STALL_GAP_BOTTOM + STALL_HEIGHT / 2,
      stallZ - STALL_WIDTH / 2
    );
    leftPartition.castShadow = true;
    group.add(leftPartition);

    // Right partition
    if (i === STALL_COUNT - 1) {
      const rightPartition = new THREE.Mesh(partitionGeo, partitionMat);
      rightPartition.position.set(
        stallX + STALL_DEPTH / 2,
        STALL_GAP_BOTTOM + STALL_HEIGHT / 2,
        stallZ + STALL_WIDTH / 2
      );
      rightPartition.castShadow = true;
      group.add(rightPartition);
    }

    // Back wall of stall (against outer wall)
    const backGeo = new THREE.BoxGeometry(
      0.04, STALL_HEIGHT, STALL_WIDTH
    );
    const backWall = new THREE.Mesh(backGeo, partitionMat);
    backWall.position.set(
      stallX + 0.02,
      STALL_GAP_BOTTOM + STALL_HEIGHT / 2,
      stallZ
    );
    group.add(backWall);
    geometries.push(backGeo);

    // Stall door — slightly ajar (rotated ~15 degrees open)
    const doorGeo = new THREE.BoxGeometry(
      0.03, STALL_HEIGHT - 0.3, STALL_WIDTH - 0.15
    );
    geometries.push(doorGeo);

    const doorGroup = new THREE.Group();
    const door = new THREE.Mesh(doorGeo, doorMat);
    // Offset so it rotates from the hinge edge
    door.position.set(0, 0, (STALL_WIDTH - 0.15) / 2);
    doorGroup.add(door);

    doorGroup.position.set(
      stallX + STALL_DEPTH,
      STALL_GAP_BOTTOM + STALL_HEIGHT / 2 - 0.15,
      stallZ - STALL_WIDTH / 2 + 0.08
    );
    // Slightly ajar — different angles for visual variety
    doorGroup.rotation.y = 0.15 + i * 0.05;
    group.add(doorGroup);

    // Hinge hardware (small cylinders)
    const hingeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 6);
    geometries.push(hingeGeo);

    for (let h = 0; h < 2; h++) {
      const hinge = new THREE.Mesh(hingeGeo, hingeMat);
      hinge.position.set(
        stallX + STALL_DEPTH,
        STALL_GAP_BOTTOM + 0.4 + h * (STALL_HEIGHT - 1.0),
        stallZ - STALL_WIDTH / 2 + 0.08
      );
      group.add(hinge);
    }

    // Latch on door
    const latchGeo = new THREE.BoxGeometry(0.04, 0.08, 0.02);
    const latch = new THREE.Mesh(latchGeo, hingeMat);
    latch.position.set(
      stallX + STALL_DEPTH + 0.02,
      STALL_GAP_BOTTOM + STALL_HEIGHT / 2,
      stallZ + STALL_WIDTH / 2 - 0.2
    );
    group.add(latch);
    geometries.push(latchGeo);
  }
}

/**
 * Build row of mirrors and sinks along east wall (+x side).
 * Mirrors show the room but NOT the player — static mirror material
 * creates an uncanny reflection effect.
 */
function buildMirrorsAndSinks(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { mirrorMeshes: THREE.Mesh[]; dripSinkIndex: number } {
  const mirrorMat = createMirrorMaterial();
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mirrorFrame,
    roughness: 0.4,
    metalness: 0.5,
  });
  const sinkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sinkBowl,
    roughness: 0.2,
    metalness: 0.1,
  });
  const faucetMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sinkFaucet,
    roughness: 0.15,
    metalness: 0.8,
  });
  const counterMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sinkCounter,
    roughness: 0.4,
    metalness: 0.2,
  });
  materials.push(mirrorMat, frameMat, sinkMat, faucetMat, counterMat);

  const mirrorMeshes: THREE.Mesh[] = [];
  const dripSinkIndex = 1; // Second sink drips

  // Counter running along the wall
  const counterGeo = new THREE.BoxGeometry(0.6, 0.05, SINK_COUNT * SINK_SPACING + 1);
  const counter = new THREE.Mesh(counterGeo, counterMat);
  counter.position.set(HALF_W - 0.35, 0.85, 0);
  counter.receiveShadow = true;
  group.add(counter);
  geometries.push(counterGeo);

  // Counter support / vanity
  const vanityGeo = new THREE.BoxGeometry(0.55, 0.85, SINK_COUNT * SINK_SPACING + 0.8);
  const vanity = new THREE.Mesh(vanityGeo, counterMat);
  vanity.position.set(HALF_W - 0.33, 0.42, 0);
  group.add(vanity);
  geometries.push(vanityGeo);

  for (let i = 0; i < SINK_COUNT; i++) {
    const sinkZ = -SINK_SPACING + i * SINK_SPACING;
    const sinkX = HALF_W - 0.35;

    // Mirror — rectangular panel on wall
    const mirrorGeo = new THREE.PlaneGeometry(0.6, 0.8);
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.position.set(HALF_W - 0.02, 1.6, sinkZ);
    mirror.rotation.y = -Math.PI / 2;
    group.add(mirror);
    geometries.push(mirrorGeo);
    mirrorMeshes.push(mirror);

    // Mirror frame
    const frameGeo = new THREE.BoxGeometry(0.03, 0.85, 0.65);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(HALF_W - 0.01, 1.6, sinkZ);
    group.add(frame);
    geometries.push(frameGeo);

    // Sink bowl — half-torus/hemisphere inset into counter
    const bowlGeo = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, sinkMat);
    bowl.rotation.x = Math.PI;
    bowl.position.set(sinkX, 0.85, sinkZ);
    group.add(bowl);
    geometries.push(bowlGeo);

    // Faucet — small cylinder + curved neck
    const faucetBaseGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.15, 8);
    const faucetBase = new THREE.Mesh(faucetBaseGeo, faucetMat);
    faucetBase.position.set(sinkX, 0.95, sinkZ - 0.15);
    group.add(faucetBase);
    geometries.push(faucetBaseGeo);

    // Faucet neck (horizontal)
    const faucetNeckGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6);
    const faucetNeck = new THREE.Mesh(faucetNeckGeo, faucetMat);
    faucetNeck.position.set(sinkX, 1.02, sinkZ - 0.08);
    faucetNeck.rotation.x = Math.PI / 2;
    group.add(faucetNeck);
    geometries.push(faucetNeckGeo);

    // Faucet spout tip
    const spoutGeo = new THREE.CylinderGeometry(0.01, 0.015, 0.06, 6);
    const spout = new THREE.Mesh(spoutGeo, faucetMat);
    spout.position.set(sinkX, 0.99, sinkZ);
    group.add(spout);
    geometries.push(spoutGeo);
  }

  return { mirrorMeshes, dripSinkIndex };
}

/**
 * Build wet floor patches — reflective areas on the tile floor
 * near the sinks and stalls.
 */
function buildWetFloorPatches(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const wetMat = createWetFloorMaterial();
  materials.push(wetMat);

  // Several irregular-ish wet patches (approximated with circles)
  const patches = [
    { x: HALF_W - 1.0, z: 0, r: 0.8 },      // Under dripping sink
    { x: HALF_W - 1.5, z: -2.5, r: 0.5 },    // Smaller nearby patch
    { x: -1.0, z: 2.0, r: 0.6 },             // Near stalls
    { x: 0, z: -1.0, r: 0.4 },               // Center floor
    { x: HALF_W - 0.8, z: 2.5, r: 0.7 },     // Under far sink
  ];

  patches.forEach((patch) => {
    const patchGeo = new THREE.CircleGeometry(patch.r, 12);
    const patchMesh = new THREE.Mesh(patchGeo, wetMat);
    patchMesh.rotation.x = -Math.PI / 2;
    patchMesh.position.set(patch.x, 0.005, patch.z);
    group.add(patchMesh);
    geometries.push(patchGeo);
  });
}

/**
 * Build the dripping sink particle effect — small spheres that fall
 * from the faucet tip into the sink bowl, creating a rhythmic drip.
 */
function buildDripParticles(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { dripMeshes: THREE.Mesh[] } {
  const dripMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sinkDrip,
    roughness: 0.0,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });
  materials.push(dripMat);

  const dripMeshes: THREE.Mesh[] = [];

  // Pre-create several drip droplet meshes (pooled, toggled on/off)
  const dropGeo = new THREE.SphereGeometry(0.015, 6, 6);
  geometries.push(dropGeo);

  for (let i = 0; i < 5; i++) {
    const drop = new THREE.Mesh(dropGeo, dripMat);
    drop.visible = false;
    drop.position.set(HALF_W - 0.35, 0.99, 0); // At drip sink faucet tip (sink index 1 = z=0)
    group.add(drop);
    dripMeshes.push(drop);
  }

  return { dripMeshes };
}

/**
 * Build the exit door with "EMPLOYEES ONLY" text.
 * A heavy grey door at the south wall — the only way forward.
 */
function buildExitDoor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Door frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: '#666666',
    roughness: 0.6,
    metalness: 0.3,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.exitDoor,
    roughness: 0.5,
    metalness: 0.2,
  });
  materials.push(frameMat, doorMat);

  // Door frame (top and sides around the exit opening)
  const frameTopGeo = new THREE.BoxGeometry(2.7, 0.1, 0.15);
  const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
  frameTop.position.set(0, 2.85, HALF_D - 0.05);
  group.add(frameTop);
  geometries.push(frameTopGeo);

  const frameSideGeo = new THREE.BoxGeometry(0.1, 2.8, 0.15);
  geometries.push(frameSideGeo);

  const frameLeft = new THREE.Mesh(frameSideGeo, frameMat);
  frameLeft.position.set(-1.3, 1.4, HALF_D - 0.05);
  group.add(frameLeft);

  const frameRight = new THREE.Mesh(frameSideGeo, frameMat);
  frameRight.position.set(1.3, 1.4, HALF_D - 0.05);
  group.add(frameRight);

  // "EMPLOYEES ONLY" text — flat red box with text-like proportions
  // (actual text rendering would use a texture; we use a red signage box)
  const textMat = new THREE.MeshStandardMaterial({
    color: PALETTE.exitText,
    emissive: PALETTE.exitText,
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.1,
  });
  materials.push(textMat);

  // Main sign plate
  const signGeo = new THREE.BoxGeometry(1.2, 0.18, 0.02);
  const sign = new THREE.Mesh(signGeo, textMat);
  sign.position.set(0, 2.2, HALF_D - 0.01);
  group.add(sign);
  geometries.push(signGeo);

  // Small push bar on door (horizontal metal bar)
  const pushBarMat = new THREE.MeshStandardMaterial({
    color: '#999999',
    roughness: 0.3,
    metalness: 0.6,
  });
  materials.push(pushBarMat);

  const pushBarGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
  const pushBar = new THREE.Mesh(pushBarGeo, pushBarMat);
  pushBar.position.set(0, 1.1, HALF_D - 0.08);
  pushBar.rotation.z = Math.PI / 2;
  group.add(pushBar);
  geometries.push(pushBarGeo);

  // Exit glow behind the door
  const glowGeo = new THREE.PlaneGeometry(2.5, 2.8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlow,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.set(0, 1.4, HALF_D + 0.1);
  group.add(glowMesh);
  geometries.push(glowGeo);
  materials.push(glowMat);

  const exitLight = new THREE.PointLight(PALETTE.exitGlow, 0.2, 6, 1.5);
  exitLight.position.set(0, 1.5, HALF_D - 0.3);
  group.add(exitLight);
}

/**
 * Build harsh overhead fluorescent lighting.
 * High color temperature — everything looks washed out and clinical.
 */
function buildLighting(
  group: THREE.Group
): { fluorescentLights: THREE.RectAreaLight[]; mainLights: THREE.PointLight[] } {
  const fluorescentLights: THREE.RectAreaLight[] = [];
  const mainLights: THREE.PointLight[] = [];

  // Two main fluorescent strips (bright, cold white)
  const stripPositions = [
    { x: -1.5, z: -2 },
    { x: -1.5, z: 2 },
    { x: 1.5, z: -2 },
    { x: 1.5, z: 2 },
  ];

  stripPositions.forEach((pos) => {
    const light = new THREE.PointLight(PALETTE.fluorescentTube, 1.0, 6, 1.5);
    light.position.set(pos.x, HEIGHT - 0.15, pos.z);
    group.add(light);
    mainLights.push(light);
  });

  // Harsh ambient fill — clinical brightness
  const ambient = new THREE.AmbientLight('#e8eef5', 0.15);
  group.add(ambient);

  // Additional bounce light from white walls/floor
  const bounceLight = new THREE.PointLight('#f0f0f5', 0.15, 10, 2);
  bounceLight.position.set(0, 0.5, 0);
  group.add(bounceLight);

  return { fluorescentLights, mainLights };
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface BathroomRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Bathroom scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildBathroom(seed: number = 137): BathroomRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildStalls(group, geometries, materials);
  const { mirrorMeshes } = buildMirrorsAndSinks(group, geometries, materials);
  buildWetFloorPatches(group, geometries, materials);
  const { dripMeshes } = buildDripParticles(group, geometries, materials);
  buildExitDoor(group, geometries, materials);
  const { mainLights } = buildLighting(group);

  let elapsedTime = 0;
  let dripTimer = 0;
  let activeDripIndex = 0;

  // Drip animation state per droplet
  const dripStates = dripMeshes.map(() => ({
    active: false,
    startY: 0.99,
    y: 0.99,
    velocity: 0,
  }));

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

      // --- Drip frequency matches bass ---
      // The dripping sink's drip rate increases with bass levels.
      // When no audio, a slow default drip rate persists.
      const bassLevel = audioData.bass || 0;
      const dripInterval = Math.max(0.3, 1.5 - bassLevel * 1.2);
      dripTimer += delta;

      if (dripTimer >= dripInterval) {
        dripTimer = 0;
        // Activate next drip droplet
        const state = dripStates[activeDripIndex];
        const mesh = dripMeshes[activeDripIndex];
        state.active = true;
        state.y = state.startY;
        state.velocity = 0;
        mesh.visible = true;
        mesh.position.y = state.y;
        activeDripIndex = (activeDripIndex + 1) % dripMeshes.length;
      }

      // Animate active drip droplets (gravity fall)
      for (let i = 0; i < dripStates.length; i++) {
        const state = dripStates[i];
        const mesh = dripMeshes[i];
        if (!state.active) continue;

        state.velocity += 9.8 * delta; // Gravity
        state.y -= state.velocity * delta;
        mesh.position.y = state.y;

        // Hit sink bowl surface (~0.85)
        if (state.y <= 0.85) {
          state.active = false;
          mesh.visible = false;
          state.y = state.startY;
          state.velocity = 0;
        }
      }

      // --- Fluorescent buzz scales with mid frequencies ---
      // The overhead lights buzz more intensely with mid-frequency
      // audio content. Their brightness fluctuates subtly, creating
      // the authentic fluorescent tube instability.
      const midLevel = audioData.mid || 0;
      mainLights.forEach((light, i) => {
        const baseIntensity = 1.0;
        // Subtle buzz flicker — slight random variation scaled by mid
        const buzzFlicker = 1.0 + (Math.sin(elapsedTime * 120 + i * 7) * 0.02) * (0.5 + midLevel);
        // Mid-frequency brightening
        light.intensity = baseIntensity * buzzFlicker + midLevel * 0.3;
      });

      // --- Mirror flicker on transients ---
      // On audio transients, the mirrors momentarily shift in brightness
      // or visibility — as if your reflection almost appeared for an
      // instant before vanishing again. Deeply unsettling.
      const transientLevel = audioData.transient || 0;
      const hasTransient = transientLevel > 0.3;

      mirrorMeshes.forEach((mirror) => {
        const mat = mirror.material as THREE.MeshStandardMaterial;
        if (hasTransient) {
          // Flash the mirror brighter on transients
          mat.emissive = new THREE.Color(PALETTE.fluorescentTube);
          mat.emissiveIntensity = transientLevel * 0.4;
        } else {
          // Settle back to dark static mirror
          mat.emissiveIntensity *= 0.85; // Decay
          if (mat.emissiveIntensity < 0.01) {
            mat.emissiveIntensity = 0;
          }
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
 * Get the CuratedRoom template data for the Bathroom.
 */
export { getCuratedTemplate } from '../RoomTemplates';
