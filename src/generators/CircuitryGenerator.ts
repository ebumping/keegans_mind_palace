/**
 * Circuitry Pattern Generator
 *
 * Creates procedural circuit trace patterns using a Voronoi/grid hybrid algorithm.
 * These traces appear on walls and floors, glowing with audio-reactive light.
 *
 * Features:
 * - Grid-aligned junction nodes
 * - Manhattan-style traces (right-angle connections)
 * - Component placement (chips, capacitors, resistors)
 * - Spawn probability scaling with room depth and Growl intensity
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';

// ===== Types =====

export interface CircuitNode {
  position: THREE.Vector2;
  connections: number[];
  type: 'junction' | 'endpoint' | 'component';
}

export interface PathSegment {
  start: THREE.Vector2;
  end: THREE.Vector2;
  width: number;
  glowIntensity: number;
}

export interface ComponentLocation {
  position: THREE.Vector2;
  type: 'chip' | 'capacitor' | 'resistor' | 'node';
  size: number;
}

export interface CircuitTrace {
  nodes: CircuitNode[];
  pathSegments: PathSegment[];
  componentLocations: ComponentLocation[];
}

export interface CircuitrySpawnConfig {
  baseChance: number;
  depthMultiplier: number;
  growlBonus: number;
}

// ===== Spawn Probability =====

/**
 * Calculate the spawn probability for circuitry in a room.
 * Base chance is 20%, with bonuses from depth and Growl intensity.
 */
export function calculateCircuitryChance(
  depth: number,
  growlIntensity: number
): number {
  const baseChance = 0.20; // 20% base

  // Depth bonus: +1% per 5 rooms, capped at +15%
  const depthBonus = Math.min((depth / 5) * 0.01, 0.15);

  // Growl bonus: up to +10% at max intensity
  const growlBonus = growlIntensity * 0.10;

  // Total chance capped at 60%
  return Math.min(baseChance + depthBonus + growlBonus, 0.60);
}

/**
 * Determine if a room should have circuitry based on its seed and depth.
 */
export function shouldSpawnCircuitry(
  roomSeed: number,
  depth: number,
  growlIntensity: number
): boolean {
  const rng = new SeededRandom(roomSeed + 7331); // Offset for circuit check
  const chance = calculateCircuitryChance(depth, growlIntensity);
  return rng.next() < chance;
}

// ===== Generator Class =====

export class CircuitryGenerator {
  private gridSize: number;

  constructor(gridSize: number = 32, _noiseScale: number = 0.1) {
    this.gridSize = gridSize;
  }

