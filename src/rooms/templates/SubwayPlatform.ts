/**
 * The Subway Platform — Room 8
 *
 * An underground subway platform (30m × 4m × 8m) with yellow-green tile walls,
 * grimy concrete floor, and dark rail metal. The platform overlooks a sunken
 * track pit with two parallel rail cylinders. Tiled columns march along the
 * platform at regular intervals. Bench seating lines the back wall.
 *
 * Fluorescent tube rows run along the ceiling, casting harsh blue-white light.
 * A flickering "NEXT TRAIN" sign hangs from the ceiling — the train never comes.
 *
 * Audio reactivity: bass rumble mapped to distant train vibration (subtle
 * platform shake), mid-freq mapped to tile hum ambience.
 *
 * Creative direction: The subway platform is a liminal threshold — a place
 * designed purely for waiting and passage, never for staying. The yellow-green
 * tiles and fluorescent lighting are universally recognizable, evoking a sense
 * of urban unease. The empty platform stretches endlessly, the "NEXT TRAIN"
 * sign flickers but never updates, and the distant rumble of a train that
 * never arrives creates a permanent state of anticipation without resolution.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — yellow-green tile, grimy concrete, dark rail metal
// =============================================================================
const PALETTE = {
  // Walls & tiles
  tileYellowGreen: '#c8c864',    // Classic subway tile — yellow-green
  tileGrout: '#8a8a5c',          // Dark grout between tiles
  tileBorder: '#a0a050',         // Tile border accent
  wallUpper: '#7a7a60',          // Grimy upper wall above tile line

  // Floor
  platformConcrete: '#888880',   // Worn concrete platform
  trackBed: '#3a3a38',           // Dark track bed below platform
  grime: '#4a4a40',              // General grime/dirt tint

  // Rails & track
  railMetal: '#555550',          // Dark oiled rail steel
  railRust: '#6e5540',           // Rust patches on rails
  tie: '#3e3028',                // Wooden rail ties (dark brown)

  // Columns
  columnTile: '#b8b858',         // Column tile — slightly brighter yellow-green
  columnBase: '#666660',         // Concrete column base

  // Bench
  benchMetal: '#606060',         // Metal bench frame
  benchSeat: '#505048',          // Worn bench seat surface

  // Ceiling
  ceiling: '#686868',            // Dark grimy ceiling
  fluorescentTube: '#e8f0ff',    // Blue-white fluorescent
  fluorescentHousing: '#888888', // Light fixture housing

  // Sign
  signBackground: '#1a1a2a',    // Dark sign background
  signText: '#ff8800',           // Orange LED text
  signFrame: '#444444',          // Sign frame

  // Atmosphere
  fogColor: '#1a1a18',           // Deep dark underground fog
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 30;    // Long platform
const HEIGHT = 4;
const DEPTH = 8;     // Platform + track area width
const HALF_W = WIDTH / 2;    // 15
const HALF_D = DEPTH / 2;    // 4

const PLATFORM_DEPTH = 4;         // How deep the platform area is (walkable)
const TRACK_PIT_DEPTH = 1.2;      // How far down the track bed sits
const PLATFORM_EDGE_Z = -HALF_D + PLATFORM_DEPTH; // Z where platform edge is
const COLUMN_SPACING = 5;         // Spacing between columns along X
const COLUMN_COUNT = 5;           // Number of columns

// =============================================================================
// Material helpers
// =============================================================================

/** Yellow-green tile wall material */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 8,
    patternScale: 1.8,
    patternRotation: 0.0,
    breatheIntensity: 0.12,
    rippleFrequency: 0.8,
    rippleIntensity: 0.06,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Concrete platform floor material */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 800,
    roomIndex: 8,
    patternScale: 0.8,
    patternRotation: 0.0,
    breatheIntensity: 0.08,
    rippleFrequency: 0.5,
    rippleIntensity: 0.04,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — dark, grimy */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1600,
    roomIndex: 8,
    patternScale: 0.4,
    patternRotation: 0.0,
    breatheIntensity: 0.05,
    rippleFrequency: 0.3,
    rippleIntensity: 0.02,
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

