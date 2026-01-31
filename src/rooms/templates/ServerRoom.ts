/**
 * The Server Room — Room 9
 *
 * A narrow data center aisle (12m × 3m × 20m) flanked by towering server racks.
 * Cold blue LED strips run along rack faces, punctuated by grids of blinking
 * green status lights. The raised floor tiles form a grid of slightly elevated
 * planes, and overhead cable trays carry bundled runs between racks.
 *
 * Terminal screens at each end of the aisle display static-like emissive noise —
 * unreadable, pulsing faintly. The air hums with an oppressive machine drone.
 *
 * Audio reactivity: high-freq synced to LED blink intensity, bass mapped to
 * rack vibration hum, transient triggers random blink pattern changes.
 *
 * Creative direction: The server room is a temple to inhuman logic — a space
 * built entirely for machines, not people. The narrow aisle between monolithic
 * racks creates claustrophobic enclosure. The cold blue light and ceaseless
 * blinking status LEDs suggest awareness without consciousness. The terminal
 * screens show data you can never read. You are a trespasser in a world that
 * doesn't need you, surrounded by the quiet hum of something thinking.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — cold blue, green LED, dark metal
// =============================================================================
const PALETTE = {
  // Rack metal
  rackDark: '#1a1a22',         // Dark server rack metal
  rackPanel: '#222230',        // Front panel face
  rackTrim: '#2a2a38',         // Rack edge trim
  rackVent: '#111118',         // Ventilation grille areas

  // Floor
  raisedTile: '#2a2a30',       // Raised floor tile — dark grey
  tileGap: '#0e0e12',          // Gap between raised tiles
  subFloor: '#080810',         // Sub-floor visible in gaps

  // Ceiling
  ceiling: '#181820',          // Dark ceiling
  cableTray: '#333340',        // Overhead cable tray metal

  // LEDs & lights
  ledBlue: '#2288ff',          // Blue LED strip color
  ledGreen: '#00ff44',         // Green status light
  ledAmber: '#ffaa00',         // Amber warning light (occasional)
  ledRed: '#ff2200',           // Red fault light (rare)

  // Terminal
  terminalGlow: '#00cc66',     // Green terminal phosphor
  terminalFrame: '#1a1a20',    // Terminal bezel

  // Atmosphere
  fogColor: '#060610',         // Deep cold blue-black fog
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 12;     // Room width (across aisle)
const HEIGHT = 3;
const DEPTH = 20;     // Room depth (aisle length)
const HALF_W = WIDTH / 2;   // 6
const HALF_D = DEPTH / 2;   // 10

const AISLE_WIDTH = 2.4;           // Walkable aisle between racks
const RACK_WIDTH = 0.8;            // Depth of each server rack
const RACK_HEIGHT = 2.6;           // Rack height (42U-ish)
const RACK_SPACING = 1.2;          // Spacing between racks along aisle
const RACK_COUNT_PER_SIDE = 14;    // Number of racks per side

const TILE_SIZE = 0.6;             // Raised floor tile dimension
const TILE_ELEVATION = 0.08;       // Tile raised height

// =============================================================================
// Material helpers
// =============================================================================

/** Dark metallic wall material */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 9,
    patternScale: 0.6,
    patternRotation: 0.0,
    breatheIntensity: 0.08,
    rippleFrequency: 0.4,
    rippleIntensity: 0.03,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Raised floor tile material */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 900,
    roomIndex: 9,
    patternScale: 1.2,
    patternRotation: 0.0,
    breatheIntensity: 0.06,
    rippleFrequency: 0.3,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — dark, industrial */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1800,
    roomIndex: 9,
    patternScale: 0.4,
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
    // Back wall (z = -10)
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH },
    // Front wall (z = +10)
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH },
    // Left wall (x = -6)
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH },
    // Right wall (x = +6)
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

