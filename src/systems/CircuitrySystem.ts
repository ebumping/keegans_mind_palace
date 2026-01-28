/**
 * Circuitry System
 *
 * Manages circuit trace overlays that appear in some rooms.
 * Creates the visual effect of digital/technological patterns
 * revealing the underlying nature of the Mind Palace.
 *
 * Features:
 * - Random spawn chance (15-25% base, scaling with depth)
 * - Audio-reactive glow pulsing
 * - Data flow animation along traces
 * - Integration with pale-strata cyan accent (#8eecf5)
 */

import * as THREE from 'three';
import {
  CircuitryGenerator,
  CircuitTextureGenerator,
  shouldSpawnCircuitry,
  calculateCircuitryChance,
  type CircuitTrace,
} from '../generators/CircuitryGenerator';
import { useTimeStore } from '../store/timeStore';

// Import shader sources
import circuitryVertexShader from '../shaders/circuitry.vert?raw';
import circuitryFragmentShader from '../shaders/circuitry.frag?raw';

// ===== Types =====

export interface CircuitryConfig {
  seed: number;
  roomIndex: number;
  surfaceWidth: number;
  surfaceHeight: number;
  density?: number;
}

export interface CircuitryOverlay {
  id: string;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  texture: THREE.DataTexture;
  trace: CircuitTrace;
}

// ===== Constants =====

const CIRCUIT_COLORS = {
  circuit: new THREE.Color('#8eecf5'), // Cyan accent
  glow: new THREE.Color('#c792f5'),    // Purple glow
  background: new THREE.Color(0, 0, 0), // Transparent overlay
};

// ===== Material Creation =====

/**
 * Creates uniforms for the circuitry shader.
 */
export function createCircuitryUniforms(
  circuitTexture: THREE.DataTexture
): Record<string, THREE.IUniform> {
  return {
    // Audio uniforms
    u_bass: { value: 0 },
    u_mid: { value: 0 },
    u_high: { value: 0 },
    u_time: { value: 0 },

    // Circuit texture
    u_circuitTexture: { value: circuitTexture },

    // Effect parameters
    u_glowIntensity: { value: 0.8 },
    u_dataFlowSpeed: { value: 1.5 },
    u_opacity: { value: 0.9 },

    // Colors
    u_circuitColor: { value: CIRCUIT_COLORS.circuit.clone() },
    u_glowColor: { value: CIRCUIT_COLORS.glow.clone() },
    u_backgroundColor: { value: CIRCUIT_COLORS.background.clone() },
  };
}

/**
 * Creates a circuitry overlay material.
 */
