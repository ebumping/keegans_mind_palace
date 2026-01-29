/**
 * AmbientSoundHints
 *
 * Synthesizes archetype-specific ambient audio using Web Audio API.
 * Each room archetype gets subtle background sound that reinforces its identity:
 *
 * - Office/Corridor/Waiting Room: fluorescent hum (120Hz + harmonics)
 * - Parking/Stairwell: dripping water (randomized impulses through resonant filter)
 * - Kitchen: low electrical hum + occasional resonance
 * - Bathroom: water resonance through tiled space
 * - Bedroom/Living Room: near-silence with subtle low-frequency warmth
 * - Store: distant muzak-like filtered noise
 * - Restaurant: warm low murmur
 * - Atrium: vast reverberant emptiness (filtered noise with long decay)
 * - Elevator Bank: mechanical hum
 *
 * All sounds are extremely quiet — subliminal environmental cues.
 */

import type { RoomArchetype } from '../types/room';

interface AmbientSoundConfig {
  type: 'hum' | 'drip' | 'murmur' | 'void' | 'mechanical' | 'silence';
  frequency?: number;          // Base frequency for oscillator-based sounds
  harmonics?: number[];        // Frequency multipliers for harmonic content
  volume: number;              // 0-1, kept very low (0.01-0.08)
  filterFreq?: number;         // Low-pass filter cutoff
  filterQ?: number;            // Filter resonance
  noiseAmount?: number;        // Amount of noise component (0-1)
  dripInterval?: [number, number]; // Min/max seconds between drips
}

const ARCHETYPE_SOUNDS: Partial<Record<RoomArchetype, AmbientSoundConfig>> = {
  // Institutional fluorescent hum — 120Hz (mains frequency harmonic)
  office: {
    type: 'hum',
    frequency: 120,
    harmonics: [1, 2, 3],
    volume: 0.04,
    filterFreq: 400,
    filterQ: 2,
  },
  corridor_of_doors: {
    type: 'hum',
    frequency: 120,
    harmonics: [1, 2],
    volume: 0.03,
    filterFreq: 350,
    filterQ: 1.5,
  },
  waiting_room: {
    type: 'hum',
    frequency: 120,
    harmonics: [1, 2, 4],
    volume: 0.035,
    filterFreq: 450,
    filterQ: 2.5,
  },
  // Water/dripping environments
  parking: {
    type: 'drip',
    volume: 0.05,
    filterFreq: 2000,
    filterQ: 8,
    dripInterval: [2, 6],
  },
  stairwell: {
    type: 'drip',
    volume: 0.03,
    filterFreq: 1500,
    filterQ: 6,
    dripInterval: [3, 8],
  },
  bathroom: {
    type: 'drip',
    volume: 0.04,
    filterFreq: 2500,
    filterQ: 10,
    dripInterval: [1.5, 4],
  },
  // Kitchen — low electrical hum
  kitchen: {
    type: 'hum',
    frequency: 60,
    harmonics: [1, 3],
    volume: 0.025,
    filterFreq: 200,
    filterQ: 1,
  },
  // Warm domestic quiet
  living_room: {
    type: 'silence',
    volume: 0.01,
    noiseAmount: 0.3,
    filterFreq: 100,
  },
  bedroom: {
    type: 'silence',
    volume: 0.008,
    noiseAmount: 0.2,
    filterFreq: 80,
  },
  // Commercial
  store: {
    type: 'murmur',
    volume: 0.03,
    noiseAmount: 0.5,
    filterFreq: 300,
    filterQ: 0.5,
  },
  restaurant: {
    type: 'murmur',
    volume: 0.035,
    noiseAmount: 0.6,
    filterFreq: 400,
    filterQ: 0.7,
  },
  // Vast void spaces
  atrium: {
    type: 'void',
    volume: 0.025,
    noiseAmount: 0.4,
    filterFreq: 150,
    filterQ: 3,
  },
  // Mechanical
  elevator_bank: {
    type: 'mechanical',
    frequency: 50,
    harmonics: [1, 2, 5],
    volume: 0.03,
    filterFreq: 250,
    filterQ: 2,
  },
};

/**
 * Manages ambient sound generation for a room archetype.
 * Creates Web Audio nodes for synthesized environmental audio.
 */
export class AmbientSoundHints {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private filters: BiquadFilterNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private dripTimer: ReturnType<typeof setTimeout> | null = null;
  private isStarted = false;
  private currentArchetype: RoomArchetype | null = null;
  private disposed = false;

  /**
   * Start ambient sound for the given archetype.
   * If already playing a different archetype, crossfades to the new one.
   */
  start(archetype: RoomArchetype, audioContext?: AudioContext): void {
    if (this.disposed) return;

    // If same archetype is already playing, do nothing
    if (this.currentArchetype === archetype && this.isStarted) return;

    // Clean up previous sound
    this.stop();

    const config = ARCHETYPE_SOUNDS[archetype];
    if (!config) return;

    // Use provided context or create new one
    if (audioContext) {
      this.audioContext = audioContext;
    } else if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch {
        return; // Audio not available
      }
    }

