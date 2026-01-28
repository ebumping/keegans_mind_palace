/**
 * MelancholicLight Component
 *
 * "Beauty that makes you sad" - lighting that evokes nostalgia and longing.
 *
 * Art Direction Principles:
 * - Golden hour light that streams from nowhere
 * - Dust motes dancing in beams of light
 * - The warmth of a memory that can't be recaptured
 * - Windows to places that don't exist
 * - Light that feels like loss
 *
 * Technical Implementation:
 * - Volumetric light shafts using transparent mesh
 * - Particle systems for dust in light
 * - Color temperature that shifts with Growl
 * - Audio-reactive shimmer
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { SeededRandom } from '../utils/seededRandom';

// Colors that evoke nostalgia and melancholy
const NOSTALGIC_PALETTE = {
  // Golden hour warmth
  goldenHour: new THREE.Color('#ffd89b'),
  sunsetOrange: new THREE.Color('#e8a87c'),
  dustyRose: new THREE.Color('#d4a5a5'),
  // Twilight melancholy
  eveningBlue: new THREE.Color('#7ba7bc'),
  twilightPurple: new THREE.Color('#9b8aa5'),
  // Memory tones
  fadedSepia: new THREE.Color('#c4a77d'),
  lostTime: new THREE.Color('#b8a88a'),
  // Liminal accents
  primary: new THREE.Color('#c792f5'),
  void: new THREE.Color('#1a1834'),
};

interface LightShaftConfig {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  width: number;
  height: number;
  color: THREE.Color;
  opacity: number;
  particleCount: number;
}

interface MelancholicLightProps {
  roomDimensions: { width: number; height: number; depth: number };
  roomIndex: number;
  seed: number;
  enabled?: boolean;
}

/**
 * Create a light shaft geometry (volumetric cone)
 */
