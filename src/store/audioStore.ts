/**
 * Zustand store for audio state
 *
 * Stores raw audio levels updated every frame, smoothed values for shaders,
 * and history arrays for pattern generation.
 */

import { create } from 'zustand';
import type { AudioLevels } from '../core/AudioAnalyser';
import type { AudioSource } from '../core/AudioCapture';

const HISTORY_LENGTH = 64;
const SMOOTH_FACTOR = 0.15; // How quickly smoothed values follow raw values

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
  bassHistory: number[];
  midHistory: number[];
  highHistory: number[];

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

  // History
  bassHistory: new Array(HISTORY_LENGTH).fill(0),
  midHistory: new Array(HISTORY_LENGTH).fill(0),
  highHistory: new Array(HISTORY_LENGTH).fill(0),

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

    // Update history arrays (shift and push new value)
    const bassHistory = [...state.bassHistory.slice(1), levels.bass];
    const midHistory = [...state.midHistory.slice(1), levels.mid];
    const highHistory = [...state.highHistory.slice(1), levels.high];

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

      // History
      bassHistory,
      midHistory,
      highHistory,
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
    set(initialState);
  },
}));

/**
 * Selector hooks for specific parts of the audio state
 * Use these in components to avoid unnecessary re-renders
 */
export const useAudioLevels = () =>
  useAudioStore((state) => ({
    bass: state.bass,
    mid: state.mid,
    high: state.high,
    overall: state.overall,
    transient: state.transient,
    transientIntensity: state.transientIntensity,
  }));

export const useAudioSmooth = () =>
  useAudioStore((state) => ({
    bassSmooth: state.bassSmooth,
    midSmooth: state.midSmooth,
    highSmooth: state.highSmooth,
  }));

export const useAudioHistory = () =>
  useAudioStore((state) => ({
    bassHistory: state.bassHistory,
    midHistory: state.midHistory,
    highHistory: state.highHistory,
  }));

export const useAudioCapture = () =>
  useAudioStore((state) => ({
    isCapturing: state.isCapturing,
    audioSource: state.audioSource,
    error: state.error,
  }));
