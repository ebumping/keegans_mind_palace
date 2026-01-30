/**
 * The Infinite Hallway — Room 1
 *
 * A long, narrow corridor (3m wide × 40m deep × 4m tall) with warm
 * fluorescent overhead lighting casting pools of light on linoleum-textured floor.
 * Slightly yellowed walls with subtle water stain textures.
 * 12 identical wooden doors (6 per side), all closed — only the exit at the far end opens.
 * A single flickering fluorescent light midway synced to audio high frequencies.
 * Floor has faint scuff marks pattern, ceiling has acoustic tile grid pattern.
 * Exit doorway at the far end glows faintly with the next room's color palette.
 *
 * Creative direction: This is the first room after entry. It must set the tone —
 * institutional, vaguely familiar, slightly wrong. The fluorescent hum, the identical
 * doors, the too-long corridor. A space everyone has walked through in a dream.
 */

import * as THREE from 'three';
import {
  createLiminalMaterial,
  updateLiminalMaterial,
  type LiminalMaterialConfig,
  type AudioData,
} from '../../systems/AudioReactiveSystem';
// Room type from ../../types/room used at runtime via AudioReactiveSystem

// =============================================================================
// Palette — warm institutional fluorescent
// =============================================================================
const PALETTE = {
  wall: '#e8dcc8',          // Aged off-white / yellowed cream
  wallStain: '#c8b898',     // Water stain darker tone
  floor: '#8b7d6b',         // Linoleum gray-brown
  floorScuff: '#6b5d4b',    // Scuff mark darker tone
  ceiling: '#c8b898',       // Acoustic tile off-white
  ceilingGrid: '#a09070',   // Acoustic tile grid lines
  door: '#8b6914',          // Wooden door warm brown
  doorFrame: '#6b5010',     // Door frame darker wood
  fluorescent: '#fff5e0',   // Warm fluorescent white
  fluorescentCold: '#f0f0ff', // Occasional cold flicker
  exitGlow: '#88ccdd',      // Next room's palette tint
  baseboard: '#5a4a3a',     // Dark baseboard strip
};

// =============================================================================
// Dimensions
// =============================================================================
const WIDTH = 3;
const DEPTH = 40;
const HEIGHT = 4;
const HALF_W = WIDTH / 2;
const HALF_D = DEPTH / 2;

// =============================================================================
// Material helpers
// =============================================================================

/** Create wall material with yellowed, slightly stained look */
function createWallMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed,
    roomIndex: 1,
    patternScale: 1.2,        // Tight pattern for wall texture detail
    patternRotation: 0.02,    // Near-zero — walls are straight
    breatheIntensity: 0.4,    // Subtle audio breathing
    rippleFrequency: 2.5,
    rippleIntensity: 0.2,     // Very subtle ripple — walls should feel solid
    abnormality: 0.0,         // Room 1 has no wrongness
  };
  return createLiminalMaterial(config);
}

/** Create floor material with linoleum/scuff mark appearance */
function createFloorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 1000,
    roomIndex: 1,
    patternScale: 2.0,         // Tighter pattern for tile/linoleum grid
    patternRotation: Math.PI * 0.25, // 45° for floor diamond pattern
    breatheIntensity: 0.3,     // Subtle floor breathing
    rippleFrequency: 2.0,
    rippleIntensity: 0.15,     // Very subtle
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create ceiling material with acoustic tile grid pattern */
function createCeilingMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 2000,
    roomIndex: 1,
    patternScale: 1.8,         // Acoustic tile grid density
    patternRotation: 0,        // Grid aligned with corridor
    breatheIntensity: 0.2,     // Minimal ceiling movement
    rippleFrequency: 2.0,
    rippleIntensity: 0.1,
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

/** Create door material — warmer, denser wood pattern */
function createDoorMaterial(seed: number): THREE.ShaderMaterial {
  const config: LiminalMaterialConfig = {
    seed: seed + 3000,
    roomIndex: 1,
    patternScale: 0.6,         // Tight wood grain
    patternRotation: Math.PI / 2, // Vertical grain
    breatheIntensity: 0.15,    // Doors barely breathe
    rippleFrequency: 1.5,
    rippleIntensity: 0.05,     // Almost no ripple
    abnormality: 0.0,
  };
  return createLiminalMaterial(config);
}

