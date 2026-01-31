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
uniform float u_growlIntensity;   // Current Growl (time-based dread) level
uniform float u_transientIntensity; // Current audio transient intensity
uniform float u_pixelDissolve;    // Pixel dissolve amount (high Growl)

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
  float scanLine = step(0.99, sin(uv.y * u_resolution.y * 0.5 + u_glitchTime * 60.0)) * intensity * 0.12;

  vec3 color = texture2D(u_sceneTexture, displaced).rgb;
  color = mix(color, vec3(0.7), scanLine);

  return color;
}

// ===== Effect 1: RGB Split =====

/**
 * RGB channel separation effect.
 * Intensity scales with transient + Growl for proportional response.
 */
vec3 rgbSplit(vec2 uv, float intensity) {
  vec2 offset = u_rgbSplitOffset;
  if (length(offset) < 0.0001) {
    offset = vec2(intensity * 0.02, 0.0);
  }

  // Scale with transient + Growl
  float transientBoost = u_transientIntensity * intensity * 0.012;
  float growlBoost = u_growlIntensity * intensity * 0.008;
  offset *= (1.0 + transientBoost + growlBoost);

  float wobbleSpeed = 20.0 + u_growlIntensity * 30.0;
  float wobble = sin(u_glitchTime * wobbleSpeed) * intensity * 0.003;
  offset += vec2(wobble, -wobble * 0.5);

  float r = texture2D(u_sceneTexture, uv + offset).r;
  float g = texture2D(u_sceneTexture, uv).g;
  float b = texture2D(u_sceneTexture, uv - offset).b;

  // Diagonal split at high Growl
  if (u_growlIntensity > 0.5) {
    float diag = (u_growlIntensity - 0.5) * 2.0 * intensity * 0.006;
    vec2 diagOffset = vec2(diag, diag * 0.7);
    r = mix(r, texture2D(u_sceneTexture, uv + diagOffset).r, 0.3);
    b = mix(b, texture2D(u_sceneTexture, uv - diagOffset).b, 0.3);
  }

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
  float threshold = 1.0 - intensity * 0.25;

  if (blockRand > threshold) {
    color = mix(color, 1.0 - color, 0.6);
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

// ===== Effect: Pixel Dissolve =====

/**
 * Posterize + dither dissolve effect.
 * Active at high Growl intensity for digital decay aesthetic.
 */
vec3 pixelDissolve(vec2 uv, float intensity) {
  vec3 color = texture2D(u_sceneTexture, uv).rgb;

  // Posterize: reduce color levels
  float levels = mix(256.0, 4.0, intensity);
  color = floor(color * levels + 0.5) / levels;

  // Bayer 4x4 dithering
  float bayerMatrix[16];
  bayerMatrix[0]  =  0.0/16.0; bayerMatrix[1]  =  8.0/16.0;
  bayerMatrix[2]  =  2.0/16.0; bayerMatrix[3]  = 10.0/16.0;
  bayerMatrix[4]  = 12.0/16.0; bayerMatrix[5]  =  4.0/16.0;
  bayerMatrix[6]  = 14.0/16.0; bayerMatrix[7]  =  6.0/16.0;
  bayerMatrix[8]  =  3.0/16.0; bayerMatrix[9]  = 11.0/16.0;
  bayerMatrix[10] =  1.0/16.0; bayerMatrix[11] =  9.0/16.0;
  bayerMatrix[12] = 15.0/16.0; bayerMatrix[13] =  7.0/16.0;
  bayerMatrix[14] = 13.0/16.0; bayerMatrix[15] =  5.0/16.0;

  vec2 pixelPos = floor(uv * u_resolution);
  int bx = int(mod(pixelPos.x, 4.0));
  int by = int(mod(pixelPos.y, 4.0));
  int idx = by * 4 + bx;

  float bayerValue = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i == idx) {
      bayerValue = bayerMatrix[i];
      break;
    }
  }

  float dissolveThreshold = intensity * 0.8;
  if (bayerValue < dissolveThreshold) {
    float noiseFactor = random(uv + u_glitchTime * 0.1);
    color = mix(color, vec3(noiseFactor * 0.1), intensity * 0.7);
  }

  float scanY = mod(pixelPos.y, 3.0);
  if (scanY < 1.0 && intensity > 0.5) {
    color *= 0.85;
  }

  return color;
}

// ===== Effect 5: Reality Break =====

/**
 * Extreme glitch effect combining multiple techniques.
 * Full-screen inversion/distortion gated on Growl > 0.8.
 */
vec3 realityBreak(vec2 uv, float intensity) {
  vec3 color = vec3(0.0);
  float growlFactor = u_growlIntensity;

  color += screenTear(uv, intensity * 0.6) * 0.25;
  color += rgbSplit(uv, intensity * 0.8) * 0.30;
  color += uvDistortion(uv, intensity * 0.5) * 0.20;
  color += geometryJitter(uv, intensity * 0.4) * 0.10;

  // Pixel dissolve layer
  if (growlFactor > 0.3) {
    float dissolveIntensity = (growlFactor - 0.3) / 0.7 * intensity;
    color += pixelDissolve(uv, dissolveIntensity) * 0.15;
  } else {
    color += texture2D(u_sceneTexture, uv).rgb * 0.15;
  }

  // Gentle channel swap — partial blend instead of hard swap
  float swapSpeed = 8.0 + growlFactor * 10.0;
  float swapTime = sin(u_glitchTime * swapSpeed);
  if (swapTime > 0.85) {
    color = mix(color, color.gbr, 0.4);
  } else if (swapTime < -0.85) {
    color = mix(color, color.brg, 0.4);
  }

  // Subtle static noise
  float staticNoise = random(uv * u_resolution + u_glitchTime * 50.0);
  color = mix(color, vec3(staticNoise), intensity * (0.06 + growlFactor * 0.05));

  // High Growl — subtle desaturation pulse instead of full inversion
  if (growlFactor > 0.8) {
    float pulse = sin(u_glitchTime * 2.0) * 0.5 + 0.5;
    float strength = (growlFactor - 0.8) * 2.5 * intensity * pulse;
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(luma), clamp(strength, 0.0, 0.5));
  }

  // Center-warp distortion at extreme Growl
  if (growlFactor > 0.7) {
    vec2 center = uv - 0.5;
    float dist = length(center);
    float warpStr = (growlFactor - 0.7) * 3.3 * intensity;
    float warp = sin(dist * 20.0 - u_glitchTime * 5.0) * warpStr * 0.02;
    vec2 warpedUV = uv + normalize(center + 0.001) * warp;
    vec3 warpColor = texture2D(u_sceneTexture, clamp(warpedUV, 0.0, 1.0)).rgb;
    color = mix(color, warpColor, 0.3);
  }

  // Vignette
  float vignette = 1.0 - length((uv - 0.5) * 2.0) * intensity * 0.3;
  color *= max(vignette, 0.3);

  // Subtle dimming pulses instead of blackout frames
  float dimPulse = sin(u_glitchTime * 1.5 + growlFactor * 3.0) * 0.5 + 0.5;
  color *= 1.0 - dimPulse * growlFactor * 0.15;

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
