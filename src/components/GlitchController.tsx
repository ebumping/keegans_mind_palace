/**
 * Glitch Controller Component
 *
 * Manages the Glitch system lifecycle and provides debug controls.
 * Add this component to your scene to enable audio/Growl-triggered glitch effects.
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { getGlitchSystem, type GlitchType, type GlitchState } from '../systems/GlitchSystem';
import { useGlitchSystemInit } from '../hooks/useGlitchSystem';

interface GlitchControllerProps {
  /**
   * Enable the glitch system.
   */
  enabled?: boolean;

  /**
   * Show debug info in console.
   */
  debug?: boolean;
}

/**
 * GlitchController - Add this inside your Canvas to manage glitch effects.
 * Note: For post-processing effects, use GlitchEffect with EffectComposer.
 */
export function GlitchController({
  enabled = true,
  debug = false,
}: GlitchControllerProps) {
  const lastGlitchRef = useRef<GlitchType | null>(null);

  // Initialize Glitch system
  useGlitchSystemInit();

  // Update Glitch system each frame (if not using GlitchEffect)
  useFrame((_, delta) => {
    if (!enabled) return;

    const system = getGlitchSystem();
    const state = system.update(delta);

    // Debug logging on glitch change
    if (debug && state.currentGlitch !== lastGlitchRef.current) {
      if (state.currentGlitch) {
        console.log(
          `[GlitchController] Glitch started: ${state.currentGlitch} (intensity: ${(state.intensity * 100).toFixed(1)}%)`
        );
      } else if (lastGlitchRef.current) {
        console.log('[GlitchController] Glitch ended');
      }
      lastGlitchRef.current = state.currentGlitch;
    }
  });

  return null; // This component doesn't render anything
}

/**
 * Debug Panel Component
 *
 * Renders an HTML overlay for debugging Glitch system state.
 * Add this outside the Canvas component.
 */
export function GlitchDebugPanel() {
  const [state, setState] = useState<GlitchState>({
    active: false,
    currentGlitch: null,
    intensity: 0,
    remainingDuration: 0,
    cooldown: 0,
    time: 0,
  });

  // Update state from system
  useEffect(() => {
    const interval = setInterval(() => {
      const system = getGlitchSystem();
      // Use a simple polling approach since we're outside React Three Fiber
      const currentState = {
        active: system.isActive(),
        currentGlitch: system.getCurrentGlitchType(),
        intensity: system.getIntensity(),
        remainingDuration: 0, // Not directly accessible, but we can show other info
        cooldown: 0,
        time: system.getUniforms().u_glitchTime.value,
      };
      setState(currentState);
    }, 50); // Update at ~20fps for UI

    return () => clearInterval(interval);
  }, []);

  const glitchTypes: GlitchType[] = [
    'screen_tear',
    'rgb_split',
    'geometry_jitter',
    'color_inversion',
    'uv_distortion',
    'reality_break',
  ];

  const triggerGlitch = (type: GlitchType) => {
    getGlitchSystem().forceGlitch(type, 0.8, 1000);
  };

  const triggerRandom = () => {
    const randomType = glitchTypes[Math.floor(Math.random() * glitchTypes.length)];
    const randomIntensity = 0.5 + Math.random() * 0.5;
    getGlitchSystem().forceGlitch(randomType, randomIntensity, 500 + Math.random() * 1000);
  };

  const triggerSequence = () => {
    let index = 0;
    const interval = setInterval(() => {
      if (index >= glitchTypes.length) {
        clearInterval(interval);
        return;
      }
      getGlitchSystem().forceGlitch(glitchTypes[index], 0.7, 700);
      index++;
    }, 900);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        padding: '16px',
        background: 'rgba(26, 24, 52, 0.95)',
        borderRadius: '8px',
        color: '#c792f5',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '220px',
        border: '1px solid #3a3861',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: '#8eecf5' }}>Glitch Debug</h3>

      {/* Status Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: state.active ? '#f55c5c' : '#3a3861',
            boxShadow: state.active ? '0 0 8px #f55c5c' : 'none',
            transition: 'all 0.1s',
          }}
        />
        <span>
          {state.active ? (
            <span style={{ color: '#f55c5c' }}>GLITCHING</span>
          ) : (
            <span style={{ color: '#666' }}>Idle</span>
          )}
        </span>
      </div>

      {/* Current Glitch Info */}
      {state.active && (
        <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(245, 92, 92, 0.1)', borderRadius: '4px' }}>
          <div>
            <strong>Type:</strong>{' '}
            <span style={{ color: '#8eecf5' }}>{state.currentGlitch}</span>
          </div>
          <div>
            <strong>Intensity:</strong>{' '}
            {(state.intensity * 100).toFixed(1)}%
          </div>
          {/* Intensity bar */}
          <div
            style={{
              marginTop: '4px',
              height: '6px',
              background: '#2c2c4b',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${state.intensity * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, #c792f5, #f55c5c)`,
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>
      )}

      {/* Glitch Type Buttons */}
      <div style={{ marginBottom: '8px' }}>
        <strong>Trigger Glitch:</strong>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '4px',
          marginBottom: '12px',
        }}
      >
        {glitchTypes.map((type) => (
          <button
            key={type}
            onClick={() => triggerGlitch(type)}
            style={{
              padding: '6px 4px',
              background: state.currentGlitch === type ? '#c792f5' : '#3a3861',
              color: state.currentGlitch === type ? '#1a1834' : '#c792f5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '9px',
              textTransform: 'capitalize',
            }}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={triggerRandom}
          style={{
            flex: 1,
            padding: '6px 8px',
            background: '#2c2c4b',
            color: '#8eecf5',
            border: '1px solid #3a3861',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Random
        </button>
        <button
          onClick={triggerSequence}
          style={{
            flex: 1,
            padding: '6px 8px',
            background: '#2c2c4b',
            color: '#f5c792',
            border: '1px solid #3a3861',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Sequence
        </button>
      </div>

      {/* Time indicator */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #3a3861',
          fontSize: '10px',
          color: '#666',
        }}
      >
        Time: {state.time.toFixed(1)}s
      </div>
    </div>
  );
}

export default GlitchController;
