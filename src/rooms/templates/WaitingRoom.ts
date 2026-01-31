/**
 * The Waiting Room — Room 13
 *
 * A mid-sized government/medical waiting room (12m × 3m × 10m). Rows of
 * connected chairs with shared armrest bars face a frosted-glass reception
 * window. A "NOW SERVING" number display glows above the window. Magazines
 * sit in a neat stack on a side table. A water cooler stands in the corner.
 *
 * Flat overhead panel lights wash the room in even, lifeless illumination.
 * Blank motivational poster frames line the walls — frames with nothing
 * inside them.
 *
 * Audio reactivity: transient mapped to number display tick/change,
 * bass mapped to HVAC drone ambience.
 *
 * Creative direction: You are always next in line but never called. The
 * number display ticks forward but it is never your number. The posters
 * promise nothing. The water cooler gurgles. Time passes.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — mauve chair fabric, teal accents, drop-ceiling white, beige walls
// =============================================================================
const PALETTE = {
  // Surfaces
  floor: '#b8a890',               // Worn commercial carpet beige
  wall: '#d0c8b8',               // Institutional beige walls
  ceiling: '#dcd8d0',            // Drop-ceiling white

  // Chairs
  chairFabric: '#8a6878',        // Mauve upholstery
  chairMetal: '#707070',         // Chair frame metal grey
  armrestMetal: '#606060',       // Shared armrest bar

  // Reception
  receptionWall: '#a09888',      // Reception wall panel
  frostedGlass: '#c8d8d8',      // Frosted glass pane
  windowFrame: '#888078',        // Window frame

  // Accents
  tealAccent: '#508080',         // Teal trim / accent color
  nowServingBg: '#181818',       // Display background
  nowServingGlow: '#ff4020',     // Red LED number glow
  nowServingText: '#ff6040',     // LED text color

  // Furniture
  sideTable: '#907860',          // Wood-tone side table
  magazineStack: '#e0d8c8',     // Beige magazine pages
  waterCoolerBody: '#d0d0d0',   // Light grey cooler body
  waterCoolerBlue: '#4090c0',   // Blue water jug

  // Lighting
  panelLight: '#f0ece0',        // Flat panel light white
  panelEmit: '#fff8e8',         // Panel emissive

  // Poster frames
  posterFrame: '#706858',        // Dark wood frame
  posterInner: '#e8e4dc',        // Empty off-white center
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 12;
const HEIGHT = 3;
const DEPTH = 10;
const HALF_W = WIDTH / 2;   // 6
const HALF_D = DEPTH / 2;   // 5

// =============================================================================
// Material helpers
// =============================================================================

function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 13,
    patternScale: 0.7,
    patternRotation: 0.0,
    breatheIntensity: 0.04,
    rippleFrequency: 0.25,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1300,
    roomIndex: 13,
    patternScale: 0.9,
    patternRotation: 0.0,
    breatheIntensity: 0.05,
    rippleFrequency: 0.3,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2600,
    roomIndex: 13,
    patternScale: 0.5,
    patternRotation: 0.0,
    breatheIntensity: 0.03,
    rippleFrequency: 0.2,
    rippleIntensity: 0.015,
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

/** Build rows of connected chairs with shared armrest bars */
function buildChairs(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const fabricMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chairFabric,
    roughness: 0.8,
    metalness: 0.0,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chairMetal,
    roughness: 0.4,
    metalness: 0.6,
  });
  const armrestMat = new THREE.MeshStandardMaterial({
    color: PALETTE.armrestMetal,
    roughness: 0.35,
    metalness: 0.65,
  });
  materials.push(fabricMat, metalMat, armrestMat);

  // Chair dimensions
  const seatW = 0.5;
  const seatD = 0.45;
  const seatH = 0.05;
  const seatY = 0.45;
  const backH = 0.4;
  const backThick = 0.04;
  const legH = seatY;
  const legR = 0.015;
  const chairSpacing = 0.6;

  // Shared geometries
  const seatGeo = new THREE.BoxGeometry(seatW, seatH, seatD);
  const backGeo = new THREE.BoxGeometry(seatW, backH, backThick);
  const legGeo = new THREE.CylinderGeometry(legR, legR, legH, 6);
  const armrestBarGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  geometries.push(seatGeo, backGeo, legGeo, armrestBarGeo);

  // Two rows of chairs facing the reception wall (+Z direction)
  const rowConfigs = [
    { z: -1.5, chairs: 8, startX: -HALF_W + 1.2 },
    { z: 0.5, chairs: 8, startX: -HALF_W + 1.2 },
  ];

  rowConfigs.forEach((row) => {
    for (let i = 0; i < row.chairs; i++) {
      const cx = row.startX + i * chairSpacing;

      // Seat cushion
      const seat = new THREE.Mesh(seatGeo, fabricMat);
      seat.position.set(cx, seatY, row.z);
      seat.castShadow = true;
      group.add(seat);

      // Backrest
      const back = new THREE.Mesh(backGeo, fabricMat);
      back.position.set(cx, seatY + seatH / 2 + backH / 2, row.z - seatD / 2 + backThick / 2);
      group.add(back);

      // 4 legs
      const legOffsets = [
        { x: -seatW / 2 + 0.04, z: -seatD / 2 + 0.04 },
        { x: seatW / 2 - 0.04, z: -seatD / 2 + 0.04 },
        { x: -seatW / 2 + 0.04, z: seatD / 2 - 0.04 },
        { x: seatW / 2 - 0.04, z: seatD / 2 - 0.04 },
      ];
      legOffsets.forEach((lo) => {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(cx + lo.x, legH / 2, row.z + lo.z);
        group.add(leg);
      });
    }

    // Shared armrest bar running along the row
    const totalRowW = (row.chairs - 1) * chairSpacing;
    const barGeo = new THREE.BoxGeometry(totalRowW + seatW, 0.025, 0.025);
    geometries.push(barGeo);
    const bar = new THREE.Mesh(barGeo, armrestMat);
    bar.position.set(
      row.startX + totalRowW / 2,
      seatY + seatH / 2 + 0.02,
      row.z - seatD / 2 - 0.02
    );
    group.add(bar);
  });
}

