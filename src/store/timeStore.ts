/**
 * Zustand store for time-based dread tracking (The Growl System)
 *
 * Tracks deployment timestamp and calculates Growl intensity based on
 * how long since the user first visited. The longer the palace exists,
 * the more oppressive the atmosphere becomes.
 */

import { create } from 'zustand';

// ===== Constants =====

const STORAGE_KEY = 'mindpalace_deployment_timestamp';

// ===== Types =====

// Growl phases - exported as const object for erasableSyntaxOnly compatibility
export const GrowlPhase = {
  SILENT: 'silent',       // 0-2 hours: Peaceful exploration
  DISTANT: 'distant',     // 2-6 hours: Barely perceptible sub-bass
  PRESENT: 'present',     // 6-12 hours: Occasional anomalies
  CLOSE: 'close',         // 12-24 hours: Unmistakable presence
  IMMINENT: 'imminent',   // 24+ hours: Reality breakdown
} as const;

export type GrowlPhase = typeof GrowlPhase[keyof typeof GrowlPhase];

export interface GrowlEffects {
  // Audio
  droneVolume: number;           // 0-1
  droneFrequency: number;        // Hz (25-40)

  // Visual
  shadowMovementChance: number;  // Per-frame probability
  lightFlickerIntensity: number; // 0-1
  colorDistortion: number;       // 0-1
  fogDensityBonus: number;       // Added to base fog

  // Camera
  shakeIntensity: number;        // 0-1
  fovDistortion: number;         // Degrees

  // Glitch
  glitchChanceMultiplier: number; // Multiplier on base glitch chance
}

export interface GrowlIntensity {
  level: number;        // 0-1 normalized
  phase: GrowlPhase;
  effects: GrowlEffects;
}

export interface TimeStore {
  // Deployment tracking
  deploymentTimestamp: number;
  hoursSinceDeployment: number;

  // Growl state
  growlIntensity: number;
  growlPhase: GrowlPhase;
  growlEffects: GrowlEffects;

  // Debug mode
  debugHoursOverride: number | null;

  // Actions
  initialize: () => void;
  update: () => void;
  setDebugHours: (hours: number | null) => void;
  resetDeploymentTimestamp: () => void;
}

// ===== Utility Functions =====

/**
 * Initialize or retrieve deployment timestamp from localStorage.
 * Each user has their own timeline - timestamp is when THIS user first visited.
 * If a deployment timestamp exists from the build, use it as a fallback.
 */
function initializeDeploymentTimestamp(): number {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    const timestamp = parseInt(stored, 10);
    // Validate stored value is a reasonable timestamp
    if (!isNaN(timestamp) && timestamp > 0 && timestamp <= Date.now()) {
      return timestamp;
    }
  }

  // First visit - use deployment timestamp from build if available, otherwise use current time
  const now = (window as any).deploymentTimestamp || Date.now();
  localStorage.setItem(STORAGE_KEY, now.toString());
  return now;
}

/**
 * Calculate hours elapsed since deployment timestamp.
 */
export function getHoursSinceDeployment(deploymentTimestamp: number): number {
  const now = Date.now();
  const milliseconds = now - deploymentTimestamp;
  return milliseconds / (1000 * 60 * 60);
}

/**
 * Determine the current Growl phase based on hours elapsed.
 */
function getGrowlPhase(hours: number): GrowlPhase {
  if (hours < 2) return GrowlPhase.SILENT;
  if (hours < 6) return GrowlPhase.DISTANT;
  if (hours < 12) return GrowlPhase.PRESENT;
  if (hours < 24) return GrowlPhase.CLOSE;
  return GrowlPhase.IMMINENT;
}

/**
 * Calculate Growl effects based on intensity level and phase.
 * Effects ramp up gradually with different thresholds.
 */
function getGrowlEffects(level: number, phase: GrowlPhase): GrowlEffects {
  return {
    // Audio ramps in during Distant phase
    droneVolume: phase === GrowlPhase.SILENT ? 0 : Math.min(level * 1.5, 0.8),
    droneFrequency: 25 + level * 15,  // 25-40 Hz

    // Visual effects start in Present phase
    shadowMovementChance: level > 0.2 ? (level - 0.2) * 0.01 : 0,
    lightFlickerIntensity: level > 0.3 ? (level - 0.3) * 0.5 : 0,
    colorDistortion: level * 0.3,
    fogDensityBonus: level * 0.02,

    // Camera effects in Close phase
    shakeIntensity: level > 0.5 ? (level - 0.5) * 0.02 : 0,
    fovDistortion: level > 0.5 ? (level - 0.5) * 5 : 0,

    // Glitch multiplier scales throughout
    glitchChanceMultiplier: 1 + level * 2,
  };
}

