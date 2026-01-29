/**
 * Performance Settings Store
 *
 * Manages graphics quality tiers for optimal performance across devices.
 * Auto-detects device capabilities and allows manual override.
 */

import { create } from 'zustand';

export type QualityTier = 'low' | 'medium' | 'high';

export interface PerformanceSettings {
  // Renderer settings
  pixelRatio: number;
  antialias: boolean;

  // Post-processing
  enablePostProcessing: boolean;
  enableBloom: boolean;
  enableChromaticAberration: boolean;
  enableVignette: boolean;
  enableGlitch: boolean;

  // Particles
  particleMultiplier: number;

  // Shadows
  enableShadows: boolean;
  shadowMapSize: number;

  // Lights
  maxLights: number;
}

const QUALITY_PRESETS: Record<QualityTier, PerformanceSettings> = {
  low: {
    pixelRatio: 1,
    antialias: false,
    enablePostProcessing: false,
    enableBloom: false,
    enableChromaticAberration: false,
    enableVignette: false,
    enableGlitch: false,
    particleMultiplier: 0.3,
    enableShadows: false,
    shadowMapSize: 256,
    maxLights: 2,
  },
  medium: {
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    antialias: false,
    enablePostProcessing: true,
    enableBloom: true,
    enableChromaticAberration: false,
    enableVignette: true,
    enableGlitch: false,
    particleMultiplier: 0.5,
    enableShadows: true,
    shadowMapSize: 256,
    maxLights: 2,
  },
  high: {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    antialias: true,
    enablePostProcessing: true,
    enableBloom: true,
    enableChromaticAberration: true,
    enableVignette: true,
    enableGlitch: true,
    particleMultiplier: 1.0,
    enableShadows: true,
    shadowMapSize: 512,
    maxLights: 3,
  },
};

export interface PerformanceStore {
  tier: QualityTier;
  settings: PerformanceSettings;
  isAutoDetected: boolean;
  fps: number;
  fpsHistory: number[];
  targetFps: number;
  lastTierChangeTime: number;
  consecutiveBelowTarget: number;
  consecutiveAboveTarget: number;

  // Actions
  setTier: (tier: QualityTier) => void;
  autoDetect: () => QualityTier;
  updateFps: (fps: number) => void;
  adaptQuality: () => void;
}

// Hysteresis constants — adaptQuality is called ~1x/sec from FpsMonitor
const TIER_CHANGE_COOLDOWN_MS = 8000; // Minimum 8 seconds between tier changes
const DOWNGRADE_CONSECUTIVE_CALLS = 5; // 5 consecutive calls (~5s) below threshold to downgrade
const UPGRADE_CONSECUTIVE_CALLS = 15; // 15 consecutive calls (~15s) above threshold to upgrade
const DOWNGRADE_FPS_RATIO = 0.5; // Downgrade when avg FPS < 50% of target
const UPGRADE_FPS_RATIO = 0.85; // Upgrade when avg FPS > 85% of target

/**
 * Detect the display's target FPS (refresh rate).
 * Defaults to 60 for standard displays, detects higher for 120Hz/144Hz/etc.
 */
function detectTargetFps(): number {
  // Check for mobile first — target 30fps
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  if (isMobile) return 30;

  // For desktop, default to 60. The PerformanceMonitor will refine
  // this from actual measured frame times after a few seconds.
  return 60;
}

/**
 * Detect device performance tier based on hardware indicators
 */
function detectPerformanceTier(): QualityTier {
  // Check for mobile/tablet
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    return 'low';
  }

  // Check GPU info via WebGL
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (gl) {
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const rendererLower = renderer.toLowerCase();
      // Detect software renderers — always low tier
      const isSoftwareRenderer =
        rendererLower.includes('llvmpipe') ||
        rendererLower.includes('swiftshader') ||
        rendererLower.includes('mesa') && rendererLower.includes('software');

      if (isSoftwareRenderer) {
        return 'low';
      }

      // Detect weak integrated graphics (Intel HD/UHD)
      const isWeakIntegratedGPU =
        rendererLower.includes('intel') &&
        (rendererLower.includes('hd graphics') ||
         rendererLower.includes('uhd graphics'));

      // Detect capable integrated graphics (Intel Iris, Apple Silicon)
      const isCapableIntegratedGPU =
        rendererLower.includes('intel') && rendererLower.includes('iris') ||
        rendererLower.includes('apple gpu') ||
        rendererLower.includes('apple m');

      // Detect high-end discrete GPUs
      const isHighEndGPU =
        rendererLower.includes('nvidia') ||
        rendererLower.includes('geforce') ||
        rendererLower.includes('radeon rx') ||
        rendererLower.includes('radeon pro');

      if (isHighEndGPU) {
        return 'high';
      }

      if (isWeakIntegratedGPU) {
        return 'low';
      }

      if (isCapableIntegratedGPU) {
        return 'medium';
      }
    }
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) {
    return 'low';
  }

  // Check device memory if available
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory && memory < 4) {
    return 'low';
  }

  // Default to medium for unknown devices
  return 'medium';
}