/** Build reception window with frosted glass on the +Z wall */
function buildReceptionWindow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Reception wall panel (thicker section around window)
  const panelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.receptionWall,
    roughness: 0.7,
    metalness: 0.05,
  });
  materials.push(panelMat);

  const panelW = 4;
  const panelH = 2.0;
  const panelGeo = new THREE.BoxGeometry(panelW, panelH, 0.12);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, panelH / 2 + 0.5, -HALF_D + 0.06);
  group.add(panel);
  geometries.push(panelGeo);

  // Window frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowFrame,
    roughness: 0.5,
    metalness: 0.3,
  });
  materials.push(frameMat);

  const windowW = 2.4;
  const windowH = 1.0;
  const frameThick = 0.06;

  // Horizontal frame bars (top and bottom)
  const hFrameGeo = new THREE.BoxGeometry(windowW + frameThick * 2, frameThick, 0.08);
  geometries.push(hFrameGeo);
  [windowH / 2, -windowH / 2].forEach((yOff) => {
    const bar = new THREE.Mesh(hFrameGeo, frameMat);
    bar.position.set(0, 1.3 + yOff, -HALF_D + 0.13);
    group.add(bar);
  });

  // Vertical frame bars (left and right)
  const vFrameGeo = new THREE.BoxGeometry(frameThick, windowH, 0.08);
  geometries.push(vFrameGeo);
  [-(windowW / 2 + frameThick / 2), windowW / 2 + frameThick / 2].forEach((xOff) => {
    const bar = new THREE.Mesh(vFrameGeo, frameMat);
    bar.position.set(xOff, 1.3, -HALF_D + 0.13);
    group.add(bar);
  });

  // Frosted glass pane
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.frostedGlass,
    roughness: 0.9,
    metalness: 0.0,
    transparent: true,
    opacity: 0.6,
  });
  materials.push(glassMat);

  const glassGeo = new THREE.PlaneGeometry(windowW, windowH);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 1.3, -HALF_D + 0.14);
  group.add(glass);
  geometries.push(glassGeo);

  // Small counter shelf below window
  const shelfGeo = new THREE.BoxGeometry(windowW + 0.2, 0.04, 0.25);
  const shelf = new THREE.Mesh(shelfGeo, frameMat);
  shelf.position.set(0, 0.78, -HALF_D + 0.2);
  group.add(shelf);
  geometries.push(shelfGeo);
}

