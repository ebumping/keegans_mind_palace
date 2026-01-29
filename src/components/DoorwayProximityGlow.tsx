/**
 * DoorwayProximityGlow Component
 *
 * Renders a proximity-based glow effect on doorways that intensifies
 * as the player approaches. Provides visual feedback that a doorway
 * is near and traversable, creating a subtle "pull" toward exits.
 *
 * - Faint ambient glow at rest
 * - Intensifies as player approaches (0-4 units)
 * - Pulses gently with audio reactivity
 * - Color shifts from cool (far) to warm (close)
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DoorwayPlacement, RoomDimensions } from '../types/room';
import { useAudioLevels } from '../store/audioStore';
import { getNavigationSystem } from '../systems/NavigationSystem';

interface DoorwayProximityGlowProps {
  doorways: DoorwayPlacement[];
  roomDimensions: RoomDimensions;
  enabled?: boolean;
}

export function DoorwayProximityGlow({
  doorways,
  roomDimensions,
  enabled = true,
}: DoorwayProximityGlowProps) {
  if (!enabled || doorways.length === 0) return null;

  return (
    <group>
      {doorways.map((doorway, i) => (
        <SingleDoorwayGlow
          key={i}
          doorway={doorway}
          doorwayIndex={i}
          roomDimensions={roomDimensions}
        />
      ))}
    </group>
  );
}

function SingleDoorwayGlow({
  doorway,
  doorwayIndex,
  roomDimensions,
}: {
  doorway: DoorwayPlacement;
  doorwayIndex: number;
  roomDimensions: RoomDimensions;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const audioLevels = useAudioLevels();

  // Calculate doorway position in world space
  const { position, rotation } = useMemo(() => {
    const { width, depth } = roomDimensions;
    let x = 0, z = 0, ry = 0;

    switch (doorway.wall) {
      case 'north':
        x = (doorway.position - 0.5) * width;
        z = -depth / 2;
        ry = 0;
        break;
      case 'south':
        x = (doorway.position - 0.5) * width;
        z = depth / 2;
        ry = Math.PI;
        break;
      case 'east':
        x = width / 2;
        z = (doorway.position - 0.5) * depth;
        ry = -Math.PI / 2;
        break;
      case 'west':
        x = -width / 2;
        z = (doorway.position - 0.5) * depth;
        ry = Math.PI / 2;
        break;
    }

    return {
      position: new THREE.Vector3(x, doorway.height / 2, z),
      rotation: new THREE.Euler(0, ry, 0),
    };
  }, [doorway, roomDimensions]);

  // Glow shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_proximity: { value: 0 },
        u_audio: { value: 0 },
        u_colorFar: { value: new THREE.Color('#4a6cf5') },   // Cool blue when far
        u_colorNear: { value: new THREE.Color('#c792f5') },  // Warm purple when near
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_proximity;
        uniform float u_audio;
        uniform vec3 u_colorFar;
        uniform vec3 u_colorNear;
        varying vec2 vUv;

        void main() {
          vec2 centered = vUv - 0.5;
          float dist = length(centered);

          // Soft edge falloff from center
          float edgeFade = 1.0 - smoothstep(0.0, 0.5, dist);

          // Vertical gradient - stronger at bottom (floor glow)
          float vertGrad = 1.0 - vUv.y * 0.3;

          // Base ambient glow (always visible, very faint)
          float ambient = 0.08;

          // Proximity-based intensity
          float proxIntensity = u_proximity * u_proximity; // Quadratic falloff feels more natural

          // Gentle pulse
          float pulse = 0.5 + 0.5 * sin(u_time * 2.0 + u_proximity * 3.0);
          float pulsed = proxIntensity * (0.85 + 0.15 * pulse);

          // Audio boost
          float audioBoost = 1.0 + u_audio * 0.4;

          // Final intensity
          float intensity = (ambient + pulsed * 0.9) * edgeFade * vertGrad * audioBoost;

          // Color blend from cool to warm based on proximity
          vec3 color = mix(u_colorFar, u_colorNear, proxIntensity);

          // Add subtle white core at high proximity
          vec3 core = vec3(1.0) * proxIntensity * edgeFade * 0.15;
          color += core;

          gl_FragColor = vec4(color * intensity, intensity * 0.7);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame(() => {
    // Get proximity from navigation system
    const navSystem = getNavigationSystem();
    const proximityMap = navSystem.getDoorwayProximity();
    const proximity = proximityMap.get(doorwayIndex) ?? 0;

    // Update uniforms
    if (material.uniforms) {
      material.uniforms.u_time.value = Date.now() * 0.001;
      material.uniforms.u_proximity.value = proximity;
      material.uniforms.u_audio.value =
        audioLevels.bass * 0.5 + audioLevels.mid * 0.3;
    }

    // Update point light intensity based on proximity
    if (pointLightRef.current) {
      const lightIntensity = 0.1 + proximity * proximity * 2.0;
      pointLightRef.current.intensity = lightIntensity;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]} rotation={rotation}>
      {/* Glow plane at doorway */}
      <mesh ref={meshRef} material={material}>
        <planeGeometry args={[doorway.width * 1.2, doorway.height * 1.1]} />
      </mesh>

      {/* Point light for casting glow on surroundings */}
      <pointLight
        ref={pointLightRef}
        color="#8a7cf5"
        intensity={0.1}
        distance={3}
        decay={2}
      />
    </group>
  );
}

export default DoorwayProximityGlow;
