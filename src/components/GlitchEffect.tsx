/**
 * Glitch Post-Processing Effect
 *
 * A custom post-processing effect for React Three Fiber that integrates
 * with the GlitchSystem for audio and Growl-triggered visual glitches.
 *
 * Usage:
 *   <EffectComposer>
 *     <GlitchEffect />
 *   </EffectComposer>
 */

import { forwardRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { getGlitchSystem } from '../systems/GlitchSystem';
import { useGlitchSystemInit } from '../hooks/useGlitchSystem';

// ===== Shader Code =====

const glitchFragmentShader = /* glsl */ `
precision highp float;

uniform float u_glitchIntensity;
uniform int u_glitchType;
uniform float u_glitchTime;
uniform float u_screenTearOffset;
uniform vec2 u_rgbSplitOffset;
uniform vec2 u_resolution;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Noise function
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

// Screen tear effect
vec4 screenTear(vec2 uv, float intensity) {
  float tearY = fract(u_glitchTime * 3.0 + u_screenTearOffset);
  float tearHeight = 0.02 + intensity * 0.08;

  float tear2Y = fract(u_glitchTime * 7.0 + 0.3);
  float tear3Y = fract(u_glitchTime * 11.0 + 0.7);

  vec2 displaced = uv;

  if (abs(uv.y - tearY) < tearHeight) {
    float displacement = (random(vec2(floor(uv.y * 100.0), floor(u_glitchTime * 50.0))) - 0.5) * intensity * 0.15;
    displaced.x = fract(uv.x + displacement);
  }

  if (abs(uv.y - tear2Y) < tearHeight * 0.5 && intensity > 0.3) {
    float displacement = (random(vec2(floor(uv.y * 80.0), floor(u_glitchTime * 30.0))) - 0.5) * intensity * 0.1;
    displaced.x = fract(displaced.x + displacement);
  }

  if (abs(uv.y - tear3Y) < tearHeight * 0.3 && intensity > 0.6) {
    float displacement = (random(vec2(floor(uv.y * 60.0), floor(u_glitchTime * 20.0))) - 0.5) * intensity * 0.05;
    displaced.x = fract(displaced.x + displacement);
  }

  float scanLine = step(0.98, sin(uv.y * u_resolution.y * 0.5 + u_glitchTime * 100.0)) * intensity * 0.3;

  vec4 color = texture2D(inputBuffer, displaced);
  color.rgb = mix(color.rgb, vec3(1.0), scanLine);

  return color;
}

// RGB split effect
vec4 rgbSplit(vec2 uv, float intensity) {
  vec2 offset = u_rgbSplitOffset;
  if (length(offset) < 0.0001) {
    offset = vec2(intensity * 0.02, 0.0);
  }

  float wobble = sin(u_glitchTime * 20.0) * intensity * 0.003;
  offset += vec2(wobble, -wobble * 0.5);

  float r = texture2D(inputBuffer, uv + offset).r;
  float g = texture2D(inputBuffer, uv).g;
  float b = texture2D(inputBuffer, uv - offset).b;

  return vec4(r, g, b, 1.0);
}

// Geometry jitter effect
vec4 geometryJitter(vec2 uv, float intensity) {
  float jitterScale = 100.0;
  float jitterSpeed = 100.0;

  float jitterX = (random(vec2(uv.y * jitterScale, u_glitchTime * jitterSpeed)) - 0.5) * intensity * 0.03;
  float jitterY = (random(vec2(uv.x * jitterScale, u_glitchTime * jitterSpeed)) - 0.5) * intensity * 0.03;

  vec2 block = floor(uv * 20.0);
  float blockRand = random(block + floor(u_glitchTime * 10.0));
  if (blockRand > 0.9) {
    jitterX += (random(block) - 0.5) * intensity * 0.05;
    jitterY += (random(block + 1.0) - 0.5) * intensity * 0.05;
  }

  return texture2D(inputBuffer, uv + vec2(jitterX, jitterY));
}

// Color inversion effect
vec4 colorInversion(vec2 uv, float intensity) {
  vec4 color = texture2D(inputBuffer, uv);

  vec2 block = floor(uv * 8.0);
  float blockRand = random(block + floor(u_glitchTime * 5.0));

  float threshold = 1.0 - intensity * 0.4;

  if (blockRand > threshold) {
    color.rgb = 1.0 - color.rgb;
  }

  float flashChance = step(0.995, random(vec2(floor(u_glitchTime * 30.0), 0.0)));
  if (flashChance > 0.5) {
    color.rgb = mix(color.rgb, 1.0 - color.rgb, intensity * 0.5);
  }

  return color;
}

// UV distortion effect
vec4 uvDistortion(vec2 uv, float intensity) {
  vec2 distorted = uv;

  float wave = sin(uv.y * 30.0 + u_glitchTime * 8.0) * intensity * 0.015;
  wave += sin(uv.y * 60.0 - u_glitchTime * 12.0) * intensity * 0.008;
  distorted.x += wave;

  float hWave = sin(uv.x * 20.0 + u_glitchTime * 5.0) * intensity * 0.01;
  distorted.y += hWave;

  vec2 block = floor(uv * 15.0);
  float blockRand = random(block + floor(u_glitchTime * 8.0));
  if (blockRand > 0.92) {
    vec2 blockOffset = vec2(
      random(block) - 0.5,
      random(block + 1.0) - 0.5
    ) * intensity * 0.1;
    distorted += blockOffset;
  }

  distorted = fract(distorted);

  return texture2D(inputBuffer, distorted);
}

// Reality break effect
vec4 realityBreak(vec2 uv, float intensity) {
  vec4 color = vec4(0.0);

  color += screenTear(uv, intensity * 0.6) * 0.30;
  color += rgbSplit(uv, intensity * 0.8) * 0.35;
  color += uvDistortion(uv, intensity * 0.5) * 0.25;
  color += geometryJitter(uv, intensity * 0.4) * 0.10;

  float swapTime = sin(u_glitchTime * 15.0);
  if (swapTime > 0.7) {
    color.rgb = color.gbr;
  } else if (swapTime < -0.7) {
    color.rgb = color.brg;
  }

  float staticNoise = random(uv * u_resolution + u_glitchTime * 100.0);
  color.rgb = mix(color.rgb, vec3(staticNoise), intensity * 0.15);

  float invFlash = step(0.98, sin(u_glitchTime * 25.0));
  color.rgb = mix(color.rgb, 1.0 - color.rgb, invFlash * intensity * 0.6);

  float vignette = 1.0 - length((uv - 0.5) * 2.0) * intensity * 0.3;
  color.rgb *= max(vignette, 0.3);

  float blackout = step(0.995, random(vec2(floor(u_glitchTime * 60.0), 0.5)));
  color.rgb *= 1.0 - blackout * 0.8;

  color.a = 1.0;
  return color;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // No glitch - passthrough
  if (u_glitchIntensity < 0.001 || u_glitchType < 0) {
    outputColor = inputColor;
    return;
  }

  // Apply glitch based on type
  if (u_glitchType == 0) {
    outputColor = screenTear(uv, u_glitchIntensity);
  } else if (u_glitchType == 1) {
    outputColor = rgbSplit(uv, u_glitchIntensity);
  } else if (u_glitchType == 2) {
    outputColor = geometryJitter(uv, u_glitchIntensity);
  } else if (u_glitchType == 3) {
    outputColor = colorInversion(uv, u_glitchIntensity);
  } else if (u_glitchType == 4) {
    outputColor = uvDistortion(uv, u_glitchIntensity);
  } else if (u_glitchType == 5) {
    outputColor = realityBreak(uv, u_glitchIntensity);
  } else {
    outputColor = inputColor;
  }
}
`;

// ===== Custom Effect Class =====

/**
 * Custom postprocessing Effect for glitch effects.
 * Integrates with the GlitchSystem for audio/Growl-triggered effects.
 */
class GlitchEffectImpl extends Effect {
  constructor() {
    const uniformsMap = new Map<string, THREE.Uniform<number | THREE.Vector2>>();
    uniformsMap.set('u_glitchIntensity', new THREE.Uniform(0));
    uniformsMap.set('u_glitchType', new THREE.Uniform(-1));
    uniformsMap.set('u_glitchTime', new THREE.Uniform(0));
    uniformsMap.set('u_screenTearOffset', new THREE.Uniform(0));
    uniformsMap.set('u_rgbSplitOffset', new THREE.Uniform(new THREE.Vector2(0, 0)));
    uniformsMap.set('u_resolution', new THREE.Uniform(new THREE.Vector2(window.innerWidth, window.innerHeight)));

    super('GlitchEffect', glitchFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: uniformsMap as Map<string, THREE.Uniform<number>>,
    });
  }

  /**
   * Update uniforms from GlitchSystem.
   */
  update(
    _renderer: THREE.WebGLRenderer,
    _inputBuffer: THREE.WebGLRenderTarget,
    _deltaTime?: number
  ): void {
    const system = getGlitchSystem();
    const uniforms = system.getUniforms();

    this.uniforms.get('u_glitchIntensity')!.value = uniforms.u_glitchIntensity.value;
    this.uniforms.get('u_glitchType')!.value = uniforms.u_glitchType.value;
    this.uniforms.get('u_glitchTime')!.value = uniforms.u_glitchTime.value;
    this.uniforms.get('u_screenTearOffset')!.value = uniforms.u_screenTearOffset.value;
    this.uniforms.get('u_rgbSplitOffset')!.value = uniforms.u_rgbSplitOffset.value;
    this.uniforms.get('u_resolution')!.value = uniforms.u_resolution.value;
  }

  /**
   * Handle resolution changes.
   */
  setSize(width: number, height: number): void {
    this.uniforms.get('u_resolution')!.value.set(width, height);
  }
}

// ===== React Component =====

export interface GlitchEffectProps {
  enabled?: boolean;
}

/**
 * GlitchEffect React component for use with EffectComposer.
 *
 * This component:
 * 1. Initializes the GlitchSystem
 * 2. Updates the system each frame
 * 3. Renders glitch post-processing effects
 *
 * @example
 * <EffectComposer>
 *   <GlitchEffect />
 * </EffectComposer>
 */
export const GlitchEffect = forwardRef<GlitchEffectImpl, GlitchEffectProps>(
  function GlitchEffect({ enabled = true }, ref) {
    const { size } = useThree();

    // Initialize the glitch system
    useGlitchSystemInit();

    // Create the effect instance
    const effect = useMemo(() => new GlitchEffectImpl(), []);

    // Update glitch system each frame
    useFrame((_, delta) => {
      if (enabled) {
        getGlitchSystem().update(delta);
      }
    });

    // Handle resize
    useEffect(() => {
      effect.setSize(size.width, size.height);
    }, [effect, size]);

    // Handle ref
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(effect);
      } else if (ref) {
        ref.current = effect;
      }
    }, [effect, ref]);

    return <primitive object={effect} />;
  }
);

export default GlitchEffect;
