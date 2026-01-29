/**
 * The Sunken Mall Atrium — Room 6
 *
 * A large two-level atrium (30m × 30m × 10m) with a mezzanine balcony ring
 * around the perimeter at 5m height. Ground level has dead fountain geometry
 * in center (dry, cracked basin), surrounded by empty planter boxes.
 *
 * Shuttered storefront walls around the perimeter — metal security gates
 * pulled down over dark openings. Floor is polished (reflective) faux-marble
 * tile pattern via shader environment mapping.
 *
 * Mezzanine level visible but unreachable — broken escalator meshes at two
 * corners. Skylights above are dark/night — no natural light, only the orange
 * sodium-vapor quality of mall emergency lighting.
 *
 * Audio reactivity: fountain basin glows with bass, storefront security gates
 * rattle (vertex displacement) with transients. Faint muzak-quality ambient
 * plays from invisible speakers (audio system integration).
 *
 * Creative direction: The dead mall is peak liminal space. Once a thriving
 * hub of consumerism, now an echoing tomb of commerce. The orange sodium-vapor
 * lighting casts everything in an amber haze that makes the space feel
 * suspended in amber — preserved but lifeless. The mezzanine above is
 * tantalizingly close but unreachable, the broken escalators a monument to
 * stalled progress. The dry fountain is the heart of the space — a centerpiece
 * for a gathering that will never happen again.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';

// =============================================================================
// Palette — dead mall sodium-vapor orange with cool accent shadows
// =============================================================================
const PALETTE = {
  // Walls & structure
  wallConcrete: '#8a7a6a',        // Concrete/stucco mall walls
  wallConcreteUpper: '#777068',   // Slightly darker upper walls near ceiling
  mezzanineRail: '#888888',       // Metal railing
  mezzanineDeck: '#9a8a7a',       // Mezzanine floor surface
  mezzanineEdge: '#706050',       // Mezzanine edge/fascia

  // Floor
  marbleTile: '#d4c8b8',          // Polished faux-marble tile (warm cream)
  marbleVein: '#b8a898',          // Marble veining accent
  marbleReflect: '#e8dcd0',       // Reflective highlight

  // Ceiling & skylights
  ceiling: '#333333',             // Dark ceiling (night sky behind skylights)
  skylightFrame: '#555555',       // Skylight metal frame
  skylightGlass: '#111122',       // Dark glass — night outside

  // Lighting
  sodiumVapor: '#ff9940',         // Orange sodium-vapor emergency light
  sodiumVaporDim: '#cc7730',      // Dimmer sodium-vapor
  sodiumVaporWarm: '#ffaa55',     // Warmer tint at close range

  // Fountain
  fountainStone: '#a09080',       // Weathered stone/concrete basin
  fountainInner: '#706050',       // Dry inner basin surface
  fountainCrack: '#5a4a3a',       // Cracks in basin
  fountainGlow: '#66aacc',        // Audio-reactive glow in basin

  // Storefronts
  storefrontFrame: '#665850',     // Storefront frame / surround
  securityGate: '#777777',        // Metal security gate (rolled-down)
  securityGateDark: '#444444',    // Dark void behind gate
  storefrontSign: '#998877',      // Faded signage area

  // Planters
  planterConcrete: '#887868',     // Concrete planter box
  planterSoil: '#4a3a2a',        // Dry, dead soil
  planterRim: '#9a8a7a',         // Planter rim edge

  // Escalators
  escalatorMetal: '#777777',      // Stainless steel escalator body
  escalatorStep: '#888888',       // Escalator step surface
  escalatorRubber: '#333333',     // Rubber handrail
  escalatorBase: '#666666',       // Base housing

  // Exit
  exitGlow: '#ffffff',            // Bright white exit glow (contrast)
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 30;
const DEPTH = 30;
const HEIGHT = 10;
const HALF_W = WIDTH / 2;       // 15
const HALF_D = DEPTH / 2;       // 15

const MEZZ_HEIGHT = 5;           // Mezzanine balcony at 5m
const MEZZ_DEPTH = 3;            // Mezzanine walkway depth (3m from wall)
const MEZZ_RAIL_HEIGHT = 1.1;    // Railing height above mezzanine deck
const MEZZ_THICKNESS = 0.25;     // Structural thickness of mezzanine slab

const FOUNTAIN_RADIUS = 3;       // Fountain basin outer radius
const FOUNTAIN_INNER_RADIUS = 2.5;
const FOUNTAIN_HEIGHT = 0.8;     // Basin wall height
const FOUNTAIN_DEPTH = 0.4;      // Basin interior depth

// =============================================================================
// Material helpers
// =============================================================================

/** Mall wall material — concrete/stucco with subtle sodium-tinted breathing */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 6,
    patternScale: 0.6,
    patternRotation: 0.005,
    breatheIntensity: 0.3,
    rippleFrequency: 1.2,
    rippleIntensity: 0.12,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Polished faux-marble tile floor — reflective, veined pattern */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 600,
    roomIndex: 6,
    patternScale: 2.0,           // Tile grid visible
    patternRotation: 0.0,        // Grid-aligned
    breatheIntensity: 0.35,      // Floor subtly breathes
    rippleFrequency: 2.0,        // Reflective shimmer
    rippleIntensity: 0.2,        // Polished surface has more visible ripple
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Mezzanine deck material */
function createMezzanineMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1200,
    roomIndex: 6,
    patternScale: 1.5,
    patternRotation: 0.0,
    breatheIntensity: 0.2,
    rippleFrequency: 1.0,
    rippleIntensity: 0.08,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Ceiling material — dark, barely visible */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2400,
    roomIndex: 6,
    patternScale: 0.5,
    patternRotation: 0,
    breatheIntensity: 0.1,
    rippleFrequency: 0.8,
    rippleIntensity: 0.05,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Fountain basin material — weathered stone */
function createFountainMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1800,
    roomIndex: 6,
    patternScale: 1.8,
    patternRotation: 0.02,
    breatheIntensity: 0.5,       // Fountain breathes strongly with bass
    rippleFrequency: 2.5,
    rippleIntensity: 0.3,
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

/** Build the 4 outer walls of the atrium */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  // Wall definitions: position, rotation, whether has exit doorway
  const wallDefs = [
    // North wall (z = -15) — solid
    { x: 0, z: -HALF_D, rotY: 0, w: WIDTH, hasExit: false },
    // East wall (x = +15) — has exit doorway
    { x: HALF_W, z: 0, rotY: -Math.PI / 2, w: DEPTH, hasExit: true },
    // South wall (z = +15) — solid
    { x: 0, z: HALF_D, rotY: Math.PI, w: WIDTH, hasExit: false },
    // West wall (x = -15) — solid
    { x: -HALF_W, z: 0, rotY: Math.PI / 2, w: DEPTH, hasExit: false },
  ];

  wallDefs.forEach((wd) => {
    let geo: THREE.BufferGeometry;
    if (wd.hasExit) {
      geo = createWallWithDoorway(wd.w, HEIGHT, 4, 4, 0);
    } else {
      geo = new THREE.PlaneGeometry(wd.w, HEIGHT, 6, 4);
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

/** Build polished faux-marble tile floor */
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
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 2, DEPTH * 2);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/** Build dark ceiling with skylight frames */
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

  // Skylight frames — dark glass panels showing night sky
  const skylightMat = new THREE.MeshStandardMaterial({
    color: PALETTE.skylightGlass,
    roughness: 0.1,
    metalness: 0.3,
    emissive: '#050510',
    emissiveIntensity: 0.3,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.skylightFrame,
    roughness: 0.6,
    metalness: 0.4,
  });
  materials.push(skylightMat, frameMat);

  // 4 skylight panels in the ceiling
  const skylightPositions = [
    { x: -6, z: -6 }, { x: 6, z: -6 },
    { x: -6, z: 6 }, { x: 6, z: 6 },
  ];

  const panelW = 5;
  const panelD = 5;
  const panelGeo = new THREE.PlaneGeometry(panelW, panelD);
  geometries.push(panelGeo);

  skylightPositions.forEach((pos) => {
    // Dark glass panel
    const panel = new THREE.Mesh(panelGeo, skylightMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(pos.x, HEIGHT - 0.01, pos.z);
    group.add(panel);

    // Metal frame border
    const frameGeo = new THREE.BoxGeometry(panelW + 0.3, 0.1, panelD + 0.3);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(pos.x, HEIGHT - 0.05, pos.z);
    group.add(frame);
    geometries.push(frameGeo);
  });
}

/**
 * Build dead fountain at the center — dry, cracked basin with no water.
 * The basin glows faintly with audio bass reactivity.
 */
function buildFountain(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): { fountainGlowLight: THREE.PointLight; fountainBasinMeshes: THREE.Mesh[] } {
  const fountainMat = createFountainMaterial(seed);
  materials.push(fountainMat);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fountainStone,
    roughness: 0.85,
    metalness: 0.05,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fountainInner,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(stoneMat, innerMat);

  const fountainBasinMeshes: THREE.Mesh[] = [];

  // Outer basin wall — cylindrical ring
  const outerGeo = new THREE.CylinderGeometry(
    FOUNTAIN_RADIUS, FOUNTAIN_RADIUS + 0.2,
    FOUNTAIN_HEIGHT, 24, 1, true
  );
  const outerMesh = new THREE.Mesh(outerGeo, stoneMat);
  outerMesh.position.set(0, FOUNTAIN_HEIGHT / 2, 0);
  group.add(outerMesh);
  geometries.push(outerGeo);

  // Inner basin wall — slightly smaller ring facing inward
  const innerWallGeo = new THREE.CylinderGeometry(
    FOUNTAIN_INNER_RADIUS, FOUNTAIN_INNER_RADIUS,
    FOUNTAIN_HEIGHT - 0.1, 24, 1, true
  );
  const innerWallMesh = new THREE.Mesh(innerWallGeo, innerMat);
  innerWallMesh.position.set(0, (FOUNTAIN_HEIGHT - 0.1) / 2, 0);
  // Flip normals inward
  innerWallGeo.scale(-1, 1, 1);
  group.add(innerWallMesh);
  geometries.push(innerWallGeo);

  // Basin rim — wide flat torus on top
  const rimGeo = new THREE.TorusGeometry(
    (FOUNTAIN_RADIUS + FOUNTAIN_INNER_RADIUS) / 2,
    (FOUNTAIN_RADIUS - FOUNTAIN_INNER_RADIUS) / 2 + 0.1,
    4, 24
  );
  const rimMesh = new THREE.Mesh(rimGeo, stoneMat);
  rimMesh.position.set(0, FOUNTAIN_HEIGHT, 0);
  rimMesh.rotation.x = Math.PI / 2;
  group.add(rimMesh);
  geometries.push(rimGeo);

  // Basin bottom floor — dry, cracked surface (uses fountain shader material)
  const basinFloorGeo = new THREE.CircleGeometry(FOUNTAIN_INNER_RADIUS, 24);
  const basinFloor = new THREE.Mesh(basinFloorGeo, fountainMat);
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(0, FOUNTAIN_HEIGHT - FOUNTAIN_DEPTH, 0);
  group.add(basinFloor);
  geometries.push(basinFloorGeo);
  fountainBasinMeshes.push(basinFloor);

  // Central pedestal — where a sculpture once stood
  const pedestalGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 12);
  const pedestal = new THREE.Mesh(pedestalGeo, stoneMat);
  pedestal.position.set(0, FOUNTAIN_HEIGHT - FOUNTAIN_DEPTH + 0.6, 0);
  pedestal.castShadow = true;
  group.add(pedestal);
  geometries.push(pedestalGeo);

  // Cracked basin accent marks — thin dark lines across basin floor
  const crackMat = new THREE.MeshBasicMaterial({
    color: PALETTE.fountainCrack,
    transparent: true,
    opacity: 0.5,
  });
  materials.push(crackMat);

  for (let i = 0; i < 5; i++) {
    const crackGeo = new THREE.PlaneGeometry(
      0.03 + Math.random() * 0.02,
      1.5 + Math.random() * 1.5
    );
    const crack = new THREE.Mesh(crackGeo, crackMat);
    crack.rotation.x = -Math.PI / 2;
    crack.rotation.z = Math.random() * Math.PI;
    crack.position.set(
      (Math.random() - 0.5) * FOUNTAIN_INNER_RADIUS * 1.2,
      FOUNTAIN_HEIGHT - FOUNTAIN_DEPTH + 0.01,
      (Math.random() - 0.5) * FOUNTAIN_INNER_RADIUS * 1.2
    );
    group.add(crack);
    geometries.push(crackGeo);
  }

  // Audio-reactive glow from basin bottom
  const fountainGlowLight = new THREE.PointLight(
    PALETTE.fountainGlow, 0.15, 8, 2
  );
  fountainGlowLight.position.set(0, FOUNTAIN_HEIGHT - FOUNTAIN_DEPTH + 0.1, 0);
  group.add(fountainGlowLight);

  return { fountainGlowLight, fountainBasinMeshes };
}

/**
 * Build empty planter boxes surrounding the fountain.
 * Concrete boxes with dry, dead soil — once held decorative plants.
 */
function buildPlanters(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const planterMat = new THREE.MeshStandardMaterial({
    color: PALETTE.planterConcrete,
    roughness: 0.8,
    metalness: 0.05,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: PALETTE.planterSoil,
    roughness: 0.95,
    metalness: 0.0,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.planterRim,
    roughness: 0.7,
    metalness: 0.1,
  });
  materials.push(planterMat, soilMat, rimMat);

  const planterW = 1.8;
  const planterD = 1.8;
  const planterH = 0.7;

  const bodyGeo = new THREE.BoxGeometry(planterW, planterH, planterD);
  const soilGeo = new THREE.PlaneGeometry(planterW - 0.15, planterD - 0.15);
  const rimGeo = new THREE.BoxGeometry(planterW + 0.1, 0.08, planterD + 0.1);
  geometries.push(bodyGeo, soilGeo, rimGeo);

  // 4 planters arranged around the fountain
  const planterPositions = [
    { x: -5, z: -5, rotY: 0 },
    { x: 5, z: -5, rotY: Math.PI / 4 },
    { x: -5, z: 5, rotY: Math.PI / 2 },
    { x: 5, z: 5, rotY: Math.PI * 3 / 4 },
  ];

  planterPositions.forEach((pos) => {
    // Planter body
    const body = new THREE.Mesh(bodyGeo, planterMat);
    body.position.set(pos.x, planterH / 2, pos.z);
    body.rotation.y = pos.rotY;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Soil surface
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(pos.x, planterH - 0.05, pos.z);
    group.add(soil);

    // Rim edge
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(pos.x, planterH + 0.04, pos.z);
    rim.rotation.y = pos.rotY;
    group.add(rim);
  });
}

/**
 * Build shuttered storefront walls around the perimeter.
 * Metal security gates pulled down over dark store openings.
 * Gates rattle with audio transients (vertex displacement in update).
 */
function buildStorefronts(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { gateMeshes: THREE.Mesh[] } {
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.storefrontFrame,
    roughness: 0.7,
    metalness: 0.2,
  });
  const gateMat = new THREE.MeshStandardMaterial({
    color: PALETTE.securityGate,
    roughness: 0.4,
    metalness: 0.7,
  });
  const darkMat = new THREE.MeshBasicMaterial({
    color: PALETTE.securityGateDark,
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: PALETTE.storefrontSign,
    roughness: 0.6,
    metalness: 0.1,
    emissive: PALETTE.storefrontSign,
    emissiveIntensity: 0.05,
  });
  materials.push(frameMat, gateMat, darkMat, signMat);

  const gateMeshes: THREE.Mesh[] = [];

  // Storefront dimensions
  const storeW = 3.0;         // Width of each storefront opening
  const storeH = 3.5;         // Height of storefront opening
  const gateSegX = 16;        // Gate mesh subdivision for displacement
  const gateSegY = 8;

  const gateGeo = new THREE.PlaneGeometry(storeW - 0.2, storeH - 0.2, gateSegX, gateSegY);
  const darkGeo = new THREE.PlaneGeometry(storeW - 0.1, storeH - 0.1);
  const frameTopGeo = new THREE.BoxGeometry(storeW + 0.2, 0.15, 0.15);
  const frameSideGeo = new THREE.BoxGeometry(0.15, storeH + 0.1, 0.15);
  const signGeo = new THREE.BoxGeometry(storeW * 0.8, 0.4, 0.05);
  geometries.push(gateGeo, darkGeo, frameTopGeo, frameSideGeo, signGeo);

  // Place storefronts along all 4 walls (below mezzanine level)
  // North wall (z = -15): 8 storefronts
  for (let i = 0; i < 8; i++) {
    const x = -13 + i * 3.5;
    buildSingleStorefront(
      group, gateMeshes, gateGeo, darkGeo, frameTopGeo, frameSideGeo, signGeo,
      frameMat, gateMat, darkMat, signMat,
      x, -HALF_D + 0.08, 0, storeW, storeH
    );
  }

  // South wall (z = +15): 8 storefronts
  for (let i = 0; i < 8; i++) {
    const x = -13 + i * 3.5;
    buildSingleStorefront(
      group, gateMeshes, gateGeo, darkGeo, frameTopGeo, frameSideGeo, signGeo,
      frameMat, gateMat, darkMat, signMat,
      x, HALF_D - 0.08, Math.PI, storeW, storeH
    );
  }

  // East wall (x = +15): 6 storefronts (leaving gap for exit)
  for (let i = 0; i < 6; i++) {
    const z = -10 + i * 3.5;
    // Skip the exit area (around z = 0)
    if (Math.abs(z) < 3) continue;
    buildSingleStorefront(
      group, gateMeshes, gateGeo, darkGeo, frameTopGeo, frameSideGeo, signGeo,
      frameMat, gateMat, darkMat, signMat,
      HALF_W - 0.08, z, -Math.PI / 2, storeW, storeH
    );
  }

  // West wall (x = -15): 8 storefronts
  for (let i = 0; i < 8; i++) {
    const z = -13 + i * 3.5;
    buildSingleStorefront(
      group, gateMeshes, gateGeo, darkGeo, frameTopGeo, frameSideGeo, signGeo,
      frameMat, gateMat, darkMat, signMat,
      -HALF_W + 0.08, z, Math.PI / 2, storeW, storeH
    );
  }

  return { gateMeshes };
}

