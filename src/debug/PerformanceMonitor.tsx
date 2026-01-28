/**
 * PerformanceMonitor: Real-time FPS and performance tracking
 *
 * Displays:
 * - Current FPS (target: 60 desktop, 30 mobile)
 * - Frame time
 * - Memory usage (if available)
 * - Warning indicators when performance drops
 *
 * Per game_refinement_plan.md Overall success criteria:
 * "60fps on desktop, 30fps on mobile"
 */

import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  memory?: number;
  isPerformant: boolean;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  targetFps?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showWarnings?: boolean;
}

// Detect mobile device
function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Internal hook to track performance metrics
 */
function usePerformanceMetrics(targetFps: number): PerformanceMetrics {
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const metricsRef = useRef<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    averageFps: 60,
    minFps: 60,
    maxFps: 60,
    isPerformant: true,
  });

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Calculate FPS
    const fps = delta > 0 ? 1000 / delta : 60;

    // Store frame times for averaging (keep last 60 frames)
    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate statistics
    const frameTimes = frameTimesRef.current;
    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const avgFps = 1000 / avgFrameTime;
    const minFps = Math.min(...frameTimes.map((t) => 1000 / t));
    const maxFps = Math.max(...frameTimes.map((t) => 1000 / t));

    // Get memory usage if available
    let memory: number | undefined;
    if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory) {
      memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024);
    }

    // Update metrics
    metricsRef.current = {
      fps: Math.round(fps),
      frameTime: delta,
      averageFps: Math.round(avgFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      memory,
      isPerformant: avgFps >= targetFps * 0.9, // Within 90% of target
    };
  });

  return metricsRef.current;
}

/**
 * Performance monitoring component (renders outside Canvas)
 */
export function PerformanceMonitor({
  enabled = true,
  targetFps: customTargetFps,
  position = 'bottom-right',
  showWarnings = true,
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    averageFps: 60,
    minFps: 60,
    maxFps: 60,
    isPerformant: true,
  });

  // Determine target FPS based on device
  const targetFps = customTargetFps ?? (isMobile() ? 30 : 60);

  // Update metrics periodically (not every frame to avoid re-renders)
  useEffect(() => {
    if (!enabled) return;

    const frameTimes: number[] = [];
    let lastTime = performance.now();
    let rafId: number;

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      frameTimes.push(delta);
      if (frameTimes.length > 60) frameTimes.shift();

      rafId = requestAnimationFrame(measureFrame);
    };

    // Update display at 4 Hz to avoid overhead
    const intervalId = setInterval(() => {
      if (frameTimes.length === 0) return;

      const avgFrameTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const avgFps = 1000 / avgFrameTime;
      const fps = frameTimes.length > 0 ? 1000 / frameTimes[frameTimes.length - 1] : 60;

      let memory: number | undefined;
      if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory) {
        memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024);
      }

      setMetrics({
        fps: Math.round(fps),
        frameTime: avgFrameTime,
        averageFps: Math.round(avgFps),
        minFps: Math.round(Math.min(...frameTimes.map((t) => 1000 / t))),
        maxFps: Math.round(Math.max(...frameTimes.map((t) => 1000 / t))),
        memory,
        isPerformant: avgFps >= targetFps * 0.9,
      });
    }, 250);

    rafId = requestAnimationFrame(measureFrame);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [enabled, targetFps]);

  if (!enabled) return null;

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 10, left: 10 },
    'top-right': { top: 10, right: 10 },
    'bottom-left': { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
  };

  // Color based on performance
  const fpsColor = metrics.averageFps >= targetFps
    ? '#00ff00'
    : metrics.averageFps >= targetFps * 0.75
    ? '#ffff00'
    : '#ff0000';

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        backgroundColor: 'rgba(26, 24, 52, 0.85)',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#c792f5',
        zIndex: 1000,
        pointerEvents: 'none',
        border: `1px solid ${metrics.isPerformant ? '#3a3861' : '#ff4444'}`,
      }}
    >
      <div style={{ color: fpsColor, fontWeight: 'bold' }}>
        {metrics.fps} FPS
      </div>
      <div style={{ color: '#8eecf5', fontSize: '10px', marginTop: '2px' }}>
        avg: {metrics.averageFps} | target: {targetFps}
      </div>
      <div style={{ color: '#666', fontSize: '10px' }}>
        min: {metrics.minFps} / max: {metrics.maxFps}
      </div>
      {metrics.memory !== undefined && (
        <div style={{ color: '#666', fontSize: '10px' }}>
          mem: {metrics.memory.toFixed(1)} MB
        </div>
      )}
      {showWarnings && !metrics.isPerformant && (
        <div style={{ color: '#ff4444', fontSize: '10px', marginTop: '4px' }}>
          Below target!
        </div>
      )}
    </div>
  );
}

/**
 * Hook to access performance metrics in Three.js components
 */
export function usePerformance(targetFps?: number): PerformanceMetrics {
  const target = targetFps ?? (isMobile() ? 30 : 60);
  return usePerformanceMetrics(target);
}

/**
 * Performance warning component (shows in-scene)
 */
export function PerformanceWarningOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
        padding: '20px 40px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff4444',
        zIndex: 1001,
        pointerEvents: 'none',
        border: '2px solid #ff4444',
        animation: 'pulse 1s ease-in-out infinite',
      }}
    >
      Performance Degraded
    </div>
  );
}

export default PerformanceMonitor;
