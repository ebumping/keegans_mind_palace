/**
 * AudioAnalyser - Frequency analysis and band extraction
 *
 * Ported from pale-strata AudioAnalyser with frequency band extraction
 * and transient detection for audio-reactive visuals.
 */

export interface AudioLevels {
  bass: number;           // 0-1 normalized (20-250Hz)
  mid: number;            // 0-1 normalized (250-4000Hz)
  high: number;           // 0-1 normalized (4000-20000Hz)
  overall: number;        // 0-1 normalized overall level
  transient: boolean;     // Impact detection flag
  transientIntensity: number; // 0-1 intensity of current transient
}

export interface AudioAnalyserConfig {
  fftSize?: number;           // FFT size (default: 2048)
  smoothing?: number;         // Smoothing time constant (default: 0.8)
  transientThreshold?: number; // Energy delta threshold for transients (default: 30)
  transientDecay?: number;    // Decay rate per frame (default: 0.05)
  autoGain?: boolean;         // Enable auto-gain normalization (default: true)
  autoGainAttack?: number;    // How fast gain rises to match louder audio (default: 0.05)
  autoGainRelease?: number;   // How fast gain falls when audio quiets (default: 0.005)
}

const DEFAULT_CONFIG: Required<AudioAnalyserConfig> = {
  fftSize: 2048,
  smoothing: 0.45,
  transientThreshold: 30,
  transientDecay: 0.05,
  autoGain: true,
  autoGainAttack: 0.05,
  autoGainRelease: 0.005,
};

export class AudioAnalyser {
  private audioContext: AudioContext;
  private analyserNode: AnalyserNode;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private config: Required<AudioAnalyserConfig>;

  // Transient detection state
  private previousEnergy: number = 0;
  private smoothedEnergy: number = 0;
  private transientDecayValue: number = 0;
  private lastTransientTimeMs: number = 0;
  private static readonly TRANSIENT_DEBOUNCE_MS = 50;

  // Auto-gain normalization state
  // Tracks the recent peak level and scales output so quiet audio still drives visuals
  private recentPeak: number = 0.5;  // Start at midpoint to avoid initial spike
  private readonly AUTO_GAIN_MIN_PEAK = 0.05; // Floor to avoid division by near-zero

