/**
 * VariationEffects Component
 *
 * Renders visual effects for portal variation levels 1-5:
 * - Level 1 (Subtle): Light color shifts, ceiling height already applied via config
 * - Level 2 (Noticeable): Extra geometry, room stretching already applied via config
 * - Level 3 (Unsettling): UV-flipped text planes, impossible shadow lights
 * - Level 4 (Surreal): Gravity tilt indicator, infinite regression mirrors, self-reflection ghost
 * - Level 5 (Bizarre): Reality tear void, dimension bleed color override, void room fog
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoomConfig, RoomDimensions, VariationChangeRef } from '../types/room';
import { useAudioLevels } from '../store/audioStore';

interface VariationEffectsProps {
  roomConfig: RoomConfig;
  enabled?: boolean;
}

export function VariationEffects({ roomConfig, enabled = true }: VariationEffectsProps) {
  if (!enabled || !roomConfig.variationLevel || roomConfig.variationLevel === 0) {
    return null;
  }

  const changes = (roomConfig.variationChanges ?? []) as VariationChangeRef[];
  const level = roomConfig.variationLevel;

  return (
    <group>
      {/* Level 1: Light color shift overlay */}
      {level >= 1 && roomConfig.lightColorShift && (
        <LightColorShift
          dimensions={roomConfig.dimensions}
          shift={roomConfig.lightColorShift}
        />
      )}

      {/* Level 3: Impossible shadow — light from wrong direction */}
      {changes.some(c => c.kind === 'impossible_shadow') && (
        <ImpossibleShadow
          dimensions={roomConfig.dimensions}
          change={changes.find(c => c.kind === 'impossible_shadow')!}
        />
      )}

      {/* Level 3: Text reversal indicator — mirrored text planes on walls */}
      {roomConfig.textReversed && (
        <ReversedTextOverlay dimensions={roomConfig.dimensions} seed={roomConfig.seed} />
      )}

      {/* Level 4: Gravity shift visual — tilted particle field */}
      {roomConfig.gravityShift && (
        <GravityShiftEffect
          dimensions={roomConfig.dimensions}
          direction={roomConfig.gravityShift}
        />
      )}

      {/* Level 4: Infinite regression — recursive room views */}
      {changes.some(c => c.kind === 'infinite_regression') && (
        <InfiniteRegression
          dimensions={roomConfig.dimensions}
          depth={(changes.find(c => c.kind === 'infinite_regression') as VariationChangeRef & { depth?: number })?.depth ?? 5}
        />
      )}

      {/* Level 4: Self reflection — ghostly figure */}
      {changes.some(c => c.kind === 'self_reflection') && (
        <SelfReflection
          change={changes.find(c => c.kind === 'self_reflection')!}
        />
      )}

      {/* Level 5: Reality tear — void rip in space */}
      {changes.some(c => c.kind === 'reality_tear') && (
        <RealityTear
          change={changes.find(c => c.kind === 'reality_tear')!}
        />
      )}

      {/* Level 5: Void room — darkness engulfs */}
      {roomConfig.voidIntensity != null && roomConfig.voidIntensity > 0 && (
        <VoidRoom
          dimensions={roomConfig.dimensions}
          intensity={roomConfig.voidIntensity}
        />
      )}

      {/* Level 5: Dimension bleed — alternate aesthetic color wash */}
      {roomConfig.dimensionBleed && (
        <DimensionBleed
          dimensions={roomConfig.dimensions}
          aesthetic={roomConfig.dimensionBleed}
        />
      )}
    </group>
  );
}

// ===== Level 1: Light Color Shift =====

function LightColorShift({ dimensions, shift }: { dimensions: RoomDimensions; shift: number }) {
  // Subtle colored point light that tints the room
  const color = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    const base = new THREE.Color('#c792f5');
    base.getHSL(hsl);
    hsl.h = (hsl.h + shift / 360) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.6, hsl.l);
  }, [shift]);

  return (
    <pointLight
      position={[0, dimensions.height * 0.8, 0]}
      color={color}
      intensity={0.3}
      distance={Math.max(dimensions.width, dimensions.depth) * 1.5}
    />
  );
}

