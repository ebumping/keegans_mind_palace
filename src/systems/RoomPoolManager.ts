/**
 * Room Pool Manager
 *
 * Manages a pool of rooms in memory (current room + adjacent rooms)
 * to enable instant transitions and prevent unbounded memory growth.
 *
 * Pool strategy: keep current room index +/- POOL_RADIUS rooms alive.
 * When the player moves, rooms outside the window are disposed and
 * new adjacent rooms are pre-generated.
 *
 * Handles Three.js geometry/material disposal to reclaim GPU memory.
 */

import * as THREE from 'three';
import type { RoomConfig, GeneratedRoom } from '../types/room';
import { RoomGenerator } from '../generators/RoomGenerator';
import { getTransitionSystem } from './TransitionSystem';
import { getWrongnessSystem } from './WrongnessSystem';
import { getPortalVariationSystem } from './PortalVariationSystem';

// How many rooms to keep on each side of the current room
const POOL_RADIUS = 2;
// Maximum pool size (current + 2 ahead + 2 behind)
const MAX_POOL_SIZE = POOL_RADIUS * 2 + 1;
// GPU memory budget in bytes (~20MB)
const GPU_MEMORY_BUDGET = 20 * 1024 * 1024;

export interface PooledRoom {
  index: number;
  config: RoomConfig;
  generated: GeneratedRoom | null; // null = config only, not yet built
  lastAccessed: number;
  gpuMemoryEstimate: number; // Estimated GPU memory in bytes
}

export interface PoolStats {
  poolSize: number;
  maxPoolSize: number;
  currentIndex: number;
  pooledIndices: number[];
  estimatedGpuMemory: number;
  gpuBudget: number;
  disposedCount: number;
}

export class RoomPoolManager {
  private pool: Map<number, PooledRoom> = new Map();
  private currentIndex: number = 0;
  private generator: RoomGenerator;
  private disposedCount: number = 0;

  constructor(baseSeed: number = 42) {
    this.generator = new RoomGenerator({ baseSeed });
  }

  /**
   * Set the current room index and update the pool.
   * Disposes rooms that fall outside the window and
   * pre-generates configs for rooms that enter the window.
   */
  setCurrentRoom(index: number): void {
    const previousIndex = this.currentIndex;
    this.currentIndex = index;

    // Evict rooms outside the new window
    this.evictOutOfRange();

    // Pre-generate configs for rooms in the new window
    this.preGenerateAdjacentConfigs();

    if (previousIndex !== index) {
      console.log(
        `[RoomPool] Moved to room ${index}. Pool: [${this.getPooledIndices().join(', ')}]`
      );
    }
  }

  /**
   * Get or create a room config for the given index.
   * Uses TransitionSystem's visited room cache first,
   * then falls back to fresh generation.
   */
  getRoomConfig(index: number): RoomConfig {
    // Check pool first
    const pooled = this.pool.get(index);
    if (pooled) {
      pooled.lastAccessed = Date.now();
      return pooled.config;
    }

    // Generate and add to pool
    const config = this.generateConfig(index);
    this.addToPool(index, config);
    return config;
  }

  /**
   * Get a pre-generated GeneratedRoom (with Three.js meshes) if available.
   */
  getGeneratedRoom(index: number): GeneratedRoom | null {
    const pooled = this.pool.get(index);
    return pooled?.generated ?? null;
  }

  /**
   * Store a GeneratedRoom in the pool (called after Room component builds meshes).
   */
  setGeneratedRoom(index: number, room: GeneratedRoom): void {
    const pooled = this.pool.get(index);
    if (pooled) {
      // Dispose previous generated room if it exists
      if (pooled.generated && pooled.generated !== room) {
        this.disposeGeneratedRoom(pooled);
      }
      pooled.generated = room;
      pooled.gpuMemoryEstimate = this.estimateRoomGpuMemory(room);
      pooled.lastAccessed = Date.now();
    } else {
      // Room not in pool yet - add it
      this.addToPool(index, room.config, room);
    }
  }

