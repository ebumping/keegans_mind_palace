/**
 * Artifact Component
 *
 * Procedural floating objects that react to audio and create surreal atmosphere.
 * Features:
 * - Geometric shapes (platonic solids, abstract forms)
 * - Audio-driven rotation and movement
 * - Transient-triggered appearance/disappearance
 * - Pale-strata envelope curve patterns
 * - Penrose-inspired impossible objects for surreal effect
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevels, useAudioSmooth } from '../store/audioStore';
import { SeededRandom } from '../utils/seededRandom';
import { adsrEnvelope, getWaveValue } from '../utils/patterns';
import { WaveformType } from '../types/pattern';

// Pale-strata color palette
const COLORS = {
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
  background: new THREE.Color('#1a1834'),
  accent: new THREE.Color('#3a3861'),
};

// ============================================
// Artifact Types
// ============================================

export const ArtifactType = {
  TETRAHEDRON: 'tetrahedron',
  CUBE: 'cube',
  OCTAHEDRON: 'octahedron',
  DODECAHEDRON: 'dodecahedron',
  ICOSAHEDRON: 'icosahedron',
  TORUS: 'torus',
  TORUS_KNOT: 'torusKnot',
  ABSTRACT: 'abstract',
  PENROSE_TRIANGLE: 'penroseTriangle',
  PENROSE_CUBE: 'penroseCube',
  IMPOSSIBLE_RING: 'impossibleRing',
} as const;
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

// ============================================
// Artifact Configuration
// ============================================

interface ArtifactConfig {
  type: ArtifactType;
  position: THREE.Vector3;
  baseScale: number;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  floatAmplitude: number;
  floatFrequency: number;
  colorPrimary: THREE.Color;
  colorSecondary: THREE.Color;
  audioBand: 'bass' | 'mid' | 'high';
  waveform: WaveformType;
  adsr: { attack: number; decay: number; sustain: number; release: number };
  transientSensitivity: number;
  phaseOffset: number;
}

// ============================================
// Geometry Generators
// ============================================

/**
 * Create geometry based on artifact type
 */
function createArtifactGeometry(type: ArtifactType, rng: SeededRandom): THREE.BufferGeometry {
  switch (type) {
    case ArtifactType.TETRAHEDRON:
      return new THREE.TetrahedronGeometry(1, 0);
    case ArtifactType.CUBE:
      return new THREE.BoxGeometry(1, 1, 1);
    case ArtifactType.OCTAHEDRON:
      return new THREE.OctahedronGeometry(1, 0);
    case ArtifactType.DODECAHEDRON:
      return new THREE.DodecahedronGeometry(1, 0);
    case ArtifactType.ICOSAHEDRON:
      return new THREE.IcosahedronGeometry(1, 0);
    case ArtifactType.TORUS:
      return new THREE.TorusGeometry(1, 0.3, 16, 32);
    case ArtifactType.TORUS_KNOT:
      return new THREE.TorusKnotGeometry(0.8, 0.25, 64, 8);
    case ArtifactType.ABSTRACT:
      return createAbstractGeometry(rng);
    case ArtifactType.PENROSE_TRIANGLE:
      return createPenroseTriangleGeometry();
    case ArtifactType.PENROSE_CUBE:
      return createPenroseCubeGeometry();
    case ArtifactType.IMPOSSIBLE_RING:
      return createImpossibleRingGeometry();
    default:
      return new THREE.IcosahedronGeometry(1, 0);
  }
}

/**
 * Create abstract procedural geometry
 * Uses multiple merged primitives for organic appearance
 */
