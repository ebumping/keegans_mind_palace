/**
 * Hallway Component
 *
 * Creates infinite hallway segments with audio-reactive extension/contraction
 * and non-euclidean "impossible geometry" effects where the interior appears
 * longer than the doorway suggests.
 */

import * as THREE from 'three';
import { SeededRandom, getAbnormalityFactor } from '../utils/seededRandom';
import type { Wall, RoomDimensions } from '../types/room';

// Pale-strata color palette
const COLORS = {
  primary: '#c792f5',
  secondary: '#8eecf5',
  background: '#1a1834',
  gradientStart: '#3a3861',
  gradientEnd: '#2c2c4b',
  fogColor: '#211f3c',
};

interface AudioLevels {
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;
}

export interface HallwayConfig {
  width: number;
  height: number;
  baseDepth: number; // Base depth before audio modulation
  segments: number; // Number of segments for geometry
  wall: Wall; // Which wall the hallway extends from
  position: number; // Position along wall (0-1)
  roomDimensions: RoomDimensions;
  seed: number;
  impossibleScale: number; // How much longer inside than outside (1.0 = normal, 2.0 = twice as long)
}

export interface GeneratedHallway {
  mesh: THREE.Group;
  boundingBox: THREE.Box3;
  config: HallwayConfig;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  currentDepth: number;
  update: (audioLevels: AudioLevels, delta: number, time: number) => void;
  dispose: () => void;
}

export class HallwayGenerator {
  /**
   * Generate a hallway segment that extends/contracts with audio
   */
  generate(config: HallwayConfig): GeneratedHallway {
    const rng = new SeededRandom(config.seed);
    const group = new THREE.Group();
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];

    // Calculate initial depth with impossible geometry scaling
    const effectiveDepth = config.baseDepth * config.impossibleScale;

    // Create hallway walls, floor, ceiling
    const { wallMeshes, wallGeoms, wallMats } = this.createWalls(config, effectiveDepth, rng);
    wallMeshes.forEach((mesh) => group.add(mesh));
    geometries.push(...wallGeoms);
    materials.push(...wallMats);

    const { floorMesh, floorGeom, floorMat } = this.createFloor(config, effectiveDepth, rng);
    group.add(floorMesh);
    geometries.push(floorGeom);
    materials.push(floorMat);

    const { ceilingMesh, ceilingGeom, ceilingMat } = this.createCeiling(config, effectiveDepth, rng);
    group.add(ceilingMesh);
    geometries.push(ceilingGeom);
    materials.push(ceilingMat);

    // Add depth fog plane at the end
    const { fogMesh, fogGeom, fogMat } = this.createDepthFog(config, effectiveDepth);
    group.add(fogMesh);
    geometries.push(fogGeom);
    materials.push(fogMat);

    // Add ambient lighting strips
    const { lightMeshes, lightGeoms, lightMats } = this.createLightStrips(config, effectiveDepth, rng);
    lightMeshes.forEach((mesh) => group.add(mesh));
    geometries.push(...lightGeoms);
    materials.push(...lightMats);

    // Position and rotate based on wall
    const { position, rotation } = this.calculateWorldTransform(config);
    group.position.copy(position);
    group.rotation.copy(rotation);

    // Store references for animation
    const wallMaterials = wallMats.filter((m) => m instanceof THREE.ShaderMaterial);
    const fogMaterial = fogMat as THREE.ShaderMaterial;

    // Animation state
    let currentDepth = effectiveDepth;
    let targetDepth = effectiveDepth;
    let breathePhase = 0;

    const boundingBox = new THREE.Box3().setFromObject(group);

