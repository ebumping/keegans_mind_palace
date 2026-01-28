/**
 * Doorway Generator
 *
 * Creates procedural doorway geometry with glowing frames, arch variations,
 * and portal-like rendering for infinite hallway illusion.
 * Derived from pale-strata color palette and audio-reactive patterns.
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import type { DoorwayPlacement, DoorwayGeometry, RoomDimensions } from '../types/room';

// Pale-strata color palette
const COLORS = {
  primary: '#c792f5',
  secondary: '#8eecf5',
  background: '#1a1834',
  gradientStart: '#3a3861',
  gradientEnd: '#2c2c4b',
};

export type DoorState = 'open' | 'closed' | 'partial';

export interface DoorwayConfig {
  placement: DoorwayPlacement;
  geometry: DoorwayGeometry;
  roomDimensions: RoomDimensions;
  state: DoorState;
  openAmount: number; // 0-1, how open the door is
}

export interface GeneratedDoorway {
  frame: THREE.Group;
  portal: THREE.Mesh | null;
  doorPanel: THREE.Mesh | null;
  worldPosition: THREE.Vector3;
  worldRotation: THREE.Euler;
  config: DoorwayConfig;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  setOpenAmount: (amount: number) => void;
  update: (audioLevels: AudioLevelsInput, delta: number, time: number) => void;
  dispose: () => void;
}

interface AudioLevelsInput {
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;
}

export interface DoorwayGeneratorOptions {
  glowIntensityMultiplier?: number;
  frameDetail?: number;
  enablePortalEffect?: boolean;
  enableDoorPanel?: boolean;
}

const DEFAULT_OPTIONS: Required<DoorwayGeneratorOptions> = {
  glowIntensityMultiplier: 1.0,
  frameDetail: 8,
  enablePortalEffect: true,
  enableDoorPanel: true,
};

export class DoorwayGenerator {
  private options: Required<DoorwayGeneratorOptions>;

  constructor(options: DoorwayGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a doorway with frame, glow effect, and optional portal
   */
  generate(config: DoorwayConfig, seed: number): GeneratedDoorway {
    const rng = new SeededRandom(seed);
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];

    // Create frame geometry based on arch type
    const { frameMeshes, frameGeoms, frameMats } = this.createFrame(config, rng);
    frameMeshes.forEach((mesh) => group.add(mesh));
    geometries.push(...frameGeoms);
    materials.push(...frameMats);

    // Create glowing edge effect
    const { glowMeshes, glowGeoms, glowMats } = this.createGlowEdges(config, rng);
    glowMeshes.forEach((mesh) => group.add(mesh));
    geometries.push(...glowGeoms);
    materials.push(...glowMats);

    // Create portal effect if enabled
    let portal: THREE.Mesh | null = null;
    if (this.options.enablePortalEffect) {
      const { portalMesh, portalGeom, portalMat } = this.createPortal(config);
      portal = portalMesh;
      group.add(portalMesh);
      geometries.push(portalGeom);
      materials.push(portalMat);
    }

    // Create door panel if enabled
    let doorPanel: THREE.Mesh | null = null;
    let doorPanelPivot: THREE.Group | null = null;
    if (this.options.enableDoorPanel) {
      const { doorMesh, doorGeom, doorMat, pivotGroup } = this.createDoorPanel(config, rng);
      doorPanel = doorMesh;
      doorPanelPivot = pivotGroup;
      group.add(pivotGroup);
      geometries.push(doorGeom);
      materials.push(doorMat);
    }

    // Calculate world position and rotation
    const { position, rotation } = this.calculateWorldTransform(config);
    group.position.copy(position);
    group.rotation.copy(rotation);

    // Store references for animation
    const glowMaterials = glowMats.filter(
      (m) => m instanceof THREE.MeshBasicMaterial || m instanceof THREE.ShaderMaterial
    );
    const portalMaterial = portal?.material as THREE.ShaderMaterial | null;

    // Current animation state
    let currentGlowIntensity = config.geometry.glowIntensity;
    let currentPulse = 0;
    let currentOpenAmount = config.openAmount;
    let targetOpenAmount = config.openAmount;
    let audioReactiveOpen = 0;

    const doorway: GeneratedDoorway = {
      frame: group,
      portal,
      doorPanel,
      worldPosition: position.clone(),
      worldRotation: rotation.clone(),
      config,
      materials,
      geometries,

      setOpenAmount(amount: number) {
        targetOpenAmount = Math.max(0, Math.min(1, amount));
      },

      update(audioLevels: AudioLevelsInput, delta: number, time: number) {
        // Calculate target glow intensity based on audio
        const bassBoost = 1 + audioLevels.bass * 0.5;
        const transientBoost = audioLevels.transient ? 1.5 : 1.0;
        const targetIntensity =
          config.geometry.glowIntensity * bassBoost * transientBoost;

        // Smooth interpolation
        currentGlowIntensity = THREE.MathUtils.lerp(
          currentGlowIntensity,
          targetIntensity,
          delta * 5
        );

        // Pulse effect
        currentPulse = Math.sin(time * 2) * 0.1 + 0.9;

        // Update glow materials
        for (const mat of glowMaterials) {
          if (mat instanceof THREE.MeshBasicMaterial) {
            const baseColor = new THREE.Color(config.geometry.glowColor);
            baseColor.multiplyScalar(currentGlowIntensity * currentPulse);
            mat.color.copy(baseColor);
          }
        }

        // Update portal shader if present
        if (portalMaterial && portalMaterial.uniforms) {
          portalMaterial.uniforms.u_time.value = time;
          portalMaterial.uniforms.u_bass.value = audioLevels.bass;
          portalMaterial.uniforms.u_mid.value = audioLevels.mid;
          portalMaterial.uniforms.u_high.value = audioLevels.high;
          portalMaterial.uniforms.u_transient.value = audioLevels.transient ? 1.0 : 0.0;
        }

        // Audio-reactive door opening
        // Mid frequencies cause subtle door movement (creepy creaking effect)
        const midInfluence = audioLevels.mid * 0.15;
        // Transients can trigger sudden partial opening/closing
        const transientInfluence = audioLevels.transient ? audioLevels.transientIntensity * 0.2 : 0;

        // Calculate audio-reactive open amount modifier
        audioReactiveOpen = THREE.MathUtils.lerp(
          audioReactiveOpen,
          midInfluence + transientInfluence,
          delta * 3
        );

        // Smooth door opening/closing animation
        const effectiveTarget = Math.min(1, targetOpenAmount + audioReactiveOpen);
        currentOpenAmount = THREE.MathUtils.lerp(currentOpenAmount, effectiveTarget, delta * 4);

        // Update door panel rotation if present
        if (doorPanelPivot) {
          // Door swings open from -5 degrees (slightly ajar) to -95 degrees (fully open)
          const closedAngle = 0;
          const openAngle = -Math.PI * 0.5; // 90 degrees open
          doorPanelPivot.rotation.y = THREE.MathUtils.lerp(closedAngle, openAngle, currentOpenAmount);
        }

        // Update portal visibility based on door open amount
        if (portal) {
          portal.visible = currentOpenAmount > 0.1;
          // Fade portal opacity with door opening
          if (portalMaterial && portalMaterial.uniforms) {
            portalMaterial.opacity = Math.min(1, currentOpenAmount * 2);
          }
        }
      },

      dispose() {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
      },
    };

    return doorway;
  }

  /**
   * Create the doorway frame based on arch type
   */
  private createFrame(
    config: DoorwayConfig,
    rng: SeededRandom
  ): {
    frameMeshes: THREE.Mesh[];
    frameGeoms: THREE.BufferGeometry[];
    frameMats: THREE.Material[];
  } {
    const { placement, geometry } = config;
    const { width, height } = placement;
    const { frameThickness, archType } = geometry;

    // Frame material - dark with subtle color
    const frameMat = new THREE.MeshStandardMaterial({
      color: COLORS.gradientEnd,
      roughness: 0.7,
      metalness: 0.3,
    });

    switch (archType) {
      case 'arched':
        return this.createArchedFrame(width, height, frameThickness, frameMat);
      case 'gothic':
        return this.createGothicFrame(width, height, frameThickness, frameMat);
      case 'irregular':
        return this.createIrregularFrame(width, height, frameThickness, frameMat, rng);
      default:
        return this.createRectangularFrame(width, height, frameThickness, frameMat);
    }
  }

  /**
   * Create a rectangular doorway frame
   */
  private createRectangularFrame(
    width: number,
    height: number,
    thickness: number,
    material: THREE.Material
  ): {
    frameMeshes: THREE.Mesh[];
    frameGeoms: THREE.BufferGeometry[];
    frameMats: THREE.Material[];
  } {
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const depth = 0.15;

    // Left jamb
    const leftJambGeom = new THREE.BoxGeometry(thickness, height, depth);
    const leftJamb = new THREE.Mesh(leftJambGeom, material);
    leftJamb.position.set(-width / 2 - thickness / 2, height / 2, 0);
    meshes.push(leftJamb);
    geoms.push(leftJambGeom);

    // Right jamb
    const rightJambGeom = new THREE.BoxGeometry(thickness, height, depth);
    const rightJamb = new THREE.Mesh(rightJambGeom, material);
    rightJamb.position.set(width / 2 + thickness / 2, height / 2, 0);
    meshes.push(rightJamb);
    geoms.push(rightJambGeom);

    // Header (top)
    const headerGeom = new THREE.BoxGeometry(width + thickness * 2, thickness, depth);
    const header = new THREE.Mesh(headerGeom, material);
    header.position.set(0, height + thickness / 2, 0);
    meshes.push(header);
    geoms.push(headerGeom);

    return { frameMeshes: meshes, frameGeoms: geoms, frameMats: [material] };
  }

  /**
   * Create an arched doorway frame
   */
  private createArchedFrame(
    width: number,
    height: number,
    thickness: number,
    material: THREE.Material
  ): {
    frameMeshes: THREE.Mesh[];
    frameGeoms: THREE.BufferGeometry[];
    frameMats: THREE.Material[];
  } {
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const depth = 0.15;

    // Vertical height (before arch starts)
    const archRadius = width / 2;
    const verticalHeight = height - archRadius;

    // Left jamb
    const leftJambGeom = new THREE.BoxGeometry(thickness, verticalHeight, depth);
    const leftJamb = new THREE.Mesh(leftJambGeom, material);
    leftJamb.position.set(-width / 2 - thickness / 2, verticalHeight / 2, 0);
    meshes.push(leftJamb);
    geoms.push(leftJambGeom);

    // Right jamb
    const rightJambGeom = new THREE.BoxGeometry(thickness, verticalHeight, depth);
    const rightJamb = new THREE.Mesh(rightJambGeom, material);
    rightJamb.position.set(width / 2 + thickness / 2, verticalHeight / 2, 0);
    meshes.push(rightJamb);
    geoms.push(rightJambGeom);

    // Arch (using torus segment)
    const archGeom = new THREE.TorusGeometry(
      archRadius + thickness / 2,
      thickness / 2,
      8,
      16,
      Math.PI
    );
    const arch = new THREE.Mesh(archGeom, material);
    arch.position.set(0, verticalHeight, 0);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    meshes.push(arch);
    geoms.push(archGeom);

    return { frameMeshes: meshes, frameGeoms: geoms, frameMats: [material] };
  }

  /**
   * Create a gothic pointed arch frame
   */
  private createGothicFrame(
    width: number,
    height: number,
    thickness: number,
    material: THREE.Material
  ): {
    frameMeshes: THREE.Mesh[];
    frameGeoms: THREE.BufferGeometry[];
    frameMats: THREE.Material[];
  } {
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const depth = 0.15;

    // Vertical height (before pointed arch starts)
    const archStartHeight = height * 0.6;

    // Left jamb
    const leftJambGeom = new THREE.BoxGeometry(thickness, archStartHeight, depth);
    const leftJamb = new THREE.Mesh(leftJambGeom, material);
    leftJamb.position.set(-width / 2 - thickness / 2, archStartHeight / 2, 0);
    meshes.push(leftJamb);
    geoms.push(leftJambGeom);

    // Right jamb
    const rightJambGeom = new THREE.BoxGeometry(thickness, archStartHeight, depth);
    const rightJamb = new THREE.Mesh(rightJambGeom, material);
    rightJamb.position.set(width / 2 + thickness / 2, archStartHeight / 2, 0);
    meshes.push(rightJamb);
    geoms.push(rightJambGeom);

    // Gothic arch using custom shape
    const archShape = new THREE.Shape();
    const archHeight = height - archStartHeight;
    const halfWidth = width / 2 + thickness;

    // Create pointed arch path
    archShape.moveTo(-halfWidth, 0);
    archShape.lineTo(-halfWidth, archHeight * 0.3);
    // Left curve to peak
    archShape.quadraticCurveTo(-halfWidth * 0.3, archHeight * 0.9, 0, archHeight);
    // Right curve from peak
    archShape.quadraticCurveTo(halfWidth * 0.3, archHeight * 0.9, halfWidth, archHeight * 0.3);
    archShape.lineTo(halfWidth, 0);
    // Inner cutout
    archShape.lineTo(halfWidth - thickness, 0);
    archShape.lineTo(halfWidth - thickness, archHeight * 0.2);
    archShape.quadraticCurveTo(
      (halfWidth - thickness) * 0.3,
      archHeight * 0.8,
      0,
      archHeight - thickness
    );
    archShape.quadraticCurveTo(
      -(halfWidth - thickness) * 0.3,
      archHeight * 0.8,
      -(halfWidth - thickness),
      archHeight * 0.2
    );
    archShape.lineTo(-(halfWidth - thickness), 0);
    archShape.lineTo(-halfWidth, 0);

    const archGeom = new THREE.ExtrudeGeometry(archShape, {
      depth: depth,
      bevelEnabled: false,
    });
    const arch = new THREE.Mesh(archGeom, material);
    arch.position.set(0, archStartHeight, -depth / 2);
    meshes.push(arch);
    geoms.push(archGeom);

    return { frameMeshes: meshes, frameGeoms: geoms, frameMats: [material] };
  }

  /**
   * Create an irregular/warped doorway frame
   */
  private createIrregularFrame(
    width: number,
    height: number,
    thickness: number,
    material: THREE.Material,
    rng: SeededRandom
  ): {
    frameMeshes: THREE.Mesh[];
    frameGeoms: THREE.BufferGeometry[];
    frameMats: THREE.Material[];
  } {
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const depth = 0.15;

    // Create irregular shape using curve
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const warpAmount = 0.2;

    // Outer path with random warping
    const points: THREE.Vector2[] = [];
    const numPoints = 20;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      let x: number, y: number;

      if (t < 0.25) {
        // Left side going up
        x = -halfWidth - thickness + rng.range(-warpAmount, warpAmount) * thickness;
        y = t * 4 * height;
      } else if (t < 0.5) {
        // Top going right
        const tt = (t - 0.25) * 4;
        x = -halfWidth + tt * (width + thickness * 2) + rng.range(-warpAmount, warpAmount) * thickness;
        y = height + thickness + rng.range(-warpAmount, warpAmount) * thickness;
      } else if (t < 0.75) {
        // Right side going down
        x = halfWidth + thickness + rng.range(-warpAmount, warpAmount) * thickness;
        y = height - (t - 0.5) * 4 * height;
      } else {
        // Bottom going left
        const tt = (t - 0.75) * 4;
        x = halfWidth - tt * (width + thickness * 2) + rng.range(-warpAmount, warpAmount) * thickness;
        y = rng.range(-warpAmount, warpAmount) * thickness * 0.5;
      }

      points.push(new THREE.Vector2(x, y));
    }

    // Create shape from points
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();

    // Create hole (inner opening)
    const hole = new THREE.Path();
    hole.moveTo(-halfWidth, 0);
    hole.lineTo(-halfWidth, height);
    hole.lineTo(halfWidth, height);
    hole.lineTo(halfWidth, 0);
    hole.closePath();
    shape.holes.push(hole);

    const frameGeom = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: false,
    });

    const frame = new THREE.Mesh(frameGeom, material);
    frame.position.set(0, 0, -depth / 2);
    meshes.push(frame);
    geoms.push(frameGeom);

    return { frameMeshes: meshes, frameGeoms: geoms, frameMats: [material] };
  }

  /**
   * Create glowing edge effect around the doorway
   */
  private createGlowEdges(
    config: DoorwayConfig,
    _rng: SeededRandom
  ): {
    glowMeshes: THREE.Mesh[];
    glowGeoms: THREE.BufferGeometry[];
    glowMats: THREE.Material[];
  } {
    const { placement, geometry } = config;
    const { width, height } = placement;
    const { glowColor, glowIntensity } = geometry;

    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    // Glow material - emissive with transparency
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.8 * glowIntensity * this.options.glowIntensityMultiplier,
      side: THREE.DoubleSide,
    });
    mats.push(glowMat);

    // Outer glow (larger, more transparent)
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.3 * glowIntensity * this.options.glowIntensityMultiplier,
      side: THREE.DoubleSide,
    });
    mats.push(outerGlowMat);

    const glowWidth = 0.03;
    const outerGlowWidth = 0.08;

    // Inner glow strips
    // Left edge
    const leftGlowGeom = new THREE.PlaneGeometry(glowWidth, height);
    const leftGlow = new THREE.Mesh(leftGlowGeom, glowMat);
    leftGlow.position.set(-width / 2 - glowWidth / 2, height / 2, 0.01);
    meshes.push(leftGlow);
    geoms.push(leftGlowGeom);

    // Right edge
    const rightGlowGeom = new THREE.PlaneGeometry(glowWidth, height);
    const rightGlow = new THREE.Mesh(rightGlowGeom, glowMat);
    rightGlow.position.set(width / 2 + glowWidth / 2, height / 2, 0.01);
    meshes.push(rightGlow);
    geoms.push(rightGlowGeom);

    // Top edge
    const topGlowGeom = new THREE.PlaneGeometry(width, glowWidth);
    const topGlow = new THREE.Mesh(topGlowGeom, glowMat);
    topGlow.position.set(0, height + glowWidth / 2, 0.01);
    meshes.push(topGlow);
    geoms.push(topGlowGeom);

    // Outer glow strips (larger, more diffuse)
    // Left outer
    const leftOuterGeom = new THREE.PlaneGeometry(outerGlowWidth, height + outerGlowWidth);
    const leftOuter = new THREE.Mesh(leftOuterGeom, outerGlowMat);
    leftOuter.position.set(-width / 2 - outerGlowWidth / 2, height / 2, 0.005);
    meshes.push(leftOuter);
    geoms.push(leftOuterGeom);

    // Right outer
    const rightOuterGeom = new THREE.PlaneGeometry(outerGlowWidth, height + outerGlowWidth);
    const rightOuter = new THREE.Mesh(rightOuterGeom, outerGlowMat);
    rightOuter.position.set(width / 2 + outerGlowWidth / 2, height / 2, 0.005);
    meshes.push(rightOuter);
    geoms.push(rightOuterGeom);

    // Top outer
    const topOuterGeom = new THREE.PlaneGeometry(width + outerGlowWidth * 2, outerGlowWidth);
    const topOuter = new THREE.Mesh(topOuterGeom, outerGlowMat);
    topOuter.position.set(0, height + outerGlowWidth / 2, 0.005);
    meshes.push(topOuter);
    geoms.push(topOuterGeom);

    return { glowMeshes: meshes, glowGeoms: geoms, glowMats: mats };
  }

  /**
   * Create a door panel that can swing open/closed
   */
  private createDoorPanel(
    config: DoorwayConfig,
    _rng: SeededRandom
  ): {
    doorMesh: THREE.Mesh;
    doorGeom: THREE.BufferGeometry;
    doorMat: THREE.Material;
    pivotGroup: THREE.Group;
  } {
    const { placement, openAmount } = config;
    const { width, height } = placement;
    const doorThickness = 0.05;

    // Create pivot group for door rotation (hinged on left side)
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(-width / 2, 0, 0); // Pivot at left edge

    // Door geometry
    const doorGeom = new THREE.BoxGeometry(width, height, doorThickness);

    // Door material with subtle wood-like coloring
    const doorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.gradientEnd).multiplyScalar(0.8),
      roughness: 0.8,
      metalness: 0.1,
    });

    const doorMesh = new THREE.Mesh(doorGeom, doorMat);
    // Position door relative to pivot (center of door offset from hinge)
    doorMesh.position.set(width / 2, height / 2, 0);

    // Add door panel detail (simple inset)
    const panelInset = 0.02;
    const panelWidth = width * 0.7;
    const panelHeight = height * 0.3;

    // Top panel
    const topPanelGeom = new THREE.BoxGeometry(panelWidth, panelHeight, panelInset);
    const topPanel = new THREE.Mesh(topPanelGeom, doorMat);
    topPanel.position.set(0, height * 0.2, doorThickness / 2 + panelInset / 2);
    doorMesh.add(topPanel);

    // Bottom panel
    const bottomPanelGeom = new THREE.BoxGeometry(panelWidth, panelHeight, panelInset);
    const bottomPanel = new THREE.Mesh(bottomPanelGeom, doorMat);
    bottomPanel.position.set(0, -height * 0.2, doorThickness / 2 + panelInset / 2);
    doorMesh.add(bottomPanel);

    // Door handle/knob
    const knobGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const knobMat = new THREE.MeshStandardMaterial({
      color: COLORS.secondary,
      roughness: 0.3,
      metalness: 0.7,
    });
    const knob = new THREE.Mesh(knobGeom, knobMat);
    knob.position.set(width * 0.35, 0, doorThickness / 2 + 0.03);
    doorMesh.add(knob);

    pivotGroup.add(doorMesh);

    // Set initial rotation based on open amount
    const closedAngle = 0;
    const openAngle = -Math.PI * 0.5;
    pivotGroup.rotation.y = THREE.MathUtils.lerp(closedAngle, openAngle, openAmount);

    return { doorMesh, doorGeom, doorMat, pivotGroup };
  }

  /**
   * Create portal effect mesh with shader
   */
  private createPortal(config: DoorwayConfig): {
    portalMesh: THREE.Mesh;
    portalGeom: THREE.BufferGeometry;
    portalMat: THREE.ShaderMaterial;
  } {
    const { placement, geometry } = config;
    const { width, height } = placement;

    const portalGeom = new THREE.PlaneGeometry(width, height);

    const portalMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_high: { value: 0 },
        u_transient: { value: 0 },
        u_glowColor: { value: new THREE.Color(geometry.glowColor) },
        u_secondaryColor: { value: new THREE.Color(COLORS.secondary) },
        u_backgroundColor: { value: new THREE.Color(COLORS.background) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_bass;
        uniform float u_mid;
        uniform float u_high;
        uniform float u_transient;
        uniform vec3 u_glowColor;
        uniform vec3 u_secondaryColor;
        uniform vec3 u_backgroundColor;

        varying vec2 vUv;

        // Noise function
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec2 uv = vUv;

          // Center UV
          vec2 centered = uv - 0.5;

          // Distance from center
          float dist = length(centered);

          // Swirling effect modulated by audio
          float angle = atan(centered.y, centered.x);
          float swirl = sin(angle * 3.0 + u_time * 2.0 + dist * 10.0 * (1.0 + u_bass));

          // Noise-based distortion
          float n = noise(uv * 5.0 + u_time * 0.5);
          n += noise(uv * 10.0 - u_time * 0.3) * 0.5;

          // Edge glow
          float edgeGlow = smoothstep(0.5, 0.3, dist);
          float outerGlow = smoothstep(0.5, 0.0, dist) * 0.3;

          // Color mixing based on depth and audio
          vec3 color = u_backgroundColor;
          color = mix(color, u_glowColor, edgeGlow * (0.3 + u_mid * 0.5));
          color = mix(color, u_secondaryColor, swirl * 0.1 * (1.0 + u_high));

          // Add noise texture
          color += vec3(n * 0.05);

          // Transient flash
          color += vec3(u_transient * 0.2);

          // Vignette towards center (darker in middle = depth illusion)
          float vignette = smoothstep(0.0, 0.4, dist);
          color *= 0.3 + vignette * 0.7;

          // Alpha based on edge proximity
          float alpha = outerGlow + edgeGlow * 0.7;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const portalMesh = new THREE.Mesh(portalGeom, portalMat);
    portalMesh.position.set(0, height / 2, -0.05); // Slightly behind frame

    return { portalMesh, portalGeom, portalMat };
  }

  /**
   * Calculate world position and rotation based on wall placement
   */
  private calculateWorldTransform(config: DoorwayConfig): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  } {
    const { placement, roomDimensions } = config;
    const { wall, position: wallPosition } = placement;
    const { width, depth } = roomDimensions;

    let x = 0;
    let z = 0;
    let rotationY = 0;

    // Calculate position based on wall
    switch (wall) {
      case 'north':
        x = (wallPosition - 0.5) * width;
        z = -depth / 2;
        rotationY = 0;
        break;
      case 'south':
        x = (wallPosition - 0.5) * width;
        z = depth / 2;
        rotationY = Math.PI;
        break;
      case 'east':
        x = width / 2;
        z = (wallPosition - 0.5) * depth;
        rotationY = -Math.PI / 2;
        break;
      case 'west':
        x = -width / 2;
        z = (wallPosition - 0.5) * depth;
        rotationY = Math.PI / 2;
        break;
    }

    return {
      position: new THREE.Vector3(x, 0, z),
      rotation: new THREE.Euler(0, rotationY, 0),
    };
  }
}

export default DoorwayGenerator;