/** Build a single storefront with frame, dark void, and security gate */
function buildSingleStorefront(
  group: THREE.Group,
  gateMeshes: THREE.Mesh[],
  gateGeo: THREE.BufferGeometry,
  darkGeo: THREE.BufferGeometry,
  frameTopGeo: THREE.BufferGeometry,
  frameSideGeo: THREE.BufferGeometry,
  signGeo: THREE.BufferGeometry,
  frameMat: THREE.Material,
  gateMat: THREE.Material,
  darkMat: THREE.Material,
  signMat: THREE.Material,
  x: number, z: number, rotY: number,
  storeW: number, storeH: number
): void {
  const perpX = Math.sin(rotY);
  const perpZ = Math.cos(rotY);
  const insetDist = 0.05;

  // Dark void behind gate (background)
  const dark = new THREE.Mesh(darkGeo, darkMat);
  dark.position.set(
    x - perpX * insetDist,
    storeH / 2,
    z - perpZ * insetDist
  );
  dark.rotation.y = rotY;
  group.add(dark);

  // Security gate (foreground) — subdivided for vertex displacement
  const gate = new THREE.Mesh(gateGeo.clone(), gateMat);
  gate.position.set(
    x + perpX * 0.02,
    storeH / 2,
    z + perpZ * 0.02
  );
  gate.rotation.y = rotY;
  gate.userData.isSecurityGate = true;
  group.add(gate);
  gateMeshes.push(gate);

  // Frame — top and sides
  const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
  frameTop.position.set(x, storeH + 0.08, z);
  frameTop.rotation.y = rotY;
  group.add(frameTop);

  const frameSideL = new THREE.Mesh(frameSideGeo, frameMat);
  frameSideL.position.set(
    x - perpZ * (storeW / 2 + 0.08),
    storeH / 2,
    z + perpX * (storeW / 2 + 0.08)
  );
  frameSideL.rotation.y = rotY;
  group.add(frameSideL);

  const frameSideR = new THREE.Mesh(frameSideGeo, frameMat);
  frameSideR.position.set(
    x + perpZ * (storeW / 2 + 0.08),
    storeH / 2,
    z - perpX * (storeW / 2 + 0.08)
  );
  frameSideR.rotation.y = rotY;
  group.add(frameSideR);

  // Faded sign above storefront
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(
    x + perpX * 0.03,
    storeH + 0.4,
    z + perpZ * 0.03
  );
  sign.rotation.y = rotY;
  group.add(sign);
}

