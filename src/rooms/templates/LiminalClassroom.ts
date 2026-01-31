/**
 * The Liminal Classroom — Room 10
 *
 * A perfectly ordinary classroom (10m × 3m × 12m) with beige walls, cream
 * ceiling tiles, and institutional carpet. A 4×5 grid of student desks faces
 * a teacher's desk and dark green chalkboard. A wall clock ticks. Overhead
 * fluorescent panels hum.
 *
 * Everything is in place. Nothing is wrong. But there are no students, no
 * teacher, no writing on the board. The clock ticks but time feels uncertain.
 * Sunlight glows through curtained windows on one wall — warm, diffuse, and
 * somehow wrong, as if it's always 3:47 PM on a day that never happened.
 *
 * Audio reactivity: transient mapped to clock tick (clock hand rotation pulse),
 * high-freq mapped to fluorescent buzz intensity.
 *
 * Creative direction: The uncanny classroom — a space everyone recognizes but
 * no one occupies. The desks are arranged with institutional precision.
 * The chalkboard is clean. The clock ticks in a room where time doesn't
 * matter. This is the memory of school stripped of all people and purpose,
 * a shell of routine preserved in amber.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — beige walls, cream ceiling, green chalkboard, institutional carpet
// =============================================================================
const PALETTE = {
  // Walls
  wallBeige: '#c8b898',          // Institutional beige wall
  wallTrim: '#b0a080',           // Baseboard / trim color

  // Ceiling
  ceilingCream: '#e8e0d0',       // Cream ceiling tile
  ceilingGrid: '#d0c8b8',        // Metal grid between tiles

  // Floor
  carpetBrown: '#6b5c4a',        // Institutional carpet brown
  carpetDark: '#5a4c3a',         // Darker carpet variation

  // Chalkboard
  chalkGreen: '#2a4a2a',         // Dark green chalkboard surface
  chalkFrame: '#5a4020',         // Wooden frame brown

  // Furniture
  deskLaminate: '#c8b898',       // Desk surface — beige laminate
  deskMetal: '#888890',          // Desk leg metal grey
  chairSeat: '#b05020',         // Orange-brown molded chair
  teacherDesk: '#6a4a30',        // Darker wood teacher desk

  // Clock
  clockFace: '#f0ece0',          // Off-white clock face
  clockFrame: '#3a3a3a',         // Dark frame
  clockHand: '#1a1a1a',          // Black hands

  // Lighting
  fluorescentWhite: '#f4f0e8',   // Warm fluorescent white
  windowGlow: '#ffe8c0',         // Warm afternoon sunlight

  // Curtain
  curtainBeige: '#c8b888',       // Beige curtain fabric

  // Atmosphere
  fogColor: '#d8d0c0',           // Warm hazy fog
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 10;
const HEIGHT = 3;
const DEPTH = 12;
const HALF_W = WIDTH / 2;    // 5
const HALF_D = DEPTH / 2;    // 6

// Desk grid
const DESK_ROWS = 5;           // Rows deep (along Z)
const DESK_COLS = 4;           // Columns across (along X)
const DESK_SPACING_X = 1.8;   // Spacing between desk centers
const DESK_SPACING_Z = 1.6;   // Spacing between desk rows
const DESK_WIDTH = 0.6;
const DESK_DEPTH_SIZE = 0.45;
const DESK_HEIGHT = 0.72;
const CHAIR_HEIGHT = 0.42;

// =============================================================================
// Material helpers
// =============================================================================

function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 10,
    patternScale: 0.8,
    patternRotation: 0.0,
    breatheIntensity: 0.06,
    rippleFrequency: 0.2,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 10,
    patternScale: 1.0,
    patternRotation: 0.0,
    breatheIntensity: 0.05,
    rippleFrequency: 0.15,
    rippleIntensity: 0.02,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 10,
    patternScale: 0.6,
    patternRotation: 0.0,
    breatheIntensity: 0.04,
    rippleFrequency: 0.1,
    rippleIntensity: 0.01,
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
    // Back wall (z = -HALF_D) — chalkboard wall
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH },
    // Front wall (z = +HALF_D)
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH },
    // Left wall (x = -HALF_W) — window wall
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH },
    // Right wall (x = +HALF_W)
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

  // Baseboard trim along bottom of walls
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.wallTrim,
    roughness: 0.7,
    metalness: 0.1,
  });
  materials.push(trimMat);

  const trimGeo = new THREE.BoxGeometry(WIDTH + 0.1, 0.1, 0.04);
  geometries.push(trimGeo);

  // Front and back baseboard
  [{ z: -HALF_D + 0.02 }, { z: HALF_D - 0.02 }].forEach((td) => {
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 0.05, td.z);
    group.add(trim);
  });

  // Side baseboards
  const sideTrimGeo = new THREE.BoxGeometry(0.04, 0.1, DEPTH + 0.1);
  geometries.push(sideTrimGeo);

  [{ x: -HALF_W + 0.02 }, { x: HALF_W - 0.02 }].forEach((sd) => {
    const trim = new THREE.Mesh(sideTrimGeo, trimMat);
    trim.position.set(sd.x, 0.05, 0);
    group.add(trim);
  });
}

/** Build floor */
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
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);
  geometries.push(floorGeo);
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
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HEIGHT;
  ceiling.receiveShadow = true;
  group.add(ceiling);
  geometries.push(ceilingGeo);
}

