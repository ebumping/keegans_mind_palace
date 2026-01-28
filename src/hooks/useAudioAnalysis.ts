/**
 * useAudioAnalysis - React hook for audio capture and analysis
 *
 * Provides real-time audio levels from desktop audio or microphone input,
 * with automatic fallback and demo mode support.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AudioCapture, type AudioSource } from '../core/AudioCapture';
import { AudioAnalyser, DemoAudioGenerator, type AudioLevels } from '../core/AudioAnalyser';
import { useAudioStore, useAudioCapture } from '../store/audioStore';

export interface UseAudioAnalysisReturn {
  // Current audio levels
  levels: AudioLevels;
  // Smoothed levels for shaders
  smoothLevels: {
    bassSmooth: number;
    midSmooth: number;
    highSmooth: number;
  };
  // Capture state
  isCapturing: boolean;
  error: Error | null;
  audioSource: AudioSource;
  // Actions
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  startDemoMode: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioAnalyserRef = useRef<AudioAnalyser | null>(null);
  const demoGeneratorRef = useRef<DemoAudioGenerator | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { isCapturing, audioSource, error } = useAudioCapture();
  const levels = useAudioStore(
    useShallow((state) => ({
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      overall: state.overall,
      transient: state.transient,
      transientIntensity: state.transientIntensity,
    }))
  );
  const smoothLevels = useAudioStore(
    useShallow((state) => ({
      bassSmooth: state.bassSmooth,
      midSmooth: state.midSmooth,
      highSmooth: state.highSmooth,
    }))
  );

  const updateLevels = useAudioStore((state) => state.updateLevels);
  const setCapturing = useAudioStore((state) => state.setCapturing);
  const setError = useAudioStore((state) => state.setError);
  const reset = useAudioStore((state) => state.reset);

  /**
   * Animation frame loop for updating audio levels
   */
  const startAnalysisLoop = useCallback(() => {
    const loop = () => {
      if (audioAnalyserRef.current) {
        const levels = audioAnalyserRef.current.getLevels();
        updateLevels(levels);
      } else if (demoGeneratorRef.current) {
        const levels = demoGeneratorRef.current.getLevels();
        updateLevels(levels);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [updateLevels]);

  /**
   * Stop the analysis loop
   */
  const stopAnalysisLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /**
   * Start audio capture (desktop audio with microphone fallback)
   */
  const startCapture = useCallback(async () => {
    // Stop any existing capture
    stopCapture();

    try {
      // Create audio capture instance
      audioCaptureRef.current = new AudioCapture({
        onStreamStart: (source) => {
          setCapturing(true, source);
        },
        onStreamEnd: () => {
          setCapturing(false);
          stopAnalysisLoop();
        },
        onError: (err) => {
          setError(err);
        },
      });

      // Start capture (will try desktop first, then microphone)
      const source = await audioCaptureRef.current.startCapture();

      // Create analyser
      const audioContext = audioCaptureRef.current.getAudioContext();
      const sourceNode = audioCaptureRef.current.getSourceNode();

      if (audioContext && sourceNode) {
        audioAnalyserRef.current = new AudioAnalyser(audioContext, sourceNode, {
          fftSize: 2048,
          smoothing: 0.8,
          transientThreshold: 30,
          transientDecay: 0.05,
        });

        // Stop demo mode if running
        demoGeneratorRef.current = null;

        // Start analysis loop
        startAnalysisLoop();

        setCapturing(true, source);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      // Fall back to demo mode on error
      console.log('Audio capture failed, starting demo mode');
      startDemoMode();
    }
  }, [setCapturing, setError, startAnalysisLoop, stopAnalysisLoop]);

  /**
   * Stop audio capture and clean up
   */
  const stopCapture = useCallback(() => {
    stopAnalysisLoop();

    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.dispose();
      audioAnalyserRef.current = null;
    }

    if (audioCaptureRef.current) {
      audioCaptureRef.current.dispose();
      audioCaptureRef.current = null;
    }

    demoGeneratorRef.current = null;

    reset();
  }, [reset, stopAnalysisLoop]);

  /**
   * Start demo mode with procedural audio
   */
  const startDemoMode = useCallback(() => {
    // Stop any existing capture
    if (audioCaptureRef.current) {
      audioCaptureRef.current.dispose();
      audioCaptureRef.current = null;
    }
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.dispose();
      audioAnalyserRef.current = null;
    }

    // Create demo generator
    demoGeneratorRef.current = new DemoAudioGenerator();

    // Start analysis loop
    startAnalysisLoop();

    setCapturing(true, 'demo');
  }, [setCapturing, startAnalysisLoop]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    levels,
    smoothLevels,
    isCapturing,
    error,
    audioSource,
    startCapture,
    stopCapture,
    startDemoMode,
  };
}

/**
 * Hook for use inside R3F useFrame - provides audio levels without React state overhead
 *
 * This is more efficient for high-frequency shader uniform updates since it
 * reads directly from the Zustand store without triggering React re-renders.
 */
export function useAudioLevelsRef() {
  return useCallback(() => {
    const state = useAudioStore.getState();
    return {
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      overall: state.overall,
      transient: state.transient,
      transientIntensity: state.transientIntensity,
      bassSmooth: state.bassSmooth,
      midSmooth: state.midSmooth,
      highSmooth: state.highSmooth,
    };
  }, []);
}