/**
 * Build mezzanine balcony ring — a walkway at 5m height running along
 * all 4 walls, with railing facing the atrium center.
 * Visible but unreachable.
 */
function buildMezzanine(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const deckMat = createMezzanineMaterial(seed);
  materials.push(deckMat);

  const railMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mezzanineRail,
    roughness: 0.4,
    metalness: 0.6,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mezzanineEdge,
    roughness: 0.7,
    metalness: 0.2,
  });
  materials.push(railMat, edgeMat);

  // Build 4 mezzanine sections (one per wall)
  const mezzSections = [
    // North section (z = -15 to z = -12)
    { x: 0, z: -HALF_D + MEZZ_DEPTH / 2, w: WIDTH, d: MEZZ_DEPTH, railZ: -HALF_D + MEZZ_DEPTH, railDir: 'z' as const },
    // South section
    { x: 0, z: HALF_D - MEZZ_DEPTH / 2, w: WIDTH, d: MEZZ_DEPTH, railZ: HALF_D - MEZZ_DEPTH, railDir: 'z' as const },
    // East section (inner part, excluding corners already covered)
    { x: HALF_W - MEZZ_DEPTH / 2, z: 0, w: MEZZ_DEPTH, d: DEPTH - MEZZ_DEPTH * 2, railZ: HALF_W - MEZZ_DEPTH, railDir: 'x' as const },
    // West section
    { x: -HALF_W + MEZZ_DEPTH / 2, z: 0, w: MEZZ_DEPTH, d: DEPTH - MEZZ_DEPTH * 2, railZ: -HALF_W + MEZZ_DEPTH, railDir: 'x' as const },
  ];

  mezzSections.forEach((section) => {
    // Deck surface
    const deckGeo = new THREE.PlaneGeometry(section.w, section.d, 4, 2);
    applyUVMapping(deckGeo, section.w, section.d);
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.rotation.x = -Math.PI / 2;
    deckMesh.position.set(section.x, MEZZ_HEIGHT, section.z);
    deckMesh.receiveShadow = true;
    group.add(deckMesh);
    geometries.push(deckGeo);

    // Deck underside (visible from ground)
    const undersideGeo = new THREE.PlaneGeometry(section.w, section.d, 2, 2);
    const undersideMesh = new THREE.Mesh(undersideGeo, edgeMat);
    undersideMesh.rotation.x = Math.PI / 2;
    undersideMesh.position.set(section.x, MEZZ_HEIGHT - MEZZ_THICKNESS, section.z);
    group.add(undersideMesh);
    geometries.push(undersideGeo);

    // Edge fascia (vertical face along inner edge)
    let fasciaGeo: THREE.BufferGeometry;
    let fasciaX = section.x;
    let fasciaZ = section.z;

    if (section.railDir === 'z') {
      fasciaGeo = new THREE.PlaneGeometry(section.w, MEZZ_THICKNESS, 4, 1);
      fasciaZ = section.railZ;
    } else {
      fasciaGeo = new THREE.PlaneGeometry(section.d, MEZZ_THICKNESS, 4, 1);
      fasciaX = section.railZ;
    }
    const fascia = new THREE.Mesh(fasciaGeo, edgeMat);
    fascia.position.set(fasciaX, MEZZ_HEIGHT - MEZZ_THICKNESS / 2, fasciaZ);
    if (section.railDir === 'x') {
      fascia.rotation.y = Math.PI / 2;
    }
    // Face inward toward atrium
    if ((section.railDir === 'z' && section.z > 0) ||
        (section.railDir === 'x' && section.x > 0)) {
      fascia.rotation.y += Math.PI;
    }
    group.add(fascia);
    geometries.push(fasciaGeo);
  });

  // Railing along mezzanine inner edge
  const railPostGeo = new THREE.CylinderGeometry(0.03, 0.03, MEZZ_RAIL_HEIGHT, 6);
  const railBarGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
  geometries.push(railPostGeo, railBarGeo);

  // North railing
  buildRailingRun(group, railPostGeo, railBarGeo, railMat,
    -HALF_W + MEZZ_DEPTH, -HALF_D + MEZZ_DEPTH,
    HALF_W - MEZZ_DEPTH, -HALF_D + MEZZ_DEPTH,
    MEZZ_HEIGHT, 'x');

  // South railing
  buildRailingRun(group, railPostGeo, railBarGeo, railMat,
    -HALF_W + MEZZ_DEPTH, HALF_D - MEZZ_DEPTH,
    HALF_W - MEZZ_DEPTH, HALF_D - MEZZ_DEPTH,
    MEZZ_HEIGHT, 'x');

  // East railing
  buildRailingRun(group, railPostGeo, railBarGeo, railMat,
    HALF_W - MEZZ_DEPTH, -HALF_D + MEZZ_DEPTH,
    HALF_W - MEZZ_DEPTH, HALF_D - MEZZ_DEPTH,
    MEZZ_HEIGHT, 'z');

  // West railing
  buildRailingRun(group, railPostGeo, railBarGeo, railMat,
    -HALF_W + MEZZ_DEPTH, -HALF_D + MEZZ_DEPTH,
    -HALF_W + MEZZ_DEPTH, HALF_D - MEZZ_DEPTH,
    MEZZ_HEIGHT, 'z');
}