  /**
   * Get current pool statistics for monitoring.
   */
  getStats(): PoolStats {
    let totalGpuMemory = 0;
    for (const pooled of this.pool.values()) {
      totalGpuMemory += pooled.gpuMemoryEstimate;
    }

    return {
      poolSize: this.pool.size,
      maxPoolSize: MAX_POOL_SIZE,
      currentIndex: this.currentIndex,
      pooledIndices: this.getPooledIndices(),
      estimatedGpuMemory: totalGpuMemory,
      gpuBudget: GPU_MEMORY_BUDGET,
      disposedCount: this.disposedCount,
    };
  }

  /**
   * Check if estimated GPU memory exceeds budget.
   */
  isOverBudget(): boolean {
    const stats = this.getStats();
    return stats.estimatedGpuMemory > GPU_MEMORY_BUDGET;
  }

  /**
   * Force disposal of all rooms except the current one.
   * Use in emergency memory situations.
   */
  emergencyFlush(): void {
    console.warn('[RoomPool] Emergency flush - disposing all non-current rooms');
    for (const [index, pooled] of this.pool.entries()) {
      if (index !== this.currentIndex) {
        this.disposeGeneratedRoom(pooled);
        this.pool.delete(index);
      }
    }
  }

  /**
   * Dispose all rooms and clear the pool entirely.
   */
  dispose(): void {
    for (const pooled of this.pool.values()) {
      this.disposeGeneratedRoom(pooled);
    }
    this.pool.clear();
    this.disposedCount = 0;
  }

  // ============================================
  // Private Methods
  // ============================================

  private generateConfig(index: number): RoomConfig {
    // Check TransitionSystem for visited rooms first
    const transitionSystem = getTransitionSystem();
    const visited = transitionSystem.getVisitedRoom(index);

    if (visited) {
      return visited.config;
    }

    // Generate fresh config
    let config = this.generator.generateConfig(index, null);

    // Apply portal variation system
    const variationSystem = getPortalVariationSystem();
    variationSystem.initialize();
    const variationState = variationSystem.processPortalTransition(
      0, index, index
    );
    if (variationState.variation) {
      config = variationSystem.applyVariation(config, variationState.variation);
      (config as RoomConfig & { variationLevel?: number }).variationLevel =
        variationState.variationLevel;
      (config as RoomConfig & { variationChanges?: unknown[] }).variationChanges =
        variationState.variation.changes;
    }

    // Store as visited for consistency
    const entryDoorway = config.doorways[0] ?? {
      wall: 'north' as const,
      position: 0.5,
      width: 3,
      height: 4,
      leadsTo: 0,
    };
    transitionSystem.markRoomVisited(index, entryDoorway, config);

    return config;
  }