  /**
   * Generate a circuit trace pattern for a given surface.
   */
  generate(
    width: number,
    height: number,
    seed: number,
    density: number = 0.5
  ): CircuitTrace {
    const rng = new SeededRandom(seed);
    const nodes: CircuitNode[] = [];
    const pathSegments: PathSegment[] = [];
    const componentLocations: ComponentLocation[] = [];

    // Step 1: Generate grid-aligned junction points
    const cellWidth = width / this.gridSize;
    const cellHeight = height / this.gridSize;

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        // Probability of node at this cell based on density and noise
        const noiseValue = this.sampleNoise(x, y, seed);
        if (rng.next() < density * noiseValue) {
          nodes.push({
            position: new THREE.Vector2(
              (x + 0.5) * cellWidth,
              (y + 0.5) * cellHeight
            ),
            connections: [],
            type: this.selectNodeType(rng),
          });
        }
      }
    }

    // Step 2: Connect nodes using Manhattan paths
    for (let i = 0; i < nodes.length; i++) {
      const neighbors = this.findNearestNeighbors(nodes, i, 3);

      for (const neighborIndex of neighbors) {
        // Avoid duplicate connections
        if (!nodes[i].connections.includes(neighborIndex)) {
          nodes[i].connections.push(neighborIndex);
          nodes[neighborIndex].connections.push(i);

          // Create Manhattan path (right-angle traces)
          const segments = this.createManhattanPath(
            nodes[i].position,
            nodes[neighborIndex].position,
            rng
          );
          pathSegments.push(...segments);
        }
      }
    }

    // Step 3: Place components at junctions
    for (const node of nodes) {
      if (node.type !== 'endpoint' && rng.next() < 0.3) {
        componentLocations.push({
          position: node.position.clone(),
          type: this.selectComponentType(rng),
          size: 0.02 + rng.next() * 0.03,
        });
      }
    }

    return { nodes, pathSegments, componentLocations };
  }

  /**
   * Create Manhattan-style path between two points (right-angle traces).
   */
  private createManhattanPath(
    start: THREE.Vector2,
    end: THREE.Vector2,
    rng: SeededRandom
  ): PathSegment[] {
    const segments: PathSegment[] = [];

    // Randomly choose horizontal-first or vertical-first
    const horizontalFirst = rng.next() > 0.5;

    if (horizontalFirst) {
      // Horizontal then vertical
      if (Math.abs(start.x - end.x) > 0.001) {
        segments.push({
          start: start.clone(),
          end: new THREE.Vector2(end.x, start.y),
          width: 0.003 + rng.next() * 0.002,
          glowIntensity: 0.5 + rng.next() * 0.5,
        });
      }
      if (Math.abs(start.y - end.y) > 0.001) {
        segments.push({
          start: new THREE.Vector2(end.x, start.y),
          end: end.clone(),
          width: 0.003 + rng.next() * 0.002,
          glowIntensity: 0.5 + rng.next() * 0.5,
        });
      }
    } else {
      // Vertical then horizontal
      if (Math.abs(start.y - end.y) > 0.001) {
        segments.push({
          start: start.clone(),
          end: new THREE.Vector2(start.x, end.y),
          width: 0.003 + rng.next() * 0.002,
          glowIntensity: 0.5 + rng.next() * 0.5,
        });
      }
      if (Math.abs(start.x - end.x) > 0.001) {
        segments.push({
          start: new THREE.Vector2(start.x, end.y),
          end: end.clone(),
          width: 0.003 + rng.next() * 0.002,
          glowIntensity: 0.5 + rng.next() * 0.5,
        });
      }
    }

    return segments;
  }

  /**
   * Select a random node type with weighted distribution.
   */
  private selectNodeType(rng: SeededRandom): 'junction' | 'endpoint' | 'component' {
    const r = rng.next();
    if (r < 0.6) return 'junction';
    if (r < 0.85) return 'component';
    return 'endpoint';
  }

  /**
   * Select a random component type.
   */
  private selectComponentType(rng: SeededRandom): 'chip' | 'capacitor' | 'resistor' | 'node' {
    const types: ('chip' | 'capacitor' | 'resistor' | 'node')[] = [
      'chip',
      'capacitor',
      'resistor',
      'node',
    ];
    return types[Math.floor(rng.next() * types.length)];
  }

  /**
   * Find the nearest neighbor nodes.
   */
  private findNearestNeighbors(
    nodes: CircuitNode[],
    index: number,
    count: number
  ): number[] {
    const distances: { index: number; distance: number }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      if (i === index) continue;
      const dist = nodes[index].position.distanceTo(nodes[i].position);
      distances.push({ index: i, distance: dist });
    }

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map((d) => d.index);
  }

  /**
   * Sample pseudo-noise based on position and seed.
   */
  private sampleNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }
}

// ===== Texture Generator =====

/**
 * Generates a texture from circuit trace data for use in shaders.
 */
export class CircuitTextureGenerator {
  private resolution: number;

  constructor(resolution: number = 1024) {
    this.resolution = resolution;
  }

  /**
   * Generate a texture from circuit trace data.
   * Red channel: traces
   * Green channel: components
   * Blue channel: junctions
   */
  generateTexture(trace: CircuitTrace): THREE.DataTexture {
    const { resolution } = this;
    const data = new Uint8Array(resolution * resolution * 4);

    // Initialize to transparent black
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;     // R (traces)
      data[i + 1] = 0; // G (components)
      data[i + 2] = 0; // B (junctions)
      data[i + 3] = 255; // A
    }

    // Draw traces (red channel)
    for (const segment of trace.pathSegments) {
      this.drawLine(
        data,
        segment.start.x,
        segment.start.y,
        segment.end.x,
        segment.end.y,
        segment.width * resolution,
        Math.floor(segment.glowIntensity * 255),
        0 // Red channel
      );
    }

