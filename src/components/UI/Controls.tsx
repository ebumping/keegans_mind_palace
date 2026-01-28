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

import { useState, useEffect, useCallback } from 'react';
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
                onClick={() => setIsOpen(false)}
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
                onClick={() => setIsOpen(false)}
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
                onClick={() => setIsOpen(false)}
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
  const { bass, mid, high, overall } = useAudioStore(
    useShallow((state) => ({
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      overall: state.overall,
    }))
  );

  return (
    <div className="flex items-center gap-1.5">
      {/* Bass bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden">
        <div
          className="w-full bg-gradient-to-t from-[#c792f5] to-[#c792f5]/60 transition-all duration-75"
          style={{ height: `${Math.max(5, bass * 100)}%` }}
        />
      </div>

      {/* Mid bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden">
        <div
          className="w-full bg-gradient-to-t from-[#8eecf5] to-[#8eecf5]/60 transition-all duration-75"
          style={{ height: `${Math.max(5, mid * 100)}%` }}
        />
      </div>

      {/* High bar */}
      <div className="w-1.5 h-8 bg-[#1a1834] rounded-full overflow-hidden">
        <div
          className="w-full bg-gradient-to-t from-white/60 to-white/40 transition-all duration-75"
          style={{ height: `${Math.max(5, high * 100)}%` }}
        />
      </div>

      {/* Overall indicator */}
      <div
        className={`w-2 h-2 rounded-full transition-all duration-75 ${
          overall > 0.7 ? 'bg-[#c792f5] shadow-[0_0_8px_#c792f5]' : 'bg-white/30'
        }`}
      />
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

function MobileTouchControls({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <>
      {/* Left joystick zone */}
      <div className="fixed bottom-8 left-8 z-30 w-32 h-32 bg-[#1a1834]/20 backdrop-blur-sm rounded-full border border-white/10 pointer-events-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#c792f5]/30" />
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/40 font-mono">
          MOVE
        </div>
      </div>

      {/* Right touch zone for looking */}
      <div className="fixed bottom-8 right-8 z-30 w-32 h-32 bg-[#1a1834]/20 backdrop-blur-sm rounded-full border border-white/10 pointer-events-auto">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#8eecf5]/30" />
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/40 font-mono">
          LOOK
        </div>
      </div>

      {/* Sprint button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 px-6 py-3 bg-[#c792f5]/20 backdrop-blur-sm rounded-lg border border-[#c792f5]/30 pointer-events-auto">
        <span className="text-[10px] text-[#c792f5] font-mono">SPRINT</span>
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