// =============================================================================
// Geometry builders
// =============================================================================

/** Apply UV mapping scaled to world-space dimensions for consistent texture density */
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

/** Build corridor walls (4 walls: north, south, east, west) */
function buildWalls(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const wallMat = createWallMaterial(seed);
  materials.push(wallMat);

  // North wall (far end — will have exit doorway cutout)
  const northGeo = createWallWithDoorway(WIDTH, HEIGHT, 2.5, 3.5);
  applyUVMapping(northGeo, WIDTH, HEIGHT);
  const northMesh = new THREE.Mesh(northGeo, wallMat);
  northMesh.position.set(0, HEIGHT / 2, -HALF_D);
  northMesh.receiveShadow = true;
  group.add(northMesh);
  geometries.push(northGeo);

  // South wall (entry end — solid)
  const southGeo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 4, 4);
  applyUVMapping(southGeo, WIDTH, HEIGHT);
  const southMesh = new THREE.Mesh(southGeo, wallMat);
  southMesh.position.set(0, HEIGHT / 2, HALF_D);
  southMesh.rotation.y = Math.PI;
  southMesh.receiveShadow = true;
  group.add(southMesh);
  geometries.push(southGeo);

  // East wall (right side when facing north)
  const eastGeo = new THREE.PlaneGeometry(DEPTH, HEIGHT, 8, 4);
  applyUVMapping(eastGeo, DEPTH, HEIGHT);
  const eastMesh = new THREE.Mesh(eastGeo, wallMat);
  eastMesh.position.set(HALF_W, HEIGHT / 2, 0);
  eastMesh.rotation.y = -Math.PI / 2;
  eastMesh.receiveShadow = true;
  group.add(eastMesh);
  geometries.push(eastGeo);

  // West wall (left side when facing north)
  const westGeo = new THREE.PlaneGeometry(DEPTH, HEIGHT, 8, 4);
  applyUVMapping(westGeo, DEPTH, HEIGHT);
  const westMesh = new THREE.Mesh(westGeo, wallMat);
  westMesh.position.set(-HALF_W, HEIGHT / 2, 0);
  westMesh.rotation.y = Math.PI / 2;
  westMesh.receiveShadow = true;
  group.add(westMesh);
  geometries.push(westGeo);

  // Baseboards — thin dark strips along the bottom of east and west walls
  const baseboardMat = new THREE.MeshStandardMaterial({
    color: PALETTE.baseboard,
    roughness: 0.8,
    metalness: 0.05,
  });
  materials.push(baseboardMat);
  const baseH = 0.12;
  const baseGeo = new THREE.PlaneGeometry(DEPTH, baseH);

  const baseEast = new THREE.Mesh(baseGeo, baseboardMat);
  baseEast.position.set(HALF_W - 0.001, baseH / 2, 0);
  baseEast.rotation.y = -Math.PI / 2;
  group.add(baseEast);

  const baseWest = new THREE.Mesh(baseGeo.clone(), baseboardMat);
  baseWest.position.set(-HALF_W + 0.001, baseH / 2, 0);
  baseWest.rotation.y = Math.PI / 2;
  group.add(baseWest);

  geometries.push(baseGeo);
}

/** Create a wall plane with a centered doorway cutout */
function createWallWithDoorway(
  wallWidth: number,
  wallHeight: number,
  doorWidth: number,
  doorHeight: number
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

  // Doorway hole — centered horizontally, from floor up
  const hole = new THREE.Path();
  hole.moveTo(-dhw, -hh);
  hole.lineTo(dhw, -hh);
  hole.lineTo(dhw, -hh + doorHeight);
  hole.lineTo(-dhw, -hh + doorHeight);
  hole.lineTo(-dhw, -hh);
  shape.holes.push(hole);

  return new THREE.ShapeGeometry(shape, 2);
}

