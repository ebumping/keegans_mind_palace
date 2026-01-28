/**
 * Glitch Post-Processing Fragment Shader
 *
 * Implements multiple glitch effects:
 * 0 - Screen tear (horizontal slice displacement)
 * 1 - RGB split (chromatic channel separation)
 * 2 - Geometry jitter (simulated via UV displacement)
 * 3 - Color inversion (partial block-based)
 * 4 - UV distortion (wave and block displacement)
 * 5 - Reality break (layered combination of all effects)
 */

precision highp float;

// Scene texture (from previous render pass)
uniform sampler2D u_sceneTexture;

// Glitch parameters
uniform float u_glitchIntensity;  // 0-1 normalized
uniform int u_glitchType;         // -1 = none, 0-5 = glitch types
uniform float u_glitchTime;       // Accumulated time for animation

// Effect-specific uniforms
uniform float u_screenTearOffset; // Y position of tear (0-1)
uniform vec2 u_rgbSplitOffset;    // Direction and magnitude of RGB split

// Display uniforms
uniform vec2 u_resolution;

// Input UV from vertex shader
varying vec2 vUv;

// ===== Utility Functions =====

/**
 * Pseudo-random function based on position.
 */
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

/**
 * Noise function for smoother randomness.
 */
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  // Four corners
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  // Smooth interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

// ===== Effect 0: Screen Tear =====

/**
 * Horizontal screen tear effect.
 * Creates visible "scan line" artifacts with displaced slices.
 */
vec3 screenTear(vec2 uv, float intensity) {
  // Primary tear position (animated)
  float tearY = fract(u_glitchTime * 3.0 + u_screenTearOffset);
  float tearHeight = 0.02 + intensity * 0.08;

  // Secondary tears for more chaos
  float tear2Y = fract(u_glitchTime * 7.0 + 0.3);
  float tear3Y = fract(u_glitchTime * 11.0 + 0.7);

  vec2 displaced = uv;

  // Primary tear
  if (abs(uv.y - tearY) < tearHeight) {
    float displacement = (random(vec2(floor(uv.y * 100.0), floor(u_glitchTime * 50.0))) - 0.5) * intensity * 0.15;
    displaced.x = fract(uv.x + displacement);
  }

  // Secondary tear (weaker)
  if (abs(uv.y - tear2Y) < tearHeight * 0.5 && intensity > 0.3) {
    float displacement = (random(vec2(floor(uv.y * 80.0), floor(u_glitchTime * 30.0))) - 0.5) * intensity * 0.1;
    displaced.x = fract(displaced.x + displacement);
  }

  // Tertiary tear (even weaker, only at high intensity)
  if (abs(uv.y - tear3Y) < tearHeight * 0.3 && intensity > 0.6) {
    float displacement = (random(vec2(floor(uv.y * 60.0), floor(u_glitchTime * 20.0))) - 0.5) * intensity * 0.05;
    displaced.x = fract(displaced.x + displacement);
  }

  // Add scan line artifact at tear edges
  float scanLine = step(0.98, sin(uv.y * u_resolution.y * 0.5 + u_glitchTime * 100.0)) * intensity * 0.3;

  vec3 color = texture2D(u_sceneTexture, displaced).rgb;
  color = mix(color, vec3(1.0), scanLine);

  return color;
}

// ===== Effect 1: RGB Split =====

/**
 * RGB channel separation effect.
 * Separates color channels with audio-reactive offset.
 */
vec3 rgbSplit(vec2 uv, float intensity) {
  // Use provided offset direction or default to horizontal
  vec2 offset = u_rgbSplitOffset;
  if (length(offset) < 0.0001) {
    offset = vec2(intensity * 0.02, 0.0);
  }

  // Add time-based wobble
  float wobble = sin(u_glitchTime * 20.0) * intensity * 0.003;
  offset += vec2(wobble, -wobble * 0.5);

  // Sample each channel at different positions
  float r = texture2D(u_sceneTexture, uv + offset).r;
  float g = texture2D(u_sceneTexture, uv).g;
  float b = texture2D(u_sceneTexture, uv - offset).b;

  return vec3(r, g, b);
}

// ===== Effect 2: Geometry Jitter =====

/**
 * Simulated geometry jitter via UV displacement.
 * Creates high-frequency random offsets for a jittery look.
 */
vec3 geometryJitter(vec2 uv, float intensity) {
  // High-frequency jitter
  float jitterScale = 100.0;
  float jitterSpeed = 100.0;

  float jitterX = (random(vec2(uv.y * jitterScale, u_glitchTime * jitterSpeed)) - 0.5) * intensity * 0.03;
  float jitterY = (random(vec2(uv.x * jitterScale, u_glitchTime * jitterSpeed)) - 0.5) * intensity * 0.03;

  // Add block-based displacement for larger chunks
  vec2 block = floor(uv * 20.0);
  float blockRand = random(block + floor(u_glitchTime * 10.0));
  if (blockRand > 0.9) {
    jitterX += (random(block) - 0.5) * intensity * 0.05;
    jitterY += (random(block + 1.0) - 0.5) * intensity * 0.05;
  }

  return texture2D(u_sceneTexture, uv + vec2(jitterX, jitterY)).rgb;
}

