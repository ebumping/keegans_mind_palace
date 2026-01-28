/**
 * Transition Effect Component
 *
 * Renders visual transition effects when moving between rooms:
 * - Fade overlay with audio-reactive color shift
 * - Warp distortion effect
 * - Camera FOV changes
 * - Screen-space effects (zoom, dissolve)
 */

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransitionEffect } from '../hooks/useTransition';

// ============================================
// Types
// ============================================

interface TransitionEffectProps {
  enabled?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * Transition Effect Component
 *
 * Renders a full-screen transition effect when moving between rooms.
 * Uses a plane with custom shader material for smooth transitions.
 */
export function TransitionEffect({ enabled = true }: TransitionEffectProps) {
  const {
    shouldRender,
    opacity,
    warpStrength,
    zoom,
    color,
  } = useTransitionEffect();

  // Create geometry once
  const geometry = useMemo(() => {
    // Full-screen plane (normalized device coordinates)
    return new THREE.PlaneGeometry(2, 2);
  }, []);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uWarpStrength;
        uniform float uZoom;
        uniform float uProgress;

        varying vec2 vUv;

        // Simple noise function
        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vec2 uv = vUv;

          // Center UVs for radial effects
          vec2 centered = uv - 0.5;

          // Warp distortion
          if (uWarpStrength > 0.0) {
            float dist = length(centered);
            float warp = 1.0 - uWarpStrength * dist * dist;
            uv = centered * warp + 0.5;
          }

          // Zoom effect
          if (uZoom > 1.0) {
            uv = centered / uZoom + 0.5;
          }

          // Check bounds
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(uColor, uOpacity);
            return;
          }

          // Dissolve noise
          float dissolveNoise = noise(uv * 50.0 + uTime);
          float dissolveEdge = smoothstep(0.3, 0.7, uProgress + dissolveNoise * 0.1);

          // Combine effects
          float finalOpacity = uOpacity * dissolveEdge;

          // Add scanline effect
          float scanline = sin(uv.y * 200.0 + uTime * 5.0) * 0.02;
          vec3 finalColor = uColor + scanline;

          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color('#1a1834') },
        uWarpStrength: { value: 0 },
        uZoom: { value: 1 },
        uProgress: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });
  }, []);

  // Update uniforms
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;

    if (enabled && shouldRender) {
      material.uniforms.uOpacity.value = opacity;
      material.uniforms.uColor.value.copy(color);
      material.uniforms.uWarpStrength.value = warpStrength;
      material.uniforms.uZoom.value = zoom;
      material.uniforms.uProgress.value = 1.0 - opacity; // Invert for dissolve
    } else {
      material.uniforms.uOpacity.value = 0;
    }

    material.visible = enabled && shouldRender;
  });

  // Don't render if not transitioning
  if (!enabled || !shouldRender) {
    return null;
  }

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ============================================
// Camera Transition Component
// ============================================

interface CameraTransitionEffectProps {
  enabled?: boolean;
  baseFOV?: number;
}

/**
 * Camera Transition Effect Component
 *
 * Applies camera FOV changes during transitions.
 * Should be used with PerspectiveCamera component.
 */
export function CameraTransitionEffect({
  enabled = true,
  baseFOV = 75,
}: CameraTransitionEffectProps) {
  const {
    shouldRender,
    fov,
  } = useTransitionEffect();

  useFrame((state) => {
    const camera = state.camera;

    if (camera instanceof THREE.PerspectiveCamera) {
      if (enabled && shouldRender) {
        // Smooth FOV transition
        const targetFOV = fov;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.1);
        camera.updateProjectionMatrix();
      } else {
        // Return to base FOV
        if (Math.abs(camera.fov - baseFOV) > 0.1) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, baseFOV, 0.1);
          camera.updateProjectionMatrix();
        }
      }
    }
  });

  return null;
}

// ============================================
// Default Exports
// ============================================

export default TransitionEffect;
