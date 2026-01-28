/**
 * Painting Generator
 *
 * Creates procedural paintings with wrongness that escalates with depth and Growl.
 *
 * Art Direction Principles:
 * - Beauty that knows pain—class, taste, nuance
 * - NOT horror imagery—wrongness in the mundane
 * - Landscapes with wrong horizons
 * - Portraits of composite faces
 * - Canvas that shows the room it's in (recursive wrongness)
 * - Frame styles that don't match room era
 * - Placement slightly too low or too high
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import {
  PaintingStyle,
  FrameStyle,
  PaintingWrongnessType,
  type PaintingConfig,
  type PaintingWrongness,
  type PaintingPlacement,
  type PaintingDimensions,
  type PaintingColors,
} from '../types/art';
import { WrongnessLevel, type WrongnessConfig, type RoomDimensions, Wall } from '../types/room';

// Pale-strata palette for paintings
const PAINTING_PALETTE = {
  // Warm earth tones (landscapes)
  ochre: new THREE.Color('#c7a86a'),
  sienna: new THREE.Color('#a35f3c'),
  umber: new THREE.Color('#635147'),
  // Cool tones (skies, water)
  cerulean: new THREE.Color('#6b9ac4'),
  prussian: new THREE.Color('#2d4a6b'),
  slate: new THREE.Color('#4a5568'),
  // Flesh tones (portraits)
  ivory: new THREE.Color('#ded5c4'),
  rose: new THREE.Color('#c9a9a6'),
  shadow: new THREE.Color('#7a6b63'),
  // Liminal accents
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
  void: new THREE.Color('#1a1834'),
};

// Frame colors
const FRAME_PALETTE = {
  gold: new THREE.Color('#b8860b'),
  silver: new THREE.Color('#c0c0c0'),
  black: new THREE.Color('#1a1a1a'),
  white: new THREE.Color('#f5f5f5'),
  walnut: new THREE.Color('#5d4037'),
  mahogany: new THREE.Color('#4a1c1c'),
};

/**
 * Generate paintings for a room based on its configuration
 */
export function generatePaintingsForRoom(
  roomDimensions: RoomDimensions,
  roomIndex: number,
  wrongness: WrongnessConfig | undefined,
  seed: number
): PaintingConfig[] {
  const rng = new SeededRandom(seed + 8000);
  const paintings: PaintingConfig[] = [];

  // Calculate wrongness level and count
  const level = wrongness?.level ?? WrongnessLevel.SUBTLE;
  const abnormality = 1 - Math.exp(-roomIndex / 20);

  // Number of paintings based on room size and depth
  const baseCount = Math.floor(roomDimensions.width * roomDimensions.depth / 40);
  const count = Math.max(1, Math.min(4, baseCount + Math.floor(abnormality * 2)));

  // Determine which walls get paintings
  const walls = getAvailableWalls(roomDimensions);
  const shuffledWalls = rng.shuffle(walls);

  for (let i = 0; i < count && i < shuffledWalls.length; i++) {
    const wall = shuffledWalls[i];
    const paintingSeed = seed + 8000 + i * 1000;
    const painting = generatePainting(
      paintingSeed,
      i,
      wall,
      roomDimensions,
      level,
      abnormality,
      rng
    );
    paintings.push(painting);
  }

  return paintings;
}

/**
 * Get walls suitable for paintings
 */
function getAvailableWalls(dimensions: RoomDimensions): Wall[] {
  const walls: Wall[] = [];

  // Only include walls that are large enough for paintings
  if (dimensions.depth >= 2) {
    walls.push(Wall.NORTH, Wall.SOUTH);
  }
  if (dimensions.width >= 2) {
    walls.push(Wall.EAST, Wall.WEST);
  }

  return walls;
}

/**
 * Generate a single painting configuration
 */
