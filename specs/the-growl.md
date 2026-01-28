# The Growl System Specification

## Overview

The Growl is the time-based dread system inspired by *House of Leaves*. It tracks real-world time since the application was first deployed/visited and gradually intensifies environmental horror over hours and days. The longer the installation exists, the more oppressive the atmosphere becomes.

---

## Core Concept

The Growl represents an unseen presence within the Mind Palace. It's never directly visible, but its influence manifests through environmental changes:

- Sub-bass audio drone (barely perceptible at first)
- Shadow movement anomalies
- Light instability
- Increased glitch frequency
- Intensified color distortion
- Camera shake and disorientation

The key psychological hook: **returning players find the space has changed**. The palace "remembers" how long it has existed.

---

## Time Tracking

### Deployment Timestamp

```typescript
const STORAGE_KEY = 'mindpalace_deployment_timestamp';

function initializeDeploymentTimestamp(): number {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return parseInt(stored, 10);
  }

  // First visit - set deployment time
  const now = Date.now();
  localStorage.setItem(STORAGE_KEY, now.toString());
  return now;
}

function getHoursSinceDeployment(): number {
  const deploymentTime = initializeDeploymentTimestamp();
  const now = Date.now();
  const milliseconds = now - deploymentTime;
  return milliseconds / (1000 * 60 * 60);
}
```

### Time Persistence

The deployment timestamp persists in `localStorage`:
- Survives browser refresh
- Survives tab close
- Cleared only by explicit localStorage clear or new browser profile

For GitHub Pages deployment, the timestamp represents when **this user** first visited, not when the site was deployed. Each user has their own timeline.

---

## Intensity Calculation

### Growl Intensity Scale

```typescript
interface GrowlIntensity {
  level: number;        // 0-1 normalized
  phase: GrowlPhase;
  effects: GrowlEffects;
}

enum GrowlPhase {
  SILENT = 'silent',           // 0-2 hours
  DISTANT = 'distant',         // 2-6 hours
  PRESENT = 'present',         // 6-12 hours
  CLOSE = 'close',             // 12-24 hours
  IMMINENT = 'imminent'        // 24+ hours
}

function calculateGrowlIntensity(hoursSinceDeployment: number): GrowlIntensity {
  // Asymptotic approach to 1.0
  // 50% intensity at ~16 hours
  // 90% intensity at ~72 hours
  const level = 1 - Math.exp(-hoursSinceDeployment / 24);

  const phase = getGrowlPhase(hoursSinceDeployment);
  const effects = getGrowlEffects(level, phase);

  return { level, phase, effects };
}

function getGrowlPhase(hours: number): GrowlPhase {
  if (hours < 2) return GrowlPhase.SILENT;
  if (hours < 6) return GrowlPhase.DISTANT;
  if (hours < 12) return GrowlPhase.PRESENT;
  if (hours < 24) return GrowlPhase.CLOSE;
  return GrowlPhase.IMMINENT;
}
```

### Phase Characteristics

| Phase | Hours | Intensity | Description |
|-------|-------|-----------|-------------|
| Silent | 0-2 | 0.00-0.08 | Peaceful exploration, no anomalies |
| Distant | 2-6 | 0.08-0.22 | Barely perceptible sub-bass, rare shadow flicker |
| Present | 6-12 | 0.22-0.39 | Audible drone (if listening), occasional anomalies |
| Close | 12-24 | 0.39-0.63 | Unmistakable presence, frequent disturbances |
| Imminent | 24+ | 0.63-1.00 | Constant oppression, reality breakdown |

---

## Effect Systems

### Growl Effects Interface

```typescript
interface GrowlEffects {
  // Audio
  droneVolume: number;           // 0-1
  droneFrequency: number;        // Hz (20-60)

  // Visual
  shadowMovementChance: number;  // Per-frame probability
  lightFlickerIntensity: number; // 0-1
  colorDistortion: number;       // 0-1
  fogDensityBonus: number;       // Added to base fog

  // Camera
  shakeIntensity: number;        // 0-1
  fovDistortion: number;         // Degrees

  // Glitch
  glitchChanceMultiplier: number; // Multiplier on base glitch chance
}

function getGrowlEffects(level: number, phase: GrowlPhase): GrowlEffects {
  return {
    // Audio ramps in during Distant phase
    droneVolume: phase === GrowlPhase.SILENT ? 0 : Math.min(level * 1.5, 0.8),
    droneFrequency: 25 + level * 15,  // 25-40 Hz

    // Visual effects start in Present phase
    shadowMovementChance: level > 0.2 ? (level - 0.2) * 0.01 : 0,
    lightFlickerIntensity: level > 0.3 ? (level - 0.3) * 0.5 : 0,
    colorDistortion: level * 0.3,
    fogDensityBonus: level * 0.02,

    // Camera effects in Close phase
    shakeIntensity: level > 0.5 ? (level - 0.5) * 0.02 : 0,
    fovDistortion: level > 0.5 ? (level - 0.5) * 5 : 0,

    // Glitch multiplier scales throughout
    glitchChanceMultiplier: 1 + level * 2
  };
}
```

