/**
 * The Elevator Bank — Room 14
 *
 * A compact art deco elevator lobby (8m × 3m × 6m). Three elevator door
 * pairs are set into the main wall — brushed brass panels with ornate trim.
 * Indicator arrows glow above each door. Small floor number displays flicker.
 *
 * The marble floor gleams under recessed ceiling downlights. A burgundy
 * carpet runner leads from the back wall to the elevators. The back wall
 * is mirrored, reflecting the lobby into infinity. A potted plant sits
 * in the corner, the only organic thing in sight.
 *
 * Audio reactivity: transient mapped to elevator ding (indicator arrow
 * change), bass mapped to mechanical hum behind doors.
 *
 * Creative direction: You press the button. The arrow points up. You
 * wait. The arrow points down. You wait. The doors never open. The
 * mirror behind you reflects a lobby that goes on forever. The plant
 * is plastic.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — brass gold, marble white, art deco green, carpet burgundy
// =============================================================================
const PALETTE = {
  // Surfaces
  marbleFloor: '#e8e0d4',           // Warm marble white
  wall: '#d0c8b8',                  // Warm plaster walls
  ceiling: '#d4ccc0',              // Off-white ceiling

  // Elevator doors
  brassPanel: '#b89860',            // Brushed brass door panels
  brassTrim: '#c8a868',             // Lighter brass trim/frame
  doorGap: '#0a0a0a',              // Dark gap between doors

  // Art deco accents
  decoGreen: '#2a6050',             // Art deco jade green
  decoGold: '#d0a850',              // Gold accent line

  // Indicators
  indicatorArrow: '#ff6030',        // Orange-red indicator arrow
  indicatorOff: '#301810',          // Dim unlit indicator
  floorDisplay: '#ff4020',          // Red LED floor number
  floorDisplayBg: '#181410',        // Display backing

  // Floor / furnishings
  carpetBurgundy: '#6a2030',        // Burgundy carpet runner
  mirrorSurface: '#c8ccd0',        // Mirror-like reflective surface
  mirrorFrame: '#b89860',           // Brass mirror frame

  // Plant
  potTerracotta: '#a06840',         // Terracotta pot
  foliageGreen: '#2a5030',          // Dark green plastic foliage

  // Lighting
  downlightWarm: '#fff0d8',         // Warm recessed downlight
  callButtonGlow: '#ffa040',        // Amber call button glow

  // Misc
  baseboard: '#584830',             // Dark wood baseboard
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 8;
const HEIGHT = 3;
const DEPTH = 6;
const HALF_W = WIDTH / 2;   // 4
const HALF_D = DEPTH / 2;   // 3

// Elevator layout
const ELEVATOR_COUNT = 3;
const DOOR_WIDTH = 0.65;         // Each door panel width
const DOOR_HEIGHT = 2.3;
const DOOR_GAP = 0.04;          // Gap between door pair
const ELEVATOR_SPACING = 2.4;   // Center-to-center between elevators
const FRAME_THICK = 0.08;

// =============================================================================
// Material helpers
// =============================================================================

function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 14,
    patternScale: 0.6,
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
    seed: seed + 1400,
    roomIndex: 14,
    patternScale: 0.8,
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
    seed: seed + 2800,
    roomIndex: 14,
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

  // Art deco baseboard along all walls
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.baseboard,
    roughness: 0.6,
    metalness: 0.1,
  });
  materials.push(baseboardMat);

  const baseH = 0.12;
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
  // Marble floor
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

  // Carpet runner — slightly raised, runs from back wall toward elevators
  const carpetMat = new THREE.MeshStandardMaterial({
    color: PALETTE.carpetBurgundy,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(carpetMat);

  const carpetW = 2.0;
  const carpetD = DEPTH - 0.6;
  const carpetGeo = new THREE.BoxGeometry(carpetW, 0.015, carpetD);
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.position.set(0, 0.008, 0);
  carpet.receiveShadow = true;
  group.add(carpet);
  geometries.push(carpetGeo);
}

/** Build 3 elevator door pairs with brushed brass panels and frame trim */
function buildElevatorDoors(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const brassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.brassPanel,
    roughness: 0.3,
    metalness: 0.7,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.brassTrim,
    roughness: 0.25,
    metalness: 0.75,
  });
  const gapMat = new THREE.MeshStandardMaterial({
    color: PALETTE.doorGap,
    roughness: 0.9,
    metalness: 0.0,
  });
  const decoMat = new THREE.MeshStandardMaterial({
    color: PALETTE.decoGold,
    roughness: 0.3,
    metalness: 0.8,
  });
  materials.push(brassMat, trimMat, gapMat, decoMat);

  // Shared geometries
  const doorPanelGeo = new THREE.BoxGeometry(DOOR_WIDTH, DOOR_HEIGHT, 0.04);
  const gapGeo = new THREE.BoxGeometry(DOOR_GAP, DOOR_HEIGHT, 0.03);
  const hFrameGeo = new THREE.BoxGeometry(DOOR_WIDTH * 2 + DOOR_GAP + FRAME_THICK * 2, FRAME_THICK, 0.06);
  const vFrameGeo = new THREE.BoxGeometry(FRAME_THICK, DOOR_HEIGHT + FRAME_THICK, 0.06);
  const decoLineGeo = new THREE.BoxGeometry(DOOR_WIDTH * 2 + DOOR_GAP + FRAME_THICK * 2 + 0.2, 0.02, 0.02);
  geometries.push(doorPanelGeo, gapGeo, hFrameGeo, vFrameGeo, decoLineGeo);

  const elevatorWallZ = -HALF_D + 0.03;
  const startX = -(ELEVATOR_COUNT - 1) * ELEVATOR_SPACING / 2;

  for (let i = 0; i < ELEVATOR_COUNT; i++) {
    const cx = startX + i * ELEVATOR_SPACING;
    const doorY = DOOR_HEIGHT / 2;

    // Left door panel
    const leftDoor = new THREE.Mesh(doorPanelGeo, brassMat);
    leftDoor.position.set(cx - DOOR_WIDTH / 2 - DOOR_GAP / 2, doorY, elevatorWallZ);
    leftDoor.castShadow = true;
    group.add(leftDoor);

    // Right door panel
    const rightDoor = new THREE.Mesh(doorPanelGeo, brassMat);
    rightDoor.position.set(cx + DOOR_WIDTH / 2 + DOOR_GAP / 2, doorY, elevatorWallZ);
    rightDoor.castShadow = true;
    group.add(rightDoor);

    // Gap between doors (dark crack)
    const gap = new THREE.Mesh(gapGeo, gapMat);
    gap.position.set(cx, doorY, elevatorWallZ - 0.005);
    group.add(gap);

    // Frame — top
    const topFrame = new THREE.Mesh(hFrameGeo, trimMat);
    topFrame.position.set(cx, DOOR_HEIGHT + FRAME_THICK / 2, elevatorWallZ + 0.01);
    group.add(topFrame);

    // Frame — bottom
    const bottomFrame = new THREE.Mesh(hFrameGeo, trimMat);
    bottomFrame.position.set(cx, 0 + FRAME_THICK / 2, elevatorWallZ + 0.01);
    group.add(bottomFrame);

    // Frame — left
    const leftFrame = new THREE.Mesh(vFrameGeo, trimMat);
    leftFrame.position.set(cx - DOOR_WIDTH - DOOR_GAP / 2 - FRAME_THICK / 2, doorY, elevatorWallZ + 0.01);
    group.add(leftFrame);

    // Frame — right
    const rightFrame = new THREE.Mesh(vFrameGeo, trimMat);
    rightFrame.position.set(cx + DOOR_WIDTH + DOOR_GAP / 2 + FRAME_THICK / 2, doorY, elevatorWallZ + 0.01);
    group.add(rightFrame);

    // Art deco gold line above frame
    const decoLine = new THREE.Mesh(decoLineGeo, decoMat);
    decoLine.position.set(cx, DOOR_HEIGHT + FRAME_THICK + 0.04, elevatorWallZ + 0.02);
    group.add(decoLine);
  }
}

