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
import { CeilingLights } from './CeilingLights';
import { VerticalElements } from './VerticalElements';
import { CircuitryOverlay } from './CircuitryOverlay';
import { VariationEffects } from './VariationEffects';
import { DoorwayShimmer } from './DoorwayShimmer';
import { DoorwayProximityGlow } from './DoorwayProximityGlow';
import { FakeDoors } from './FakeDoors';
import { WrongShadows } from './WrongShadows';
import type { Wall, GeneratedRoom, RoomConfig } from '../types/room';
import { getGlitchSystem } from '../systems/GlitchSystem';
import { getAmbientSoundHints } from '../systems/AmbientSoundHints';
import { getRoomPoolManager } from '../systems/RoomPoolManager';

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

    // Register generated room with the pool manager for memory tracking
    const poolManager = getRoomPoolManager();
    poolManager.setGeneratedRoom(roomIndex, room);

    // Register shader materials with GlitchSystem for geometry glitch effects
    const glitchSystem = getGlitchSystem();
    const registeredIds: string[] = [];
    room.materials.forEach((material, i) => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms.u_geometryGlitch) {
        const id = `room-${roomIndex}-mat-${i}`;
        glitchSystem.registerMaterial(id, material);
        registeredIds.push(id);
      }
    });

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
      // Unregister materials from GlitchSystem
      registeredIds.forEach(id => glitchSystem.unregisterMaterial(id));

      if (roomRef.current) {
        roomRef.current.dispose();
        roomRef.current = null;
      }
    };
  }, [generator, roomIndex, entryWall]);

  // Start archetype-specific ambient sound when room changes
  useEffect(() => {
    if (!roomConfig?.archetype) return;

    const ambientSound = getAmbientSoundHints();
    ambientSound.start(roomConfig.archetype);

    return () => {
      ambientSound.stop();
    };
  }, [roomConfig?.archetype]);

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
          count={Math.floor(4 + Math.sqrt(roomConfig.dimensions.width * roomConfig.dimensions.depth) / 3 + roomConfig.abnormality * 3)}
          abnormality={roomConfig.abnormality}
          enabled={true}
        />
      )}

      {/* Wall Paintings */}
      {roomConfig && !roomConfig.isCurated && (
        <Paintings
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 8000}
          wrongness={roomConfig.wrongness}
          enabled={true}
        />
      )}

      {/* Sculptures */}
      {roomConfig && !roomConfig.isCurated && (
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
      {roomConfig && !roomConfig.isCurated && (
        <Furniture
          dimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 10000}
          archetype={roomConfig.archetype}
          wrongness={roomConfig.wrongness}
          enabled={true}
        />
      )}

      {/* Vertical Elements - Sunken areas, platforms, pits, shafts */}
      {roomConfig && !roomConfig.isCurated && roomConfig.verticalElements && roomConfig.verticalElements.length > 0 && (
        <VerticalElements
          dimensions={roomConfig.dimensions}
          verticalElements={roomConfig.verticalElements}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 15000}
          enabled={true}
        />
      )}

      {/* Circuitry Overlay - Glowing circuit traces on walls/floor */}
      {roomConfig && !roomConfig.isCurated && roomConfig.circuitry && (
        <CircuitryOverlay
          dimensions={roomConfig.dimensions}
          circuitry={roomConfig.circuitry}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 7000}
          enabled={true}
        />
      )}

      {/* Ceiling Lights - Dynamic fixtures from room config */}
      {roomConfig && !roomConfig.isCurated && roomConfig.ceilingConfig && (
        <CeilingLights
          dimensions={roomConfig.dimensions}
          ceilingConfig={roomConfig.ceilingConfig}
          archetype={roomConfig.archetype}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed}
          wrongnessLightingBehavior={roomConfig.wrongness?.lightingBehavior}
          enabled={true}
        />
      )}

      {/* Melancholic Light - Beauty that makes you sad */}
      {roomConfig && (
        <MelancholicLight
          roomDimensions={roomConfig.dimensions}
          roomIndex={roomConfig.index}
          seed={roomConfig.seed + 20000}
          archetype={roomConfig.archetype}
          enabled={true}
        />
      )}

      {/* Portal Variation Effects - Levels 1-5 visual rendering */}
      {roomConfig && (
        <VariationEffects
          roomConfig={roomConfig}
          enabled={true}
        />
      )}

      {/* Doorway Proximity Glow - Intensifies as player approaches */}
      {roomConfig && roomConfig.doorways.length > 0 && (
        <DoorwayProximityGlow
          doorways={roomConfig.doorways}
          roomDimensions={roomConfig.dimensions}
          enabled={true}
        />
      )}

      {/* Doorway Shimmer - Indicates variation level of rooms beyond doorways */}
      {roomConfig && roomConfig.doorways.length > 0 && (
        <DoorwayShimmer
          doorways={roomConfig.doorways}
          roomDimensions={roomConfig.dimensions}
          enabled={true}
        />
      )}

      {/* Fake Doors - Sealed doorways that lead nowhere (wrongness system) */}
      {roomConfig && !roomConfig.isCurated && roomConfig.fakeDoors && roomConfig.fakeDoors.length > 0 && (
        <FakeDoors
          fakeDoors={roomConfig.fakeDoors}
          roomDimensions={roomConfig.dimensions}
          wrongnessLevel={roomConfig.wrongness?.level ?? 1}
          seed={roomConfig.seed + 25000}
        />
      )}

      {/* Wrong Shadows - Lights casting shadows from impossible directions */}
      {roomConfig && !roomConfig.isCurated && roomConfig.wrongness &&
       roomConfig.wrongness.lightingBehavior === 'wrong_direction' && (
        <WrongShadows
          dimensions={roomConfig.dimensions}
          wrongnessLevel={roomConfig.wrongness.level}
          seed={roomConfig.seed + 30000}
        />
      )}
    </group>
  );
}

export default Room;
