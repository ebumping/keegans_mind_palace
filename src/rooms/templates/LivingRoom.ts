/**
 * The Living Room — Room 15
 *
 * A residential living room (8m × 2.8m × 10m). A couch faces a TV on a
 * stand, coffee table in between. A bookshelf lines one wall. A floor lamp
 * casts warm light from the corner. Curtains cover a window that glows
 * with light from somewhere outside.
 *
 * Wood floors, wallpaper-tinted walls, soft lamp glow. Everything is
 * arranged perfectly — too perfectly. There are no personal items. No
 * photos, no clutter, no mail on the table. The TV shows static. The
 * books on the shelf are identical shapes. This is a living room that
 * no one has ever lived in.
 *
 * Audio reactivity: high-freq mapped to TV static intensity, transient
 * mapped to lamp flicker pulse, bass mapped to ambient drone.
 *
 * Creative direction: You recognise this room from somewhere but you
 * have never been here. The couch has never been sat on. The books have
 * never been read. The TV was already on when you arrived. It was
 * always on.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — warm beige walls, brown wood floor, muted wallpaper, soft lamp yellow
// =============================================================================
const PALETTE = {
  // Surfaces
  woodFloor: '#8a6848',            // Warm brown wood floor
  wall: '#d0c4a8',                 // Warm beige wallpaper walls
  ceiling: '#dcd4c4',             // Off-white ceiling
  baseboard: '#604830',           // Dark wood baseboard

  // Couch
  couchFabric: '#8a7860',         // Muted taupe upholstery
  couchFrame: '#5a4430',          // Dark wood couch frame
  couchCushion: '#907860',        // Slightly lighter cushion top

  // Coffee table
  coffeeTableWood: '#6a5038',     // Medium brown wood
  coffeeTableLeg: '#584028',      // Darker leg wood

  // Bookshelf
  shelfWood: '#5a4230',           // Dark shelf wood
  bookBlock: '#7a6850',           // Uniform book block colour (identical)

  // TV
  tvBody: '#1a1a1a',             // Black TV body
  tvScreen: '#303838',           // Dark static screen base
  tvScreenEmit: '#607878',       // Static glow (cool grey-green)
  tvStand: '#2a2a2a',            // Dark TV stand

  // Lamp
  lampBase: '#b89870',           // Brass/ceramic lamp base
  lampShade: '#e8d8b8',          // Cream lamp shade
  lampGlow: '#ffecc0',           // Warm lamp light

  // Window
  curtainFabric: '#a09078',      // Muted brown curtain
  windowLight: '#c8d0e0',        // Cool daylight behind curtain
  windowFrame: '#706050',        // Wood window frame

  // Misc
  rugFabric: '#706050',          // Muted rug under coffee table
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 8;
const HEIGHT = 2.8;
const DEPTH = 10;
const HALF_W = WIDTH / 2;   // 4
const HALF_D = DEPTH / 2;   // 5

// =============================================================================
// Material helpers
// =============================================================================

function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 15,
    patternScale: 0.7,
    patternRotation: 0.0,
    breatheIntensity: 0.03,
    rippleFrequency: 0.2,
    rippleIntensity: 0.015,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1500,
    roomIndex: 15,
    patternScale: 0.9,
    patternRotation: 0.0,
    breatheIntensity: 0.04,
    rippleFrequency: 0.25,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 3000,
    roomIndex: 15,
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

/** Build the 4 outer walls with baseboard */
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

  // Baseboard
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.baseboard,
    roughness: 0.6,
    metalness: 0.1,
  });
  materials.push(baseboardMat);

  const baseH = 0.1;
  const baseboardDefs = [
    { x: 0, z: -HALF_D + 0.02, rotY: 0, w: WIDTH },
    { x: 0, z: HALF_D - 0.02, rotY: Math.PI, w: WIDTH },
    { x: -HALF_W + 0.02, z: 0, rotY: Math.PI / 2, w: DEPTH },
    { x: HALF_W - 0.02, z: 0, rotY: -Math.PI / 2, w: DEPTH },
  ];

  baseboardDefs.forEach((bd) => {
    const geo = new THREE.PlaneGeometry(bd.w, baseH);
    const mesh = new THREE.Mesh(geo, baseboardMat);
    mesh.position.set(bd.x, baseH / 2, bd.z);
    mesh.rotation.y = bd.rotY;
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
  // Wood floor
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

  // Area rug under coffee table
  const rugMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rugFabric,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(rugMat);

  const rugGeo = new THREE.BoxGeometry(3.0, 0.01, 2.0);
  const rug = new THREE.Mesh(rugGeo, rugMat);
  rug.position.set(0, 0.005, 0);
  rug.receiveShadow = true;
  group.add(rug);
  geometries.push(rugGeo);
}

/** Build couch geometry — BoxGeometry cushions + frame */
function buildCouch(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const fabricMat = new THREE.MeshStandardMaterial({
    color: PALETTE.couchFabric,
    roughness: 0.8,
    metalness: 0.0,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: PALETTE.couchCushion,
    roughness: 0.85,
    metalness: 0.0,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.couchFrame,
    roughness: 0.7,
    metalness: 0.05,
  });
  materials.push(fabricMat, cushionMat, frameMat);

  const couchX = 0;
  const couchZ = 1.8; // Facing the TV on the -Z wall

  // Base frame
  const baseGeo = new THREE.BoxGeometry(2.2, 0.15, 0.85);
  const base = new THREE.Mesh(baseGeo, frameMat);
  base.position.set(couchX, 0.2, couchZ);
  base.castShadow = true;
  group.add(base);
  geometries.push(baseGeo);

  // Seat cushions (3 side by side)
  const cushionGeo = new THREE.BoxGeometry(0.68, 0.12, 0.7);
  geometries.push(cushionGeo);
  for (let i = 0; i < 3; i++) {
    const cx = couchX - 0.72 + i * 0.72;
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.set(cx, 0.34, couchZ + 0.05);
    cushion.castShadow = true;
    group.add(cushion);
  }

  // Backrest
  const backGeo = new THREE.BoxGeometry(2.2, 0.55, 0.15);
  const back = new THREE.Mesh(backGeo, fabricMat);
  back.position.set(couchX, 0.55, couchZ + 0.35);
  back.castShadow = true;
  group.add(back);
  geometries.push(backGeo);

  // Armrests (left and right)
  const armGeo = new THREE.BoxGeometry(0.12, 0.35, 0.85);
  geometries.push(armGeo);

  const leftArm = new THREE.Mesh(armGeo, fabricMat);
  leftArm.position.set(couchX - 1.16, 0.45, couchZ);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, fabricMat);
  rightArm.position.set(couchX + 1.16, 0.45, couchZ);
  group.add(rightArm);

  // Short legs
  const legGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
  geometries.push(legGeo);
  const legPositions = [
    { x: -1.0, z: couchZ - 0.35 },
    { x: 1.0, z: couchZ - 0.35 },
    { x: -1.0, z: couchZ + 0.35 },
    { x: 1.0, z: couchZ + 0.35 },
  ];
  legPositions.forEach((lp) => {
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(couchX + lp.x, 0.06, lp.z);
    group.add(leg);
  });
}

