# Shader Architecture Specification

## Overview

The shader system drives all visual effects in Keegan's Mind Palace, creating audio-reactive materials that respond to frequency data, time-based dread (the Growl), and procedural patterns. Built on Three.js ShaderMaterial with React Three Fiber integration.

---

## Uniform Structure

### Core Uniforms

All custom materials share these base uniforms:

```typescript
interface BaseUniforms {
  // Time
  u_time: { value: number };           // Elapsed time in seconds
  u_deltaTime: { value: number };      // Frame delta

  // Audio (0-1 normalized)
  u_bass: { value: number };
  u_mid: { value: number };
  u_high: { value: number };
  u_transient: { value: number };      // Transient intensity

  // Smoothed audio (for gradual effects)
  u_bassSmooth: { value: number };
  u_midSmooth: { value: number };
  u_highSmooth: { value: number };

  // Environment
  u_seed: { value: number };           // Room seed for procedural
  u_roomIndex: { value: number };      // Current room depth
  u_abnormality: { value: number };    // 0-1 room strangeness

  // The Growl
  u_growlIntensity: { value: number }; // 0-1 time-based dread

  // Colors (pale-strata palette)
  u_colorPrimary: { value: THREE.Color };     // #c792f5
  u_colorSecondary: { value: THREE.Color };   // #8eecf5
  u_colorBackground: { value: THREE.Color };  // #1a1834
  u_colorGradientStart: { value: THREE.Color }; // #3a3861
  u_colorGradientEnd: { value: THREE.Color };   // #2c2c4b

  // Resolution
  u_resolution: { value: THREE.Vector2 };
}
```

### Material-Specific Uniforms

```typescript
interface WallMaterialUniforms extends BaseUniforms {
  u_patternScale: { value: number };
  u_patternRotation: { value: number };
  u_breatheIntensity: { value: number };
  u_rippleFrequency: { value: number };
  u_rippleIntensity: { value: number };
  u_damageAmount: { value: number };
}

interface DoorwayMaterialUniforms extends BaseUniforms {
  u_glowIntensity: { value: number };
  u_portalDepth: { value: number };
  u_shimmerSpeed: { value: number };
  u_variationLevel: { value: number }; // Portal variation indicator
}

interface CircuitryMaterialUniforms extends BaseUniforms {
  u_circuitDensity: { value: number };
  u_pulseSpeed: { value: number };
  u_dataFlowDirection: { value: THREE.Vector2 };
}
```

---

## Vertex Shader: liminal.vert

### Audio-Reactive Displacement

```glsl
#version 300 es
precision highp float;

// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv;

// Uniforms
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_transient;
uniform float u_breatheIntensity;
uniform float u_rippleIntensity;
uniform float u_rippleFrequency;

// Outputs
out vec2 vUv;
out vec3 vNormal;
out vec3 vWorldPosition;
out float vDisplacement;

// Noise function for organic displacement
float noise(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;

  // === Breathing Effect (Bass) ===
  // Entire room expands/contracts with low frequencies
  float breathe = sin(u_time * 0.5) * u_bass * u_breatheIntensity;
  pos += normal * breathe * 0.1;

  // === Ripple Effect (Mid) ===
  // Wave displacement across surfaces
  float ripple = sin(pos.x * u_rippleFrequency + u_time * 2.0) *
                 sin(pos.y * u_rippleFrequency + u_time * 1.5) *
                 u_mid * u_rippleIntensity;
  pos += normal * ripple * 0.05;

  // === Transient Spike ===
  // Sharp displacement on beat impacts
  float spike = u_transient * noise(pos * 10.0 + u_time) * 0.02;
  pos += normal * spike;

  vDisplacement = breathe + ripple + spike;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
```

---

## Fragment Shader: liminal.frag

### Core Fragment Shader

