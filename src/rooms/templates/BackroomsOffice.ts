/**
 * The Backrooms Office — Room 3
 *
 * An open-plan office space (25m x 25m x 3m) with low drop-ceiling and harsh
 * buzzing fluorescent panels. Grid of identical beige cubicle partition walls
 * (1.5m tall) creating a maze-like layout with 16 cubicles. Each cubicle has
 * identical empty desk, office chair, and dead monitor. Damp institutional
 * carpet floor with dark repeating geometric pattern. Off-white walls with
 * slightly peeling wallpaper effect. One water cooler near entrance with
 * dripping particle effect.
 *
 * Creative direction: The iconic Backrooms archetype. Fluorescent buzz,
 * yellowed ceiling tiles, identical cubicles stretching in every direction.
 * The space feels too large and too familiar at the same time. No one is
 * here. No one has been here. But the lights are on, the carpet is damp,
 * and the water cooler just dripped. You weren't supposed to find this place.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — institutional office fluorescent
// =============================================================================
const PALETTE = {
  wall: '#f0e8d8',            // Off-white with yellow tint
  wallPeel: '#d8c8a8',        // Peeling wallpaper darker tone
  floor: '#5a5040',           // Damp institutional carpet
  floorPattern: '#4a4030',    // Carpet geometric pattern darker tone
  ceiling: '#e8e0d0',         // Drop ceiling tile off-white
  ceilingGrid: '#b8a888',     // Ceiling grid T-bar metal
  cubicle: '#c8b888',         // Beige cubicle partition fabric
  cubicleFrame: '#888070',    // Cubicle metal frame
  desk: '#a09070',            // Laminate desk surface
  deskLegs: '#666666',        // Metal desk legs
  chair: '#444444',           // Dark office chair
  chairFabric: '#555555',     // Chair seat fabric
  monitor: '#222222',         // Dead monitor screen
  monitorBody: '#333333',     // Monitor housing
  fluorescent: '#fffff0',     // Harsh yellowish-white fluorescent
  fluorescentBuzz: '#ffffe0', // Buzz accent color
  waterCooler: '#b8c8d8',     // Blue-tinted plastic
  waterCoolerBase: '#888888', // Metal base
  waterDrip: '#aabbcc',       // Water drip particle
  exitGlowA: '#99ccaa',       // Exit 1 — south wall (green tint)
  exitGlowB: '#cc9988',       // Exit 2 — east wall (warm)
  exitGlowC: '#8899cc',       // Exit 3 — west wall (cool)
  baseboard: '#6a5a4a',       // Dark baseboard strip
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 25;
const DEPTH = 25;
const HEIGHT = 3;
const HALF_W = WIDTH / 2;
const HALF_D = DEPTH / 2;

// =============================================================================
// Material helpers
// =============================================================================

/** Create wall material — off-white with UV distortion for peeling wallpaper effect */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 3,
    patternScale: 1.5,          // Medium pattern for wallpaper texture
    patternRotation: 0.05,      // Slight rotation — subtle wrongness in the walls
    breatheIntensity: 0.5,      // Walls breathe with audio
    rippleFrequency: 2.0,       // Wallpaper peeling ripple
    rippleIntensity: 0.3,       // Visible ripple — peeling effect
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create floor material — damp institutional carpet with geometric pattern */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 3,
    patternScale: 0.5,          // Tight repeating geometric pattern (carpet)
    patternRotation: 0,         // Grid-aligned
    breatheIntensity: 0.35,     // Carpet subtly breathes
    rippleFrequency: 1.5,
    rippleIntensity: 0.15,      // Subtle — carpet doesn't ripple much
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create ceiling material — drop ceiling tiles */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 3,
    patternScale: 1.8,          // Acoustic tile density
    patternRotation: 0,
    breatheIntensity: 0.2,      // Minimal ceiling movement
    rippleFrequency: 2.0,
    rippleIntensity: 0.1,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create cubicle partition material — beige fabric texture */
function createCubicleMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 3000,
    roomIndex: 3,
    patternScale: 0.8,          // Fabric weave density
    patternRotation: 0,
    breatheIntensity: 0.25,     // Partitions subtly breathe
    rippleFrequency: 1.0,
    rippleIntensity: 0.08,      // Very subtle — fabric is stiff
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

/** Build the 4 outer walls — 3 have doorway cutouts for exits */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  // North wall — solid (no exit)
  const northGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 8, 4);
  applyUVMapping(northGeo, WIDTH, HEIGHT);
  const northMesh = new THREE.Mesh(northGeo, wallMat);
  northMesh.position.set(0, HEIGHT / 2, -HALF_D);
  northMesh.receiveShadow = true;
  group.add(northMesh);
  geometries.push(northGeo);

  // South wall — Exit 1 (centered doorway)
  const southGeo = createWallWithDoorway(WIDTH, HEIGHT, 3, 2.8, 0);
  applyUVMapping(southGeo, WIDTH, HEIGHT);
  const southMesh = new THREE.Mesh(southGeo, wallMat);
  southMesh.position.set(0, HEIGHT / 2, HALF_D);
  southMesh.rotation.y = Math.PI;
  southMesh.receiveShadow = true;
  group.add(southMesh);
  geometries.push(southGeo);

  // East wall — Exit 2 (centered doorway)
  const eastGeo = createWallWithDoorway(DEPTH, HEIGHT, 3, 2.8, 0);
  applyUVMapping(eastGeo, DEPTH, HEIGHT);
  const eastMesh = new THREE.Mesh(eastGeo, wallMat);
  eastMesh.position.set(HALF_W, HEIGHT / 2, 0);
  eastMesh.rotation.y = -Math.PI / 2;
  eastMesh.receiveShadow = true;
  group.add(eastMesh);
  geometries.push(eastGeo);

  // West wall — Exit 3 (offset doorway, near south end)
  const westGeo = createWallWithDoorway(DEPTH, HEIGHT, 3, 2.8, 5);
  applyUVMapping(westGeo, DEPTH, HEIGHT);
  const westMesh = new THREE.Mesh(westGeo, wallMat);
  westMesh.position.set(-HALF_W, HEIGHT / 2, 0);
  westMesh.rotation.y = Math.PI / 2;
  westMesh.receiveShadow = true;
  group.add(westMesh);
  geometries.push(westGeo);

  // Baseboards — dark strips along all 4 walls
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.baseboard,
    roughness: 0.8,
    metalness: 0.05,
  });
  materials.push(baseboardMat);
  const baseH = 0.1;

  const baseNorthGeo = new THREE.BoxGeometry(WIDTH, baseH, 0.02);
  const baseNorth = new THREE.Mesh(baseNorthGeo, baseboardMat);
  baseNorth.position.set(0, baseH / 2, -HALF_D + 0.01);
  group.add(baseNorth);
  geometries.push(baseNorthGeo);

  const baseSouthGeo = new THREE.BoxGeometry(WIDTH, baseH, 0.02);
  const baseSouth = new THREE.Mesh(baseSouthGeo, baseboardMat);
  baseSouth.position.set(0, baseH / 2, HALF_D - 0.01);
  group.add(baseSouth);
  geometries.push(baseSouthGeo);

  const baseEastGeo = new THREE.BoxGeometry(0.02, baseH, DEPTH);
  const baseEast = new THREE.Mesh(baseEastGeo, baseboardMat);
  baseEast.position.set(HALF_W - 0.01, baseH / 2, 0);
  group.add(baseEast);
  geometries.push(baseEastGeo);

  const baseWestGeo = new THREE.BoxGeometry(0.02, baseH, DEPTH);
  const baseWest = new THREE.Mesh(baseWestGeo, baseboardMat);
  baseWest.position.set(-HALF_W + 0.01, baseH / 2, 0);
  group.add(baseWest);
  geometries.push(baseWestGeo);
}

