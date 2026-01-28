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
import type { AudioSource } from '../core/AudioCapture';

const HISTORY_LENGTH = 64;
const SMOOTH_FACTOR = 0.15; // How quickly smoothed values follow raw values

/**
 * Ring buffer for efficient history tracking without array allocations.
 * Maintains a fixed-size array and a write index that wraps around.
 */
class RingBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  push(value: number): void {
    this.buffer[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
  }

  // Get values in order from oldest to newest (for compatibility)
  toArray(): number[] {
    const result: number[] = new Array(this.buffer.length);
    for (let i = 0; i < this.buffer.length; i++) {
      result[i] = this.buffer[(this.writeIndex + i) % this.buffer.length];
    }
    return result;
  }

  // Get raw buffer for direct access (more efficient for shaders)
  getBuffer(): Float32Array {
    return this.buffer;
  }

  reset(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
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

  // History for pattern generation (last 64 frames)
  // Note: These are computed on-demand from ring buffers to maintain API compatibility
  bassHistory: number[];
  midHistory: number[];
  highHistory: number[];

  // History update counter (increments each frame for reactive updates)
  historyVersion: number;

  // Capture state
  isCapturing: boolean;
  audioSource: AudioSource;
  error: Error | null;

  // Actions
  updateLevels: (levels: AudioLevels) => void;
  setCapturing: (isCapturing: boolean, source?: AudioSource) => void;
  setError: (error: Error | null) => void;
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

  // History (initially empty arrays, populated from ring buffers on demand)
  bassHistory: new Array(HISTORY_LENGTH).fill(0),
  midHistory: new Array(HISTORY_LENGTH).fill(0),
  highHistory: new Array(HISTORY_LENGTH).fill(0),

  // Version counter
  historyVersion: 0,

  // Capture state
  isCapturing: false,
  audioSource: null as AudioSource,
  error: null as Error | null,
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  ...initialState,

  updateLevels: (levels: AudioLevels) => {
    const state = get();

    // Calculate smoothed values using exponential moving average
    const bassSmooth = state.bassSmooth + (levels.bass - state.bassSmooth) * SMOOTH_FACTOR;
    const midSmooth = state.midSmooth + (levels.mid - state.midSmooth) * SMOOTH_FACTOR;
    const highSmooth = state.highSmooth + (levels.high - state.highSmooth) * SMOOTH_FACTOR;

    // Update ring buffers (no array allocation!)
    bassRingBuffer.push(levels.bass);
    midRingBuffer.push(levels.mid);
    highRingBuffer.push(levels.high);

    // Increment version to signal history update (for reactive components that need it)
    const historyVersion = state.historyVersion + 1;

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

      // History version (arrays computed lazily via selectors)
      historyVersion,
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

export const useAudioHistory = () =>
  useAudioStore(
    useShallow((state) => ({
      // historyVersion is used as a dependency to trigger recomputation
      historyVersion: state.historyVersion,
      bassHistory: bassRingBuffer.toArray(),
      midHistory: midRingBuffer.toArray(),
      highHistory: highRingBuffer.toArray(),
    }))
  );

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