function createAbstractGeometry(rng: SeededRandom): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];
  const count = rng.int(3, 6);

  for (let i = 0; i < count; i++) {
    const shapes = [
      new THREE.SphereGeometry(rng.range(0.2, 0.5), 8, 8),
      new THREE.BoxGeometry(rng.range(0.2, 0.4), rng.range(0.2, 0.4), rng.range(0.2, 0.4)),
      new THREE.ConeGeometry(rng.range(0.2, 0.3), rng.range(0.3, 0.6), 6),
      new THREE.CylinderGeometry(rng.range(0.1, 0.2), rng.range(0.1, 0.2), rng.range(0.3, 0.6), 8),
    ];

    const geometry = rng.pick(shapes);

    // Random transformation
    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(
        rng.range(-0.5, 0.5),
        rng.range(-0.5, 0.5),
        rng.range(-0.5, 0.5)
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          rng.range(0, Math.PI * 2),
          rng.range(0, Math.PI * 2),
          rng.range(0, Math.PI * 2)
        )
      ),
      new THREE.Vector3(1, 1, 1)
    );
    geometry.applyMatrix4(matrix);
    geometries.push(geometry);
  }

  // Merge all geometries
  const merged = mergeGeometries(geometries);

  // Cleanup individual geometries
  geometries.forEach(g => g.dispose());

  return merged;
}

/**
 * Create Penrose triangle geometry
 * Appears impossible from certain angles
 */
function createPenroseTriangleGeometry(): THREE.BufferGeometry {
  const thickness = 0.15;
  const length = 1.2;
  const segments: THREE.BufferGeometry[] = [];

  // Create three bars that appear to form an impossible triangle
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.BoxGeometry(thickness, thickness, length);
    const angle = (i * Math.PI * 2) / 3;
    const offset = Math.PI / 6;

    const matrix = new THREE.Matrix4();

    // Position at triangle vertex
    const x = Math.cos(angle + offset) * length * 0.4;
    const y = Math.sin(angle + offset) * length * 0.4;

    matrix.compose(
      new THREE.Vector3(x, y, 0),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, angle + Math.PI / 2)
      ),
      new THREE.Vector3(1, 1, 1)
    );
    bar.applyMatrix4(matrix);
    segments.push(bar);

    // Add perpendicular cap for impossible effect
    const cap = new THREE.BoxGeometry(thickness * 1.5, thickness, thickness * 2);
    const capMatrix = new THREE.Matrix4();
    const capX = Math.cos(angle + offset + Math.PI / 3) * length * 0.5;
    const capY = Math.sin(angle + offset + Math.PI / 3) * length * 0.5;
    capMatrix.compose(
      new THREE.Vector3(capX, capY, thickness * 0.5),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, angle + Math.PI / 6)
      ),
      new THREE.Vector3(1, 1, 1)
    );
    cap.applyMatrix4(capMatrix);
    segments.push(cap);
  }

  const merged = mergeGeometries(segments);
  segments.forEach(g => g.dispose());
  return merged;
}

/**
 * Create Penrose cube (Necker cube variant)
 * Ambiguous depth perception
 */
function createPenroseCubeGeometry(): THREE.BufferGeometry {
  const thickness = 0.06;
  const size = 1;
  const edges: THREE.BufferGeometry[] = [];

  // Create edges that form an impossible cube
  // Front face edges
  const frontOffsets = [
    { start: [-1, -1, 1], end: [1, -1, 1] },
    { start: [1, -1, 1], end: [1, 1, 1] },
    { start: [1, 1, 1], end: [-1, 1, 1] },
    { start: [-1, 1, 1], end: [-1, -1, 1] },
  ];

  // Back face edges
  const backOffsets = [
    { start: [-1, -1, -1], end: [1, -1, -1] },
    { start: [1, -1, -1], end: [1, 1, -1] },
    { start: [1, 1, -1], end: [-1, 1, -1] },
    { start: [-1, 1, -1], end: [-1, -1, -1] },
  ];

  // Connecting edges (with impossible crossing)
  const connectOffsets = [
    { start: [-1, -1, -1], end: [-1, -1, 1] },
    { start: [1, -1, -1], end: [1, -1, 1] },
    { start: [1, 1, -1], end: [1, 1, 1] },
    { start: [-1, 1, -1], end: [-1, 1, 1] },
  ];

  const allOffsets = [...frontOffsets, ...backOffsets, ...connectOffsets];

  allOffsets.forEach(({ start, end }) => {
    const startVec = new THREE.Vector3(...start.map(v => v * size * 0.5));
    const endVec = new THREE.Vector3(...end.map(v => v * size * 0.5));
    const length = startVec.distanceTo(endVec);
    const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5);

    const edge = new THREE.CylinderGeometry(thickness, thickness, length, 6);

    // Orient cylinder along edge direction
    const direction = endVec.clone().sub(startVec).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    const matrix = new THREE.Matrix4();
    matrix.compose(midpoint, quaternion, new THREE.Vector3(1, 1, 1));
    edge.applyMatrix4(matrix);
    edges.push(edge);
  });

  const merged = mergeGeometries(edges);
  edges.forEach(g => g.dispose());
  return merged;
}

