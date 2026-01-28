# Circuitry Patterns and Glitch Effects Specification

## Overview

This specification covers two interconnected visual systems that add layers of technological eeriness to the Mind Palace:

1. **Circuitry Pattern Overlay**: Procedurally generated circuit traces that appear on walls and floors in some rooms, pulsing with audio-reactive light
2. **Glitch Animation System**: Screen-space and world-space distortion effects triggered by audio transients and time-based intensity

Both systems increase in frequency and intensity as the Growl system escalates.

---

## Part 1: Circuitry Pattern Overlay

### Concept

Random rooms (15-25% chance) feature glowing circuit trace patterns overlaid on surfaces. These traces:
- Pulse with audio frequency data
- Flow with animated "data" movement
- Become more common in deeper rooms
- Use the cyan accent color (`#8eecf5`) from the pale-strata palette

The effect suggests the Mind Palace is not just a physical space but a digital construct that occasionally reveals its underlying nature.

---

### Spawn Probability

```typescript
interface CircuitrySpawnConfig {
  baseChance: number;       // 0.15-0.25
  depthMultiplier: number;  // Increases with room depth
  growlBonus: number;       // Bonus from Growl intensity
}

function calculateCircuitryChance(
  depth: number,
  growlIntensity: number
): number {
  const baseChance = 0.20;  // 20% base

  // Depth bonus: +1% per 5 rooms, capped at +15%
  const depthBonus = Math.min(depth / 5 * 0.01, 0.15);

  // Growl bonus: up to +10% at max intensity
  const growlBonus = growlIntensity * 0.10;

  // Total chance capped at 60%
  return Math.min(baseChance + depthBonus + growlBonus, 0.60);
}

function shouldSpawnCircuitry(
  roomSeed: number,
  depth: number,
  growlIntensity: number
): boolean {
  const random = new SeededRandom(roomSeed + 7331);  // Offset for this check
  const chance = calculateCircuitryChance(depth, growlIntensity);
  return random.next() < chance;
}
```

---

### Circuit Trace Generation

#### Voronoi-Grid Hybrid Algorithm