/** Build coffee table — BoxGeometry slab on legs */
function buildCoffeeTable(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const woodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.coffeeTableWood,
    roughness: 0.6,
    metalness: 0.05,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: PALETTE.coffeeTableLeg,
    roughness: 0.65,
    metalness: 0.05,
  });
  materials.push(woodMat, legMat);

  const tableX = 0;
  const tableZ = 0;
  const tableW = 1.2;
  const tableD = 0.6;
  const tableH = 0.42;
  const topThick = 0.04;

  // Table top
  const topGeo = new THREE.BoxGeometry(tableW, topThick, tableD);
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.set(tableX, tableH, tableZ);
  top.receiveShadow = true;
  top.castShadow = true;
  group.add(top);
  geometries.push(topGeo);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(0.04, tableH, 0.04);
  geometries.push(legGeo);
  const legOffsets = [
    { x: -tableW / 2 + 0.06, z: -tableD / 2 + 0.06 },
    { x: tableW / 2 - 0.06, z: -tableD / 2 + 0.06 },
    { x: -tableW / 2 + 0.06, z: tableD / 2 - 0.06 },
    { x: tableW / 2 - 0.06, z: tableD / 2 - 0.06 },
  ];
  legOffsets.forEach((lo) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(tableX + lo.x, tableH / 2, tableZ + lo.z);
    group.add(leg);
  });
}