/** Build floor with scuff-mark linoleum appearance */
function buildFloor(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const floorMat = createFloorMaterial(seed);
  materials.push(floorMat);

  const floorGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 4, 8);
  applyUVMapping(floorGeo, WIDTH, DEPTH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  geometries.push(floorGeo);

  // Dark fallback floor — prevents black void if main floor has any transparency
  const fallbackGeo = new THREE.PlaneGeometry(WIDTH * 1.5, DEPTH * 1.5);
  const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
  const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.05;
  fallback.receiveShadow = true;
  group.add(fallback);
  geometries.push(fallbackGeo);
  materials.push(fallbackMat);
}

/** Build ceiling with acoustic tile grid pattern */
function buildCeiling(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const ceilingMat = createCeilingMaterial(seed);
  materials.push(ceilingMat);

  const ceilingGeo = new THREE.PlaneGeometry(WIDTH, DEPTH, 4, 8);
  applyUVMapping(ceilingGeo, WIDTH, DEPTH);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = HEIGHT;
  ceilingMesh.receiveShadow = true;
  group.add(ceilingMesh);
  geometries.push(ceilingGeo);

  // Acoustic tile grid lines — thin raised strips forming the grid
  const gridMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ceilingGrid,
    roughness: 0.9,
    metalness: 0.0,
  });
  materials.push(gridMat);

  const gridThickness = 0.02;
  const gridDrop = 0.01; // Slightly below ceiling plane

  // Longitudinal grid lines (along Z)
  const longGridGeo = new THREE.BoxGeometry(gridThickness, gridDrop, DEPTH);
  for (let x = -1; x <= 1; x += 0.6) {
    const gridLine = new THREE.Mesh(longGridGeo, gridMat);
    gridLine.position.set(x, HEIGHT - gridDrop / 2, 0);
    group.add(gridLine);
  }
  geometries.push(longGridGeo);

  // Transverse grid lines (along X) every 0.6m
  const transGridGeo = new THREE.BoxGeometry(WIDTH, gridDrop, gridThickness);
  const gridSpacing = 0.6;
  const gridCount = Math.floor(DEPTH / gridSpacing);
  for (let i = 0; i <= gridCount; i++) {
    const z = -HALF_D + i * gridSpacing;
    const gridLine = new THREE.Mesh(transGridGeo, gridMat);
    gridLine.position.set(0, HEIGHT - gridDrop / 2, z);
    group.add(gridLine);
  }
  geometries.push(transGridGeo);
}