```typescript
interface CircuitNode {
  position: THREE.Vector2;
  connections: number[];  // Indices of connected nodes
  type: 'junction' | 'endpoint' | 'component';
}

interface CircuitTrace {
  nodes: CircuitNode[];
  pathSegments: PathSegment[];
  componentLocations: ComponentLocation[];
}

interface PathSegment {
  start: THREE.Vector2;
  end: THREE.Vector2;
  width: number;
  glowIntensity: number;
}

interface ComponentLocation {
  position: THREE.Vector2;
  type: 'chip' | 'capacitor' | 'resistor' | 'node';
  size: number;
}

class CircuitryGenerator {
  private gridSize: number;
  private noiseScale: number;

  constructor(gridSize: number = 32, noiseScale: number = 0.1) {
    this.gridSize = gridSize;
    this.noiseScale = noiseScale;
  }

  generate(
    width: number,
    height: number,
    seed: number,
    density: number = 0.5  // 0-1
  ): CircuitTrace {
    const random = new SeededRandom(seed);
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
        if (random.next() < density * noiseValue) {
          nodes.push({
            position: new THREE.Vector2(
              (x + 0.5) * cellWidth,
              (y + 0.5) * cellHeight
            ),
            connections: [],
            type: this.selectNodeType(random)
          });
        }
      }
    }

    // Step 2: Connect nodes using Manhattan paths
    for (let i = 0; i < nodes.length; i++) {
      // Find nearest neighbors (up to 3)
      const neighbors = this.findNearestNeighbors(nodes, i, 3);

      for (const neighborIndex of neighbors) {
        if (!nodes[i].connections.includes(neighborIndex)) {
          nodes[i].connections.push(neighborIndex);
          nodes[neighborIndex].connections.push(i);

          // Create Manhattan path (right-angle traces)
          const segments = this.createManhattanPath(
            nodes[i].position,
            nodes[neighborIndex].position,
            random
          );
          pathSegments.push(...segments);
        }
      }
    }

    // Step 3: Place components at junctions
    for (const node of nodes) {
      if (node.type !== 'endpoint' && random.next() < 0.3) {
        componentLocations.push({
          position: node.position.clone(),
          type: this.selectComponentType(random),
          size: 0.02 + random.next() * 0.03
        });
      }
    }

    return { nodes, pathSegments, componentLocations };
  }

  private createManhattanPath(
    start: THREE.Vector2,
    end: THREE.Vector2,
    random: SeededRandom
  ): PathSegment[] {
    const segments: PathSegment[] = [];
    const midX = random.next() > 0.5 ? end.x : start.x;
    const midY = random.next() > 0.5 ? start.y : end.y;

    // First segment (horizontal or vertical)
    if (Math.abs(start.x - midX) > 0.001) {
      segments.push({
        start: start.clone(),
        end: new THREE.Vector2(midX, start.y),
        width: 0.003 + random.next() * 0.002,
        glowIntensity: 0.5 + random.next() * 0.5
      });
    }

    // Second segment (perpendicular)
    if (Math.abs(start.y - midY) > 0.001 || Math.abs(midY - end.y) > 0.001) {
      segments.push({
        start: new THREE.Vector2(midX, start.y),
        end: new THREE.Vector2(midX, end.y),
        width: 0.003 + random.next() * 0.002,
        glowIntensity: 0.5 + random.next() * 0.5
      });
    }

    // Third segment (to end)
    if (Math.abs(midX - end.x) > 0.001) {
      segments.push({
        start: new THREE.Vector2(midX, end.y),
        end: end.clone(),
        width: 0.003 + random.next() * 0.002,
        glowIntensity: 0.5 + random.next() * 0.5
      });
    }

    return segments;
  }

  private selectNodeType(random: SeededRandom): 'junction' | 'endpoint' | 'component' {
    const r = random.next();
    if (r < 0.6) return 'junction';
    if (r < 0.85) return 'component';
    return 'endpoint';
  }

  private selectComponentType(random: SeededRandom): 'chip' | 'capacitor' | 'resistor' | 'node' {
    const types: ('chip' | 'capacitor' | 'resistor' | 'node')[] = ['chip', 'capacitor', 'resistor', 'node'];
    return types[Math.floor(random.next() * types.length)];
  }

  private findNearestNeighbors(nodes: CircuitNode[], index: number, count: number): number[] {
    const distances: { index: number; distance: number }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      if (i === index) continue;
      const dist = nodes[index].position.distanceTo(nodes[i].position);
      distances.push({ index: i, distance: dist });
    }

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map(d => d.index);
  }

  private sampleNoise(x: number, y: number, seed: number): number {
    // Simple pseudo-noise based on position and seed
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n));
  }
}
```

---

### Circuit Shader

#### Vertex Shader (circuitry.vert)

```glsl
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

#### Fragment Shader (circuitry.frag)

```glsl
precision highp float;

// Audio uniforms
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_time;

// Circuit uniforms
uniform sampler2D u_circuitTexture;  // Precomputed circuit trace texture
uniform float u_glowIntensity;
uniform float u_dataFlowSpeed;

// Colors
uniform vec3 u_circuitColor;      // #8eecf5 (cyan)
uniform vec3 u_glowColor;         // #c792f5 (purple)
uniform vec3 u_backgroundColor;   // Underlying surface color

varying vec2 vUv;
varying vec3 vWorldPosition;

// Data flow animation
float dataFlow(vec2 uv, float time, float speed) {
  // Create flowing pulses along traces
  float flow = fract(uv.x * 10.0 - time * speed);
  flow = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);
  return flow;
}

// Circuit trace glow
float traceGlow(float traceValue, float intensity) {
  // Soft glow around traces
  float glow = pow(traceValue, 0.5) * intensity;
  return glow;
}