/** Build 4×5 grid of student desks with attached chairs */
function buildStudentDesks(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const laminateMat = new THREE.MeshStandardMaterial({
    color: PALETTE.deskLaminate,
    roughness: 0.5,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.deskMetal,
    roughness: 0.4,
    metalness: 0.6,
  });
  const chairMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chairSeat,
    roughness: 0.6,
    metalness: 0.1,
  });
  materials.push(laminateMat, metalMat, chairMat);

  // Shared geometries
  const deskTopGeo = new THREE.BoxGeometry(DESK_WIDTH, 0.03, DESK_DEPTH_SIZE);
  const deskLegGeo = new THREE.CylinderGeometry(0.015, 0.015, DESK_HEIGHT - 0.03, 6);
  const chairSeatGeo = new THREE.BoxGeometry(0.38, 0.025, 0.36);
  const chairBackGeo = new THREE.BoxGeometry(0.36, 0.3, 0.02);
  const chairLegGeo = new THREE.CylinderGeometry(0.012, 0.012, CHAIR_HEIGHT - 0.025, 6);
  geometries.push(deskTopGeo, deskLegGeo, chairSeatGeo, chairBackGeo, chairLegGeo);

  // Grid offset so desks are centered, starting behind center (students face back wall)
  const gridStartX = -(DESK_COLS - 1) * DESK_SPACING_X / 2;
  const gridStartZ = -HALF_D + 3.5;  // Leave space for teacher area

  for (let row = 0; row < DESK_ROWS; row++) {
    for (let col = 0; col < DESK_COLS; col++) {
      const cx = gridStartX + col * DESK_SPACING_X;
      const cz = gridStartZ + row * DESK_SPACING_Z;

      // Desk top
      const top = new THREE.Mesh(deskTopGeo, laminateMat);
      top.position.set(cx, DESK_HEIGHT, cz);
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // Desk legs (4 corners)
      const legOffsets = [
        { dx: -DESK_WIDTH / 2 + 0.04, dz: -DESK_DEPTH_SIZE / 2 + 0.04 },
        { dx: DESK_WIDTH / 2 - 0.04, dz: -DESK_DEPTH_SIZE / 2 + 0.04 },
        { dx: -DESK_WIDTH / 2 + 0.04, dz: DESK_DEPTH_SIZE / 2 - 0.04 },
        { dx: DESK_WIDTH / 2 - 0.04, dz: DESK_DEPTH_SIZE / 2 - 0.04 },
      ];
      legOffsets.forEach((lo) => {
        const leg = new THREE.Mesh(deskLegGeo, metalMat);
        leg.position.set(cx + lo.dx, (DESK_HEIGHT - 0.03) / 2, cz + lo.dz);
        group.add(leg);
      });

      // Chair — behind the desk (higher Z = closer to front wall)
      const chairZ = cz + DESK_DEPTH_SIZE / 2 + 0.3;

      // Chair seat
      const seat = new THREE.Mesh(chairSeatGeo, chairMat);
      seat.position.set(cx, CHAIR_HEIGHT, chairZ);
      seat.castShadow = true;
      group.add(seat);

      // Chair back
      const back = new THREE.Mesh(chairBackGeo, chairMat);
      back.position.set(cx, CHAIR_HEIGHT + 0.175, chairZ + 0.17);
      group.add(back);

      // Chair legs (4 corners)
      const cLegOffsets = [
        { dx: -0.16, dz: -0.14 },
        { dx: 0.16, dz: -0.14 },
        { dx: -0.16, dz: 0.14 },
        { dx: 0.16, dz: 0.14 },
      ];
      cLegOffsets.forEach((lo) => {
        const cleg = new THREE.Mesh(chairLegGeo, metalMat);
        cleg.position.set(cx + lo.dx, (CHAIR_HEIGHT - 0.025) / 2, chairZ + lo.dz);
        group.add(cleg);
      });
    }
  }
}