/** Build bookshelf — BoxGeometry shelves with thin book-block fills */
function buildBookshelf(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const shelfMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shelfWood,
    roughness: 0.7,
    metalness: 0.05,
  });
  const bookMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bookBlock,
    roughness: 0.8,
    metalness: 0.0,
  });
  materials.push(shelfMat, bookMat);

  const shelfX = -HALF_W + 0.25; // Against left wall
  const shelfZ = -1.5;
  const shelfTotalW = 1.6;
  const shelfTotalH = 2.0;
  const shelfD = 0.3;
  const shelfThick = 0.025;
  const numShelves = 5; // Including top and bottom

  // Back panel
  const backPanelGeo = new THREE.BoxGeometry(shelfTotalW, shelfTotalH, 0.015);
  const backPanel = new THREE.Mesh(backPanelGeo, shelfMat);
  backPanel.position.set(shelfX, shelfTotalH / 2, shelfZ - shelfD / 2 + 0.008);
  backPanel.castShadow = true;
  group.add(backPanel);
  geometries.push(backPanelGeo);

  // Side panels
  const sidePanelGeo = new THREE.BoxGeometry(0.02, shelfTotalH, shelfD);
  geometries.push(sidePanelGeo);

  const leftSide = new THREE.Mesh(sidePanelGeo, shelfMat);
  leftSide.position.set(shelfX - shelfTotalW / 2 + 0.01, shelfTotalH / 2, shelfZ);
  group.add(leftSide);

  const rightSide = new THREE.Mesh(sidePanelGeo, shelfMat);
  rightSide.position.set(shelfX + shelfTotalW / 2 - 0.01, shelfTotalH / 2, shelfZ);
  group.add(rightSide);

  // Horizontal shelves
  const shelfGeo = new THREE.BoxGeometry(shelfTotalW, shelfThick, shelfD);
  geometries.push(shelfGeo);

  const shelfSpacing = shelfTotalH / (numShelves - 1);
  for (let i = 0; i < numShelves; i++) {
    const sy = i * shelfSpacing;
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(shelfX, sy, shelfZ);
    group.add(shelf);
  }

  // Book blocks on each shelf (except top) — identical, uncanny
  const bookGeo = new THREE.BoxGeometry(0.04, shelfSpacing * 0.75, shelfD * 0.8);
  geometries.push(bookGeo);

  for (let si = 0; si < numShelves - 1; si++) {
    const baseY = si * shelfSpacing + shelfThick / 2;
    const bookY = baseY + (shelfSpacing * 0.75) / 2;
    const numBooks = 12;
    const bookSpacing = (shelfTotalW - 0.12) / numBooks;
    const startBX = shelfX - shelfTotalW / 2 + 0.08;

    for (let bi = 0; bi < numBooks; bi++) {
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(startBX + bi * bookSpacing, bookY, shelfZ);
      group.add(book);
    }
  }
}

/** Build TV on a stand with emissive static-flicker material */
function buildTV(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): THREE.MeshStandardMaterial {
  const tvBodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tvBody,
    roughness: 0.4,
    metalness: 0.3,
  });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tvScreen,
    emissive: PALETTE.tvScreenEmit,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.1,
  });
  const standMat = new THREE.MeshStandardMaterial({
    color: PALETTE.tvStand,
    roughness: 0.5,
    metalness: 0.2,
  });
  materials.push(tvBodyMat, tvScreenMat, standMat);

  const tvX = 0;
  const tvZ = -HALF_D + 0.5;

  // TV stand (low cabinet)
  const standGeo = new THREE.BoxGeometry(1.4, 0.4, 0.4);
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.set(tvX, 0.2, tvZ);
  stand.castShadow = true;
  group.add(stand);
  geometries.push(standGeo);

  // TV body (thin box)
  const screenW = 1.2;
  const screenH = 0.7;
  const tvGeo = new THREE.BoxGeometry(screenW, screenH, 0.05);
  const tv = new THREE.Mesh(tvGeo, tvBodyMat);
  tv.position.set(tvX, 0.4 + screenH / 2 + 0.05, tvZ);
  tv.castShadow = true;
  group.add(tv);
  geometries.push(tvGeo);

  // Screen face (emissive plane on front of TV)
  const screenGeo = new THREE.PlaneGeometry(screenW - 0.06, screenH - 0.06);
  const screen = new THREE.Mesh(screenGeo, tvScreenMat);
  screen.position.set(tvX, 0.4 + screenH / 2 + 0.05, tvZ + 0.026);
  group.add(screen);
  geometries.push(screenGeo);

  // Faint glow from TV static
  const tvLight = new THREE.PointLight(PALETTE.tvScreenEmit, 0.25, 4, 2.0);
  tvLight.position.set(tvX, 0.9, tvZ + 0.5);
  group.add(tvLight);

  return tvScreenMat;
}

