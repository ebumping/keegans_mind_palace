/**
 * The Parking Garage — Room 11
 *
 * A vast, mostly-empty concrete parking structure (30m × 2.8m × 30m) bathed in
 * sickly sodium-orange light. Painted lane lines stripe the floor. Thick concrete
 * columns march in a grid. A ramp leads upward to a wall — it goes nowhere.
 * Overhead pipes run along the low ceiling.
 *
 * Sparse sodium-vapor ceiling lights cast pools of warm orange, leaving deep
 * shadows between. A glowing exit sign beckons from one wall.
 *
 * Audio reactivity: bass mapped to echo/footstep reverb intensity, mid-freq
 * mapped to pipe drip, high-freq mapped to light buzz flicker.
 *
 * Creative direction: The parking garage is pure transitional space — designed
 * to be passed through, never inhabited. The low ceiling presses down, sodium
 * lights cast everything in jaundiced orange, and the ramp that leads nowhere
 * suggests a structure that extends infinitely but offers no escape. Oil stains
 * on the floor hint at cars that once were here but are long gone.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — raw concrete grey, sodium orange, yellow lane paint, dark oil stain
// =============================================================================
const PALETTE = {
  // Concrete surfaces
  concreteFloor: '#8a8a82',       // Worn grey concrete floor
  concreteWall: '#7a7a72',        // Slightly darker wall concrete
  concreteCeiling: '#6a6a62',     // Dark grimy ceiling
  concreteColumn: '#888880',      // Column concrete
  concreteRamp: '#808078',        // Ramp surface

  // Paint & markings
  laneYellow: '#d4c030',          // Yellow lane line paint
  laneWhite: '#c8c8c0',           // White parking space lines
  rampArrow: '#c0b828',           // Directional arrow paint

  // Oil & stains
  oilStain: '#2a2a28',            // Dark oil patches
  tireMarks: '#3a3a38',           // Tire scuff marks

  // Lighting
  sodiumOrange: '#ff9030',        // Sodium-vapor warm orange
  sodiumDim: '#c07020',           // Dimmer sodium tone
  lightFixture: '#666660',        // Metal light housing
  exitGreen: '#00cc44',           // Exit sign green
  exitRed: '#cc2200',             // Exit sign red accent

  // Pipes
  pipeMetal: '#606058',           // Overhead pipe grey
  pipeRust: '#6e5540',            // Rust patches

  // Atmosphere
  fogColor: '#1a1810',            // Dark warm fog
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 30;
const HEIGHT = 2.8;
const DEPTH = 30;
const HALF_W = WIDTH / 2;    // 15
const HALF_D = DEPTH / 2;    // 15

const COLUMN_SPACING_X = 6;      // Column grid spacing along X
const COLUMN_SPACING_Z = 6;      // Column grid spacing along Z
const COLUMN_RADIUS = 0.3;       // Concrete column radius

// =============================================================================
// Material helpers
// =============================================================================

/** Concrete floor material */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 11,
    patternScale: 0.6,
    patternRotation: 0.0,
    breatheIntensity: 0.06,
    rippleFrequency: 0.3,
    rippleIntensity: 0.03,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Concrete wall material */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1100,
    roomIndex: 11,
    patternScale: 1.2,
    patternRotation: 0.0,
    breatheIntensity: 0.08,
    rippleFrequency: 0.4,
    rippleIntensity: 0.04,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — dark, stained concrete */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2200,
    roomIndex: 11,
    patternScale: 0.5,
    patternRotation: 0.0,
    breatheIntensity: 0.04,
    rippleFrequency: 0.2,
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

/** Build the 4 outer walls */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  const wallDefs = [
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH },
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH },
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH },
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