/** Build NOW SERVING number display above reception window */
function buildNowServingDisplay(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.MeshStandardMaterial {
  // Display backing
  const bgMat = new THREE.MeshStandardMaterial({
    color: PALETTE.nowServingBg,
    roughness: 0.8,
    metalness: 0.2,
  });
  materials.push(bgMat);

  const displayW = 1.6;
  const displayH = 0.4;
  const bgGeo = new THREE.BoxGeometry(displayW, displayH, 0.06);
  const bg = new THREE.Mesh(bgGeo, bgMat);
  bg.position.set(0, 2.2, -HALF_D + 0.08);
  group.add(bg);
  geometries.push(bgGeo);

  // Emissive number face
  const numMat = new THREE.MeshStandardMaterial({
    color: PALETTE.nowServingText,
    emissive: PALETTE.nowServingGlow,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.0,
  });
  materials.push(numMat);

  const numGeo = new THREE.PlaneGeometry(displayW * 0.8, displayH * 0.7);
  const num = new THREE.Mesh(numGeo, numMat);
  num.position.set(0, 2.2, -HALF_D + 0.12);
  group.add(num);
  geometries.push(numGeo);

  // Faint point light from display
  const displayLight = new THREE.PointLight(PALETTE.nowServingGlow, 0.3, 4, 2.0);
  displayLight.position.set(0, 2.2, -HALF_D + 0.4);
  group.add(displayLight);

  return numMat;
}

/** Build magazines on a side table */
function buildMagazinesAndTable(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const tableMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sideTable,
    roughness: 0.7,
    metalness: 0.05,
  });
  const magMat = new THREE.MeshStandardMaterial({
    color: PALETTE.magazineStack,
    roughness: 0.8,
    metalness: 0.0,
  });
  materials.push(tableMat, magMat);

  // Side table
  const tableW = 0.6;
  const tableD = 0.6;
  const tableH = 0.5;
  const tableThick = 0.04;

  const topGeo = new THREE.BoxGeometry(tableW, tableThick, tableD);
  const top = new THREE.Mesh(topGeo, tableMat);
  top.position.set(HALF_W - 1.0, tableH, 1.5);
  top.receiveShadow = true;
  group.add(top);
  geometries.push(topGeo);

  // Table legs
  const tLegGeo = new THREE.CylinderGeometry(0.02, 0.02, tableH, 6);
  geometries.push(tLegGeo);
  const legOffsets = [
    { x: -tableW / 2 + 0.04, z: -tableD / 2 + 0.04 },
    { x: tableW / 2 - 0.04, z: -tableD / 2 + 0.04 },
    { x: -tableW / 2 + 0.04, z: tableD / 2 - 0.04 },
    { x: tableW / 2 - 0.04, z: tableD / 2 - 0.04 },
  ];
  legOffsets.forEach((lo) => {
    const leg = new THREE.Mesh(tLegGeo, tableMat);
    leg.position.set(HALF_W - 1.0 + lo.x, tableH / 2, 1.5 + lo.z);
    group.add(leg);
  });

  // Magazine stack (thin boxes stacked with slight offsets)
  const magGeo = new THREE.BoxGeometry(0.22, 0.008, 0.28);
  geometries.push(magGeo);
  for (let i = 0; i < 5; i++) {
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(
      HALF_W - 1.0 + (Math.sin(i * 1.7) * 0.03),
      tableH + tableThick / 2 + 0.008 * i + 0.004,
      1.5 + (Math.cos(i * 2.3) * 0.02)
    );
    mag.rotation.y = i * 0.15 - 0.3;
    group.add(mag);
  }
}