```glsl
#version 300 es
precision highp float;

// Inputs
in vec2 vUv;
in vec3 vNormal;
in vec3 vWorldPosition;
in float vDisplacement;

// Audio uniforms
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_transient;
uniform float u_bassSmooth;
uniform float u_midSmooth;
uniform float u_highSmooth;

// Environment uniforms
uniform float u_seed;
uniform float u_roomIndex;
uniform float u_abnormality;
uniform float u_growlIntensity;

// Color uniforms
uniform vec3 u_colorPrimary;
uniform vec3 u_colorSecondary;
uniform vec3 u_colorBackground;

// Pattern uniforms
uniform float u_patternScale;
uniform float u_patternRotation;

// Output
out vec4 fragColor;

// ===== Pattern Functions =====

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < octaves; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Slicer-style grid pattern
float slicerPattern(vec2 uv, float steps) {
  float cell = floor(uv.x * steps);
  float intensity = hash(vec2(cell, u_seed));
  return step(0.4, intensity) * intensity;
}

// LFO wave pattern
float lfoPattern(vec2 uv, float freq, float waveType) {
  float t = (uv.x + uv.y) * freq + u_time * 0.1;

  if (waveType < 0.25) return sin(t * 6.28318) * 0.5 + 0.5;
  if (waveType < 0.5) return step(0.5, fract(t));
  if (waveType < 0.75) return fract(t);
  return abs(fract(t) * 2.0 - 1.0);
}

// ===== Main =====

void main() {
  // Rotate UVs based on pattern rotation
  vec2 uv = vUv;
  float c = cos(u_patternRotation);
  float s = sin(u_patternRotation);
  uv = mat2(c, -s, s, c) * (uv - 0.5) + 0.5;

  // Scale pattern
  vec2 scaledUV = uv * u_patternScale;

  // === Base Pattern ===
  float pattern = 0.0;
  pattern += slicerPattern(scaledUV, 16.0) * 0.4;
  pattern += lfoPattern(scaledUV, 4.0, hash(vec2(u_seed, 0.0))) * 0.3;
  pattern += fbm(scaledUV * 8.0, 4) * 0.3;

  // === Audio Modulation ===
  // Bass affects pattern intensity
  pattern *= 0.7 + u_bassSmooth * 0.3;

  // Mid frequencies add subtle distortion
  vec2 distortedUV = scaledUV + vec2(
    sin(scaledUV.y * 10.0 + u_time) * u_midSmooth * 0.02,
    cos(scaledUV.x * 10.0 + u_time) * u_midSmooth * 0.02
  );
  float distortedPattern = fbm(distortedUV * 8.0, 4);
  pattern = mix(pattern, distortedPattern, u_midSmooth * 0.3);

  // High frequencies add sparkle/detail
  float highDetail = hash(scaledUV * 100.0 + u_time * 0.1);
  pattern += highDetail * u_highSmooth * 0.1;

  // === Transient Effects ===
  // Flash on beat
  float transientFlash = u_transient * 0.3;

  // === Growl Effects ===
  // Darken and distort with Growl intensity
  float growlDarken = 1.0 - u_growlIntensity * 0.3;
  float growlDistort = sin(vWorldPosition.x * 5.0 + u_time * u_growlIntensity) * u_growlIntensity * 0.02;
  pattern = pattern * growlDarken + growlDistort;

  // === Color Mapping ===
  vec3 color = u_colorBackground;

  // Primary color in pattern bright areas
  color = mix(color, u_colorPrimary, pattern * 0.5);

  // Secondary color on audio peaks
  float audioHighlight = (u_bassSmooth + u_midSmooth + u_highSmooth) / 3.0;
  color = mix(color, u_colorSecondary, pattern * audioHighlight * 0.3);

  // Transient flash
  color += u_colorSecondary * transientFlash;

  // === Displacement Shading ===
  // Brighter where displaced
  color += vDisplacement * u_colorPrimary * 0.5;

  // === Abnormality Effects ===
  // Subtle color shift in deeper rooms
  float abnormalShift = sin(u_time * 0.2 + vWorldPosition.y) * u_abnormality * 0.1;
  color.r += abnormalShift;
  color.b -= abnormalShift * 0.5;

  // === Output ===
  fragColor = vec4(color, 1.0);
}
```

---

## Doorway Glow Shader

### doorway.frag

```glsl
#version 300 es
precision highp float;

in vec2 vUv;
in vec3 vNormal;

uniform float u_time;
uniform float u_bassSmooth;
uniform float u_glowIntensity;
uniform float u_variationLevel;
uniform vec3 u_colorPrimary;
uniform vec3 u_colorSecondary;

out vec4 fragColor;

void main() {
  // Edge glow - stronger at edges
  float edgeDist = min(vUv.x, min(1.0 - vUv.x, min(vUv.y, 1.0 - vUv.y)));
  float edgeGlow = smoothstep(0.2, 0.0, edgeDist);

  // Pulsing with bass
  float pulse = 0.8 + sin(u_time * 2.0) * 0.2 + u_bassSmooth * 0.3;
  edgeGlow *= pulse;

  // Shimmer effect
  float shimmer = sin(vUv.y * 50.0 + u_time * 3.0) * 0.1 + 0.9;
  edgeGlow *= shimmer;

  // Color based on variation level
  vec3 glowColor = mix(u_colorPrimary, u_colorSecondary, u_variationLevel * 0.5);

  // Output with additive-style glow
  vec3 color = glowColor * edgeGlow * u_glowIntensity;

  fragColor = vec4(color, edgeGlow * 0.8);
}
```

