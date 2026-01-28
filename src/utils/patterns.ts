/**
 * Pattern Utility Functions
 *
 * Core pattern generation functions derived from pale-strata
 * audio processing patterns (slicer, LFO, grain scheduling, ADSR).
 */

import {
  WaveformType,
  PatternDirection,
  GrainShape,
  BlendMode,
} from '../types/pattern';
import type {
  SlicerPattern,
  SlicerSteps,
  LFOPattern,
  GrainPattern,
  ADSRPattern,
} from '../types/pattern';
import { SeededRandom } from './seededRandom';

// ============================================
// Waveform Functions (for CPU-side calculations)
// ============================================

/**
 * Generate sine wave value at position t (0-1)
 */
export function sineWave(t: number): number {
  return Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
}

/**
 * Generate square wave value at position t (0-1)
 */
export function squareWave(t: number): number {
  return t % 1 < 0.5 ? 1 : 0;
}

/**
 * Generate sawtooth wave value at position t (0-1)
 */
export function sawtoothWave(t: number): number {
  return t % 1;
}

/**
 * Generate triangle wave value at position t (0-1)
 */
export function triangleWave(t: number): number {
  const fract = t % 1;
  return Math.abs(fract * 2 - 1);
}

/**
 * Generate deterministic random wave value
 */