/** Build water cooler in the corner */
function buildWaterCooler(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const bodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.waterCoolerBody,
    roughness: 0.5,
    metalness: 0.15,
  });
  const jugMat = new THREE.MeshStandardMaterial({
    color: PALETTE.waterCoolerBlue,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.5,
  });
  materials.push(bodyMat, jugMat);

  const coolerX = HALF_W - 0.6;
  const coolerZ = -HALF_D + 0.6;

  // Body (box)
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(coolerX, 0.45, coolerZ);
  body.castShadow = true;
  group.add(body);
  geometries.push(bodyGeo);

  // Water jug on top (inverted cylinder)
  const jugGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.4, 12);
  const jug = new THREE.Mesh(jugGeo, jugMat);
  jug.position.set(coolerX, 1.1, coolerZ);
  group.add(jug);
  geometries.push(jugGeo);

  // Spigot (small cylinder)
  const spigotGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6);
  const spigot = new THREE.Mesh(spigotGeo, bodyMat);
  spigot.rotation.x = Math.PI / 2;
  spigot.position.set(coolerX, 0.7, coolerZ + 0.18);
  group.add(spigot);
  geometries.push(spigotGeo);
}

/** Build flat overhead panel lights in a ceiling grid */
function buildLighting(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  panelMaterials: THREE.MeshStandardMaterial[];
  panelLights: THREE.PointLight[];
} {
  const panelMaterials: THREE.MeshStandardMaterial[] = [];
  const panelLights: THREE.PointLight[] = [];

  const panelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.panelLight,
    emissive: PALETTE.panelEmit,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.0,
  });
  materials.push(panelMat);
  panelMaterials.push(panelMat);

  // Grid housing material
  const gridMat = new THREE.MeshStandardMaterial({
    color: '#888880',
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(gridMat);

  // Panel dimensions
  const panelW = 1.2;
  const panelD = 0.6;
  const panelGeo = new THREE.PlaneGeometry(panelW, panelD);
  const housingGeo = new THREE.BoxGeometry(panelW + 0.05, 0.04, panelD + 0.05);
  geometries.push(panelGeo, housingGeo);

  // 3×2 grid of panels
  const colSpacing = WIDTH / 4;
  const rowSpacing = DEPTH / 3;

  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const px = -HALF_W + colSpacing * (col + 1);
      const pz = -HALF_D + rowSpacing * (row + 1);

      // Housing
      const housing = new THREE.Mesh(housingGeo, gridMat);
      housing.position.set(px, HEIGHT - 0.02, pz);
      group.add(housing);

      // Emissive panel face (facing down)
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = -Math.PI / 2;
      panel.position.set(px, HEIGHT - 0.05, pz);
      group.add(panel);

      // Point light
      const light = new THREE.PointLight(PALETTE.panelLight, 0.6, 6, 2.0);
      light.position.set(px, HEIGHT - 0.12, pz);
      group.add(light);
      panelLights.push(light);
    }
  }

  // Dim ambient
  const ambient = new THREE.AmbientLight('#1c1a18', 0.1);
  group.add(ambient);

  return { panelMaterials, panelLights };
}

