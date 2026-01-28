/**
 * AtmosphereLights Component
 *
 * Provides audio-reactive lighting for the room:
 * - Point lights that flicker/pulse with mid frequencies
 * - Shadow intensity modulation based on overall audio level
 * - Ambient occlusion effect that deepens with bass intensity
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevels, useAudioSmooth } from '../store/audioStore';

// Pale-strata color palette
const COLORS = {
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
  warm: new THREE.Color('#ffe4b5'), // Warm light for realism
};

interface LightConfig {
  position: [number, number, number];
  intensity: number;
  color: THREE.Color;
  flickerSpeed: number;
  flickerAmount: number;
}

interface AtmosphereLightsProps {
  roomDimensions?: { width: number; height: number; depth: number };
  lightCount?: number;
  baseIntensity?: number;
  castShadows?: boolean;
}

// Simple noise function for flicker
function noise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return mix(hash(i), hash(i + 1), u);
}

function hash(n: number): number {
  return ((Math.sin(n) * 43758.5453) % 1 + 1) % 1;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function AtmosphereLights({
  roomDimensions = { width: 10, height: 4, depth: 10 },
  lightCount = 3,
  baseIntensity = 0.8,
  castShadows = true,
}: AtmosphereLightsProps) {
  const lightsRef = useRef<THREE.PointLight[]>([]);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);

  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();

  // Generate light configurations based on room dimensions
  const lightConfigs = useMemo((): LightConfig[] => {
    const { width, height, depth } = roomDimensions;
    const configs: LightConfig[] = [];

    // Create lights distributed across the room
    for (let i = 0; i < lightCount; i++) {
      const t = lightCount > 1 ? i / (lightCount - 1) : 0.5;

      // Distribute along the ceiling
      const x = (t - 0.5) * width * 0.7;
      const y = height * 0.85; // Near ceiling
      const z = (Math.sin(i * 2.5) * 0.3) * depth;

      // Alternate between primary and secondary colors
      const color = i % 2 === 0 ? COLORS.primary.clone() : COLORS.secondary.clone();
      // Mix with warm light for realism
      color.lerp(COLORS.warm, 0.3);

      configs.push({
        position: [x, y, z],
        intensity: baseIntensity * (0.8 + Math.random() * 0.4),
        color,
        flickerSpeed: 2 + Math.random() * 3,
        flickerAmount: 0.1 + Math.random() * 0.2,
      });
    }

    return configs;
  }, [roomDimensions, lightCount, baseIntensity]);

  // Update lights each frame
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const mid = audioLevels.mid;
    const midSmooth = audioSmooth.midSmooth;
    const bassSmooth = audioSmooth.bassSmooth;
    const overall = audioLevels.overall;

    // Update each point light
    lightConfigs.forEach((config, index) => {
      const light = lightsRef.current[index];
      if (!light) return;

      // Calculate flicker based on time and audio
      const baseFlicker = noise(time * config.flickerSpeed + index * 100);
      const fastFlicker = noise(time * config.flickerSpeed * 3.7 + index * 50);
      const flicker = baseFlicker * 0.7 + fastFlicker * 0.3;

      // Audio modulation - mid frequencies drive pulsing
      const audioMod = 1 + midSmooth * 0.4;

      // Apply flicker with audio influence
      // Higher mid frequencies increase flicker intensity
      const flickerAmount = config.flickerAmount * (1 + mid * 0.5);
      const flickerMultiplier = 1 - flickerAmount * (1 - flicker);

      // Final intensity
      light.intensity = config.intensity * audioMod * flickerMultiplier;

      // Shadow intensity modulation based on overall audio level
      if (light.shadow && castShadows) {
        // Shadows get sharper/darker on louder sounds
        const shadowIntensity = 0.3 + overall * 0.5;
        light.shadow.intensity = shadowIntensity;
      }
    });

    // Update ambient light - bass deepens "darkness" (reduces ambient)
    if (ambientRef.current) {
      // Bass reduces ambient light, creating darker corners (pseudo-AO)
      const ambientIntensity = 0.25 - bassSmooth * 0.12;
      ambientRef.current.intensity = Math.max(0.08, ambientIntensity);
    }

    // Update hemisphere light for bass-reactive ambient occlusion effect
    if (hemisphereRef.current) {
      // Ground color gets darker with bass (simulates deeper shadows at floor level)
      const groundDarkness = bassSmooth * 0.4;
      hemisphereRef.current.groundColor.setRGB(
        0.05 - groundDarkness * 0.03,
        0.05 - groundDarkness * 0.03,
        0.08 - groundDarkness * 0.05
      );

      // Sky color pulses slightly with mid
      hemisphereRef.current.intensity = 0.15 + midSmooth * 0.1;
    }
  });

  return (
    <group>
      {/* Ambient light - reduced by bass for pseudo-AO */}
      <ambientLight ref={ambientRef} intensity={0.25} />

      {/* Hemisphere light for directional ambient */}
      <hemisphereLight
        ref={hemisphereRef}
        args={[0x3a3861, 0x1a1834, 0.15]} // Sky: gradient start, Ground: background
      />

      {/* Dynamic point lights */}
      {lightConfigs.map((config, index) => (
        <pointLight
          key={index}
          ref={(el) => {
            if (el) lightsRef.current[index] = el;
          }}
          position={config.position}
          intensity={config.intensity}
          color={config.color}
          distance={15}
          decay={2}
          castShadow={castShadows}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-bias={-0.001}
        />
      ))}
    </group>
  );
}

export default AtmosphereLights;
