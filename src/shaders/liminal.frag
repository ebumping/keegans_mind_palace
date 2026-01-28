/**
 * Liminal Fragment Shader
 *
 * Audio-reactive fragment effects including:
 * - Pattern distortion driven by mid frequencies
 * - Color shifting based on audio levels
 * - Glow pulsing with bass
 * - Transient-triggered glitches
 * - Growl-based dread effects
 */

precision highp float;

// Inputs from vertex shader
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

// Time uniforms
uniform float u_time;
uniform float u_deltaTime;

// Audio uniforms (0-1 normalized)
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

// Color uniforms (pale-strata palette)
uniform vec3 u_colorPrimary;     // #c792f5
uniform vec3 u_colorSecondary;   // #8eecf5
uniform vec3 u_colorBackground;  // #1a1834
uniform vec3 u_colorGradientStart; // #3a3861
uniform vec3 u_colorGradientEnd;   // #2c2c4b

// Pattern uniforms
uniform float u_patternScale;
uniform float u_patternRotation;

// Resolution for effects
uniform vec2 u_resolution;

// ===== Noise Functions =====

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion for complex patterns
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// ===== Pattern Functions (derived from pale-strata) =====

// Slicer-style grid pattern (8/16/32 step sequences)
float slicerPattern(vec2 uv, float steps) {
  float cell = floor(uv.x * steps);
  float intensity = hash(vec2(cell, u_seed));
  float threshold = 0.4 + u_bassSmooth * 0.2; // Bass affects threshold
  return step(threshold, intensity) * intensity;
}

// LFO wave pattern with multiple waveform types
float lfoPattern(vec2 uv, float freq, float waveType) {
  float t = (uv.x + uv.y) * freq + u_time * 0.1;

  // Sine wave
  if (waveType < 0.25) return sin(t * 6.28318) * 0.5 + 0.5;
  // Square wave
  if (waveType < 0.5) return step(0.5, fract(t));
  // Sawtooth
  if (waveType < 0.75) return fract(t);
  // Triangle
  return abs(fract(t) * 2.0 - 1.0);
}

// Grain scheduling pattern (derived from pale-strata grain intervals)
float grainPattern(vec2 uv, float density) {
  vec2 cell = floor(uv * density);
  float grain = hash21(cell + u_seed);
  float timing = fract(u_time * 0.3 + grain);
  return smoothstep(0.0, 0.1, timing) * smoothstep(0.3, 0.1, timing);
}

// ===== Main Fragment Shader =====

void main() {
  // === UV Transformation ===
  vec2 uv = vUv;

  // Rotate UVs based on pattern rotation
  float c = cos(u_patternRotation);
  float s = sin(u_patternRotation);
  uv = mat2(c, -s, s, c) * (uv - 0.5) + 0.5;

  // Scale pattern
  vec2 scaledUV = uv * u_patternScale;

  // === Audio-Driven UV Distortion ===
  // Mid frequencies create subtle UV warping
  vec2 distortedUV = scaledUV + vec2(
    sin(scaledUV.y * 10.0 + u_time) * u_midSmooth * 0.03,
    cos(scaledUV.x * 10.0 + u_time * 0.8) * u_midSmooth * 0.03
  );

  // === Base Pattern Generation ===
  float pattern = 0.0;

  // Slicer pattern (16 steps, classic pale-strata)
  pattern += slicerPattern(scaledUV, 16.0) * 0.35;

  // LFO pattern - waveform type varies by room seed
  float waveType = hash(vec2(u_seed, 0.0));
  pattern += lfoPattern(scaledUV, 4.0, waveType) * 0.25;

  // FBM noise for organic texture
  pattern += fbm(distortedUV * 6.0, 4) * 0.3;

  // Grain pattern for sparkle
  pattern += grainPattern(scaledUV, 20.0) * u_highSmooth * 0.2;

  // === Audio Modulation ===
  // Bass affects overall pattern intensity
  pattern *= 0.6 + u_bassSmooth * 0.4;

  // High frequencies add fine detail/sparkle
  float highDetail = hash(scaledUV * 100.0 + u_time * 0.1);
  pattern += highDetail * u_highSmooth * 0.15;

  // === Transient Glitch Effects ===
  // Color inversion flash on strong transients
  float transientFlash = u_transient * 0.4;

  // UV scramble on transient
  vec2 glitchUV = scaledUV;
  if (u_transient > 0.3) {
    float glitchAmount = u_transient * 0.1;
    glitchUV.x += floor(hash(vec2(floor(u_time * 20.0), scaledUV.y * 10.0)) * 3.0 - 1.0) * glitchAmount;
  }

  // === Growl Effects (Time-Based Dread) ===
  // Darken and distort with Growl intensity
  float growlDarken = 1.0 - u_growlIntensity * 0.35;

  // Growl distortion - subtle warping that increases over time
  float growlDistort = sin(vWorldPosition.x * 5.0 + u_time * u_growlIntensity * 2.0) *
                       cos(vWorldPosition.z * 3.0 + u_time * u_growlIntensity * 1.5) *
                       u_growlIntensity * 0.03;
  pattern = pattern * growlDarken + growlDistort;

  // Shadow movement with Growl
  float shadowFlicker = 1.0 - u_growlIntensity * 0.2 * (sin(u_time * 3.0 + vWorldPosition.y) * 0.5 + 0.5);

  // === Color Mapping (Pale-Strata Palette) ===
  // Start with background/gradient
  vec3 color = mix(u_colorGradientEnd, u_colorGradientStart, pattern * 0.5);

  // Primary color in pattern bright areas
  color = mix(color, u_colorPrimary, pattern * 0.4);

  // Secondary color on audio peaks (cyan highlights)
  float audioHighlight = (u_bassSmooth + u_midSmooth + u_highSmooth) / 3.0;
  color = mix(color, u_colorSecondary, pattern * audioHighlight * 0.25);

  // === Displacement Shading ===
  // Brighter where displaced (audio-reactive glow)
  vec3 displacementGlow = u_colorPrimary * abs(vDisplacement) * 3.0;
  color += displacementGlow;

  // === Transient Flash ===
  // Quick cyan flash on beat
  color += u_colorSecondary * transientFlash;

  // === Abnormality Effects (Deeper Rooms) ===
  // Subtle color shift in deeper rooms
  float abnormalShift = sin(u_time * 0.2 + vWorldPosition.y * 0.5) * u_abnormality * 0.15;
  color.r += abnormalShift;
  color.b -= abnormalShift * 0.5;
  color.g += abnormalShift * 0.3;

  // === Apply Growl Shadow ===
  color *= shadowFlicker;

  // === Rim Lighting Effect ===
  // Subtle glow at grazing angles
  vec3 viewDir = normalize(-vWorldPosition);
  float rimFactor = 1.0 - max(0.0, dot(vNormal, viewDir));
  rimFactor = pow(rimFactor, 3.0);
  color += u_colorPrimary * rimFactor * 0.2 * (0.5 + u_bassSmooth * 0.5);

  // === Final Output ===
  // Ensure colors stay in valid range
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