function generatePainting(
  seed: number,
  index: number,
  wall: Wall,
  roomDimensions: RoomDimensions,
  wrongnessLevel: WrongnessLevel,
  abnormality: number,
  _rng: SeededRandom
): PaintingConfig {
  const paintingRng = new SeededRandom(seed);

  // Select style based on wrongness level
  const style = selectPaintingStyle(paintingRng, wrongnessLevel);

  // Select frame style (often mismatched)
  const frameStyle = selectFrameStyle(paintingRng, style, wrongnessLevel);

  // Generate wrongness
  const wrongness = generatePaintingWrongness(paintingRng, style, wrongnessLevel, abnormality);

  // Calculate dimensions
  const dimensions = calculatePaintingDimensions(paintingRng, style, roomDimensions);

  // Calculate placement on wall
  const placement = calculatePlacement(paintingRng, wall, roomDimensions, dimensions, wrongnessLevel);

  // Select colors
  const colors = selectColors(paintingRng, style, wrongnessLevel);

  // Audio reactivity settings
  const bands: Array<'bass' | 'mid' | 'high'> = ['bass', 'mid', 'high'];
  const audioBand = paintingRng.pick(bands);
  const audioReactivity = 0.3 + abnormality * 0.5;

  return {
    id: `painting-${seed}-${index}`,
    style,
    frameStyle,
    wrongness,
    placement,
    dimensions,
    colors,
    seed,
    audioBand,
    audioReactivity,
  };
}

/**
 * Select painting style based on wrongness level
 */
function selectPaintingStyle(rng: SeededRandom, level: WrongnessLevel): PaintingStyle {
  // Lower levels: more conventional styles
  // Higher levels: more unsettling styles
  if (level <= WrongnessLevel.SUBTLE) {
    return rng.pick([
      PaintingStyle.LANDSCAPE,
      PaintingStyle.LANDSCAPE,
      PaintingStyle.STILL_LIFE,
      PaintingStyle.ABSTRACT,
    ]);
  }

  if (level <= WrongnessLevel.NOTICEABLE) {
    return rng.pick([
      PaintingStyle.LANDSCAPE,
      PaintingStyle.PORTRAIT,
      PaintingStyle.STILL_LIFE,
      PaintingStyle.WINDOW,
    ]);
  }

  if (level <= WrongnessLevel.UNSETTLING) {
    return rng.pick([
      PaintingStyle.PORTRAIT,
      PaintingStyle.WINDOW,
      PaintingStyle.RECURSIVE,
      PaintingStyle.ABSTRACT,
    ]);
  }

  if (level <= WrongnessLevel.SURREAL) {
    return rng.pick([
      PaintingStyle.RECURSIVE,
      PaintingStyle.MIRROR,
      PaintingStyle.PORTRAIT,
      PaintingStyle.WINDOW,
    ]);
  }

  // BIZARRE level
  return rng.pick([
    PaintingStyle.RECURSIVE,
    PaintingStyle.MIRROR,
    PaintingStyle.PORTRAIT, // But deeply wrong
  ]);
}

/**
 * Select frame style, often mismatched with painting era
 */
function selectFrameStyle(
  rng: SeededRandom,
  paintingStyle: PaintingStyle,
  level: WrongnessLevel
): FrameStyle {
  // At low wrongness, frames mostly match
  if (level <= WrongnessLevel.SUBTLE) {
    if (paintingStyle === PaintingStyle.ABSTRACT) {
      return rng.pick([FrameStyle.MINIMAL, FrameStyle.NONE]);
    }
    return rng.pick([FrameStyle.ORNATE, FrameStyle.MINIMAL]);
  }

  // Higher wrongness: frames often wrong
  if (level <= WrongnessLevel.NOTICEABLE) {
    return rng.pick([
      FrameStyle.ORNATE,
      FrameStyle.MINIMAL,
      FrameStyle.WRONG_ERA,
    ]);
  }

  if (level <= WrongnessLevel.UNSETTLING) {
    return rng.pick([
      FrameStyle.WRONG_ERA,
      FrameStyle.WRONG_ERA,
      FrameStyle.DAMAGED,
      FrameStyle.NONE,
    ]);
  }

  // High wrongness: damaged, organic
  return rng.pick([
    FrameStyle.DAMAGED,
    FrameStyle.ORGANIC,
    FrameStyle.NONE,
    FrameStyle.WRONG_ERA,
  ]);
}