/** Build raised floor tiles — grid of slightly elevated planes */
function buildRaisedFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  // Sub-floor (dark void below tiles)
  const subFloorGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const subFloorMat = new THREE.MeshBasicMaterial({ color: PALETTE.subFloor });
  const subFloor = new THREE.Mesh(subFloorGeo, subFloorMat);
  subFloor.rotation.x = -Math.PI / 2;
  subFloor.position.y = -0.05;
  group.add(subFloor);
  geometries.push(subFloorGeo);
  materials.push(subFloorMat);

  // Raised tile grid
  const tileGeo = new THREE.BoxGeometry(TILE_SIZE - 0.02, TILE_ELEVATION, TILE_SIZE - 0.02);
  geometries.push(tileGeo);

  const tileMat = new THREE.MeshStandardMaterial({
    color: PALETTE.raisedTile,
    roughness: 0.7,
    metalness: 0.2,
  });
  materials.push(tileMat);

  const tilesX = Math.floor(WIDTH / TILE_SIZE);
  const tilesZ = Math.floor(DEPTH / TILE_SIZE);

  for (let tx = 0; tx < tilesX; tx++) {
    for (let tz = 0; tz < tilesZ; tz++) {
      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(
        -HALF_W + TILE_SIZE / 2 + tx * TILE_SIZE,
        TILE_ELEVATION / 2,
        -HALF_D + TILE_SIZE / 2 + tz * TILE_SIZE
      );
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  // Main walkable floor plane on top of tiles (uses shader material)
  const mainFloorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 6, 6);
  applyUVMapping(mainFloorGeo, WIDTH, DEPTH);
  const mainFloor = new THREE.Mesh(mainFloorGeo, floorMat);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.y = TILE_ELEVATION;
  mainFloor.receiveShadow = true;
  group.add(mainFloor);
  geometries.push(mainFloorGeo);
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

  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 4, 4);
  applyUVMapping(ceilingGeo, WIDTH, DEPTH);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT;
  ceilingMesh.receiveShadow = true;
  group.add(ceilingMesh);
  geometries.push(ceilingGeo);
}

/** Build two rows of tall server racks flanking a narrow aisle */
function buildServerRacks(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { ledStripMeshes: THREE.Mesh[]; statusLights: THREE.PointLight[] } {
  const rackMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rackDark,
    roughness: 0.6,
    metalness: 0.4,
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rackPanel,
    roughness: 0.5,
    metalness: 0.3,
  });
  const ventMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rackVent,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ledStripMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ledBlue,
    emissive: PALETTE.ledBlue,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(rackMat, panelMat, ventMat, ledStripMat);

  const ledStripMeshes: THREE.Mesh[] = [];
  const statusLights: THREE.PointLight[] = [];

  // Rack body geometry
  const rackGeo = new THREE.BoxGeometry(RACK_WIDTH, RACK_HEIGHT, 1.0);
  // Front panel detail (slightly protruding)
  const panelGeo = new THREE.BoxGeometry(0.04, RACK_HEIGHT * 0.85, 0.9);
  // Vent grille strips on rack face
  const ventGeo = new THREE.BoxGeometry(0.02, 0.06, 0.8);
  // LED strip on rack face
  const ledGeo = new THREE.PlaneGeometry(0.03, 0.9);
  geometries.push(rackGeo, panelGeo, ventGeo, ledGeo);

  const sides = [
    { xBase: -AISLE_WIDTH / 2 - RACK_WIDTH / 2, facingDir: 1 },   // Left row
    { xBase: AISLE_WIDTH / 2 + RACK_WIDTH / 2, facingDir: -1 },    // Right row
  ];

  sides.forEach((side) => {
    for (let i = 0; i < RACK_COUNT_PER_SIDE; i++) {
      const rz = -HALF_D + 1.5 + i * RACK_SPACING;

      // Main rack body
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(side.xBase, TILE_ELEVATION + RACK_HEIGHT / 2, rz);
      rack.castShadow = true;
      rack.receiveShadow = true;
      group.add(rack);

      // Front panel detail
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(
        side.xBase + side.facingDir * (RACK_WIDTH / 2 + 0.02),
        TILE_ELEVATION + RACK_HEIGHT / 2,
        rz
      );
      group.add(panel);

      // Vent grille strips (3 per rack face)
      for (let v = 0; v < 3; v++) {
        const vent = new THREE.Mesh(ventGeo, ventMat);
        vent.position.set(
          side.xBase + side.facingDir * (RACK_WIDTH / 2 + 0.04),
          TILE_ELEVATION + 0.4 + v * 0.9,
          rz
        );
        group.add(vent);
      }

      // Blue LED strip along rack face edge
      const ledStrip = new THREE.Mesh(ledGeo, ledStripMat.clone());
      ledStrip.position.set(
        side.xBase + side.facingDir * (RACK_WIDTH / 2 + 0.05),
        TILE_ELEVATION + RACK_HEIGHT * 0.75,
        rz
      );
      ledStrip.rotation.y = side.facingDir > 0 ? 0 : Math.PI;
      group.add(ledStrip);
      ledStripMeshes.push(ledStrip);
      materials.push(ledStrip.material as THREE.Material);

      // Status light (point light — green blinking)
      if (i % 2 === 0) {
        const statusLight = new THREE.PointLight(PALETTE.ledGreen, 0.15, 2.5, 2);
        statusLight.position.set(
          side.xBase + side.facingDir * (RACK_WIDTH / 2 + 0.06),
          TILE_ELEVATION + RACK_HEIGHT * 0.5,
          rz
        );
        group.add(statusLight);
        statusLights.push(statusLight);
      }
    }
  });

  return { ledStripMeshes, statusLights };
}