    const hallway: GeneratedHallway = {
      mesh: group,
      boundingBox,
      config,
      materials,
      geometries,
      currentDepth: effectiveDepth,

      update(audioLevels: AudioLevels, delta: number, time: number) {
        // Bass-reactive depth extension/contraction
        const bassModulation = 1 + audioLevels.bass * 0.3;
        targetDepth = config.baseDepth * config.impossibleScale * bassModulation;

        // Smooth interpolation
        currentDepth = THREE.MathUtils.lerp(currentDepth, targetDepth, delta * 2);
        hallway.currentDepth = currentDepth;

        // Breathing effect on walls
        breathePhase += delta * 2;
        const breathe = Math.sin(breathePhase) * audioLevels.bass * 0.02;

        // Update shader materials
        for (const mat of wallMaterials) {
          if (mat instanceof THREE.ShaderMaterial && mat.uniforms) {
            mat.uniforms.u_time.value = time;
            mat.uniforms.u_bass.value = audioLevels.bass;
            mat.uniforms.u_mid.value = audioLevels.mid;
            mat.uniforms.u_high.value = audioLevels.high;
            mat.uniforms.u_breathe.value = breathe;
            mat.uniforms.u_depth.value = currentDepth;
          }
        }

        // Update fog material
        if (fogMaterial.uniforms) {
          fogMaterial.uniforms.u_time.value = time;
          fogMaterial.uniforms.u_intensity.value = 0.8 + audioLevels.bass * 0.2;
        }

        // Scale group to simulate depth change
        const depthScale = currentDepth / effectiveDepth;
        group.scale.z = depthScale;
      },

      dispose() {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
      },
    };

