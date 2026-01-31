/**
 * The Laundromat — Room 12
 *
 * A narrow, fluorescent-blasted laundromat (8m × 3m × 15m). Rows of
 * front-loading washing machines line both long walls — chrome-trimmed
 * BoxGeometry housings with CylinderGeometry drum windows. A folding table
 * runs down the center. A vending machine glows at one end.
 *
 * Harsh overhead fluorescent panels wash everything in flat white light.
 * Small emissive circles on the machine fronts suggest dryer windows
 * glowing with warm tumbling heat.
 *
 * Audio reactivity: bass mapped to washing machine rumble cycle (oscillating
 * intensity), mid mapped to tumble rhythm, transient triggers coin-drop
 * light flash.
 *
 * Creative direction: The laundromat is perpetual waiting — machines churn
 * endlessly but no one comes to collect. The fluorescent buzz is oppressive,
 * the vending machine hums in the corner, and the dryer windows glow with
 * hypnotic warmth. Everything is clean but no one is here.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — white tile, chrome silver, warm fluorescent, linoleum beige
// =============================================================================
const PALETTE = {
  // Surfaces
  linoleumFloor: '#c8b898',       // Worn linoleum beige
  tileWall: '#e8e4dc',            // White tile walls
  ceiling: '#d8d4cc',             // Off-white ceiling

  // Machines
  machineWhite: '#e0dcd4',        // Washer/dryer housing white
  chromeRim: '#b8b8b0',           // Chrome trim/door rim
  drumInterior: '#404040',        // Dark drum interior
  dryerGlow: '#ff8830',           // Warm dryer window glow

  // Furniture
  foldingTable: '#c0b8a8',        // Beige laminate table
  tableLeg: '#808080',            // Metal table legs

  // Vending machine
  vendingBody: '#2050a0',         // Blue vending machine body
  vendingFace: '#60c0ff',         // Lit vending front panel
  vendingGlow: '#80d0ff',         // Vending glow color

  // Lighting
  fluorescentWhite: '#f0ece0',    // Harsh warm-white fluorescent
  fluorescentEmit: '#fff8e0',     // Fluorescent emissive color

  // Accents
  detergentBlue: '#3080d0',       // Detergent residue blue tint
  coinSlotSilver: '#a0a098',      // Coin slot metal
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 8;
const HEIGHT = 3;
const DEPTH = 15;
const HALF_W = WIDTH / 2;   // 4
const HALF_D = DEPTH / 2;   // 7.5

// Machine layout
const MACHINE_SIZE = 0.7;         // Width/depth of each machine housing
const MACHINE_HEIGHT = 0.85;      // Height of each machine
const MACHINE_SPACING = 0.95;     // Center-to-center spacing along Z
const DRUM_RADIUS = 0.25;         // Visible drum window radius
const MACHINES_PER_SIDE = 13;     // Number of machines per wall

// =============================================================================
// Material helpers
// =============================================================================

function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 12,
    patternScale: 0.8,
    patternRotation: 0.0,
    breatheIntensity: 0.05,
    rippleFrequency: 0.3,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1200,
    roomIndex: 12,
    patternScale: 1.0,
    patternRotation: 0.0,
    breatheIntensity: 0.06,
    rippleFrequency: 0.4,
    rippleIntensity: 0.03,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2400,
    roomIndex: 12,
    patternScale: 0.6,
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

/** Build floor and ceiling */
function buildFloorAndCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  // Floor
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

  // Fallback floor
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
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