void main() {
  // Sample circuit texture (R = trace, G = component, B = junction)
  vec4 circuit = texture2D(u_circuitTexture, vUv);

  // Base trace visibility
  float traceIntensity = circuit.r;
  float componentIntensity = circuit.g;
  float junctionIntensity = circuit.b;

  // Audio-reactive pulse
  float audioPulse = u_bass * 0.5 + u_mid * 0.3 + u_high * 0.2;
  audioPulse = 0.5 + audioPulse * 0.5;  // Normalize to 0.5-1.0

  // Data flow animation
  float flow = dataFlow(vUv, u_time, u_dataFlowSpeed);

  // Combine trace with flow
  float traceBrightness = traceIntensity * (0.3 + flow * 0.7) * audioPulse;

  // Component pulsing (different rhythm)
  float componentPulse = sin(u_time * 2.0 + vUv.x * 5.0) * 0.5 + 0.5;
  float componentBrightness = componentIntensity * componentPulse * u_mid;

  // Junction nodes (react to high frequencies)
  float junctionBrightness = junctionIntensity * (0.5 + u_high * 0.5);

  // Combine all elements
  float totalBrightness = traceBrightness + componentBrightness + junctionBrightness;

  // Glow effect
  float glow = traceGlow(totalBrightness, u_glowIntensity);

  // Color mixing
  vec3 traceColor = mix(u_circuitColor, u_glowColor, flow);
  vec3 finalColor = u_backgroundColor + traceColor * totalBrightness;

  // Add glow halo
  finalColor += u_glowColor * glow * 0.3;

  gl_FragColor = vec4(finalColor, 1.0);
}
```

---

### Circuit Texture Generation

```typescript
class CircuitTextureGenerator {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  constructor(resolution: number = 1024) {
    this.canvas = new OffscreenCanvas(resolution, resolution);
    this.ctx = this.canvas.getContext('2d')!;
  }