/** Build floor with damp institutional carpet pattern */
function buildFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 8, 8);
  applyUVMapping(floorGeo, WIDTH, DEPTH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  geometries.push(floorGeo);

  // Dark fallback floor — prevents black void
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/** Build low drop-ceiling with acoustic tile grid */
function buildCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const ceilingMat = createCeilingMaterial(seed);
  materials.push(ceilingMat);

  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 8, 8);
  applyUVMapping(ceilingGeo, WIDTH, DEPTH);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT;
  ceilingMesh.receiveShadow = true;
  group.add(ceilingMesh);
  geometries.push(ceilingGeo);

  // Drop ceiling T-bar grid — thin metal strips forming the grid
  const gridMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ceilingGrid,
    roughness: 0.6,
    metalness: 0.3,
  });
  materials.push(gridMat);

  const gridThickness = 0.02;
  const gridDrop = 0.015;
  const gridSpacing = 1.2; // 1.2m standard ceiling tile size

  // Longitudinal grid lines (along Z)
  const longGridGeo = new THREE.BoxGeometry(gridThickness, gridDrop, DEPTH);
  const longCount = Math.floor(WIDTH / gridSpacing);
  for (let i = 0; i <= longCount; i++) {
    const x = -HALF_W + i * gridSpacing;
    const gridLine = new THREE.Mesh(longGridGeo, gridMat);
    gridLine.position.set(x, HEIGHT - gridDrop / 2, 0);
    group.add(gridLine);
  }
  geometries.push(longGridGeo);

  // Transverse grid lines (along X)
  const transGridGeo = new THREE.BoxGeometry(WIDTH, gridDrop, gridThickness);
  const transCount = Math.floor(DEPTH / gridSpacing);
  for (let i = 0; i <= transCount; i++) {
    const z = -HALF_D + i * gridSpacing;
    const gridLine = new THREE.Mesh(transGridGeo, gridMat);
    gridLine.position.set(0, HEIGHT - gridDrop / 2, z);
    group.add(gridLine);
  }
  geometries.push(transGridGeo);
}

/**
 * Build cubicle partition grid — 4x4 layout of beige partitions (16 cubicles).
 * Partitions are 1.5m tall, creating a maze-like open office.
 * Each cubicle is approximately 4m x 4m, with gaps for walkways.
 */
function buildCubicles(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const cubicleMat = createCubicleMaterial(seed);
  materials.push(cubicleMat);

  // Cubicle frame material — metal edges
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cubicleFrame,
    roughness: 0.5,
    metalness: 0.4,
  });
  materials.push(frameMat);

  const partitionHeight = 1.5;
  const partitionThickness = 0.06;
  const cubicleSize = 4.0;  // Each cubicle cell
  const gapWidth = 1.2;     // Walkway gaps between cubicles

  // Grid origin offset — center the 4x4 grid in the room
  const gridOffsetX = -7.5;
  const gridOffsetZ = -7.5;

  // Partition panel geometries
  const longPanelGeo = new THREE.BoxGeometry(cubicleSize, partitionHeight, partitionThickness);
  const shortPanelGeo = new THREE.BoxGeometry(partitionThickness, partitionHeight, cubicleSize);
  geometries.push(longPanelGeo, shortPanelGeo);

  // Frame strip geometry (top edge of partition)
  const longFrameGeo = new THREE.BoxGeometry(cubicleSize, 0.03, partitionThickness + 0.02);
  const shortFrameGeo = new THREE.BoxGeometry(partitionThickness + 0.02, 0.03, cubicleSize);
  geometries.push(longFrameGeo, shortFrameGeo);

  // Build 4x4 grid of cubicle partitions
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = gridOffsetX + col * (cubicleSize + gapWidth) + cubicleSize / 2;
      const cz = gridOffsetZ + row * (cubicleSize + gapWidth) + cubicleSize / 2;

      // Back wall of cubicle (along X axis) — skip some for walkway variation
      if (row > 0) {
        const backPanel = new THREE.Mesh(longPanelGeo, cubicleMat);
        backPanel.position.set(cx, partitionHeight / 2, cz - cubicleSize / 2);
        backPanel.receiveShadow = true;
        group.add(backPanel);

        const backFrame = new THREE.Mesh(longFrameGeo, frameMat);
        backFrame.position.set(cx, partitionHeight + 0.015, cz - cubicleSize / 2);
        group.add(backFrame);
      }

      // Left wall of cubicle (along Z axis) — skip entrance on some
      if (col > 0 || row % 2 === 0) {
        const leftPanel = new THREE.Mesh(shortPanelGeo, cubicleMat);
        leftPanel.position.set(cx - cubicleSize / 2, partitionHeight / 2, cz);
        leftPanel.receiveShadow = true;
        group.add(leftPanel);

        const leftFrame = new THREE.Mesh(shortFrameGeo, frameMat);
        leftFrame.position.set(cx - cubicleSize / 2, partitionHeight + 0.015, cz);
        group.add(leftFrame);
      }
    }
  }

  // Outer perimeter partitions along the far edges to close off the grid
  for (let col = 0; col < 4; col++) {
    const cx = gridOffsetX + col * (cubicleSize + gapWidth) + cubicleSize / 2;
    const farZ = gridOffsetZ + 3 * (cubicleSize + gapWidth) + cubicleSize;
    const backPanel = new THREE.Mesh(longPanelGeo, cubicleMat);
    backPanel.position.set(cx, partitionHeight / 2, farZ);
    group.add(backPanel);
  }

  for (let row = 0; row < 4; row++) {
    const cz = gridOffsetZ + row * (cubicleSize + gapWidth) + cubicleSize / 2;
    const farX = gridOffsetX + 3 * (cubicleSize + gapWidth) + cubicleSize;
    const sidePanel = new THREE.Mesh(shortPanelGeo, cubicleMat);
    sidePanel.position.set(farX, partitionHeight / 2, cz);
    group.add(sidePanel);
  }
}

