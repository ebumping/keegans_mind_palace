/**
 * DebugOverlay: Unified debug panel for Keegan's Mind Palace
 *
 * Toggleable panels for:
 * - Performance metrics (FPS, frame time)
 * - Audio reactivity levels
 * - Wrongness/Growl state
 * - Collision visualization
 * - Room information
 *
 * Keyboard shortcuts:
 * - G: Toggle Growl/Wrongness panel
 * - P: Toggle Performance panel
 * - A: Toggle Audio panel
 * - C: Toggle Collision visualization
 * - D: Toggle all debug panels
 */

import { useState, useEffect } from 'react';
import { PerformanceMonitor } from './PerformanceMonitor';
import { useTimeStore } from '../store/timeStore';
import { useAudioStore } from '../store/audioStore';
import { getWrongnessSystem, getVariationLevelName } from '../systems/WrongnessSystem';

interface DebugOverlayProps {
  enabled?: boolean;
  onCollisionDebugToggle?: (enabled: boolean) => void;
  roomInfo?: {
    index: number;
    archetype?: string;
    shape?: string;
    wrongnessLevel?: number;
  };
}

export function DebugOverlay({
  enabled = false,
  onCollisionDebugToggle,
  roomInfo,
}: DebugOverlayProps) {
  const [showPerformance, setShowPerformance] = useState(true);
  const [showAudio, setShowAudio] = useState(false);
  const [showGrowl, setShowGrowl] = useState(false);
  const [showCollision, setShowCollision] = useState(false);
  const [showRoom, setShowRoom] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          setShowPerformance((prev) => !prev);
          break;
        case 'a':
          setShowAudio((prev) => !prev);
          break;
        case 'g':
          setShowGrowl((prev) => !prev);
          break;
        case 'c':
          setShowCollision((prev) => {
            const newState = !prev;
            onCollisionDebugToggle?.(newState);
            return newState;
          });
          break;
        case 'r':
          setShowRoom((prev) => !prev);
          break;
        case 'd':
          // Toggle all
          const allOn = showPerformance && showAudio && showGrowl && showRoom;
          setShowPerformance(!allOn);
          setShowAudio(!allOn);
          setShowGrowl(!allOn);
          setShowRoom(!allOn);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, showPerformance, showAudio, showGrowl, showRoom, onCollisionDebugToggle]);

  if (!enabled) return null;

  return (
    <>
      {/* Performance Monitor (always bottom-right) */}
      {showPerformance && <PerformanceMonitor enabled={true} position="bottom-right" />}

      {/* Audio Panel */}
      {showAudio && <AudioDebugPanel />}

      {/* Growl/Wrongness Panel */}
      {showGrowl && <GrowlDebugPanel />}

      {/* Room Info Panel */}
      {showRoom && <RoomDebugPanel roomInfo={roomInfo} />}

      {/* Collision indicator */}
      {showCollision && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(26, 24, 52, 0.85)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#00ff00',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '1px solid #00ff00',
          }}
        >
          COLLISION DEBUG ON
        </div>
      )}

      {/* Keyboard hints */}
      <div
        style={{
          position: 'fixed',
          bottom: 60,
          right: 10,
          backgroundColor: 'rgba(26, 24, 52, 0.7)',
          padding: '6px 10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#666',
          zIndex: 999,
          pointerEvents: 'none',
        }}
      >
        P: perf | A: audio | G: growl | R: room | C: collision | D: all
      </div>
    </>
  );
}

/**
 * Audio levels debug panel
 */
function AudioDebugPanel() {
  const bass = useAudioStore((s) => s.bass);
  const mid = useAudioStore((s) => s.mid);
  const high = useAudioStore((s) => s.high);
  const transientIntensity = useAudioStore((s) => s.transientIntensity);
  const isCapturing = useAudioStore((s) => s.isCapturing);

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(26, 24, 52, 0.85)',
        padding: '10px 14px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c792f5',
        zIndex: 1000,
        pointerEvents: 'none',
        border: '1px solid #3a3861',
        minWidth: '140px',
      }}
    >
      <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>
        Audio {isCapturing ? '🎵' : '🔇'}
      </div>
      <AudioBar label="Bass" value={bass} color="#ff6b6b" />
      <AudioBar label="Mid" value={mid} color="#4ecdc4" />
      <AudioBar label="High" value={high} color="#45b7d1" />
      <AudioBar label="Trans" value={transientIntensity} color="#f9ca24" />
    </div>
  );
}

function AudioBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span>{label}</span>
        <span>{(value * 100).toFixed(0)}%</span>
      </div>
      <div
        style={{
          height: '4px',
          backgroundColor: '#2c2c4b',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value * 100}%`,
            backgroundColor: color,
            transition: 'width 0.05s ease-out',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Growl/Wrongness debug panel
 */
function GrowlDebugPanel() {
  const growlPhase = useTimeStore((s) => s.growlPhase);
  const growlIntensity = useTimeStore((s) => s.growlIntensity);
  const hoursSinceDeployment = useTimeStore((s) => s.hoursSinceDeployment);

  // Get wrongness system info
  const wrongnessSystem = getWrongnessSystem();
  const variationLevel = wrongnessSystem.getCurrentVariationLevel();
  const levelName = getVariationLevelName(variationLevel);

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(26, 24, 52, 0.85)',
        padding: '10px 14px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c792f5',
        zIndex: 1000,
        pointerEvents: 'none',
        border: '1px solid #3a3861',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>
        The Growl
      </div>
      <div style={{ color: '#8eecf5' }}>
        Phase: {growlPhase}
      </div>
      <div>
        Intensity: {(growlIntensity * 100).toFixed(1)}%
      </div>
      <div style={{ fontSize: '10px', color: '#666' }}>
        Time: {hoursSinceDeployment.toFixed(1)}h
      </div>
      <div style={{ marginTop: '6px', borderTop: '1px solid #3a3861', paddingTop: '6px' }}>
        <div style={{ fontWeight: 'bold', color: '#ff6b6b' }}>
          Wrongness: L{variationLevel}
        </div>
        <div style={{ fontSize: '10px', color: '#8eecf5' }}>
          {levelName}
        </div>
      </div>
    </div>
  );
}

/**
 * Room info debug panel
 */
function RoomDebugPanel({
  roomInfo,
}: {
  roomInfo?: { index: number; archetype?: string; shape?: string; wrongnessLevel?: number };
}) {
  if (!roomInfo) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          backgroundColor: 'rgba(26, 24, 52, 0.85)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#666',
          zIndex: 1000,
          pointerEvents: 'none',
          border: '1px solid #3a3861',
        }}
      >
        No room data
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(26, 24, 52, 0.85)',
        padding: '10px 14px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#c792f5',
        zIndex: 1000,
        pointerEvents: 'none',
        border: '1px solid #3a3861',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Room #{roomInfo.index}
      </div>
      {roomInfo.archetype && (
        <div>
          <span style={{ color: '#666' }}>Archetype:</span>{' '}
          <span style={{ color: '#8eecf5' }}>{roomInfo.archetype}</span>
        </div>
      )}
      {roomInfo.shape && (
        <div>
          <span style={{ color: '#666' }}>Shape:</span>{' '}
          <span style={{ color: '#8eecf5' }}>{roomInfo.shape}</span>
        </div>
      )}
      {roomInfo.wrongnessLevel !== undefined && (
        <div>
          <span style={{ color: '#666' }}>Wrongness:</span>{' '}
          <span style={{ color: '#ff6b6b' }}>L{roomInfo.wrongnessLevel}</span>
        </div>
      )}
    </div>
  );
}

export default DebugOverlay;
