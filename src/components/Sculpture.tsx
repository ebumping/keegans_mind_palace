/**
 * Sculpture Component
 *
 * Procedural sculptures that suggest without showing.
 *
 * Art Direction Principles:
 * - Figure Facing Wall (always turns away)
 * - Accumulation (too many identical objects)
 * - The Weight (heavy on thin support)
 * - Threshold Guardian (in doorways)
 * - Full mesh collision—player navigates around
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { SeededRandom } from '../utils/seededRandom';
import {
  SculptureType,
  type SculptureConfig,
} from '../types/art';
import type { RoomDimensions, WrongnessConfig, DoorwayPlacement } from '../types/room';
import {
  generateSculpturesForRoom,
  getSculptureMaterialProps,
} from '../generators/SculptureGenerator';
import { getCollisionManager } from '../systems/CollisionManager';

// Pale-strata colors
const COLORS = {
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
};

// ============================================
// Sculpture Geometry Generators
// ============================================

/**
 * Create geometry for a figure facing wall
 * Abstract humanoid form that always turns away
 */
function createFigureFacingWallGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Torso (tapered cylinder)
  const torso = new THREE.CylinderGeometry(0.25, 0.3, 1.0, 8);
  torso.translate(0, 0.8, 0);
  geometries.push(torso);

  // Head (sphere, slightly small)
  const head = new THREE.SphereGeometry(0.18, 12, 8);
  head.translate(0, 1.55, 0);
  geometries.push(head);

  // Shoulders (wider cylinder)
  const shoulders = new THREE.CylinderGeometry(0.35, 0.25, 0.15, 8);
  shoulders.translate(0, 1.25, 0);
  geometries.push(shoulders);

  // Arms (simple cylinders, hanging down)
  const armL = new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6);
  armL.translate(-0.35, 0.85, 0);
  armL.rotateZ(0.1);
  geometries.push(armL);

  const armR = new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6);
  armR.translate(0.35, 0.85, 0);
  armR.rotateZ(-0.1);
  geometries.push(armR);

  // Legs (cylinders)
  const legL = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
  legL.translate(-0.12, 0.25, 0);
  geometries.push(legL);

  const legR = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
  legR.translate(0.12, 0.25, 0);
  geometries.push(legR);

  return mergeGeometries(geometries);
}

/**
 * Create geometry for accumulation (many small identical objects)
 */
function createAccumulationGeometry(rng: SeededRandom, count: number = 12): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Base shape to accumulate
  const shapeType = rng.int(0, 2);

  for (let i = 0; i < count; i++) {
    let shape: THREE.BufferGeometry;

    if (shapeType === 0) {
      // Small spheres
      shape = new THREE.SphereGeometry(0.15, 8, 6);
    } else if (shapeType === 1) {
      // Small cubes
      shape = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    } else {
      // Small cones
      shape = new THREE.ConeGeometry(0.12, 0.25, 6);
    }

    // Stack in a pile
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.15 + (i / count) * 0.3;
    const layer = Math.floor(i / 4);

    shape.translate(
      Math.cos(angle) * radius,
      layer * 0.18,
      Math.sin(angle) * radius
    );

    geometries.push(shape);
  }

  return mergeGeometries(geometries);
}

/**
 * Create geometry for The Weight (heavy mass on thin support)
 */
function createTheWeightGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Heavy top mass
  const mass = new THREE.SphereGeometry(0.6, 12, 10);
  mass.translate(0, 1.2, 0);
  geometries.push(mass);

  // Impossibly thin support
  const support = new THREE.CylinderGeometry(0.03, 0.05, 1.0, 6);
  support.translate(0, 0.5, 0);
  geometries.push(support);

  // Small base
  const base = new THREE.CylinderGeometry(0.25, 0.3, 0.1, 8);
  base.translate(0, 0.05, 0);
  geometries.push(base);

  return mergeGeometries(geometries);
}

/**
 * Create geometry for threshold guardian
 */
function createThresholdGuardianGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Taller, more imposing figure
  // Body (elongated)
  const body = new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8);
  body.translate(0, 0.9, 0);
  geometries.push(body);

  // Head (featureless oval)
  const head = new THREE.SphereGeometry(0.22, 10, 8);
  head.scale(1, 1.2, 0.9);
  head.translate(0, 1.85, 0);
  geometries.push(head);

  // Draped form over shoulders
  const drape = new THREE.ConeGeometry(0.5, 0.4, 8);
  drape.rotateX(Math.PI);
  drape.translate(0, 1.5, 0);
  geometries.push(drape);

  // Base
  const base = new THREE.CylinderGeometry(0.4, 0.45, 0.15, 8);
  base.translate(0, 0.075, 0);
  geometries.push(base);

  return mergeGeometries(geometries);
}