/**
 * Build cubicle furniture — each cubicle gets an identical desk, chair, and dead monitor.
 * 16 cubicles in a 4x4 grid.
 */
function buildFurniture(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Desk materials
  const deskMat = new THREE.MeshStandardMaterial({
    color: PALETTE.desk,
    roughness: 0.6,
    metalness: 0.1,
  });
  const deskLegMat = new THREE.MeshStandardMaterial({
    color: PALETTE.deskLegs,
    roughness: 0.5,
    metalness: 0.5,
  });
  // Chair materials
  const chairMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chair,
    roughness: 0.7,
    metalness: 0.3,
  });
  const chairFabricMat = new THREE.MeshStandardMaterial({
    color: PALETTE.chairFabric,
    roughness: 0.9,
    metalness: 0.0,
  });
  // Monitor materials
  const monitorMat = new THREE.MeshStandardMaterial({
    color: PALETTE.monitorBody,
    roughness: 0.4,
    metalness: 0.2,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: PALETTE.monitor,
    roughness: 0.1,
    metalness: 0.05,
    emissive: '#000000',
    emissiveIntensity: 0,
  });
  materials.push(deskMat, deskLegMat, chairMat, chairFabricMat, monitorMat, screenMat);

  // Desk geometry — simple L-shaped desk surface + legs
  const deskSurfaceGeo = new THREE.BoxGeometry(1.4, 0.04, 0.7);
  const deskLegGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
  geometries.push(deskSurfaceGeo, deskLegGeo);

  // Chair geometry — seat + backrest + base
  const chairSeatGeo = new THREE.BoxGeometry(0.45, 0.06, 0.45);
  const chairBackGeo = new THREE.BoxGeometry(0.45, 0.5, 0.05);
  const chairBaseGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
  const chairFootGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.04, 8);
  geometries.push(chairSeatGeo, chairBackGeo, chairBaseGeo, chairFootGeo);

  // Monitor geometry — screen + body + stand
  const monitorScreenGeo = new THREE.BoxGeometry(0.5, 0.35, 0.02);
  const monitorStandGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06);
  const monitorBaseGeo = new THREE.BoxGeometry(0.25, 0.015, 0.18);
  geometries.push(monitorScreenGeo, monitorStandGeo, monitorBaseGeo);

  const cubicleSize = 4.0;
  const gapWidth = 1.2;
  const gridOffsetX = -7.5;
  const gridOffsetZ = -7.5;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = gridOffsetX + col * (cubicleSize + gapWidth) + cubicleSize / 2;
      const cz = gridOffsetZ + row * (cubicleSize + gapWidth) + cubicleSize / 2;

      // Desk — positioned against the back partition
      const deskSurface = new THREE.Mesh(deskSurfaceGeo, deskMat);
      deskSurface.position.set(cx, 0.74, cz - 1.0);
      deskSurface.castShadow = true;
      deskSurface.receiveShadow = true;
      group.add(deskSurface);

      // Desk legs — 4 corners
      const legPositions = [
        [cx - 0.65, cz - 1.3],
        [cx + 0.65, cz - 1.3],
        [cx - 0.65, cz - 0.7],
        [cx + 0.65, cz - 0.7],
      ];
      for (const [lx, lz] of legPositions) {
        const leg = new THREE.Mesh(deskLegGeo, deskLegMat);
        leg.position.set(lx, 0.36, lz);
        group.add(leg);
      }

      // Chair — slightly pushed back from desk, with minor rotation for naturalness
      const chairAngle = (col * 0.15) - 0.1; // Slight varied rotation

      const seat = new THREE.Mesh(chairSeatGeo, chairFabricMat);
      seat.position.set(cx + 0.1, 0.43, cz + 0.1);
      seat.rotation.y = chairAngle;
      group.add(seat);

      const back = new THREE.Mesh(chairBackGeo, chairFabricMat);
      back.position.set(
        cx + 0.1 + Math.sin(chairAngle) * 0.22,
        0.71,
        cz + 0.1 + Math.cos(chairAngle) * 0.22
      );
      back.rotation.y = chairAngle;
      group.add(back);

      const chairBase = new THREE.Mesh(chairBaseGeo, chairMat);
      chairBase.position.set(cx + 0.1, 0.2, cz + 0.1);
      group.add(chairBase);

      const chairFoot = new THREE.Mesh(chairFootGeo, chairMat);
      chairFoot.position.set(cx + 0.1, 0.02, cz + 0.1);
      group.add(chairFoot);

      // Monitor — on the desk, centered, dead screen
      const monScreen = new THREE.Mesh(monitorScreenGeo, screenMat);
      monScreen.position.set(cx, 0.74 + 0.15 + 0.175, cz - 1.2);
      monScreen.castShadow = true;
      group.add(monScreen);

      const monStand = new THREE.Mesh(monitorStandGeo, monitorMat);
      monStand.position.set(cx, 0.74 + 0.075, cz - 1.2);
      group.add(monStand);

      const monBase = new THREE.Mesh(monitorBaseGeo, monitorMat);
      monBase.position.set(cx, 0.74 + 0.01, cz - 1.2);
      group.add(monBase);
    }
  }
}