/** Build the open floor plane with painted lane lines and oil stains */
function buildFloorAndLanes(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  // Main floor
  const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 8, 8);
  applyUVMapping(floorGeo, WIDTH, DEPTH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  geometries.push(floorGeo);

  // Dark fallback floor
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);

  // Lane line material
  const laneMat = new THREE.MeshStandardMaterial({
    color: PALETTE.laneYellow,
    roughness: 0.6,
    metalness: 0.0,
    emissive: PALETTE.laneYellow,
    emissiveIntensity: 0.05,
  });
  materials.push(laneMat);

  // Central driving lane lines (two parallel yellow lines running along Z)
  const laneGeo = new THREE.BoxGeometry(0.12, 0.005, DEPTH * 0.8);
  geometries.push(laneGeo);

  [-3, 3].forEach((lx) => {
    const lane = new THREE.Mesh(laneGeo, laneMat);
    lane.position.set(lx, 0.003, 0);
    group.add(lane);
  });

  // Parking space lines (white, perpendicular to lanes)
  const spaceMat = new THREE.MeshStandardMaterial({
    color: PALETTE.laneWhite,
    roughness: 0.6,
    metalness: 0.0,
  });
  materials.push(spaceMat);

  const spaceLineGeo = new THREE.BoxGeometry(0.08, 0.005, 2.5);
  geometries.push(spaceLineGeo);

  // Parking spaces on left side
  for (let i = 0; i < 8; i++) {
    const sz = -HALF_D + 2 + i * 3.2;
    const line = new THREE.Mesh(spaceLineGeo, spaceMat);
    line.position.set(-HALF_W + 3.5, 0.003, sz);
    group.add(line);
  }

  // Parking spaces on right side
  for (let i = 0; i < 8; i++) {
    const sz = -HALF_D + 2 + i * 3.2;
    const line = new THREE.Mesh(spaceLineGeo, spaceMat);
    line.position.set(HALF_W - 3.5, 0.003, sz);
    group.add(line);
  }

  // Oil stains (dark patches on floor)
  const oilMat = new THREE.MeshStandardMaterial({
    color: PALETTE.oilStain,
    roughness: 0.95,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
  });
  materials.push(oilMat);

  const oilPositions = [
    { x: -8, z: -5, sx: 1.2, sz: 0.8 },
    { x: 5, z: 3, sx: 0.9, sz: 1.1 },
    { x: -2, z: 10, sx: 1.5, sz: 0.7 },
    { x: 10, z: -8, sx: 0.8, sz: 1.3 },
    { x: -11, z: 7, sx: 1.0, sz: 0.9 },
  ];

  oilPositions.forEach((op) => {
    const oilGeo = new THREE.PlaneGeometry(op.sx, op.sz);
    const oil = new THREE.Mesh(oilGeo, oilMat);
    oil.rotation.x = -Math.PI / 2;
    oil.position.set(op.x, 0.004, op.z);
    group.add(oil);
    geometries.push(oilGeo);
  });
}

/** Build concrete column grid */
function buildColumns(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const columnMat = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteColumn,
    roughness: 0.85,
    metalness: 0.05,
  });
  materials.push(columnMat);

  const columnGeo = new THREE.CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, HEIGHT, 12);
  geometries.push(columnGeo);

  // Column grid — skip positions near ramp area (positive X, positive Z corner)
  const colsX = Math.floor((WIDTH - 4) / COLUMN_SPACING_X);
  const colsZ = Math.floor((DEPTH - 4) / COLUMN_SPACING_Z);

  for (let ix = 0; ix <= colsX; ix++) {
    for (let iz = 0; iz <= colsZ; iz++) {
      const cx = -HALF_W + 3 + ix * COLUMN_SPACING_X;
      const cz = -HALF_D + 3 + iz * COLUMN_SPACING_Z;

      // Skip columns that would overlap with the ramp (roughly x > 8, z > 8)
      if (cx > 8 && cz > 8) continue;

      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.set(cx, HEIGHT / 2, cz);
      column.castShadow = true;
      column.receiveShadow = true;
      group.add(column);
    }
  }
}