---

## Circuitry Overlay Shader

### circuitry.frag

```glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_seed;
uniform float u_circuitDensity;
uniform float u_pulseSpeed;
uniform vec2 u_dataFlowDirection;
uniform vec3 u_colorSecondary;

out vec4 fragColor;

// Voronoi for circuit cell structure
vec2 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);

  vec2 mg, mr;
  float md = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(fract(sin(dot(n + g, vec2(127.1, 311.7) + u_seed)) * 43758.5453));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md = d;
        mr = r;
        mg = g;
      }
    }
  }

  return mr;
}

// Circuit trace pattern
float circuitTrace(vec2 uv) {
  vec2 scaled = uv * u_circuitDensity;
  vec2 cell = voronoi(scaled);

  // Distance to cell edge creates trace lines
  float d = length(cell);

  // Horizontal and vertical traces
  float hLine = smoothstep(0.02, 0.0, abs(cell.y));
  float vLine = smoothstep(0.02, 0.0, abs(cell.x));

  // Combine traces
  float trace = max(hLine, vLine);

  // Add junction points
  float junction = smoothstep(0.1, 0.05, d);

  return max(trace, junction);
}

void main() {
  float circuit = circuitTrace(vUv);

  // Data flow animation
  float flow = sin(
    dot(vUv, u_dataFlowDirection) * 20.0 -
    u_time * u_pulseSpeed +
    u_bass * 2.0
  ) * 0.5 + 0.5;

  // Pulse with mid frequencies
  float pulse = 0.5 + u_mid * 0.5;

  // Final intensity
  float intensity = circuit * flow * pulse;

  // Glow color
  vec3 color = u_colorSecondary * intensity * 2.0;

  fragColor = vec4(color, intensity * 0.8);
}
```

---

## Glitch Effect Shader

### glitch.frag (Post-Processing)

```glsl
#version 300 es
precision highp float;

in vec2 vUv;

uniform sampler2D u_sceneTexture;
uniform float u_time;
uniform float u_transient;
uniform float u_growlIntensity;
uniform float u_glitchIntensity; // Combined trigger value
uniform vec2 u_resolution;

out vec4 fragColor;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // === Screen Tear ===
  // Horizontal slice displacement
  float tearStrength = u_glitchIntensity * 0.1;
  float tearLine = step(0.95, random(vec2(floor(u_time * 10.0), floor(uv.y * 10.0))));
  uv.x += tearLine * tearStrength * (random(vec2(u_time)) - 0.5);

  // === RGB Split ===
  float splitAmount = u_glitchIntensity * 0.01;

  vec4 colorR = texture(u_sceneTexture, uv + vec2(splitAmount, 0.0));
  vec4 colorG = texture(u_sceneTexture, uv);
  vec4 colorB = texture(u_sceneTexture, uv - vec2(splitAmount, 0.0));

  vec4 color = vec4(colorR.r, colorG.g, colorB.b, 1.0);

  // === Scanlines ===
  float scanline = sin(uv.y * u_resolution.y * 2.0) * 0.02 * u_glitchIntensity;
  color.rgb -= scanline;

  // === Noise Overlay ===
  float noise = random(uv + u_time) * u_glitchIntensity * 0.1;
  color.rgb += noise;

  // === Color Inversion (rare, intense) ===
  float invertChance = step(0.98, random(vec2(floor(u_time * 5.0), 0.0))) * step(0.7, u_glitchIntensity);
  color.rgb = mix(color.rgb, 1.0 - color.rgb, invertChance);

  fragColor = color;
}
```

---

## Post-Processing Pipeline

### Effect Composer Setup

```typescript
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

function PostProcessing({ audioLevels, growlIntensity }) {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.5 + audioLevels.bass * 0.5}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new THREE.Vector2(
          audioLevels.transient * 0.002,
          audioLevels.transient * 0.001
        )}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        eskil={false}
        offset={0.1 + growlIntensity * 0.2}
        darkness={0.5 + growlIntensity * 0.3}
      />
      {/* Custom glitch pass when needed */}
      <GlitchEffect intensity={glitchIntensity} />
    </EffectComposer>
  );
}
```

---

## Shader Material Factory

### Creating Audio-Reactive Materials