/** Build indicator arrows above each door and floor number displays */
function buildIndicators(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  arrowMaterials: THREE.MeshStandardMaterial[];
  displayMaterials: THREE.MeshStandardMaterial[];
} {
  const arrowMaterials: THREE.MeshStandardMaterial[] = [];
  const displayMaterials: THREE.MeshStandardMaterial[] = [];

  const elevatorWallZ = -HALF_D + 0.05;
  const startX = -(ELEVATOR_COUNT - 1) * ELEVATOR_SPACING / 2;

  // Arrow triangle shape (pointing up)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.1);
  arrowShape.lineTo(-0.08, -0.05);
  arrowShape.lineTo(0.08, -0.05);
  arrowShape.closePath();

  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  geometries.push(arrowGeo);

  // Floor display backing + face
  const displayBgGeo = new THREE.BoxGeometry(0.25, 0.15, 0.03);
  const displayFaceGeo = new THREE.PlaneGeometry(0.2, 0.1);
  geometries.push(displayBgGeo, displayFaceGeo);

  for (let i = 0; i < ELEVATOR_COUNT; i++) {
    const cx = startX + i * ELEVATOR_SPACING;
    const indicatorY = DOOR_HEIGHT + FRAME_THICK + 0.2;

    // Up arrow (left)
    const upArrowMat = new THREE.MeshStandardMaterial({
      color: PALETTE.indicatorOff,
      emissive: PALETTE.indicatorArrow,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.1,
    });
    materials.push(upArrowMat);
    arrowMaterials.push(upArrowMat);

    const upArrow = new THREE.Mesh(arrowGeo, upArrowMat);
    upArrow.position.set(cx - 0.15, indicatorY, elevatorWallZ);
    group.add(upArrow);

    // Down arrow (right — rotated 180°)
    const downArrowMat = new THREE.MeshStandardMaterial({
      color: PALETTE.indicatorOff,
      emissive: PALETTE.indicatorArrow,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.1,
    });
    materials.push(downArrowMat);
    arrowMaterials.push(downArrowMat);

    const downArrow = new THREE.Mesh(arrowGeo, downArrowMat);
    downArrow.position.set(cx + 0.15, indicatorY, elevatorWallZ);
    downArrow.rotation.z = Math.PI; // Point down
    group.add(downArrow);

    // Floor number display (small rectangle above arrows)
    const displayBgMat = new THREE.MeshStandardMaterial({
      color: PALETTE.floorDisplayBg,
      roughness: 0.8,
      metalness: 0.2,
    });
    materials.push(displayBgMat);

    const displayBg = new THREE.Mesh(displayBgGeo, displayBgMat);
    displayBg.position.set(cx, indicatorY + 0.2, elevatorWallZ - 0.01);
    group.add(displayBg);

    const displayMat = new THREE.MeshStandardMaterial({
      color: PALETTE.floorDisplay,
      emissive: PALETTE.floorDisplay,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.0,
    });
    materials.push(displayMat);
    displayMaterials.push(displayMat);

    const displayFace = new THREE.Mesh(displayFaceGeo, displayMat);
    displayFace.position.set(cx, indicatorY + 0.2, elevatorWallZ + 0.02);
    group.add(displayFace);

    // Small point light from each indicator cluster
    const indicatorLight = new THREE.PointLight(PALETTE.indicatorArrow, 0.15, 2, 2.0);
    indicatorLight.position.set(cx, indicatorY + 0.1, elevatorWallZ + 0.2);
    group.add(indicatorLight);
  }

  return { arrowMaterials, displayMaterials };
}