/**
 * Calculate complete Growl intensity data.
 * Uses asymptotic approach: 50% at ~16 hours, 90% at ~72 hours.
 */
function calculateGrowlIntensity(hours: number): GrowlIntensity {
  // Asymptotic approach to 1.0
  const level = 1 - Math.exp(-hours / 24);

  const phase = getGrowlPhase(hours);
  const effects = getGrowlEffects(level, phase);

  return { level, phase, effects };
}

// ===== Default State =====

const defaultEffects = getGrowlEffects(0, GrowlPhase.SILENT);

// ===== Store =====

export const useTimeStore = create<TimeStore>((set, get) => ({
  // Initial state
  deploymentTimestamp: 0,
  hoursSinceDeployment: 0,
  growlIntensity: 0,
  growlPhase: GrowlPhase.SILENT,
  growlEffects: defaultEffects,
  debugHoursOverride: null,

  /**
   * Initialize the time store.
   * Call this once on app startup.
   */
  initialize: () => {
    const timestamp = initializeDeploymentTimestamp();
    const hours = getHoursSinceDeployment(timestamp);
    const { level, phase, effects } = calculateGrowlIntensity(hours);

    set({
      deploymentTimestamp: timestamp,
      hoursSinceDeployment: hours,
      growlIntensity: level,
      growlPhase: phase,
      growlEffects: effects,
    });
  },

  /**
   * Update the time store.
   * Call this periodically (e.g., every frame or every second).
   * Only updates if values have actually changed to prevent unnecessary re-renders.
   */
  update: () => {
    const state = get();
    const debugOverride = state.debugHoursOverride;

    // Use debug override if set, otherwise calculate from real time
    const hours = debugOverride !== null
      ? debugOverride
      : getHoursSinceDeployment(state.deploymentTimestamp);

    const { level, phase, effects } = calculateGrowlIntensity(hours);

    // Only update if values have actually changed to prevent infinite re-renders
    const needsUpdate =
      Math.abs(state.hoursSinceDeployment - hours) > 0.01 ||
      Math.abs(state.growlIntensity - level) > 0.001 ||
      state.growlPhase !== phase;

    if (needsUpdate) {
      set({
        hoursSinceDeployment: hours,
        growlIntensity: level,
        growlPhase: phase,
        growlEffects: effects,
      });
    }
  },

  /**
   * Set debug hours override for testing.
   * Pass null to return to real-time calculation.
   */
  setDebugHours: (hours: number | null) => {
    set({ debugHoursOverride: hours });
    // Immediately update to apply debug hours
    get().update();
  },

  /**
   * Reset the deployment timestamp to current time.
   * Useful for testing or resetting the experience.
   */
  resetDeploymentTimestamp: () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());
    set({
      deploymentTimestamp: now,
      hoursSinceDeployment: 0,
      debugHoursOverride: null,
    });
    get().update();
  },
}));

// ===== Selector Hooks =====

/**
 * Select only the Growl intensity value (0-1).
 * Use this in shaders and effects that just need the level.
 */
export const useGrowlIntensity = () =>
  useTimeStore((state) => state.growlIntensity);

/**
 * Select the current Growl phase.
 * Use this for phase-specific logic or UI display.
 */
export const useGrowlPhase = () =>
  useTimeStore((state) => state.growlPhase);

/**
 * Select the full Growl effects object.
 * Use this for systems that need detailed effect parameters.
 */
export const useGrowlEffects = () =>
  useTimeStore((state) => state.growlEffects);

/**
 * Select time tracking data.
 * Use this for debug panels or UI display.
 */
export const useTimeTracking = () =>
  useTimeStore((state) => ({
    deploymentTimestamp: state.deploymentTimestamp,
    hoursSinceDeployment: state.hoursSinceDeployment,
  }));

/**
 * Select elapsed hours for debug display.
 */
export const useElapsedHours = () =>
  useTimeStore((state) => state.hoursSinceDeployment);

// Also export alias for compatibility
export { useElapsedHours as elapsedHours };