/**
 * Build water cooler near the entrance with dripping particle effect.
 * Positioned near the south wall (entrance area).
 */
function buildWaterCooler(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { dripParticles: THREE.Mesh[] } {
  const coolerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.waterCooler,
    roughness: 0.3,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.waterCoolerBase,
    roughness: 0.5,
    metalness: 0.4,
  });
  materials.push(coolerMat, baseMat);

  // Water cooler position — near southwest corner, close to entrance
  const wcX = -10;
  const wcZ = 10;

  // Base — metal stand
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(wcX, 0.3, wcZ);
  group.add(base);
  geometries.push(baseGeo);

  // Body — water bottle (inverted)
  const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12);
  const body = new THREE.Mesh(bodyGeo, coolerMat);
  body.position.set(wcX, 0.85, wcZ);
  group.add(body);
  geometries.push(bodyGeo);

  // Bottle top (inverted water jug)
  const bottleGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.4, 12);
  const bottle = new THREE.Mesh(bottleGeo, coolerMat);
  bottle.position.set(wcX, 1.3, wcZ);
  group.add(bottle);
  geometries.push(bottleGeo);

  // Spout
  const spoutGeo = new THREE.BoxGeometry(0.04, 0.03, 0.08);
  const spout = new THREE.Mesh(spoutGeo, baseMat);
  spout.position.set(wcX, 0.65, wcZ + 0.2);
  group.add(spout);
  geometries.push(spoutGeo);

  // Drip catch tray
  const trayGeo = new THREE.BoxGeometry(0.2, 0.02, 0.12);
  const tray = new THREE.Mesh(trayGeo, baseMat);
  tray.position.set(wcX, 0.55, wcZ + 0.22);
  group.add(tray);
  geometries.push(trayGeo);

  // Drip particles — small translucent spheres falling from spout
  const dripMat = new THREE.MeshBasicMaterial({
    color: PALETTE.waterDrip,
    transparent: true,
    opacity: 0.4,
  });
  materials.push(dripMat);

  const dripGeo = new THREE.SphereGeometry(0.01, 4, 4);
  geometries.push(dripGeo);

  const dripParticles: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const drip = new THREE.Mesh(dripGeo, dripMat);
    drip.position.set(wcX, 0.63 - i * 0.02, wcZ + 0.2);
    drip.userData.waterDrip = true;
    drip.userData.dripPhase = i * 1.2;
    drip.userData.baseY = 0.63;
    drip.visible = false; // Start hidden, animate in update
    group.add(drip);
    dripParticles.push(drip);
  }

  return { dripParticles };
}

