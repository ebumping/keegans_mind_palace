/**
 * Portal Shimmer Fragment Shader
 *
 * Visual effect for doorways that lead to alternate version rooms.
 * Intensity and color vary based on variation level:
 * - Level 1: Nearly invisible purple flicker
 * - Level 2: Subtle purple wave at edges
 * - Level 3: Noticeable shimmer with slight distortion
 * - Level 4: Strong shimmer with geometry warping
 * - Level 5: Intense glow, reality breaking at threshold
 */

precision highp float;

// Inputs from vertex shader
varying vec2 vUv;
varying vec3 vWorldPosition;

// Time uniform
uniform float u_time;

// Variation level (0-5)
uniform float u_variationLevel;

// Shimmer intensity (0-1)
uniform float u_shimmerIntensity;

// Shimmer color (varies by level)
uniform vec3 u_shimmerColor;

// Audio uniforms for reactivity
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_transient;

// Growl intensity
uniform float u_growlIntensity;

// Background color for blending
uniform vec3 u_backgroundColor;

// ===== Noise Functions =====

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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// ===== Shimmer Effects =====

/**
 * Calculate edge distance - shimmer is strongest at doorway edges
 */
float getEdgeDistance(vec2 uv) {
  // Distance from edges
  float distX = min(uv.x, 1.0 - uv.x);
  float distY = min(uv.y, 1.0 - uv.y);
  float edgeDist = min(distX, distY);

  // Stronger shimmer at top (threshold) and sides (jambs)
  float topWeight = smoothstep(0.9, 0.95, uv.y) * 0.5;
  float sideWeight = (1.0 - smoothstep(0.0, 0.1, distX)) * 0.3;

  return edgeDist + topWeight + sideWeight;
}

/**
 * Level 1: Nearly invisible, occasional purple flicker
 */
vec4 shimmerLevel1(vec2 uv, float edge) {
  // Very subtle flickering
  float flicker = sin(u_time * 8.0 + uv.y * 20.0) * 0.5 + 0.5;
  flicker *= sin(u_time * 3.7) * 0.5 + 0.5;

  // Only visible at edges occasionally
  float visibility = step(0.95, flicker) * edge * 0.15;

  return vec4(u_shimmerColor, visibility);
}

/**
 * Level 2: Subtle purple wave at doorway edges
 */
vec4 shimmerLevel2(vec2 uv, float edge) {
  // Wave pattern
  float wave = sin(uv.y * 20.0 + u_time * 2.0) * 0.5 + 0.5;
  wave *= sin(uv.y * 5.0 - u_time * 1.5) * 0.5 + 0.5;

  // Edge glow
  float edgeGlow = smoothstep(0.15, 0.0, edge) * 0.5;

  // Combined visibility
  float visibility = wave * edgeGlow * 0.35;

  // Audio reactivity - bass slightly boosts shimmer
  visibility *= 1.0 + u_bass * 0.2;

  return vec4(u_shimmerColor, visibility);
}

/**
 * Level 3: Noticeable shimmer with slight distortion
 */
vec4 shimmerLevel3(vec2 uv, float edge) {
  // Distorted UVs
  vec2 distortedUV = uv;
  distortedUV.x += sin(uv.y * 15.0 + u_time * 3.0) * 0.02;
  distortedUV.y += cos(uv.x * 10.0 + u_time * 2.5) * 0.01;

  // Multi-layered waves
  float wave1 = sin(distortedUV.y * 25.0 + u_time * 3.0) * 0.5 + 0.5;
  float wave2 = sin(distortedUV.x * 15.0 - u_time * 2.0) * 0.5 + 0.5;
  float wave = (wave1 + wave2) * 0.5;

  // Edge glow - stronger
  float edgeGlow = smoothstep(0.2, 0.0, edge);

  // Noise overlay for organic feel
  float n = noise(distortedUV * 30.0 + u_time);

  // Combined
  float visibility = (wave * 0.6 + n * 0.4) * edgeGlow * 0.5;

  // Audio reactivity
  visibility *= 1.0 + u_mid * 0.3 + u_bass * 0.2;

  // Occasional bright flash
  float flash = step(0.98, sin(u_time * 7.3)) * 0.3;
  visibility += flash * edgeGlow;

  return vec4(u_shimmerColor, visibility);
}

/**
 * Level 4: Strong shimmer with geometry warping at edges
 */