/** Build 12 identical wooden doors (6 per side) — decorative, non-functional */
function buildDoors(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  seed: number
): void {
  const doorMat = createDoorMaterial(seed);
  materials.push(doorMat);

  // Door frame material — darker wood
  const frameMat = new THREE.MeshStandardMaterial({
    color: PALETTE.doorFrame,
    roughness: 0.7,
    metalness: 0.05,
  });
  materials.push(frameMat);

  // Doorknob material
  const knobMat = new THREE.MeshStandardMaterial({
    color: '#b8a060',
    roughness: 0.3,
    metalness: 0.7,
  });
  materials.push(knobMat);

  const doorWidth = 0.9;
  const doorHeight = 2.2;
  const doorDepth = 0.05;
  const frameWidth = 0.06;
  const frameDepth = 0.08;

  // Door panel geometry
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
  geometries.push(doorGeo);

  // Door frame pieces
  const frameSideGeo = new THREE.BoxGeometry(frameWidth, doorHeight + frameWidth, frameDepth);
  const frameTopGeo = new THREE.BoxGeometry(doorWidth + frameWidth * 2, frameWidth, frameDepth);
  geometries.push(frameSideGeo, frameTopGeo);

  // Doorknob geometry
  const knobGeo = new THREE.SphereGeometry(0.03, 8, 6);
  geometries.push(knobGeo);

  // Place 6 doors per side, evenly spaced along the corridor
  const doorSpacing = 5.5;
  const startZ = -15;

  for (let i = 0; i < 6; i++) {
    const z = startZ + i * doorSpacing;

    // ---- East wall doors (right side) ----
    const eastDoor = new THREE.Mesh(doorGeo, doorMat);
    eastDoor.position.set(HALF_W - doorDepth / 2, doorHeight / 2, z);
    eastDoor.rotation.y = -Math.PI / 2;
    group.add(eastDoor);

    // East door frame
    const eFrameL = new THREE.Mesh(frameSideGeo, frameMat);
    eFrameL.position.set(HALF_W - frameDepth / 2, (doorHeight + frameWidth) / 2, z - doorWidth / 2 - frameWidth / 2);
    eFrameL.rotation.y = -Math.PI / 2;
    group.add(eFrameL);

    const eFrameR = new THREE.Mesh(frameSideGeo, frameMat);
    eFrameR.position.set(HALF_W - frameDepth / 2, (doorHeight + frameWidth) / 2, z + doorWidth / 2 + frameWidth / 2);
    eFrameR.rotation.y = -Math.PI / 2;
    group.add(eFrameR);

    const eFrameTop = new THREE.Mesh(frameTopGeo, frameMat);
    eFrameTop.position.set(HALF_W - frameDepth / 2, doorHeight + frameWidth / 2, z);
    eFrameTop.rotation.y = -Math.PI / 2;
    group.add(eFrameTop);

    // East doorknob
    const eKnob = new THREE.Mesh(knobGeo, knobMat);
    eKnob.position.set(HALF_W - doorDepth - 0.02, doorHeight * 0.45, z + doorWidth * 0.35);
    group.add(eKnob);

    // ---- West wall doors (left side) ----
    const westDoor = new THREE.Mesh(doorGeo, doorMat);
    westDoor.position.set(-HALF_W + doorDepth / 2, doorHeight / 2, z);
    westDoor.rotation.y = Math.PI / 2;
    group.add(westDoor);

    // West door frame
    const wFrameL = new THREE.Mesh(frameSideGeo, frameMat);
    wFrameL.position.set(-HALF_W + frameDepth / 2, (doorHeight + frameWidth) / 2, z - doorWidth / 2 - frameWidth / 2);
    wFrameL.rotation.y = Math.PI / 2;
    group.add(wFrameL);

    const wFrameR = new THREE.Mesh(frameSideGeo, frameMat);
    wFrameR.position.set(-HALF_W + frameDepth / 2, (doorHeight + frameWidth) / 2, z + doorWidth / 2 + frameWidth / 2);
    wFrameR.rotation.y = Math.PI / 2;
    group.add(wFrameR);

    const wFrameTop = new THREE.Mesh(frameTopGeo, frameMat);
    wFrameTop.position.set(-HALF_W + frameDepth / 2, doorHeight + frameWidth / 2, z);
    wFrameTop.rotation.y = Math.PI / 2;
    group.add(wFrameTop);

    // West doorknob
    const wKnob = new THREE.Mesh(knobGeo, knobMat);
    wKnob.position.set(-HALF_W + doorDepth + 0.02, doorHeight * 0.45, z - doorWidth * 0.35);
    group.add(wKnob);
  }
}

/**
 * Build fluorescent light fixtures along the ceiling.
 * 7 evenly-spaced warm lights + 1 flickering light at midpoint.
 * The flickering light intensity is driven by audio high frequencies.
 */