/** Build teacher's desk at the front (near back wall / chalkboard) */
function buildTeacherDesk(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const teacherMat = new THREE.MeshStandardMaterial({
    color: PALETTE.teacherDesk,
    roughness: 0.5,
    metalness: 0.15,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.deskMetal,
    roughness: 0.4,
    metalness: 0.5,
  });
  materials.push(teacherMat, metalMat);

  // Desk top — larger than student desks
  const topGeo = new THREE.BoxGeometry(1.5, 0.04, 0.7);
  const topMesh = new THREE.Mesh(topGeo, teacherMat);
  topMesh.position.set(0, 0.76, -HALF_D + 1.2);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);
  geometries.push(topGeo);

  // Front panel (modesty panel)
  const panelGeo = new THREE.BoxGeometry(1.5, 0.65, 0.03);
  const panel = new THREE.Mesh(panelGeo, teacherMat);
  panel.position.set(0, 0.76 - 0.34, -HALF_D + 1.2 + 0.34);
  group.add(panel);
  geometries.push(panelGeo);

  // Legs (4 corners)
  const legGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
  geometries.push(legGeo);

  const legPositions = [
    { x: -0.7, z: -HALF_D + 1.2 - 0.3 },
    { x: 0.7, z: -HALF_D + 1.2 - 0.3 },
    { x: -0.7, z: -HALF_D + 1.2 + 0.3 },
    { x: 0.7, z: -HALF_D + 1.2 + 0.3 },
  ];

  legPositions.forEach((lp) => {
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.set(lp.x, 0.36, lp.z);
    group.add(leg);
  });
}

