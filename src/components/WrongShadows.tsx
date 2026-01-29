/**
 * WrongShadows Component
 *
 * Implements shadow direction anomalies from the wrongness system.
 * Places directional lights that cast shadows from impossible angles —
 * light coming from below, shadows pointing toward their source,
 * multiple contradictory shadow directions in the same room.
 *
 * The effect is subtle but deeply unsettling: your shadow shouldn't
 * be pointing that way. The light is wrong.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import { useGrowlIntensity } from '../store/timeStore';
import type { RoomDimensions } from '../types/room';
import { WrongnessLevel } from '../types/room';

interface WrongShadowsProps {
  dimensions: RoomDimensions;
  wrongnessLevel: number;
  seed: number;
}

interface WrongLightConfig {
  position: THREE.Vector3;
  target: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
}

export function WrongShadows({ dimensions, wrongnessLevel, seed }: WrongShadowsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const growlIntensity = useGrowlIntensity();

  const lights = useMemo(() => {
    const rng = new SeededRandom(seed);
    const configs: WrongLightConfig[] = [];
    const { width, height, depth } = dimensions;

    // Number of wrong shadow lights scales with wrongness
    const count = wrongnessLevel >= WrongnessLevel.SURREAL ? 3 :
                  wrongnessLevel >= WrongnessLevel.UNSETTLING ? 2 : 1;

    for (let i = 0; i < count; i++) {
      // Wrong light positions — deliberately impossible angles
      const wrongType = rng.int(0, 3);
      let pos: THREE.Vector3;
      let target: THREE.Vector3;

      switch (wrongType) {
        case 0:
          // Light from below the floor — shadows cast upward
          pos = new THREE.Vector3(
            rng.range(-width / 3, width / 3),
            -2,
            rng.range(-depth / 3, depth / 3)
          );
          target = new THREE.Vector3(0, height, 0);
          break;
        case 1:
          // Light from a corner at floor level — wrong horizontal angle
          pos = new THREE.Vector3(
            rng.pick([-1, 1]) * width / 2,
            0.1,
            rng.pick([-1, 1]) * depth / 2
          );
          target = new THREE.Vector3(
            -pos.x * 0.5,
            height * 0.6,
            -pos.z * 0.5
          );
          break;
        case 2:
          // Light from inside a wall — casting outward
          pos = new THREE.Vector3(
            rng.pick([-1, 1]) * (width / 2 + 1),
            height * rng.range(0.3, 0.7),
            rng.range(-depth / 4, depth / 4)
          );
          target = new THREE.Vector3(0, 0, 0);
          break;
        default:
          // Light from directly behind where you entered
          pos = new THREE.Vector3(0, height * 0.8, depth / 2 + 2);
          target = new THREE.Vector3(0, 0, -depth / 2);
          break;
      }

      // Wrong-colored light — too warm, too cold, or tinted
      const wrongColors = [
        new THREE.Color('#ffaa44'), // Too warm orange
        new THREE.Color('#4466ff'), // Cold blue
        new THREE.Color('#88ff88'), // Sickly green
        new THREE.Color('#ff88ff'), // Unnatural pink
      ];

      configs.push({
        position: pos,
        target,
        color: wrongnessLevel >= WrongnessLevel.SURREAL
          ? rng.pick(wrongColors)
          : new THREE.Color('#ddd8cc'), // Subtle wrongness: slightly off-white
        intensity: 0.3 + (wrongnessLevel - 1) * 0.15,
      });
    }

    return configs;
  }, [dimensions, wrongnessLevel, seed]);

  // Animate intensity with Growl
  const stateRef = useRef({ time: 0 });

  useFrame((_, delta) => {
    stateRef.current.time += delta;
    if (!groupRef.current) return;

    // Flicker shadow lights at high Growl
    const flickerBase = growlIntensity > 0.5
      ? Math.sin(stateRef.current.time * 8) * 0.15 * growlIntensity
      : 0;

    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.DirectionalLight) {
        const baseIntensity = (child.userData as { baseIntensity?: number }).baseIntensity ?? 0.4;
        child.intensity = baseIntensity + flickerBase;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {lights.map((light, index) => (
        <directionalLight
          key={`wrong-shadow-${index}`}
          position={light.position}
          target-position={light.target}
          color={light.color}
          intensity={light.intensity}
          castShadow
          shadow-mapSize-width={256}
          shadow-mapSize-height={256}
          shadow-camera-near={0.1}
          shadow-camera-far={dimensions.width + dimensions.depth}
          shadow-camera-left={-dimensions.width / 2}
          shadow-camera-right={dimensions.width / 2}
          shadow-camera-top={dimensions.height}
          shadow-camera-bottom={0}
          userData={{ baseIntensity: light.intensity }}
        />
      ))}
    </group>
  );
}

export default WrongShadows;
