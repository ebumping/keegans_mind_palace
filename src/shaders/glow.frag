/**
 * Glow Fragment Shader
 *
 * Used for bloom/glow post-processing and light source effects.
 * Designed to work with the pale-strata color palette.
 */

precision highp float;

// Inputs from vertex shader
varying vec2 vUv;
varying vec3 vWorldPosition;

// Time uniforms
uniform float u_time;

// Audio uniforms (0-1 normalized)
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_bassSmooth;
uniform float u_midSmooth;
uniform float u_highSmooth;

// Color uniforms (pale-strata palette)
uniform vec3 u_colorPrimary;     // #c792f5
uniform vec3 u_colorSecondary;   // #8eecf5

// Glow parameters
uniform float u_glowIntensity;
uniform float u_glowRadius;
uniform float u_pulseSpeed;

// Light flicker parameters
uniform float u_flickerAmount;
uniform float u_flickerSpeed;

// ===== Noise Functions =====

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), f);
}

// ===== Flicker Function =====
// Creates realistic light flicker based on audio and time

float calculateFlicker(float time, float speed, float amount) {
  // Base flicker from noise
  float baseFlicker = noise(time * speed);

  // Secondary faster flicker for realism
  float fastFlicker = noise(time * speed * 3.7);

  // Combine with weighting
  float flicker = baseFlicker * 0.7 + fastFlicker * 0.3;

  // Apply amount control
  return 1.0 - amount * (1.0 - flicker);
}

// ===== Glow Falloff =====
// Soft radial falloff for light sources

float glowFalloff(vec2 uv, vec2 center, float radius) {
  float dist = length(uv - center);
  float falloff = 1.0 - smoothstep(0.0, radius, dist);
  return falloff * falloff; // Quadratic for softer edge
}

// ===== Main Fragment Shader =====

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5, 0.5);

  // === Base Glow Calculation ===
  float glow = glowFalloff(uv, center, u_glowRadius);

  // === Audio-Reactive Pulsing ===
  // Mid frequencies drive the pulse
  float pulse = sin(u_time * u_pulseSpeed) * 0.5 + 0.5;
  pulse = mix(pulse, 1.0, 0.3); // Never fully off
  pulse *= (1.0 + u_midSmooth * 0.5);

  glow *= pulse;

  // === Light Flicker ===
  float flicker = calculateFlicker(u_time, u_flickerSpeed, u_flickerAmount);
  // Audio affects flicker intensity
  flicker *= (1.0 - u_midSmooth * u_flickerAmount * 0.5);
  glow *= flicker;

  // === Intensity Modulation ===
  glow *= u_glowIntensity;

  // === Color Mixing ===
  // Primary glow color
  vec3 color = u_colorPrimary * glow;

  // Add secondary color halo at edges
  float edgeGlow = glowFalloff(uv, center, u_glowRadius * 1.5) - glow;
  edgeGlow = max(0.0, edgeGlow);
  color += u_colorSecondary * edgeGlow * 0.3;

  // === High Frequency Sparkle ===
  // Adds shimmer based on high frequencies
  float sparkle = hash(uv.x * 100.0 + u_time * 10.0 + uv.y * 50.0);
  sparkle *= u_highSmooth * 0.15 * glow;
  color += u_colorSecondary * sparkle;

  // === Bass Boost ===
  // Subtle overall brightness boost on bass
  color *= (1.0 + u_bassSmooth * 0.2);

  // === Final Output ===
  float alpha = max(glow, edgeGlow * 0.5);
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(color, alpha);
}