/** Build a ramp structure and ceiling pipe runs */
function buildRampAndPipes(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // --- Ramp ---
  const rampMat = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteRamp,
    roughness: 0.85,
    metalness: 0.05,
  });
  materials.push(rampMat);

  // Angled ramp surface (leads upward toward back-right corner wall)
  const rampLength = 10;
  const rampWidth = 5;
  const rampGeo = new THREE.PlaneGeometry(rampWidth, rampLength, 4, 6);
  const rampMesh = new THREE.Mesh(rampGeo, rampMat);
  // Position in back-right area, angled upward
  rampMesh.rotation.x = -Math.PI / 2 + 0.18; // Slight upward angle (~10°)
  rampMesh.position.set(HALF_W - 4, 0.9, HALF_D - 5);
  rampMesh.receiveShadow = true;
  group.add(rampMesh);
  geometries.push(rampGeo);

  // Ramp side walls (low concrete barriers)
  const barrierGeo = new THREE.BoxGeometry(0.2, 0.6, rampLength);
  geometries.push(barrierGeo);

  const barrierMat = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteWall,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(barrierMat);

  [-rampWidth / 2, rampWidth / 2].forEach((offsetX) => {
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(HALF_W - 4 + offsetX, 0.5, HALF_D - 5);
    group.add(barrier);
  });

  // Arrow paint on ramp surface
  const arrowMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rampArrow,
    roughness: 0.6,
    metalness: 0.0,
    emissive: PALETTE.rampArrow,
    emissiveIntensity: 0.03,
  });
  materials.push(arrowMat);

  // Arrow shaft
  const arrowShaftGeo = new THREE.BoxGeometry(0.3, 0.006, 2.0);
  const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
  arrowShaft.position.set(HALF_W - 4, 0.55, HALF_D - 6);
  arrowShaft.rotation.x = -0.18;
  group.add(arrowShaft);
  geometries.push(arrowShaftGeo);

  // --- Ceiling Pipes ---
  const pipeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pipeMetal,
    roughness: 0.5,
    metalness: 0.4,
  });
  const pipeRustMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pipeRust,
    roughness: 0.7,
    metalness: 0.3,
  });
  materials.push(pipeMat, pipeRustMat);

  // Long pipes running along X axis near ceiling
  const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, WIDTH * 0.9, 8);
  geometries.push(pipeGeo);

  const pipeZPositions = [-8, -2, 5, 11];

  pipeZPositions.forEach((pz, i) => {
    const pipe = new THREE.Mesh(pipeGeo, i % 2 === 0 ? pipeMat : pipeRustMat);
    pipe.rotation.z = Math.PI / 2; // Horizontal along X
    pipe.position.set(0, HEIGHT - 0.15 - i * 0.08, pz);
    group.add(pipe);
  });

  // Shorter cross-pipes running along Z
  const crossPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 8, 8);
  geometries.push(crossPipeGeo);

  const crossPipeXPositions = [-10, 0, 8];

  crossPipeXPositions.forEach((px) => {
    const pipe = new THREE.Mesh(crossPipeGeo, pipeMat);
    pipe.rotation.x = Math.PI / 2; // Horizontal along Z
    pipe.position.set(px, HEIGHT - 0.25, -4);
    group.add(pipe);
  });
}

