/**
 * Pattern Generator
 *
 * Generates procedural visual patterns for room surfaces,
 * derived from pale-strata's audio processing patterns.
 */

import { SeededRandom, getAbnormalityFactor } from '../utils/seededRandom';
import {
  generateSlicerPattern,
  generateLFOPattern,
  generateGrainPattern,
  generateADSRPattern,
  evaluateSlicerPattern,
  evaluateLFOPattern,
  evaluateGrainPattern,
  evaluateADSRPattern,
  stripePattern,
  gridPattern,
  damaskPattern,
  artDecoPattern,
  herringbonePattern,
  carpetPattern,
  carpetBorderPattern,
  blend,
  audioDistortUV,
  audioModulate,
  directionToInt,
  waveformToInt,
  grainShapeToInt,
  blendModeToInt,
} from '../utils/patterns';
import {
  WaveformType,
  BlendMode,
  PatternLayerType,
  AudioBand,
  PatternParameter,
} from '../types/pattern';
import type {
  SlicerPattern,
  SlicerSteps,
  LFOPattern,
  GrainPattern,
  ADSRPattern,
  PatternLayer,
  CompositePattern,
  PatternAudioBinding,
  WallPatternConfig,
  FloorPatternConfig,
  CeilingPatternConfig,
  RoomPatterns,
  PatternUniforms,
} from '../types/pattern';
import type { AudioLevels } from '../types/room';
import { Wall } from '../types/room';

// ============================================
// Pattern Generator Options
// ============================================

export interface PatternGeneratorOptions {
  baseSeed?: number;
  maxLayers?: number;
  defaultComplexity?: number;
}

const DEFAULT_OPTIONS: Required<PatternGeneratorOptions> = {
  baseSeed: 42,
  maxLayers: 4,
  defaultComplexity: 0.5,
};

// ============================================
// Pattern Generator Class
// ============================================

export class PatternGenerator {
  private options: Required<PatternGeneratorOptions>;