/** Build a run of railing posts and top bar */
function buildRailingRun(
  group: THREE.Group,
  postGeo: THREE.BufferGeometry,
  _barGeo: THREE.BufferGeometry,
  railMat: THREE.Material,
  x1: number, z1: number,
  x2: number, z2: number,
  baseY: number,
  axis: 'x' | 'z'
): void {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const postCount = Math.max(2, Math.floor(length / 2));

  for (let i = 0; i <= postCount; i++) {
    const t = i / postCount;
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(
      x1 + dx * t,
      baseY + MEZZ_RAIL_HEIGHT / 2,
      z1 + dz * t
    );
    group.add(post);
  }

  // Top rail bar (continuous)
  const topRailGeo = new THREE.CylinderGeometry(0.035, 0.035, length, 8);
  const topRail = new THREE.Mesh(topRailGeo, railMat);
  topRail.position.set(
    (x1 + x2) / 2,
    baseY + MEZZ_RAIL_HEIGHT,
    (z1 + z2) / 2
  );
  if (axis === 'x') {
    topRail.rotation.z = Math.PI / 2;
  } else {
    topRail.rotation.x = Math.PI / 2;
  }
  group.add(topRail);
}

/**
 * Build broken escalators at two corners — non-functional, frozen in place.
 * Visible from ground level, connecting to the mezzanine.
 */