export function randomWave(t: number, seed: number): number {
  const x = Math.sin(Math.floor(t) * 12.9898 + seed) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Get wave value based on waveform type
 */
export function getWaveValue(
  t: number,
  waveform: WaveformType,
  seed: number = 0
): number {
  switch (waveform) {
    case WaveformType.SINE:
      return sineWave(t);
    case WaveformType.SQUARE:
      return squareWave(t);
    case WaveformType.SAWTOOTH:
      return sawtoothWave(t);
    case WaveformType.TRIANGLE:
      return triangleWave(t);
    case WaveformType.RANDOM:
      return randomWave(t, seed);
    default:
      return sineWave(t);
  }
}

// ============================================
// ADSR Envelope
// ============================================

/**
 * Calculate ADSR envelope value at position t (0-1)
 */
export function adsrEnvelope(
  t: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number
): number {
  const attackEnd = attack;
  const decayEnd = attack + decay;
  const releaseStart = 1 - release;

  if (t < 0) return 0;
  if (t >= 1) return 0;

  if (t < attackEnd) {
    // Attack phase: ramp up from 0 to 1
    return attack > 0 ? t / attack : 1;
  } else if (t < decayEnd) {
    // Decay phase: ramp down from 1 to sustain level
    return decay > 0 ? 1 - (1 - sustain) * ((t - attackEnd) / decay) : sustain;
  } else if (t < releaseStart) {
    // Sustain phase: hold at sustain level
    return sustain;
  } else {
    // Release phase: ramp down from sustain to 0
    return release > 0 ? sustain * (1 - (t - releaseStart) / release) : 0;
  }
}

// ============================================
// Slicer Pattern Generation
// ============================================

/**
 * Generate a slicer pattern with deterministic randomness
 * Derived from pale-strata's step sequencer patterns
 */
export function generateSlicerPattern(
  seed: number,
  steps: SlicerSteps = 16
): SlicerPattern {
  const rng = new SeededRandom(seed);

  // Generate active steps with ~60% density
  const activeSteps: boolean[] = [];
  for (let i = 0; i < steps; i++) {
    activeSteps.push(rng.next() > 0.4);
  }

  // Generate intensities for active steps
  const intensity: number[] = activeSteps.map((active) =>
    active ? rng.range(0.3, 1.0) : 0
  );

  // Pick direction
  const directions: Array<Exclude<PatternDirection, 'radial'>> = [
    PatternDirection.HORIZONTAL,
    PatternDirection.VERTICAL,
    PatternDirection.DIAGONAL,
  ];

  return {
    steps,
    activeSteps,
    intensity,
    direction: rng.pick(directions) as Exclude<PatternDirection, 'radial'>,
  };
}

/**
 * Evaluate slicer pattern at UV coordinate
 */
export function evaluateSlicerPattern(
  u: number,
  v: number,
  pattern: SlicerPattern
): number {
  let coord: number;

  switch (pattern.direction) {
    case PatternDirection.HORIZONTAL:
      coord = u;
      break;
    case PatternDirection.VERTICAL:
      coord = v;
      break;
    case PatternDirection.DIAGONAL:
      coord = (u + v) * 0.5;
      break;
    default:
      coord = u;
  }

  // Map coordinate to step index
  const stepIndex = Math.floor((coord % 1) * pattern.steps) % pattern.steps;
  return pattern.intensity[stepIndex] || 0;
}

// ============================================
// LFO Pattern Generation
// ============================================

/**
 * Generate an LFO pattern configuration
 */
export function generateLFOPattern(seed: number): LFOPattern {
  const rng = new SeededRandom(seed);

  const waveforms = Object.values(WaveformType);

  return {
    waveform: rng.pick(waveforms) as WaveformType,
    frequency: rng.range(1, 8),
    amplitude: rng.range(0.3, 1.0),
    phase: rng.range(0, Math.PI * 2),
    modulation: rng.range(0.1, 0.5),
  };
}

/**
 * Evaluate LFO pattern at UV coordinate with time
 */
export function evaluateLFOPattern(
  u: number,
  v: number,
  time: number,
  pattern: LFOPattern
): number {
  const t =
    (u + v) * pattern.frequency +
    pattern.phase / (Math.PI * 2) +
    time * 0.1;

  const value = getWaveValue(t, pattern.waveform, pattern.phase);
  return value * pattern.amplitude;
}

// ============================================
// Grain Pattern Generation
// ============================================

/**
 * Generate a grain scatter pattern configuration
 * Inspired by granular synthesis scheduling
 */
export function generateGrainPattern(seed: number): GrainPattern {
  const rng = new SeededRandom(seed);

  const shapes = Object.values(GrainShape);

  return {
    density: rng.range(10, 100),
    sizeVariance: rng.range(0.2, 0.8),
    positionJitter: rng.range(0.0, 0.5),
    shape: rng.pick(shapes) as GrainShape,
  };
}

/**
 * Hash function for per-cell randomness
 */
function hash2D(x: number, y: number, seed: number): number {
  const val = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return val - Math.floor(val);
}

/**
 * Evaluate grain pattern at UV coordinate
 */
export function evaluateGrainPattern(
  u: number,
  v: number,
  pattern: GrainPattern,
  seed: number
): number {
  // Grid cell
  const gridX = Math.floor(u * pattern.density);
  const gridY = Math.floor(v * pattern.density);

  // Local position within cell (0-1)
  const localX = (u * pattern.density) % 1;
  const localY = (v * pattern.density) % 1;

  // Per-cell random values
  const cellRand = hash2D(gridX, gridY, seed);
  const cellRand2 = hash2D(gridX + 1000, gridY + 1000, seed);

  // Grain size with variance
  const size = 0.3 + cellRand * pattern.sizeVariance * 0.4;

  // Jittered center
  const centerX = 0.5 + (cellRand - 0.5) * pattern.positionJitter;
  const centerY = 0.5 + (cellRand2 - 0.5) * pattern.positionJitter;

  // Distance to grain center
  const dx = localX - centerX;
  const dy = localY - centerY;

  let distance: number;

  switch (pattern.shape) {
    case GrainShape.CIRCLE:
      distance = Math.sqrt(dx * dx + dy * dy);
      break;
    case GrainShape.SQUARE:
      distance = Math.max(Math.abs(dx), Math.abs(dy));
      break;
    case GrainShape.DIAMOND:
      distance = Math.abs(dx) + Math.abs(dy);
      break;
    case GrainShape.ORGANIC:
      // Organic shapes use noise-distorted circles
      const noiseOffset = hash2D(gridX + localX * 10, gridY + localY * 10, seed) * 0.2;
      distance = Math.sqrt(dx * dx + dy * dy) + noiseOffset;
      break;
    default:
      distance = Math.sqrt(dx * dx + dy * dy);
  }

  // Smooth step for anti-aliasing
  return smoothstep(size, size - 0.1, distance);
}

// ============================================
// ADSR Pattern Generation
// ============================================

/**
 * Generate an ADSR envelope pattern configuration
 */
export function generateADSRPattern(seed: number): ADSRPattern {
  const rng = new SeededRandom(seed);

  const directions: Array<Exclude<PatternDirection, 'diagonal'>> = [
    PatternDirection.RADIAL,
    PatternDirection.HORIZONTAL,
    PatternDirection.VERTICAL,
  ];

  return {
    attack: rng.range(0.05, 0.3),
    decay: rng.range(0.1, 0.4),
    sustain: rng.range(0.3, 0.8),
    release: rng.range(0.1, 0.5),
    direction: rng.pick(directions) as Exclude<PatternDirection, 'diagonal'>,
  };
}

/**
 * Evaluate ADSR pattern at UV coordinate
 */
export function evaluateADSRPattern(u: number, v: number, pattern: ADSRPattern): number {
  let t: number;

  switch (pattern.direction) {
    case PatternDirection.RADIAL:
      // Distance from center (0-1), where 1 is at corners
      t = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2;
      t = Math.min(t, 1);
      break;
    case PatternDirection.HORIZONTAL:
      t = u;
      break;
    case PatternDirection.VERTICAL:
      t = v;
      break;
    default:
      t = u;
  }

  return adsrEnvelope(t, pattern.attack, pattern.decay, pattern.sustain, pattern.release);
}

// ============================================
// Stripe and Grid Patterns
// ============================================

/**
 * Generate procedural stripe pattern using sine wave combinations
 */
export function stripePattern(
  u: number,
  v: number,
  frequency: number,
  angle: number,
  thickness: number = 0.5
): number {
  // Rotate UV coordinates by angle
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedU = u * cos - v * sin;

  // Generate stripe using sine wave
  const stripe = Math.sin(rotatedU * frequency * Math.PI * 2);

  // Threshold to create hard stripes or keep soft
  return smoothstep(-thickness, thickness, stripe);
}

/**
 * Generate grid pattern using combined sine waves
 */
export function gridPattern(
  u: number,
  v: number,
  frequencyX: number,
  frequencyY: number,
  lineWidth: number = 0.1
): number {
  const horizontal = Math.abs(Math.sin(v * frequencyY * Math.PI * 2));
  const vertical = Math.abs(Math.sin(u * frequencyX * Math.PI * 2));

  // Combine for grid effect
  const grid = Math.max(
    smoothstep(1 - lineWidth, 1, horizontal),
    smoothstep(1 - lineWidth, 1, vertical)
  );

  return grid;
}

/**
 * Generate checkered pattern
 */
export function checkerPattern(u: number, v: number, frequency: number): number {
  const x = Math.floor(u * frequency);
  const y = Math.floor(v * frequency);
  return (x + y) % 2;
}

// ============================================
// Wallpaper-like Repeating Patterns
// ============================================

/**
 * Generate damask-style wallpaper pattern
 */
export function damaskPattern(
  u: number,
  v: number,
  scale: number,
  seed: number
): number {
  const rng = new SeededRandom(seed);

  // Create repeating tile
  const tileU = (u * scale) % 1;
  const tileV = (v * scale) % 1;

  // Symmetric pattern using mirrored coordinates
  const mirrorU = tileU < 0.5 ? tileU * 2 : (1 - tileU) * 2;
  const mirrorV = tileV < 0.5 ? tileV * 2 : (1 - tileV) * 2;

  // Layered sine patterns for ornate look
  const layer1 = Math.sin(mirrorU * Math.PI) * Math.sin(mirrorV * Math.PI);
  const layer2 =
    Math.sin(mirrorU * Math.PI * 2 + rng.next()) *
    Math.sin(mirrorV * Math.PI * 2 + rng.next()) *
    0.5;
  const layer3 =
    Math.sin((mirrorU + mirrorV) * Math.PI * 3) *
    Math.sin((mirrorU - mirrorV) * Math.PI * 3) *
    0.25;

  return Math.max(0, Math.min(1, layer1 + layer2 + layer3));
}

/**
 * Generate art deco geometric wallpaper pattern
 */
export function artDecoPattern(
  u: number,
  v: number,
  scale: number,
  seed: number
): number {
  // Create repeating hexagonal-ish pattern
  const scaledU = u * scale;
  const scaledV = v * scale;

  // Offset rows for hex-like arrangement
  const row = Math.floor(scaledV);
  const offsetU = scaledU + (row % 2) * 0.5;

  // Create fan/sunburst motif
  const cellU = (offsetU % 1) - 0.5;
  const cellV = (scaledV % 1) - 0.5;

  const angle = Math.atan2(cellV, cellU);
  const dist = Math.sqrt(cellU * cellU + cellV * cellV);

  // Radiating lines
  const rays = Math.abs(Math.sin(angle * 8)) * smoothstep(0.5, 0.1, dist);

  // Concentric arcs
  const arcs = Math.abs(Math.sin(dist * 10 + seed)) * 0.5;

  return Math.max(rays, arcs);
}

/**
 * Generate herringbone wallpaper pattern
 */
export function herringbonePattern(
  u: number,
  v: number,
  scale: number,
  angle: number = Math.PI / 4
): number {
  const scaledU = u * scale;
  const scaledV = v * scale;

  // Determine which row we're in
  const row = Math.floor(scaledV);
  const inRowV = scaledV % 1;

  // Alternate direction per row
  const direction = row % 2 === 0 ? 1 : -1;

  // Diagonal stripes
  const diagonal = (scaledU + inRowV * direction * Math.tan(angle)) % 1;

  return smoothstep(0.45, 0.5, diagonal) - smoothstep(0.5, 0.55, diagonal);
}

// ============================================
// Carpet Patterns (from Grain Scheduling)
// ============================================

/**
 * Generate carpet pattern using grain scheduling intervals as seeds
 * Creates organic, textured appearance
 */
export function carpetPattern(
  u: number,
  v: number,
  grainInterval: number,
  seed: number
): number {
  // Base grain texture
  const grainPattern = generateGrainPattern(seed);
  const grainValue = evaluateGrainPattern(u, v, grainPattern, seed);

  // Add woven texture overlay
  const weaveFreq = grainInterval * 10;
  const warpThread = Math.sin(u * weaveFreq * Math.PI * 2) * 0.5 + 0.5;
  const weftThread = Math.sin(v * weaveFreq * Math.PI * 2) * 0.5 + 0.5;

  // Combine for carpet texture
  const weave = warpThread * weftThread;
  const carpet = grainValue * 0.6 + weave * 0.4;

  // Add subtle noise for fiber texture
  const fiberNoise = hash2D(u * 100, v * 100, seed) * 0.1;

  return Math.max(0, Math.min(1, carpet + fiberNoise));
}

/**
 * Generate oriental-style carpet border pattern
 */
export function carpetBorderPattern(
  u: number,
  v: number,
  borderWidth: number,
  _seed: number
): number {
  // Distance from edge (0 at edge, 1 at center)
  const edgeDistU = Math.min(u, 1 - u) * 2;
  const edgeDistV = Math.min(v, 1 - v) * 2;
  const edgeDist = Math.min(edgeDistU, edgeDistV);

  // Check if we're in the border region
  if (edgeDist > borderWidth) {
    return 0;
  }

  // Create decorative border pattern
  const borderPos = edgeDist / borderWidth;

  // Repeating motifs along border
  const alongEdge = edgeDistU < edgeDistV ? u : v;
  const motif = Math.abs(Math.sin(alongEdge * 20 * Math.PI)) * Math.sin(borderPos * Math.PI);

  return motif;
}

// ============================================
// Blend Mode Functions
// ============================================

export function blendMultiply(a: number, b: number): number {
  return a * b;
}

export function blendAdd(a: number, b: number): number {
  return Math.min(a + b, 1);
}

export function blendOverlay(a: number, b: number): number {
  return a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
}

export function blendDifference(a: number, b: number): number {
  return Math.abs(a - b);
}

/**
 * Blend two values using specified blend mode
 */
export function blend(a: number, b: number, mode: BlendMode): number {
  switch (mode) {
    case BlendMode.MULTIPLY:
      return blendMultiply(a, b);
    case BlendMode.ADD:
      return blendAdd(a, b);
    case BlendMode.OVERLAY:
      return blendOverlay(a, b);
    case BlendMode.DIFFERENCE:
      return blendDifference(a, b);
    default:
      return blendMultiply(a, b);
  }
}

// ============================================
// Audio Distortion Functions
// ============================================

/**
 * Apply audio-reactive UV distortion
 */
export function audioDistortUV(
  u: number,
  v: number,
  bass: number,
  transient: number,
  time: number
): { u: number; v: number } {
  // Bass causes slow breathing distortion
  const breathe = Math.sin(time * 0.5) * bass * 0.02;

  // Transients cause sharp jitter
  const jitter = transient * 0.01;

  return {
    u: u + Math.sin(v * 10 + time) * breathe + jitter,
    v: v + Math.cos(u * 10 + time) * breathe,
  };
}

/**
 * Modulate pattern value based on audio
 */
export function audioModulate(
  value: number,
  bass: number,
  mid: number,
  high: number,
  transientIntensity: number
): number {
  // Bass adds slow pulsing
  const bassPulse = 1 + bass * 0.2;

  // Mids add medium-speed variation
  const midVar = 1 + mid * 0.1;

  // Highs add sparkle/brightness
  const highBoost = 1 + high * 0.15;

  // Transients cause momentary spikes
  const transientSpike = 1 + transientIntensity * 0.3;

  return value * bassPulse * midVar * highBoost * transientSpike;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Smooth step function for anti-aliased transitions
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Fractional part of a number
 */
export function fract(x: number): number {
  return x - Math.floor(x);
}

/**
 * Convert direction enum to shader-friendly integer
 */
export function directionToInt(direction: PatternDirection): number {
  switch (direction) {
    case PatternDirection.HORIZONTAL:
      return 0;
    case PatternDirection.VERTICAL:
      return 1;
    case PatternDirection.DIAGONAL:
      return 2;
    case PatternDirection.RADIAL:
      return 3;
    default:
      return 0;
  }
}

/**
 * Convert waveform type to shader-friendly integer
 */
export function waveformToInt(waveform: WaveformType): number {
  switch (waveform) {
    case WaveformType.SINE:
      return 0;
    case WaveformType.SQUARE:
      return 1;
    case WaveformType.SAWTOOTH:
      return 2;
    case WaveformType.TRIANGLE:
      return 3;
    case WaveformType.RANDOM:
      return 4;
    default:
      return 0;
  }
}

/**
 * Convert grain shape to shader-friendly integer
 */
export function grainShapeToInt(shape: GrainShape): number {
  switch (shape) {
    case GrainShape.CIRCLE:
      return 0;
    case GrainShape.SQUARE:
      return 1;
    case GrainShape.DIAMOND:
      return 2;
    case GrainShape.ORGANIC:
      return 3;
    default:
      return 0;
  }
}

/**
 * Convert blend mode to shader-friendly integer
 */
export function blendModeToInt(mode: BlendMode): number {
  switch (mode) {
    case BlendMode.MULTIPLY:
      return 0;
    case BlendMode.ADD:
      return 1;
    case BlendMode.OVERLAY:
      return 2;
    case BlendMode.DIFFERENCE:
      return 3;
    default:
      return 0;
  }
}