/** Build floor lamp — CylinderGeometry base + cone shade with point light */
function buildLamp(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  lampShadeMat: THREE.MeshStandardMaterial;
  lampLight: THREE.PointLight;
} {
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lampBase,
    roughness: 0.5,
    metalness: 0.3,
  });
  const shadeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lampShade,
    emissive: PALETTE.lampGlow,
    emissiveIntensity: 0.4,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const poleMat = new THREE.MeshStandardMaterial({
    color: '#606050',
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(baseMat, shadeMat, poleMat);

  const lampX = HALF_W - 0.8;
  const lampZ = 2.5;

  // Base (weighted disc)
  const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.06, 12);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(lampX, 0.03, lampZ);
  base.castShadow = true;
  group.add(base);
  geometries.push(baseGeo);

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(lampX, 0.06 + 0.7, lampZ);
  group.add(pole);
  geometries.push(poleGeo);

  // Shade (truncated cone)
  const shadeGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.25, 12, 1, true);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.set(lampX, 1.56, lampZ);
  group.add(shade);
  geometries.push(shadeGeo);

  // Point light inside shade
  const lampLight = new THREE.PointLight(PALETTE.lampGlow, 0.7, 6, 2.0);
  lampLight.position.set(lampX, 1.5, lampZ);
  lampLight.castShadow = true;
  group.add(lampLight);

  return { lampShadeMat: shadeMat, lampLight };
}

/** Build curtained window on the right wall with light-emitting backplane */
function buildWindow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const curtainMat = new THREE.MeshStandardMaterial({
    color: PALETTE.curtainFabric,
    roughness: 0.85,
    metalness: 0.0,
  });
  const windowLightMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowLight,
    emissive: PALETTE.windowLight,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.0,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowFrame,
    roughness: 0.6,
    metalness: 0.1,
  });
  materials.push(curtainMat, windowLightMat, frameMat);

  const winX = HALF_W - 0.03;
  const winZ = -0.5;
  const winW = 1.6;
  const winH = 1.4;
  const winY = 1.1;

  // Light-emitting backplane (the "outside")
  const lightGeo = new THREE.PlaneGeometry(winW, winH);
  const lightPlane = new THREE.Mesh(lightGeo, windowLightMat);
  lightPlane.position.set(winX - 0.02, winY, winZ);
  lightPlane.rotation.y = -Math.PI / 2;
  group.add(lightPlane);
  geometries.push(lightGeo);

  // Window frame
  const frameThick = 0.05;
  const hFrameGeo = new THREE.BoxGeometry(0.04, frameThick, winW + frameThick * 2);
  const vFrameGeo = new THREE.BoxGeometry(0.04, winH + frameThick, frameThick);
  geometries.push(hFrameGeo, vFrameGeo);

  // Top frame
  const topFrame = new THREE.Mesh(hFrameGeo, frameMat);
  topFrame.position.set(winX, winY + winH / 2 + frameThick / 2, winZ);
  group.add(topFrame);

  // Bottom frame
  const bottomFrame = new THREE.Mesh(hFrameGeo, frameMat);
  bottomFrame.position.set(winX, winY - winH / 2 - frameThick / 2, winZ);
  group.add(bottomFrame);

  // Left frame
  const leftFrame = new THREE.Mesh(vFrameGeo, frameMat);
  leftFrame.position.set(winX, winY, winZ - winW / 2 - frameThick / 2);
  group.add(leftFrame);

  // Right frame
  const rightFrame = new THREE.Mesh(vFrameGeo, frameMat);
  rightFrame.position.set(winX, winY, winZ + winW / 2 + frameThick / 2);
  group.add(rightFrame);

  // Curtains (two panels, slightly gathered)
  const curtainH = winH + 0.4;
  const curtainW = winW / 2 + 0.15;
  const curtainGeo = new THREE.PlaneGeometry(curtainW, curtainH, 6, 1);
  geometries.push(curtainGeo);

  // Left curtain
  const leftCurtain = new THREE.Mesh(curtainGeo, curtainMat);
  leftCurtain.position.set(winX + 0.02, winY + 0.1, winZ - winW / 4 - 0.04);
  leftCurtain.rotation.y = -Math.PI / 2;
  group.add(leftCurtain);

  // Right curtain
  const rightCurtain = new THREE.Mesh(curtainGeo, curtainMat);
  rightCurtain.position.set(winX + 0.02, winY + 0.1, winZ + winW / 4 + 0.04);
  rightCurtain.rotation.y = -Math.PI / 2;
  group.add(rightCurtain);

  // Subtle point light from window
  const winLight = new THREE.PointLight(PALETTE.windowLight, 0.3, 5, 2.0);
  winLight.position.set(winX - 0.5, winY, winZ);
  group.add(winLight);
}