/**
 * Generate painting wrongness details
 */
function generatePaintingWrongness(
  rng: SeededRandom,
  style: PaintingStyle,
  level: WrongnessLevel,
  abnormality: number
): PaintingWrongness {
  // Select wrongness type based on painting style
  let type: PaintingWrongnessType;
  const subtleties: string[] = [];

  switch (style) {
    case PaintingStyle.LANDSCAPE:
      type = rng.pick([
        PaintingWrongnessType.LIGHTING,
        PaintingWrongnessType.PERSPECTIVE,
        PaintingWrongnessType.TEMPORAL,
      ]);
      if (type === PaintingWrongnessType.LIGHTING) {
        subtleties.push('shadows fall toward the light source');
        subtleties.push('multiple suns cast single shadows');
      } else if (type === PaintingWrongnessType.PERSPECTIVE) {
        subtleties.push('horizon tilts imperceptibly');
        subtleties.push('vanishing points multiply');
      } else {
        subtleties.push('eternal dusk that never resolves');
        subtleties.push('sky suggests time that cannot exist');
      }
      break;

    case PaintingStyle.PORTRAIT:
      type = rng.pick([
        PaintingWrongnessType.FACIAL,
        PaintingWrongnessType.ANIMATE,
        PaintingWrongnessType.CONTENT,
      ]);
      if (type === PaintingWrongnessType.FACIAL) {
        subtleties.push('eyes from different faces');
        subtleties.push('smile that doesn\'t match the eyes');
        subtleties.push('features from multiple people');
      } else if (type === PaintingWrongnessType.ANIMATE) {
        subtleties.push('gaze seems to follow');
        subtleties.push('expression shifts when unobserved');
      } else {
        subtleties.push('hands with wrong number of fingers');
        subtleties.push('clothing from no recognizable era');
      }
      break;

    case PaintingStyle.STILL_LIFE:
      type = rng.pick([
        PaintingWrongnessType.LIGHTING,
        PaintingWrongnessType.CONTENT,
        PaintingWrongnessType.SPATIAL,
      ]);
      subtleties.push('objects cast no shadows');
      subtleties.push('fruit that has rotted and ripened simultaneously');
      subtleties.push('arrangement suggests ritual purpose');
      break;

    case PaintingStyle.ABSTRACT:
      type = rng.pick([
        PaintingWrongnessType.SPATIAL,
        PaintingWrongnessType.ANIMATE,
      ]);
      subtleties.push('patterns almost resolve into meaning');
      subtleties.push('shapes that seem to move peripherally');
      break;

    case PaintingStyle.WINDOW:
      type = rng.pick([
        PaintingWrongnessType.SPATIAL,
        PaintingWrongnessType.TEMPORAL,
        PaintingWrongnessType.CONTENT,
      ]);
      subtleties.push('view of location that doesn\'t exist');
      subtleties.push('weather outside doesn\'t match reality');
      subtleties.push('distant figures that might be watching');
      break;

    case PaintingStyle.RECURSIVE:
      type = PaintingWrongnessType.RECURSIVE;
      subtleties.push('shows this room from impossible angle');
      subtleties.push('you might be visible in it');
      subtleties.push('contents differ from current state');
      break;

    case PaintingStyle.MIRROR:
      type = rng.pick([
        PaintingWrongnessType.RECURSIVE,
        PaintingWrongnessType.ANIMATE,
      ]);
      subtleties.push('reflection has slight delay');
      subtleties.push('shows room as it was, not as it is');
      subtleties.push('your reflection doesn\'t quite match');
      break;

    default:
      type = PaintingWrongnessType.CONTENT;
      subtleties.push('something is wrong');
  }

  // Intensity scales with wrongness level and abnormality
  const baseIntensity = (level - 1) / 4;
  const intensity = Math.min(1, baseIntensity + abnormality * 0.3);

  return {
    type,
    intensity,
    subtleties: subtleties.slice(0, 2), // Pick first 2 subtleties
  };
}

/**
 * Calculate painting dimensions
 */