/** Build the 4 outer walls — tiled yellow-green */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  const wallDefs = [
    // Back wall (z = -4) — behind the platform, full length
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH },
    // Front wall (z = +4) — far side of tracks
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH },
    // Left end wall (x = -15)
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH },
    // Right end wall (x = +15)
    { x: HALF_W, z: 0, rotY: -Math.PI / 2, w: DEPTH },
  ];

  wallDefs.forEach((wd) => {
    const geo = new THREE.PlaneGeometry(wd.w, HEIGHT, 4, 3);
    applyUVMapping(geo, wd.w, HEIGHT);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(wd.x, HEIGHT / 2, wd.z);
    mesh.rotation.y = wd.rotY;
    mesh.receiveShadow = true;
    group.add(mesh);
    geometries.push(geo);
  });
}

/** Build the platform floor and the sunken track pit with rails */
function buildPlatformAndTracks(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  // Main platform floor (walkable area — back half of the room)
  const platformGeo = new THREE.PlaneGeometry(WIDTH, PLATFORM_DEPTH, 8, 4);
  applyUVMapping(platformGeo, WIDTH, PLATFORM_DEPTH);
  const platformMesh = new THREE.Mesh(platformGeo, floorMat);
  platformMesh.rotation.x = -Math.PI / 2;
  platformMesh.position.set(0, 0, -HALF_D + PLATFORM_DEPTH / 2);
  platformMesh.receiveShadow = true;
  group.add(platformMesh);
  geometries.push(platformGeo);

  // Dark fallback floor
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -TRACK_PIT_DEPTH - 0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);

  // Platform edge — vertical face where platform meets the pit
  const edgeGeo = new THREE.PlaneGeometry(WIDTH, TRACK_PIT_DEPTH);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.platformConcrete,
    roughness: 0.9,
    metalness: 0.0,
  });
  const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
  edgeMesh.position.set(0, -TRACK_PIT_DEPTH / 2, PLATFORM_EDGE_Z);
  group.add(edgeMesh);
  geometries.push(edgeGeo);
  materials.push(edgeMat);

  // Track bed floor — sunken area
  const trackWidth = DEPTH - PLATFORM_DEPTH;
  const trackBedGeo = new THREE.PlaneGeometry(WIDTH, trackWidth, 6, 3);
  const trackBedMat = new THREE.MeshStandardMaterial({
    color: PALETTE.trackBed,
    roughness: 0.95,
    metalness: 0.0,
  });
  const trackBedMesh = new THREE.Mesh(trackBedGeo, trackBedMat);
  trackBedMesh.rotation.x = -Math.PI / 2;
  trackBedMesh.position.set(0, -TRACK_PIT_DEPTH, PLATFORM_EDGE_Z + trackWidth / 2);
  trackBedMesh.receiveShadow = true;
  group.add(trackBedMesh);
  geometries.push(trackBedGeo);
  materials.push(trackBedMat);

  // Rail ties (wooden cross-beams across the track bed)
  const tieMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tie,
    roughness: 0.85,
    metalness: 0.0,
  });
  materials.push(tieMat);

  const tieCount = 40;
  const tieGeo = new THREE.BoxGeometry(0.2, 0.08, trackWidth * 0.7);
  geometries.push(tieGeo);

  for (let i = 0; i < tieCount; i++) {
    const tx = -HALF_W + 0.5 + i * ((WIDTH - 1) / tieCount);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(tx, -TRACK_PIT_DEPTH + 0.04, PLATFORM_EDGE_Z + trackWidth / 2);
    group.add(tie);
  }

  // Two parallel rails
  const railMat = new THREE.MeshStandardMaterial({
    color: PALETTE.railMetal,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(railMat);

  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, WIDTH, 8);
  geometries.push(railGeo);

  const railCenterZ = PLATFORM_EDGE_Z + trackWidth / 2;
  const railGauge = 1.435 / 2; // Standard gauge half-width

  [-railGauge, railGauge].forEach((offset) => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, -TRACK_PIT_DEPTH + 0.12, railCenterZ + offset);
    group.add(rail);
  });
}

/** Build tiled columns along the platform at regular intervals */
function buildColumns(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const columnMat = new THREE.MeshStandardMaterial({
    color: PALETTE.columnTile,
    roughness: 0.4,
    metalness: 0.1,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.columnBase,
    roughness: 0.7,
    metalness: 0.1,
  });
  materials.push(columnMat, baseMat);

  const columnGeo = new THREE.BoxGeometry(0.5, HEIGHT, 0.5);
  const baseGeo = new THREE.BoxGeometry(0.65, 0.15, 0.65);
  geometries.push(columnGeo, baseGeo);

  const columnZ = PLATFORM_EDGE_Z - 0.5; // Near platform edge

  for (let i = 0; i < COLUMN_COUNT; i++) {
    const cx = -HALF_W + COLUMN_SPACING + i * COLUMN_SPACING;

    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.set(cx, HEIGHT / 2, columnZ);
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);

    // Base
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(cx, 0.075, columnZ);
    group.add(base);

    // Top cap
    const topCap = new THREE.Mesh(baseGeo, baseMat);
    topCap.position.set(cx, HEIGHT - 0.075, columnZ);
    group.add(topCap);
  }
}