function buildBrokenEscalators(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const metalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.escalatorMetal,
    roughness: 0.3,
    metalness: 0.7,
  });
  const stepMat = new THREE.MeshStandardMaterial({
    color: PALETTE.escalatorStep,
    roughness: 0.5,
    metalness: 0.5,
  });
  const rubberMat = new THREE.MeshStandardMaterial({
    color: PALETTE.escalatorRubber,
    roughness: 0.9,
    metalness: 0.0,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: PALETTE.escalatorBase,
    roughness: 0.6,
    metalness: 0.4,
  });
  materials.push(metalMat, stepMat, rubberMat, baseMat);

  // Escalator at NW corner
  buildSingleEscalator(
    group, geometries, metalMat, stepMat, rubberMat, baseMat,
    -12, -12, Math.PI / 4
  );

  // Escalator at SE corner
  buildSingleEscalator(
    group, geometries, metalMat, stepMat, rubberMat, baseMat,
    12, 12, -Math.PI * 3 / 4
  );
}

/** Build a single broken escalator */
function buildSingleEscalator(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  metalMat: THREE.Material,
  stepMat: THREE.Material,
  rubberMat: THREE.Material,
  baseMat: THREE.Material,
  x: number, z: number, rotY: number
): void {
  const escalatorGroup = new THREE.Group();

  // Main body — angled box from floor to mezzanine level
  const escLength = 7; // Diagonal length
  const escWidth = 1.2;
  const angle = Math.atan2(MEZZ_HEIGHT, escLength * Math.cos(Math.atan2(MEZZ_HEIGHT, 5)));

  // Side panels (two angled walls)
  const sidePanelGeo = new THREE.BoxGeometry(0.08, 1.2, escLength);
  geometries.push(sidePanelGeo);

  const leftPanel = new THREE.Mesh(sidePanelGeo, metalMat);
  leftPanel.position.set(-escWidth / 2, MEZZ_HEIGHT / 2, 0);
  leftPanel.rotation.x = -angle * 0.5;
  escalatorGroup.add(leftPanel);

  const rightPanel = new THREE.Mesh(sidePanelGeo, metalMat);
  rightPanel.position.set(escWidth / 2, MEZZ_HEIGHT / 2, 0);
  rightPanel.rotation.x = -angle * 0.5;
  escalatorGroup.add(rightPanel);

  // Steps — series of small boxes along the escalator surface
  const stepCount = 12;
  const stepW = escWidth - 0.2;
  const stepH = 0.06;
  const stepD = 0.35;
  const stepGeo = new THREE.BoxGeometry(stepW, stepH, stepD);
  geometries.push(stepGeo);

  for (let i = 0; i < stepCount; i++) {
    const t = i / (stepCount - 1);
    const stepMesh = new THREE.Mesh(stepGeo, stepMat);
    stepMesh.position.set(
      0,
      t * MEZZ_HEIGHT + 0.1,
      -escLength / 2 + t * escLength * 0.7
    );
    escalatorGroup.add(stepMesh);
  }

  // Rubber handrails on each side
  const handrailGeo = new THREE.CylinderGeometry(0.04, 0.04, escLength * 0.85, 8);
  geometries.push(handrailGeo);

  const leftHandrail = new THREE.Mesh(handrailGeo, rubberMat);
  leftHandrail.position.set(-escWidth / 2 - 0.05, MEZZ_HEIGHT / 2 + 0.5, 0);
  leftHandrail.rotation.x = -angle * 0.5;
  escalatorGroup.add(leftHandrail);

  const rightHandrail = new THREE.Mesh(handrailGeo, rubberMat);
  rightHandrail.position.set(escWidth / 2 + 0.05, MEZZ_HEIGHT / 2 + 0.5, 0);
  rightHandrail.rotation.x = -angle * 0.5;
  escalatorGroup.add(rightHandrail);

  // Base housing at floor level
  const baseGeo = new THREE.BoxGeometry(escWidth + 0.3, 0.4, 2.0);
  geometries.push(baseGeo);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.2, -escLength / 2 + 0.5);
  escalatorGroup.add(base);

  // Top platform connecting to mezzanine
  const topPlatGeo = new THREE.BoxGeometry(escWidth + 0.3, 0.15, 1.5);
  geometries.push(topPlatGeo);
  const topPlat = new THREE.Mesh(topPlatGeo, baseMat);
  topPlat.position.set(0, MEZZ_HEIGHT - 0.08, escLength / 2 - 1.0);
  escalatorGroup.add(topPlat);

  // "OUT OF ORDER" sign effect — small red box on the base
  const signMat = new THREE.MeshStandardMaterial({
    color: '#cc3333',
    emissive: '#cc3333',
    emissiveIntensity: 0.1,
    roughness: 0.5,
  });
  const signGeo = new THREE.BoxGeometry(0.5, 0.15, 0.02);
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 0.5, -escLength / 2 + 0.2);
  escalatorGroup.add(sign);
  geometries.push(signGeo);

  escalatorGroup.position.set(x, 0, z);
  escalatorGroup.rotation.y = rotY;
  group.add(escalatorGroup);
}