function createLightShaftGeometry(width: number, height: number): THREE.BufferGeometry {
  // Truncated pyramid shape for light beam
  const topWidth = width * 0.3; // Narrower at source
  const bottomWidth = width; // Wider at floor

  const geometry = new THREE.BufferGeometry();

  // Define vertices for a tapered quad
  const vertices = new Float32Array([
    // Top edge (light source)
    -topWidth / 2, height, 0,
    topWidth / 2, height, 0,
    // Bottom edge (floor)
    bottomWidth / 2, 0, 0,
    -bottomWidth / 2, 0, 0,
  ]);

  // Two triangles to form quad
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  // UVs for gradient
  const uvs = new Float32Array([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Single light shaft with dust particles
 */
function LightShaft({ config }: { config: LightShaftConfig }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  // Create geometry
  const geometry = useMemo(() => {
    return createLightShaftGeometry(config.width, config.height);
  }, [config.width, config.height]);

  // Create dust particle system
  const { particleGeometry, particlePositions } = useMemo(() => {
    const positions = new Float32Array(config.particleCount * 3);
    const rng = new SeededRandom(config.position.x * 1000 + config.position.z * 100);

    for (let i = 0; i < config.particleCount; i++) {
      // Particles within the light shaft cone
      const t = rng.next(); // 0-1 along height
      const widthAtT = config.width * (0.3 + 0.7 * (1 - t)); // Interpolate width

      positions[i * 3] = rng.range(-widthAtT / 2, widthAtT / 2);
      positions[i * 3 + 1] = t * config.height;
      positions[i * 3 + 2] = rng.range(-0.1, 0.1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return { particleGeometry: geometry, particlePositions: positions };
  }, [config]);

  // Animation state
  const state = useRef({
    time: 0,
    opacityTarget: config.opacity,
  });

  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    state.current.time += delta;

    // Opacity fluctuates gently with audio
    const breathe = Math.sin(state.current.time * 0.5) * 0.1;
    const audioMod = audioSmooth.midSmooth * 0.15;
    state.current.opacityTarget = config.opacity + breathe + audioMod;

    // Clamp opacity
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      state.current.opacityTarget,
      delta * 2
    );

    // Shift color toward purple/liminal at high Growl
    if (growlIntensity > 0.3) {
      const lerpAmount = growlIntensity * 0.3;
      material.color.copy(config.color).lerp(NOSTALGIC_PALETTE.twilightPurple, lerpAmount);
    }

    // Animate dust particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.getAttribute('position');
      const highSmooth = audioSmooth.highSmooth;

      for (let i = 0; i < config.particleCount; i++) {
        const baseY = particlePositions[i * 3 + 1];
        const drift = Math.sin(state.current.time * 0.3 + i * 0.1) * 0.05;
        const audioDrift = highSmooth * Math.sin(state.current.time * 2 + i * 0.5) * 0.03;

        // Gentle upward float + audio agitation
        positions.setY(i, (baseY + drift + audioDrift) % config.height);

        // Slight horizontal drift
        const baseX = particlePositions[i * 3];
        const xDrift = Math.sin(state.current.time * 0.2 + i * 0.2) * 0.02;
        positions.setX(i, baseX + xDrift);
      }

      positions.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} position={config.position} rotation={config.rotation}>
      {/* Light shaft mesh */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={config.opacity}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Dust particles in the light */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          color={config.color}
          size={0.015}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/**
 * Window Light component - light streaming from windows that don't exist
 */
function WindowLight({
  position,
  dimensions,
  seed,
}: {
  position: THREE.Vector3;
  dimensions: { width: number; height: number };
  seed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();
  const rng = new SeededRandom(seed);

  // Animation state
  const state = useRef({
    time: 0,
    baseIntensity: rng.range(0.15, 0.25),
  });

  // Color shifts throughout the "day" (based on Growl/depth)
  const baseColor = useMemo(() => {
    const colors = [
      NOSTALGIC_PALETTE.goldenHour,
      NOSTALGIC_PALETTE.sunsetOrange,
      NOSTALGIC_PALETTE.twilightPurple,
      NOSTALGIC_PALETTE.eveningBlue,
    ];
    return rng.pick(colors);
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    state.current.time += delta;

    const material = meshRef.current.material as THREE.MeshBasicMaterial;

    // Gentle pulsing
    const pulse = Math.sin(state.current.time * 0.3) * 0.05;
    const audioMod = audioSmooth.bassSmooth * 0.1;

    material.opacity = state.current.baseIntensity + pulse + audioMod;

    // Color shifts with Growl - toward twilight/purple at high intensity
    const targetColor = baseColor.clone();
    if (growlIntensity > 0.5) {
      targetColor.lerp(NOSTALGIC_PALETTE.primary, (growlIntensity - 0.5) * 0.4);
    }
    material.color.lerp(targetColor, delta * 0.5);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshBasicMaterial
        color={baseColor}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Main MelancholicLight component
 */
export function MelancholicLight({
  roomDimensions,
  roomIndex,
  seed,
  enabled = true,
}: MelancholicLightProps) {
  const rng = new SeededRandom(seed + 20000);

  // Generate light shaft configurations
  const lightShafts = useMemo(() => {
    if (!enabled) return [];

    const shafts: LightShaftConfig[] = [];
    const abnormality = 1 - Math.exp(-roomIndex / 20);

    // Number of light shafts based on room size and depth
    const count = Math.max(1, Math.min(3, Math.floor(abnormality * 3) + 1));

    for (let i = 0; i < count; i++) {
      const x = rng.range(-roomDimensions.width / 3, roomDimensions.width / 3);
      const z = rng.range(-roomDimensions.depth / 3, roomDimensions.depth / 3);

      // Light comes from ceiling at an angle
      const angleY = rng.range(-Math.PI / 6, Math.PI / 6);

      // Color selection based on depth
      let color: THREE.Color;
      if (abnormality < 0.3) {
        color = rng.pick([NOSTALGIC_PALETTE.goldenHour, NOSTALGIC_PALETTE.fadedSepia]);
      } else if (abnormality < 0.6) {
        color = rng.pick([NOSTALGIC_PALETTE.sunsetOrange, NOSTALGIC_PALETTE.dustyRose]);
      } else {
        color = rng.pick([NOSTALGIC_PALETTE.twilightPurple, NOSTALGIC_PALETTE.eveningBlue]);
      }

      shafts.push({
        position: new THREE.Vector3(x, 0, z),
        rotation: new THREE.Euler(0, angleY, 0),
        width: rng.range(1.0, 2.0),
        height: roomDimensions.height,
        color: color.clone(),
        opacity: rng.range(0.08, 0.15),
        particleCount: Math.floor(50 + abnormality * 100),
      });
    }

    return shafts;
  }, [roomDimensions, roomIndex, seed, enabled]);

  // Generate window light patches
  const windowLights = useMemo(() => {
    if (!enabled) return [];

    const windows: Array<{
      position: THREE.Vector3;
      dimensions: { width: number; height: number };
      seed: number;
    }> = [];

    const abnormality = 1 - Math.exp(-roomIndex / 20);

    // Only add window lights at higher depths (more otherworldly)
    if (abnormality > 0.2 && rng.chance(0.5 + abnormality * 0.3)) {
      const count = 1 + Math.floor(abnormality * 2);

      for (let i = 0; i < count; i++) {
        // Light patches on walls or floor
        const onFloor = rng.chance(0.4);

        if (onFloor) {
          windows.push({
            position: new THREE.Vector3(
              rng.range(-roomDimensions.width / 3, roomDimensions.width / 3),
              0.01, // Just above floor
              rng.range(-roomDimensions.depth / 3, roomDimensions.depth / 3)
            ),
            dimensions: {
              width: rng.range(1.5, 3),
              height: rng.range(1.5, 3),
            },
            seed: seed + 21000 + i * 1000,
          });
        } else {
          // On a wall
          const wall = rng.int(0, 3);
          let pos: THREE.Vector3;

          if (wall === 0) {
            pos = new THREE.Vector3(
              rng.range(-roomDimensions.width / 3, roomDimensions.width / 3),
              roomDimensions.height * rng.range(0.3, 0.7),
              -roomDimensions.depth / 2 + 0.01
            );
          } else if (wall === 1) {
            pos = new THREE.Vector3(
              rng.range(-roomDimensions.width / 3, roomDimensions.width / 3),
              roomDimensions.height * rng.range(0.3, 0.7),
              roomDimensions.depth / 2 - 0.01
            );
          } else if (wall === 2) {
            pos = new THREE.Vector3(
              roomDimensions.width / 2 - 0.01,
              roomDimensions.height * rng.range(0.3, 0.7),
              rng.range(-roomDimensions.depth / 3, roomDimensions.depth / 3)
            );
          } else {
            pos = new THREE.Vector3(
              -roomDimensions.width / 2 + 0.01,
              roomDimensions.height * rng.range(0.3, 0.7),
              rng.range(-roomDimensions.depth / 3, roomDimensions.depth / 3)
            );
          }

          windows.push({
            position: pos,
            dimensions: {
              width: rng.range(0.8, 1.5),
              height: rng.range(1.0, 2.0),
            },
            seed: seed + 21000 + i * 1000,
          });
        }
      }
    }

    return windows;
  }, [roomDimensions, roomIndex, seed, enabled]);

  if (!enabled) return null;

  return (
    <group>
      {/* Light shafts - beams of golden light */}
      {lightShafts.map((shaft, index) => (
        <LightShaft key={`shaft-${index}`} config={shaft} />
      ))}

      {/* Window light patches - light from windows that don't exist */}
      {windowLights.map((window, index) => (
        <WindowLight
          key={`window-${index}`}
          position={window.position}
          dimensions={window.dimensions}
          seed={window.seed}
        />
      ))}
    </group>
  );
}

export default MelancholicLight;
