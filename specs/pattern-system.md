# Pattern System Specification

## Overview

The pattern system generates procedural visual textures for room surfaces, derived from pale-strata's audio processing patterns (slicer sequences, LFO waveforms, grain scheduling, and ADSR envelopes). These patterns are audio-reactive and evolve based on room depth and the Growl intensity.

---

## Pattern Derivation from pale-strata

### Source Patterns

| pale-strata Component | Visual Pattern Application |
|----------------------|---------------------------|
| Slicer (8/16/32 step) | Grid-based tile patterns, rhythmic stripe sequences |
| LFO Waveforms | Continuous wave distortions, smooth morphing |
| Grain Scheduling | Particle-like scatter patterns, carpet textures |
| ADSR Envelopes | Fade transitions, breathing intensity curves |

---

## Pattern Types

### 1. Slicer Patterns (Grid-Based)

Derived from pale-strata's step sequencer patterns.

```typescript
interface SlicerPattern {
  steps: number;        // 8, 16, or 32
  activeSteps: boolean[];  // Which steps are "active"
  intensity: number[];     // 0-1 intensity per step
  direction: 'horizontal' | 'vertical' | 'diagonal';
}

function generateSlicerPattern(seed: number, steps: 8 | 16 | 32): SlicerPattern {
  const rng = new SeededRandom(seed);

  const activeSteps = Array(steps).fill(false).map(() => rng.next() > 0.4);
  const intensity = activeSteps.map(active =>
    active ? rng.range(0.3, 1.0) : 0
  );

  return {
    steps,
    activeSteps,
    intensity,
    direction: rng.pick(['horizontal', 'vertical', 'diagonal'])
  };
}
```

**Shader Implementation:**

```glsl
// Slicer pattern in fragment shader
float slicerPattern(vec2 uv, int steps, float[32] intensities, int direction) {
  float coord;
  if (direction == 0) coord = uv.x;      // horizontal
  else if (direction == 1) coord = uv.y; // vertical
  else coord = (uv.x + uv.y) * 0.5;      // diagonal

  int step = int(coord * float(steps)) % steps;
  return intensities[step];
}
```

### 2. LFO Wave Patterns

Continuous patterns based on waveform shapes.

```typescript
type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'random';

interface LFOPattern {
  waveform: WaveformType;
  frequency: number;      // Cycles per unit
  amplitude: number;      // 0-1
  phase: number;          // 0-2π initial offset
  modulation: number;     // Audio modulation amount
}

function generateLFOPattern(seed: number): LFOPattern {
  const rng = new SeededRandom(seed);

  return {
    waveform: rng.pick(['sine', 'square', 'sawtooth', 'triangle', 'random']),
    frequency: rng.range(1, 8),
    amplitude: rng.range(0.3, 1.0),
    phase: rng.range(0, Math.PI * 2),
    modulation: rng.range(0.1, 0.5)
  };
}
```

**Waveform Functions:**

```glsl
float sineWave(float t) {
  return sin(t * 6.28318) * 0.5 + 0.5;
}

float squareWave(float t) {
  return step(0.5, fract(t));
}

float sawtoothWave(float t) {
  return fract(t);
}

float triangleWave(float t) {
  return abs(fract(t) * 2.0 - 1.0);
}

float randomWave(float t, float seed) {
  return fract(sin(floor(t) * 12.9898 + seed) * 43758.5453);
}

float lfoPattern(vec2 uv, int waveType, float freq, float amp, float phase, float time) {
  float t = (uv.x + uv.y) * freq + phase + time * 0.1;

  float value;
  if (waveType == 0) value = sineWave(t);
  else if (waveType == 1) value = squareWave(t);
  else if (waveType == 2) value = sawtoothWave(t);
  else if (waveType == 3) value = triangleWave(t);
  else value = randomWave(t, phase);

  return value * amp;
}
```

### 3. Grain Scatter Patterns

Particle-like patterns inspired by granular synthesis scheduling.

```typescript
interface GrainPattern {
  density: number;        // Grains per unit area
  sizeVariance: number;   // 0-1 size randomness
  positionJitter: number; // 0-1 position randomness
  shape: 'circle' | 'square' | 'diamond' | 'organic';
}

function generateGrainPattern(seed: number): GrainPattern {
  const rng = new SeededRandom(seed);

  return {
    density: rng.range(10, 100),
    sizeVariance: rng.range(0.2, 0.8),
    positionJitter: rng.range(0.0, 0.5),
    shape: rng.pick(['circle', 'square', 'diamond', 'organic'])
  };
}
```

**Shader Implementation:**