/**
 * Create impossible ring geometry
 * Mobius-strip inspired twisted torus
 */
function createImpossibleRingGeometry(): THREE.BufferGeometry {
  const radius = 0.8;
  const tube = 0.15;
  const radialSegments = 64;
  const tubularSegments = 12;
  const twists = 1.5; // Non-integer creates impossible appearance

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i <= radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2;
    const twist = (i / radialSegments) * Math.PI * twists;

    for (let j = 0; j <= tubularSegments; j++) {
      const v = (j / tubularSegments) * Math.PI * 2;

      // Twisted torus parametric equations
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v + twist);
      const sinV = Math.sin(v + twist);

      const x = (radius + tube * cosV) * cosU;
      const y = (radius + tube * cosV) * sinU;
      const z = tube * sinV;

      vertices.push(x, y, z);

      // Calculate normals
      const nx = cosV * cosU;
      const ny = cosV * sinU;
      const nz = sinV;
      normals.push(nx, ny, nz);

      uvs.push(i / radialSegments, j / tubularSegments);
    }
  }

  // Generate indices
  for (let i = 0; i < radialSegments; i++) {
    for (let j = 0; j < tubularSegments; j++) {
      const a = i * (tubularSegments + 1) + j;
      const b = a + tubularSegments + 1;
      const c = a + 1;
      const d = b + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * Simple geometry merge utility
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  geometries.forEach(geometry => {
    const posAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');
    const indexAttr = geometry.getIndex();

    // Copy positions
    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }

    // Copy normals
    if (normalAttr) {
      for (let i = 0; i < normalAttr.count; i++) {
        normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
      }
    }

    // Copy UVs
    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      }
    }

    // Copy indices with offset
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i++) {
        indices.push(indexAttr.getX(i) + indexOffset);
      }
    } else {
      // Generate indices if not present
      for (let i = 0; i < posAttr.count; i++) {
        indices.push(i + indexOffset);
      }
    }

    indexOffset += posAttr.count;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  if (uvs.length > 0) {
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
  merged.setIndex(indices);
  merged.computeVertexNormals();

  return merged;
}

// ============================================
// Single Artifact Component
// ============================================

interface SingleArtifactProps {
  config: ArtifactConfig;
  seed: number;
}