/** Build chalkboard on the front wall and a wall clock */
function buildChalkboardAndClock(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { clockMinuteHand: THREE.Mesh; clockSecondHand: THREE.Mesh } {
  // --- Chalkboard ---
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chalkFrame,
    roughness: 0.6,
    metalness: 0.1,
  });
  const boardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chalkGreen,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(frameMat, boardMat);

  // Frame
  const frameGeo = new THREE.BoxGeometry(3.2, 1.4, 0.06);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 1.6, -HALF_D + 0.04);
  group.add(frame);
  geometries.push(frameGeo);

  // Board surface (slightly forward of frame)
  const boardGeo = new THREE.PlaneGeometry(3.0, 1.2);
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 1.6, -HALF_D + 0.08);
  group.add(board);
  geometries.push(boardGeo);

  // Chalk tray
  const trayGeo = new THREE.BoxGeometry(3.0, 0.04, 0.08);
  const tray = new THREE.Mesh(trayGeo, frameMat);
  tray.position.set(0, 1.6 - 0.62, -HALF_D + 0.1);
  group.add(tray);
  geometries.push(trayGeo);

  // --- Wall Clock ---
  const clockFrameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.clockFrame,
    roughness: 0.5,
    metalness: 0.3,
  });
  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: PALETTE.clockFace,
    roughness: 0.3,
    metalness: 0.0,
  });
  const handMat = new THREE.MeshStandardMaterial({
    color: PALETTE.clockHand,
    roughness: 0.4,
    metalness: 0.2,
  });
  materials.push(clockFrameMat, clockFaceMat, handMat);

  // Clock body — cylinder
  const clockBodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24);
  const clockBody = new THREE.Mesh(clockBodyGeo, clockFrameMat);
  clockBody.rotation.x = Math.PI / 2;
  clockBody.position.set(3.2, 2.4, -HALF_D + 0.04);
  group.add(clockBody);
  geometries.push(clockBodyGeo);

  // Clock face
  const clockFaceGeo = new THREE.CircleGeometry(0.16, 24);
  const clockFace = new THREE.Mesh(clockFaceGeo, clockFaceMat);
  clockFace.position.set(3.2, 2.4, -HALF_D + 0.07);
  group.add(clockFace);
  geometries.push(clockFaceGeo);

  // Hour markers (12 small boxes around the face)
  const markerGeo = new THREE.BoxGeometry(0.008, 0.025, 0.005);
  geometries.push(markerGeo);

  for (let h = 0; h < 12; h++) {
    const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const marker = new THREE.Mesh(markerGeo, handMat);
    marker.position.set(
      3.2 + Math.cos(angle) * 0.13,
      2.4 + Math.sin(angle) * 0.13,
      -HALF_D + 0.075
    );
    marker.rotation.z = angle + Math.PI / 2;
    group.add(marker);
  }

  // Minute hand
  const minuteHandGeo = new THREE.BoxGeometry(0.006, 0.11, 0.004);
  const clockMinuteHand = new THREE.Mesh(minuteHandGeo, handMat);
  clockMinuteHand.position.set(3.2, 2.4, -HALF_D + 0.08);
  // Pivot at bottom: shift geometry so rotation origin is at the base
  minuteHandGeo.translate(0, 0.055, 0);
  group.add(clockMinuteHand);
  geometries.push(minuteHandGeo);

  // Second hand (thin, red-tipped feel)
  const secondHandGeo = new THREE.BoxGeometry(0.003, 0.12, 0.003);
  const secondHandMat = new THREE.MeshStandardMaterial({
    color: '#aa2200',
    roughness: 0.3,
    metalness: 0.4,
  });
  materials.push(secondHandMat);
  const clockSecondHand = new THREE.Mesh(secondHandGeo, secondHandMat);
  clockSecondHand.position.set(3.2, 2.4, -HALF_D + 0.085);
  secondHandGeo.translate(0, 0.06, 0);
  group.add(clockSecondHand);
  geometries.push(secondHandGeo);

  return { clockMinuteHand, clockSecondHand };
}

/** Build overhead fluorescent panel lights */
function buildFluorescentLights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { fluorescentMaterials: THREE.MeshStandardMaterial[] } {
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#d8d0c0',
    roughness: 0.6,
    metalness: 0.2,
  });
  materials.push(housingMat);

  const fluorescentMaterials: THREE.MeshStandardMaterial[] = [];

  // 2×3 grid of fluorescent panels
  const panelRows = 3;
  const panelCols = 2;
  const panelSpacingX = 3.0;
  const panelSpacingZ = 3.2;

  const housingGeo = new THREE.BoxGeometry(1.2, 0.06, 0.3);
  const panelGeo = new THREE.PlaneGeometry(1.1, 0.22);
  geometries.push(housingGeo, panelGeo);

  for (let r = 0; r < panelRows; r++) {
    for (let c = 0; c < panelCols; c++) {
      const px = -panelSpacingX / 2 + c * panelSpacingX;
      const pz = -HALF_D + 2.5 + r * panelSpacingZ;

      // Housing
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(px, HEIGHT - 0.04, pz);
      group.add(housing);

      // Emissive panel face (faces down)
      const panelMat = new THREE.MeshStandardMaterial({
        color: PALETTE.fluorescentWhite,
        emissive: PALETTE.fluorescentWhite,
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.0,
      });
      materials.push(panelMat);
      fluorescentMaterials.push(panelMat);

      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(px, HEIGHT - 0.07, pz);
      group.add(panel);

      // Point light for actual illumination
      const light = new THREE.PointLight(PALETTE.fluorescentWhite, 0.35, 5, 2);
      light.position.set(px, HEIGHT - 0.15, pz);
      group.add(light);
    }
  }

  return { fluorescentMaterials };
}