// ===== Effect 3: Color Inversion =====

/**
 * Partial color inversion effect.
 * Inverts colors in random blocks across the screen.
 */
vec3 colorInversion(vec2 uv, float intensity) {
  vec3 color = texture2D(u_sceneTexture, uv).rgb;

  // Block-based inversion
  vec2 block = floor(uv * 8.0);
  float blockRand = random(block + floor(u_glitchTime * 5.0));

  // Probability of inversion increases with intensity
  float threshold = 1.0 - intensity * 0.4;

  if (blockRand > threshold) {
    color = 1.0 - color;
  }

  // Add negative flash overlay
  float flashChance = step(0.995, random(vec2(floor(u_glitchTime * 30.0), 0.0)));
  if (flashChance > 0.5) {
    color = mix(color, 1.0 - color, intensity * 0.5);
  }

  return color;
}

// ===== Effect 4: UV Distortion =====

/**
 * Wave and block UV distortion.
 * Creates wavy, distorted appearance.
 */
vec3 uvDistortion(vec2 uv, float intensity) {
  vec2 distorted = uv;

  // Wave distortion (vertical waves)
  float wave = sin(uv.y * 30.0 + u_glitchTime * 8.0) * intensity * 0.015;
  wave += sin(uv.y * 60.0 - u_glitchTime * 12.0) * intensity * 0.008;
  distorted.x += wave;

  // Horizontal wave
  float hWave = sin(uv.x * 20.0 + u_glitchTime * 5.0) * intensity * 0.01;
  distorted.y += hWave;

  // Block displacement (random chunks shift)
  vec2 block = floor(uv * 15.0);
  float blockRand = random(block + floor(u_glitchTime * 8.0));
  if (blockRand > 0.92) {
    vec2 blockOffset = vec2(
      random(block) - 0.5,
      random(block + 1.0) - 0.5
    ) * intensity * 0.1;
    distorted += blockOffset;
  }

  // Ensure UV stays in valid range
  distorted = fract(distorted);

  return texture2D(u_sceneTexture, distorted).rgb;
}

// ===== Effect 5: Reality Break =====

/**
 * Extreme glitch effect combining multiple techniques.
 * Used for high-intensity "reality breakdown" moments.
 */
vec3 realityBreak(vec2 uv, float intensity) {
  vec3 color = vec3(0.0);

  // Layer 1: Screen tear (30%)
  color += screenTear(uv, intensity * 0.6) * 0.30;

  // Layer 2: RGB split (35%)
  color += rgbSplit(uv, intensity * 0.8) * 0.35;

  // Layer 3: UV distortion (25%)
  color += uvDistortion(uv, intensity * 0.5) * 0.25;

  // Layer 4: Jitter overlay (10%)
  color += geometryJitter(uv, intensity * 0.4) * 0.10;

  // Color channel swap based on time
  float swapTime = sin(u_glitchTime * 15.0);
  if (swapTime > 0.7) {
    color = color.gbr;
  } else if (swapTime < -0.7) {
    color = color.brg;
  }

  // Static noise overlay
  float staticNoise = random(uv * u_resolution + u_glitchTime * 100.0);
  color = mix(color, vec3(staticNoise), intensity * 0.15);

  // Occasional color inversion flash
  float invFlash = step(0.98, sin(u_glitchTime * 25.0));
  color = mix(color, 1.0 - color, invFlash * intensity * 0.6);

  // Vignette darkening at edges
  float vignette = 1.0 - length((uv - 0.5) * 2.0) * intensity * 0.3;
  color *= max(vignette, 0.3);

  // Occasional blackout frames
  float blackout = step(0.995, random(vec2(floor(u_glitchTime * 60.0), 0.5)));
  color *= 1.0 - blackout * 0.8;

  return color;
}

// ===== Main Function =====

void main() {
  vec3 color;

  // No glitch - passthrough
  if (u_glitchIntensity < 0.001 || u_glitchType < 0) {
    color = texture2D(u_sceneTexture, vUv).rgb;
  }
  // Screen tear
  else if (u_glitchType == 0) {
    color = screenTear(vUv, u_glitchIntensity);
  }
  // RGB split
  else if (u_glitchType == 1) {
    color = rgbSplit(vUv, u_glitchIntensity);
  }
  // Geometry jitter
  else if (u_glitchType == 2) {
    color = geometryJitter(vUv, u_glitchIntensity);
  }
  // Color inversion
  else if (u_glitchType == 3) {
    color = colorInversion(vUv, u_glitchIntensity);
  }
  // UV distortion
  else if (u_glitchType == 4) {
    color = uvDistortion(vUv, u_glitchIntensity);
  }
  // Reality break
  else if (u_glitchType == 5) {
    color = realityBreak(vUv, u_glitchIntensity);
  }
  // Fallback
  else {
    color = texture2D(u_sceneTexture, vUv).rgb;
  }

  gl_FragColor = vec4(color, 1.0);
}