function calculatePaintingDimensions(
  rng: SeededRandom,
  style: PaintingStyle,
  roomDimensions: RoomDimensions
): PaintingDimensions {
  // Base dimensions vary by style
  let widthRange: [number, number];
  let heightRange: [number, number];

  switch (style) {
    case PaintingStyle.PORTRAIT:
      widthRange = [0.4, 0.7];
      heightRange = [0.6, 1.0];
      break;
    case PaintingStyle.LANDSCAPE:
      widthRange = [0.8, 1.4];
      heightRange = [0.5, 0.9];
      break;
    case PaintingStyle.WINDOW:
      widthRange = [0.6, 1.0];
      heightRange = [0.8, 1.2];
      break;
    case PaintingStyle.RECURSIVE:
    case PaintingStyle.MIRROR:
      widthRange = [0.5, 0.9];
      heightRange = [0.6, 1.0];
      break;
    default:
      widthRange = [0.5, 1.0];
      heightRange = [0.5, 1.0];
  }

  // Scale based on room size
  const roomScale = Math.min(roomDimensions.width, roomDimensions.height) / 5;
  const scale = Math.max(0.7, Math.min(1.5, roomScale));

  const width = rng.range(widthRange[0], widthRange[1]) * scale;
  const height = rng.range(heightRange[0], heightRange[1]) * scale;

  // Frame dimensions
  const frameWidth = style === PaintingStyle.ABSTRACT ? 0.02 : rng.range(0.04, 0.1);
  const frameDepth = 0.05 + frameWidth * 0.5;

  return {
    width,
    height,
    frameDepth,
    frameWidth,
  };
}

/**
 * Calculate painting placement on wall
 */
function calculatePlacement(
  rng: SeededRandom,
  _wall: Wall,
  _roomDimensions: RoomDimensions,
  paintingDimensions: PaintingDimensions,
  wrongnessLevel: WrongnessLevel
): PaintingPlacement {
  // Standard eye-level height is ~1.5m
  const standardHeight = 1.5;

  // Wrongness affects placement
  const heightVariance = (wrongnessLevel - 1) * 0.1;
  const tiltVariance = (wrongnessLevel - 1) * 0.02;

  // Calculate height with wrongness (slightly too high or too low)
  const heightOffset = rng.range(-heightVariance, heightVariance);
  const height = standardHeight + heightOffset;

  // Tilt (rotation) - increases with wrongness
  const tilt = rng.range(-tiltVariance, tiltVariance);

  // Wall offset (frame depth + small gap)
  const wallOffset = paintingDimensions.frameDepth + 0.02;

  return {
    height,
    tilt,
    wallOffset,
  };
}

/**
 * Select painting colors
 */
