/**
 * Room Component
 *
 * React Three Fiber component that renders a procedurally generated room
 * with audio-reactive scaling and breathing effects.
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomGenerator } from '../generators/RoomGenerator';
import { useAudioLevels } from '../store/audioStore';
import { RoomAtmosphere } from './RoomAtmosphere';
import { Artifact } from './Artifact';
import { Paintings } from './Painting';
import { Sculptures } from './Sculpture';
import { Furniture } from './Furniture';
import { MelancholicLight } from './MelancholicLight';
import { Doorways } from './Doorways';
import type { Wall, GeneratedRoom, RoomConfig } from '../types/room';

interface RoomProps {
  roomIndex?: number;
  entryWall?: Wall | null;
  baseSeed?: number;
  position?: [number, number, number];
}

export function Room({
  roomIndex = 0,
  entryWall = null,
  baseSeed = 42,
  position = [0, 0, 0],
}: RoomProps) {
  const groupRef = useRef<THREE.Group>(null);
  const roomRef = useRef<GeneratedRoom | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  // Get audio levels for reactivity
  const audioLevels = useAudioLevels();

  // Memoize the generator
  const generator = useMemo(() => new RoomGenerator({ baseSeed }), [baseSeed]);

  // Generate room on mount or when roomIndex changes
  useEffect(() => {
    // Dispose previous room
    if (roomRef.current) {
      roomRef.current.dispose();
    }

    // Generate new room
    const room = generator.generate(roomIndex, entryWall);
    roomRef.current = room;

    // Verify the generated mesh is non-empty (has walls, floor, ceiling)
    if (room.mesh.children.length === 0) {
      console.warn(`[Room] Room ${roomIndex} generated with empty mesh group — geometry may be missing`);
    }

    // Store config for atmosphere component
    setRoomConfig(room.config);

    // Add to scene
    if (groupRef.current) {
      // Clear previous children (except React-managed ones)
      const childrenToRemove = groupRef.current.children.filter(
        child => !(child.userData && child.userData.reactManaged)
      );
      childrenToRemove.forEach(child => groupRef.current!.remove(child));
      groupRef.current.add(room.mesh);
    } else {
      console.warn(`[Room] groupRef not available for room ${roomIndex} — mesh not added to scene`);
    }

    // Cleanup on unmount
    return () => {
      if (roomRef.current) {
        roomRef.current.dispose();
        roomRef.current = null;
      }
    };
  }, [generator, roomIndex, entryWall]);

  // Update room with audio levels each frame
  useFrame((_, delta) => {
    if (roomRef.current) {
      roomRef.current.update(
        {
          bass: audioLevels.bass,
          mid: audioLevels.mid,
          high: audioLevels.high,
          overall: audioLevels.overall,
          transient: audioLevels.transient,
          transientIntensity: audioLevels.transientIntensity,
        },
        delta
      );
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Room Atmosphere Effects */}
      {roomConfig && (
        <RoomAtmosphere
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed}
          abnormality={roomConfig.abnormality}
          enableBreathing={true}
          enableDust={true}
          enableLights={true}
        />
      )}

      {/* Floating Artifacts */}
      {roomConfig && (
        <Artifact
          dimensions={roomConfig.dimensions}
          seed={roomConfig.seed + 5000}
          count={Math.floor(3 + roomConfig.abnormality * 5)}
          abnormality={roomConfig.abnormality}
          enabled={true}
        />
      )}

      {/* Wall Paintings */}
      {roomConfig && (
        <Paintings
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 8000}
          wrongness={roomConfig.wrongness}
          enabled={true}
        />
      )}

      {/* Sculptures */}
      {roomConfig && (
        <Sculptures
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 9000}
          wrongness={roomConfig.wrongness}
          doorways={roomConfig.doorways}
          enabled={true}
        />
      )}

      {/* Furniture with Intent */}
      {roomConfig && (
        <Furniture
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 10000}
          archetype={roomConfig.archetype}
          wrongness={roomConfig.wrongness}
          enabled={true}
        />
      )}

      {/* Melancholic Light - Beauty that makes you sad */}
      {roomConfig && (
        <MelancholicLight
          roomDimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 20000}
          enabled={true}
        />
      )}

      {/* Doorway Portals */}
      {roomConfig && (
        <Doorways
          doorways={roomConfig.doorways}
          doorwayGeometry={roomConfig.doorwayGeometry}
          dimensions={roomConfig.dimensions}
          seed={roomConfig.seed + 15000}
          enabled={true}
        />
      )}
    </group>
  );
}

export default Room;
