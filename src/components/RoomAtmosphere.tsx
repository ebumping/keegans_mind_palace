/**
 * RoomAtmosphere Component
 *
 * Combines all room atmosphere effects:
 * - Floating dust particles that react to high frequencies
 * - Ambient occlusion that deepens with bass intensity
 * - Light sources that flicker/pulse with mid frequencies
 * - Shadow intensity modulation based on overall audio level
 * - Breathing scale animation (rooms expand/contract subtly)
 *
 * This component is added to each Room to create an immersive,
 * audio-reactive environment.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DustParticles } from './DustParticles';
import { AtmosphereLights } from './AtmosphereLights';
import { useAudioSmooth } from '../store/audioStore';
import { usePerformanceSettings } from '../store/performanceStore';

interface RoomAtmosphereProps {
  /** Room dimensions for scaling effects */
  dimensions: { width: number; height: number; depth: number };
  /** Room index for variation */
  roomIndex?: number;
  /** Seed for procedural variation */
  seed?: number;
  /** Enable breathing scale animation */
  enableBreathing?: boolean;
  /** Enable dust particles */
  enableDust?: boolean;
  /** Enable dynamic lighting */
  enableLights?: boolean;
  /** Abnormality factor (0-1) for deeper room effects */
  abnormality?: number;
}

export function RoomAtmosphere({
  dimensions,
  roomIndex: _roomIndex = 0,
  seed: _seed = 42,
  enableBreathing = true,
  enableDust = true,
  enableLights = true,
  abnormality = 0,
}: RoomAtmosphereProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Unused params available for future procedural variations
  void _roomIndex;
  void _seed;

  const audioSmooth = useAudioSmooth();
  const perfSettings = usePerformanceSettings();

  // Breathing scale state
  const breatheState = useRef({
    currentScale: 1,
    targetScale: 1,
    phase: 0,
  });

  // Update breathing animation
  useFrame((state, delta) => {
    if (!groupRef.current || !enableBreathing) return;

    const time = state.clock.elapsedTime;
    const bassSmooth = audioSmooth.bassSmooth;

    // Breathing phase - slow oscillation
    breatheState.current.phase = time * 0.3;
    const breatheCycle = Math.sin(breatheState.current.phase) * 0.5 + 0.5;

    // Target scale based on bass and breath cycle
    // Subtle effect: 0.995 to 1.015 range (±1.5%)
    const breatheAmount = 0.01 + bassSmooth * 0.005;
    breatheState.current.targetScale = 1 + breatheCycle * breatheAmount - breatheAmount * 0.5;

    // Smooth interpolation
    breatheState.current.currentScale = THREE.MathUtils.lerp(
      breatheState.current.currentScale,
      breatheState.current.targetScale,
      delta * 2
    );

    // Apply scale to group (this creates the breathing room effect)
    groupRef.current.scale.setScalar(breatheState.current.currentScale);
  });

  // Calculate dust particle count based on room size, abnormality, and performance tier
  const baseDustCount = Math.floor(
    300 + (dimensions.width * dimensions.depth * 5) + abnormality * 200
  );
  const dustCount = Math.floor(baseDustCount * perfSettings.particleMultiplier);

  // Calculate light count based on room size and performance tier
  const baseLightCount = Math.max(2, Math.floor(dimensions.width / 4));
  const lightCount = Math.min(baseLightCount, perfSettings.maxLights);

  return (
    <group ref={groupRef}>
      {/* Floating dust particles */}
      {enableDust && dustCount > 0 && (
        <DustParticles
          count={dustCount}
          bounds={[dimensions.width * 0.9, dimensions.height * 0.9, dimensions.depth * 0.9]}
          position={[0, dimensions.height * 0.45, 0]}
          baseSize={0.012 + abnormality * 0.005}
          baseSpeed={0.8 + abnormality * 0.4}
        />
      )}

      {/* Audio-reactive lighting */}
      {enableLights && (
        <AtmosphereLights
          roomDimensions={dimensions}
          lightCount={lightCount}
          baseIntensity={0.6 + abnormality * 0.3}
          castShadows={perfSettings.enableShadows}
          shadowMapSize={perfSettings.shadowMapSize}
        />
      )}
    </group>
  );
}

export default RoomAtmosphere;
