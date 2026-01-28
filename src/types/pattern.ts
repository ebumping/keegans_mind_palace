/**
 * Pattern type definitions for procedural visual generation
 * Derived from pale-strata audio processing patterns
 */

// ============================================
// LFO Waveform Types
// ============================================

export const WaveformType = {
  SINE: 'sine',
  SQUARE: 'square',
  SAWTOOTH: 'sawtooth',
  TRIANGLE: 'triangle',
  RANDOM: 'random',
} as const;
export type WaveformType = (typeof WaveformType)[keyof typeof WaveformType];

// ============================================
// Pattern Direction
// ============================================

export const PatternDirection = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  DIAGONAL: 'diagonal',
  RADIAL: 'radial',
} as const;
export type PatternDirection = (typeof PatternDirection)[keyof typeof PatternDirection];

// ============================================
// Grain Shape Types
// ============================================

export const GrainShape = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  DIAMOND: 'diamond',
  ORGANIC: 'organic',
} as const;
export type GrainShape = (typeof GrainShape)[keyof typeof GrainShape];

// ============================================
// Blend Modes
// ============================================

export const BlendMode = {
  MULTIPLY: 'multiply',
  ADD: 'add',
  OVERLAY: 'overlay',
  DIFFERENCE: 'difference',
} as const;
export type BlendMode = (typeof BlendMode)[keyof typeof BlendMode];

// ============================================
// Pattern Layer Types
// ============================================

export const PatternLayerType = {
  SLICER: 'slicer',
  LFO: 'lfo',
  GRAIN: 'grain',
  ADSR: 'adsr',
} as const;
export type PatternLayerType = (typeof PatternLayerType)[keyof typeof PatternLayerType];

// ============================================
// Slicer Pattern (Grid-Based from Step Sequencer)
// ============================================

export type SlicerSteps = 8 | 16 | 32;

export interface SlicerPattern {
  steps: SlicerSteps;
  activeSteps: boolean[];
  intensity: number[];
  direction: Exclude<PatternDirection, 'radial'>;
}

// ============================================
// LFO Wave Pattern
// ============================================

export interface LFOPattern {
  waveform: WaveformType;
  frequency: number;
  amplitude: number;
  phase: number;
  modulation: number;
}

// ============================================
// Grain Scatter Pattern (from Granular Synthesis)
// ============================================

export interface GrainPattern {
  density: number;
  sizeVariance: number;
  positionJitter: number;
  shape: GrainShape;
}

// ============================================
// ADSR Envelope Pattern
// ============================================

export interface ADSRPattern {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  direction: Exclude<PatternDirection, 'diagonal'>;
}

// ============================================
// Composite Pattern Layer
// ============================================

export interface PatternLayer {
  type: PatternLayerType;
  pattern: SlicerPattern | LFOPattern | GrainPattern | ADSRPattern;
  opacity: number;
  scale: number;
  rotation: number;
}

// ============================================
// Composite Pattern
// ============================================

export interface CompositePattern {
  layers: PatternLayer[];
  blendMode: BlendMode;
}

// ============================================
// Audio Binding for Pattern Modulation
// ============================================

export const AudioBand = {
  BASS: 'bass',
  MID: 'mid',
  HIGH: 'high',
} as const;
export type AudioBand = (typeof AudioBand)[keyof typeof AudioBand];

export const PatternParameter = {
  SCALE: 'scale',
  ROTATION: 'rotation',
  INTENSITY: 'intensity',
  SPEED: 'speed',
} as const;
export type PatternParameter = (typeof PatternParameter)[keyof typeof PatternParameter];

export interface PatternAudioBinding {
  frequencyBand: AudioBand;
  parameter: PatternParameter;
  amount: number;
  smoothing: number;
}

// ============================================
// Surface-Specific Pattern Configurations
// ============================================

export interface WallPatternConfig {
  basePattern: CompositePattern;
  verticalBias: number;
  wainscoting: boolean;
  wainscotingHeight: number;
  audioBindings: PatternAudioBinding[];
}

export interface FloorPatternConfig {
  basePattern: CompositePattern;
  tileGrid: boolean;
  tileSize: number;
  groutWidth: number;
  audioBindings: PatternAudioBinding[];
}

export interface CeilingPatternConfig {
  basePattern: CompositePattern;
  radialFromCenter: boolean;
  coffers: boolean;
  audioBindings: PatternAudioBinding[];
}

// ============================================
// Room Patterns Collection
// ============================================

export interface RoomPatterns {
  walls: WallPatternConfig[];
  floor: FloorPatternConfig;
  ceiling: CeilingPatternConfig;
  doorframes: CompositePattern;
}

// ============================================
// Shader Uniform Data
// ============================================

export interface PatternUniforms {
  // Slicer data (packed for shader)
  u_slicerSteps: number;
  u_slicerIntensities: Float32Array;
  u_slicerDirection: number;

  // LFO data
  u_lfoWaveform: number;
  u_lfoFrequency: number;
  u_lfoAmplitude: number;
  u_lfoPhase: number;

  // Grain data
  u_grainDensity: number;
  u_grainSizeVariance: number;
  u_grainJitter: number;
  u_grainShape: number;

  // ADSR data
  u_adsrAttack: number;
  u_adsrDecay: number;
  u_adsrSustain: number;
  u_adsrRelease: number;
  u_adsrDirection: number;

  // Composite
  u_blendMode: number;
  u_layerCount: number;
  u_patternSeed: number;
}
