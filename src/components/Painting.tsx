/**
 * Painting Component
 *
 * Procedural paintings that react to audio and embody wrongness.
 *
 * Art Direction Principles:
 * - Beauty that knows pain—class, taste, nuance
 * - NOT horror imagery—wrongness in the mundane
 * - Paintings with wrong horizons, composite faces
 * - Frame styles that don't match room era
 * - Placement slightly too low or too high
 * - Collision meshes for frame depth
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioLevels, useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { SeededRandom } from '../utils/seededRandom';
import {
  PaintingStyle,
  FrameStyle,
  PaintingWrongnessType,
  type PaintingConfig,
} from '../types/art';
import { type RoomDimensions, type WrongnessConfig } from '../types/room';
import {
  generatePaintingsForRoom,
  getPaintingPosition,
  getPaintingRotation,
} from '../generators/PaintingGenerator';
import { getCollisionManager } from '../systems/CollisionManager';

// Pale-strata colors
const COLORS = {
  primary: new THREE.Color('#c792f5'),
  secondary: new THREE.Color('#8eecf5'),
  background: new THREE.Color('#1a1834'),
};

// ============================================
// Procedural Canvas Texture Generation
// ============================================

/**
 * Create a procedural canvas texture for the painting
 */
function createPaintingTexture(
  config: PaintingConfig,
  width: number,
  height: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const resolution = 512;
  canvas.width = resolution;
  canvas.height = Math.floor(resolution * (height / width));

  const ctx = canvas.getContext('2d')!;
  const rng = new SeededRandom(config.seed);

  // Fill background
  ctx.fillStyle = `#${config.colors.dominant.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Generate based on style
  switch (config.style) {
    case PaintingStyle.LANDSCAPE:
      drawLandscape(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.PORTRAIT:
      drawPortrait(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.STILL_LIFE:
      drawStillLife(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.ABSTRACT:
      drawAbstract(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.WINDOW:
      drawWindow(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.RECURSIVE:
      drawRecursive(ctx, canvas.width, canvas.height, config, rng);
      break;
    case PaintingStyle.MIRROR:
      drawMirror(ctx, canvas.width, canvas.height, config, rng);
      break;
  }

  // Apply wrongness effects
  applyWrongnessEffects(ctx, canvas.width, canvas.height, config, rng);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
}

/**
 * Draw a landscape with wrong horizons
 */
function drawLandscape(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  rng: SeededRandom
) {
  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  gradient.addColorStop(0, '#4a5568');
  gradient.addColorStop(0.5, '#6b9ac4');
  gradient.addColorStop(1, '#c7a86a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h * 0.6);

  // Horizon line - WRONG (tilted based on wrongness)
  const tilt = config.wrongness.intensity * 0.1 * (rng.next() > 0.5 ? 1 : -1);
  const horizonY = h * 0.55;

  ctx.save();
  ctx.translate(w / 2, horizonY);
  ctx.rotate(tilt);
  ctx.translate(-w / 2, -horizonY);

  // Ground
  const groundGradient = ctx.createLinearGradient(0, horizonY, 0, h);
  groundGradient.addColorStop(0, '#5d6d54');
  groundGradient.addColorStop(1, '#3d4a38');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizonY - 10, w, h - horizonY + 20);

  // Distant mountains
  ctx.fillStyle = '#4a5568';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let x = 0; x <= w; x += w / 20) {
    const peakHeight = rng.range(20, 80);
    ctx.lineTo(x, horizonY - peakHeight);
  }
  ctx.lineTo(w, horizonY);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Wrong shadow - shadow falls toward sun
  if (config.wrongness.type === PaintingWrongnessType.LIGHTING) {
    // Draw a tree with shadow pointing toward light source
    const treeX = w * 0.3;
    const treeY = h * 0.7;

    // Tree
    ctx.fillStyle = '#2d3a2a';
    ctx.fillRect(treeX - 5, treeY, 10, 40);
    ctx.beginPath();
    ctx.arc(treeX, treeY - 10, 25, 0, Math.PI * 2);
    ctx.fill();

    // Shadow going UP (wrong)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(treeX - 5, treeY);
    ctx.lineTo(treeX + 5, treeY);
    ctx.lineTo(treeX + 15, treeY - 60); // Shadow pointing up
    ctx.lineTo(treeX - 15, treeY - 60);
    ctx.closePath();
    ctx.fill();
  }

  // Texture overlay
  addNoiseTexture(ctx, w, h, 0.03);
}

/**
 * Draw a portrait with composite/wrong faces
 */
function drawPortrait(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  rng: SeededRandom
) {
  // Dark background
  ctx.fillStyle = '#2d3035';
  ctx.fillRect(0, 0, w, h);

  // Face oval
  const centerX = w / 2;
  const centerY = h * 0.45;
  const faceWidth = w * 0.35;
  const faceHeight = h * 0.4;

  // Skin tone
  ctx.fillStyle = `#${config.colors.dominant.getHexString()}`;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, faceWidth, faceHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes - potentially from different faces
  const eyeY = centerY - faceHeight * 0.15;
  const leftEyeX = centerX - faceWidth * 0.35;
  const rightEyeX = centerX + faceWidth * 0.35;

  // Eye size difference (wrongness)
  const leftEyeSize = 12 + (config.wrongness.type === PaintingWrongnessType.FACIAL ? rng.range(-3, 3) : 0);
  const rightEyeSize = 12 + (config.wrongness.type === PaintingWrongnessType.FACIAL ? rng.range(-3, 3) : 0);

  // Left eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(leftEyeX, eyeY, leftEyeSize, leftEyeSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d3d3d';
  ctx.beginPath();
  ctx.arc(leftEyeX, eyeY, leftEyeSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Right eye (slightly different height for wrongness)
  const rightEyeYOffset = config.wrongness.type === PaintingWrongnessType.FACIAL ? rng.range(-5, 5) : 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(rightEyeX, eyeY + rightEyeYOffset, rightEyeSize, rightEyeSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Different colored iris (composite face)
  const irisColors = ['#3d7a9e', '#5e7d4a', '#7d5a3d', '#3d3d3d'];
  ctx.fillStyle = rng.pick(irisColors);
  ctx.beginPath();
  ctx.arc(rightEyeX, eyeY + rightEyeYOffset, rightEyeSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.strokeStyle = '#8d7d6d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - faceHeight * 0.05);
  ctx.lineTo(centerX - 8, centerY + faceHeight * 0.15);
  ctx.lineTo(centerX, centerY + faceHeight * 0.18);
  ctx.stroke();

  // Mouth - smile that doesn't match eyes
  const mouthY = centerY + faceHeight * 0.35;
  ctx.strokeStyle = '#6d5d5d';
  ctx.lineWidth = 3;
  ctx.beginPath();

  if (config.wrongness.intensity > 0.5) {
    // Asymmetric smile
    ctx.moveTo(centerX - 25, mouthY);
    ctx.quadraticCurveTo(centerX - 5, mouthY + 15, centerX, mouthY + 10);
    ctx.quadraticCurveTo(centerX + 15, mouthY + 5, centerX + 25, mouthY + 8);
  } else {
    // Neutral/slight smile
    ctx.moveTo(centerX - 20, mouthY);
    ctx.quadraticCurveTo(centerX, mouthY + 8, centerX + 20, mouthY);
  }
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#2a2520';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - faceHeight * 0.6, faceWidth * 1.1, faceHeight * 0.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Clothing suggestion
  ctx.fillStyle = '#4a4550';
  ctx.fillRect(centerX - faceWidth * 0.8, centerY + faceHeight * 0.9, faceWidth * 1.6, h);

  addNoiseTexture(ctx, w, h, 0.05);
}

/**
 * Draw a still life
 */
function drawStillLife(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _config: PaintingConfig,
  rng: SeededRandom
) {
  // Dark background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);

  // Table surface
  ctx.fillStyle = '#3d2e27';
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

  // Objects arranged with disturbing care
  const objectCount = 3 + Math.floor(rng.next() * 3);

  for (let i = 0; i < objectCount; i++) {
    const x = w * 0.15 + (i / objectCount) * w * 0.7;
    const y = h * 0.55;

    const objectType = rng.int(0, 2);

    if (objectType === 0) {
      // Vase
      ctx.fillStyle = '#5d4d4d';
      ctx.beginPath();
      ctx.moveTo(x - 15, y);
      ctx.lineTo(x - 20, y - 50);
      ctx.lineTo(x - 10, y - 60);
      ctx.lineTo(x + 10, y - 60);
      ctx.lineTo(x + 20, y - 50);
      ctx.lineTo(x + 15, y);
      ctx.closePath();
      ctx.fill();
    } else if (objectType === 1) {
      // Fruit (no shadow - wrong)
      ctx.fillStyle = '#8d5d3d';
      ctx.beginPath();
      ctx.arc(x, y - 20, 25, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#ad7d5d';
      ctx.beginPath();
      ctx.arc(x - 8, y - 28, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Candle
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(x - 8, y - 60, 16, 55);

      // Flame (frozen)
      ctx.fillStyle = '#ffa500';
      ctx.beginPath();
      ctx.moveTo(x, y - 80);
      ctx.quadraticCurveTo(x + 10, y - 70, x, y - 60);
      ctx.quadraticCurveTo(x - 10, y - 70, x, y - 80);
      ctx.fill();
    }
  }

  addNoiseTexture(ctx, w, h, 0.04);
}

/**
 * Draw abstract pattern
 */
function drawAbstract(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  rng: SeededRandom
) {
  // Base
  const bgGradient = ctx.createLinearGradient(0, 0, w, h);
  bgGradient.addColorStop(0, `#${config.colors.dominant.getHexString()}`);
  bgGradient.addColorStop(1, `#${config.colors.accent.getHexString()}`);
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Geometric shapes that almost form patterns
  const shapeCount = 10 + Math.floor(rng.next() * 15);

  for (let i = 0; i < shapeCount; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const size = rng.range(20, 80);

    ctx.globalAlpha = rng.range(0.3, 0.8);

    const shapeType = rng.int(0, 3);
    const hue = rng.range(0.6, 0.9); // Purple range

    ctx.fillStyle = `hsl(${hue * 360}, 50%, ${rng.range(30, 70)}%)`;

    if (shapeType === 0) {
      // Circle
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shapeType === 1) {
      // Rectangle
      ctx.fillRect(x - size / 2, y - size / 2, size, size * rng.range(0.5, 1.5));
    } else if (shapeType === 2) {
      // Triangle
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size / 2, y + size / 2);
      ctx.lineTo(x - size / 2, y + size / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // Line
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = rng.range(2, 8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng.range(-100, 100), y + rng.range(-100, 100));
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  addNoiseTexture(ctx, w, h, 0.03);
}

/**
 * Draw a window showing impossible outside
 */
function drawWindow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  rng: SeededRandom
) {
  // Window frame
  ctx.fillStyle = '#2a2520';
  ctx.fillRect(0, 0, w, h);

  // Window opening
  const padding = w * 0.08;
  const windowW = w - padding * 2;
  const windowH = h - padding * 2;

  // Sky through window (wrong time of day)
  const skyGradient = ctx.createLinearGradient(padding, padding, padding, padding + windowH);
  // Perpetual dusk
  skyGradient.addColorStop(0, '#4a3055');
  skyGradient.addColorStop(0.3, '#7a5080');
  skyGradient.addColorStop(0.6, '#c79050');
  skyGradient.addColorStop(1, '#302838');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(padding, padding, windowW, windowH);

  // Multiple moons/suns (wrong)
  ctx.fillStyle = '#f0e0c0';
  ctx.beginPath();
  ctx.arc(padding + windowW * 0.7, padding + windowH * 0.2, 20, 0, Math.PI * 2);
  ctx.fill();

  if (config.wrongness.intensity > 0.4) {
    ctx.fillStyle = '#e0d0b0';
    ctx.beginPath();
    ctx.arc(padding + windowW * 0.3, padding + windowH * 0.35, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant buildings/landscape
  ctx.fillStyle = '#1a1525';
  for (let i = 0; i < 5; i++) {
    const bx = padding + (i / 5) * windowW;
    const bh = rng.range(50, 150);
    ctx.fillRect(bx, padding + windowH - bh, windowW / 6, bh);
  }

  // Window frame details
  ctx.strokeStyle = '#4a4540';
  ctx.lineWidth = 3;
  ctx.strokeRect(padding, padding, windowW, windowH);

  // Cross bars
  ctx.beginPath();
  ctx.moveTo(w / 2, padding);
  ctx.lineTo(w / 2, h - padding);
  ctx.moveTo(padding, h / 2);
  ctx.lineTo(w - padding, h / 2);
  ctx.stroke();

  addNoiseTexture(ctx, w, h, 0.02);
}

/**
 * Draw recursive painting (shows the room)
 */
function drawRecursive(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  _rng: SeededRandom
) {
  // Room representation
  ctx.fillStyle = '#2c2c4b';
  ctx.fillRect(0, 0, w, h);

  // Floor
  ctx.fillStyle = '#3a3861';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.6);
  ctx.lineTo(w * 0.9, h * 0.6);
  ctx.lineTo(w * 0.95, h);
  ctx.lineTo(w * 0.05, h);
  ctx.closePath();
  ctx.fill();

  // Back wall
  ctx.fillStyle = '#211f3c';
  ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.5);

  // A painting within the painting (recursive)
  ctx.fillStyle = '#c792f5';
  ctx.fillRect(w * 0.35, h * 0.2, w * 0.3, h * 0.25);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.strokeRect(w * 0.35, h * 0.2, w * 0.3, h * 0.25);

  // Deeper recursion at high wrongness
  if (config.wrongness.intensity > 0.6) {
    ctx.fillStyle = '#8eecf5';
    ctx.fillRect(w * 0.42, h * 0.27, w * 0.16, h * 0.12);
  }

  // Doorway
  ctx.fillStyle = '#1a1834';
  ctx.fillRect(w * 0.7, h * 0.25, w * 0.15, h * 0.35);

  // Suggestion of a figure (you?)
  if (config.wrongness.intensity > 0.4) {
    ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
    ctx.beginPath();
    ctx.ellipse(w * 0.25, h * 0.75, 15, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  addNoiseTexture(ctx, w, h, 0.03);
}

/**
 * Draw a mirror that reflects wrong
 */
function drawMirror(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  _rng: SeededRandom
) {
  // Mirror surface
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  gradient.addColorStop(0, '#3a3861');
  gradient.addColorStop(0.7, '#2c2c4b');
  gradient.addColorStop(1, '#1a1834');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Vague reflection of room
  ctx.globalAlpha = 0.3;

  // Floor reflection
  ctx.fillStyle = '#4a4870';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Ghostly figure reflection (slightly off)
  ctx.fillStyle = '#5a5878';
  ctx.beginPath();
  const figureX = w / 2 + (config.wrongness.intensity > 0.5 ? 20 : 0); // Offset at high wrongness
  ctx.ellipse(figureX, h * 0.65, 25, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(figureX, h * 0.35, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // Mirror edge glow
  ctx.strokeStyle = 'rgba(199, 146, 245, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  addNoiseTexture(ctx, w, h, 0.02);
}

/**
 * Apply wrongness visual effects
 */
function applyWrongnessEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PaintingConfig,
  _rng: SeededRandom
) {
  const intensity = config.wrongness.intensity;

  // Subtle color shift at edges
  if (intensity > 0.3) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(${Math.floor(199 * intensity)}, ${Math.floor(146 * intensity)}, ${Math.floor(245 * intensity)}, ${intensity * 0.15})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  // Vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, `rgba(0,0,0,${0.2 + intensity * 0.2})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Add noise texture overlay
 */
function addNoiseTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============================================
// Frame Geometry
// ============================================

/**
 * Create frame geometry with bevels
 */
function createFrameGeometry(
  width: number,
  height: number,
  frameWidth: number,
  frameDepth: number
): THREE.BufferGeometry {
  // Simple box frame for now
  const outerW = width + frameWidth * 2;

  // Create frame as 4 box geometries merged
  const geometries: THREE.BufferGeometry[] = [];

  // Top
  const top = new THREE.BoxGeometry(outerW, frameWidth, frameDepth);
  top.translate(0, height / 2 + frameWidth / 2, 0);
  geometries.push(top);

  // Bottom
  const bottom = new THREE.BoxGeometry(outerW, frameWidth, frameDepth);
  bottom.translate(0, -height / 2 - frameWidth / 2, 0);
  geometries.push(bottom);

  // Left
  const left = new THREE.BoxGeometry(frameWidth, height, frameDepth);
  left.translate(-width / 2 - frameWidth / 2, 0, 0);
  geometries.push(left);

  // Right
  const right = new THREE.BoxGeometry(frameWidth, height, frameDepth);
  right.translate(width / 2 + frameWidth / 2, 0, 0);
  geometries.push(right);

  // Merge geometries
  return mergeBufferGeometries(geometries);
}

/**
 * Simple buffer geometry merge
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  geometries.forEach(geometry => {
    const posAttr = geometry.getAttribute('position');
    const normalAttr = geometry.getAttribute('normal');
    const uvAttr = geometry.getAttribute('uv');

    for (let i = 0; i < posAttr.count; i++) {
      positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }

    if (normalAttr) {
      for (let i = 0; i < normalAttr.count; i++) {
        normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
      }
    }

    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i++) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      }
    }

    geometry.dispose();
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  if (uvs.length > 0) {
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  return merged;
}

// ============================================
// Single Painting Component
// ============================================

interface SinglePaintingProps {
  config: PaintingConfig;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

function SinglePainting({ config, position, rotation }: SinglePaintingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const canvasMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const audioLevels = useAudioLevels();
  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  // Register collision bounds with CollisionManager
  useEffect(() => {
    const dims = config.dimensions;
    const totalWidth = dims.width + dims.frameWidth * 2;
    const totalHeight = dims.height + dims.frameWidth * 2;
    const totalDepth = dims.frameDepth;

    // Calculate world-space bounds based on position and rotation
    const halfWidth = totalWidth / 2;
    const halfHeight = totalHeight / 2;
    const halfDepth = totalDepth / 2;

    // Since paintings are on walls, their bounds are relatively thin
    const bounds = new THREE.Box3(
      new THREE.Vector3(
        position.x - halfWidth,
        position.y - halfHeight,
        position.z - halfDepth
      ),
      new THREE.Vector3(
        position.x + halfWidth,
        position.y + halfHeight,
        position.z + halfDepth
      )
    );

    const collisionManager = getCollisionManager();
    collisionManager.addArtCollider(config.id, bounds);

    return () => {
      // Cleanup handled by CollisionManager.clear() on room change
    };
  }, [config.id, config.dimensions, position]);

  // Create canvas texture
  const canvasTexture = useMemo(() => {
    return createPaintingTexture(
      config,
      config.dimensions.width,
      config.dimensions.height
    );
  }, [config]);

  // Create frame geometry
  const frameGeometry = useMemo(() => {
    if (config.frameStyle === FrameStyle.NONE) return null;
    return createFrameGeometry(
      config.dimensions.width,
      config.dimensions.height,
      config.dimensions.frameWidth,
      config.dimensions.frameDepth
    );
  }, [config]);

  // Animation state
  const state = useRef({
    time: 0,
    emissiveIntensity: 0,
  });

  useFrame((_, delta) => {
    if (!groupRef.current || !canvasMaterialRef.current) return;

    state.current.time += delta;

    // Get audio value based on configured band
    const audioValue =
      config.audioBand === 'bass' ? audioSmooth.bassSmooth :
      config.audioBand === 'mid' ? audioSmooth.midSmooth :
      audioSmooth.highSmooth;

    // Subtle emissive glow on audio
    const targetEmissive = audioValue * config.audioReactivity * 0.3;
    state.current.emissiveIntensity = THREE.MathUtils.lerp(
      state.current.emissiveIntensity,
      targetEmissive,
      delta * 3
    );

    canvasMaterialRef.current.emissiveIntensity = state.current.emissiveIntensity;

    // Subtle "breathing" of the painting on high Growl
    if (growlIntensity > 0.5) {
      const breathe = Math.sin(state.current.time * 2) * 0.005 * growlIntensity;
      groupRef.current.scale.set(1 + breathe, 1 + breathe, 1);
    }

    // Subtle tilt variation on transient
    if (audioLevels.transient && audioLevels.transientIntensity > 0.6) {
      groupRef.current.rotation.z += (Math.random() - 0.5) * 0.002 * config.audioReactivity;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Canvas */}
      <mesh position={[0, 0, config.dimensions.frameDepth / 2 + 0.001]}>
        <planeGeometry args={[config.dimensions.width, config.dimensions.height]} />
        <meshStandardMaterial
          ref={canvasMaterialRef}
          map={canvasTexture}
          emissive={COLORS.primary}
          emissiveIntensity={0}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Frame */}
      {frameGeometry && config.frameStyle !== FrameStyle.NONE && (
        <mesh geometry={frameGeometry}>
          <meshStandardMaterial
            color={config.colors.frame}
            roughness={config.frameStyle === FrameStyle.ORNATE ? 0.3 : 0.6}
            metalness={config.frameStyle === FrameStyle.ORNATE ? 0.6 : 0.2}
          />
        </mesh>
      )}

      {/* Collision box (invisible) */}
      <mesh visible={false}>
        <boxGeometry args={[
          config.dimensions.width + config.dimensions.frameWidth * 2,
          config.dimensions.height + config.dimensions.frameWidth * 2,
          config.dimensions.frameDepth
        ]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// ============================================
// Main Paintings Component
// ============================================

interface PaintingsProps {
  dimensions: RoomDimensions;
  roomIndex: number;
  seed: number;
  wrongness?: WrongnessConfig;
  enabled?: boolean;
}

export function Paintings({
  dimensions,
  roomIndex,
  seed,
  wrongness,
  enabled = true,
}: PaintingsProps) {
  // Generate painting configurations
  const paintings = useMemo(() => {
    if (!enabled) return [];
    return generatePaintingsForRoom(dimensions, roomIndex, wrongness, seed);
  }, [dimensions, roomIndex, wrongness, seed, enabled]);

  if (!enabled || paintings.length === 0) return null;

  return (
    <group>
      {paintings.map((config) => {
        // Use the wall and horizontal position stored in the config
        const wall = config.wall;
        const horizontalPosition = config.placement.horizontalPosition ?? 0.5;

        const position = getPaintingPosition(wall, dimensions, config, horizontalPosition);
        const rotation = getPaintingRotation(wall, config.placement.tilt);

        return (
          <SinglePainting
            key={config.id}
            config={config}
            position={position}
            rotation={rotation}
          />
        );
      })}
    </group>
  );
}

export default Paintings;