  generateTexture(trace: CircuitTrace): THREE.Texture {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw traces (Red channel)
    this.ctx.strokeStyle = 'rgb(255, 0, 0)';
    this.ctx.lineCap = 'round';

    for (const segment of trace.pathSegments) {
      this.ctx.lineWidth = segment.width * width;
      this.ctx.globalAlpha = segment.glowIntensity;
      this.ctx.beginPath();
      this.ctx.moveTo(segment.start.x * width, segment.start.y * height);
      this.ctx.lineTo(segment.end.x * width, segment.end.y * height);
      this.ctx.stroke();
    }

    // Draw components (Green channel)
    for (const component of trace.componentLocations) {
      this.drawComponent(component, width, height);
    }

    // Draw junctions (Blue channel)
    this.ctx.fillStyle = 'rgb(0, 0, 255)';
    for (const node of trace.nodes) {
      if (node.type === 'junction' && node.connections.length >= 2) {
        this.ctx.beginPath();
        this.ctx.arc(
          node.position.x * width,
          node.position.y * height,
          3,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }
    }

    // Create Three.js texture
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const texture = new THREE.DataTexture(
      imageData.data,
      width,
      height,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;

    return texture;
  }

  private drawComponent(
    component: ComponentLocation,
    width: number,
    height: number
  ): void {
    const x = component.position.x * width;
    const y = component.position.y * height;
    const size = component.size * width;

    this.ctx.fillStyle = 'rgb(0, 255, 0)';

    switch (component.type) {
      case 'chip':
        // Rectangle with pins
        this.ctx.fillRect(x - size, y - size / 2, size * 2, size);
        break;
      case 'capacitor':
        // Two parallel lines
        this.ctx.fillRect(x - size / 4, y - size / 2, size / 2, size);
        break;
      case 'resistor':
        // Zigzag shape (simplified as rectangle)
        this.ctx.fillRect(x - size, y - size / 4, size * 2, size / 2);
        break;
      case 'node':
        // Circle
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }
}
```

---

## Part 2: Glitch Animation System

### Concept

Glitch effects are triggered by:
1. **Audio transients**: Sudden peaks in audio cause immediate glitches
2. **Time-based chance**: Probability increases with Growl intensity
3. **Random events**: Occasional unpredictable glitches

Glitch types range from subtle screen artifacts to full reality-breaking distortions.

---

### Glitch Trigger System

```typescript
interface GlitchTrigger {
  type: 'transient' | 'time' | 'random';
  intensity: number;  // 0-1
  duration: number;   // Milliseconds
}

interface GlitchState {
  active: boolean;
  currentGlitch: GlitchType | null;
  intensity: number;
  remainingDuration: number;
  cooldown: number;
}

type GlitchType =
  | 'screen_tear'
  | 'rgb_split'
  | 'geometry_jitter'
  | 'color_inversion'
  | 'uv_distortion'
  | 'reality_break';

class GlitchTriggerSystem {
  private state: GlitchState = {
    active: false,
    currentGlitch: null,
    intensity: 0,
    remainingDuration: 0,
    cooldown: 0
  };

  private minCooldown: number = 500;  // ms between glitches

  update(
    delta: number,
    transientLevel: number,
    growlIntensity: number,
    audioLevel: number
  ): GlitchState {
    // Reduce cooldown
    this.state.cooldown = Math.max(0, this.state.cooldown - delta * 1000);

    // If glitch active, reduce duration
    if (this.state.active) {
      this.state.remainingDuration -= delta * 1000;
      if (this.state.remainingDuration <= 0) {
        this.endGlitch();
      }
      return this.state;
    }

    // Check for triggers (only if not on cooldown)
    if (this.state.cooldown <= 0) {
      const trigger = this.checkTriggers(transientLevel, growlIntensity, audioLevel);
      if (trigger) {
        this.startGlitch(trigger);
      }
    }

    return this.state;
  }

  private checkTriggers(
    transient: number,
    growl: number,
    audio: number
  ): GlitchTrigger | null {
    // Transient trigger (immediate response to audio peaks)
    if (transient > 0.7) {
      return {
        type: 'transient',
        intensity: transient,
        duration: 50 + transient * 150  // 50-200ms
      };
    }

    // Time-based trigger (scales with Growl)
    const timeChance = growl * 0.002;  // Up to 0.2% per frame at max Growl
    if (Math.random() < timeChance) {
      return {
        type: 'time',
        intensity: 0.3 + growl * 0.5,
        duration: 100 + growl * 400  // 100-500ms
      };
    }

    // Random trigger (rare but can happen anytime)
    if (Math.random() < 0.0005) {  // ~0.05% per frame
      return {
        type: 'random',
        intensity: 0.2 + Math.random() * 0.3,
        duration: 50 + Math.random() * 100
      };
    }

    return null;
  }

  private startGlitch(trigger: GlitchTrigger): void {
    this.state.active = true;
    this.state.intensity = trigger.intensity;
    this.state.remainingDuration = trigger.duration;
    this.state.currentGlitch = this.selectGlitchType(trigger);
    this.state.cooldown = this.minCooldown;
  }

  private endGlitch(): void {
    this.state.active = false;
    this.state.currentGlitch = null;
    this.state.intensity = 0;
    this.state.remainingDuration = 0;
  }

  private selectGlitchType(trigger: GlitchTrigger): GlitchType {
    // Weight selection based on trigger type and intensity
    const weights: Record<GlitchType, number> = {
      'screen_tear': trigger.type === 'transient' ? 0.4 : 0.2,
      'rgb_split': 0.25,
      'geometry_jitter': trigger.type === 'transient' ? 0.2 : 0.1,
      'color_inversion': 0.15,
      'uv_distortion': 0.15,
      'reality_break': trigger.intensity > 0.8 ? 0.15 : 0.02
    };

    // Weighted random selection
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return type as GlitchType;
    }

    return 'screen_tear';  // Fallback
  }
}
```

---

### Glitch Shader

#### Post-Processing Glitch Fragment Shader (glitch.frag)

```glsl
precision highp float;

uniform sampler2D u_sceneTexture;
uniform float u_time;
uniform float u_glitchIntensity;
uniform int u_glitchType;  // 0-5 matching GlitchType enum

uniform vec2 u_resolution;

varying vec2 vUv;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Screen tear effect
vec3 screenTear(vec2 uv, float intensity) {
  float tearY = fract(u_time * 5.0);
  float tearHeight = 0.05 + intensity * 0.1;

  if (abs(uv.y - tearY) < tearHeight) {
    // Horizontal displacement
    float displacement = (random(vec2(floor(uv.y * 100.0), u_time)) - 0.5) * intensity * 0.1;
    uv.x = fract(uv.x + displacement);
  }

  return texture2D(u_sceneTexture, uv).rgb;
}

// RGB channel separation
vec3 rgbSplit(vec2 uv, float intensity) {
  float offset = intensity * 0.02;

  // Random direction for split
  float angle = random(vec2(floor(u_time * 10.0), 0.0)) * 3.14159 * 2.0;
  vec2 dir = vec2(cos(angle), sin(angle));

  float r = texture2D(u_sceneTexture, uv + dir * offset).r;
  float g = texture2D(u_sceneTexture, uv).g;
  float b = texture2D(u_sceneTexture, uv - dir * offset).b;

  return vec3(r, g, b);
}

// UV distortion
vec3 uvDistortion(vec2 uv, float intensity) {
  // Wave distortion
  float wave = sin(uv.y * 50.0 + u_time * 10.0) * intensity * 0.02;
  uv.x += wave;

  // Block displacement
  vec2 block = floor(uv * 20.0);
  if (random(block + floor(u_time * 5.0)) > 0.95) {
    uv += (vec2(random(block), random(block + 1.0)) - 0.5) * intensity * 0.1;
  }

  return texture2D(u_sceneTexture, uv).rgb;
}

// Color inversion (partial)
vec3 colorInversion(vec2 uv, float intensity) {
  vec3 color = texture2D(u_sceneTexture, uv).rgb;

  // Random block inversion
  vec2 block = floor(uv * 10.0);
  float blockRand = random(block + floor(u_time * 3.0));

  if (blockRand > 1.0 - intensity * 0.3) {
    color = 1.0 - color;
  }

  return color;
}

// Geometry jitter (simulated via UV displacement)
vec3 geometryJitter(vec2 uv, float intensity) {
  // High-frequency jitter
  float jitterX = (random(vec2(uv.y * 100.0, u_time * 100.0)) - 0.5) * intensity * 0.02;
  float jitterY = (random(vec2(uv.x * 100.0, u_time * 100.0)) - 0.5) * intensity * 0.02;

  return texture2D(u_sceneTexture, uv + vec2(jitterX, jitterY)).rgb;
}

// Reality break (combination of effects)
vec3 realityBreak(vec2 uv, float intensity) {
  vec3 color = vec3(0.0);

  // Layer multiple effects
  color += screenTear(uv, intensity * 0.5) * 0.3;
  color += rgbSplit(uv, intensity * 0.7) * 0.4;
  color += uvDistortion(uv, intensity * 0.3) * 0.3;

  // Extreme color shift
  color = mix(color, color.gbr, intensity * 0.5);

  // Noise overlay
  float noise = random(uv * u_resolution + u_time);
  color = mix(color, vec3(noise), intensity * 0.2);

  return color;
}

void main() {
  vec3 color;

  if (u_glitchIntensity < 0.001) {
    // No glitch - passthrough
    color = texture2D(u_sceneTexture, vUv).rgb;
  } else {
    // Apply glitch based on type
    if (u_glitchType == 0) {
      color = screenTear(vUv, u_glitchIntensity);
    } else if (u_glitchType == 1) {
      color = rgbSplit(vUv, u_glitchIntensity);
    } else if (u_glitchType == 2) {
      color = geometryJitter(vUv, u_glitchIntensity);
    } else if (u_glitchType == 3) {
      color = colorInversion(vUv, u_glitchIntensity);
    } else if (u_glitchType == 4) {
      color = uvDistortion(vUv, u_glitchIntensity);
    } else {
      color = realityBreak(vUv, u_glitchIntensity);
    }
  }

  gl_FragColor = vec4(color, 1.0);
}
```

---

### World-Space Glitch (Geometry Distortion)

For true geometry jitter (not just screen-space), apply in vertex shader:

```glsl
// In liminal.vert
uniform float u_geometryGlitch;
uniform float u_glitchTime;

vec3 applyGeometryGlitch(vec3 position, vec3 normal) {
  if (u_geometryGlitch < 0.001) return position;

  // Vertex jitter based on position and time
  float jitterSeed = dot(position, vec3(12.9898, 78.233, 45.164)) + u_glitchTime * 50.0;
  vec3 jitter = vec3(
    fract(sin(jitterSeed) * 43758.5453) - 0.5,
    fract(sin(jitterSeed + 1.0) * 43758.5453) - 0.5,
    fract(sin(jitterSeed + 2.0) * 43758.5453) - 0.5
  );

  // Scale jitter by intensity
  jitter *= u_geometryGlitch * 0.2;

  // Jitter along normal for more natural effect
  position += normal * jitter.x * 0.1;
  position += jitter;

  return position;
}
```

---

### GlitchSystem Class

```typescript
class GlitchSystem {
  private triggerSystem: GlitchTriggerSystem;
  private glitchPass: ShaderPass;
  private geometryUniforms: Map<string, { value: number }>;

  constructor(composer: EffectComposer) {
    this.triggerSystem = new GlitchTriggerSystem();

    // Create post-processing pass
    this.glitchPass = new ShaderPass(GlitchShader);
    this.glitchPass.uniforms.u_glitchIntensity.value = 0;
    this.glitchPass.uniforms.u_glitchType.value = 0;
    composer.addPass(this.glitchPass);

    this.geometryUniforms = new Map();
  }

  registerMaterial(id: string, material: THREE.ShaderMaterial): void {
    // Track materials that need geometry glitch uniform updates
    if (material.uniforms.u_geometryGlitch) {
      this.geometryUniforms.set(id, material.uniforms.u_geometryGlitch);
    }
  }

  update(
    delta: number,
    transientLevel: number,
    growlIntensity: number,
    audioLevel: number
  ): void {
    const state = this.triggerSystem.update(
      delta,
      transientLevel,
      growlIntensity,
      audioLevel
    );

    // Update post-processing uniforms
    this.glitchPass.uniforms.u_glitchIntensity.value = state.intensity;
    this.glitchPass.uniforms.u_glitchType.value = this.glitchTypeToInt(state.currentGlitch);
    this.glitchPass.uniforms.u_time.value += delta;

    // Update geometry glitch uniforms
    const geometryIntensity = state.currentGlitch === 'geometry_jitter'
      ? state.intensity
      : 0;

    for (const uniform of this.geometryUniforms.values()) {
      uniform.value = geometryIntensity;
    }
  }

  private glitchTypeToInt(type: GlitchType | null): number {
    if (!type) return -1;
    const types: GlitchType[] = [
      'screen_tear',
      'rgb_split',
      'geometry_jitter',
      'color_inversion',
      'uv_distortion',
      'reality_break'
    ];
    return types.indexOf(type);
  }

  // Force a specific glitch (for testing/events)
  forceGlitch(type: GlitchType, intensity: number, duration: number): void {
    this.triggerSystem.forceGlitch({
      type: 'manual',
      glitchType: type,
      intensity,
      duration
    });
  }
}
```

---

### Growl Integration

```typescript
// Glitch intensity scales with Growl
function getGlitchScaling(growlIntensity: number): GlitchScaling {
  return {
    // Trigger chance multiplier
    triggerMultiplier: 1 + growlIntensity * 2,

    // Duration multiplier
    durationMultiplier: 1 + growlIntensity * 0.5,

    // Intensity boost
    intensityBoost: growlIntensity * 0.3,

    // Reality break becomes possible
    realityBreakEnabled: growlIntensity > 0.5,

    // Minimum cooldown decreases
    minCooldown: Math.max(100, 500 - growlIntensity * 300)
  };
}
```

---

### Audio Integration

```typescript
// In AudioReactiveSystem
function processAudioForGlitch(
  frequencyData: Uint8Array,
  previousPeak: number
): { transientLevel: number; audioLevel: number } {
  // Calculate current peak
  let currentPeak = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    currentPeak = Math.max(currentPeak, frequencyData[i] / 255);
  }

  // Transient = sudden increase in level
  const transientLevel = Math.max(0, currentPeak - previousPeak);

  // Overall audio level
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  const audioLevel = sum / (frequencyData.length * 255);

  return { transientLevel, audioLevel };
}
```

---

## Integration: Circuitry + Glitch

When both systems are active, they can interact:

```typescript
class CombinedEffectsSystem {
  private circuitry: CircuitryGenerator;
  private glitch: GlitchSystem;