vec4 shimmerLevel4(vec2 uv, float edge) {
  // Significant UV distortion
  float distortAmount = 0.05 + u_bass * 0.02;
  vec2 distortedUV = uv;
  distortedUV.x += sin(uv.y * 20.0 + u_time * 4.0) * distortAmount;
  distortedUV.y += cos(uv.x * 15.0 + u_time * 3.5) * distortAmount;
  distortedUV += vec2(fbm(uv * 10.0 + u_time * 0.5)) * 0.03;

  // Intense multi-wave
  float wave = sin(distortedUV.y * 30.0 + u_time * 4.0) * 0.5 + 0.5;
  wave *= cos(distortedUV.x * 20.0 - u_time * 3.0) * 0.5 + 0.5;
  wave = pow(wave, 0.7); // Boost contrast

  // Edge glow - very strong
  float edgeGlow = smoothstep(0.25, 0.0, edge);

  // Reality break effect - occasional void glimpses
  float voidGlimpse = smoothstep(0.97, 0.99, sin(u_time * 5.0 + uv.y * 10.0));

  // Swirling effect
  float angle = atan(uv.y - 0.5, uv.x - 0.5);
  float swirl = sin(angle * 3.0 + u_time * 2.0) * 0.5 + 0.5;

  // Combined
  float visibility = ((wave + swirl * 0.3) * edgeGlow + voidGlimpse * 0.2) * 0.65;

  // Strong audio reactivity
  visibility *= 1.0 + u_bass * 0.4 + u_mid * 0.3;
  visibility += u_transient * edgeGlow * 0.2;

  // Color shift towards danger
  vec3 warningColor = mix(u_shimmerColor, vec3(1.0, 0.2, 0.2), 0.3);

  return vec4(warningColor, visibility);
}

/**
 * Level 5: Intense glow, reality breaking at threshold
 */
vec4 shimmerLevel5(vec2 uv, float edge) {
  // Extreme UV distortion
  float distortAmount = 0.1 + u_bass * 0.05;
  vec2 distortedUV = uv;
  distortedUV.x += sin(uv.y * 30.0 + u_time * 5.0) * distortAmount;
  distortedUV.y += cos(uv.x * 25.0 + u_time * 4.5) * distortAmount;
  distortedUV += vec2(fbm(uv * 15.0 + u_time)) * 0.08;

  // Center distortion - reality tearing
  vec2 center = uv - 0.5;
  float dist = length(center);
  float tear = smoothstep(0.3, 0.0, dist);

  // Multiple noise layers
  float n1 = noise(distortedUV * 50.0 + u_time * 2.0);
  float n2 = noise(distortedUV * 30.0 - u_time * 1.5);
  float combinedNoise = (n1 + n2) * 0.5;

  // Edge glow - maximum
  float edgeGlow = smoothstep(0.35, 0.0, edge);

  // Reality break pulses
  float pulse = sin(u_time * 6.0) * 0.5 + 0.5;
  float breakPulse = pow(pulse, 3.0) * tear;

  // Void showing through
  float voidReveal = smoothstep(0.9, 0.95, combinedNoise) * tear * 0.4;

  // Combined - very intense
  float visibility = (edgeGlow * 0.8 + breakPulse * 0.4 + voidReveal) * 0.9;

  // Extreme audio reactivity
  visibility *= 1.0 + u_bass * 0.5 + u_mid * 0.4 + u_high * 0.3;
  visibility += u_transient * 0.3;

  // Danger color with void black showing through
  vec3 dangerColor = mix(u_shimmerColor, vec3(1.0, 0.1, 0.1), 0.5);
  dangerColor = mix(dangerColor, vec3(0.02, 0.01, 0.05), voidReveal);

  // Add electric crackling
  float crackle = step(0.97, noise(uv * 100.0 + u_time * 10.0));
  dangerColor += vec3(0.5, 0.3, 0.8) * crackle;

  return vec4(dangerColor, min(visibility, 0.95));
}

// ===== Main Shader =====

void main() {
  // Early out if no variation
  if (u_variationLevel < 0.5) {
    discard;
  }

  vec2 uv = vUv;
  float edge = getEdgeDistance(uv);

  vec4 shimmer;

  // Select shimmer based on variation level
  if (u_variationLevel < 1.5) {
    shimmer = shimmerLevel1(uv, edge);
  } else if (u_variationLevel < 2.5) {
    shimmer = shimmerLevel2(uv, edge);
  } else if (u_variationLevel < 3.5) {
    shimmer = shimmerLevel3(uv, edge);
  } else if (u_variationLevel < 4.5) {
    shimmer = shimmerLevel4(uv, edge);
  } else {
    shimmer = shimmerLevel5(uv, edge);
  }

  // Apply shimmer intensity uniform
  shimmer.a *= u_shimmerIntensity;

  // Growl boost - shimmer becomes more visible as Growl increases
  shimmer.a *= 1.0 + u_growlIntensity * 0.5;

  // Discard fully transparent pixels
  if (shimmer.a < 0.01) {
    discard;
  }

  gl_FragColor = shimmer;
}