// ===== Level 3: Impossible Shadow =====

function ImpossibleShadow({ change }: { dimensions: RoomDimensions; change: VariationChangeRef }) {
  const pos = change.sourcePosition as { x: number; y: number; z: number } | undefined;
  if (!pos) return null;

  return (
    <directionalLight
      position={[pos.x, pos.y, pos.z]}
      intensity={0.4}
      color="#4a2080"
      castShadow
      shadow-mapSize={[256, 256]}
    />
  );
}

// ===== Level 3: Reversed Text Overlay =====

function ReversedTextOverlay({ dimensions, seed }: { dimensions: RoomDimensions; seed: number }) {
  // Place mirrored warning text on walls — just mirrored planes with text-like patterns
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#e070a0',
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
  }, []);

  // Create a few reversed text indicator planes
  const planes = useMemo(() => {
    const items: { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }[] = [];
    const rng = mulberry32(seed + 33333);

    for (let i = 0; i < 3; i++) {
      const wall = i % 4;
      let x = 0, z = 0, ry = 0;
      const w = dimensions.width / 2;
      const d = dimensions.depth / 2;

      if (wall === 0) { x = (rng() - 0.5) * w; z = -d + 0.02; ry = 0; }
      else if (wall === 1) { x = (rng() - 0.5) * w; z = d - 0.02; ry = Math.PI; }
      else if (wall === 2) { x = w - 0.02; z = (rng() - 0.5) * d; ry = -Math.PI / 2; }
      else { x = -w + 0.02; z = (rng() - 0.5) * d; ry = Math.PI / 2; }

      items.push({
        pos: [x, dimensions.height * 0.6, z],
        rot: [0, ry, 0],
        scale: [-0.8, 0.3, 1], // Negative X scale = mirrored
      });
    }

    return items;
  }, [dimensions, seed]);

  return (
    <group ref={groupRef}>
      {planes.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot} scale={p.scale} material={material}>
          <planeGeometry args={[1.5, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

// ===== Level 4: Gravity Shift Effect =====

function GravityShiftEffect({ dimensions, direction }: { dimensions: RoomDimensions; direction: { x: number; y: number; z: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioLevels = useAudioLevels();

  // Floating dust particles that drift in the gravity direction
  const particles = useMemo(() => {
    const count = 30;
    const positions: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      positions.push([
        (Math.random() - 0.5) * dimensions.width * 0.8,
        Math.random() * dimensions.height,
        (Math.random() - 0.5) * dimensions.depth * 0.8,
      ]);
    }
    return positions;
  }, [dimensions]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Slowly drift particles in gravity direction
    const speed = 0.3 + audioLevels.bass * 0.5;
    groupRef.current.children.forEach((child) => {
      child.position.x += direction.x * delta * speed;
      child.position.y += direction.y * delta * speed * 0.5;
      child.position.z += direction.z * delta * speed;

      // Wrap particles
      const hw = dimensions.width / 2;
      const hd = dimensions.depth / 2;
      if (child.position.x > hw) child.position.x = -hw;
      if (child.position.x < -hw) child.position.x = hw;
      if (child.position.z > hd) child.position.z = -hd;
      if (child.position.z < -hd) child.position.z = hd;
      if (child.position.y > dimensions.height) child.position.y = 0;
      if (child.position.y < 0) child.position.y = dimensions.height;
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#ff5050" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ===== Level 4: Infinite Regression =====

function InfiniteRegression({ dimensions, depth }: { dimensions: RoomDimensions; depth: number }) {
  // Nested scaled-down room outlines receding into the distance
  const frames = useMemo(() => {
    const items: { scale: number; opacity: number; z: number }[] = [];
    for (let i = 1; i <= Math.min(depth, 7); i++) {
      const s = Math.pow(0.7, i);
      items.push({
        scale: s,
        opacity: 1 - (i / (depth + 1)),
        z: -i * 2.5,
      });
    }
    return items;
  }, [depth]);

  return (
    <group position={[0, dimensions.height / 2, -dimensions.depth / 2 + 0.5]}>
      {frames.map((f, i) => (
        <mesh key={i} position={[0, 0, f.z]} scale={[f.scale, f.scale, 1]}>
          <planeGeometry args={[dimensions.width * 0.9, dimensions.height * 0.9]} />
          <meshBasicMaterial
            color="#c792f5"
            transparent
            opacity={f.opacity * 0.15}
            wireframe
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ===== Level 4: Self Reflection =====

function SelfReflection({ change }: { change: VariationChangeRef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = change.position as { x: number; y: number; z: number } | undefined;
  const audioLevels = useAudioLevels();

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    // Ghostly figure slowly rotates to face the camera direction
    meshRef.current.rotation.y += delta * 0.2;
    // Slight hover
    meshRef.current.position.y = 0.9 + Math.sin(Date.now() * 0.001) * 0.05;
    // Flicker opacity with audio
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.15 + audioLevels.mid * 0.1;
  });

  if (!pos) return null;

  return (
    <mesh ref={meshRef} position={[pos.x, 0.9, pos.z]}>
      <capsuleGeometry args={[0.25, 1.0, 4, 8]} />
      <meshBasicMaterial color="#3a1860" transparent opacity={0.15} />
    </mesh>
  );
}

// ===== Level 5: Reality Tear =====

function RealityTear({ change }: { change: VariationChangeRef }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pos = change.position as { x: number; y: number; z: number } | undefined;
  const size = (change.size as number) ?? 1.5;
  const audioLevels = useAudioLevels();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0 },
        u_color: { value: new THREE.Color('#ff2020') },
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
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv - 0.5;
          float dist = length(uv);

          // Void center
          float void_mask = smoothstep(0.4, 0.1, dist);

          // Crackling edge
          float edge = smoothstep(0.5, 0.3, dist) - smoothstep(0.35, 0.15, dist);
          float crack = hash(uv * 20.0 + u_time * 2.0) * edge;

          // Pulsing glow
          float pulse = 0.5 + 0.5 * sin(u_time * 3.0);
          float glow = edge * (0.5 + pulse * 0.5) * (1.0 + u_intensity);

          vec3 color = vec3(0.0) * void_mask + u_color * glow + vec3(crack * 0.3);
          float alpha = void_mask * 0.9 + glow * 0.6 + crack * 0.2;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  useFrame(() => {
    if (material.uniforms) {
      material.uniforms.u_time.value = Date.now() * 0.001;
      material.uniforms.u_intensity.value = audioLevels.bass;
    }
  });

  if (!pos) return null;

  return (
    <mesh ref={meshRef} position={[pos.x, pos.y, pos.z]} material={material}>
      <planeGeometry args={[size, size * 1.3]} />
    </mesh>
  );
}

// ===== Level 5: Void Room =====

function VoidRoom({ dimensions, intensity }: { dimensions: RoomDimensions; intensity: number }) {
  // Dark fog sphere that envelops the room
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    // Slowly pulse the void
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = intensity * (0.7 + Math.sin(Date.now() * 0.0005) * 0.1);
  });

  const radius = Math.max(dimensions.width, dimensions.depth) * 0.8;

  return (
    <mesh ref={meshRef} position={[0, dimensions.height / 2, 0]}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial
        color="#000000"
        transparent
        opacity={intensity * 0.7}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ===== Level 5: Dimension Bleed =====

const AESTHETIC_COLORS: Record<string, string> = {
  ps1_horror: '#1a1a2e',
  liminal_office: '#f5f5dc',
  vaporwave: '#ff71ce',
  void_black: '#050505',
  digital_decay: '#ff0000',
};

function DimensionBleed({ dimensions, aesthetic }: { dimensions: RoomDimensions; aesthetic: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = AESTHETIC_COLORS[aesthetic] ?? '#c792f5';
  const audioLevels = useAudioLevels();

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    // Flicker between normal and alternate aesthetic
    const flicker = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    mat.opacity = 0.1 + flicker * 0.15 + audioLevels.high * 0.1;
  });

  return (
    <mesh ref={meshRef} position={[0, dimensions.height / 2, 0]}>
      <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ===== Utility =====

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default VariationEffects;
