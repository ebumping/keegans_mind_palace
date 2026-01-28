/**
 * Circuitry Fragment Shader
 *
 * Renders glowing circuit traces with audio-reactive pulse and data flow animation.
 * Uses a pre-generated circuit texture with:
 * - Red channel: trace intensity
 * - Green channel: component locations
 * - Blue channel: junction nodes
 *
 * Features:
 * - Audio-reactive glow pulsing with bass/mid/high
 * - Animated data flow along traces
 * - Pale-strata cyan accent color (#8eecf5)
 */

precision highp float;

// Audio uniforms (0-1 normalized)
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_time;

// Circuit uniforms
uniform sampler2D u_circuitTexture;
uniform float u_glowIntensity;
uniform float u_dataFlowSpeed;

// Colors (pale-strata palette)
uniform vec3 u_circuitColor;      // #8eecf5 (cyan)
uniform vec3 u_glowColor;         // #c792f5 (purple)
uniform vec3 u_backgroundColor;   // Underlying surface color

// Blend mode
uniform float u_opacity;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// ===== Utility Functions =====

// Pseudo-random function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ===== Data Flow Animation =====

/**
 * Creates flowing pulses along traces.
 * The flow moves in the dominant UV direction based on trace orientation.
 */
float dataFlow(vec2 uv, float time, float speed) {
  // Create multiple flow frequencies for visual complexity
  float flow1 = fract(uv.x * 8.0 - time * speed);
  float flow2 = fract(uv.y * 8.0 - time * speed * 0.7);

  // Smooth pulse shape
  flow1 = smoothstep(0.0, 0.2, flow1) * smoothstep(0.5, 0.3, flow1);
  flow2 = smoothstep(0.0, 0.2, flow2) * smoothstep(0.5, 0.3, flow2);

  // Combine flows
  return max(flow1, flow2);
}

/**
 * Creates a secondary pulse pattern for variety.
 */
float dataPulse(vec2 uv, float time) {
  // Different frequency pulse
  float pulse = sin(uv.x * 20.0 + uv.y * 15.0 - time * 3.0);
  pulse = pulse * 0.5 + 0.5;
  return smoothstep(0.6, 0.9, pulse);
}

// ===== Glow Effects =====

/**
 * Calculates soft glow falloff around traces.
 */
float traceGlow(float traceValue, float intensity) {
  // Soft glow with exponential falloff
  float glow = pow(traceValue, 0.5) * intensity;
  return glow;
}

/**
 * Calculates halo effect around bright areas.
 */
float haloEffect(float brightness, float radius) {
  return smoothstep(0.0, radius, brightness) * 0.3;
}

// ===== Main Fragment Shader =====

void main() {
  // Sample circuit texture
  // R = traces, G = components, B = junctions
  vec4 circuit = texture2D(u_circuitTexture, vUv);

  float traceIntensity = circuit.r;
  float componentIntensity = circuit.g;
  float junctionIntensity = circuit.b;

  // Early exit if no circuit data (optimization)
  float totalCircuit = traceIntensity + componentIntensity + junctionIntensity;
  if (totalCircuit < 0.01) {
    discard;
  }

  // ===== Audio-Reactive Pulse =====
  // Combine frequency bands with different weights
  float audioPulse = u_bass * 0.5 + u_mid * 0.3 + u_high * 0.2;
  audioPulse = 0.5 + audioPulse * 0.5; // Normalize to 0.5-1.0 range

  // ===== Data Flow Animation =====
  float flow = dataFlow(vUv, u_time, u_dataFlowSpeed);
  float pulse = dataPulse(vUv, u_time);

  // Combine flow effects
  float flowEffect = flow * 0.7 + pulse * 0.3;

  // ===== Trace Rendering =====
  // Base trace brightness with flow animation
  float traceBrightness = traceIntensity * (0.3 + flowEffect * 0.7) * audioPulse;

  // ===== Component Rendering =====
  // Components pulse at a different rhythm (react to mid frequencies)
  float componentPulse = sin(u_time * 2.0 + vUv.x * 5.0) * 0.5 + 0.5;
  float componentBrightness = componentIntensity * (0.5 + componentPulse * 0.5) * (0.6 + u_mid * 0.4);

  // ===== Junction Rendering =====
  // Junctions react to high frequencies and stay bright
  float junctionBrightness = junctionIntensity * (0.6 + u_high * 0.4);

  // Add sparkle to junctions
  float sparkle = hash(vUv * 100.0 + u_time * 0.1);
  junctionBrightness += junctionIntensity * sparkle * u_high * 0.3;

  // ===== Combine Elements =====
  float totalBrightness = traceBrightness + componentBrightness + junctionBrightness;

  // ===== Glow Calculation =====
  float glow = traceGlow(totalBrightness, u_glowIntensity);
  float halo = haloEffect(totalBrightness, 0.5);

  // ===== Color Mixing =====
  // Base circuit color (cyan)
  vec3 baseColor = u_circuitColor;

  // Mix toward purple glow on flow peaks
  vec3 flowColor = mix(u_circuitColor, u_glowColor, flowEffect * 0.4);

  // Final trace color
  vec3 traceColor = mix(baseColor, flowColor, flow);

  // Apply brightness
  vec3 litColor = traceColor * totalBrightness;

  // Add glow halo (purple tint)
  litColor += u_glowColor * glow * 0.4;
  litColor += u_glowColor * halo;

  // ===== Fresnel-like Edge Glow =====
  // Brighter at grazing angles
  vec3 viewDir = normalize(-vWorldPosition);
  float fresnel = 1.0 - max(0.0, dot(vNormal, viewDir));
  fresnel = pow(fresnel, 2.0);
  litColor += u_circuitColor * fresnel * totalBrightness * 0.3;

  // ===== Output =====
  // Use additive blending alpha
  float alpha = totalBrightness * u_opacity;

  // Ensure colors stay in valid range
  litColor = clamp(litColor, 0.0, 1.0);

  gl_FragColor = vec4(litColor, alpha);
}