/** Build overhead cable trays (BoxGeometry rails running along the ceiling) */
function buildCableTrays(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const trayMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cableTray,
    roughness: 0.6,
    metalness: 0.3,
  });
  materials.push(trayMat);

  // Two cable trays running the length of the room, above each rack row
  const trayGeo = new THREE.BoxGeometry(0.4, 0.08, DEPTH - 1.0);
  geometries.push(trayGeo);

  const trayPositions = [
    -AISLE_WIDTH / 2 - RACK_WIDTH / 2,
    AISLE_WIDTH / 2 + RACK_WIDTH / 2,
  ];

  trayPositions.forEach((tx) => {
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(tx, HEIGHT - 0.15, 0);
    group.add(tray);
  });

  // Cross-connects between trays (every ~4m)
  const crossGeo = new THREE.BoxGeometry(AISLE_WIDTH + RACK_WIDTH * 2, 0.06, 0.15);
  geometries.push(crossGeo);

  for (let c = 0; c < 4; c++) {
    const cz = -HALF_D + 3 + c * 5;
    const cross = new THREE.Mesh(crossGeo, trayMat);
    cross.position.set(0, HEIGHT - 0.12, cz);
    group.add(cross);
  }

  // Cable bundle runs (thin dark cylinders inside trays)
  const cableMat = new THREE.MeshStandardMaterial({
    color: '#0a0a14',
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(cableMat);

  const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, DEPTH - 2.0, 6);
  geometries.push(cableGeo);

  trayPositions.forEach((tx) => {
    for (let b = 0; b < 3; b++) {
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.rotation.x = Math.PI / 2;
      cable.position.set(tx - 0.12 + b * 0.12, HEIGHT - 0.1, 0);
      group.add(cable);
    }
  });
}