/** Build blank motivational poster frames on walls */
function buildPosterFrames(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.posterFrame,
    roughness: 0.6,
    metalness: 0.1,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.posterInner,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(frameMat, innerMat);

  const frameW = 0.7;
  const frameH = 0.9;
  const frameThick = 0.04;
  const innerW = frameW - 0.1;
  const innerH = frameH - 0.1;

  // Frame border pieces (4 thin boxes forming a rectangle)
  const topBottomGeo = new THREE.BoxGeometry(frameW, frameThick, 0.03);
  const leftRightGeo = new THREE.BoxGeometry(frameThick, frameH, 0.03);
  const innerGeo = new THREE.PlaneGeometry(innerW, innerH);
  geometries.push(topBottomGeo, leftRightGeo, innerGeo);

  // Posters on both side walls
  const posterPositions = [
    // Left wall posters
    { x: -HALF_W + 0.02, z: -2.0, rotY: Math.PI / 2 },
    { x: -HALF_W + 0.02, z: 1.0, rotY: Math.PI / 2 },
    { x: -HALF_W + 0.02, z: 3.5, rotY: Math.PI / 2 },
    // Right wall posters
    { x: HALF_W - 0.02, z: -2.0, rotY: -Math.PI / 2 },
    { x: HALF_W - 0.02, z: 1.0, rotY: -Math.PI / 2 },
  ];

  posterPositions.forEach((pp) => {
    const posterGroup = new THREE.Group();
    posterGroup.position.set(pp.x, 1.6, pp.z);
    posterGroup.rotation.y = pp.rotY;

    // Top bar
    const topBar = new THREE.Mesh(topBottomGeo, frameMat);
    topBar.position.set(0, frameH / 2 - frameThick / 2, 0);
    posterGroup.add(topBar);

    // Bottom bar
    const bottomBar = new THREE.Mesh(topBottomGeo, frameMat);
    bottomBar.position.set(0, -frameH / 2 + frameThick / 2, 0);
    posterGroup.add(bottomBar);

    // Left bar
    const leftBar = new THREE.Mesh(leftRightGeo, frameMat);
    leftBar.position.set(-frameW / 2 + frameThick / 2, 0, 0);
    posterGroup.add(leftBar);

    // Right bar
    const rightBar = new THREE.Mesh(leftRightGeo, frameMat);
    rightBar.position.set(frameW / 2 - frameThick / 2, 0, 0);
    posterGroup.add(rightBar);

    // Empty center plane
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, 0, -0.005);
    posterGroup.add(inner);

    group.add(posterGroup);
  });
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface WaitingRoomResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Waiting Room scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildWaitingRoom(seed: number = 513): WaitingRoomResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorAndCeiling(group, geometries, materials, seed);
  buildChairs(group, geometries, materials);
  buildReceptionWindow(group, geometries, materials);
  const nowServingMat = buildNowServingDisplay(group, geometries, materials);
  buildMagazinesAndTable(group, geometries, materials);
  buildWaterCooler(group, geometries, materials);
  const { panelMaterials, panelLights } = buildLighting(group, geometries, materials);
  buildPosterFrames(group, geometries, materials);

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

      // --- Bass: HVAC drone ambience ---
      const bassLevel = audioData.bass || 0;
      // Subtle room vibration from HVAC
      const hvacDrone = Math.sin(elapsedTime * 2.2) * 0.5 + 0.5;
      const droneIntensity = 0.001 + bassLevel * 0.005 * hvacDrone;
      group.position.x = Math.sin(elapsedTime * 8) * droneIntensity;
      group.position.y = Math.cos(elapsedTime * 6) * droneIntensity * 0.3;

      // Panel lights dim/brighten subtly with bass (HVAC power fluctuation)
      panelLights.forEach((light, i) => {
        const flicker = 1.0 + Math.sin(elapsedTime * 1.5 + i * 1.8) * 0.03 * (0.3 + bassLevel);
        light.intensity = 0.6 * flicker;
      });

      panelMaterials.forEach((mat) => {
        const buzz = 0.65 + Math.sin(elapsedTime * 50) * 0.02 * (0.4 + bassLevel);
        mat.emissiveIntensity = buzz;
      });

      // --- Transient: number display tick/change ---
      const transientLevel = audioData.transient || 0;
      if (transientLevel > 0.3) {
        // Flash the NOW SERVING display brighter
        nowServingMat.emissiveIntensity = 1.2 + transientLevel * 0.6;
      } else {
        // Normal slow pulse
        const displayPulse = 0.7 + Math.sin(elapsedTime * 0.8) * 0.1;
        nowServingMat.emissiveIntensity = displayPulse;
      }
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
