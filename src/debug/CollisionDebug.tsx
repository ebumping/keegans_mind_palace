/**
 * CollisionDebug: Visualization for collision detection debugging
 *
 * Toggle-able wireframe showing all collision volumes:
 * - Green: Static geometry (walls, floors)
 * - Blue: Triggers (doorways)
 * - Yellow: Furniture
 * - Red: Dynamic (breathing walls)
 * - Purple: Art objects
 */

import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCollisionManager } from '../systems/CollisionManager';

interface CollisionDebugProps {
  enabled?: boolean;
}

const COLORS = {
  static: 0x00ff00,    // Green
  trigger: 0x0000ff,   // Blue
  furniture: 0xffff00, // Yellow
  dynamic: 0xff0000,   // Red
  art: 0xff00ff,       // Purple
};

export function CollisionDebug({ enabled = false }: CollisionDebugProps) {
  const [debugMeshes, setDebugMeshes] = useState<THREE.LineSegments[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!enabled) {
      // Clear meshes when disabled
      setDebugMeshes([]);
      return;
    }

    const collisionManager = getCollisionManager();
    const colliders = collisionManager.getDebugColliders();
    const meshes: THREE.LineSegments[] = [];

    for (const { type, bounds } of colliders) {
      const color = COLORS[type as keyof typeof COLORS] || 0xffffff;
      const mesh = createBoxWireframe(bounds, color);
      meshes.push(mesh);
    }

    setDebugMeshes(meshes);
  }, [enabled]);

  // Update dynamic collider positions each frame
  useFrame(() => {
    if (!enabled || !groupRef.current) return;

    // In a production implementation, we'd update the wireframe positions
    // to match breathing walls. For now, the static visualization suffices.
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {debugMeshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
}

function createBoxWireframe(box: THREE.Box3, color: number): THREE.LineSegments {
  const size = new THREE.Vector3();
  box.getSize(size);

  const center = new THREE.Vector3();
  box.getCenter(center);

  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  });

  const wireframe = new THREE.LineSegments(edges, material);
  wireframe.position.copy(center);

  return wireframe;
}

export default CollisionDebug;
