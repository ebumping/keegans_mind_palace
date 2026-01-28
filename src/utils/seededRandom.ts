/**
 * Seeded Random Number Generator
 *
 * Uses Mulberry32 PRNG for deterministic random number generation.
 * This ensures rooms are generated consistently from the same seed.
 */

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Mulberry32 PRNG - fast, good distribution
   * Returns a value between 0 and 1
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate a random float in the given range
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generate a random integer in the given range (inclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * Pick a random element based on weights
   */
  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Shuffle an array in place
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get a boolean with the given probability
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * Get a deterministic room seed based on room index
 * Prime multiplier ensures unique seeds with minimal collision
 */
export function getRoomSeed(roomIndex: number, baseSeed: number = 42): number {
  return baseSeed + roomIndex * 7919;
}

/**
 * Calculate abnormality factor based on room depth
 * Starts at 0, approaches 1 asymptotically
 */
export function getAbnormalityFactor(roomIndex: number): number {
  return 1 - Math.exp(-roomIndex / 20);
}