    return hallway;
  }

  /**
   * Create hallway walls with audio-reactive shader
   */
  private createWalls(
    config: HallwayConfig,
    depth: number,
    rng: SeededRandom
  ): {
    wallMeshes: THREE.Mesh[];
    wallGeoms: THREE.BufferGeometry[];
    wallMats: THREE.Material[];
  } {
    const { width, height, segments } = config;
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    // Wall shader material with audio reactivity
    const wallShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_high: { value: 0 },
        u_breathe: { value: 0 },
        u_depth: { value: depth },
        u_colorStart: { value: new THREE.Color(COLORS.gradientStart) },
        u_colorEnd: { value: new THREE.Color(COLORS.gradientEnd) },
        u_glowColor: { value: new THREE.Color(COLORS.primary) },
        u_seed: { value: rng.next() * 1000 },
      },
      vertexShader: `
        uniform float u_time;
        uniform float u_bass;
        uniform float u_breathe;
        uniform float u_depth;

        varying vec2 vUv;
        varying float vDepthProgress;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normal;
          vPosition = position;

          // Depth progress (0 at entrance, 1 at back)
          vDepthProgress = clamp(-position.z / u_depth, 0.0, 1.0);

          // Breathing displacement - walls contract/expand with bass
          vec3 displaced = position;
          displaced.x += normal.x * u_breathe * (1.0 + vDepthProgress);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_bass;
        uniform float u_mid;
        uniform float u_high;
        uniform float u_depth;
        uniform vec3 u_colorStart;
        uniform vec3 u_colorEnd;
        uniform vec3 u_glowColor;
        uniform float u_seed;

        varying vec2 vUv;
        varying float vDepthProgress;
        varying vec3 vNormal;
        varying vec3 vPosition;

        // Simple noise function
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
          // Base color gradient - darker as you go deeper
          vec3 baseColor = mix(u_colorStart, u_colorEnd, vDepthProgress * 0.7);

          // Panel/tile pattern
          vec2 tileUV = vUv * vec2(4.0, 8.0);
          float tilePattern = step(0.02, mod(tileUV.x, 1.0)) * step(0.02, mod(tileUV.y, 1.0));
          baseColor *= 0.95 + tilePattern * 0.05;

          // Audio-reactive color pulse
          float pulse = sin(vDepthProgress * 10.0 - u_time * 2.0) * 0.5 + 0.5;
          vec3 glowEffect = u_glowColor * pulse * u_mid * 0.2 * (1.0 - vDepthProgress);
          baseColor += glowEffect;

          // Subtle noise texture
          float n = noise(vUv * 50.0 + u_seed);
          baseColor += vec3(n * 0.03);

          // Depth fog effect - fade to background color
          float fog = smoothstep(0.3, 1.0, vDepthProgress);
          baseColor = mix(baseColor, u_colorEnd * 0.5, fog);

          // Edge highlighting based on normal
          float edgeLight = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
          baseColor += u_glowColor * edgeLight * 0.1 * (1.0 + u_bass);

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    mats.push(wallShaderMat);

    // Left wall
    const leftWallGeom = new THREE.PlaneGeometry(depth, height, segments, segments);
    this.orientPlaneForWall(leftWallGeom, 'left', depth, height);
    const leftWall = new THREE.Mesh(leftWallGeom, wallShaderMat);
    leftWall.position.set(-width / 2, height / 2, -depth / 2);
    meshes.push(leftWall);
    geoms.push(leftWallGeom);

    // Right wall
    const rightWallGeom = new THREE.PlaneGeometry(depth, height, segments, segments);
    this.orientPlaneForWall(rightWallGeom, 'right', depth, height);
    const rightWall = new THREE.Mesh(rightWallGeom, wallShaderMat);
    rightWall.position.set(width / 2, height / 2, -depth / 2);
    meshes.push(rightWall);
    geoms.push(rightWallGeom);

    return { wallMeshes: meshes, wallGeoms: geoms, wallMats: mats };
  }

  /**
   * Orient plane geometry for specific wall direction
   */
  private orientPlaneForWall(
    geometry: THREE.PlaneGeometry,
    side: 'left' | 'right',
    depth: number,
    height: number
  ): void {
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      // Original: x, y in plane space
      const u = (positions[i] / depth) + 0.5; // 0-1 along depth
      const v = (positions[i + 1] / height) + 0.5; // 0-1 along height

      // Transform to wall space
      positions[i] = 0; // x = 0 (wall is on YZ plane)
      positions[i + 1] = v * height; // y
      positions[i + 2] = -(u * depth); // z (negative = going into hallway)
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    // Flip normals for correct facing
    if (side === 'left') {
      const normalAttribute = geometry.getAttribute('normal');
      const normals = normalAttribute.array as Float32Array;
      for (let i = 0; i < normals.length; i += 3) {
        normals[i] = 1; // Face right (+x)
        normals[i + 1] = 0;
        normals[i + 2] = 0;
      }
      normalAttribute.needsUpdate = true;
    } else {
      const normalAttribute = geometry.getAttribute('normal');
      const normals = normalAttribute.array as Float32Array;
      for (let i = 0; i < normals.length; i += 3) {
        normals[i] = -1; // Face left (-x)
        normals[i + 1] = 0;
        normals[i + 2] = 0;
      }
      normalAttribute.needsUpdate = true;
    }
  }

  /**
   * Create hallway floor
   */
  private createFloor(
    config: HallwayConfig,
    depth: number,
    rng: SeededRandom
  ): {
    floorMesh: THREE.Mesh;
    floorGeom: THREE.BufferGeometry;
    floorMat: THREE.Material;
  } {
    const { width, segments } = config;

    const floorGeom = new THREE.PlaneGeometry(width, depth, segments, segments);

    const floorMat = new THREE.MeshStandardMaterial({
      color: COLORS.gradientEnd,
      roughness: 0.8,
      metalness: 0.1,
    });

    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -depth / 2);

    return { floorMesh, floorGeom, floorMat };
  }

  /**
   * Create hallway ceiling
   */
  private createCeiling(
    config: HallwayConfig,
    depth: number,
    rng: SeededRandom
  ): {
    ceilingMesh: THREE.Mesh;
    ceilingGeom: THREE.BufferGeometry;
    ceilingMat: THREE.Material;
  } {
    const { width, height, segments } = config;

    const ceilingGeom = new THREE.PlaneGeometry(width, depth, segments, segments);

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: COLORS.gradientEnd,
      roughness: 0.9,
      metalness: 0.05,
    });

    const ceilingMesh = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(0, height, -depth / 2);

    return { ceilingMesh, ceilingGeom, ceilingMat };
  }

  /**
   * Create depth fog plane at the end of the hallway
   */
  private createDepthFog(
    config: HallwayConfig,
    depth: number
  ): {
    fogMesh: THREE.Mesh;
    fogGeom: THREE.BufferGeometry;
    fogMat: THREE.ShaderMaterial;
  } {
    const { width, height } = config;

    const fogGeom = new THREE.PlaneGeometry(width * 1.5, height * 1.5);

    const fogMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_intensity: { value: 0.8 },
        u_color: { value: new THREE.Color(COLORS.fogColor) },
        u_glowColor: { value: new THREE.Color(COLORS.primary) },
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
        uniform float u_intensity;
        uniform vec3 u_color;
        uniform vec3 u_glowColor;

        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec2 centered = vUv - 0.5;
          float dist = length(centered);

          // Radial gradient
          float alpha = smoothstep(0.0, 0.7, dist) * u_intensity;

          // Add some noise for texture
          float n = hash(vUv * 100.0 + u_time * 0.1);

          // Subtle color variation
          vec3 color = mix(u_color, u_glowColor, n * 0.1);

          // Darken at edges
          color *= (1.0 - dist * 0.5);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const fogMesh = new THREE.Mesh(fogGeom, fogMat);
    fogMesh.position.set(0, height / 2, -depth);

    return { fogMesh, fogGeom, fogMat };
  }

  /**
   * Create ambient light strips along the hallway
   */
  private createLightStrips(
    config: HallwayConfig,
    depth: number,
    rng: SeededRandom
  ): {
    lightMeshes: THREE.Mesh[];
    lightGeoms: THREE.BufferGeometry[];
    lightMats: THREE.Material[];
  } {
    const { width, height } = config;
    const meshes: THREE.Mesh[] = [];
    const geoms: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    // Light strip material
    const lightMat = new THREE.MeshBasicMaterial({
      color: COLORS.primary,
      transparent: true,
      opacity: 0.6,
    });
    mats.push(lightMat);

    const stripWidth = 0.05;
    const stripHeight = depth;

    // Left ceiling edge light
    const leftLightGeom = new THREE.PlaneGeometry(stripWidth, stripHeight);
    const leftLight = new THREE.Mesh(leftLightGeom, lightMat);
    leftLight.rotation.x = -Math.PI / 2;
    leftLight.position.set(-width / 2 + stripWidth / 2, height - 0.01, -depth / 2);
    meshes.push(leftLight);
    geoms.push(leftLightGeom);

    // Right ceiling edge light
    const rightLightGeom = new THREE.PlaneGeometry(stripWidth, stripHeight);
    const rightLight = new THREE.Mesh(rightLightGeom, lightMat);
    rightLight.rotation.x = -Math.PI / 2;
    rightLight.position.set(width / 2 - stripWidth / 2, height - 0.01, -depth / 2);
    meshes.push(rightLight);
    geoms.push(rightLightGeom);

    return { lightMeshes: meshes, lightGeoms: geoms, lightMats: mats };
  }

  /**
   * Calculate world position and rotation based on wall
   */
  private calculateWorldTransform(config: HallwayConfig): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  } {
    const { wall, position: wallPosition, roomDimensions } = config;
    const { width: roomWidth, depth: roomDepth } = roomDimensions;

    let x = 0;
    let z = 0;
    let rotationY = 0;

    switch (wall) {
      case 'north':
        x = (wallPosition - 0.5) * roomWidth;
        z = -roomDepth / 2;
        rotationY = 0;
        break;
      case 'south':
        x = (wallPosition - 0.5) * roomWidth;
        z = roomDepth / 2;
        rotationY = Math.PI;
        break;
      case 'east':
        x = roomWidth / 2;
        z = (wallPosition - 0.5) * roomDepth;
        rotationY = -Math.PI / 2;
        break;
      case 'west':
        x = -roomWidth / 2;
        z = (wallPosition - 0.5) * roomDepth;
        rotationY = Math.PI / 2;
        break;
    }

    return {
      position: new THREE.Vector3(x, 0, z),
      rotation: new THREE.Euler(0, rotationY, 0),
    };
  }
}

/**
 * Create a hallway from a doorway configuration
 */
export function createHallwayFromDoorway(
  doorwayPlacement: {
    wall: Wall;
    position: number;
    width: number;
    height: number;
    leadsTo: number;
  },
  roomDimensions: RoomDimensions,
  seed: number,
  options?: {
    baseDepth?: number;
    impossibleScale?: number;
    segments?: number;
  }
): GeneratedHallway {
  const abnormality = getAbnormalityFactor(doorwayPlacement.leadsTo);

  const config: HallwayConfig = {
    width: doorwayPlacement.width,
    height: doorwayPlacement.height,
    baseDepth: options?.baseDepth ?? 3,
    segments: options?.segments ?? 8,
    wall: doorwayPlacement.wall,
    position: doorwayPlacement.position,
    roomDimensions,
    seed,
    // Scale increases with depth/abnormality - deeper rooms have more impossible geometry
    impossibleScale: options?.impossibleScale ?? (1.5 + abnormality * 1.5),
  };

  const generator = new HallwayGenerator();
  return generator.generate(config);
}

export default HallwayGenerator;