/**
 * Create geometry for abstraction
 */
function createAbstractionGeometry(rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  const shapeCount = rng.int(3, 6);

  for (let i = 0; i < shapeCount; i++) {
    const shapeType = rng.int(0, 4);
    let shape: THREE.BufferGeometry;

    if (shapeType === 0) {
      shape = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    } else if (shapeType === 1) {
      shape = new THREE.OctahedronGeometry(0.25);
    } else if (shapeType === 2) {
      shape = new THREE.TetrahedronGeometry(0.3);
    } else if (shapeType === 3) {
      shape = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 6);
    } else {
      shape = new THREE.SphereGeometry(0.2, 8, 6);
    }

    shape.translate(
      rng.range(-0.3, 0.3),
      0.3 + i * 0.25,
      rng.range(-0.3, 0.3)
    );
    shape.rotateX(rng.range(0, Math.PI));
    shape.rotateY(rng.range(0, Math.PI));

    geometries.push(shape);
  }

  // Base
  const base = new THREE.CylinderGeometry(0.35, 0.4, 0.1, 8);
  base.translate(0, 0.05, 0);
  geometries.push(base);

  return mergeGeometries(geometries);
}

/**
 * Create geometry for fragment (partial figure)
 */
function createFragmentGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Partial torso
  const torso = new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8);
  torso.translate(0, 0.55, 0);
  geometries.push(torso);

  // One shoulder
  const shoulder = new THREE.SphereGeometry(0.15, 8, 6);
  shoulder.translate(-0.25, 0.85, 0);
  geometries.push(shoulder);

  // Fragment of arm
  const arm = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6);
  arm.translate(-0.35, 0.7, 0);
  arm.rotateZ(0.3);
  geometries.push(arm);

  // Jagged break at top
  const breakPoint = new THREE.ConeGeometry(0.2, 0.15, 5);
  breakPoint.rotateX(Math.PI);
  breakPoint.translate(0.05, 0.95, 0);
  geometries.push(breakPoint);

  // Base/pedestal
  const base = new THREE.BoxGeometry(0.4, 0.2, 0.4);
  base.translate(0, 0.1, 0);
  geometries.push(base);

  return mergeGeometries(geometries);
}

/**
 * Create geometry for vessel
 */
function createVesselGeometry(_rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Main vessel body (lathe geometry)
  const points: THREE.Vector2[] = [];
  const segments = 10;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * 0.8;
    // Vessel profile
    let r = 0.15 + Math.sin(t * Math.PI) * 0.2;
    if (t > 0.9) r *= 0.7; // Neck
    points.push(new THREE.Vector2(r, y));
  }

  const vessel = new THREE.LatheGeometry(points, 16);
  vessel.translate(0, 0.1, 0);
  geometries.push(vessel);

  // Base
  const base = new THREE.CylinderGeometry(0.2, 0.22, 0.1, 8);
  base.translate(0, 0.05, 0);
  geometries.push(base);

  return mergeGeometries(geometries);
}

/**
 * Create geometry based on sculpture type
 */