/** Build bench seating along the back wall */
function buildBenches(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.benchMetal,
    roughness: 0.4,
    metalness: 0.6,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: PALETTE.benchSeat,
    roughness: 0.7,
    metalness: 0.2,
  });
  materials.push(frameMat, seatMat);

  const benchLength = 3.0;
  const benchCount = 4;
  const benchSpacing = WIDTH / (benchCount + 1);

  const seatGeo = new THREE.BoxGeometry(benchLength, 0.05, 0.4);
  const backGeo = new THREE.BoxGeometry(benchLength, 0.5, 0.04);
  const legGeo = new THREE.BoxGeometry(0.04, 0.45, 0.35);
  const armGeo = new THREE.BoxGeometry(0.04, 0.25, 0.35);
  geometries.push(seatGeo, backGeo, legGeo, armGeo);

  for (let i = 0; i < benchCount; i++) {
    const bx = -HALF_W + benchSpacing * (i + 1);
    const bz = -HALF_D + 0.5; // Against back wall

    // Seat
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(bx, 0.45, bz);
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(bx, 0.72, bz - 0.18);
    group.add(back);

    // Legs (4 corners)
    const legPositions = [
      { x: bx - benchLength / 2 + 0.1, z: bz - 0.12 },
      { x: bx - benchLength / 2 + 0.1, z: bz + 0.12 },
      { x: bx + benchLength / 2 - 0.1, z: bz - 0.12 },
      { x: bx + benchLength / 2 - 0.1, z: bz + 0.12 },
    ];

    legPositions.forEach((lp) => {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set(lp.x, 0.225, lp.z);
      group.add(leg);
    });

    // Armrests (dividers between seats)
    for (let a = 0; a < 2; a++) {
      const arm = new THREE.Mesh(armGeo, frameMat);
      arm.position.set(bx - benchLength / 3 + a * (benchLength / 1.5), 0.575, bz);
      group.add(arm);
    }
  }
}

/** Build fluorescent tube row lighting and a flickering "NEXT TRAIN" sign */
function buildLightingAndSign(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  fluorescentLights: THREE.PointLight[];
  signMesh: THREE.Mesh;
  signMaterial: THREE.MeshStandardMaterial;
} {
  const fluorescentLights: THREE.PointLight[] = [];

  // Fluorescent housing
  const housingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescentHousing,
    roughness: 0.3,
    metalness: 0.4,
  });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescentTube,
    emissive: PALETTE.fluorescentTube,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(housingMat, tubeMat);

  // Two rows of fluorescent strips along the length of the platform
  const fixtureCount = 8;
  const fixtureSpacing = WIDTH / (fixtureCount + 1);

  const housingGeo = new THREE.BoxGeometry(2.5, 0.08, 0.2);
  const tubeGeo = new THREE.PlaneGeometry(2.3, 0.12);
  geometries.push(housingGeo, tubeGeo);

  const stripZPositions = [-HALF_D + 1.5, PLATFORM_EDGE_Z - 1.0];

  stripZPositions.forEach((sz) => {
    for (let i = 0; i < fixtureCount; i++) {
      const fx = -HALF_W + fixtureSpacing * (i + 1);

      // Housing
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(fx, HEIGHT - 0.04, sz);
      group.add(housing);

      // Tube glow surface
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(fx, HEIGHT - 0.09, sz);
      group.add(tube);

      // Point light
      const light = new THREE.PointLight(PALETTE.fluorescentTube, 0.6, 8, 1.8);
      light.position.set(fx, HEIGHT - 0.15, sz);
      group.add(light);
      fluorescentLights.push(light);
    }
  });

  // Ambient fill
  const ambient = new THREE.AmbientLight('#404038', 0.12);
  group.add(ambient);

  // "NEXT TRAIN" sign — hanging from ceiling near platform edge
  const signFrameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.signFrame,
    roughness: 0.5,
    metalness: 0.3,
  });
  const signBgMat = new THREE.MeshStandardMaterial({
    color: PALETTE.signBackground,
    roughness: 0.8,
    metalness: 0.0,
  });
  const signTextMat = new THREE.MeshStandardMaterial({
    color: PALETTE.signText,
    emissive: PALETTE.signText,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.0,
  });
  materials.push(signFrameMat, signBgMat, signTextMat);

  // Sign frame
  const signFrameGeo = new THREE.BoxGeometry(2.5, 0.6, 0.1);
  const signFrame = new THREE.Mesh(signFrameGeo, signFrameMat);
  signFrame.position.set(0, HEIGHT - 0.8, PLATFORM_EDGE_Z - 0.8);
  group.add(signFrame);
  geometries.push(signFrameGeo);

  // Sign background
  const signBgGeo = new THREE.PlaneGeometry(2.3, 0.45);
  const signBg = new THREE.Mesh(signBgGeo, signBgMat);
  signBg.position.set(0, HEIGHT - 0.8, PLATFORM_EDGE_Z - 0.85);
  group.add(signBg);
  geometries.push(signBgGeo);

  // Sign text area (emissive — the "NEXT TRAIN" text)
  const signTextGeo = new THREE.PlaneGeometry(2.0, 0.25);
  const signTextMesh = new THREE.Mesh(signTextGeo, signTextMat);
  signTextMesh.position.set(0, HEIGHT - 0.78, PLATFORM_EDGE_Z - 0.86);
  group.add(signTextMesh);
  geometries.push(signTextGeo);

  // Hanging rods for the sign
  const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6);
  geometries.push(rodGeo);
  const rodMat = signFrameMat;

  [-1.0, 1.0].forEach((rx) => {
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(rx, HEIGHT - 0.25, PLATFORM_EDGE_Z - 0.8);
    group.add(rod);
  });

  return { fluorescentLights, signMesh: signTextMesh, signMaterial: signTextMat };
}