---

## Audio: The Drone

### Sub-Bass Generation

```typescript
class GrowlDrone {
  private audioContext: AudioContext;
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  private filterNode: BiquadFilterNode;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;

    // Create oscillator for sub-bass
    this.oscillator = audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 30;

    // Low-pass filter to soften
    this.filterNode = audioContext.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 80;
    this.filterNode.Q.value = 1;

    // Gain for volume control
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 0;

    // Connect: oscillator → filter → gain → destination
    this.oscillator.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(audioContext.destination);

    this.oscillator.start();
  }

  update(effects: GrowlEffects): void {
    const now = this.audioContext.currentTime;

    // Smooth frequency transition
    this.oscillator.frequency.linearRampToValueAtTime(
      effects.droneFrequency,
      now + 0.1
    );

    // Smooth volume transition
    this.gainNode.gain.linearRampToValueAtTime(
      effects.droneVolume * 0.3,  // Keep it subtle
      now + 0.5
    );
  }

  dispose(): void {
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.filterNode.disconnect();
    this.gainNode.disconnect();
  }
}
```

### Drone Modulation

The drone isn't static - it subtly modulates:

```typescript
function modulateDrone(drone: GrowlDrone, time: number, level: number): void {
  // Slow frequency wobble
  const freqMod = Math.sin(time * 0.1) * 5 * level;

  // Occasional volume swells
  const volumeMod = Math.sin(time * 0.05) * 0.1 * level;

  // Apply to drone
  drone.setFrequencyOffset(freqMod);
  drone.setVolumeOffset(volumeMod);
}
```

---

## Visual: Shadow Anomalies

### Shadow Movement System

```typescript
interface ShadowAnomaly {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  intensity: number;
}

class ShadowAnomalySystem {
  private anomalies: ShadowAnomaly[] = [];
  private maxAnomalies: number = 5;

  update(
    delta: number,
    growlEffects: GrowlEffects,
    playerPosition: THREE.Vector3
  ): void {
    // Spawn new anomalies
    if (Math.random() < growlEffects.shadowMovementChance) {
      this.spawnAnomaly(playerPosition);
    }

    // Update existing
    for (const anomaly of this.anomalies) {
      anomaly.lifetime -= delta;
      anomaly.position.add(anomaly.velocity.clone().multiplyScalar(delta));

      // Anomalies move toward player periphery
      const toPlayer = new THREE.Vector3()
        .subVectors(playerPosition, anomaly.position)
        .normalize();
      anomaly.velocity.lerp(toPlayer.multiplyScalar(0.5), delta);
    }

    // Remove expired
    this.anomalies = this.anomalies.filter(a => a.lifetime > 0);
  }

  private spawnAnomaly(playerPosition: THREE.Vector3): void {
    if (this.anomalies.length >= this.maxAnomalies) return;

    // Spawn in player's peripheral vision
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 10;

    this.anomalies.push({
      position: new THREE.Vector3(
        playerPosition.x + Math.cos(angle) * distance,
        0.1,  // Near floor
        playerPosition.z + Math.sin(angle) * distance
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ),
      lifetime: 2 + Math.random() * 3,
      intensity: 0.3 + Math.random() * 0.4
    });
  }

  getAnomalyData(): Float32Array {
    // Returns data for shader uniform
    const data = new Float32Array(this.maxAnomalies * 4);
    for (let i = 0; i < this.anomalies.length; i++) {
      const a = this.anomalies[i];
      data[i * 4 + 0] = a.position.x;
      data[i * 4 + 1] = a.position.z;
      data[i * 4 + 2] = a.intensity;
      data[i * 4 + 3] = a.lifetime;
    }
    return data;
  }
}
```

### Shadow Shader Integration