export function createCircuitryMaterial(
  circuitTexture: THREE.DataTexture
): THREE.ShaderMaterial {
  const uniforms = createCircuitryUniforms(circuitTexture);

  return new THREE.ShaderMaterial({
    vertexShader: circuitryVertexShader,
    fragmentShader: circuitryFragmentShader,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Updates circuitry material uniforms with audio data.
 */
export function updateCircuitryMaterial(
  material: THREE.ShaderMaterial,
  time: number,
  audioData: { bass: number; mid: number; high: number }
): void {
  const uniforms = material.uniforms;

  uniforms.u_time.value = time;
  uniforms.u_bass.value = audioData.bass;
  uniforms.u_mid.value = audioData.mid;
  uniforms.u_high.value = audioData.high;
}

// ===== Circuitry System Class =====

/**
 * Main system for managing circuitry overlays across all rooms.
 */
export class CircuitrySystem {
  private generator: CircuitryGenerator;
  private textureGenerator: CircuitTextureGenerator;
  private overlays: Map<string, CircuitryOverlay> = new Map();

  constructor(textureResolution: number = 512) {
    this.generator = new CircuitryGenerator(24, 0.1);
    this.textureGenerator = new CircuitTextureGenerator(textureResolution);
  }

  /**
   * Check if a room should have circuitry based on seed and depth.
   */
  shouldHaveCircuitry(roomSeed: number, roomDepth: number): boolean {
    const growlIntensity = useTimeStore.getState().growlIntensity;
    return shouldSpawnCircuitry(roomSeed, roomDepth, growlIntensity);
  }

  /**
   * Get the spawn probability for circuitry in a room.
   */
  getSpawnChance(roomDepth: number): number {
    const growlIntensity = useTimeStore.getState().growlIntensity;
    return calculateCircuitryChance(roomDepth, growlIntensity);
  }

  /**
   * Create a circuitry overlay for a surface.
   */
  createOverlay(config: CircuitryConfig): CircuitryOverlay | null {
    const { seed, roomIndex, surfaceWidth, surfaceHeight, density = 0.4 } = config;

    // Check if this room should have circuitry
    const growlIntensity = useTimeStore.getState().growlIntensity;
    if (!shouldSpawnCircuitry(seed, roomIndex, growlIntensity)) {
      return null;
    }

    // Generate circuit trace
    const trace = this.generator.generate(
      1, // Normalized width
      1, // Normalized height
      seed,
      density
    );

    // Skip if trace is too sparse
    if (trace.nodes.length < 5 || trace.pathSegments.length < 3) {
      return null;
    }

    // Generate texture
    const texture = this.textureGenerator.generateTexture(trace);

    // Create material
    const material = createCircuitryMaterial(texture);

    // Create overlay mesh (slightly offset from surface)
    const geometry = new THREE.PlaneGeometry(surfaceWidth, surfaceHeight);
    const mesh = new THREE.Mesh(geometry, material);

    // Position slightly in front of the surface to avoid z-fighting
    mesh.position.z = 0.001;

    // Generate unique ID
    const id = `circuit-${roomIndex}-${seed}`;

    const overlay: CircuitryOverlay = {
      id,
      mesh,
      material,
      texture,
      trace,
    };

    // Store overlay
    this.overlays.set(id, overlay);

    return overlay;
  }

  /**
   * Create circuitry overlay for a wall.
   */
  createWallOverlay(
    roomIndex: number,
    wallSeed: number,
    wallWidth: number,
    wallHeight: number
  ): CircuitryOverlay | null {
    return this.createOverlay({
      seed: wallSeed,
      roomIndex,
      surfaceWidth: wallWidth,
      surfaceHeight: wallHeight,
      density: 0.35,
    });
  }

  /**
   * Create circuitry overlay for a floor.
   */
  createFloorOverlay(
    roomIndex: number,
    floorSeed: number,
    floorWidth: number,
    floorDepth: number
  ): CircuitryOverlay | null {
    return this.createOverlay({
      seed: floorSeed + 1000, // Different seed offset for floor
      roomIndex,
      surfaceWidth: floorWidth,
      surfaceHeight: floorDepth,
      density: 0.3,
    });
  }

  /**
   * Update all circuitry overlays with current audio data.
   */
  update(
    time: number,
    audioData: { bass: number; mid: number; high: number }
  ): void {
    for (const overlay of this.overlays.values()) {
      updateCircuitryMaterial(overlay.material, time, audioData);
    }
  }

  /**
   * Get an overlay by ID.
   */
  getOverlay(id: string): CircuitryOverlay | undefined {
    return this.overlays.get(id);
  }

  /**
   * Get all overlays.
   */
  getAllOverlays(): CircuitryOverlay[] {
    return Array.from(this.overlays.values());
  }

  /**
   * Remove an overlay by ID.
   */
  removeOverlay(id: string): void {
    const overlay = this.overlays.get(id);
    if (overlay) {
      overlay.mesh.geometry.dispose();
      overlay.material.dispose();
      overlay.texture.dispose();
      this.overlays.delete(id);
    }
  }

  /**
   * Remove all overlays for a room.
   */
  removeRoomOverlays(roomIndex: number): void {
    const prefix = `circuit-${roomIndex}-`;
    for (const [id, overlay] of this.overlays) {
      if (id.startsWith(prefix)) {
        overlay.mesh.geometry.dispose();
        overlay.material.dispose();
        overlay.texture.dispose();
        this.overlays.delete(id);
      }
    }
  }

  /**
   * Set glow intensity for all overlays.
   */
  setGlowIntensity(intensity: number): void {
    for (const overlay of this.overlays.values()) {
      overlay.material.uniforms.u_glowIntensity.value = intensity;
    }
  }

  /**
   * Set data flow speed for all overlays.
   */
  setDataFlowSpeed(speed: number): void {
    for (const overlay of this.overlays.values()) {
      overlay.material.uniforms.u_dataFlowSpeed.value = speed;
    }
  }

  /**
   * Set opacity for all overlays.
   */
  setOpacity(opacity: number): void {
    for (const overlay of this.overlays.values()) {
      overlay.material.uniforms.u_opacity.value = opacity;
    }
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    for (const overlay of this.overlays.values()) {
      overlay.mesh.geometry.dispose();
      overlay.material.dispose();
      overlay.texture.dispose();
    }
    this.overlays.clear();
  }
}

// ===== Singleton Instance =====

let circuitrySystemInstance: CircuitrySystem | null = null;

/**
 * Get the singleton CircuitrySystem instance.
 */
export function getCircuitrySystem(): CircuitrySystem {
  if (!circuitrySystemInstance) {
    circuitrySystemInstance = new CircuitrySystem();
  }
  return circuitrySystemInstance;
}

/**
 * Dispose the singleton instance.
 */
export function disposeCircuitrySystem(): void {
  if (circuitrySystemInstance) {
    circuitrySystemInstance.dispose();
    circuitrySystemInstance = null;
  }
}

// ===== React Hook =====

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAudioLevels } from '../store/audioStore';

/**
 * React hook for managing circuitry overlays in a room.
 */
export function useCircuitryOverlay(
  roomIndex: number,
  roomSeed: number,
  surfaceWidth: number,
  surfaceHeight: number,
  enabled: boolean = true
) {
  const overlayRef = useRef<CircuitryOverlay | null>(null);
  const audioLevels = useAudioLevels();

  // Create overlay on mount
  const overlay = useMemo(() => {
    if (!enabled) return null;

    const system = getCircuitrySystem();
    const created = system.createOverlay({
      seed: roomSeed,
      roomIndex,
      surfaceWidth,
      surfaceHeight,
    });

    overlayRef.current = created;
    return created;
  }, [roomIndex, roomSeed, surfaceWidth, surfaceHeight, enabled]);

  // Update overlay each frame
  useFrame((state) => {
    if (!overlayRef.current) return;

    updateCircuitryMaterial(
      overlayRef.current.material,
      state.clock.elapsedTime,
      {
        bass: audioLevels.bass,
        mid: audioLevels.mid,
        high: audioLevels.high,
      }
    );
  });

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (overlayRef.current) {
      const system = getCircuitrySystem();
      system.removeOverlay(overlayRef.current.id);
      overlayRef.current = null;
    }
  }, []);

  return {
    overlay,
    mesh: overlay?.mesh ?? null,
    cleanup,
    hasCircuitry: overlay !== null,
  };
}

export default CircuitrySystem;