/** Build ceiling */
function buildCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const ceilingMat = createCeilingMaterial(seed);
  materials.push(ceilingMat);

  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 6, 4);
  applyUVMapping(ceilingGeo, WIDTH, DEPTH);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT;
  ceilingMesh.receiveShadow = true;
  group.add(ceilingMesh);
  geometries.push(ceilingGeo);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface SubwayPlatformRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Subway Platform scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildSubwayPlatform(seed: number = 208): SubwayPlatformRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildPlatformAndTracks(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildColumns(group, geometries, materials);
  buildBenches(group, geometries, materials);
  const { fluorescentLights, signMesh, signMaterial } = buildLightingAndSign(
    group, geometries, materials
  );

  let elapsedTime = 0;
  let signFlickerTimer = 0;
  let signVisible = true;

  return {
    mesh: group,
    geometries,
    materials,

    update(audioData: AudioData, delta: number) {
      elapsedTime += delta;

      // Update all shader materials
      for (const material of materials) {
        if (material instanceof THREE.ShaderMaterial && material.uniforms?.u_time) {
          updateLiminalMaterial(material, elapsedTime, delta, audioData, 0);
        }
      }

      // --- Bass rumble: subtle platform shake (distant train vibration) ---
      const bassLevel = audioData.bass || 0;
      const shakeIntensity = bassLevel * 0.015;
      group.position.x = Math.sin(elapsedTime * 15) * shakeIntensity;
      group.position.y = Math.cos(elapsedTime * 22) * shakeIntensity * 0.5;

      // --- Mid-freq: tile hum ambience (fluorescent light intensity) ---
      const midLevel = audioData.mid || 0;
      fluorescentLights.forEach((light, i) => {
        const baseIntensity = 0.6;
        const buzz = 1.0 + Math.sin(elapsedTime * 90 + i * 5) * 0.015 * (0.5 + midLevel);
        light.intensity = baseIntensity * buzz + midLevel * 0.25;
      });

      // --- Sign flicker: irregular flickering "NEXT TRAIN" sign ---
      signFlickerTimer += delta;
      const flickerRate = 0.08 + Math.random() * 0.15;
      if (signFlickerTimer > flickerRate) {
        signFlickerTimer = 0;
        // Occasionally flicker off
        if (signVisible && Math.random() < 0.12) {
          signVisible = false;
          signMaterial.emissiveIntensity = 0.05;
          signMesh.visible = true; // Keep mesh visible but dim
        } else {
          signVisible = true;
          signMaterial.emissiveIntensity = 0.6 + midLevel * 0.4;
        }
      }
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
