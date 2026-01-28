/**
 * AudioPermission - Modal for requesting audio capture permission
 *
 * Pale-strata styled modal with options for:
 * - Desktop audio capture (screen share)
 * - Microphone capture fallback
 * - Demo mode (no capture)
 */

import { useState } from 'react';
import { AudioCapture } from '../../core/AudioCapture';
import { useAudioStore } from '../../store/audioStore';

export interface AudioPermissionProps {
  onGranted?: () => void;
  onCancelled?: () => void;
  onError?: (error: Error) => void;
}

type PermissionState = 'idle' | 'requesting' | 'granted' | 'error';

export function AudioPermission({
  onGranted,
  onCancelled,
  onError,
}: AudioPermissionProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get audio capture state from store
  const isCapturing = useAudioStore((state) => state.isCapturing);

  // Handle desktop audio capture
  const handleDesktopCapture = async () => {
    setPermissionState('requesting');
    setErrorMessage('');

    try {
      const capture = new AudioCapture({
        onStreamStart: (source) => {
          useAudioStore.getState().setCapturing(true, source);
          setPermissionState('granted');
          onGranted?.();
        },
        onStreamEnd: () => {
          useAudioStore.getState().setCapturing(false);
          setPermissionState('idle');
        },
        onError: (error) => {
          setPermissionState('error');
          setErrorMessage(error.message);
          onError?.(error);
        },
      });

      await capture.startCapture();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPermissionState('error');
      setErrorMessage(`Desktop audio capture failed: ${message}`);
      onError?.(error instanceof Error ? error : new Error(message));
    }
  };

  // Handle microphone capture
  const handleMicrophoneCapture = async () => {
    setPermissionState('requesting');
    setErrorMessage('');

    try {
      const capture = new AudioCapture({
        onStreamStart: (source) => {
          useAudioStore.getState().setCapturing(true, source);
          setPermissionState('granted');
          onGranted?.();
        },
        onStreamEnd: () => {
          useAudioStore.getState().setCapturing(false);
          setPermissionState('idle');
        },
        onError: (error) => {
          setPermissionState('error');
          setErrorMessage(error.message);
          onError?.(error);
        },
      });

      await capture.startMicrophoneCapture();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPermissionState('error');
      setErrorMessage(`Microphone capture failed: ${message}`);
      onError?.(error instanceof Error ? error : new Error(message));
    }
  };

  // Handle demo mode (no capture)
  const handleDemoMode = () => {
    useAudioStore.getState().setCapturing(true, 'demo');
    setPermissionState('granted');
    onGranted?.();
  };

  // Handle cancel
  const handleCancel = () => {
    onCancelled?.();
  };

  // If already granted or capturing, don't render
  if (permissionState === 'granted' || isCapturing) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1834]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-permission-title"
      aria-describedby="audio-permission-description"
    >
      <div className="relative max-w-md w-full mx-4 p-8 rounded-lg border border-[#c792f5]/30 bg-gradient-to-br from-[#211f3c] to-[#1a1834] shadow-2xl shadow-[#c792f5]/20">
        {/* Header */}
        <div className="text-center mb-6">
          <h2
            id="audio-permission-title"
            className="text-2xl font-bold text-[#c792f5] mb-2 font-mono"
          >
            Audio Capture Required
          </h2>
          <p
            id="audio-permission-description"
            className="text-[#8eecf5]/80 text-sm leading-relaxed"
          >
            Keegan's Mind Palace reacts to audio in real-time. Choose how you'd like to
            provide audio input for the experience.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleDesktopCapture}
            disabled={permissionState === 'requesting'}
            className="w-full px-6 py-4 rounded-lg border border-[#c792f5]/50 bg-[#c792f5]/10 hover:bg-[#c792f5]/20 text-[#c792f5] font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>Desktop Audio (Recommended)</span>
          </button>

          <button
            onClick={handleMicrophoneCapture}
            disabled={permissionState === 'requesting'}
            className="w-full px-6 py-4 rounded-lg border border-[#8eecf5]/50 bg-[#8eecf5]/10 hover:bg-[#8eecf5]/20 text-[#8eecf5] font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span>Microphone</span>
          </button>

          <button
            onClick={handleDemoMode}
            disabled={permissionState === 'requesting'}
            className="w-full px-6 py-4 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
          >
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
            <span>Demo Mode (No Capture)</span>
          </button>
        </div>

        {/* Error message */}
        {permissionState === 'error' && errorMessage && (
          <div className="mb-4 p-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {permissionState === 'requesting' && (
          <div className="mb-4 p-4 rounded bg-[#c792f5]/10 border border-[#c792f5]/30 text-[#c792f5] text-sm">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-[#c792f5] border-t-transparent rounded-full animate-spin" />
              <span>Requesting audio permission...</span>
            </div>
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="w-full py-3 text-white/40 hover:text-white/60 font-mono text-xs transition-colors"
        >
          Cancel
        </button>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#c792f5] animate-pulse" />
        <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-[#8eecf5] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
  );
}

export default AudioPermission;