  update(delta: number, audioData: AudioData, growl: GrowlEffects): void {
    // Circuitry reacts to audio
    this.updateCircuitryPulse(audioData);

    // Glitch system processes
    this.glitch.update(
      delta,
      audioData.transient,
      growl.level,
      audioData.overall
    );

    // When glitch is active, intensify circuitry
    if (this.glitch.isActive()) {
      this.boostCircuitryDuringGlitch();
    }
  }

  private boostCircuitryDuringGlitch(): void {
    // Circuitry flickers more intensely during glitches
    // Suggests the "code" of reality is exposed
  }
}
```

---

## Debug Tools

### Effects Debug Panel

```typescript
function EffectsDebugPanel() {
  const [circuitryEnabled, setCircuitryEnabled] = useState(true);
  const [glitchEnabled, setGlitchEnabled] = useState(true);
  const [forceGlitch, setForceGlitch] = useState<GlitchType | null>(null);

  return (
    <div className="debug-panel">
      <h3>Circuitry & Glitch Debug</h3>

      <div>
        <label>
          <input
            type="checkbox"
            checked={circuitryEnabled}
            onChange={(e) => setCircuitryEnabled(e.target.checked)}
          />
          Circuitry Enabled
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={glitchEnabled}
            onChange={(e) => setGlitchEnabled(e.target.checked)}
          />
          Glitch Enabled
        </label>
      </div>

      <div>
        <label>Force Glitch Type:</label>
        <select
          value={forceGlitch ?? 'none'}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'none') {
              setForceGlitch(null);
            } else {
              setForceGlitch(val as GlitchType);
              glitchSystem.forceGlitch(val as GlitchType, 0.8, 2000);
            }
          }}
        >
          <option value="none">None</option>
          <option value="screen_tear">Screen Tear</option>
          <option value="rgb_split">RGB Split</option>
          <option value="geometry_jitter">Geometry Jitter</option>
          <option value="color_inversion">Color Inversion</option>
          <option value="uv_distortion">UV Distortion</option>
          <option value="reality_break">Reality Break</option>
        </select>
      </div>

      <button onClick={() => circuitrySystem.regenerateAll()}>
        Regenerate All Circuitry
      </button>
    </div>
  );
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/generators/CircuitryGenerator.ts` | Procedural circuit trace generation |
| `src/generators/CircuitTextureGenerator.ts` | Canvas-based texture creation |
| `src/systems/GlitchSystem.ts` | Main glitch effect orchestration |
| `src/systems/GlitchTriggerSystem.ts` | Glitch trigger detection and selection |
| `src/shaders/circuitry.vert` | Circuit overlay vertex shader |
| `src/shaders/circuitry.frag` | Circuit overlay fragment shader |
| `src/shaders/glitch.frag` | Post-processing glitch effects |
| `src/components/Debug/EffectsDebugPanel.tsx` | Development tools |

---

## Performance Considerations

### Circuitry
- Pre-generate circuit textures at room load time
- Use 512x512 or 1024x1024 textures (not larger)
- Limit circuit complexity based on device capability
- Consider LOD - simpler circuits at distance

### Glitch
- Glitch shader is full-screen post-process - keep it simple
- Limit glitch duration to avoid sustained performance hit
- Use cooldown to prevent glitch spam
- Consider disabling geometry jitter on mobile

### Combined
- Don't layer too many effects simultaneously
- Profile on target hardware
- Provide quality settings for users