/**
 * Build harsh fluorescent light fixtures — 3x3 grid of ceiling panels.
 * Fluorescent buzz intensity scales with mid frequencies.
 * Lights flicker on audio transients.
 */
function buildLights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { lights: THREE.PointLight[]; lightMeshes: THREE.Mesh[]; flickerTubeMat: THREE.MeshStandardMaterial } {
  const lights: THREE.PointLight[] = [];
  const lightMeshes: THREE.Mesh[] = [];

  // Fluorescent fixture housing
  const fixtureGeo = new THREE.BoxGeometry(1.0, 0.04, 0.5);
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: '#cccccc',
    roughness: 0.5,
    metalness: 0.3,
  });
  geometries.push(fixtureGeo);
  materials.push(fixtureMat);

  // Emissive tube (the glowing panel)
  const tubeGeo = new THREE.BoxGeometry(0.9, 0.015, 0.4);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescent,
    emissive: PALETTE.fluorescent,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.0,
  });
  geometries.push(tubeGeo);
  materials.push(tubeMat);

  // 3x3 grid of fluorescent panels
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -8 + col * 8;
      const z = -8 + row * 8;

      // Fixture housing
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(x, HEIGHT - 0.02, z);
      group.add(fixture);

      // Emissive tube
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.set(x, HEIGHT - 0.05, z);
      group.add(tube);
      lightMeshes.push(tube);

      // Point light casting harsh pool of light downward
      const light = new THREE.PointLight(PALETTE.fluorescent, 1.0, 10, 1.5);
      light.position.set(x, HEIGHT - 0.1, z);
      light.castShadow = row === 1 && col === 1; // Only center light casts shadows (performance)
      if (light.castShadow) {
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
      }
      group.add(light);
      lights.push(light);
    }
  }

  // Ambient fill — never pitch black
  const ambient = new THREE.AmbientLight(PALETTE.fluorescentBuzz, 0.12);
  group.add(ambient);

  return { lights, lightMeshes, flickerTubeMat: tubeMat };
}

/**
 * Build exit doorway glows for all 3 exits.
 */