```typescript
import * as THREE from 'three';

interface ShaderMaterialConfig {
  seed: number;
  roomIndex: number;
  patternScale?: number;
}

function createLiminalMaterial(config: ShaderMaterialConfig): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: liminalVert,
    fragmentShader: liminalFrag,
    uniforms: {
      // Time
      u_time: { value: 0 },
      u_deltaTime: { value: 0 },

      // Audio
      u_bass: { value: 0 },
      u_mid: { value: 0 },
      u_high: { value: 0 },
      u_transient: { value: 0 },
      u_bassSmooth: { value: 0 },
      u_midSmooth: { value: 0 },
      u_highSmooth: { value: 0 },

      // Environment
      u_seed: { value: config.seed },
      u_roomIndex: { value: config.roomIndex },
      u_abnormality: { value: getAbnormalityFactor(config.roomIndex) },
      u_growlIntensity: { value: 0 },

      // Colors
      u_colorPrimary: { value: new THREE.Color('#c792f5') },
      u_colorSecondary: { value: new THREE.Color('#8eecf5') },
      u_colorBackground: { value: new THREE.Color('#1a1834') },

      // Pattern
      u_patternScale: { value: config.patternScale ?? 1.0 },
      u_patternRotation: { value: 0 },
      u_breatheIntensity: { value: 1.0 },
      u_rippleFrequency: { value: 3.0 },
      u_rippleIntensity: { value: 0.5 },

      // Resolution
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    side: THREE.DoubleSide
  });
}
```

### Frame Update Hook

```typescript
function useShaderUpdate(
  materialRef: React.RefObject<THREE.ShaderMaterial>,
  audioStore: AudioStore,
  timeStore: TimeStore
) {
  useFrame((state, delta) => {
    if (!materialRef.current) return;

    const uniforms = materialRef.current.uniforms;
    const { bassSmooth, midSmooth, highSmooth, transient } = audioStore;
    const { growlIntensity } = timeStore;

    // Time
    uniforms.u_time.value = state.clock.elapsedTime;
    uniforms.u_deltaTime.value = delta;

    // Audio
    uniforms.u_bass.value = audioStore.bass;
    uniforms.u_mid.value = audioStore.mid;
    uniforms.u_high.value = audioStore.high;
    uniforms.u_transient.value = transient;
    uniforms.u_bassSmooth.value = bassSmooth;
    uniforms.u_midSmooth.value = midSmooth;
    uniforms.u_highSmooth.value = highSmooth;

    // Growl
    uniforms.u_growlIntensity.value = growlIntensity;
  });
}
```

---

## Performance Optimizations

### Shader Complexity Levels

```typescript
enum ShaderQuality {
  LOW = 'low',      // Mobile, reduced effects
  MEDIUM = 'medium', // Laptop, balanced
  HIGH = 'high'     // Desktop, full effects
}

function getShaderDefines(quality: ShaderQuality): Record<string, string> {
  return {
    QUALITY_LOW: quality === ShaderQuality.LOW ? '1' : '0',
    QUALITY_MEDIUM: quality === ShaderQuality.MEDIUM ? '1' : '0',
    QUALITY_HIGH: quality === ShaderQuality.HIGH ? '1' : '0',
    FBM_OCTAVES: quality === ShaderQuality.HIGH ? '6' : quality === ShaderQuality.MEDIUM ? '4' : '2'
  };
}
```

### Conditional Shader Code

```glsl
#if QUALITY_HIGH
  #define FBM_OCTAVES 6
  #define ENABLE_DISPLACEMENT 1
  #define ENABLE_CIRCUITRY 1
#elif QUALITY_MEDIUM
  #define FBM_OCTAVES 4
  #define ENABLE_DISPLACEMENT 1
  #define ENABLE_CIRCUITRY 0
#else
  #define FBM_OCTAVES 2
  #define ENABLE_DISPLACEMENT 0
  #define ENABLE_CIRCUITRY 0
#endif
```

---

## Files

| File | Purpose |
|------|---------|
| `src/shaders/liminal.vert` | Main vertex shader with displacement |
| `src/shaders/liminal.frag` | Main fragment shader with patterns |
| `src/shaders/doorway.frag` | Doorway glow effect |
| `src/shaders/circuitry.frag` | Circuit trace overlay |
| `src/shaders/glitch.frag` | Post-processing glitch effect |
| `src/shaders/glow.frag` | Bloom enhancement shader |
| `src/systems/AudioReactiveSystem.ts` | Uniform update logic |
| `src/utils/shaderFactory.ts` | Material creation helpers |
