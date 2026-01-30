/**
 * Zustand store for audio state
 *
 * Stores raw audio levels updated every frame, smoothed values for shaders,
 * and history arrays for pattern generation.
 *
 * Uses ring buffers for history to avoid GC pressure from array allocations.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AudioLevels } from '../core/AudioAnalyser';
import type { AudioCapture, AudioSource } from '../core/AudioCapture';

const HISTORY_LENGTH = 64;
// Store-level smoothing removed — AnalyserNode smoothingTimeConstant (0.45) is sufficient.
// Smooth values now track raw values directly to avoid triple-smoothing the audio signal.

/**
 * Ring buffer for efficient history tracking without array allocations.
 * Maintains a fixed-size array and a write index that wraps around.
 */
class RingBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private cachedArray: number[] | null = null;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  push(value: number): void {
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    this.cachedArray = null; // Invalidate cache on write
  }

  // Get values in order from oldest to newest.
  // Returns a cached array if no writes have occurred since the last call.
  toArray(): number[] {
    if (this.cachedArray !== null) {
      return this.cachedArray;
    }
    const result: number[] = new Array(this.buffer.length);
    for (let i = 0; i < this.buffer.length; i++) {
      result[i] = this.buffer[(this.writeIndex + i) % this.buffer.length];
    }
    this.cachedArray = result;
    return result;
  }

  // Get raw buffer for direct access (more efficient for shaders)
  getBuffer(): Float32Array {
    return this.buffer;
  }

  reset(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
    this.cachedArray = null;
  }
}

// Shared ring buffers (persisted across store resets for efficiency)
const bassRingBuffer = new RingBuffer(HISTORY_LENGTH);
const midRingBuffer = new RingBuffer(HISTORY_LENGTH);
const highRingBuffer = new RingBuffer(HISTORY_LENGTH);

export interface AudioStore {
  // Raw levels (updated every frame)
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;

  // Smoothed levels (for shader uniforms - less jittery)
  bassSmooth: number;
  midSmooth: number;
  highSmooth: number;

  // Capture state
  isCapturing: boolean;
  audioSource: AudioSource;
  error: Error | null;
  // Set when a live audio stream ends and we fall back to demo mode
  streamLost: boolean;
  audioCaptureInstance: AudioCapture | null;

  // Actions
  updateLevels: (levels: AudioLevels) => void;
  setCapturing: (isCapturing: boolean, source?: AudioSource) => void;
  setError: (error: Error | null) => void;
  setStreamLost: (lost: boolean) => void;
  setAudioCaptureInstance: (capture: AudioCapture | null) => void;
  reset: () => void;
}

const initialState = {
  // Raw levels
  bass: 0,
  mid: 0,
  high: 0,
  overall: 0,
  transient: false,
  transientIntensity: 0,

  // Smoothed levels
  bassSmooth: 0,
  midSmooth: 0,
  highSmooth: 0,

  // Capture state
  isCapturing: false,
  audioSource: null as AudioSource,
  error: null as Error | null,
  streamLost: false,
  audioCaptureInstance: null as AudioCapture | null,
};

export const useAudioStore = create<AudioStore>((set) => ({
  ...initialState,

  updateLevels: (levels: AudioLevels) => {
    // Pass through raw values — AnalyserNode smoothing is sufficient
    const bassSmooth = levels.bass;
    const midSmooth = levels.mid;
    const highSmooth = levels.high;

    // Update ring buffers (no array allocation!)
    bassRingBuffer.push(levels.bass);
    midRingBuffer.push(levels.mid);
    highRingBuffer.push(levels.high);

    set({
      // Raw levels
      bass: levels.bass,
      mid: levels.mid,
      high: levels.high,
      overall: levels.overall,
      transient: levels.transient,
      transientIntensity: levels.transientIntensity,

      // Smoothed levels
      bassSmooth,
      midSmooth,
      highSmooth,

    });
  },

  setCapturing: (isCapturing: boolean, source?: AudioSource) => {
    set({
      isCapturing,
      audioSource: source ?? null,
      error: null,
    });
  },

  setError: (error: Error | null) => {
    set({ error });
  },

  setStreamLost: (lost: boolean) => {
    set({ streamLost: lost });
  },

  setAudioCaptureInstance: (capture: AudioCapture | null) => {
    set({ audioCaptureInstance: capture });
  },

  reset: () => {
    // Reset ring buffers
    bassRingBuffer.reset();
    midRingBuffer.reset();
    highRingBuffer.reset();
    set(initialState);
  },
}));

/**
 * Selector hooks for specific parts of the audio state
 * Use these in components to avoid unnecessary re-renders
 * Using useShallow for shallow comparison to prevent infinite re-renders
 */
export const useAudioLevels = () =>
  useAudioStore(
    useShallow((state) => ({
      bass: state.bass,
      mid: state.mid,
      high: state.high,
      overall: state.overall,
      transient: state.transient,
      transientIntensity: state.transientIntensity,
    }))
  );

export const useAudioSmooth = () =>
  useAudioStore(
    useShallow((state) => ({
      bassSmooth: state.bassSmooth,
      midSmooth: state.midSmooth,
      highSmooth: state.highSmooth,
    }))
  );

/**
 * Ref-stable getter for audio history arrays.
 * Call this from useFrame() loops or event handlers — it does not trigger React re-renders.
 * Arrays are cached and only reallocated when the underlying ring buffer has been written to.
 */
export const getAudioHistory = () => ({
  bassHistory: bassRingBuffer.toArray(),
  midHistory: midRingBuffer.toArray(),
  highHistory: highRingBuffer.toArray(),
});

// Export raw ring buffers for high-performance shader access
export const getAudioHistoryBuffers = () => ({
  bass: bassRingBuffer.getBuffer(),
  mid: midRingBuffer.getBuffer(),
  high: highRingBuffer.getBuffer(),
});

export const useAudioCapture = () =>
  useAudioStore(
    useShallow((state) => ({
      isCapturing: state.isCapturing,
      audioSource: state.audioSource,
      error: state.error,
    }))
  );
