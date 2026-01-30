/**
 * Controls - Minimal UI overlay for Keegan's Mind Palace
 *
 * Features:
 * - Audio source toggle (desktop/microphone/demo)
 * - Fullscreen toggle
 * - Audio level indicator (subtle, non-intrusive)
 * - "How to navigate" hints that fade after first movement
 * - Mobile-responsive touch controls fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAudioStore } from '../../store/audioStore';
import type { AudioSource } from '../../core/AudioCapture';

export interface ControlsProps {
  onFirstMovement?: () => void;
  enableTouchControls?: boolean;
}

// ============================================
// Audio Source Button
// ============================================

function AudioSourceButton({ currentSource }: { currentSource: AudioSource }) {
  const [isOpen, setIsOpen] = useState(false);
  const audioCaptureInstance = useAudioStore((state) => state.audioCaptureInstance);
  const setCapturing = useAudioStore((state) => state.setCapturing);
  const setAudioCaptureInstance = useAudioStore((state) => state.setAudioCaptureInstance);

  const handleSourceChange = useCallback(async (source: AudioSource) => {
    setIsOpen(false);
    if (source === currentSource) return;

    // Stop existing capture if switching away from a live source
    if (audioCaptureInstance) {
      audioCaptureInstance.stopCapture();
    }

    if (source === 'demo') {
      // Demo mode: no capture needed, just update store
      setCapturing(true, 'demo');
      return;
    }

    // For desktop/microphone, create a new AudioCapture instance
    try {
      const { AudioCapture } = await import('../../core/AudioCapture');
      const capture = new AudioCapture({
        onStreamStart: (src) => {
          useAudioStore.getState().setCapturing(true, src);
        },
        onStreamEnd: () => {
          useAudioStore.getState().setCapturing(false);
        },
        onError: (error) => {
          console.error('Audio capture error:', error);
          // Fall back to demo mode on error
          useAudioStore.getState().setCapturing(true, 'demo');
          useAudioStore.getState().setStreamLost(true);
        },
      });

      setAudioCaptureInstance(capture);

      if (source === 'desktop') {
        await capture.startDesktopCapture();
      } else if (source === 'microphone') {
        await capture.startMicrophoneCapture();
      }
    } catch (error) {
      console.error('Failed to switch audio source:', error);
      // Fall back to demo mode
      setCapturing(true, 'demo');
    }
  }, [currentSource, audioCaptureInstance, setCapturing, setAudioCaptureInstance]);

  const getSourceLabel = (source: AudioSource): string => {
    switch (source) {
      case 'desktop':
        return 'Desktop Audio';
      case 'microphone':
        return 'Microphone';
      case 'demo':
        return 'Demo Mode';
      default:
        return 'No Audio';
    }
  };

  const getSourceIcon = (source: AudioSource) => {
    switch (source) {
      case 'desktop':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
      case 'microphone':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        );
      case 'demo':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSourceColor = (source: AudioSource): string => {
    switch (source) {
      case 'desktop':
        return 'text-[#c792f5]';
      case 'microphone':
        return 'text-[#8eecf5]';
      case 'demo':
        return 'text-white/60';
      default:
        return 'text-white/40';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-lg bg-[#1a1834]/80 backdrop-blur-sm border border-white/10 hover:border-[#c792f5]/50 transition-all duration-200 ${getSourceColor(currentSource)}`}
        title={`Audio Source: ${getSourceLabel(currentSource)}`}
      >
        {getSourceIcon(currentSource)}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#211f3c]/95 backdrop-blur-md border border-[#c792f5]/30 shadow-xl shadow-[#c792f5]/20 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10">
              <span className="text-xs text-white/40 font-mono">AUDIO SOURCE</span>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleSourceChange('desktop')}
                disabled={currentSource === 'desktop'}
                className="w-full px-3 py-2 text-left text-sm font-mono text-[#c792f5] hover:bg-[#c792f5]/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Desktop Audio
              </button>
              <button
                onClick={() => handleSourceChange('microphone')}
                disabled={currentSource === 'microphone'}
                className="w-full px-3 py-2 text-left text-sm font-mono text-[#8eecf5] hover:bg-[#8eecf5]/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Microphone
              </button>
              <button
                onClick={() => handleSourceChange('demo')}
                disabled={currentSource === 'demo'}
                className="w-full px-3 py-2 text-left text-sm font-mono text-white/60 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Demo Mode
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Fullscreen Button
// ============================================

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <button
      onClick={toggleFullscreen}
      className="p-3 rounded-lg bg-[#1a1834]/80 backdrop-blur-sm border border-white/10 hover:border-[#8eecf5]/50 text-[#8eecf5] transition-all duration-200"
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {isFullscreen ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      )}
    </button>
  );
}

// ============================================
// Audio Level Indicator
// ============================================

function AudioLevelIndicator() {
  const { bass, mid, high, overall, isCapturing, audioSource } = useAudioStore(
    useShallow((state) => ({
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      overall: state.overall,
      isCapturing: state.isCapturing,
      audioSource: state.audioSource,
    }))
  );

  // Pulsing animation state for the capture indicator
  const hasSignal = overall > 0.02;

  return (
    <div className="flex items-center gap-1.5">
      {/* Capture status dot — pulses when capturing, dim when silent */}
      <div
        className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
          isCapturing
            ? hasSignal
              ? 'bg-[#c792f5] shadow-[0_0_8px_#c792f5]'
              : 'bg-[#c792f5]/40 animate-pulse'
            : 'bg-white/20'
        }`}
        title={
          isCapturing
            ? `${audioSource ?? 'unknown'} — ${hasSignal ? 'receiving audio' : 'no signal'}`
            : 'not capturing'
        }
      />

      {/* Bass bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden flex flex-col justify-end">
        <div
          className="w-full bg-gradient-to-t from-[#c792f5] to-[#c792f5]/60 rounded-full transition-all duration-75"
          style={{ height: `${Math.max(5, bass * 100)}%` }}
        />
      </div>

      {/* Mid bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden flex flex-col justify-end">
        <div
          className="w-full bg-gradient-to-t from-[#8eecf5] to-[#8eecf5]/60 rounded-full transition-all duration-75"
          style={{ height: `${Math.max(5, mid * 100)}%` }}
        />
      </div>

      {/* High bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden flex flex-col justify-end">
        <div
          className="w-full bg-gradient-to-t from-white/60 to-white/40 rounded-full transition-all duration-75"
          style={{ height: `${Math.max(5, high * 100)}%` }}
        />
      </div>

      {/* Overall intensity glow dot */}
      <div
        className={`w-2 h-2 rounded-full transition-all duration-75 ${
          overall > 0.7 ? 'bg-[#c792f5] shadow-[0_0_8px_#c792f5]' : overall > 0.3 ? 'bg-[#c792f5]/50' : 'bg-white/20'
        }`}
      />
    </div>
  );
}

// ============================================
// Stream Lost Notification
// ============================================

function StreamLostNotification() {
  const streamLost = useAudioStore((state) => state.streamLost);
  const setStreamLost = useAudioStore((state) => state.setStreamLost);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (streamLost) {
      setVisible(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setStreamLost(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [streamLost, setStreamLost]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 right-4 z-30 px-4 py-2.5 rounded-lg bg-[#1a1834]/90 backdrop-blur-sm border border-[#c792f5]/40 shadow-lg shadow-[#c792f5]/10 animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center gap-2.5">
        <svg className="w-4 h-4 text-[#c792f5]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01"
          />
        </svg>
        <span className="text-xs font-mono text-white/70">Audio source lost — switched to demo mode</span>
      </div>
    </div>
  );
}

// ============================================
// Navigation Hints
// ============================================

function NavigationHints({ onFade }: { onFade?: () => void }) {
  const [visible, setVisible] = useState(true);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect first movement
      if (!hasMoved && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key.toLowerCase())) {
        setHasMoved(true);
        // Fade out after 3 seconds
        setTimeout(() => {
          setVisible(false);
          onFade?.();
        }, 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMoved, onFade]);

  useEffect(() => {
    const handlePointerMove = () => {
      if (!hasMoved) {
        setHasMoved(true);
        setTimeout(() => {
          setVisible(false);
          onFade?.();
        }, 5000);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [hasMoved, onFade]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none flex items-center justify-center transition-opacity duration-1000 ${hasMoved ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-8 text-white/60 text-sm font-mono">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-[#1a1834]/80 border border-white/20">W</kbd>
              <kbd className="px-2 py-1 rounded bg-[#1a1834]/80 border border-white/20">A</kbd>
              <kbd className="px-2 py-1 rounded bg-[#1a1834]/80 border border-white/20">S</kbd>
              <kbd className="px-2 py-1 rounded bg-[#1a1834]/80 border border-white/20">D</kbd>
              <span className="text-white/40">Move</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-[#1a1834]/80 border border-white/20">Mouse</kbd>
              <span className="text-white/40">Look</span>
            </div>
          </div>
          <div className="text-xs text-[#c792f5]/60">
            Click anywhere to explore
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Mobile Touch Controls
// ============================================

import { getTouchInputManager } from '../../systems/NavigationSystem';

function MobileTouchControls({ enabled }: { enabled: boolean }) {
  // Joystick state
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });
  const [isSprintPressed, setIsSprintPressed] = useState(false);

  // Track touch identifiers
  const joystickTouchRef = useRef<number | null>(null);
  const lookTouchRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Joystick zone size
  const JOYSTICK_SIZE = 128; // w-32 = 128px
  const JOYSTICK_MAX_OFFSET = JOYSTICK_SIZE / 2 - 24; // Max offset from center

  // Handle left joystick (movement)
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (joystickTouchRef.current === null) {
      joystickTouchRef.current = touch.identifier;
      const rect = e.currentTarget.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  }, []);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touchInput = getTouchInputManager();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchRef.current && joystickCenterRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;

        // Normalize to -1 to 1
        const normalizedX = Math.max(-1, Math.min(1, dx / JOYSTICK_MAX_OFFSET));
        const normalizedY = Math.max(-1, Math.min(1, dy / JOYSTICK_MAX_OFFSET));

        // Update visual offset (clamped to circle)
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, JOYSTICK_MAX_OFFSET);
        const angle = Math.atan2(dy, dx);
        setJoystickOffset({
          x: Math.cos(angle) * clampedDistance,
          y: Math.sin(angle) * clampedDistance,
        });

        // Send to touch input manager
        touchInput.setMovement(normalizedX, normalizedY);
      }
    }
  }, [JOYSTICK_MAX_OFFSET]);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touchInput = getTouchInputManager();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchRef.current) {
        joystickTouchRef.current = null;
        joystickCenterRef.current = null;
        setJoystickOffset({ x: 0, y: 0 });
        touchInput.setMovement(0, 0);
      }
    }
  }, []);

  // Handle right zone (look)
  const handleLookTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (lookTouchRef.current === null) {
      lookTouchRef.current = touch.identifier;
      lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleLookTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const touchInput = getTouchInputManager();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchRef.current && lastLookPosRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;

        // Scale for better sensitivity
        touchInput.addLookDelta(dx * 2, dy * 2);

        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, []);

  const handleLookTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchRef.current) {
        lookTouchRef.current = null;
        lastLookPosRef.current = null;
      }
    }
  }, []);

  // Handle sprint button
  const handleSprintTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSprintPressed(true);
    getTouchInputManager().setSprint(true);
  }, []);

  const handleSprintTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSprintPressed(false);
    getTouchInputManager().setSprint(false);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Left joystick zone */}
      <div
        className="fixed bottom-8 left-8 z-30 w-32 h-32 bg-[#1a1834]/40 backdrop-blur-sm rounded-full border border-white/20 pointer-events-auto touch-none"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full bg-[#c792f5]/50 border-2 border-[#c792f5]/80 transition-transform duration-75"
            style={{
              transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
            }}
          />
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/40 font-mono">
          MOVE
        </div>
      </div>

      {/* Right touch zone for looking */}
      <div
        className="fixed bottom-8 right-8 z-30 w-32 h-32 bg-[#1a1834]/40 backdrop-blur-sm rounded-full border border-white/20 pointer-events-auto touch-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-[#8eecf5]/50 border-2 border-[#8eecf5]/80" />
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/40 font-mono">
          LOOK
        </div>
      </div>

      {/* Sprint button */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 backdrop-blur-sm rounded-lg border pointer-events-auto touch-none transition-all duration-100 ${
          isSprintPressed
            ? 'bg-[#c792f5]/60 border-[#c792f5]/80 scale-95'
            : 'bg-[#c792f5]/20 border-[#c792f5]/30'
        }`}
        onTouchStart={handleSprintTouchStart}
        onTouchEnd={handleSprintTouchEnd}
        onTouchCancel={handleSprintTouchEnd}
      >
        <span className="text-[10px] text-[#c792f5] font-mono select-none">SPRINT</span>
      </div>
    </>
  );
}

// ============================================
// Main Controls Component
// ============================================

export function Controls({ onFirstMovement, enableTouchControls = false }: ControlsProps) {
  const audioSource = useAudioStore((state) => state.audioSource);
  const isCapturing = useAudioStore((state) => state.isCapturing);

  // Don't render controls if not capturing yet
  if (!isCapturing) {
    return null;
  }

  return (
    <>
      {/* Navigation hints */}
      <NavigationHints onFade={onFirstMovement} />

      {/* Mobile touch controls */}
      <MobileTouchControls enabled={enableTouchControls} />

      {/* Stream lost notification */}
      <StreamLostNotification />

      {/* Top right controls */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-3">
        {/* Audio level indicator */}
        <AudioLevelIndicator />

        {/* Audio source button */}
        <AudioSourceButton currentSource={audioSource} />

        {/* Fullscreen button */}
        <FullscreenButton />
      </div>
    </>
  );
}

export default Controls;