/** Build window-light glow on the left wall with curtain geometry */
function buildWindows(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const curtainMat = new THREE.MeshStandardMaterial({
    color: PALETTE.curtainBeige,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: PALETTE.windowGlow,
    emissive: PALETTE.windowGlow,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(curtainMat, glowMat);

  // 3 windows along the left wall
  const windowCount = 3;
  const windowSpacing = 3.0;

  const glowGeo = new THREE.PlaneGeometry(1.2, 1.6);
  const curtainGeo = new THREE.PlaneGeometry(0.35, 1.7);
  geometries.push(glowGeo, curtainGeo);

  for (let w = 0; w < windowCount; w++) {
    const wz = -HALF_D + 2.5 + w * windowSpacing;

    // Light glow plane (behind curtains, on wall)
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.y = Math.PI / 2;
    glow.position.set(-HALF_W + 0.05, 1.6, wz);
    group.add(glow);

    // Warm point light from window
    const wLight = new THREE.PointLight(PALETTE.windowGlow, 0.25, 5, 2);
    wLight.position.set(-HALF_W + 0.5, 1.6, wz);
    group.add(wLight);

    // Curtains on either side of window
    [-0.65, 0.65].forEach((offset) => {
      const curtain = new THREE.Mesh(curtainGeo, curtainMat);
      curtain.rotation.y = Math.PI / 2;
      curtain.position.set(-HALF_W + 0.08, 1.6, wz + offset);
      group.add(curtain);
    });
  }
}

/** Build ambient lighting */
function buildAmbientLighting(group: THREE.Group): void {
  // Warm ambient fill — slightly yellow institutional lighting
  const ambient = new THREE.AmbientLight('#d8ccc0', 0.12);
  group.add(ambient);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface LiminalClassroomResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Liminal Classroom scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildLiminalClassroom(seed: number = 410): LiminalClassroomResult {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildStudentDesks(group, geometries, materials);
  buildTeacherDesk(group, geometries, materials);
  const { clockMinuteHand, clockSecondHand } = buildChalkboardAndClock(group, geometries, materials);
  const { fluorescentMaterials } = buildFluorescentLights(group, geometries, materials);
  buildWindows(group, geometries, materials);
  buildAmbientLighting(group);

  let elapsedTime = 0;
  let lastTickTime = 0;

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

      // --- Transient mapped to clock tick (clock hand rotation pulse) ---
      const transientLevel = audioData.transient || 0;

      // Second hand — continuous rotation with transient-triggered tick pulse
      const baseSecondAngle = -(elapsedTime * (Math.PI * 2 / 60)); // One rotation per 60s
      const tickPulse = transientLevel > 0.3 ? Math.sin(elapsedTime * 20) * 0.05 : 0;
      clockSecondHand.rotation.z = baseSecondAngle + tickPulse;

      // Minute hand — slower rotation
      const baseMinuteAngle = -(elapsedTime * (Math.PI * 2 / 3600));
      clockMinuteHand.rotation.z = baseMinuteAngle;

      // Tick trigger — record last tick
      if (transientLevel > 0.3) {
        lastTickTime = elapsedTime;
      }

      // --- High-freq mapped to fluorescent buzz intensity ---
      const highLevel = audioData.high || 0;
      fluorescentMaterials.forEach((mat, i) => {
        // Subtle flickering base + high-freq buzz boost
        const flicker = 0.45 + Math.sin(elapsedTime * 12 + i * 2.3) * 0.04;
        const buzz = highLevel * 0.3;
        mat.emissiveIntensity = flicker + buzz;

        // Occasional micro-flicker on strong transients
        if (transientLevel > 0.5 && Math.random() > 0.7) {
          mat.emissiveIntensity *= 0.7;
        }
      });

      // Subtle ambient breathing — institutional unease
      const _breathe = Math.sin(elapsedTime * 0.3) * 0.01;
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