/** Build rows of front-loading washing machines along both walls */
function buildWashingMachines(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { dryerWindowMaterials: THREE.MeshStandardMaterial[] } {
  const dryerWindowMaterials: THREE.MeshStandardMaterial[] = [];

  // Machine housing material
  const machineMat = new THREE.MeshStandardMaterial({
    color: PALETTE.machineWhite,
    roughness: 0.4,
    metalness: 0.15,
  });
  materials.push(machineMat);

  // Chrome rim material
  const chromeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chromeRim,
    roughness: 0.2,
    metalness: 0.7,
  });
  materials.push(chromeMat);

  // Drum interior material (dark)
  const drumMat = new THREE.MeshStandardMaterial({
    color: PALETTE.drumInterior,
    roughness: 0.6,
    metalness: 0.3,
  });
  materials.push(drumMat);

  // Coin slot material
  const coinMat = new THREE.MeshStandardMaterial({
    color: PALETTE.coinSlotSilver,
    roughness: 0.3,
    metalness: 0.6,
  });
  materials.push(coinMat);

  // Shared geometries
  const housingGeo = new THREE.BoxGeometry(MACHINE_SIZE, MACHINE_HEIGHT, MACHINE_SIZE);
  const drumGeo = new THREE.CylinderGeometry(DRUM_RADIUS, DRUM_RADIUS, 0.02, 16);
  const rimGeo = new THREE.TorusGeometry(DRUM_RADIUS + 0.02, 0.02, 8, 16);
  const coinSlotGeo = new THREE.BoxGeometry(0.12, 0.06, 0.02);
  geometries.push(housingGeo, drumGeo, rimGeo, coinSlotGeo);

  // Place machines along both long walls (left: -X, right: +X)
  const sides = [
    { x: -HALF_W + MACHINE_SIZE / 2 + 0.1, faceRotY: Math.PI / 2 },
    { x: HALF_W - MACHINE_SIZE / 2 - 0.1, faceRotY: -Math.PI / 2 },
  ];

  sides.forEach((side) => {
    for (let i = 0; i < MACHINES_PER_SIDE; i++) {
      const mz = -HALF_D + 1.0 + i * MACHINE_SPACING;

      // Housing
      const housing = new THREE.Mesh(housingGeo, machineMat);
      housing.position.set(side.x, MACHINE_HEIGHT / 2, mz);
      housing.castShadow = true;
      housing.receiveShadow = true;
      group.add(housing);

      // Dryer window (emissive circle on front face — facing center aisle)
      const dryerMat = new THREE.MeshStandardMaterial({
        color: PALETTE.dryerGlow,
        emissive: PALETTE.dryerGlow,
        emissiveIntensity: 0.25,
        roughness: 0.3,
        metalness: 0.1,
      });
      materials.push(dryerMat);
      dryerWindowMaterials.push(dryerMat);

      const drum = new THREE.Mesh(drumGeo, dryerMat);
      const faceOffset = side.x > 0 ? -MACHINE_SIZE / 2 - 0.011 : MACHINE_SIZE / 2 + 0.011;
      drum.position.set(side.x + faceOffset, MACHINE_HEIGHT * 0.45, mz);
      drum.rotation.z = Math.PI / 2; // Face sideways
      group.add(drum);

      // Chrome rim around drum window
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      rim.position.set(side.x + faceOffset, MACHINE_HEIGHT * 0.45, mz);
      rim.rotation.y = side.faceRotY;
      group.add(rim);

      // Coin slot on top
      const coinSlot = new THREE.Mesh(coinSlotGeo, coinMat);
      coinSlot.position.set(side.x, MACHINE_HEIGHT + 0.01, mz);
      group.add(coinSlot);
    }
  });

  return { dryerWindowMaterials };
}

/** Build a folding table in the center */
function buildFoldingTable(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const tableMat = new THREE.MeshStandardMaterial({
    color: PALETTE.foldingTable,
    roughness: 0.6,
    metalness: 0.05,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tableLeg,
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(tableMat, legMat);

  // Table top — long, narrow, runs most of the length
  const tableLength = 8;
  const tableWidth = 1.2;
  const tableHeight = 0.78;
  const tableThickness = 0.04;

  const topGeo = new THREE.BoxGeometry(tableWidth, tableThickness, tableLength);
  const top = new THREE.Mesh(topGeo, tableMat);
  top.position.set(0, tableHeight, 0);
  top.receiveShadow = true;
  group.add(top);
  geometries.push(topGeo);

  // Legs (4 corners)
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, tableHeight, 8);
  geometries.push(legGeo);

  const legPositions = [
    { x: -tableWidth / 2 + 0.05, z: -tableLength / 2 + 0.1 },
    { x: tableWidth / 2 - 0.05, z: -tableLength / 2 + 0.1 },
    { x: -tableWidth / 2 + 0.05, z: tableLength / 2 - 0.1 },
    { x: tableWidth / 2 - 0.05, z: tableLength / 2 - 0.1 },
  ];

  legPositions.forEach((lp) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lp.x, tableHeight / 2, lp.z);
    group.add(leg);
  });
}

/** Build vending machine at one end */
function buildVendingMachine(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.MeshStandardMaterial {
  const vendBodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.vendingBody,
    roughness: 0.5,
    metalness: 0.2,
  });
  const vendFaceMat = new THREE.MeshStandardMaterial({
    color: PALETTE.vendingFace,
    emissive: PALETTE.vendingGlow,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.1,
  });
  materials.push(vendBodyMat, vendFaceMat);

  const vendW = 1.0;
  const vendH = 1.9;
  const vendD = 0.7;

  // Body
  const bodyGeo = new THREE.BoxGeometry(vendW, vendH, vendD);
  const body = new THREE.Mesh(bodyGeo, vendBodyMat);
  body.position.set(0, vendH / 2, HALF_D - vendD / 2 - 0.1);
  body.castShadow = true;
  group.add(body);
  geometries.push(bodyGeo);

  // Lit front panel
  const faceGeo = new THREE.PlaneGeometry(vendW * 0.85, vendH * 0.7);
  const face = new THREE.Mesh(faceGeo, vendFaceMat);
  face.position.set(0, vendH * 0.55, HALF_D - vendD - 0.1 - 0.01);
  face.rotation.y = Math.PI; // Face toward room center
  group.add(face);
  geometries.push(faceGeo);

  // Vending machine point light
  const vendLight = new THREE.PointLight(PALETTE.vendingGlow, 0.4, 5, 2.0);
  vendLight.position.set(0, vendH * 0.55, HALF_D - vendD - 0.3);
  group.add(vendLight);

  return vendFaceMat;
}

