/**
 * DustParticles Component
 *
 * Floating dust particles that react to high frequencies.
 * Creates an ethereal, liminal atmosphere within the room.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevels, useAudioSmooth } from '../store/audioStore';

// Pale-strata color palette
const COLORS = {
  primary: '#c792f5',
  secondary: '#8eecf5',
};

interface DustParticlesProps {
  count?: number;
  bounds?: [number, number, number]; // [width, height, depth]
  position?: [number, number, number];
  baseSize?: number;
  baseSpeed?: number;
}

// Vertex shader for dust particles
const dustVertexShader = `
  attribute float size;
  attribute float speed;
  attribute vec3 velocity;

  uniform float u_time;
  uniform float u_high;
  uniform float u_highSmooth;

  varying float vAlpha;
  varying float vSize;

  void main() {
    vec3 pos = position;

    // Base floating motion
    float floatOffset = sin(u_time * speed * 0.5 + position.x * 2.0) * 0.1;
    floatOffset += cos(u_time * speed * 0.3 + position.z * 1.5) * 0.08;
    pos.y += floatOffset;

    // Horizontal drift
    pos.x += sin(u_time * speed * 0.2 + position.y) * 0.05;
    pos.z += cos(u_time * speed * 0.25 + position.y * 0.8) * 0.05;

    // High frequency reaction - particles scatter/shimmer
    float highReaction = u_high * 0.3;
    pos += velocity * highReaction * sin(u_time * 5.0 + position.x * 10.0);

    // Audio-reactive size boost
    float audioSize = size * (1.0 + u_highSmooth * 0.8);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation based on distance
    gl_PointSize = audioSize * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 20.0);

    // Alpha based on high frequency and distance
    vAlpha = 0.3 + u_highSmooth * 0.5;
    vSize = audioSize;
  }
`;

// Fragment shader for dust particles
const dustFragmentShader = `
  uniform vec3 u_colorPrimary;
  uniform vec3 u_colorSecondary;
  uniform float u_high;

  varying float vAlpha;
  varying float vSize;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);

    // Soft edge falloff
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    alpha *= vAlpha;

    // Color interpolation based on high frequency
    vec3 color = mix(u_colorPrimary, u_colorSecondary, u_high * 0.6);

    // Add glow at center
    float glow = 1.0 - smoothstep(0.0, 0.3, dist);
    color += glow * u_colorSecondary * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function DustParticles({
  count = 500,
  bounds = [10, 5, 10],
  position = [0, 0, 0],
  baseSize = 0.015,
  baseSpeed = 1.0,
}: DustParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();

  // Create particle geometry with attributes
  const { geometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const szs = new Float32Array(count);
    const spds = new Float32Array(count);
    const vels = new Float32Array(count * 3);

    const [width, height, depth] = bounds;

    for (let i = 0; i < count; i++) {
      // Random position within bounds (centered)
      pos[i * 3] = (Math.random() - 0.5) * width;
      pos[i * 3 + 1] = Math.random() * height;
      pos[i * 3 + 2] = (Math.random() - 0.5) * depth;

      // Random size variation
      szs[i] = baseSize * (0.5 + Math.random() * 1.0);

      // Random speed variation
      spds[i] = baseSpeed * (0.5 + Math.random() * 1.0);

      // Random velocity direction for high-frequency scatter
      vels[i * 3] = (Math.random() - 0.5) * 2;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 2;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(szs, 1));
    geo.setAttribute('speed', new THREE.BufferAttribute(spds, 1));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vels, 3));

    return { geometry: geo };
  }, [count, bounds, baseSize, baseSpeed]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_high: { value: 0 },
        u_highSmooth: { value: 0 },
        u_colorPrimary: { value: new THREE.Color(COLORS.primary) },
        u_colorSecondary: { value: new THREE.Color(COLORS.secondary) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Update uniforms each frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.u_high.value = audioLevels.high;
      materialRef.current.uniforms.u_highSmooth.value = audioSmooth.highSmooth;
    }
  });

  return (
    <points ref={pointsRef} position={position}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" ref={materialRef} />
    </points>
  );
}

export default DustParticles;
