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

  // Actions
  setTier: (tier: QualityTier) => void;
  autoDetect: () => QualityTier;
  updateFps: (fps: number) => void;
  adaptQuality: () => void;
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
      const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

      const rendererLower = renderer.toLowerCase();
      const vendorLower = vendor.toLowerCase();

      // Detect integrated graphics (typically lower performance)
      const isIntegratedGPU =
        rendererLower.includes('intel') ||
        rendererLower.includes('llvmpipe') ||
        rendererLower.includes('swiftshader') ||
        rendererLower.includes('apple gpu') || // Apple Silicon integrated
        rendererLower.includes('apple m1') ||
        rendererLower.includes('apple m2') ||
        rendererLower.includes('apple m3');

      // Detect high-end discrete GPUs
      const isHighEndGPU =
        rendererLower.includes('nvidia') ||
        rendererLower.includes('geforce') ||
        rendererLower.includes('radeon rx') ||
        rendererLower.includes('radeon pro');

      // macOS often has performance issues with WebGL even on decent hardware
      const isMac = navigator.platform.toLowerCase().includes('mac') ||
                    vendorLower.includes('apple');

      if (isHighEndGPU && !isMac) {
        return 'high';
      }

      if (isIntegratedGPU || isMac) {
        // Use medium for integrated/Mac - they can handle some effects
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

  return {
    tier: initialTier,
    settings: QUALITY_PRESETS[initialTier],
    isAutoDetected: true,
    fps: 60,
    fpsHistory: [],

    setTier: (tier: QualityTier) => {
      set({
        tier,
        settings: QUALITY_PRESETS[tier],
        isAutoDetected: false,
      });
    },

    autoDetect: () => {
      const tier = detectPerformanceTier();
      set({
        tier,
        settings: QUALITY_PRESETS[tier],
        isAutoDetected: true,
      });
      return tier;
    },

    updateFps: (fps: number) => {
      const state = get();
      const history = [...state.fpsHistory.slice(-59), fps]; // Keep last 60 samples
      set({ fps, fpsHistory: history });
    },

    // Adaptive quality - automatically downgrade if FPS is consistently low
    adaptQuality: () => {
      const state = get();
      if (state.fpsHistory.length < 30) return; // Need enough samples

      const avgFps = state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length;

      // If FPS is consistently below 30, downgrade
      if (avgFps < 30 && state.tier !== 'low') {
        const newTier = state.tier === 'high' ? 'medium' : 'low';
        set({
          tier: newTier,
          settings: QUALITY_PRESETS[newTier],
          fpsHistory: [], // Reset history after adaptation
        });
        console.log(`[Performance] Adapted quality to ${newTier} due to low FPS (avg: ${avgFps.toFixed(1)})`);
      }
    },
  };
});

// Selector hooks
export const usePerformanceSettings = () => usePerformanceStore((state) => state.settings);
export const usePerformanceTier = () => usePerformanceStore((state) => state.tier);