```glsl
uniform vec4 u_shadowAnomalies[5];  // position.xy, intensity, lifetime
uniform int u_shadowAnomalyCount;

float calculateShadowAnomaly(vec2 worldPosXZ) {
  float shadow = 0.0;

  for (int i = 0; i < u_shadowAnomalyCount; i++) {
    vec2 anomalyPos = u_shadowAnomalies[i].xy;
    float intensity = u_shadowAnomalies[i].z;
    float lifetime = u_shadowAnomalies[i].w;

    float dist = length(worldPosXZ - anomalyPos);
    float falloff = 1.0 - smoothstep(0.0, 3.0, dist);

    // Fade based on lifetime
    float fade = min(lifetime, 1.0);

    shadow += falloff * intensity * fade;
  }

  return min(shadow, 0.8);  // Cap shadow darkness
}
```

---

## Visual: Light Flickering

### Flicker System

```typescript
interface LightFlicker {
  targetIntensity: number;
  currentIntensity: number;
  flickerTimer: number;
  flickerDuration: number;
}

class LightFlickerSystem {
  private lights: Map<string, LightFlicker> = new Map();

  registerLight(id: string, baseIntensity: number): void {
    this.lights.set(id, {
      targetIntensity: baseIntensity,
      currentIntensity: baseIntensity,
      flickerTimer: 0,
      flickerDuration: 0
    });
  }

  update(delta: number, growlEffects: GrowlEffects): Map<string, number> {
    const intensities = new Map<string, number>();

    for (const [id, light] of this.lights) {
      // Chance to start flicker
      if (light.flickerTimer <= 0 && Math.random() < growlEffects.lightFlickerIntensity * 0.1) {
        light.flickerDuration = 0.1 + Math.random() * 0.3;
        light.flickerTimer = light.flickerDuration;
        light.targetIntensity = light.currentIntensity * (0.2 + Math.random() * 0.6);
      }

      // Update flicker
      if (light.flickerTimer > 0) {
        light.flickerTimer -= delta;

        if (light.flickerTimer <= 0) {
          // End flicker - return to normal
          light.targetIntensity = 1.0;
        }
      }

      // Smooth intensity transition
      light.currentIntensity = THREE.MathUtils.lerp(
        light.currentIntensity,
        light.targetIntensity,
        delta * 20
      );

      intensities.set(id, light.currentIntensity);
    }

    return intensities;
  }
}
```

---

## Visual: Color Distortion

### Growl Color Shift

As Growl intensifies, colors shift subtly:

```glsl
uniform float u_growlIntensity;
uniform float u_time;

vec3 applyGrowlColorDistortion(vec3 color) {
  // Desaturate slightly
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(color, vec3(gray), u_growlIntensity * 0.2);

  // Shift hue toward sickly tones
  float hueShift = sin(u_time * 0.1) * u_growlIntensity * 0.1;
  // Apply hue rotation (simplified)
  color.r += hueShift * 0.1;
  color.b -= hueShift * 0.05;

  // Occasional color inversion flash
  float invertPulse = step(0.99, sin(u_time * 3.0 + u_growlIntensity * 10.0)) * u_growlIntensity;
  color = mix(color, 1.0 - color, invertPulse * 0.3);

  return color;
}
```

---

## Camera: Presence Effects

### Camera Shake

```typescript
function calculateGrowlShake(
  growlEffects: GrowlEffects,
  time: number
): THREE.Vector3 {
  if (growlEffects.shakeIntensity < 0.001) {
    return new THREE.Vector3(0, 0, 0);
  }

  const intensity = growlEffects.shakeIntensity;

  // Multiple frequency shake for organic feel
  const x = (
    Math.sin(time * 15) * 0.3 +
    Math.sin(time * 23) * 0.2 +
    Math.sin(time * 37) * 0.1
  ) * intensity;

  const y = (
    Math.sin(time * 17) * 0.2 +
    Math.sin(time * 29) * 0.15
  ) * intensity;

  const z = (
    Math.sin(time * 19) * 0.1
  ) * intensity;

  return new THREE.Vector3(x, y, z);
}
```

### FOV Distortion

```typescript
function calculateGrowlFOV(
  baseFOV: number,
  growlEffects: GrowlEffects,
  time: number
): number {
  const distortion = growlEffects.fovDistortion;

  // Slow breathing FOV change
  const breathe = Math.sin(time * 0.3) * distortion * 0.5;

  // Occasional sharp changes
  const spike = Math.sin(time * 5) > 0.95 ? distortion : 0;

  return baseFOV + breathe + spike;
}
```

---

## Zustand Store

### Time Store