/** Build terminal screen planes at aisle ends */
function buildTerminals(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { terminalMaterials: THREE.MeshStandardMaterial[] } {
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.terminalFrame,
    roughness: 0.7,
    metalness: 0.3,
  });
  materials.push(frameMat);

  const terminalMaterials: THREE.MeshStandardMaterial[] = [];

  // Terminal at each end of the aisle
  const terminalDefs = [
    { z: -HALF_D + 0.3, rotY: 0 },       // Back end
    { z: HALF_D - 0.3, rotY: Math.PI },   // Front end
  ];

  terminalDefs.forEach((td) => {
    // Bezel frame
    const frameGeo = new THREE.BoxGeometry(1.2, 0.9, 0.08);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, TILE_ELEVATION + 1.4, td.z);
    frame.rotation.y = td.rotY;
    group.add(frame);
    geometries.push(frameGeo);

    // Screen surface — emissive with static glow
    const screenMat = new THREE.MeshStandardMaterial({
      color: '#001a0d',
      emissive: PALETTE.terminalGlow,
      emissiveIntensity: 0.35,
      roughness: 0.05,
      metalness: 0.0,
    });
    materials.push(screenMat);
    terminalMaterials.push(screenMat);

    const screenGeo = new THREE.PlaneGeometry(1.0, 0.72);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, TILE_ELEVATION + 1.4, td.z + (td.rotY === 0 ? 0.05 : -0.05));
    screen.rotation.y = td.rotY;
    group.add(screen);
    geometries.push(screenGeo);

    // Terminal glow light
    const glowLight = new THREE.PointLight(PALETTE.terminalGlow, 0.2, 4, 2);
    glowLight.position.set(0, TILE_ELEVATION + 1.4, td.z + (td.rotY === 0 ? 0.3 : -0.3));
    group.add(glowLight);
  });

  return { terminalMaterials };
}

/** Build ambient lighting — cold blue tint */
function buildLighting(
  group: THREE.Group
): void {
  // Cold ambient fill
  const ambient = new THREE.AmbientLight('#0a0a18', 0.08);
  group.add(ambient);

  // Overhead cold blue spots along the aisle
  for (let i = 0; i < 5; i++) {
    const lz = -HALF_D + 2 + i * 4;
    const light = new THREE.PointLight('#1a2a44', 0.3, 6, 2);
    light.position.set(0, HEIGHT - 0.2, lz);
    group.add(light);
  }
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface ServerRoomResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Server Room scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildServerRoom(seed: number = 309): ServerRoomResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildRaisedFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  const { ledStripMeshes, statusLights } = buildServerRacks(group, geometries, materials);
  buildCableTrays(group, geometries, materials);
  const { terminalMaterials } = buildTerminals(group, geometries, materials);
  buildLighting(group);

  let elapsedTime = 0;
  let blinkPattern = statusLights.map(() => Math.random() * Math.PI * 2);

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

      // --- High-freq synced to LED blink intensity ---
      const highLevel = audioData.high || 0;
      ledStripMeshes.forEach((led, i) => {
        const mat = led.material as THREE.MeshStandardMaterial;
        const pulse = 0.4 + Math.sin(elapsedTime * 3.0 + i * 0.7) * 0.15;
        mat.emissiveIntensity = pulse + highLevel * 0.5;
      });

      // --- Status light blinking (green LEDs) ---
      statusLights.forEach((light, i) => {
        const phase = blinkPattern[i];
        const blink = Math.sin(elapsedTime * 2.5 + phase) > 0.2 ? 1.0 : 0.05;
        light.intensity = 0.15 * blink + highLevel * 0.1;
      });

      // --- Bass mapped to rack vibration hum ---
      const bassLevel = audioData.bass || 0;
      const vibration = bassLevel * 0.004;
      group.position.x = Math.sin(elapsedTime * 30) * vibration;
      group.position.z = Math.cos(elapsedTime * 25) * vibration * 0.5;

      // --- Transient triggers random blink pattern changes ---
      const transientLevel = audioData.transient || 0;
      if (transientLevel > 0.4) {
        // Randomize some blink phases
        const changeCount = Math.floor(transientLevel * statusLights.length * 0.5);
        for (let c = 0; c < changeCount; c++) {
          const idx = Math.floor(Math.random() * blinkPattern.length);
          blinkPattern[idx] = Math.random() * Math.PI * 2;
        }
      }

      // --- Terminal screen static flicker ---
      const midLevel = audioData.mid || 0;
      terminalMaterials.forEach((mat, i) => {
        const flicker = 0.25 + Math.sin(elapsedTime * 8 + i * 3) * 0.1;
        mat.emissiveIntensity = flicker + midLevel * 0.15 + transientLevel * 0.2;
      });
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