/** Build harsh overhead fluorescent lights */
function buildLighting(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  fluorescentMaterials: THREE.MeshStandardMaterial[];
  fluorescentLights: THREE.PointLight[];
} {
  const fluorescentMaterials: THREE.MeshStandardMaterial[] = [];
  const fluorescentLights: THREE.PointLight[] = [];

  // Fluorescent panel material
  const panelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescentWhite,
    emissive: PALETTE.fluorescentEmit,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.0,
  });
  materials.push(panelMat);
  fluorescentMaterials.push(panelMat);

  // Housing material
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#888880',
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(housingMat);

  // Fluorescent panel geometry
  const panelGeo = new THREE.PlaneGeometry(1.2, 0.3);
  const housingGeo = new THREE.BoxGeometry(1.3, 0.06, 0.35);
  geometries.push(panelGeo, housingGeo);

  // Place fluorescent panels in a row along the ceiling center
  const numPanels = 6;
  const panelSpacing = DEPTH / (numPanels + 1);

  for (let i = 0; i < numPanels; i++) {
    const pz = -HALF_D + panelSpacing * (i + 1);

    // Housing
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(0, HEIGHT - 0.03, pz);
    group.add(housing);

    // Emissive panel (facing down)
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.rotation.x = -Math.PI / 2;
    panel.position.set(0, HEIGHT - 0.07, pz);
    group.add(panel);

    // Point light
    const light = new THREE.PointLight(PALETTE.fluorescentWhite, 0.7, 6, 2.0);
    light.position.set(0, HEIGHT - 0.15, pz);
    group.add(light);
    fluorescentLights.push(light);
  }

  // Dim ambient
  const ambient = new THREE.AmbientLight('#201c18', 0.1);
  group.add(ambient);

  return { fluorescentMaterials, fluorescentLights };
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface LaundromatRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Laundromat scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildLaundromat(seed: number = 412): LaundromatRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorAndCeiling(group, geometries, materials, seed);
  const { dryerWindowMaterials } = buildWashingMachines(group, geometries, materials);
  buildFoldingTable(group, geometries, materials);
  const vendFaceMat = buildVendingMachine(group, geometries, materials);
  const { fluorescentMaterials, fluorescentLights } = buildLighting(group, geometries, materials);

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

      // --- Bass: washing machine rumble cycle (oscillating intensity) ---
      const bassLevel = audioData.bass || 0;
      const rumbleCycle = Math.sin(elapsedTime * 3.5) * 0.5 + 0.5; // 0..1 oscillation
      const rumbleIntensity = 0.003 + bassLevel * 0.01 * rumbleCycle;
      group.position.x = Math.sin(elapsedTime * 12) * rumbleIntensity;
      group.position.y = Math.cos(elapsedTime * 15) * rumbleIntensity * 0.5;

      // Dryer window glow pulses with bass rumble
      dryerWindowMaterials.forEach((mat, i) => {
        const phase = elapsedTime * 2.0 + i * 0.4;
        const basePulse = 0.2 + bassLevel * 0.4 * (Math.sin(phase) * 0.5 + 0.5);
        mat.emissiveIntensity = basePulse;
      });

      // --- Mid: tumble rhythm (fluorescent subtle modulation) ---
      const midLevel = audioData.mid || 0;
      fluorescentLights.forEach((light, i) => {
        const tumble = 1.0 + Math.sin(elapsedTime * 5.0 + i * 2.1) * 0.04 * (0.3 + midLevel);
        light.intensity = 0.7 * tumble;
      });

      // Fluorescent material buzz responds to mid
      fluorescentMaterials.forEach((mat) => {
        const buzz = 0.75 + Math.sin(elapsedTime * 60) * 0.03 * (0.5 + midLevel);
        mat.emissiveIntensity = buzz;
      });

      // --- Transient: coin-drop light flash ---
      const transientLevel = audioData.transient || 0;
      if (transientLevel > 0.4) {
        // Brief bright flash on all fluorescents
        fluorescentLights.forEach((light) => {
          light.intensity = 1.2 + transientLevel * 0.5;
        });
        fluorescentMaterials.forEach((mat) => {
          mat.emissiveIntensity = 1.0 + transientLevel * 0.3;
        });
      }

      // Vending machine subtle pulse
      vendFaceMat.emissiveIntensity = 0.45 + Math.sin(elapsedTime * 1.2) * 0.08;
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