/**
 * Build sodium-vapor emergency lighting.
 * Orange-tinted point lights that cast the entire atrium in amber haze.
 */
function buildLighting(
  group: THREE.Group
): { sodiumLights: THREE.PointLight[] } {
  const sodiumLights: THREE.PointLight[] = [];

  // 4 corner sodium-vapor lights (high up, broad coverage)
  const cornerPositions = [
    { x: -10, z: -10 },
    { x: 10, z: -10 },
    { x: -10, z: 10 },
    { x: 10, z: 10 },
  ];

  cornerPositions.forEach((pos) => {
    const light = new THREE.PointLight(PALETTE.sodiumVapor, 0.4, 15, 1.5);
    light.position.set(pos.x, 9, pos.z);
    group.add(light);
    sodiumLights.push(light);
  });

  // 4 mid-wall sodium lights (lower, supplementary)
  const midPositions = [
    { x: 0, z: -14 },
    { x: 0, z: 14 },
    { x: -14, z: 0 },
    { x: 14, z: 0 },
  ];

  midPositions.forEach((pos) => {
    const light = new THREE.PointLight(PALETTE.sodiumVaporDim, 0.25, 12, 1.5);
    light.position.set(pos.x, 7, pos.z);
    group.add(light);
    sodiumLights.push(light);
  });

  // Mezzanine under-lighting — faint lights under the mezzanine deck
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const r = 13;
    const light = new THREE.PointLight(PALETTE.sodiumVaporDim, 0.1, 5, 2);
    light.position.set(Math.cos(angle) * r, MEZZ_HEIGHT - 0.5, Math.sin(angle) * r);
    group.add(light);
    sodiumLights.push(light);
  }

  // Dim ambient fill — never pitch black
  const ambient = new THREE.AmbientLight(PALETTE.sodiumVaporDim, 0.06);
  group.add(ambient);

  return { sodiumLights };
}

