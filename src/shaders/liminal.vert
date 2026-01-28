/**
 * Liminal Vertex Shader
 *
 * Audio-reactive vertex displacement for walls, floors, and ceilings.
 * Creates breathing/rippling effects driven by frequency data.
 */

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Three.js built-in uniforms
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

// Time
uniform float u_time;
uniform float u_deltaTime;

// Audio (0-1 normalized)
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_transient;

// Smoothed audio (for gradual effects)
uniform float u_bassSmooth;
uniform float u_midSmooth;
uniform float u_highSmooth;

// Effect controls
uniform float u_breatheIntensity;
uniform float u_rippleIntensity;
uniform float u_rippleFrequency;

// Glitch controls
uniform float u_geometryGlitch;  // 0-1 glitch intensity
uniform float u_glitchTime;      // Time for glitch animation

// Outputs to fragment shader
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDisplacement;

// Simple noise function for organic displacement
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n = i.x + i.y * 157.0 + 113.0 * i.z;

  return mix(
    mix(
      mix(hash(vec3(n + 0.0)), hash(vec3(n + 1.0)), f.x),
      mix(hash(vec3(n + 157.0)), hash(vec3(n + 158.0)), f.x),
      f.y
    ),
    mix(
      mix(hash(vec3(n + 113.0)), hash(vec3(n + 114.0)), f.x),
      mix(hash(vec3(n + 270.0)), hash(vec3(n + 271.0)), f.x),
      f.y
    ),
    f.z
  );
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;
  float totalDisplacement = 0.0;

  // === Breathing Effect (Bass-driven) ===
  // Entire room expands/contracts with low frequencies
  // Uses smoothed bass for gradual movement
  float breathePhase = sin(u_time * 0.5) * 0.5 + 0.5;
  float breathe = breathePhase * u_bassSmooth * u_breatheIntensity * 0.15;
  pos += normal * breathe;
  totalDisplacement += breathe;

  // === Ripple Effect (Mid-frequency driven) ===
  // Wave displacement across surfaces
  float rippleX = sin(pos.x * u_rippleFrequency + u_time * 2.0);
  float rippleY = sin(pos.y * u_rippleFrequency * 0.7 + u_time * 1.5);
  float rippleZ = sin(pos.z * u_rippleFrequency * 0.8 + u_time * 1.8);
  float ripple = (rippleX * rippleY + rippleZ) * 0.5 * u_midSmooth * u_rippleIntensity * 0.08;
  pos += normal * ripple;
  totalDisplacement += ripple;

  // === High Frequency Shimmer ===
  // Subtle high-frequency noise displacement
  float shimmer = noise3D(pos * 8.0 + u_time * 0.5) * u_highSmooth * 0.02;
  pos += normal * shimmer;
  totalDisplacement += shimmer;

  // === Transient Spike ===
  // Sharp, sudden displacement on beat impacts
  // Uses raw transient for immediate response
  float spikeNoise = noise3D(pos * 12.0 + u_time * 10.0);
  float spike = u_transient * spikeNoise * 0.04;
  pos += normal * spike;
  totalDisplacement += spike;

  // === Geometry Glitch ===
  // World-space vertex jitter for reality-breaking effect
  // Only active when u_geometryGlitch > 0
  if (u_geometryGlitch > 0.001) {
    // Create high-frequency jitter based on vertex position and time
    float glitchSeed = dot(pos, vec3(12.9898, 78.233, 45.164)) + u_glitchTime * 50.0;

    // Random jitter in all directions
    vec3 jitter = vec3(
      fract(sin(glitchSeed) * 43758.5453) - 0.5,
      fract(sin(glitchSeed + 1.0) * 43758.5453) - 0.5,
      fract(sin(glitchSeed + 2.0) * 43758.5453) - 0.5
    );

    // Scale jitter by intensity
    float jitterMagnitude = u_geometryGlitch * 0.25;
    jitter *= jitterMagnitude;

    // Apply jitter primarily along normal for more natural effect
    float normalJitter = (jitter.x + jitter.y + jitter.z) * 0.33;
    pos += normal * normalJitter * 0.3;

    // Also apply world-space jitter for more chaotic effect
    pos += jitter;

    // Add occasional large displacements (vertex "popping")
    float popChance = fract(sin(glitchSeed * 0.1) * 12345.6789);
    if (popChance > 0.95) {
      pos += normal * u_geometryGlitch * 0.5 * (fract(glitchSeed * 7.0) - 0.5);
    }

    totalDisplacement += length(jitter);
  }

  // Store total displacement for fragment shader
  vDisplacement = totalDisplacement;

  // Calculate world position for fragment effects
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

  // Final position
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