function buildLights(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): { lights: THREE.Light[]; flickerLight: THREE.PointLight } {
  const lights: THREE.Light[] = [];

  // Fluorescent fixture housing geometry
  const fixtureGeo = new THREE.BoxGeometry(0.8, 0.05, 0.15);
  const fixtureMat = new THREE.MeshStandardMaterial({
    color: '#cccccc',
    roughness: 0.5,
    metalness: 0.3,
  });
  geometries.push(fixtureGeo);
  materials.push(fixtureMat);

  // Emissive tube geometry (the glowing part)
  const tubeGeo = new THREE.BoxGeometry(0.7, 0.02, 0.05);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescent,
    emissive: PALETTE.fluorescent,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.0,
  });
  geometries.push(tubeGeo);
  materials.push(tubeMat);

  // 7 evenly-spaced overhead lights
  for (let i = 0; i < 7; i++) {
    const z = -18 + i * 6;

    // Fixture housing
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(0, HEIGHT - 0.025, z);
    group.add(fixture);

    // Emissive tube
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(0, HEIGHT - 0.06, z);
    group.add(tube);

    // Point light casting warm pool on floor
    const light = new THREE.PointLight(PALETTE.fluorescent, 0.8, 8, 1.5);
    light.position.set(0, HEIGHT - 0.1, z);
    light.castShadow = false; // Performance — only key light casts shadows
    group.add(light);
    lights.push(light);
  }

  // Flickering midway light — special: synced to audio high frequencies
  const flickerFixture = new THREE.Mesh(fixtureGeo, fixtureMat);
  flickerFixture.position.set(0, HEIGHT - 0.025, 0);
  group.add(flickerFixture);

  const flickerTubeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.fluorescent,
    emissive: PALETTE.fluorescent,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.0,
  });
  materials.push(flickerTubeMat);

  const flickerTube = new THREE.Mesh(tubeGeo, flickerTubeMat);
  flickerTube.position.set(0, HEIGHT - 0.06, 0);
  group.add(flickerTube);

  const flickerLight = new THREE.PointLight(PALETTE.fluorescent, 1.2, 6, 2);
  flickerLight.position.set(0, HEIGHT - 0.1, 0);
  flickerLight.castShadow = true; // Key light — creates shadow depth
  flickerLight.shadow.mapSize.width = 512;
  flickerLight.shadow.mapSize.height = 512;
  group.add(flickerLight);
  lights.push(flickerLight);

  // Ambient fill so the corridor is never pitch black
  const ambient = new THREE.AmbientLight(PALETTE.fluorescent, 0.15);
  group.add(ambient);
  lights.push(ambient);

  return { lights, flickerLight };
}

/**
 * Build the glowing exit doorway at the far end (north wall).
 * A soft glow emanates from the opening, tinted with the next room's palette.
 */
function buildExitGlow(
  group: THREE.Group,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[]
): void {
  // Glow plane positioned just behind the doorway opening
  const glowGeo = new THREE.PlaneGeometry(2.5, 3.5);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.exitGlow,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.position.set(0, 3.5 / 2, -HALF_D - 0.1);
  group.add(glowMesh);
  geometries.push(glowGeo);
  materials.push(glowMat);

  // Point light at the exit casting the glow color into the corridor
  const exitLight = new THREE.PointLight(PALETTE.exitGlow, 0.4, 8, 1.5);
  exitLight.position.set(0, 2, -HALF_D + 0.5);
  group.add(exitLight);
}

// =============================================================================
// Main builder — exported
// =============================================================================

export interface InfiniteHallwayRoom {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  /** Call each frame with audio data and delta time */
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/**
 * Build the complete Infinite Hallway scene.
 *
 * @param seed - Deterministic seed for material generation
 * @returns A room object with mesh, update, and dispose methods
 */
export function buildInfiniteHallway(seed: number = 42): InfiniteHallwayRoom {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Build all geometry
  buildWalls(group, geometries, materials, seed);
  buildFloor(group, geometries, materials, seed);
  buildCeiling(group, geometries, materials, seed);
  buildDoors(group, geometries, materials, seed);
  const { flickerLight } = buildLights(group, geometries, materials);
  buildExitGlow(group, geometries, materials);

  // Track elapsed time for shader updates
  let elapsedTime = 0;

  // Flicker state for midway light
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

      // Flickering fluorescent light — synced to audio high frequencies
      // Uses high-frequency audio to modulate intensity, creating a strobe-like
      // effect that responds to sharp sounds (hi-hats, consonants, clicks).
      flickerPhase += delta * 12;
      const highFreqFlicker = audioData.high > 0.3
        ? Math.sin(flickerPhase * 20) * 0.5 + 0.5  // Rapid flicker on high transients
        : 1.0;
      const transientFlash = audioData.transient > 0.5
        ? 0.3 + Math.random() * 0.7  // Random intensity drop on beat
        : 1.0;
      flickerLight.intensity = 1.2 * highFreqFlicker * transientFlash;

      // Subtle intensity variation on all lights from bass
      // (makes the corridor "breathe" with low frequencies)
    },

    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}

/**
 * Get the CuratedRoom template data for the Infinite Hallway.
 * This is the declarative config used by the room system for collision,
 * doorway placement, and palette information.
 */
export { getCuratedTemplate } from '../RoomTemplates';