```typescript
interface TimeStore {
  // Deployment tracking
  deploymentTimestamp: number;
  hoursSinceDeployment: number;

  // Growl state
  growlIntensity: number;
  growlPhase: GrowlPhase;
  growlEffects: GrowlEffects;

  // Actions
  initialize: () => void;
  update: () => void;

  // Debug
  setDebugHours: (hours: number) => void;
}

const useTimeStore = create<TimeStore>((set, get) => ({
  deploymentTimestamp: 0,
  hoursSinceDeployment: 0,
  growlIntensity: 0,
  growlPhase: GrowlPhase.SILENT,
  growlEffects: getGrowlEffects(0, GrowlPhase.SILENT),

  initialize: () => {
    const timestamp = initializeDeploymentTimestamp();
    const hours = getHoursSinceDeployment();
    const { level, phase, effects } = calculateGrowlIntensity(hours);

    set({
      deploymentTimestamp: timestamp,
      hoursSinceDeployment: hours,
      growlIntensity: level,
      growlPhase: phase,
      growlEffects: effects
    });
  },

  update: () => {
    const hours = getHoursSinceDeployment();
    const { level, phase, effects } = calculateGrowlIntensity(hours);

    set({
      hoursSinceDeployment: hours,
      growlIntensity: level,
      growlPhase: phase,
      growlEffects: effects
    });
  },

  setDebugHours: (hours: number) => {
    // For testing - override calculated hours
    const { level, phase, effects } = calculateGrowlIntensity(hours);
    set({
      hoursSinceDeployment: hours,
      growlIntensity: level,
      growlPhase: phase,
      growlEffects: effects
    });
  }
}));
```

---

## GrowlSystem Class

### Main System Class

```typescript
class GrowlSystem {
  private drone: GrowlDrone | null = null;
  private shadowSystem: ShadowAnomalySystem;
  private flickerSystem: LightFlickerSystem;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.shadowSystem = new ShadowAnomalySystem();
    this.flickerSystem = new LightFlickerSystem();
  }

  async initialize(audioContext: AudioContext): Promise<void> {
    this.audioContext = audioContext;
    this.drone = new GrowlDrone(audioContext);

    // Initialize time store
    useTimeStore.getState().initialize();
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    // Update time store (recalculates Growl intensity)
    useTimeStore.getState().update();

    const { growlEffects } = useTimeStore.getState();

    // Update subsystems
    this.drone?.update(growlEffects);
    this.shadowSystem.update(delta, growlEffects, playerPosition);
    this.flickerSystem.update(delta, growlEffects);
  }

  getShadowData(): Float32Array {
    return this.shadowSystem.getAnomalyData();
  }

  getLightIntensities(): Map<string, number> {
    return this.flickerSystem.update(0, useTimeStore.getState().growlEffects);
  }

  registerLight(id: string, intensity: number): void {
    this.flickerSystem.registerLight(id, intensity);
  }

  dispose(): void {
    this.drone?.dispose();
  }
}
```

---

## Debug Tools

### Time Manipulation UI

For development and testing:

```typescript
function GrowlDebugPanel() {
  const { hoursSinceDeployment, growlPhase, growlIntensity, setDebugHours } = useTimeStore();

  const presets = [
    { label: 'Silent (0h)', hours: 0 },
    { label: 'Distant (4h)', hours: 4 },
    { label: 'Present (9h)', hours: 9 },
    { label: 'Close (18h)', hours: 18 },
    { label: 'Imminent (48h)', hours: 48 },
    { label: 'Extreme (168h)', hours: 168 }
  ];

  return (
    <div className="debug-panel">
      <h3>Growl Debug</h3>
      <p>Hours: {hoursSinceDeployment.toFixed(2)}</p>
      <p>Phase: {growlPhase}</p>
      <p>Intensity: {(growlIntensity * 100).toFixed(1)}%</p>
      <div>
        {presets.map(p => (
          <button key={p.hours} onClick={() => setDebugHours(p.hours)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/systems/GrowlSystem.ts` | Main Growl system orchestration |
| `src/systems/GrowlDrone.ts` | Sub-bass audio generation |
| `src/systems/ShadowAnomalySystem.ts` | Shadow movement effects |
| `src/systems/LightFlickerSystem.ts` | Light instability |
| `src/store/timeStore.ts` | Zustand store for time tracking |
| `src/utils/time.ts` | Deployment timestamp utilities |
| `src/components/Debug/GrowlDebugPanel.tsx` | Development tools |
