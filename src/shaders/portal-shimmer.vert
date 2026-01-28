/**
 * Portal Shimmer Vertex Shader
 *
 * Passes UV coordinates and world position to fragment shader.
 * Higher variation levels add subtle vertex displacement for warping effect.
 */

precision highp float;

// Outputs to fragment shader
varying vec2 vUv;
varying vec3 vWorldPosition;

// Uniforms
uniform float u_time;
uniform float u_variationLevel;
uniform float u_bass;

void main() {
  vUv = uv;

  // Calculate world position
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Vertex displacement for higher variation levels
  vec3 displaced = position;

  if (u_variationLevel > 3.5) {
    // Level 4+: Add subtle edge warping
    float edgeFactor = 1.0 - min(uv.x, 1.0 - uv.x) * 5.0;
    edgeFactor = max(edgeFactor, 0.0);

    float warp = sin(uv.y * 20.0 + u_time * 3.0) * edgeFactor * 0.02;
    warp *= (u_variationLevel - 3.0) / 2.0; // Scale by level
    warp *= 1.0 + u_bass * 0.3; // Audio reactivity

    displaced.x += warp;
    displaced.z += warp * 0.5;
  }

  if (u_variationLevel > 4.5) {
    // Level 5: More aggressive warping
    float centerDist = length(uv - 0.5);
    float pulse = sin(u_time * 5.0) * 0.5 + 0.5;
    float centerWarp = (1.0 - centerDist * 2.0) * pulse * 0.03;

    displaced.z -= centerWarp; // Pull center inward (into void)
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
