/**
 * DoorwayShimmer Component
 *
 * Renders a glowing shimmer effect on doorways that lead to variation-affected rooms.
 * The shimmer color and intensity indicate how extreme the variation will be:
 * - Subtle (Level 1): Faint purple glow
 * - Noticeable (Level 2): Purple-pink shimmer
 * - Unsettling (Level 3): Pinkish pulsing ring
 * - Surreal (Level 4): Reddish crackling edge
 * - Bizarre (Level 5): Bright red distortion field
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DoorwayPlacement, RoomDimensions } from '../types/room';
import { useAudioLevels } from '../store/audioStore';
import {
  getPortalVariationSystem,
  getShimmerIntensity,
  getShimmerColor,
  useVariationStore,
} from '../systems/PortalVariationSystem';

interface DoorwayShimmerProps {
  doorways: DoorwayPlacement[];
  roomDimensions: RoomDimensions;
  enabled?: boolean;
}

export function DoorwayShimmer({ doorways, roomDimensions, enabled = true }: DoorwayShimmerProps) {
  if (!enabled || doorways.length === 0) return null;

  return (
    <group>
      {doorways.map((doorway, i) => (
        <SingleDoorwayShimmer
          key={i}
          doorway={doorway}
          roomDimensions={roomDimensions}
        />
      ))}
    </group>
  );
}

function SingleDoorwayShimmer({
  doorway,
  roomDimensions,
}: {
  doorway: DoorwayPlacement;
  roomDimensions: RoomDimensions;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const audioLevels = useAudioLevels();

  // Get variation state for the room this doorway leads to
  const targetRoomId = doorway.leadsTo;
  const variationState = useVariationStore((s) => s.states.get(targetRoomId));

  // Calculate shimmer properties
  const level = variationState?.variationLevel ?? 0;
  const shimmerIntensity = getShimmerIntensity(level);
  const shimmerColor = useMemo(() => getShimmerColor(level), [level]);

  // Calculate doorway position in world space
  const position = useMemo(() => {
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

    return { x, y: doorway.height / 2, z, ry };
  }, [doorway, roomDimensions]);

  // Shimmer shader
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: shimmerIntensity },
        u_color: { value: shimmerColor },
        u_audio: { value: 0 },
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
        uniform float u_intensity;
        uniform vec3 u_color;
        uniform float u_audio;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;
          vec2 centered = uv - 0.5;
          float dist = length(centered);

          // Edge ring effect
          float ring = smoothstep(0.5, 0.35, dist) - smoothstep(0.4, 0.15, dist);

          // Pulsing animation
          float angle = atan(centered.y, centered.x);
          float pulse = 0.5 + 0.5 * sin(u_time * 3.0 + angle * 4.0);

          // Noise shimmer
          float noise = hash(uv * 10.0 + u_time);

          // Combine
          float shimmer = ring * pulse * u_intensity;
          shimmer += noise * 0.1 * u_intensity * ring;

          // Audio boost
          shimmer *= 1.0 + u_audio * 0.5;

          // Inner glow
          float innerGlow = smoothstep(0.5, 0.0, dist) * u_intensity * 0.15;

          vec3 color = u_color * (shimmer + innerGlow);
          float alpha = shimmer * 0.8 + innerGlow;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [shimmerIntensity, shimmerColor]);

  useFrame(() => {
    if (material.uniforms) {
      material.uniforms.u_time.value = Date.now() * 0.001;
      material.uniforms.u_audio.value = audioLevels.bass * 0.5 + audioLevels.transientIntensity * 0.3;
    }
  });

  // Don't render if no variation
  if (shimmerIntensity === 0) return null;

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      rotation={[0, position.ry, 0]}
      material={material}
    >
      <planeGeometry args={[doorway.width * 1.1, doorway.height * 1.05]} />
    </mesh>
  );
}

export default DoorwayShimmer;
