/**
 * Furniture Component
 *
 * Procedural furniture that tells stories through arrangement.
 *
 * Art Direction Principles:
 * - Chairs facing walls or corners
 * - Beds in wrong rooms (kitchen, hallway)
 * - Tables with items arranged for ritual
 * - Sofas for conversation with no conversants
 *
 * Wrongness Escalation:
 * - Level 1: Offset positions
 * - Level 2: Wrong orientations
 * - Level 3: Wrong rooms
 * - Level 4: Hostile arrangements (facing player)
 * - Level 5: Ceiling-mounted, gravity-defiant
 *
 * Every furniture piece MUST have collision mesh.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { SeededRandom } from '../utils/seededRandom';
import {
  FurnitureType,
  FurnitureIntent,
  type FurnitureConfig,
} from '../types/art';
import type { RoomDimensions, WrongnessConfig, RoomArchetype } from '../types/room';
import {
  generateFurnitureForRoom,
  FURNITURE_DIMENSIONS,
} from '../generators/FurnitureGenerator';
import { getCollisionManager } from '../systems/CollisionManager';

// Muted, liminal color palette
const COLORS = {
  wood: new THREE.Color('#5c4033'),
  woodDark: new THREE.Color('#3d2817'),
  fabric: new THREE.Color('#6b5b4f'),
  fabricFaded: new THREE.Color('#8a7f72'),
  metal: new THREE.Color('#4a4a4a'),
  glass: new THREE.Color('#88a0a8'),
  ceramic: new THREE.Color('#d4c9bc'),
  leather: new THREE.Color('#4a3728'),
};

// ============================================
// Furniture Geometry Generators
// ============================================

/**
 * Create chair geometry
 */
function createChairGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Seat
  const seat = new THREE.BoxGeometry(0.45, 0.05, 0.45);
  seat.translate(0, 0.45, 0);
  geometries.push(seat);

  // Backrest
  const backrest = new THREE.BoxGeometry(0.42, 0.4, 0.04);
  backrest.translate(0, 0.7, -0.2);
  geometries.push(backrest);

  // Legs
  const legPositions = [
    [-0.18, 0, -0.18],
    [0.18, 0, -0.18],
    [-0.18, 0, 0.18],
    [0.18, 0, 0.18],
  ];

  legPositions.forEach(([x, _, z]) => {
    const leg = new THREE.CylinderGeometry(0.02, 0.025, 0.45, 6);
    leg.translate(x, 0.225, z);
    geometries.push(leg);
  });

  return mergeGeometries(geometries);
}

/**
 * Create sofa geometry
 */
function createSofaGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Base/frame
  const base = new THREE.BoxGeometry(1.9, 0.15, 0.85);
  base.translate(0, 0.15, 0);
  geometries.push(base);

  // Seat cushion
  const seat = new THREE.BoxGeometry(1.8, 0.2, 0.7);
  seat.translate(0, 0.35, 0.05);
  geometries.push(seat);

  // Backrest
  const back = new THREE.BoxGeometry(1.8, 0.5, 0.15);
  back.translate(0, 0.55, -0.35);
  geometries.push(back);

  // Arms
  const armL = new THREE.BoxGeometry(0.12, 0.35, 0.75);
  armL.translate(-0.94, 0.4, 0);
  geometries.push(armL);

  const armR = new THREE.BoxGeometry(0.12, 0.35, 0.75);
  armR.translate(0.94, 0.4, 0);
  geometries.push(armR);

  // Legs (small)
  const legPositions = [
    [-0.85, 0, -0.35],
    [0.85, 0, -0.35],
    [-0.85, 0, 0.35],
    [0.85, 0, 0.35],
  ];

  legPositions.forEach(([x, _, z]) => {
    const leg = new THREE.CylinderGeometry(0.03, 0.035, 0.12, 6);
    leg.translate(x, 0.06, z);
    geometries.push(leg);
  });

  return mergeGeometries(geometries);
}

/**
 * Create table geometry
 */
function createTableGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Tabletop
  const top = new THREE.BoxGeometry(1.1, 0.04, 0.75);
  top.translate(0, 0.73, 0);
  geometries.push(top);

  // Legs
  const legPositions = [
    [-0.5, 0, -0.32],
    [0.5, 0, -0.32],
    [-0.5, 0, 0.32],
    [0.5, 0, 0.32],
  ];

  legPositions.forEach(([x, _, z]) => {
    const leg = new THREE.BoxGeometry(0.05, 0.71, 0.05);
    leg.translate(x, 0.355, z);
    geometries.push(leg);
  });

  // Subtle stretcher bars
  const stretcherFront = new THREE.BoxGeometry(0.9, 0.03, 0.03);
  stretcherFront.translate(0, 0.15, 0.32);
  geometries.push(stretcherFront);

  const stretcherBack = new THREE.BoxGeometry(0.9, 0.03, 0.03);
  stretcherBack.translate(0, 0.15, -0.32);
  geometries.push(stretcherBack);

  return mergeGeometries(geometries);
}