export const usePerformanceStore = create<PerformanceStore>((set, get) => {
  const initialTier = detectPerformanceTier();
  const initialTargetFps = detectTargetFps();

  return {
    tier: initialTier,
    settings: QUALITY_PRESETS[initialTier],
    isAutoDetected: true,
    fps: 60,
    fpsHistory: [],
    targetFps: initialTargetFps,
    lastTierChangeTime: 0,
    consecutiveBelowTarget: 0,
    consecutiveAboveTarget: 0,

    setTier: (tier: QualityTier) => {
      set({
        tier,
        settings: QUALITY_PRESETS[tier],
        isAutoDetected: false,
        lastTierChangeTime: performance.now(),
        consecutiveBelowTarget: 0,
        consecutiveAboveTarget: 0,
        fpsHistory: [],
      });
    },

    autoDetect: () => {
      const tier = detectPerformanceTier();
      set({
        tier,
        settings: QUALITY_PRESETS[tier],
        isAutoDetected: true,
        lastTierChangeTime: performance.now(),
        consecutiveBelowTarget: 0,
        consecutiveAboveTarget: 0,
      });
      return tier;
    },

    updateFps: (fps: number) => {
      const state = get();
      const history = [...state.fpsHistory.slice(-119), fps]; // Keep last 120 samples (~2s)

      // Refine target FPS from actual measured peaks — if we see sustained
      // FPS well above 60, the display is likely high-refresh-rate
      if (state.isAutoDetected && history.length >= 60) {
        // Use the 90th percentile of recent FPS as a refresh rate estimate
        const sorted = [...history].sort((a, b) => a - b);
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        let detectedTarget = state.targetFps;
        if (p90 > 100) detectedTarget = 120;
        if (p90 > 130) detectedTarget = 144;
        if (p90 > 200) detectedTarget = 240;
        if (detectedTarget !== state.targetFps) {
          set({ targetFps: detectedTarget });
          console.log(`[Performance] Detected high-refresh display, target FPS: ${detectedTarget}`);
        }
      }

      set({ fps, fpsHistory: history });
    },

    // Adaptive quality with hysteresis — prevents oscillation between tiers
    adaptQuality: () => {
      const state = get();
      if (state.fpsHistory.length < 30) return; // Need enough samples
      if (!state.isAutoDetected) return; // Don't override manual selection

      const now = performance.now();
      const timeSinceLastChange = now - state.lastTierChangeTime;

      // Enforce cooldown between tier changes to prevent oscillation
      if (timeSinceLastChange < TIER_CHANGE_COOLDOWN_MS) return;

      const avgFps = state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length;
      const target = state.targetFps;

      const isBelowTarget = avgFps < target * DOWNGRADE_FPS_RATIO;
      const isAboveTarget = avgFps > target * UPGRADE_FPS_RATIO;

      let newBelow = isBelowTarget ? state.consecutiveBelowTarget + 1 : 0;
      let newAbove = isAboveTarget ? state.consecutiveAboveTarget + 1 : 0;

      // Downgrade: sustained poor performance
      if (newBelow >= DOWNGRADE_CONSECUTIVE_CALLS && state.tier !== 'low') {
        const newTier = state.tier === 'high' ? 'medium' : 'low';
        set({
          tier: newTier,
          settings: QUALITY_PRESETS[newTier],
          fpsHistory: [],
          lastTierChangeTime: now,
          consecutiveBelowTarget: 0,
          consecutiveAboveTarget: 0,
        });
        console.log(
          `[Performance] Downgraded to ${newTier} (avg: ${avgFps.toFixed(1)} fps, target: ${target})`
        );
        return;
      }

      // Upgrade: sustained good performance — more conservative threshold
      if (newAbove >= UPGRADE_CONSECUTIVE_CALLS && state.tier !== 'high') {
        const newTier = state.tier === 'low' ? 'medium' : 'high';
        set({
          tier: newTier,
          settings: QUALITY_PRESETS[newTier],
          fpsHistory: [],
          lastTierChangeTime: now,
          consecutiveBelowTarget: 0,
          consecutiveAboveTarget: 0,
        });
        console.log(
          `[Performance] Upgraded to ${newTier} (avg: ${avgFps.toFixed(1)} fps, target: ${target})`
        );
        return;
      }

      set({
        consecutiveBelowTarget: newBelow,
        consecutiveAboveTarget: newAbove,
      });
    },
  };
});

// Selector hooks
export const usePerformanceSettings = () => usePerformanceStore((state) => state.settings);
export const usePerformanceTier = () => usePerformanceStore((state) => state.tier);