function createSculptureGeometry(type: SculptureType, seed: number): THREE.BufferGeometry {
  const rng = new SeededRandom(seed);

  switch (type) {
    case SculptureType.FIGURE_FACING_WALL:
      return createFigureFacingWallGeometry(rng);
    case SculptureType.ACCUMULATION:
      return createAccumulationGeometry(rng, 8 + rng.int(0, 8));
    case SculptureType.THE_WEIGHT:
      return createTheWeightGeometry(rng);
    case SculptureType.THRESHOLD_GUARDIAN:
      return createThresholdGuardianGeometry(rng);
    case SculptureType.ABSTRACTION:
      return createAbstractionGeometry(rng);
    case SculptureType.FRAGMENT:
      return createFragmentGeometry(rng);
    case SculptureType.VESSEL:
      return createVesselGeometry(rng);
    default:
      return createAbstractionGeometry(rng);
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

// ============================================
// Single Sculpture Component
// ============================================

interface SingleSculptureProps {
  config: SculptureConfig;
}

// Sculpture collision dimensions by type
const SCULPTURE_COLLISION_DIMS: Record<SculptureType, { width: number; height: number; depth: number }> = {
  [SculptureType.FIGURE_FACING_WALL]: { width: 0.8, height: 2.0, depth: 0.8 },
  [SculptureType.ACCUMULATION]: { width: 1.2, height: 0.6, depth: 1.2 },
  [SculptureType.THE_WEIGHT]: { width: 0.6, height: 1.5, depth: 0.6 },
  [SculptureType.THRESHOLD_GUARDIAN]: { width: 1.0, height: 2.5, depth: 0.6 },
  [SculptureType.ABSTRACTION]: { width: 0.8, height: 1.0, depth: 0.8 },
  [SculptureType.FRAGMENT]: { width: 0.6, height: 1.2, depth: 0.6 },
  [SculptureType.VESSEL]: { width: 0.5, height: 0.8, depth: 0.5 },
};

function SingleSculpture({ config }: SingleSculptureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  // Register collision bounds with CollisionManager
  useEffect(() => {
    const dims = SCULPTURE_COLLISION_DIMS[config.type] || { width: 0.8, height: 2.0, depth: 0.8 };

    const halfWidth = (dims.width / 2) * config.scale;
    const halfDepth = (dims.depth / 2) * config.scale;

    const bounds = new THREE.Box3(
      new THREE.Vector3(
        config.position.x - halfWidth,
        config.position.y,
        config.position.z - halfDepth
      ),
      new THREE.Vector3(
        config.position.x + halfWidth,
        config.position.y + dims.height * config.scale,
        config.position.z + halfDepth
      )
    );

    const collisionManager = getCollisionManager();
    collisionManager.addArtCollider(config.id, bounds);

    return () => {
      // Cleanup handled by CollisionManager.clear() on room change
    };
  }, [config.id, config.position, config.scale, config.type]);

  // Create geometry
  const geometry = useMemo(() => {
    return createSculptureGeometry(config.type, config.seed);
  }, [config.type, config.seed]);

  // Get material properties
  const materialProps = useMemo(() => {
    return getSculptureMaterialProps(config.material);
  }, [config.material]);

  // Animation state
  const state = useRef({
    time: 0,
    originalRotationY: config.rotation.y,
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    state.current.time += delta;

    // Subtle rotation on high Growl (figure seems to be slowly turning)
    if (config.type === SculptureType.FIGURE_FACING_WALL && growlIntensity > 0.4) {
      const turnAmount = Math.sin(state.current.time * 0.1) * 0.02 * growlIntensity;
      groupRef.current.rotation.y = state.current.originalRotationY + turnAmount;
    }

    // Accumulation pieces settle/shift with bass
    if (config.type === SculptureType.ACCUMULATION && meshRef.current) {
      const settle = audioSmooth.bassSmooth * 0.01;
      meshRef.current.position.y = -settle;
    }

    // The Weight seems to wobble
    if (config.type === SculptureType.THE_WEIGHT && growlIntensity > 0.3) {
      const wobble = Math.sin(state.current.time * 2) * 0.01 * growlIntensity;
      groupRef.current.rotation.z = wobble;
    }
  });

  // Determine emissive behavior
  const emissiveColor = config.material === 'void' ? COLORS.primary : new THREE.Color(0x000000);
  const emissiveIntensity = config.material === 'void' ? 0.3 : 0;

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

      {/* Collision mesh (matches registered collider) */}
      {(() => {
        const dims = SCULPTURE_COLLISION_DIMS[config.type] || { width: 0.8, height: 2.0, depth: 0.8 };
        return (
          <mesh visible={false} position={[0, dims.height / 2, 0]}>
            <boxGeometry args={[dims.width, dims.height, dims.depth]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        );
      })()}
    </group>
  );
}

// ============================================
// Main Sculptures Component
// ============================================

interface SculpturesProps {
  dimensions: RoomDimensions;
  roomIndex: number;
  seed: number;
  wrongness?: WrongnessConfig;
  doorways?: DoorwayPlacement[];
  enabled?: boolean;
}

export function Sculptures({
  dimensions,
  roomIndex,
  seed,
  wrongness,
  doorways = [],
  enabled = true,
}: SculpturesProps) {
  // Generate sculpture configurations
  const sculptures = useMemo(() => {
    if (!enabled) return [];
    return generateSculpturesForRoom(dimensions, roomIndex, wrongness, doorways, seed);
  }, [dimensions, roomIndex, wrongness, doorways, seed, enabled]);

  if (!enabled || sculptures.length === 0) return null;

  return (
    <group>
      {sculptures.map((config) => (
        <SingleSculpture
          key={config.id}
          config={config}
        />
      ))}
    </group>
  );
}

export default Sculptures;