/**
 * Create bed geometry
 */
function createBedGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Frame base
  const frame = new THREE.BoxGeometry(1.35, 0.15, 1.95);
  frame.translate(0, 0.15, 0);
  geometries.push(frame);

  // Mattress
  const mattress = new THREE.BoxGeometry(1.3, 0.2, 1.85);
  mattress.translate(0, 0.35, 0);
  geometries.push(mattress);

  // Headboard
  const headboard = new THREE.BoxGeometry(1.35, 0.6, 0.06);
  headboard.translate(0, 0.55, -0.97);
  geometries.push(headboard);

  // Pillows
  const pillow1 = new THREE.BoxGeometry(0.5, 0.12, 0.35);
  pillow1.translate(-0.3, 0.51, -0.7);
  geometries.push(pillow1);

  const pillow2 = new THREE.BoxGeometry(0.5, 0.12, 0.35);
  pillow2.translate(0.3, 0.51, -0.7);
  geometries.push(pillow2);

  // Legs
  const legPositions = [
    [-0.6, 0, -0.9],
    [0.6, 0, -0.9],
    [-0.6, 0, 0.9],
    [0.6, 0, 0.9],
  ];

  legPositions.forEach(([x, _, z]) => {
    const leg = new THREE.CylinderGeometry(0.04, 0.045, 0.15, 6);
    leg.translate(x, 0.075, z);
    geometries.push(leg);
  });

  return mergeGeometries(geometries);
}

/**
 * Create desk geometry
 */
function createDeskGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Desktop
  const desktop = new THREE.BoxGeometry(1.15, 0.03, 0.55);
  desktop.translate(0, 0.73, 0);
  geometries.push(desktop);

  // Legs - slightly angled
  const legPositions = [
    [-0.52, 0, -0.22],
    [0.52, 0, -0.22],
    [-0.52, 0, 0.22],
    [0.52, 0, 0.22],
  ];

  legPositions.forEach(([x, _, z]) => {
    const leg = new THREE.BoxGeometry(0.04, 0.72, 0.04);
    leg.translate(x, 0.36, z);
    geometries.push(leg);
  });

  // Drawer unit (one side)
  const drawer = new THREE.BoxGeometry(0.35, 0.35, 0.45);
  drawer.translate(-0.38, 0.5, 0);
  geometries.push(drawer);

  return mergeGeometries(geometries);
}

/**
 * Create cabinet geometry
 */
function createCabinetGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Main body
  const body = new THREE.BoxGeometry(0.75, 1.7, 0.35);
  body.translate(0, 0.9, 0);
  geometries.push(body);

  // Doors (visual indentation)
  const doorLeft = new THREE.BoxGeometry(0.34, 1.5, 0.03);
  doorLeft.translate(-0.18, 0.9, 0.19);
  geometries.push(doorLeft);

  const doorRight = new THREE.BoxGeometry(0.34, 1.5, 0.03);
  doorRight.translate(0.18, 0.9, 0.19);
  geometries.push(doorRight);

  // Small legs/feet
  const footPositions = [
    [-0.32, 0, -0.12],
    [0.32, 0, -0.12],
    [-0.32, 0, 0.12],
    [0.32, 0, 0.12],
  ];

  footPositions.forEach(([x, _, z]) => {
    const foot = new THREE.BoxGeometry(0.06, 0.05, 0.06);
    foot.translate(x, 0.025, z);
    geometries.push(foot);
  });

  return mergeGeometries(geometries);
}

/**
 * Create lamp geometry
 */
function createLampGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Base
  const base = new THREE.CylinderGeometry(0.12, 0.14, 0.03, 12);
  base.translate(0, 0.015, 0);
  geometries.push(base);

  // Pole
  const pole = new THREE.CylinderGeometry(0.015, 0.02, 1.2, 8);
  pole.translate(0, 0.63, 0);
  geometries.push(pole);

  // Shade (cone)
  const shade = new THREE.ConeGeometry(0.2, 0.25, 16, 1, true);
  shade.rotateX(Math.PI);
  shade.translate(0, 1.35, 0);
  geometries.push(shade);

  return mergeGeometries(geometries);
}

/**
 * Create clock geometry (wall clock representation)
 */
function createClockGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Clock face
  const face = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24);
  face.rotateX(Math.PI / 2);
  geometries.push(face);

  // Frame ring
  const ring = new THREE.TorusGeometry(0.155, 0.015, 8, 24);
  ring.rotateX(Math.PI / 2);
  geometries.push(ring);

  // Hour hand (small)
  const hourHand = new THREE.BoxGeometry(0.02, 0.07, 0.01);
  hourHand.translate(0, 0.03, 0.025);
  geometries.push(hourHand);

  // Minute hand (long)
  const minuteHand = new THREE.BoxGeometry(0.015, 0.1, 0.01);
  minuteHand.rotateZ(Math.PI / 3);
  minuteHand.translate(0, 0.03, 0.027);
  geometries.push(minuteHand);

  return mergeGeometries(geometries);
}

/**
 * Create mirror geometry
 */
function createMirrorGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Frame
  const frame = new THREE.BoxGeometry(0.58, 1.15, 0.04);
  geometries.push(frame);

  // Mirror surface (slightly inset)
  const mirror = new THREE.BoxGeometry(0.5, 1.05, 0.01);
  mirror.translate(0, 0, 0.02);
  geometries.push(mirror);

  return mergeGeometries(geometries);
}

/**
 * Create plant geometry
 */
function createPlantGeometry(rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Pot
  const pot = new THREE.CylinderGeometry(0.12, 0.1, 0.2, 12);
  pot.translate(0, 0.1, 0);
  geometries.push(pot);

  // Soil
  const soil = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12);
  soil.translate(0, 0.21, 0);
  geometries.push(soil);

  // Foliage (multiple spheres for leaves)
  const leafCount = rng.int(4, 8);
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.SphereGeometry(0.08 + rng.range(0, 0.05), 8, 6);
    const angle = (i / leafCount) * Math.PI * 2;
    const radius = 0.08;
    const height = 0.35 + rng.range(0, 0.25);
    leaf.translate(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    geometries.push(leaf);
  }

  // Central stem
  const stem = new THREE.CylinderGeometry(0.02, 0.025, 0.35, 6);
  stem.translate(0, 0.38, 0);
  geometries.push(stem);

  return mergeGeometries(geometries);
}

/**
 * Create geometry based on furniture type
 */
function createFurnitureGeometry(type: FurnitureType, seed: number): THREE.BufferGeometry {
  const rng = new SeededRandom(seed);

  switch (type) {
    case FurnitureType.CHAIR:
      return createChairGeometry(rng);
    case FurnitureType.SOFA:
      return createSofaGeometry(rng);
    case FurnitureType.TABLE:
      return createTableGeometry(rng);
    case FurnitureType.BED:
      return createBedGeometry(rng);
    case FurnitureType.DESK:
      return createDeskGeometry(rng);
    case FurnitureType.CABINET:
      return createCabinetGeometry(rng);
    case FurnitureType.LAMP:
      return createLampGeometry(rng);
    case FurnitureType.CLOCK:
      return createClockGeometry(rng);
    case FurnitureType.MIRROR:
      return createMirrorGeometry(rng);
    case FurnitureType.PLANT:
      return createPlantGeometry(rng);
    default:
      return createChairGeometry(rng);
  }
}

/**
 * Merge multiple geometries into one
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];

  geometries.forEach(geometry => {
    geometry.computeVertexNormals();
    const posAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');

    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }

    if (normalAttr) {
      for (let i = 0; i < normalAttr.count; i++) {
        normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
      }
    }

    geometry.dispose();
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  merged.computeVertexNormals();

  return merged;
}

/**
 * Get material properties based on furniture type
 */
function getFurnitureMaterialProps(type: FurnitureType, intent: FurnitureIntent): {
  color: THREE.Color;
  roughness: number;
  metalness: number;
} {
  // More hostile = darker/more worn colors
  const isHostile = intent === FurnitureIntent.HOSTILE;
  const isGravityDefiant = intent === FurnitureIntent.GRAVITY_DEFIANT;

  switch (type) {
    case FurnitureType.CHAIR:
    case FurnitureType.TABLE:
    case FurnitureType.DESK:
      return {
        color: isHostile ? COLORS.woodDark : COLORS.wood,
        roughness: 0.7,
        metalness: 0.0,
      };
    case FurnitureType.SOFA:
    case FurnitureType.BED:
      return {
        color: isHostile ? COLORS.leather : COLORS.fabric,
        roughness: 0.85,
        metalness: 0.0,
      };
    case FurnitureType.CABINET:
      return {
        color: isGravityDefiant ? COLORS.woodDark : COLORS.wood,
        roughness: 0.6,
        metalness: 0.05,
      };
    case FurnitureType.LAMP:
      return {
        color: COLORS.metal,
        roughness: 0.4,
        metalness: 0.3,
      };
    case FurnitureType.CLOCK:
      return {
        color: COLORS.ceramic,
        roughness: 0.5,
        metalness: 0.1,
      };
    case FurnitureType.MIRROR:
      return {
        color: COLORS.glass,
        roughness: 0.1,
        metalness: 0.9,
      };
    case FurnitureType.PLANT:
      return {
        color: new THREE.Color('#3d5c3d'),
        roughness: 0.8,
        metalness: 0.0,
      };
    default:
      return {
        color: COLORS.wood,
        roughness: 0.7,
        metalness: 0.0,
      };
  }
}