```glsl
float grainPattern(vec2 uv, float density, float sizeVar, float jitter, float seed) {
  vec2 grid = floor(uv * density);
  vec2 local = fract(uv * density);

  // Per-cell random values
  float cellRand = fract(sin(dot(grid, vec2(12.9898, 78.233)) + seed) * 43758.5453);
  float size = 0.3 + cellRand * sizeVar * 0.4;

  // Jitter position
  vec2 center = vec2(0.5) + (vec2(cellRand, fract(cellRand * 7.0)) - 0.5) * jitter;

  // Distance to grain center
  float d = length(local - center);

  return smoothstep(size, size - 0.1, d);
}
```

### 4. ADSR Envelope Patterns

Patterns that fade based on envelope curves.

```typescript
interface ADSRPattern {
  attack: number;   // 0-1 of pattern length
  decay: number;    // 0-1
  sustain: number;  // 0-1 level
  release: number;  // 0-1
  direction: 'radial' | 'linear_x' | 'linear_y';
}

function generateADSRPattern(seed: number): ADSRPattern {
  const rng = new SeededRandom(seed);

  return {
    attack: rng.range(0.05, 0.3),
    decay: rng.range(0.1, 0.4),
    sustain: rng.range(0.3, 0.8),
    release: rng.range(0.1, 0.5),
    direction: rng.pick(['radial', 'linear_x', 'linear_y'])
  };
}
```

**Shader Implementation:**

```glsl
float adsrEnvelope(float t, float a, float d, float s, float r) {
  float attackEnd = a;
  float decayEnd = a + d;
  float releaseStart = 1.0 - r;

  if (t < attackEnd) {
    return t / a;  // Attack phase
  } else if (t < decayEnd) {
    return 1.0 - (1.0 - s) * (t - attackEnd) / d;  // Decay phase
  } else if (t < releaseStart) {
    return s;  // Sustain phase
  } else {
    return s * (1.0 - (t - releaseStart) / r);  // Release phase
  }
}

float adsrPattern(vec2 uv, vec4 adsr, int direction) {
  float t;
  if (direction == 0) t = length(uv - 0.5) * 2.0;  // radial
  else if (direction == 1) t = uv.x;               // linear_x
  else t = uv.y;                                    // linear_y

  return adsrEnvelope(t, adsr.x, adsr.y, adsr.z, adsr.w);
}
```

---

## Composite Patterns

### Layered Pattern System

Multiple patterns are combined using blend modes:

```typescript
interface CompositePattern {
  layers: PatternLayer[];
  blendMode: 'multiply' | 'add' | 'overlay' | 'difference';
}

interface PatternLayer {
  type: 'slicer' | 'lfo' | 'grain' | 'adsr';
  pattern: SlicerPattern | LFOPattern | GrainPattern | ADSRPattern;
  opacity: number;
  scale: number;
  rotation: number;
}

function generateCompositePattern(seed: number, complexity: number): CompositePattern {
  const rng = new SeededRandom(seed);
  const layerCount = Math.min(Math.floor(complexity * 3) + 1, 4);

  const layers: PatternLayer[] = [];
  const types = ['slicer', 'lfo', 'grain', 'adsr'];

  for (let i = 0; i < layerCount; i++) {
    const type = rng.pick(types) as PatternLayer['type'];
    layers.push({
      type,
      pattern: generatePatternByType(type, seed + i * 1000),
      opacity: rng.range(0.3, 1.0),
      scale: rng.range(0.5, 2.0),
      rotation: rng.range(0, Math.PI * 2)
    });
  }

  return {
    layers,
    blendMode: rng.pick(['multiply', 'add', 'overlay', 'difference'])
  };
}
```

### Blend Mode Functions

```glsl
float blendMultiply(float a, float b) {
  return a * b;
}

float blendAdd(float a, float b) {
  return min(a + b, 1.0);
}

float blendOverlay(float a, float b) {
  return a < 0.5 ? 2.0 * a * b : 1.0 - 2.0 * (1.0 - a) * (1.0 - b);
}

float blendDifference(float a, float b) {
  return abs(a - b);
}
```

---

## Audio Reactivity

### Pattern Modulation

Patterns respond to audio analysis data:

```typescript
interface PatternAudioBinding {
  frequencyBand: 'bass' | 'mid' | 'high';
  parameter: 'scale' | 'rotation' | 'intensity' | 'speed';
  amount: number;  // Modulation strength 0-1
  smoothing: number;  // Interpolation factor
}
```

**Example Bindings:**

| Audio Band | Pattern Parameter | Effect |
|------------|------------------|--------|
| Bass | Scale | Patterns breathe/expand |
| Mid | Rotation | Slow rotation modulation |
| High | Intensity | Brightness/contrast pulse |
| Transient | Distortion | Sudden warping on beats |

### Shader Uniforms for Audio