  private addToPool(index: number, config: RoomConfig, generated?: GeneratedRoom): void {
    const pooled: PooledRoom = {
      index,
      config,
      generated: generated ?? null,
      lastAccessed: Date.now(),
      gpuMemoryEstimate: generated ? this.estimateRoomGpuMemory(generated) : 0,
    };
    this.pool.set(index, pooled);

    // If over budget after adding, evict least recently used non-adjacent room
    if (this.isOverBudget()) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Remove rooms outside the current window [currentIndex - POOL_RADIUS, currentIndex + POOL_RADIUS].
   */
  private evictOutOfRange(): void {
    const minIndex = Math.max(0, this.currentIndex - POOL_RADIUS);
    const maxIndex = this.currentIndex + POOL_RADIUS;

    for (const [index, pooled] of this.pool.entries()) {
      if (index < minIndex || index > maxIndex) {
        this.disposeGeneratedRoom(pooled);
        this.pool.delete(index);
      }
    }
  }

  /**
   * Pre-generate configs for adjacent rooms in the pool window.
   * Only generates configs (lightweight), not full meshes.
   */
  private preGenerateAdjacentConfigs(): void {
    const minIndex = Math.max(0, this.currentIndex - POOL_RADIUS);
    const maxIndex = this.currentIndex + POOL_RADIUS;

    for (let i = minIndex; i <= maxIndex; i++) {
      if (!this.pool.has(i)) {
        const config = this.generateConfig(i);
        this.addToPool(i, config);
      }
    }
  }

  /**
   * Evict the least recently used room that's not the current room.
   * Prefers evicting rooms with generated meshes (higher memory) first.
   */
  private evictLeastRecentlyUsed(): void {
    let lruIndex = -1;
    let lruTime = Infinity;

    for (const [index, pooled] of this.pool.entries()) {
      if (index === this.currentIndex) continue;
      if (pooled.generated && pooled.lastAccessed < lruTime) {
        lruTime = pooled.lastAccessed;
        lruIndex = index;
      }
    }

    if (lruIndex >= 0) {
      const pooled = this.pool.get(lruIndex)!;
      this.disposeGeneratedRoom(pooled);
      // Keep config but drop the generated room
      pooled.generated = null;
      pooled.gpuMemoryEstimate = 0;
    }
  }

  /**
   * Dispose Three.js resources from a pooled room.
   * Properly disposes geometries, materials, and textures to free GPU memory.
   */
  private disposeGeneratedRoom(pooled: PooledRoom): void {
    if (!pooled.generated) return;

    const room = pooled.generated;

    // Dispose all geometries
    for (const geometry of room.geometries) {
      geometry.dispose();
    }

    // Dispose all materials (and their textures/uniforms)
    for (const material of room.materials) {
      this.disposeMaterial(material);
    }

    // Traverse the mesh group and dispose any remaining resources
    room.mesh.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => this.disposeMaterial(m));
          } else {
            this.disposeMaterial(object.material);
          }
        }
      }
    });

    // Remove from parent if attached
    if (room.mesh.parent) {
      room.mesh.parent.remove(room.mesh);
    }

    // Call the room's own dispose
    room.dispose();

    pooled.generated = null;
    pooled.gpuMemoryEstimate = 0;
    this.disposedCount++;
  }

  /**
   * Dispose a Three.js material and all its textures.
   */
  private disposeMaterial(material: THREE.Material): void {
    // Dispose textures from standard material properties
    const mat = material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    if (mat.emissiveMap) mat.emissiveMap.dispose();
    if (mat.aoMap) mat.aoMap.dispose();

    // Dispose shader material uniforms that hold textures
    if (material instanceof THREE.ShaderMaterial) {
      for (const key of Object.keys(material.uniforms)) {
        const value = material.uniforms[key].value;
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
    }

    material.dispose();
  }

  /**
   * Estimate GPU memory usage for a generated room.
   * Counts geometry buffer sizes and texture memory.
   */
  private estimateRoomGpuMemory(room: GeneratedRoom): number {
    let bytes = 0;

    // Geometry buffers
    for (const geometry of room.geometries) {
      for (const key of Object.keys(geometry.attributes)) {
        const attr = geometry.attributes[key];
        if (attr && attr.array) {
          bytes += attr.array.byteLength;
        }
      }
      if (geometry.index) {
        bytes += geometry.index.array.byteLength;
      }
    }

    // Material textures (rough estimate: width * height * 4 bytes per texture)
    for (const material of room.materials) {
      const mat = material as THREE.MeshStandardMaterial;
      bytes += this.estimateTextureMemory(mat.map);
      bytes += this.estimateTextureMemory(mat.normalMap);
      bytes += this.estimateTextureMemory(mat.roughnessMap);
      bytes += this.estimateTextureMemory(mat.emissiveMap);
    }

    // Also traverse mesh tree for any geometry not tracked in the arrays
    room.mesh.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        for (const key of Object.keys(object.geometry.attributes)) {
          const attr = object.geometry.attributes[key];
          if (attr && attr.array) {
            bytes += attr.array.byteLength;
          }
        }
      }
    });

    return bytes;
  }

  private estimateTextureMemory(texture: THREE.Texture | null | undefined): number {
    if (!texture || !texture.image) return 0;
    const img = texture.image as HTMLImageElement | { width: number; height: number };
    const w = img.width || 0;
    const h = img.height || 0;
    return w * h * 4; // RGBA
  }

  private getPooledIndices(): number[] {
    return Array.from(this.pool.keys()).sort((a, b) => a - b);
  }
}

// ============================================
// Singleton Instance
// ============================================

let poolManagerInstance: RoomPoolManager | null = null;

export function getRoomPoolManager(baseSeed?: number): RoomPoolManager {
  if (!poolManagerInstance) {
    poolManagerInstance = new RoomPoolManager(baseSeed);
  }
  return poolManagerInstance;
}

export function disposeRoomPoolManager(): void {
  if (poolManagerInstance) {
    poolManagerInstance.dispose();
    poolManagerInstance = null;
  }
}