function SingleArtifact({ config, seed }: SingleArtifactProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();

  // Create geometry with memoization
  const geometry = useMemo(() => {
    const rng = new SeededRandom(seed);
    return createArtifactGeometry(config.type, rng);
  }, [config.type, seed]);

  // Animation state
  const state = useRef({
    time: 0,
    visibility: 1,
    lastTransient: false,
    transientCooldown: 0,
    envelopePhase: 0,
    rotationPhase: config.phaseOffset,
  });

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const s = state.current;
    s.time += delta;

    // Get audio value based on configured band
    const audioValue =
      config.audioBand === 'bass' ? audioSmooth.bassSmooth :
      config.audioBand === 'mid' ? audioSmooth.midSmooth :
      audioSmooth.highSmooth;

    // === Audio-driven rotation ===
    // Rotation speed modulated by audio
    const rotationMultiplier = 1 + audioValue * 2;
    s.rotationPhase += delta * config.rotationSpeed * rotationMultiplier;

    // Apply rotation using configured axis and waveform
    const waveValue = getWaveValue(s.rotationPhase, config.waveform, seed);
    const rotationAmount = waveValue * Math.PI * 2;

    meshRef.current.rotation.x = config.rotationAxis.x * rotationAmount;
    meshRef.current.rotation.y = config.rotationAxis.y * rotationAmount + s.rotationPhase;
    meshRef.current.rotation.z = config.rotationAxis.z * rotationAmount;

    // === Floating movement ===
    // Use ADSR envelope for movement pattern
    const envelopeT = (s.time * config.floatFrequency) % 1;
    const envelopeValue = adsrEnvelope(
      envelopeT,
      config.adsr.attack,
      config.adsr.decay,
      config.adsr.sustain,
      config.adsr.release
    );

    // Float position with audio modulation
    const floatY = Math.sin(s.time * config.floatFrequency + config.phaseOffset) *
      config.floatAmplitude * (0.5 + audioValue * 0.5);
    const floatX = Math.cos(s.time * config.floatFrequency * 0.7 + config.phaseOffset) *
      config.floatAmplitude * 0.3 * envelopeValue;
    const floatZ = Math.sin(s.time * config.floatFrequency * 0.5 + config.phaseOffset) *
      config.floatAmplitude * 0.3;

    meshRef.current.position.set(
      config.position.x + floatX,
      config.position.y + floatY,
      config.position.z + floatZ
    );

    // === Scale with audio ===
    const scaleBase = config.baseScale;
    const scalePulse = scaleBase * (1 + audioValue * 0.3);
    const scaleEnvelope = scalePulse * (0.8 + envelopeValue * 0.2);
    meshRef.current.scale.setScalar(scaleEnvelope);

    // === Transient-based visibility ===
    s.transientCooldown = Math.max(0, s.transientCooldown - delta);

    if (audioLevels.transient && !s.lastTransient && s.transientCooldown <= 0) {
      // Transient detected - trigger visibility change
      if (audioLevels.transientIntensity > config.transientSensitivity) {
        // Flash effect: temporarily boost or reduce visibility
        s.visibility = s.visibility > 0.5 ? 0.2 : 1.2;
        s.transientCooldown = 0.3; // Cooldown to prevent rapid flashing
      }
    }
    s.lastTransient = audioLevels.transient;

    // Smooth visibility return to normal
    s.visibility = THREE.MathUtils.lerp(s.visibility, 1, delta * 2);

    // === Material updates ===
    // Emissive color pulses with audio
    const emissiveIntensity = 0.2 + audioValue * 0.8;
    materialRef.current.emissive.copy(config.colorPrimary);
    materialRef.current.emissiveIntensity = emissiveIntensity * s.visibility;
    materialRef.current.opacity = Math.min(1, s.visibility);

    // Color shift based on envelope phase
    const colorMix = envelopeValue;
    materialRef.current.color.copy(config.colorPrimary).lerp(config.colorSecondary, colorMix * 0.3);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color={config.colorPrimary}
        emissive={config.colorPrimary}
        emissiveIntensity={0.3}
        metalness={0.7}
        roughness={0.3}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

// ============================================
// Artifact Generator
// ============================================

/**
 * Generate artifact configuration from seed
 */
function generateArtifactConfig(
  seed: number,
  index: number,
  bounds: { width: number; height: number; depth: number },
  abnormality: number
): ArtifactConfig {
  const rng = new SeededRandom(seed + index * 1000);

  // Artifact type selection - impossible objects more common with higher abnormality
  const basicTypes = [
    ArtifactType.TETRAHEDRON,
    ArtifactType.CUBE,
    ArtifactType.OCTAHEDRON,
    ArtifactType.DODECAHEDRON,
    ArtifactType.ICOSAHEDRON,
    ArtifactType.TORUS,
    ArtifactType.TORUS_KNOT,
    ArtifactType.ABSTRACT,
  ];

  const impossibleTypes = [
    ArtifactType.PENROSE_TRIANGLE,
    ArtifactType.PENROSE_CUBE,
    ArtifactType.IMPOSSIBLE_RING,
  ];

  // Higher abnormality = more impossible objects
  const useImpossible = rng.next() < abnormality * 0.5;
  const type = useImpossible ? rng.pick(impossibleTypes) : rng.pick(basicTypes);

  // Position within room bounds (avoiding edges)
  const margin = 1;
  const position = new THREE.Vector3(
    rng.range(-bounds.width / 2 + margin, bounds.width / 2 - margin),
    rng.range(1, bounds.height - 1),
    rng.range(-bounds.depth / 2 + margin, bounds.depth / 2 - margin)
  );

  // Random rotation axis
  const rotationAxis = new THREE.Vector3(
    rng.range(-1, 1),
    rng.range(-1, 1),
    rng.range(-1, 1)
  ).normalize();

  // Audio band assignment
  const bands: Array<'bass' | 'mid' | 'high'> = ['bass', 'mid', 'high'];
  const audioBand = rng.pick(bands);

  // Waveform for movement pattern
  const waveforms = Object.values(WaveformType);
  const waveform = rng.pick(waveforms) as WaveformType;

  // Color variation from palette
  const colorPrimary = rng.next() > 0.5 ? COLORS.primary.clone() : COLORS.secondary.clone();
  const colorSecondary = rng.next() > 0.5 ? COLORS.secondary.clone() : COLORS.primary.clone();

  // Add slight hue variation
  const hsl = { h: 0, s: 0, l: 0 };
  colorPrimary.getHSL(hsl);
  colorPrimary.setHSL(hsl.h + rng.range(-0.05, 0.05), hsl.s, hsl.l);

  return {
    type,
    position,
    baseScale: rng.range(0.15, 0.4) * (1 + abnormality * 0.3),
    rotationAxis,
    rotationSpeed: rng.range(0.2, 1.0),
    floatAmplitude: rng.range(0.2, 0.6),
    floatFrequency: rng.range(0.5, 1.5),
    colorPrimary,
    colorSecondary,
    audioBand,
    waveform,
    adsr: {
      attack: rng.range(0.1, 0.3),
      decay: rng.range(0.1, 0.3),
      sustain: rng.range(0.4, 0.8),
      release: rng.range(0.1, 0.3),
    },
    transientSensitivity: rng.range(0.3, 0.7),
    phaseOffset: rng.range(0, Math.PI * 2),
  };
}

// ============================================
// Main Artifact Collection Component
// ============================================

interface ArtifactProps {
  /** Room dimensions for positioning */
  dimensions: { width: number; height: number; depth: number };
  /** Seed for procedural generation */
  seed?: number;
  /** Number of artifacts to generate */
  count?: number;
  /** Abnormality factor (0-1) - higher = more impossible objects */
  abnormality?: number;
  /** Enable/disable artifacts */
  enabled?: boolean;
}

export function Artifact({
  dimensions,
  seed = 42,
  count = 5,
  abnormality = 0,
  enabled = true,
}: ArtifactProps) {
  // Generate artifact configurations
  const configs = useMemo(() => {
    if (!enabled) return [];

    const artifacts: ArtifactConfig[] = [];
    for (let i = 0; i < count; i++) {
      artifacts.push(generateArtifactConfig(seed, i, dimensions, abnormality));
    }
    return artifacts;
  }, [seed, count, dimensions, abnormality, enabled]);

  if (!enabled || configs.length === 0) return null;

  return (
    <group>
      {configs.map((config, index) => (
        <SingleArtifact
          key={`artifact-${seed}-${index}`}
          config={config}
          seed={seed + index}
        />
      ))}
    </group>
  );
}

export default Artifact;