```glsl
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_transient;
uniform float u_time;

vec2 audioDistortUV(vec2 uv, float bass, float transient) {
  // Bass causes slow breathing distortion
  float breathe = sin(u_time * 0.5) * bass * 0.02;

  // Transients cause sharp jitter
  float jitter = transient * 0.01;

  return uv + vec2(
    sin(uv.y * 10.0 + u_time) * breathe + jitter,
    cos(uv.x * 10.0 + u_time) * breathe
  );
}
```

---

## Surface-Specific Patterns

### Wall Patterns

```typescript
interface WallPatternConfig {
  basePattern: CompositePattern;
  verticalBias: number;    // Prefer vertical patterns (wallpaper-like)
  wainscoting: boolean;    // Split pattern at dado rail height
  wainscotingHeight: number;
}

function generateWallPattern(seed: number, roomIndex: number): WallPatternConfig {
  const rng = new SeededRandom(seed);
  const abnormality = getAbnormalityFactor(roomIndex);

  return {
    basePattern: generateCompositePattern(seed, 0.3 + abnormality * 0.5),
    verticalBias: 0.7,
    wainscoting: rng.next() < 0.3,
    wainscotingHeight: rng.range(0.3, 0.4)
  };
}
```

### Floor Patterns

```typescript
interface FloorPatternConfig {
  basePattern: CompositePattern;
  tileGrid: boolean;       // Overlay tile grid lines
  tileSize: number;
  groutWidth: number;
}

function generateFloorPattern(seed: number): FloorPatternConfig {
  const rng = new SeededRandom(seed);

  return {
    basePattern: generateCompositePattern(seed, 0.4),
    tileGrid: rng.next() < 0.6,
    tileSize: rng.range(0.5, 2.0),
    groutWidth: rng.range(0.01, 0.03)
  };
}
```

### Ceiling Patterns

```typescript
interface CeilingPatternConfig {
  basePattern: CompositePattern;
  radialFromCenter: boolean;  // Pattern radiates from light fixtures
  coffers: boolean;           // Coffered ceiling grid
}
```

---

## Pattern Animation

### Time-Based Evolution

```glsl
uniform float u_time;
uniform float u_patternSpeed;

float animatedPattern(vec2 uv, float baseValue, float time, float speed) {
  // Slow drift over time
  vec2 driftedUV = uv + vec2(sin(time * 0.1), cos(time * 0.1)) * 0.1 * speed;

  // Pulsing intensity
  float pulse = sin(time * speed) * 0.1 + 0.9;

  return baseValue * pulse;
}
```

### Morphing Between Patterns

For smooth transitions when entering new rooms:

```typescript
function morphPatterns(
  patternA: CompositePattern,
  patternB: CompositePattern,
  t: number  // 0 = A, 1 = B
): void {
  // Shader receives both patterns and blend factor
  material.uniforms.u_patternBlend.value = t;
  // Cross-fade handled in shader
}
```

---

## Color Application

### Pattern Color Mapping

Patterns are grayscale values mapped to the pale-strata color palette:

```glsl
uniform vec3 u_colorPrimary;    // #c792f5
uniform vec3 u_colorSecondary;  // #8eecf5
uniform vec3 u_colorBackground; // #1a1834

vec3 mapPatternToColor(float pattern, float audioIntensity) {
  // Base color from background
  vec3 color = u_colorBackground;

  // Primary accent in pattern peaks
  color = mix(color, u_colorPrimary, pattern * 0.6);

  // Secondary accent on audio peaks
  color = mix(color, u_colorSecondary, pattern * audioIntensity * 0.4);

  return color;
}
```

---

## Pattern Generation Pipeline

```typescript
class PatternGenerator {
  generateForRoom(roomSeed: number, roomIndex: number): RoomPatterns {
    const rng = new SeededRandom(roomSeed + 10000);

    return {
      walls: this.generateWallPatterns(roomSeed, roomIndex),
      floor: generateFloorPattern(roomSeed + 1),
      ceiling: this.generateCeilingPattern(roomSeed + 2),
      doorframes: this.generateDoorframePattern(roomSeed + 3)
    };
  }

  private generateWallPatterns(seed: number, roomIndex: number): WallPatternConfig[] {
    // Generate unique pattern for each wall
    return [Wall.NORTH, Wall.SOUTH, Wall.EAST, Wall.WEST].map((wall, i) =>
      generateWallPattern(seed + i * 100, roomIndex)
    );
  }
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/generators/PatternGenerator.ts` | Main pattern generation class |
| `src/utils/patterns.ts` | Pattern utility functions |
| `src/shaders/patterns.glsl` | GLSL pattern library (imported into materials) |
| `src/types/pattern.ts` | TypeScript interfaces |