/**
 * Build exit doorway glow at east wall.
 */
function buildExitGlow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  const glowGeo = new THREE.PlaneGeometry(4, 4);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlow,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.set(HALF_W + 0.1, 2, 0);
  glowMesh.rotation.y = -Math.PI / 2;
  group.add(glowMesh);
  geometries.push(glowGeo);
  materials.push(glowMat);

  const exitLight = new THREE.PointLight(PALETTE.exitGlow, 0.25, 8, 1.5);
  exitLight.position.set(HALF_W - 0.5, 2, 0);
  group.add(exitLight);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface MallAtriumRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Sunken Mall Atrium scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildMallAtrium(seed: number = 126): MallAtriumRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  const { fountainGlowLight, fountainBasinMeshes } = buildFountain(group, geometries, materials, seed);
  buildPlanters(group, geometries, materials);
  const { gateMeshes } = buildStorefronts(group, geometries, materials);
  buildMezzanine(group, geometries, materials, seed);
  buildBrokenEscalators(group, geometries, materials);
  const { sodiumLights } = buildLighting(group);
  buildExitGlow(group, geometries, materials);

  // Store original gate vertex positions for transient displacement
  const gateOriginalPositions: Float32Array[] = gateMeshes.map((gate) => {
    const pos = gate.geometry.getAttribute('position');
    return new Float32Array(pos.array);
  });

  let elapsedTime = 0;

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

      // --- Fountain basin glows with bass ---
      // The dead fountain's basin floor emits a ghostly glow that
      // pulses with bass frequencies — the heart of the dead mall
      // still beats faintly to the rhythm of sound.
      const bassLevel = audioData.bass || 0;
      fountainGlowLight.intensity = 0.1 + bassLevel * 0.5;
      fountainGlowLight.color.setHex(
        bassLevel > 0.5 ? 0x88ccee : 0x66aacc
      );

      // Fountain basin mesh emissive glow
      for (const basinMesh of fountainBasinMeshes) {
        if (basinMesh.material instanceof THREE.ShaderMaterial) {
          // Shader materials handle their own audio reactivity
        }
      }

      // --- Security gates rattle with transients ---
      // On audio transients, the metal security gates shudder with
      // subtle vertex displacement — as if something just passed
      // behind them, or the building itself shuddered.
      const transientLevel = audioData.transient || 0;
      const hasTransient = transientLevel > 0.3;

      gateMeshes.forEach((gate, gateIdx) => {
        const posAttr = gate.geometry.getAttribute('position');
        const positions = posAttr.array as Float32Array;
        const originals = gateOriginalPositions[gateIdx];

        if (hasTransient) {
          // Rattle: random Z-axis displacement on gate vertices
          const rattleIntensity = transientLevel * 0.04;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] = originals[i] + (Math.random() - 0.5) * rattleIntensity;
            positions[i + 1] = originals[i + 1] + (Math.random() - 0.5) * rattleIntensity * 0.5;
            positions[i + 2] = originals[i + 2] + (Math.random() - 0.5) * rattleIntensity;
          }
          posAttr.needsUpdate = true;
        } else {
          // Settle back to original positions (with slight decay)
          let needsUpdate = false;
          for (let i = 0; i < positions.length; i += 3) {
            const dx = positions[i] - originals[i];
            const dy = positions[i + 1] - originals[i + 1];
            const dz = positions[i + 2] - originals[i + 2];
            if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001 || Math.abs(dz) > 0.0001) {
              positions[i] = originals[i] + dx * 0.9;
              positions[i + 1] = originals[i + 1] + dy * 0.9;
              positions[i + 2] = originals[i + 2] + dz * 0.9;
              needsUpdate = true;
            }
          }
          if (needsUpdate) posAttr.needsUpdate = true;
        }
      });

      // --- Sodium-vapor lights pulse subtly with mid frequencies ---
      // The emergency lighting breathes with audio mid frequencies,
      // creating a slow, amber-hued pulsation through the dead mall.
      const midLevel = audioData.mid || 0;
      sodiumLights.forEach((light, i) => {
        const baseIntensity = i < 4 ? 0.4 : (i < 8 ? 0.25 : 0.1);
        light.intensity = baseIntensity + midLevel * 0.15;

        // Occasional flicker on transients for edge lights
        if (hasTransient && i >= 8 && i === Math.floor(elapsedTime * 3) % sodiumLights.length) {
          light.intensity *= 0.4;
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
 * Get the CuratedRoom template data for the Sunken Mall Atrium.
 */
export { getCuratedTemplate } from '../RoomTemplates';