// ============================================
// Single Furniture Component
// ============================================

interface SingleFurnitureProps {
  config: FurnitureConfig;
}

function SingleFurniture({ config }: SingleFurnitureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const colliderRef = useRef<THREE.Mesh>(null);

  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  // Register collision bounds with CollisionManager
  useEffect(() => {
    if (!colliderRef.current || !groupRef.current) return;

    const dims = FURNITURE_DIMENSIONS[config.type];
    const pos = new THREE.Vector3(
      config.position.x,
      config.position.y + dims.height / 2,
      config.position.z
    );

    // Create collision bounds (AABB)
    const halfWidth = dims.width / 2 * config.scale;
    const halfHeight = dims.height / 2 * config.scale;
    const halfDepth = dims.depth / 2 * config.scale;

    const bounds = new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );

    const collisionManager = getCollisionManager();
    collisionManager.addFurnitureCollider(config.id, bounds);

    return () => {
      // Cleanup would happen when component unmounts
      // Note: CollisionManager clears all colliders when room changes
    };
  }, [config.id, config.position, config.scale, config.type]);

  // Create geometry
  const geometry = useMemo(() => {
    return createFurnitureGeometry(config.type, config.seed);
  }, [config.type, config.seed]);

  // Get material properties
  const materialProps = useMemo(() => {
    return getFurnitureMaterialProps(config.type, config.intent);
  }, [config.type, config.intent]);

  // Animation state
  const state = useRef({
    time: 0,
    originalRotationY: config.rotation.y,
    originalPositionY: config.position.y,
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    state.current.time += delta;

    // Hostile furniture slowly turns toward player (subtle)
    if (config.intent === FurnitureIntent.HOSTILE && growlIntensity > 0.3) {
      const turnAmount = Math.sin(state.current.time * 0.05) * 0.02 * growlIntensity;
      groupRef.current.rotation.y = state.current.originalRotationY + turnAmount;
    }

    // Gravity-defiant furniture wobbles
    if (config.intent === FurnitureIntent.GRAVITY_DEFIANT && meshRef.current) {
      const wobble = Math.sin(state.current.time * 1.5) * 0.02;
      meshRef.current.rotation.x = Math.PI + wobble;
      meshRef.current.rotation.z = Math.cos(state.current.time * 0.7) * 0.01;
    }

    // Furniture settles with bass (subtle)
    if (config.intent !== FurnitureIntent.GRAVITY_DEFIANT && groupRef.current) {
      const settle = audioSmooth.bassSmooth * 0.005;
      groupRef.current.position.y = state.current.originalPositionY - settle;
    }

    // Lamps flicker with high frequencies
    if (config.type === FurnitureType.LAMP && meshRef.current && audioSmooth.highSmooth > 0.5) {
      const flicker = audioSmooth.highSmooth > 0.7 ? 0.3 : 0;
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
    }
  });

  // Determine emissive behavior
  const isLamp = config.type === FurnitureType.LAMP;
  const emissiveColor = isLamp ? new THREE.Color('#ffeecc') : new THREE.Color(0x000000);
  const emissiveIntensity = isLamp ? 0.2 : 0;

  // Calculate collision box dimensions
  const dims = FURNITURE_DIMENSIONS[config.type];

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    >
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={materialProps.color}
          roughness={materialProps.roughness}
          metalness={materialProps.metalness}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Collision mesh (invisible) - registered with CollisionManager */}
      <mesh
        ref={colliderRef}
        visible={false}
        userData={{ isCollider: true, furnitureId: config.id }}
      >
        <boxGeometry args={[dims.width, dims.height, dims.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// ============================================
// Main Furniture Component
// ============================================

interface FurnitureProps {
  dimensions: RoomDimensions;
  roomIndex: number;
  seed: number;
  archetype?: RoomArchetype;
  wrongness?: WrongnessConfig;
  enabled?: boolean;
}

export function Furniture({
  dimensions,
  roomIndex,
  seed,
  archetype,
  wrongness,
  enabled = true,
}: FurnitureProps) {
  // Generate furniture configurations
  const furniture = useMemo(() => {
    if (!enabled) return [];
    return generateFurnitureForRoom(dimensions, roomIndex, archetype, wrongness, seed);
  }, [dimensions, roomIndex, archetype, wrongness, seed, enabled]);

  if (!enabled || furniture.length === 0) return null;

  return (
    <group>
      {furniture.map((config) => (
        <SingleFurniture
          key={config.id}
          config={config}
        />
      ))}
    </group>
  );
}

export default Furniture;