    // Draw components (green channel)
    for (const component of trace.componentLocations) {
      this.drawComponent(data, component);
    }

    // Draw junctions (blue channel)
    for (const node of trace.nodes) {
      if (node.type === 'junction' && node.connections.length >= 2) {
        this.drawCircle(
          data,
          node.position.x,
          node.position.y,
          0.008,
          255,
          2 // Blue channel
        );
      }
    }

    const texture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    return texture;
  }

  /**
   * Draw a line on the texture data.
   */
  private drawLine(
    data: Uint8Array,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    intensity: number,
    channel: number
  ): void {
    const { resolution } = this;

    // Convert normalized coords to pixels
    const px0 = Math.floor(x0 * resolution);
    const py0 = Math.floor(y0 * resolution);
    const px1 = Math.floor(x1 * resolution);
    const py1 = Math.floor(y1 * resolution);

    // Bresenham's line algorithm with thickness
    const dx = Math.abs(px1 - px0);
    const dy = Math.abs(py1 - py0);
    const sx = px0 < px1 ? 1 : -1;
    const sy = py0 < py1 ? 1 : -1;
    let err = dx - dy;

    let x = px0;
    let y = py0;
    const halfWidth = Math.max(1, Math.floor(width / 2));

    while (true) {
      // Draw a filled circle at each point for thickness
      for (let oy = -halfWidth; oy <= halfWidth; oy++) {
        for (let ox = -halfWidth; ox <= halfWidth; ox++) {
          if (ox * ox + oy * oy <= halfWidth * halfWidth) {
            const px = x + ox;
            const py = y + oy;
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = (py * resolution + px) * 4 + channel;
              data[idx] = Math.max(data[idx], intensity);
            }
          }
        }
      }

      if (x === px1 && y === py1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Draw a component on the texture.
   */
  private drawComponent(data: Uint8Array, component: ComponentLocation): void {
    const { resolution } = this;
    const x = Math.floor(component.position.x * resolution);
    const y = Math.floor(component.position.y * resolution);
    const size = Math.floor(component.size * resolution);

    switch (component.type) {
      case 'chip':
        // Rectangle
        for (let oy = -size / 2; oy <= size / 2; oy++) {
          for (let ox = -size; ox <= size; ox++) {
            const px = x + Math.floor(ox);
            const py = y + Math.floor(oy);
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = (py * resolution + px) * 4 + 1; // Green channel
              data[idx] = 255;
            }
          }
        }
        break;

      case 'capacitor':
        // Two parallel lines
        for (let oy = -size / 2; oy <= size / 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const px = x + Math.floor(ox);
            const py = y + Math.floor(oy);
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = (py * resolution + px) * 4 + 1;
              data[idx] = 255;
            }
          }
        }
        break;

      case 'resistor':
        // Horizontal bar
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -size; ox <= size; ox++) {
            const px = x + Math.floor(ox);
            const py = y + Math.floor(oy);
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = (py * resolution + px) * 4 + 1;
              data[idx] = 255;
            }
          }
        }
        break;

      case 'node':
        // Circle
        this.drawCircle(data, component.position.x, component.position.y, component.size / 2, 255, 1);
        break;
    }
  }

  /**
   * Draw a filled circle on the texture.
   */
  private drawCircle(
    data: Uint8Array,
    normX: number,
    normY: number,
    normRadius: number,
    intensity: number,
    channel: number
  ): void {
    const { resolution } = this;
    const cx = Math.floor(normX * resolution);
    const cy = Math.floor(normY * resolution);
    const radius = Math.max(2, Math.floor(normRadius * resolution));

    for (let oy = -radius; oy <= radius; oy++) {
      for (let ox = -radius; ox <= radius; ox++) {
        if (ox * ox + oy * oy <= radius * radius) {
          const px = cx + ox;
          const py = cy + oy;
          if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
            const idx = (py * resolution + px) * 4 + channel;
            data[idx] = Math.max(data[idx], intensity);
          }
        }
      }
    }
  }
}

export default CircuitryGenerator;
