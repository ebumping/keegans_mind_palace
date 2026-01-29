/**
 * Doorways Component
 *
 * React Three Fiber wrapper that renders procedurally generated doorways
 * with glowing frames, portal effects, and audio reactivity.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Doorway, createDoorwaysForRoom } from './Doorway';
import { useAudioLevels } from '../store/audioStore';
import type { DoorwayPlacement, DoorwayGeometry, RoomDimensions } from '../types/room';

interface DoorwaysProps {
  doorways: DoorwayPlacement[];
  doorwayGeometry: DoorwayGeometry;
  dimensions: RoomDimensions;
  seed: number;
  enabled?: boolean;
}

export function Doorways({
  doorways,
  doorwayGeometry,
  dimensions,
  seed,
  enabled = true,
}: DoorwaysProps) {
  const doorwayInstances = useRef<Doorway[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const audioLevels = useAudioLevels();

  // Create doorways on mount or when dependencies change
  useEffect(() => {
    if (!enabled || !groupRef.current) return;

    // Dispose previous doorways
    doorwayInstances.current.forEach((d) => d.dispose());

    // Clear group
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    // Create new doorways
    doorwayInstances.current = createDoorwaysForRoom(
      doorways,
      doorwayGeometry,
      dimensions,
      seed,
      { enablePortal: true, enableDoorPanel: false, initialState: 'open' }
    );

    // Add meshes to group
    doorwayInstances.current.forEach((d) => {
      groupRef.current?.add(d.mesh);
    });

    return () => {
      doorwayInstances.current.forEach((d) => d.dispose());
      doorwayInstances.current = [];
    };
  }, [doorways, doorwayGeometry, dimensions, seed, enabled]);

  // Update with audio each frame
  useFrame((_, delta) => {
    if (!enabled) return;

    const time = performance.now() / 1000;
    doorwayInstances.current.forEach((d) => {
      d.update(audioLevels, delta, time);
    });
  });

  if (!enabled) return null;
  return <group ref={groupRef} />;
}

export default Doorways;