/** Build sparse sodium-vapor lights and an exit sign */
function buildLighting(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  sodiumLights: THREE.PointLight[];
  exitSignMaterial: THREE.MeshStandardMaterial;
} {
  const sodiumLights: THREE.PointLight[] = [];

  // Light fixture housing material
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lightFixture,
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(fixtureMat);

  // Emissive disc for the sodium lamp
  const discMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sodiumOrange,
    emissive: PALETTE.sodiumOrange,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.0,
  });
  materials.push(discMat);

  // Fixture geometry
  const housingGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
  const discGeo = new THREE.CircleGeometry(0.2, 12);
  geometries.push(housingGeo, discGeo);

  // Sparse grid of sodium lights — deliberately uneven spacing for liminal feel
  const lightPositions = [
    { x: -9, z: -9 },
    { x: -9, z: 3 },
    { x: -3, z: -6 },
    { x: -3, z: 6 },
    { x: 3, z: -9 },
    { x: 3, z: 3 },
    { x: 9, z: -3 },
    { x: 9, z: 9 },
  ];

  lightPositions.forEach((lp) => {
    // Housing
    const housing = new THREE.Mesh(housingGeo, fixtureMat);
    housing.position.set(lp.x, HEIGHT - 0.05, lp.z);
    group.add(housing);

    // Emissive disc (facing down)
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(lp.x, HEIGHT - 0.11, lp.z);
    group.add(disc);

    // Point light — sodium orange, limited range for pool-of-light effect
    const light = new THREE.PointLight(PALETTE.sodiumOrange, 0.8, 10, 2.0);
    light.position.set(lp.x, HEIGHT - 0.2, lp.z);
    group.add(light);
    sodiumLights.push(light);
  });

  // Dim ambient — very dark, garage should feel underlit
  const ambient = new THREE.AmbientLight('#201810', 0.08);
  group.add(ambient);

  // --- Exit sign ---
  const exitFrameMat = new THREE.MeshStandardMaterial({
    color: '#333333',
    roughness: 0.5,
    metalness: 0.3,
  });
  const exitSignMat = new THREE.MeshStandardMaterial({
    color: PALETTE.exitGreen,
    emissive: PALETTE.exitGreen,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.0,
  });
  materials.push(exitFrameMat, exitSignMat);

  // Sign frame on wall near exit side
  const exitFrameGeo = new THREE.BoxGeometry(0.8, 0.35, 0.05);
  const exitFrame = new THREE.Mesh(exitFrameGeo, exitFrameMat);
  exitFrame.position.set(-HALF_W + 5, HEIGHT - 0.3, -HALF_D + 0.03);
  group.add(exitFrame);
  geometries.push(exitFrameGeo);

  // Green emissive face
  const exitFaceGeo = new THREE.PlaneGeometry(0.7, 0.25);
  const exitFace = new THREE.Mesh(exitFaceGeo, exitSignMat);
  exitFace.position.set(-HALF_W + 5, HEIGHT - 0.3, -HALF_D + 0.06);
  group.add(exitFace);
  geometries.push(exitFaceGeo);

  // Small green point light from exit sign
  const exitLight = new THREE.PointLight(PALETTE.exitGreen, 0.3, 4, 2.0);
  exitLight.position.set(-HALF_W + 5, HEIGHT - 0.4, -HALF_D + 0.3);
  group.add(exitLight);

  return { sodiumLights, exitSignMaterial: exitSignMat };
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

  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 6, 6);
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

export interface ParkingGarageRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Parking Garage scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildParkingGarage(seed: number = 411): ParkingGarageRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorAndLanes(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildColumns(group, geometries, materials);
  buildRampAndPipes(group, geometries, materials);
  const { sodiumLights, exitSignMaterial } = buildLighting(group, geometries, materials);

  let elapsedTime = 0;

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

      // --- Bass: echo/footstep reverb intensity (subtle position tremor) ---
      const bassLevel = audioData.bass || 0;
      const echoShake = bassLevel * 0.008;
      group.position.x = Math.sin(elapsedTime * 8) * echoShake;
      group.position.z = Math.cos(elapsedTime * 11) * echoShake * 0.5;

      // --- Mid-freq: pipe drip (sodium light subtle pulsing) ---
      const midLevel = audioData.mid || 0;
      sodiumLights.forEach((light, i) => {
        const baseIntensity = 0.8;
        const drip = 1.0 + Math.sin(elapsedTime * 2.5 + i * 1.7) * 0.08 * (0.3 + midLevel);
        light.intensity = baseIntensity * drip;
      });

      // --- High-freq: light buzz flicker ---
      const highLevel = audioData.high || 0;
      sodiumLights.forEach((light, i) => {
        const buzz = 1.0 + Math.sin(elapsedTime * 60 + i * 13) * 0.02 * (0.5 + highLevel * 2);
        light.intensity *= buzz;

        // Occasional deeper flicker on high transients
        if (highLevel > 0.6 && Math.sin(elapsedTime * 120 + i * 7) > 0.9) {
          light.intensity *= 0.4;
        }
      });

      // Exit sign subtle pulse
      exitSignMaterial.emissiveIntensity = 0.8 + Math.sin(elapsedTime * 1.5) * 0.1;
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