function buildExitGlows(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Exit 1: South wall (centered) — green tint
  const glowGeo1 = new THREE.PlaneGeometry(3, 2.8);
  const glowMat1 = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlowA,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const glow1 = new THREE.Mesh(glowGeo1, glowMat1);
  glow1.position.set(0, 2.8 / 2, HALF_D + 0.1);
  glow1.rotation.y = Math.PI;
  group.add(glow1);
  geometries.push(glowGeo1);
  materials.push(glowMat1);

  const exitLight1 = new THREE.PointLight(PALETTE.exitGlowA, 0.3, 6, 1.5);
  exitLight1.position.set(0, 1.5, HALF_D - 0.5);
  group.add(exitLight1);

  // Exit 2: East wall (centered) — warm tint
  const glowGeo2 = new THREE.PlaneGeometry(3, 2.8);
  const glowMat2 = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlowB,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const glow2 = new THREE.Mesh(glowGeo2, glowMat2);
  glow2.position.set(HALF_W + 0.1, 2.8 / 2, 0);
  glow2.rotation.y = -Math.PI / 2;
  group.add(glow2);
  geometries.push(glowGeo2);
  materials.push(glowMat2);

  const exitLight2 = new THREE.PointLight(PALETTE.exitGlowB, 0.3, 6, 1.5);
  exitLight2.position.set(HALF_W - 0.5, 1.5, 0);
  group.add(exitLight2);

  // Exit 3: West wall (offset toward south) — cool tint
  const glowGeo3 = new THREE.PlaneGeometry(3, 2.8);
  const glowMat3 = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlowC,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const glow3 = new THREE.Mesh(glowGeo3, glowMat3);
  glow3.position.set(-HALF_W - 0.1, 2.8 / 2, 5);
  glow3.rotation.y = Math.PI / 2;
  group.add(glow3);
  geometries.push(glowGeo3);
  materials.push(glowMat3);

  const exitLight3 = new THREE.PointLight(PALETTE.exitGlowC, 0.3, 6, 1.5);
  exitLight3.position.set(-HALF_W + 0.5, 1.5, 5);
  group.add(exitLight3);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface BackroomsOfficeRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Backrooms Office scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildBackroomsOffice(seed: number = 126): BackroomsOfficeRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildCubicles(group, geometries, materials, seed);
  buildFurniture(group, geometries, materials);
  const { dripParticles } = buildWaterCooler(group, geometries, materials);
  const { lights, flickerTubeMat } = buildLights(group, geometries, materials);
  buildExitGlows(group, geometries, materials);

  // Track elapsed time for shader updates
  let elapsedTime = 0;

  // Flicker state
  let flickerPhase = 0;

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

      // ---------------------------------------------------------------
      // Audio reactivity: Fluorescent lights
      // Buzz intensity scales with mid frequencies.
      // Lights flicker on transients.
      // ---------------------------------------------------------------
      flickerPhase += delta * 8;

      const midBuzz = 0.7 + audioData.mid * 0.5; // Buzz brightens with mid freqs
      const transientFlicker = audioData.transient > 0.4
        ? Math.sin(flickerPhase * 30) * 0.4 + 0.6  // Rapid flicker on transients
        : 1.0;

      // Per-light variation — each light flickers slightly differently
      for (let i = 0; i < lights.length; i++) {
        const lightVariation = Math.sin(elapsedTime * 3.5 + i * 2.1) * 0.05;
        lights[i].intensity = midBuzz * transientFlicker + lightVariation;
      }

      // Emissive tube glow tracks mid frequency
      flickerTubeMat.emissiveIntensity = 0.6 + audioData.mid * 0.4;

      // Occasional random flicker on a single light (the Backrooms signature)
      if (Math.random() < 0.003) {
        const randomLight = Math.floor(Math.random() * lights.length);
        lights[randomLight].intensity *= 0.2; // Brief dropout
      }

      // ---------------------------------------------------------------
      // Water cooler drip animation
      // ---------------------------------------------------------------
      for (const drip of dripParticles) {
        const phase = drip.userData.dripPhase as number;
        const baseY = drip.userData.baseY as number;

        // Cyclic drip: falls, resets to top
        const cycle = (elapsedTime * 0.4 + phase) % 3.0;

        if (cycle < 1.5) {
          // Drip is falling
          drip.visible = true;
          drip.position.y = baseY - cycle * 0.06;
          // Fade as it falls
          (drip.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1.0 - cycle / 1.5);
        } else {
          // Drip is hidden (waiting for next cycle)
          drip.visible = false;
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
 * Get the CuratedRoom template data for the Backrooms Office.
 * This is the declarative config used by the room system for collision,
 * doorway placement, and palette information.
 */
export { getCuratedTemplate } from '../RoomTemplates';
