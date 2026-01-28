/**
 * Glitch Post-Processing Vertex Shader
 *
 * Simple fullscreen quad vertex shader for post-processing pass.
 * Passes UV coordinates to fragment shader.
 */

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
