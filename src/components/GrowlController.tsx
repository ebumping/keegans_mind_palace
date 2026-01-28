/**
 * Growl Controller Component
 *
 * Manages the Growl system lifecycle and provides debug controls.
 * Add this component to your scene to enable time-based dread effects.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getGrowlSystem } from '../systems/GrowlSystem';
import { useTimeStore, GrowlPhase } from '../store/timeStore';
import {
  useGrowlCameraShake,
  useGrowlFOVDistortion,
} from '../hooks/useGrowlSystem';

interface GrowlControllerProps {
  /**
   * AudioContext to use for the drone audio.
   * If not provided, Growl will initialize without audio.
   */
  audioContext?: AudioContext;

  /**
   * Enable camera shake effect.
   */
  enableCameraShake?: boolean;

  /**
   * Enable FOV distortion effect.
   */
  enableFOVDistortion?: boolean;

  /**
   * Base FOV for distortion calculations.
   */
  baseFOV?: number;

  /**
   * Player position for shadow anomaly calculations.
   * If not provided, uses camera position.
   */
  playerPosition?: THREE.Vector3;

  /**
   * Show debug info in console.
   */
  debug?: boolean;
}

export function GrowlController({
  audioContext,
  enableCameraShake = true,
  enableFOVDistortion = true,
  baseFOV = 75,
  playerPosition,
  debug = false,
}: GrowlControllerProps) {
  const { camera } = useThree();
  const isInitializedRef = useRef(false);
  const lastPhaseRef = useRef<GrowlPhase | null>(null);

  // Apply camera effects via hooks
  useGrowlCameraShake(enableCameraShake);
  useGrowlFOVDistortion(baseFOV, enableFOVDistortion);

  // Initialize Growl system
  useEffect(() => {
    if (isInitializedRef.current) return;

    const system = getGrowlSystem();

    if (audioContext) {
      system.initialize(audioContext).then(() => {
        if (debug) {
          console.log('[GrowlController] Initialized with audio');
        }
      });
    } else {
      system.initializeWithoutAudio();
      if (debug) {
        console.log('[GrowlController] Initialized without audio');
      }
    }

    isInitializedRef.current = true;
  }, [audioContext, debug]);

  // Update Growl system each frame
  useFrame((_, delta) => {
    const system = getGrowlSystem();
    if (!system.getIsInitialized()) return;

    // Use provided player position or camera position
    const position = playerPosition ?? camera.position;
    system.update(delta, position);

    // Debug logging on phase change
    if (debug) {
      const { growlPhase, growlIntensity } = useTimeStore.getState();
      if (growlPhase !== lastPhaseRef.current) {
        console.log(
          `[GrowlController] Phase changed: ${lastPhaseRef.current} -> ${growlPhase} (intensity: ${(growlIntensity * 100).toFixed(1)}%)`
        );
        lastPhaseRef.current = growlPhase;
      }
    }
  });

  return null; // This component doesn't render anything
}

/**
 * Debug Panel Component
 *
 * Renders an HTML overlay for debugging Growl system state.
 * Add this outside the Canvas component.
 */
export function GrowlDebugPanel() {
  const timeStore = useTimeStore();

  const presets: { label: string; hours: number }[] = [
    { label: 'Silent (0h)', hours: 0 },
    { label: 'Distant (4h)', hours: 4 },
    { label: 'Present (9h)', hours: 9 },
    { label: 'Close (18h)', hours: 18 },
    { label: 'Imminent (48h)', hours: 48 },
    { label: 'Extreme (168h)', hours: 168 },
  ];

  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.floor(hours * 60)}m`;
    }
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '16px',
        background: 'rgba(26, 24, 52, 0.95)',
        borderRadius: '8px',
        color: '#c792f5',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 1000,
        minWidth: '200px',
        border: '1px solid #3a3861',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: '#8eecf5' }}>Growl Debug</h3>

      <div style={{ marginBottom: '8px' }}>
        <strong>Time:</strong> {formatHours(timeStore.hoursSinceDeployment)}
        {timeStore.debugHoursOverride !== null && (
          <span style={{ color: '#f5c792' }}> (debug)</span>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Phase:</strong>{' '}
        <span
          style={{
            color:
              timeStore.growlPhase === GrowlPhase.IMMINENT
                ? '#f55c5c'
                : timeStore.growlPhase === GrowlPhase.CLOSE
                  ? '#f5c792'
                  : '#8eecf5',
          }}
        >
          {timeStore.growlPhase}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Intensity:</strong>{' '}
        {(timeStore.growlIntensity * 100).toFixed(1)}%
        <div
          style={{
            marginTop: '4px',
            height: '8px',
            background: '#2c2c4b',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${timeStore.growlIntensity * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, #c792f5, ${
                timeStore.growlIntensity > 0.5 ? '#f55c5c' : '#8eecf5'
              })`,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Effects:</strong>
        <div style={{ paddingLeft: '8px', fontSize: '10px', color: '#aaa' }}>
          Drone: {(timeStore.growlEffects.droneVolume * 100).toFixed(0)}%
          <br />
          Shadows: {(timeStore.growlEffects.shadowMovementChance * 100).toFixed(2)}%/frame
          <br />
          Flicker: {(timeStore.growlEffects.lightFlickerIntensity * 100).toFixed(0)}%
          <br />
          Shake: {(timeStore.growlEffects.shakeIntensity * 100).toFixed(1)}%
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginTop: '12px',
        }}
      >
        {presets.map((p) => (
          <button
            key={p.hours}
            onClick={() => timeStore.setDebugHours(p.hours)}
            style={{
              padding: '4px 8px',
              background:
                timeStore.debugHoursOverride === p.hours ? '#c792f5' : '#3a3861',
              color:
                timeStore.debugHoursOverride === p.hours ? '#1a1834' : '#c792f5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
        <button
          onClick={() => timeStore.setDebugHours(null)}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#2c2c4b',
            color: '#8eecf5',
            border: '1px solid #3a3861',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Real Time
        </button>
        <button
          onClick={() => timeStore.resetDeploymentTimestamp()}
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#2c2c4b',
            color: '#f5c792',
            border: '1px solid #3a3861',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default GrowlController;