function selectColors(
  rng: SeededRandom,
  style: PaintingStyle,
  level: WrongnessLevel
): PaintingColors {
  let dominant: THREE.Color;
  let accent: THREE.Color;

  switch (style) {
    case PaintingStyle.LANDSCAPE:
      dominant = rng.pick([PAINTING_PALETTE.ochre, PAINTING_PALETTE.cerulean, PAINTING_PALETTE.slate]);
      accent = rng.pick([PAINTING_PALETTE.sienna, PAINTING_PALETTE.prussian]);
      break;

    case PaintingStyle.PORTRAIT:
      dominant = rng.pick([PAINTING_PALETTE.ivory, PAINTING_PALETTE.rose, PAINTING_PALETTE.shadow]);
      accent = rng.pick([PAINTING_PALETTE.umber, PAINTING_PALETTE.sienna]);
      break;

    case PaintingStyle.STILL_LIFE:
      dominant = rng.pick([PAINTING_PALETTE.umber, PAINTING_PALETTE.ochre]);
      accent = rng.pick([PAINTING_PALETTE.sienna, PAINTING_PALETTE.ivory]);
      break;

    case PaintingStyle.ABSTRACT:
    case PaintingStyle.RECURSIVE:
    case PaintingStyle.MIRROR:
      // Use liminal palette for these
      dominant = rng.pick([PAINTING_PALETTE.primary, PAINTING_PALETTE.void]);
      accent = PAINTING_PALETTE.secondary.clone();
      break;

    case PaintingStyle.WINDOW:
      dominant = rng.pick([PAINTING_PALETTE.cerulean, PAINTING_PALETTE.prussian]);
      accent = PAINTING_PALETTE.ivory.clone();
      break;

    default:
      dominant = PAINTING_PALETTE.umber.clone();
      accent = PAINTING_PALETTE.ochre.clone();
  }

  // Frame color based on level
  let frame: THREE.Color;
  if (level <= WrongnessLevel.SUBTLE) {
    frame = rng.pick([FRAME_PALETTE.gold, FRAME_PALETTE.walnut]);
  } else if (level <= WrongnessLevel.NOTICEABLE) {
    frame = rng.pick([FRAME_PALETTE.gold, FRAME_PALETTE.black, FRAME_PALETTE.mahogany]);
  } else {
    // Higher wrongness: more unusual frame colors
    frame = rng.pick([FRAME_PALETTE.black, FRAME_PALETTE.white, FRAME_PALETTE.silver]);
  }

  // At high wrongness, shift colors toward the liminal palette
  if (level >= WrongnessLevel.UNSETTLING) {
    const shiftAmount = (level - WrongnessLevel.UNSETTLING) * 0.2;
    dominant.lerp(PAINTING_PALETTE.primary, shiftAmount);
    accent.lerp(PAINTING_PALETTE.secondary, shiftAmount);
  }

  return {
    dominant: dominant.clone(),
    accent: accent.clone(),
    frame: frame.clone(),
  };
}

/**
 * Get position for painting on a specific wall
 */
export function getPaintingPosition(
  wall: Wall,
  roomDimensions: RoomDimensions,
  paintingConfig: PaintingConfig,
  horizontalPosition: number = 0.5 // 0-1 along wall
): THREE.Vector3 {
  const { width, depth } = roomDimensions;
  const { placement, dimensions } = paintingConfig;

  let x = 0;
  let y = placement.height;
  let z = 0;

  // Calculate position based on wall
  switch (wall) {
    case Wall.NORTH:
      z = -depth / 2 + placement.wallOffset;
      x = (horizontalPosition - 0.5) * (width - dimensions.width - 1);
      break;
    case Wall.SOUTH:
      z = depth / 2 - placement.wallOffset;
      x = (horizontalPosition - 0.5) * (width - dimensions.width - 1);
      break;
    case Wall.EAST:
      x = width / 2 - placement.wallOffset;
      z = (horizontalPosition - 0.5) * (depth - dimensions.width - 1);
      break;
    case Wall.WEST:
      x = -width / 2 + placement.wallOffset;
      z = (horizontalPosition - 0.5) * (depth - dimensions.width - 1);
      break;
  }

  return new THREE.Vector3(x, y, z);
}

/**
 * Get rotation for painting on a specific wall
 */
export function getPaintingRotation(
  wall: Wall,
  tilt: number = 0
): THREE.Euler {
  let yRotation = 0;

  switch (wall) {
    case Wall.NORTH:
      yRotation = 0;
      break;
    case Wall.SOUTH:
      yRotation = Math.PI;
      break;
    case Wall.EAST:
      yRotation = -Math.PI / 2;
      break;
    case Wall.WEST:
      yRotation = Math.PI / 2;
      break;
  }

  return new THREE.Euler(tilt, yRotation, 0);
}

// Singleton generator
let paintingGeneratorInstance: PaintingGenerator | null = null;

export class PaintingGenerator {
  generateForRoom(
    roomDimensions: RoomDimensions,
    roomIndex: number,
    wrongness: WrongnessConfig | undefined,
    seed: number
  ): PaintingConfig[] {
    return generatePaintingsForRoom(roomDimensions, roomIndex, wrongness, seed);
  }
}

export function getPaintingGenerator(): PaintingGenerator {
  if (!paintingGeneratorInstance) {
    paintingGeneratorInstance = new PaintingGenerator();
  }
  return paintingGeneratorInstance;
}

export default PaintingGenerator;