    const ctx = this.audioContext;
    this.currentArchetype = archetype;

    // Master gain — starts at 0, fades in
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    switch (config.type) {
      case 'hum':
        this.createHum(ctx, config);
        break;
      case 'drip':
        this.createDripLoop(ctx, config);
        break;
      case 'murmur':
      case 'void':
      case 'silence':
        this.createFilteredNoise(ctx, config);
        break;
      case 'mechanical':
        this.createHum(ctx, config); // Same synthesis, different params
        break;
    }

    // Fade in over 2 seconds
    this.masterGain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 2);
    this.isStarted = true;
  }

  /**
   * Stop all ambient sound with fadeout.
   */
  stop(): void {
    if (!this.isStarted || !this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Fade out over 1.5 seconds
    this.masterGain.gain.linearRampToValueAtTime(0, now + 1.5);

    // Schedule cleanup after fadeout
    setTimeout(() => this.cleanup(), 1600);

    this.isStarted = false;
    this.currentArchetype = null;
  }

  /**
   * Clean up all audio nodes.
   */
  private cleanup(): void {
    if (this.dripTimer) {
      clearTimeout(this.dripTimer);
      this.dripTimer = null;
    }

    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
      osc.disconnect();
    });
    this.oscillators = [];

    this.gains.forEach(g => g.disconnect());
    this.gains = [];

    this.filters.forEach(f => f.disconnect());
    this.filters = [];

    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch { /* already stopped */ }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
  }

  /**
   * Create oscillator-based hum (fluorescent lights, electrical, mechanical).
   */
  private createHum(ctx: AudioContext, config: AmbientSoundConfig): void {
    if (!this.masterGain || !config.frequency) return;

    const harmonics = config.harmonics ?? [1];

    for (const harmonic of harmonics) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = config.frequency * harmonic;

      // Each harmonic gets quieter
      const gain = ctx.createGain();
      gain.gain.value = 1.0 / (harmonic * harmonic);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = config.filterFreq ?? 500;
      filter.Q.value = config.filterQ ?? 1;

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.masterGain);

      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
      this.filters.push(filter);
    }
  }

  /**
   * Create dripping water effect using impulse → resonant filter.
   */
  private createDripLoop(ctx: AudioContext, config: AmbientSoundConfig): void {
    if (!this.masterGain) return;

    const scheduleDrip = () => {
      if (!this.masterGain || !this.isStarted) return;

      // Create a single drip: short noise burst through resonant bandpass
      const bufferSize = ctx.sampleRate * 0.02; // 20ms impulse
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Short noise burst with exponential decay
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Resonant bandpass filter for "plop" sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = (config.filterFreq ?? 2000) * (0.7 + Math.random() * 0.6);
      filter.Q.value = config.filterQ ?? 8;

      const gain = ctx.createGain();
      gain.gain.value = 0.5 + Math.random() * 0.5;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      source.start();
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };

      // Schedule next drip
      const interval = config.dripInterval ?? [2, 5];
      const nextTime = interval[0] + Math.random() * (interval[1] - interval[0]);
      this.dripTimer = setTimeout(scheduleDrip, nextTime * 1000);
    };

    // Start first drip after a short delay
    const interval = config.dripInterval ?? [2, 5];
    this.dripTimer = setTimeout(scheduleDrip, interval[0] * 500);
  }

  /**
   * Create filtered noise (murmur, void ambience, near-silence warmth).
   */
  private createFilteredNoise(ctx: AudioContext, config: AmbientSoundConfig): void {
    if (!this.masterGain) return;

    // Generate noise buffer (2 seconds, looping)
    const bufferLength = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const noiseLevel = config.noiseAmount ?? 0.5;
    for (let i = 0; i < bufferLength; i++) {
      // Brown noise approximation (integrated white noise) for warmth
      data[i] = i > 0
        ? data[i - 1] + (Math.random() * 2 - 1) * 0.1 * noiseLevel
        : 0;
      // Clamp
      data[i] = Math.max(-1, Math.min(1, data[i]));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = config.filterFreq ?? 200;
    filter.Q.value = config.filterQ ?? 1;

    source.connect(filter);
    filter.connect(this.masterGain);

    source.start();
    this.noiseSource = source;
    this.filters.push(filter);
  }

  /**
   * Dispose all resources. Cannot be restarted after dispose.
   */
  dispose(): void {
    this.disposed = true;
    this.stop();
    this.cleanup();
    // Don't close audioContext — it may be shared
  }
}

// Singleton instance
let ambientSoundInstance: AmbientSoundHints | null = null;

export function getAmbientSoundHints(): AmbientSoundHints {
  if (!ambientSoundInstance) {
    ambientSoundInstance = new AmbientSoundHints();
  }
  return ambientSoundInstance;
}