/** Build mirrored back wall and potted plant */
function buildMirrorAndPlant(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Mirrored back wall (reflective material plane)
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mirrorSurface,
    roughness: 0.05,
    metalness: 0.95,
  });
  materials.push(mirrorMat);

  const mirrorW = WIDTH - 0.4;
  const mirrorH = HEIGHT - 0.5;
  const mirrorGeo = new THREE.PlaneGeometry(mirrorW, mirrorH);
  const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
  mirror.position.set(0, mirrorH / 2 + 0.2, HALF_D - 0.03);
  mirror.rotation.y = Math.PI;
  group.add(mirror);
  geometries.push(mirrorGeo);

  // Mirror frame (brass)
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mirrorFrame,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(frameMat);

  const frameThick = 0.05;
  const hFrameGeo = new THREE.BoxGeometry(mirrorW + frameThick * 2, frameThick, 0.03);
  const vFrameGeo = new THREE.BoxGeometry(frameThick, mirrorH + frameThick * 2, 0.03);
  geometries.push(hFrameGeo, vFrameGeo);

  // Top frame
  const topBar = new THREE.Mesh(hFrameGeo, frameMat);
  topBar.position.set(0, 0.2 + mirrorH + frameThick / 2, HALF_D - 0.02);
  group.add(topBar);

  // Bottom frame
  const bottomBar = new THREE.Mesh(hFrameGeo, frameMat);
  bottomBar.position.set(0, 0.2 - frameThick / 2, HALF_D - 0.02);
  group.add(bottomBar);

  // Left frame
  const leftBar = new THREE.Mesh(vFrameGeo, frameMat);
  leftBar.position.set(-(mirrorW / 2 + frameThick / 2), 0.2 + mirrorH / 2, HALF_D - 0.02);
  group.add(leftBar);

  // Right frame
  const rightBar = new THREE.Mesh(vFrameGeo, frameMat);
  rightBar.position.set(mirrorW / 2 + frameThick / 2, 0.2 + mirrorH / 2, HALF_D - 0.02);
  group.add(rightBar);

  // Potted plant in the corner
  const potMat = new THREE.MeshStandardMaterial({
    color: PALETTE.potTerracotta,
    roughness: 0.8,
    metalness: 0.0,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: PALETTE.foliageGreen,
    roughness: 0.7,
    metalness: 0.0,
  });
  materials.push(potMat, foliageMat);

  const plantX = HALF_W - 0.6;
  const plantZ = HALF_D - 0.6;

  // Pot (cylinder)
  const potGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 10);
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(plantX, 0.15, plantZ);
  pot.castShadow = true;
  group.add(pot);
  geometries.push(potGeo);

  // Foliage (sphere + cone for a vaguely plant-like shape)
  const leafSphereGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const leafSphere = new THREE.Mesh(leafSphereGeo, foliageMat);
  leafSphere.position.set(plantX, 0.52, plantZ);
  leafSphere.castShadow = true;
  group.add(leafSphere);
  geometries.push(leafSphereGeo);

  const leafConeGeo = new THREE.ConeGeometry(0.18, 0.3, 8);
  const leafCone = new THREE.Mesh(leafConeGeo, foliageMat);
  leafCone.position.set(plantX, 0.75, plantZ);
  group.add(leafCone);
  geometries.push(leafConeGeo);
}