  constructor(options: PatternGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ============================================
  // Main Room Pattern Generation
  // ============================================

  /**
   * Generate all patterns for a room
   */
  generateForRoom(roomSeed: number, roomIndex: number): RoomPatterns {
    const abnormality = getAbnormalityFactor(roomIndex);

    return {
      walls: this.generateWallPatterns(roomSeed, roomIndex, abnormality),
      floor: this.generateFloorPattern(roomSeed + 1, abnormality),
      ceiling: this.generateCeilingPattern(roomSeed + 2, abnormality),
      doorframes: this.generateDoorframePattern(roomSeed + 3, abnormality),
    };
  }

  /**
   * Generate patterns for each wall
   */
  private generateWallPatterns(
    seed: number,
    roomIndex: number,
    abnormality: number
  ): WallPatternConfig[] {
    const walls = [Wall.NORTH, Wall.SOUTH, Wall.EAST, Wall.WEST];

    return walls.map((_, i) =>
      this.generateWallPattern(seed + i * 100, roomIndex, abnormality)
    );
  }

  /**
   * Generate a single wall pattern configuration
   */
  private generateWallPattern(
    seed: number,
    _roomIndex: number,
    abnormality: number
  ): WallPatternConfig {
    const rng = new SeededRandom(seed);

    // Complexity increases with depth
    const complexity = 0.3 + abnormality * 0.5;

    return {
      basePattern: this.generateCompositePattern(seed, complexity),
      verticalBias: 0.7,
      wainscoting: rng.next() < 0.3,
      wainscotingHeight: rng.range(0.3, 0.4),
      audioBindings: this.generateAudioBindings(rng, 2),
    };
  }

  /**
   * Generate floor pattern configuration
   */
  private generateFloorPattern(seed: number, abnormality: number): FloorPatternConfig {
    const rng = new SeededRandom(seed);

    return {
      basePattern: this.generateCompositePattern(seed, 0.4 + abnormality * 0.3),
      tileGrid: rng.next() < 0.6,
      tileSize: rng.range(0.5, 2.0),
      groutWidth: rng.range(0.01, 0.03),
      audioBindings: this.generateAudioBindings(rng, 2),
    };
  }

  /**
   * Generate ceiling pattern configuration
   */
  private generateCeilingPattern(seed: number, abnormality: number): CeilingPatternConfig {
    const rng = new SeededRandom(seed);

    return {
      basePattern: this.generateCompositePattern(seed, 0.2 + abnormality * 0.4),
      radialFromCenter: rng.next() < 0.4,
      coffers: rng.next() < 0.2,
      audioBindings: this.generateAudioBindings(rng, 1),
    };
  }

  /**
   * Generate doorframe pattern
   */
  private generateDoorframePattern(seed: number, abnormality: number): CompositePattern {
    return this.generateCompositePattern(seed, 0.3 + abnormality * 0.3);
  }

  // ============================================
  // Composite Pattern Generation
  // ============================================

  /**
   * Generate a composite pattern with multiple layers
   */
  generateCompositePattern(seed: number, complexity: number): CompositePattern {
    const rng = new SeededRandom(seed);

    // Determine number of layers based on complexity
    const layerCount = Math.min(
      Math.floor(complexity * 3) + 1,
      this.options.maxLayers
    );

    const layers: PatternLayer[] = [];
    const types = Object.values(PatternLayerType);

    for (let i = 0; i < layerCount; i++) {
      const type = rng.pick(types) as PatternLayerType;
      layers.push({
        type,
        pattern: this.generatePatternByType(type, seed + i * 1000),
        opacity: rng.range(0.3, 1.0),
        scale: rng.range(0.5, 2.0),
        rotation: rng.range(0, Math.PI * 2),
      });
    }

    const blendModes = Object.values(BlendMode);

    return {
      layers,
      blendMode: rng.pick(blendModes) as BlendMode,
    };
  }

  /**
   * Generate a specific pattern type
   */
  private generatePatternByType(
    type: PatternLayerType,
    seed: number
  ): SlicerPattern | LFOPattern | GrainPattern | ADSRPattern {
    switch (type) {
      case PatternLayerType.SLICER:
        return this.generateSlicerPatternWithSteps(seed);
      case PatternLayerType.LFO:
        return generateLFOPattern(seed);
      case PatternLayerType.GRAIN:
        return generateGrainPattern(seed);
      case PatternLayerType.ADSR:
        return generateADSRPattern(seed);
      default:
        return generateLFOPattern(seed);
    }
  }

  // ============================================
  // Slicer Pattern Generation (8/16/32 steps)
  // ============================================

  /**
   * Generate slicer pattern with random step count
   */
  private generateSlicerPatternWithSteps(seed: number): SlicerPattern {
    const rng = new SeededRandom(seed);
    const steps: SlicerSteps = rng.pick([8, 16, 32]);
    return generateSlicerPattern(seed, steps);
  }

  /**
   * Generate 8-step slicer pattern
   */
  generate8StepSlicer(seed: number): SlicerPattern {
    return generateSlicerPattern(seed, 8);
  }

  /**
   * Generate 16-step slicer pattern
   */
  generate16StepSlicer(seed: number): SlicerPattern {
    return generateSlicerPattern(seed, 16);
  }

  /**
   * Generate 32-step slicer pattern
   */
  generate32StepSlicer(seed: number): SlicerPattern {
    return generateSlicerPattern(seed, 32);
  }

  // ============================================
  // LFO Pattern Morphing
  // ============================================

  /**
   * Create LFO pattern with specific waveform
   */
  generateLFOWithWaveform(seed: number, waveform: WaveformType): LFOPattern {
    const base = generateLFOPattern(seed);
    return { ...base, waveform };
  }

  /**
   * Morph between two LFO patterns
   */
  morphLFOPatterns(a: LFOPattern, b: LFOPattern, t: number): LFOPattern {
    return {
      waveform: t < 0.5 ? a.waveform : b.waveform,
      frequency: a.frequency + (b.frequency - a.frequency) * t,
      amplitude: a.amplitude + (b.amplitude - a.amplitude) * t,
      phase: a.phase + (b.phase - a.phase) * t,
      modulation: a.modulation + (b.modulation - a.modulation) * t,
    };
  }

  // ============================================
  // Stripe and Grid Pattern Generation
  // ============================================

  /**
   * Generate procedural stripe pattern config
   */
  generateStripeConfig(
    seed: number
  ): {
    frequency: number;
    angle: number;
    thickness: number;
  } {
    const rng = new SeededRandom(seed);
    return {
      frequency: rng.range(2, 20),
      angle: rng.range(0, Math.PI),
      thickness: rng.range(0.3, 0.7),
    };
  }

  /**
   * Generate procedural grid pattern config
   */
  generateGridConfig(
    seed: number
  ): {
    frequencyX: number;
    frequencyY: number;
    lineWidth: number;
  } {
    const rng = new SeededRandom(seed);
    const baseFreq = rng.range(4, 16);
    return {
      frequencyX: baseFreq * rng.range(0.8, 1.2),
      frequencyY: baseFreq * rng.range(0.8, 1.2),
      lineWidth: rng.range(0.05, 0.2),
    };
  }

  // ============================================
  // Wallpaper Pattern Generation
  // ============================================

  /**
   * Generate wallpaper-style pattern
   */
  generateWallpaperPattern(
    seed: number,
    abnormality: number
  ): {
    type: 'damask' | 'artDeco' | 'herringbone' | 'stripes' | 'grid';
    scale: number;
    rotation: number;
    distortionAmount: number;
  } {
    const rng = new SeededRandom(seed);

    const types: Array<'damask' | 'artDeco' | 'herringbone' | 'stripes' | 'grid'> = [
      'damask',
      'artDeco',
      'herringbone',
      'stripes',
      'grid',
    ];

    // Weights shift toward more abstract patterns with abnormality
    const weights = [
      0.3 - abnormality * 0.2,
      0.25,
      0.2,
      0.15,
      0.1 + abnormality * 0.2,
    ];

    return {
      type: rng.weightedPick(types, weights),
      scale: rng.range(2, 8),
      rotation: rng.range(0, Math.PI / 4),
      distortionAmount: abnormality * rng.range(0.1, 0.5),
    };
  }

  /**
   * Evaluate wallpaper pattern at UV coordinate
   */
  evaluateWallpaper(
    u: number,
    v: number,
    type: 'damask' | 'artDeco' | 'herringbone' | 'stripes' | 'grid',
    scale: number,
    seed: number
  ): number {
    switch (type) {
      case 'damask':
        return damaskPattern(u, v, scale, seed);
      case 'artDeco':
        return artDecoPattern(u, v, scale, seed);
      case 'herringbone':
        return herringbonePattern(u, v, scale);
      case 'stripes':
        const stripeConfig = this.generateStripeConfig(seed);
        return stripePattern(u, v, stripeConfig.frequency, stripeConfig.angle, stripeConfig.thickness);
      case 'grid':
        const gridConfig = this.generateGridConfig(seed);
        return gridPattern(u, v, gridConfig.frequencyX, gridConfig.frequencyY, gridConfig.lineWidth);
      default:
        return damaskPattern(u, v, scale, seed);
    }
  }

  // ============================================
  // Carpet Pattern Generation
  // ============================================

  /**
   * Generate carpet pattern using grain scheduling intervals
   */
  generateCarpetConfig(
    seed: number
  ): {
    grainInterval: number;
    borderWidth: number;
    hasBorder: boolean;
  } {
    const rng = new SeededRandom(seed);

    // Grain interval derived from typical scheduling values
    const intervals = [0.1, 0.125, 0.167, 0.2, 0.25, 0.333, 0.5];

    return {
      grainInterval: rng.pick(intervals),
      borderWidth: rng.range(0.05, 0.15),
      hasBorder: rng.next() < 0.4,
    };
  }

  /**
   * Evaluate carpet pattern at UV coordinate
   */
  evaluateCarpet(
    u: number,
    v: number,
    grainInterval: number,
    borderWidth: number,
    hasBorder: boolean,
    seed: number
  ): number {
    const base = carpetPattern(u, v, grainInterval, seed);

    if (hasBorder) {
      const border = carpetBorderPattern(u, v, borderWidth, seed);
      return Math.max(base * 0.8, border);
    }

    return base;
  }

  // ============================================
  // Audio Binding Generation
  // ============================================

  /**
   * Generate audio bindings for pattern modulation
   */
  private generateAudioBindings(
    rng: SeededRandom,
    count: number
  ): PatternAudioBinding[] {
    const bands = Object.values(AudioBand);
    const params = Object.values(PatternParameter);

    const bindings: PatternAudioBinding[] = [];

    for (let i = 0; i < count; i++) {
      bindings.push({
        frequencyBand: rng.pick(bands) as AudioBand,
        parameter: rng.pick(params) as PatternParameter,
        amount: rng.range(0.1, 0.5),
        smoothing: rng.range(0.7, 0.95),
      });
    }

    return bindings;
  }

  // ============================================
  // Pattern Evaluation
  // ============================================

  /**
   * Evaluate a composite pattern at UV coordinates
   */
  evaluateComposite(
    u: number,
    v: number,
    pattern: CompositePattern,
    time: number,
    seed: number
  ): number {
    if (pattern.layers.length === 0) return 0;

    let result = 0;

    for (let i = 0; i < pattern.layers.length; i++) {
      const layer = pattern.layers[i];

      // Apply layer scale and rotation
      const cos = Math.cos(layer.rotation);
      const sin = Math.sin(layer.rotation);
      const scaledU = ((u - 0.5) * cos - (v - 0.5) * sin) * layer.scale + 0.5;
      const scaledV = ((u - 0.5) * sin + (v - 0.5) * cos) * layer.scale + 0.5;

      // Evaluate the layer's pattern
      let layerValue = this.evaluateLayer(
        scaledU,
        scaledV,
        layer,
        time,
        seed + i * 1000
      );

      // Apply opacity
      layerValue *= layer.opacity;

      // Blend with result
      if (i === 0) {
        result = layerValue;
      } else {
        result = blend(result, layerValue, pattern.blendMode);
      }
    }

    return result;
  }

  /**
   * Evaluate a single pattern layer
   */
  private evaluateLayer(
    u: number,
    v: number,
    layer: PatternLayer,
    time: number,
    seed: number
  ): number {
    switch (layer.type) {
      case PatternLayerType.SLICER:
        return evaluateSlicerPattern(u, v, layer.pattern as SlicerPattern);
      case PatternLayerType.LFO:
        return evaluateLFOPattern(u, v, time, layer.pattern as LFOPattern);
      case PatternLayerType.GRAIN:
        return evaluateGrainPattern(u, v, layer.pattern as GrainPattern, seed);
      case PatternLayerType.ADSR:
        return evaluateADSRPattern(u, v, layer.pattern as ADSRPattern);
      default:
        return 0;
    }
  }

  /**
   * Evaluate pattern with audio modulation
   */
  evaluateWithAudio(
    u: number,
    v: number,
    pattern: CompositePattern,
    audioLevels: AudioLevels,
    time: number,
    _seed: number,
    _bindings: PatternAudioBinding[]
  ): number {
    // Apply audio distortion to UVs
    const distorted = audioDistortUV(
      u,
      v,
      audioLevels.bass,
      audioLevels.transientIntensity,
      time
    );

    // Evaluate base pattern
    let value = this.evaluateComposite(
      distorted.u,
      distorted.v,
      pattern,
      time,
      seed
    );

    // Apply audio modulation
    value = audioModulate(
      value,
      audioLevels.bass,
      audioLevels.mid,
      audioLevels.high,
      audioLevels.transientIntensity
    );

    return Math.max(0, Math.min(1, value));
  }

  // ============================================
  // Shader Uniform Generation
  // ============================================

  /**
   * Generate shader uniforms from a composite pattern
   */
  generateUniforms(pattern: CompositePattern, seed: number): PatternUniforms {
    // Default values
    const uniforms: PatternUniforms = {
      u_slicerSteps: 16,
      u_slicerIntensities: new Float32Array(32),
      u_slicerDirection: 0,

      u_lfoWaveform: 0,
      u_lfoFrequency: 1,
      u_lfoAmplitude: 1,
      u_lfoPhase: 0,

      u_grainDensity: 50,
      u_grainSizeVariance: 0.5,
      u_grainJitter: 0.25,
      u_grainShape: 0,

      u_adsrAttack: 0.1,
      u_adsrDecay: 0.2,
      u_adsrSustain: 0.5,
      u_adsrRelease: 0.2,
      u_adsrDirection: 0,

      u_blendMode: blendModeToInt(pattern.blendMode),
      u_layerCount: pattern.layers.length,
      u_patternSeed: seed,
    };

    // Extract primary pattern of each type from layers
    for (const layer of pattern.layers) {
      switch (layer.type) {
        case PatternLayerType.SLICER: {
          const slicer = layer.pattern as SlicerPattern;
          uniforms.u_slicerSteps = slicer.steps;
          for (let i = 0; i < slicer.intensity.length && i < 32; i++) {
            uniforms.u_slicerIntensities[i] = slicer.intensity[i];
          }
          uniforms.u_slicerDirection = directionToInt(slicer.direction);
          break;
        }
        case PatternLayerType.LFO: {
          const lfo = layer.pattern as LFOPattern;
          uniforms.u_lfoWaveform = waveformToInt(lfo.waveform);
          uniforms.u_lfoFrequency = lfo.frequency;
          uniforms.u_lfoAmplitude = lfo.amplitude;
          uniforms.u_lfoPhase = lfo.phase;
          break;
        }
        case PatternLayerType.GRAIN: {
          const grain = layer.pattern as GrainPattern;
          uniforms.u_grainDensity = grain.density;
          uniforms.u_grainSizeVariance = grain.sizeVariance;
          uniforms.u_grainJitter = grain.positionJitter;
          uniforms.u_grainShape = grainShapeToInt(grain.shape);
          break;
        }
        case PatternLayerType.ADSR: {
          const adsr = layer.pattern as ADSRPattern;
          uniforms.u_adsrAttack = adsr.attack;
          uniforms.u_adsrDecay = adsr.decay;
          uniforms.u_adsrSustain = adsr.sustain;
          uniforms.u_adsrRelease = adsr.release;
          uniforms.u_adsrDirection = directionToInt(adsr.direction);
          break;
        }
      }
    }

    return uniforms;
  }

  // ============================================
  // Pattern Morphing for Transitions
  // ============================================

  /**
   * Morph between two composite patterns
   * Used for smooth room transitions
   */
  morphPatterns(
    patternA: CompositePattern,
    patternB: CompositePattern,
    t: number
  ): CompositePattern {
    // Interpolate layer count
    const layerCountA = patternA.layers.length;
    const layerCountB = patternB.layers.length;
    const targetCount = Math.round(layerCountA + (layerCountB - layerCountA) * t);

    const layers: PatternLayer[] = [];

    for (let i = 0; i < targetCount; i++) {
      const layerA = patternA.layers[i % layerCountA];
      const layerB = patternB.layers[i % layerCountB];

      layers.push({
        type: t < 0.5 ? layerA.type : layerB.type,
        pattern: t < 0.5 ? layerA.pattern : layerB.pattern,
        opacity: layerA.opacity + (layerB.opacity - layerA.opacity) * t,
        scale: layerA.scale + (layerB.scale - layerA.scale) * t,
        rotation: layerA.rotation + (layerB.rotation - layerA.rotation) * t,
      });
    }

    return {
      layers,
      blendMode: t < 0.5 ? patternA.blendMode : patternB.blendMode,
    };
  }
}

export default PatternGenerator;
