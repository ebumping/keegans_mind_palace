/**
 * VerticalElements Component
 *
 * Renders vertical complexity within rooms: sunken areas, raised platforms,
 * mezzanines, split-level floors, pits, and shafts.
 *
 * The floor is not flat. The space has depth.
 *
 * Every vertical element MUST have collision geometry.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { VerticalElementType } from '../types/room';
import type { VerticalElement, RoomDimensions } from '../types/room';
import { getCollisionManager } from '../systems/CollisionManager';

// Material palette for vertical surfaces
const SURFACE_COLORS = {
  sunken: new THREE.Color('#1e1a30'),   // Darker, like looking into a depression
  raised: new THREE.Color('#2a2545'),   // Slightly lighter, elevated
  mezzanine: new THREE.Color('#322d4a'), // Industrial half-floor
  split: new THREE.Color('#252040'),    // Subtle step difference
  pit: new THREE.Color('#0d0a1a'),      // Deep void darkness
  shaft: new THREE.Color('#3a3555'),    // Vertical opening, lighter from above
};

const EDGE_COLORS = {
  sunken: new THREE.Color('#4a4070'),
  raised: new THREE.Color('#5a5080'),
  mezzanine: new THREE.Color('#6a6090'),
  split: new THREE.Color('#3a3560'),
  pit: new THREE.Color('#2a1840'),
  shaft: new THREE.Color('#7a70a0'),
};

const RAIL_COLOR = new THREE.Color('#5c5878');

// ============================================
// Single Vertical Element Renderer
// ============================================

interface SingleVerticalElementProps {
  element: VerticalElement;
  elementId: string;
  roomDimensions: RoomDimensions;
}

function SingleVerticalElement({ element, elementId }: SingleVerticalElementProps) {
  const groupRef = useRef<THREE.Group>(null);
  const floorRef = useRef<THREE.Mesh>(null);
  const stateRef = useRef({ time: 0 });

  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  // Build floor geometry from footprint polygon
  const floorGeometry = useMemo(() => {
    const verts = element.footprint;
    if (verts.length < 3) return new THREE.PlaneGeometry(1, 1);

    const shape = new THREE.Shape();
    shape.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      shape.lineTo(verts[i].x, verts[i].y);
    }
    shape.closePath();

    return new THREE.ShapeGeometry(shape, 1);
  }, [element.footprint]);

  // Build wall geometries for the element edges
  const wallGeometries = useMemo(() => {
    const walls: { geometry: THREE.BufferGeometry; position: THREE.Vector3; rotation: THREE.Euler }[] = [];
    const wallHeight = Math.abs(element.heightDelta);
    if (wallHeight < 0.05) return walls;

    const verts = element.footprint;
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];

      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const wallLength = Math.sqrt(dx * dx + dy * dy);
      if (wallLength < 0.05) continue;

      const centerX = (v1.x + v2.x) / 2;
      const centerY = (v1.y + v2.y) / 2;
      const angle = Math.atan2(dy, dx);

      const geom = new THREE.PlaneGeometry(wallLength, wallHeight, 1, 1);

      // Position: center of edge, half wall height
      // For sunken areas, walls go down; for raised, walls go up
      const yPos = element.heightDelta > 0
        ? element.heightDelta / 2
        : element.heightDelta / 2;

      walls.push({
        geometry: geom,
        position: new THREE.Vector3(centerX, yPos, centerY),
        rotation: new THREE.Euler(0, -angle + Math.PI / 2, 0),
      });
    }
    return walls;
  }, [element.footprint, element.heightDelta]);

  // Build rail geometry
  const railGeometry = useMemo(() => {
    if (!element.hasRail || Math.abs(element.heightDelta) < 0.3) return null;

    const verts = element.footprint;
    const railHeight = element.heightDelta > 0
      ? element.heightDelta + 0.9
      : 0.9; // Rail at floor level for sunken areas

    const points = verts.map(v => new THREE.Vector3(v.x, railHeight, v.y));
    points.push(points[0].clone()); // Close loop

    const curve = new THREE.CatmullRomCurve3(points, true);
    return new THREE.TubeGeometry(curve, verts.length * 4, 0.025, 6, true);
  }, [element.footprint, element.heightDelta, element.hasRail]);

  // Build stairs/ramp connection geometry
  const connectionGeometry = useMemo(() => {
    if (element.connectsVia === 'none' || element.connectsVia === 'jump') return null;

    const verts = element.footprint;
    if (verts.length < 2) return null;

    // Find the closest edge to room center (most accessible)
    let bestEdge = 0;
    let bestDist = Infinity;
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;
      const dist = Math.sqrt(midX * midX + midY * midY);
      if (dist < bestDist) {
        bestDist = dist;
        bestEdge = i;
      }
    }

    const v1 = verts[bestEdge];
    const v2 = verts[(bestEdge + 1) % verts.length];
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const edgeLen = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Normal pointing outward from element
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;

    const absHeight = Math.abs(element.heightDelta);

    if (element.connectsVia === 'step') {
      // Single step: small box
      const stepWidth = Math.min(edgeLen * 0.6, 1.5);
      const stepDepth = 0.4;
      const geom = new THREE.BoxGeometry(stepWidth, absHeight, stepDepth);
      return {
        geometry: geom,
        position: new THREE.Vector3(
          midX + nx * stepDepth / 2,
          element.heightDelta / 2,
          midY + ny * stepDepth / 2
        ),
        rotation: new THREE.Euler(0, -angle, 0),
      };
    }

    if (element.connectsVia === 'ramp') {
      // Ramp: tilted plane
      const rampWidth = Math.min(edgeLen * 0.5, 2.0);
      const rampLength = absHeight * 2.5; // Gentle slope
      const geom = new THREE.PlaneGeometry(rampWidth, rampLength, 1, 4);

      const tiltAngle = Math.atan2(absHeight, rampLength);
      const sign = element.heightDelta > 0 ? 1 : -1;

      return {
        geometry: geom,
        position: new THREE.Vector3(
          midX + nx * rampLength / 2,
          element.heightDelta / 2,
          midY + ny * rampLength / 2
        ),
        rotation: new THREE.Euler(
          -Math.PI / 2 + sign * tiltAngle,
          -angle + Math.PI / 2,
          0
        ),
      };
    }

    if (element.connectsVia === 'stairs') {
      // Stairs: series of step boxes
      const stairWidth = Math.min(edgeLen * 0.5, 1.8);
      const numSteps = Math.max(3, Math.ceil(absHeight / 0.2));
      const stepHeight = absHeight / numSteps;
      const stepDepth = 0.3;

      const geometries: THREE.BufferGeometry[] = [];
      const sign = element.heightDelta > 0 ? 1 : -1;

      for (let s = 0; s < numSteps; s++) {
        const step = new THREE.BoxGeometry(stairWidth, stepHeight, stepDepth);
        const stepY = sign > 0
          ? stepHeight * (s + 0.5)
          : -stepHeight * (s + 0.5);
        const offset = (s + 0.5) * stepDepth;

        step.translate(
          midX + nx * offset,
          stepY,
          midY + ny * offset
        );
        // Rotate vertices around the midpoint
            // For simplicity, we don't rotate individual step geometry here;
        // the group rotation handles alignment
        geometries.push(step);
      }

      // Merge steps
      if (geometries.length === 0) return null;
      const merged = mergeBufferGeometries(geometries);
      return merged ? {
        geometry: merged,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
      } : null;
    }

    return null;
  }, [element]);

  // Register collision
  useEffect(() => {
    const collisionManager = getCollisionManager();

    // Compute bounding box for the vertical element footprint
    const verts = element.footprint;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const v of verts) {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minZ = Math.min(minZ, v.y);
      maxZ = Math.max(maxZ, v.y);
    }

    if (element.type === VerticalElementType.PIT || element.type === VerticalElementType.SHAFT) {
      // Pit/shaft: collision walls around the perimeter to prevent falling in
      if (element.hasRail) {
        const railBounds = new THREE.Box3(
          new THREE.Vector3(minX - 0.1, 0, minZ - 0.1),
          new THREE.Vector3(maxX + 0.1, 0.9, maxZ + 0.1)
        );
        collisionManager.addStaticCollider(`${elementId}-rail`, railBounds);
      }
    } else if (element.heightDelta > 0) {
      // Raised platform: collision box for the raised surface
      const platformBounds = new THREE.Box3(
        new THREE.Vector3(minX, 0, minZ),
        new THREE.Vector3(maxX, element.heightDelta, maxZ)
      );
      collisionManager.addStaticCollider(`${elementId}-platform`, platformBounds);
    }
    // Sunken/split areas don't need extra collision - the walls around them handle it
    // Rails on sunken areas act as collision barriers
    if (element.hasRail && element.heightDelta < 0) {
      const railBounds = new THREE.Box3(
        new THREE.Vector3(minX - 0.1, element.heightDelta, minZ - 0.1),
        new THREE.Vector3(maxX + 0.1, 0.9, maxZ + 0.1)
      );
      collisionManager.addStaticCollider(`${elementId}-rail`, railBounds);
    }
  }, [element, elementId]);

  // Animate: subtle audio-reactive breathing and growl-driven unease
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    stateRef.current.time += delta;

    const t = stateRef.current.time;
    const bass = audioSmooth.bassSmooth;

    // Subtle vertical breathing on raised/sunken elements
    if (element.type === VerticalElementType.SUNKEN || element.type === VerticalElementType.RAISED) {
      const breathe = Math.sin(t * 0.5) * bass * 0.02;
      groupRef.current.position.y = element.heightDelta + breathe;
    }

    // Pit darkness pulsing with growl
    if (element.type === VerticalElementType.PIT && floorRef.current) {
      const mat = floorRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        const pulse = growlIntensity * 0.15 * (0.5 + 0.5 * Math.sin(t * 2));
        mat.emissiveIntensity = pulse;
      }
    }

    // Shaft: subtle upward light flicker
    if (element.type === VerticalElementType.SHAFT && floorRef.current) {
      const mat = floorRef.current.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        const flicker = 0.1 + audioSmooth.highSmooth * 0.3 + Math.random() * 0.05 * growlIntensity;
        mat.emissiveIntensity = flicker;
      }
    }
  });

  const surfaceColor = SURFACE_COLORS[element.type];
  const edgeColor = EDGE_COLORS[element.type];

  // Pit and shaft get emissive glow
  const isPitOrShaft = element.type === VerticalElementType.PIT || element.type === VerticalElementType.SHAFT;

  return (
    <group ref={groupRef} position={[0, element.heightDelta, 0]}>
      {/* Floor surface */}
      <mesh
        ref={floorRef}
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color={surfaceColor}
          roughness={0.85}
          metalness={0.05}
          emissive={isPitOrShaft ? new THREE.Color('#1a0030') : undefined}
          emissiveIntensity={isPitOrShaft ? 0.1 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Edge walls */}
      {wallGeometries.map((wall, i) => (
        <mesh
          key={`wall-${i}`}
          geometry={wall.geometry}
          position={wall.position.toArray() as [number, number, number]}
          rotation={wall.rotation}
          receiveShadow
        >
          <meshStandardMaterial
            color={edgeColor}
            roughness={0.9}
            metalness={0.02}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Rail */}
      {railGeometry && (
        <mesh geometry={railGeometry} castShadow>
          <meshStandardMaterial
            color={RAIL_COLOR}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      )}

      {/* Connection (stairs/ramp/step) */}
      {connectionGeometry && (
        <mesh
          geometry={connectionGeometry.geometry}
          position={connectionGeometry.position.toArray() as [number, number, number]}
          rotation={connectionGeometry.rotation}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={edgeColor}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================
// Merge utility
// ============================================

function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];

  // Count total vertices and indices
  let totalVertices = 0;
  let totalIndices = 0;

  for (const geom of geometries) {
    const pos = geom.getAttribute('position');
    if (pos) totalVertices += pos.count;
    const idx = geom.getIndex();
    if (idx) totalIndices += idx.count;
    else if (pos) totalIndices += pos.count; // Non-indexed
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const geom of geometries) {
    const pos = geom.getAttribute('position');
    const norm = geom.getAttribute('normal');
    const idx = geom.getIndex();

    if (!pos) continue;

    // Copy positions
    for (let i = 0; i < pos.count; i++) {
      positions[(vertexOffset + i) * 3] = pos.getX(i);
      positions[(vertexOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vertexOffset + i) * 3 + 2] = pos.getZ(i);
    }

    // Copy normals
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        normals[(vertexOffset + i) * 3] = norm.getX(i);
        normals[(vertexOffset + i) * 3 + 1] = norm.getY(i);
        normals[(vertexOffset + i) * 3 + 2] = norm.getZ(i);
      }
    }

    // Copy indices
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[indexOffset + i] = idx.getX(i) + vertexOffset;
      }
      indexOffset += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[indexOffset + i] = vertexOffset + i;
      }
      indexOffset += pos.count;
    }

    vertexOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeVertexNormals();

  return merged;
}

// ============================================
// Main Component
// ============================================

interface VerticalElementsProps {
  dimensions: RoomDimensions;
  verticalElements: VerticalElement[];
  roomIndex: number;
  seed: number;
  enabled?: boolean;
}

export function VerticalElements({
  dimensions,
  verticalElements,
  roomIndex,
  enabled = true,
}: VerticalElementsProps) {
  if (!enabled || verticalElements.length === 0) return null;

  return (
    <group>
      {verticalElements.map((element, i) => (
        <SingleVerticalElement
          key={`vert-${roomIndex}-${i}`}
          element={element}
          elementId={`vert-${roomIndex}-${i}`}
          roomDimensions={dimensions}
        />
      ))}
    </group>
  );
}

export default VerticalElements;