/** Build minimal overhead lighting — dim to let the lamp dominate */
function buildCeilingLight(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Single ceiling fixture (basic flush-mount)
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: '#d0c8b8',
    emissive: '#fffae0',
    emissiveIntensity: 0.15,
    roughness: 0.4,
    metalness: 0.0,
  });
  materials.push(fixtureMat);

  const fixtureGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12);
  const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
  fixture.position.set(0, HEIGHT - 0.02, 0);
  group.add(fixture);
  geometries.push(fixtureGeo);

  // Very dim overhead light — the lamp is the main source
  const ceilingLight = new THREE.PointLight('#fff8e0', 0.15, 8, 2.0);
  ceilingLight.position.set(0, HEIGHT - 0.1, 0);
  group.add(ceilingLight);

  // Dim ambient
  const ambient = new THREE.AmbientLight('#181614', 0.08);
  group.add(ambient);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface LivingRoomResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Living Room scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildLivingRoom(seed: number = 715): LivingRoomResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorAndCeiling(group, geometries, materials, seed);
  buildCouch(group, geometries, materials);
  buildCoffeeTable(group, geometries, materials);
  buildBookshelf(group, geometries, materials);
  const tvScreenMat = buildTV(group, geometries, materials);
  const { lampShadeMat, lampLight } = buildLamp(group, geometries, materials);
  buildWindow(group, geometries, materials);
  buildCeilingLight(group, geometries, materials);

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

      // --- Bass: ambient drone ---
      const bassLevel = audioData.bass || 0;
      // Subtle structural vibration — something humming in the walls
      const drone = Math.sin(elapsedTime * 1.8) * 0.5 + 0.5;
      const droneIntensity = 0.0008 + bassLevel * 0.004 * drone;
      group.position.x = Math.sin(elapsedTime * 6) * droneIntensity;
      group.position.y = Math.cos(elapsedTime * 4.5) * droneIntensity * 0.3;

      // --- High-freq: TV static intensity ---
      const highLevel = audioData.high || 0;
      // Static flicker on TV screen
      const staticFlicker = 0.3 + highLevel * 0.8;
      const staticNoise = Math.sin(elapsedTime * 47) * 0.15 + Math.sin(elapsedTime * 123) * 0.1;
      tvScreenMat.emissiveIntensity = staticFlicker + staticNoise * (0.3 + highLevel);

      // --- Transient: lamp flicker pulse ---
      const transientLevel = audioData.transient || 0;
      if (transientLevel > 0.3) {
        // Lamp flickers — bulb momentarily dims and brightens
        const flickerPulse = 0.3 + Math.random() * 0.4 * transientLevel;
        lampLight.intensity = flickerPulse;
        lampShadeMat.emissiveIntensity = flickerPulse * 0.6;
      } else {
        // Steady warm glow with very subtle breathing
        const steadyGlow = 0.65 + Math.sin(elapsedTime * 0.6) * 0.05;
        lampLight.intensity = steadyGlow;
        lampShadeMat.emissiveIntensity = steadyGlow * 0.55;
      }
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