  constructor(
    audioContext: AudioContext,
    source: AudioNode,
    config: AudioAnalyserConfig = {}
  ) {
    this.audioContext = audioContext;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create analyser node
    this.analyserNode = audioContext.createAnalyser();
    this.analyserNode.fftSize = this.config.fftSize;
    this.analyserNode.smoothingTimeConstant = this.config.smoothing;
    this.analyserNode.minDecibels = -70;
    this.analyserNode.maxDecibels = -20;

    // Connect source to analyser
    source.connect(this.analyserNode);

    // Log sample rate used for frequency band mapping
    const sampleRate = audioContext.sampleRate;
    const binHz = sampleRate / this.config.fftSize;
    console.log(
      `[AudioAnalyser] Sample rate: ${sampleRate}Hz, FFT: ${this.config.fftSize}, bin resolution: ${binHz.toFixed(1)}Hz/bin`
    );

    // Create data buffers
    // frequencyBinCount = fftSize / 2
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyserNode.fftSize);
  }

  /**
   * Get the analyser node (for chaining if needed)
   */
  getAnalyserNode(): AnalyserNode {
    return this.analyserNode;
  }

  /**
   * Get raw frequency data (0-255 values)
   */
  getFrequencyData(): Uint8Array {
    this.analyserNode.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  /**
   * Get raw time domain data (waveform, 0-255 values centered at 128)
   */
  getTimeDomainData(): Uint8Array {
    this.analyserNode.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);
    return this.timeDomainData;
  }

  /**
   * Get processed audio levels with frequency bands and transient detection
   */
  getLevels(): AudioLevels {
    // Get current frequency data
    this.analyserNode.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);

    // Extract frequency bands
    const bands = this.extractBands();

    // Calculate overall level
    const overall = this.calculateOverallLevel();

    // Detect transients
    const transient = this.detectTransient();

    return {
      bass: bands.bass,
      mid: bands.mid,
      high: bands.high,
      overall,
      transient: transient.isTransient,
      transientIntensity: transient.intensity,
    };
  }

  /**
   * Extract bass, mid, and high frequency bands
   *
   * Frequency to bin mapping (uses actual audioContext.sampleRate):
   * bin = frequency / (sampleRate / fftSize)
   * frequency = bin * (sampleRate / fftSize)
   *
   * Example at 44.1kHz with fftSize 2048:
   * - Each bin represents ~21.5Hz
   * - Nyquist frequency: 22050Hz
   * - Bin count: 1024
   */
  private extractBands(): { bass: number; mid: number; high: number } {
    const binCount = this.frequencyData.length;
    const nyquist = this.audioContext.sampleRate / 2;

    // Calculate bin indices for frequency boundaries
    // bass: 20-250Hz, mid: 250-4000Hz, high: 4000-20000Hz
    const bassStartBin = Math.floor((20 / nyquist) * binCount);
    const bassEndBin = Math.floor((250 / nyquist) * binCount);
    const midEndBin = Math.floor((4000 / nyquist) * binCount);
    const highEndBin = Math.floor((20000 / nyquist) * binCount);

    // Calculate average amplitude for each band
    const bass = this.averageRange(bassStartBin, bassEndBin);
    const mid = this.averageRange(bassEndBin, midEndBin);
    const high = this.averageRange(midEndBin, Math.min(highEndBin, binCount));

    let normBass = bass / 255;
    let normMid = mid / 255;
    let normHigh = high / 255;

    // Auto-gain normalization: scale output relative to recent peak
    if (this.config.autoGain) {
      const currentMax = Math.max(normBass, normMid, normHigh);

      // Track recent peak with asymmetric attack/release
      if (currentMax > this.recentPeak) {
        // Fast attack: quickly adapt to louder audio
        this.recentPeak += (currentMax - this.recentPeak) * this.config.autoGainAttack;
      } else {
        // Slow release: gradually lower gain floor when audio quiets
        this.recentPeak += (currentMax - this.recentPeak) * this.config.autoGainRelease;
      }

      // Clamp peak floor to avoid extreme amplification of silence
      const effectivePeak = Math.max(this.recentPeak, this.AUTO_GAIN_MIN_PEAK);
      const gain = 1.0 / effectivePeak;

      // Apply gain and clamp to 0-1
      normBass = Math.min(1, normBass * gain);
      normMid = Math.min(1, normMid * gain);
      normHigh = Math.min(1, normHigh * gain);
    }

    return {
      bass: normBass,
      mid: normMid,
      high: normHigh,
    };
  }

  /**
   * Calculate average amplitude over a range of frequency bins
   */
  private averageRange(startBin: number, endBin: number): number {
    if (startBin >= endBin || startBin < 0) return 0;

    let sum = 0;
    const count = endBin - startBin;

    for (let i = startBin; i < endBin && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculate overall audio level (RMS-like)
   */
  private calculateOverallLevel(): number {
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    return (sum / this.frequencyData.length) / 255;
  }

  /**
   * Calculate energy for transient detection
   */
  private calculateEnergy(): number {
    let energy = 0;
    // Weight bass frequencies more heavily for impact detection
    const bassWeight = 2.0;
    const midWeight = 1.0;
    const highWeight = 0.5;

    const binCount = this.frequencyData.length;
    const nyquist = this.audioContext.sampleRate / 2;
    const bassEndBin = Math.floor((250 / nyquist) * binCount);
    const midEndBin = Math.floor((4000 / nyquist) * binCount);

    for (let i = 0; i < this.frequencyData.length; i++) {
      const value = this.frequencyData[i];
      if (i < bassEndBin) {
        energy += value * bassWeight;
      } else if (i < midEndBin) {
        energy += value * midWeight;
      } else {
        energy += value * highWeight;
      }
    }

    return energy;
  }

  /**
   * Detect sudden changes in amplitude (transients)
   *
   * Energy is smoothed before the threshold comparison to prevent
   * sudden audio drops from triggering false positives. A debounce
   * interval prevents rapid re-firing within ~50ms.
   */
  private detectTransient(): { isTransient: boolean; intensity: number } {
    const rawEnergy = this.calculateEnergy();

    // Smooth energy BEFORE comparing to threshold —
    // raw energy spikes/drops cause spurious triggers without this
    this.smoothedEnergy = rawEnergy * 0.7 + this.smoothedEnergy * 0.3;

    const delta = this.smoothedEnergy - this.previousEnergy;

    // Decay transient state over time
    this.transientDecayValue = Math.max(0, this.transientDecayValue - this.config.transientDecay);

    // Check if energy delta exceeds threshold, with debounce
    const now = performance.now();
    const debounceElapsed = now - this.lastTransientTimeMs >= AudioAnalyser.TRANSIENT_DEBOUNCE_MS;

    if (delta > this.config.transientThreshold && debounceElapsed) {
      // Scale intensity based on how much the threshold was exceeded
      this.transientDecayValue = Math.min(1, delta / 100);
      this.lastTransientTimeMs = now;
    }

    // Update previous energy from the smoothed value
    this.previousEnergy = this.smoothedEnergy;

    return {
      isTransient: this.transientDecayValue > 0.1,
      intensity: this.transientDecayValue,
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AudioAnalyserConfig>): void {
    if (config.fftSize !== undefined) {
      this.analyserNode.fftSize = config.fftSize;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyserNode.fftSize);
      this.config.fftSize = config.fftSize;
    }

    if (config.smoothing !== undefined) {
      this.analyserNode.smoothingTimeConstant = config.smoothing;
      this.config.smoothing = config.smoothing;
    }

    if (config.transientThreshold !== undefined) {
      this.config.transientThreshold = config.transientThreshold;
    }

    if (config.transientDecay !== undefined) {
      this.config.transientDecay = config.transientDecay;
    }

    if (config.autoGain !== undefined) {
      this.config.autoGain = config.autoGain;
    }

    if (config.autoGainAttack !== undefined) {
      this.config.autoGainAttack = config.autoGainAttack;
    }

    if (config.autoGainRelease !== undefined) {
      this.config.autoGainRelease = config.autoGainRelease;
    }
  }

  /**
   * Dispose of the analyser
   */
  dispose(): void {
    this.analyserNode.disconnect();
  }
}

/**
 * DemoAudioGenerator - Generates procedural "fake" audio data when no input is available
 */
export class DemoAudioGenerator {
  private time: number = 0;
  private lastTransientTime: number = 0;

  getLevels(delta: number = 0.016): AudioLevels {
    this.time += delta;

    // Generate organic-looking patterns using sine waves
    const bass = (Math.sin(this.time * 0.5) + 1) / 2 * 0.6 + 0.2;
    const mid = (Math.sin(this.time * 1.2 + 0.5) + 1) / 2 * 0.5 + 0.1;
    const high = (Math.sin(this.time * 3.0 + 1.0) + 1) / 2 * 0.3;

    // Calculate overall from weighted average
    const overall = bass * 0.4 + mid * 0.35 + high * 0.25;

    // Random transients with cooldown
    let transient = false;
    let transientIntensity = 0;

    if (this.time - this.lastTransientTime > 0.5 && Math.random() < 0.02) {
      transient = true;
      transientIntensity = Math.random() * 0.5 + 0.3;
      this.lastTransientTime = this.time;
    }

    return {
      bass,
      mid,
      high,
      overall,
      transient,
      transientIntensity,
    };
  }

  /**
   * Reset the generator
   */
  reset(): void {
    this.time = 0;
    this.lastTransientTime = 0;
  }
}
