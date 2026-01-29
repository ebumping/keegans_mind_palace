/**
 * CircuitryOverlay Component
 *
 * Renders glowing circuit traces on wall and floor surfaces.
 * Uses CircuitrySystem to generate textures from CircuitTrace data
 * and applies audio-reactive shaders with cyan/purple glow.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoomDimensions } from '../types/room';
import type { CircuitTrace } from '../generators/CircuitryGenerator';
import {
  CircuitTextureGenerator,
} from '../generators/CircuitryGenerator';
import {
  createCircuitryMaterial,
  updateCircuitryMaterial,
} from '../systems/CircuitrySystem';
import { useAudioLevels } from '../store/audioStore';

interface CircuitryOverlayProps {
  dimensions: RoomDimensions;
  circuitry: CircuitTrace;
  roomIndex: number;
  seed: number;
  enabled?: boolean;
}

/**
 * Renders circuit trace overlays on walls and floor of a room.
 * Traces glow cyan (#8eecf5) with purple (#c792f5) pulse,
 * animated with audio-reactive data flow.
 */
export function CircuitryOverlay({
  dimensions,
  circuitry,
  roomIndex,
  seed,
  enabled = true,
}: CircuitryOverlayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const audioLevels = useAudioLevels();
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  // Generate textures and materials for wall and floor overlays
  const overlays = useMemo(() => {
    if (!enabled || !circuitry || circuitry.nodes.length < 3) return null;

    const textureGen = new CircuitTextureGenerator(512);
    const texture = textureGen.generateTexture(circuitry);
    const result: {
      meshes: THREE.Mesh[];
      materials: THREE.ShaderMaterial[];
      textures: THREE.DataTexture[];
    } = {
      meshes: [],
      materials: [],
      textures: [texture],
    };

    const { width, height, depth } = dimensions;
    const rng = seedRng(seed);

    // Floor overlay
    {
      const mat = createCircuitryMaterial(texture);
      const geo = new THREE.PlaneGeometry(width * 0.9, depth * 0.9);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.01; // Slightly above floor to avoid z-fighting
      result.meshes.push(mesh);
      result.materials.push(mat);
    }

    // Wall overlays — pick 1-2 walls based on seed
    const wallCount = 1 + (rng() > 0.5 ? 1 : 0);
    const wallConfigs = shuffleWalls(seed, width, height, depth);

    for (let i = 0; i < wallCount && i < wallConfigs.length; i++) {
      const wall = wallConfigs[i];
      // Generate a unique texture per wall for variety
      const wallTexture = textureGen.generateTexture(circuitry);
      const mat = createCircuitryMaterial(wallTexture);
      const geo = new THREE.PlaneGeometry(
        wall.width * 0.85,
        wall.height * 0.85,
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(wall.position);
      mesh.rotation.copy(wall.rotation);
      result.meshes.push(mesh);
      result.materials.push(mat);
      result.textures.push(wallTexture);
    }

    materialsRef.current = result.materials;
    return result;
  }, [enabled, circuitry, dimensions, seed, roomIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlays) {
        overlays.meshes.forEach((m) => m.geometry.dispose());
        overlays.materials.forEach((m) => m.dispose());
        overlays.textures.forEach((t) => t.dispose());
      }
    };
  }, [overlays]);

  // Update audio uniforms each frame
  useFrame((state) => {
    const mats = materialsRef.current;
    if (!mats.length) return;

    const time = state.clock.elapsedTime;
    const audio = {
      bass: audioLevels.bass,
      mid: audioLevels.mid,
      high: audioLevels.high,
    };

    for (const mat of mats) {
      updateCircuitryMaterial(mat, time, audio);
    }
  });

  if (!overlays || !enabled) return null;

  return (
    <group ref={groupRef}>
      {overlays.meshes.map((mesh, i) => (
        <primitive key={`circuit-${roomIndex}-${i}`} object={mesh} />
      ))}
    </group>
  );
}

// Simple seeded RNG for wall selection
function seedRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Get wall configurations for overlay placement
function shuffleWalls(
  seed: number,
  width: number,
  height: number,
  depth: number,
): Array<{
  width: number;
  height: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}> {
  const walls = [
    {
      width,
      height,
      position: new THREE.Vector3(0, height / 2, -depth / 2 + 0.02),
      rotation: new THREE.Euler(0, 0, 0),
    },
    {
      width,
      height,
      position: new THREE.Vector3(0, height / 2, depth / 2 - 0.02),
      rotation: new THREE.Euler(0, Math.PI, 0),
    },
    {
      width: depth,
      height,
      position: new THREE.Vector3(width / 2 - 0.02, height / 2, 0),
      rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    },
    {
      width: depth,
      height,
      position: new THREE.Vector3(-width / 2 + 0.02, height / 2, 0),
      rotation: new THREE.Euler(0, Math.PI / 2, 0),
    },
  ];

  // Shuffle using seed
  const rng = seedRng(seed + 999);
  for (let i = walls.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [walls[i], walls[j]] = [walls[j], walls[i]];
  }

  return walls;
}

export default CircuitryOverlay;