/** Build recessed ceiling downlights and elevator call buttons */
function buildLighting(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): {
  downlightMaterials: THREE.MeshStandardMaterial[];
  downlights: THREE.PointLight[];
  callButtonMaterials: THREE.MeshStandardMaterial[];
} {
  const downlightMaterials: THREE.MeshStandardMaterial[] = [];
  const downlights: THREE.PointLight[] = [];
  const callButtonMaterials: THREE.MeshStandardMaterial[] = [];

  // Recessed downlight disc material
  const discMat = new THREE.MeshStandardMaterial({
    color: PALETTE.downlightWarm,
    emissive: PALETTE.downlightWarm,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.0,
  });
  materials.push(discMat);
  downlightMaterials.push(discMat);

  // Disc geometry for downlights
  const discGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12);
  geometries.push(discGeo);

  // Place downlights in a 3×2 grid
  const colSpacing = WIDTH / 4;
  const rowSpacing = DEPTH / 3;

  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 2; row++) {
      const px = -HALF_W + colSpacing * (col + 1);
      const pz = -HALF_D + rowSpacing * (row + 1);

      // Recessed disc
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(px, HEIGHT - 0.01, pz);
      group.add(disc);

      // Point light
      const light = new THREE.PointLight(PALETTE.downlightWarm, 0.6, 5, 2.0);
      light.position.set(px, HEIGHT - 0.08, pz);
      group.add(light);
      downlights.push(light);
    }
  }

  // Call buttons — one between each pair of elevators
  const elevatorWallZ = -HALF_D + 0.06;
  const startX = -(ELEVATOR_COUNT - 1) * ELEVATOR_SPACING / 2;

  const buttonPlateGeo = new THREE.BoxGeometry(0.1, 0.18, 0.02);
  const buttonGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 10);
  geometries.push(buttonPlateGeo, buttonGeo);

  const plateMat = new THREE.MeshStandardMaterial({
    color: PALETTE.brassTrim,
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(plateMat);

  // Place call button panels between elevators and at the ends
  const buttonPositions = [
    startX - ELEVATOR_SPACING / 2 - 0.4,
    startX + ELEVATOR_SPACING / 2,
    startX + ELEVATOR_SPACING * 1.5 + 0.4,
  ];

  buttonPositions.forEach((bx) => {
    // Button plate
    const plate = new THREE.Mesh(buttonPlateGeo, plateMat);
    plate.position.set(bx, 1.1, elevatorWallZ);
    group.add(plate);

    // Up button (emissive circle)
    const upBtnMat = new THREE.MeshStandardMaterial({
      color: PALETTE.callButtonGlow,
      emissive: PALETTE.callButtonGlow,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
    });
    materials.push(upBtnMat);
    callButtonMaterials.push(upBtnMat);

    const upBtn = new THREE.Mesh(buttonGeo, upBtnMat);
    upBtn.rotation.x = Math.PI / 2;
    upBtn.position.set(bx, 1.15, elevatorWallZ + 0.015);
    group.add(upBtn);

    // Down button
    const downBtnMat = new THREE.MeshStandardMaterial({
      color: PALETTE.callButtonGlow,
      emissive: PALETTE.callButtonGlow,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.2,
    });
    materials.push(downBtnMat);
    callButtonMaterials.push(downBtnMat);

    const downBtn = new THREE.Mesh(buttonGeo, downBtnMat);
    downBtn.rotation.x = Math.PI / 2;
    downBtn.position.set(bx, 1.05, elevatorWallZ + 0.015);
    group.add(downBtn);
  });

  // Dim ambient
  const ambient = new THREE.AmbientLight('#1a1814', 0.1);
  group.add(ambient);

  return { downlightMaterials, downlights, callButtonMaterials };
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface ElevatorBankResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Elevator Bank scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildElevatorBank(seed: number = 614): ElevatorBankResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloorAndCeiling(group, geometries, materials, seed);
  buildElevatorDoors(group, geometries, materials);
  const { arrowMaterials, displayMaterials } = buildIndicators(group, geometries, materials);
  buildMirrorAndPlant(group, geometries, materials);
  const { downlightMaterials, downlights, callButtonMaterials } = buildLighting(group, geometries, materials);

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

      // --- Bass: mechanical hum behind doors ---
      const bassLevel = audioData.bass || 0;
      // Subtle building vibration from elevator machinery
      const mechHum = Math.sin(elapsedTime * 4.5) * 0.5 + 0.5;
      const humIntensity = 0.001 + bassLevel * 0.006 * mechHum;
      group.position.x = Math.sin(elapsedTime * 7) * humIntensity;
      group.position.y = Math.cos(elapsedTime * 5) * humIntensity * 0.3;

      // Downlights subtle flicker with bass (power fluctuation from motors)
      downlights.forEach((light, i) => {
        const flicker = 1.0 + Math.sin(elapsedTime * 1.8 + i * 1.5) * 0.03 * (0.3 + bassLevel);
        light.intensity = 0.6 * flicker;
      });

      downlightMaterials.forEach((mat) => {
        const buzz = 0.75 + Math.sin(elapsedTime * 40) * 0.02 * (0.4 + bassLevel);
        mat.emissiveIntensity = buzz;
      });

      // Call button glow pulses gently with bass
      callButtonMaterials.forEach((mat, i) => {
        const pulse = 0.3 + Math.sin(elapsedTime * 1.5 + i * 0.8) * 0.1 * (0.5 + bassLevel * 0.5);
        mat.emissiveIntensity = pulse;
      });

      // --- Transient: elevator ding (indicator arrow change) ---
      const transientLevel = audioData.transient || 0;
      if (transientLevel > 0.3) {
        // Flash indicator arrows brightly — simulate ding + arrow switch
        arrowMaterials.forEach((mat, i) => {
          // Alternate: on transient, one arrow goes bright, the other dims
          const isUp = i % 2 === 0;
          const dingPhase = Math.sin(elapsedTime * 20) > 0;
          if ((isUp && dingPhase) || (!isUp && !dingPhase)) {
            mat.emissiveIntensity = 0.9 + transientLevel * 0.5;
          } else {
            mat.emissiveIntensity = 0.05;
          }
        });

        // Flash floor displays
        displayMaterials.forEach((mat) => {
          mat.emissiveIntensity = 1.0 + transientLevel * 0.4;
        });
      } else {
        // Idle: slow alternating arrow pulse
        arrowMaterials.forEach((mat, i) => {
          const isUp = i % 2 === 0;
          const slowCycle = Math.sin(elapsedTime * 0.5 + Math.floor(i / 2) * 2.0);
          if (isUp) {
            mat.emissiveIntensity = slowCycle > 0 ? 0.4 + slowCycle * 0.3 : 0.1;
          } else {
            mat.emissiveIntensity = slowCycle < 0 ? 0.4 - slowCycle * 0.3 : 0.1;
          }
        });

        // Floor displays gentle pulse
        displayMaterials.forEach((mat, i) => {
          const displayPulse = 0.5 + Math.sin(elapsedTime * 0.8 + i * 1.2) * 0.15;
          mat.emissiveIntensity = displayPulse;
        });
      }
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
