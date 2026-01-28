# Portal Variations System Specification

## Overview

The Portal Variations system is inspired by MyHouse.wad's reality-bending mechanics. When players pass through doorways, there's a chance they'll enter an "alternate version" of the expected room with subtle (or not-so-subtle) differences. The deeper you explore and the longer the installation has existed, the more likely and extreme these variations become.

---

## Core Concept

Portals don't always lead where you expect. Each doorway has a calculated probability of spawning an alternate version of its destination room. These variations range from nearly imperceptible (Level 1) to completely reality-breaking (Level 5).

The psychological effect is disorientation and paranoia:
- "Was that painting always there?"
- "This hallway feels longer than before..."
- "Why is there a door where the window was?"

---

## Variation Level System

### Level Overview

| Level | Name | Description | Probability Base |
|-------|------|-------------|------------------|
| 1 | Subtle | Barely noticeable changes | 15% |
| 2 | Noticeable | Architectural oddities | 10% |
| 3 | Unsettling | Reality inconsistencies | 5% |
| 4 | Surreal | Physics violations | 2% |
| 5 | Bizarre | Total reality breakdown | 0.5% |

### Probability Calculation

```typescript
interface VariationProbability {
  level: VariationLevel;
  probability: number;
}

function calculateVariationProbabilities(
  depth: number,           // Rooms traversed from origin
  growlIntensity: number,  // 0-1 from Growl system
  roomSeed: number         // For deterministic randomness
): VariationProbability[] {
  // Base probabilities
  const baseProbabilities = [0.15, 0.10, 0.05, 0.02, 0.005];

  // Depth multiplier: deeper = more variations
  // Caps at 3x at depth 50
  const depthMultiplier = 1 + Math.min(depth / 50, 2);

  // Growl multiplier: time increases variation chance
  // At full Growl (1.0), probabilities double
  const growlMultiplier = 1 + growlIntensity;

  // Seeded random for consistency
  const seededRandom = new SeededRandom(roomSeed);

  return baseProbabilities.map((base, index) => ({
    level: (index + 1) as VariationLevel,
    probability: Math.min(
      base * depthMultiplier * growlMultiplier,
      0.8  // Cap at 80% to always have chance of normal room
    )
  }));
}

function selectVariationLevel(
  probabilities: VariationProbability[],
  random: SeededRandom
): VariationLevel | null {
  // Higher levels checked first (rarer but more impactful)
  for (let i = probabilities.length - 1; i >= 0; i--) {
    if (random.next() < probabilities[i].probability) {
      return probabilities[i].level;
    }
  }
  return null;  // No variation - normal room
}
```

---

## Level 1: Subtle Variations

### Description
Changes so minor that players might second-guess themselves. Creates a sense of unease without being overtly supernatural.

### Effects

```typescript
interface Level1Variation {
  type: 'subtle';
  changes: SubtleChange[];
}

type SubtleChange =
  | { kind: 'wallpaper_seed'; newSeed: number }
  | { kind: 'furniture_offset'; offset: THREE.Vector3 }
  | { kind: 'light_color_shift'; shift: number }  // Degrees in hue
  | { kind: 'carpet_pattern_phase'; phase: number }
  | { kind: 'ceiling_height'; delta: number }  // -0.1 to +0.1 units
  | { kind: 'ambient_volume'; multiplier: number };

function generateLevel1Variation(
  baseRoom: RoomConfig,
  random: SeededRandom
): Level1Variation {
  const changes: SubtleChange[] = [];

  // Pick 1-3 subtle changes
  const numChanges = 1 + Math.floor(random.next() * 3);

  const possibleChanges: SubtleChange[] = [
    { kind: 'wallpaper_seed', newSeed: Math.floor(random.next() * 10000) },
    { kind: 'furniture_offset', offset: new THREE.Vector3(
      (random.next() - 0.5) * 0.3,
      0,
      (random.next() - 0.5) * 0.3
    )},
    { kind: 'light_color_shift', shift: (random.next() - 0.5) * 20 },
    { kind: 'carpet_pattern_phase', phase: random.next() * Math.PI * 2 },
    { kind: 'ceiling_height', delta: (random.next() - 0.5) * 0.2 },
    { kind: 'ambient_volume', multiplier: 0.8 + random.next() * 0.4 }
  ];

  // Shuffle and pick
  shuffleArray(possibleChanges, random);
  changes.push(...possibleChanges.slice(0, numChanges));

  return { type: 'subtle', changes };
}
```

### Visual Examples
- Wallpaper has a slightly different repeating pattern
- Furniture rotated 5-10 degrees from expected position
- Lights have a warmer/cooler tint
- Floor texture scaled differently
- Room feels 6 inches taller/shorter

---

## Level 2: Noticeable Variations

### Description
Clear architectural differences that players will definitely notice, but could still be "explained" as misremembering.

### Effects

```typescript
interface Level2Variation {
  type: 'noticeable';
  changes: NoticeableChange[];
}

type NoticeableChange =
  | { kind: 'door_target_remap'; doorIndex: number; newTarget: number }
  | { kind: 'extra_hallway'; position: THREE.Vector3; direction: THREE.Vector3 }
  | { kind: 'missing_door'; doorIndex: number }
  | { kind: 'extra_door'; position: THREE.Vector3 }
  | { kind: 'window_to_wall'; windowIndex: number }
  | { kind: 'wall_to_window'; wallPosition: THREE.Vector3 }
  | { kind: 'room_stretched'; axis: 'x' | 'z'; factor: number };

function generateLevel2Variation(
  baseRoom: RoomConfig,
  random: SeededRandom
): Level2Variation {
  const changes: NoticeableChange[] = [];

  // Pick 1-2 noticeable changes
  const numChanges = 1 + Math.floor(random.next() * 2);

  const changeGenerators: (() => NoticeableChange)[] = [
    () => ({
      kind: 'door_target_remap',
      doorIndex: Math.floor(random.next() * baseRoom.doorCount),
      newTarget: Math.floor(random.next() * 100)
    }),
    () => ({
      kind: 'extra_hallway',
      position: new THREE.Vector3(
        (random.next() - 0.5) * baseRoom.width,
        0,
        (random.next() - 0.5) * baseRoom.depth
      ),
      direction: new THREE.Vector3(
        random.next() > 0.5 ? 1 : -1,
        0,
        random.next() > 0.5 ? 1 : -1
      ).normalize()
    }),
    () => ({
      kind: 'room_stretched',
      axis: random.next() > 0.5 ? 'x' : 'z',
      factor: 1.2 + random.next() * 0.5  // 1.2x to 1.7x
    })
  ];

  for (let i = 0; i < numChanges; i++) {
    const generator = changeGenerators[Math.floor(random.next() * changeGenerators.length)];
    changes.push(generator());
  }

  return { type: 'noticeable', changes };
}
```

### Visual Examples
- Door leads to a different room than expected
- An extra hallway branches off where there wasn't one before
- A door is missing, replaced by blank wall
- Windows look out onto impossible views (interior walls, void)
- Room is noticeably longer/wider than before

---

## Level 3: Unsettling Variations

### Description
Reality inconsistencies that cannot be rationalized. Text appears backwards, familiar things become unfamiliar.

### Effects

```typescript
interface Level3Variation {
  type: 'unsettling';
  changes: UnsettlingChange[];
}

type UnsettlingChange =
  | { kind: 'text_reversed'; textureIds: string[] }
  | { kind: 'photos_wrong_faces'; faceSwapSeed: number }
  | { kind: 'mirror_shows_different'; differenceType: 'empty' | 'wrong_position' | 'watching' }
  | { kind: 'clock_wrong_time'; offset: number }  // Hours offset
  | { kind: 'sounds_reversed'; }
  | { kind: 'impossible_shadow'; sourcePosition: THREE.Vector3 }
  | { kind: 'footsteps_mismatch'; };  // Player hears extra/missing footsteps

function generateLevel3Variation(
  baseRoom: RoomConfig,
  random: SeededRandom
): Level3Variation {
  const changes: UnsettlingChange[] = [];

  const changeOptions: UnsettlingChange[] = [
    { kind: 'text_reversed', textureIds: ['signs', 'books', 'labels'] },
    { kind: 'photos_wrong_faces', faceSwapSeed: Math.floor(random.next() * 10000) },
    {
      kind: 'mirror_shows_different',
      differenceType: ['empty', 'wrong_position', 'watching'][Math.floor(random.next() * 3)] as any
    },
    { kind: 'clock_wrong_time', offset: Math.floor(random.next() * 12) - 6 },
    { kind: 'sounds_reversed' },
    {
      kind: 'impossible_shadow',
      sourcePosition: new THREE.Vector3(
        (random.next() - 0.5) * 10,
        2,
        (random.next() - 0.5) * 10
      )
    },
    { kind: 'footsteps_mismatch' }
  ];

  // Pick 1-2 unsettling changes
  const numChanges = 1 + Math.floor(random.next() * 2);
  shuffleArray(changeOptions, random);
  changes.push(...changeOptions.slice(0, numChanges));

  return { type: 'unsettling', changes };
}
```

### Text Reversal Shader

```glsl
uniform bool u_reverseText;
uniform vec2 u_textureSize;

vec2 getTextureCoord(vec2 uv) {
  if (u_reverseText) {
    // Flip horizontally for mirror text effect
    return vec2(1.0 - uv.x, uv.y);
  }
  return uv;
}
```

### Visual Examples
- All text in the room appears mirrored/backwards
- Photos on walls show different faces (wrong people, or the player)
- Mirrors show the room empty, or show you in a different position
- Clocks show the wrong time (and different clocks disagree)
- Your footsteps don't match your movement speed

---

## Level 4: Surreal Variations

### Description
Physics and geometry violations. Impossible architecture, gravity anomalies, self-encounters.

### Effects

```typescript
interface Level4Variation {
  type: 'surreal';
  changes: SurrealChange[];
}

type SurrealChange =
  | { kind: 'gravity_shift'; direction: THREE.Vector3; strength: number }
  | { kind: 'impossible_geometry'; geometryType: ImpossibleGeometry }
  | { kind: 'self_reflection'; position: THREE.Vector3 }  // See yourself
  | { kind: 'room_within_room'; scale: number }
  | { kind: 'escher_stairs'; }
  | { kind: 'infinite_regression'; depth: number }
  | { kind: 'time_dilation'; factor: number };

type ImpossibleGeometry =
  | 'penrose_stairs'
  | 'klein_bottle_room'
  | 'mobius_hallway'
  | 'four_right_angles_triangle';

function generateLevel4Variation(
  baseRoom: RoomConfig,
  random: SeededRandom
): Level4Variation {
  const changes: SurrealChange[] = [];

  // Level 4 gets exactly one major effect
  const changeOptions: (() => SurrealChange)[] = [
    () => ({
      kind: 'gravity_shift',
      direction: new THREE.Vector3(
        (random.next() - 0.5) * 0.3,
        -1,
        (random.next() - 0.5) * 0.3
      ).normalize(),
      strength: 0.8 + random.next() * 0.4
    }),
    () => ({
      kind: 'impossible_geometry',
      geometryType: ['penrose_stairs', 'klein_bottle_room', 'mobius_hallway', 'four_right_angles_triangle'][
        Math.floor(random.next() * 4)
      ] as ImpossibleGeometry
    }),
    () => ({
      kind: 'self_reflection',
      position: new THREE.Vector3(
        (random.next() - 0.5) * baseRoom.width,
        0,
        (random.next() - 0.5) * baseRoom.depth
      )
    }),
    () => ({
      kind: 'room_within_room',
      scale: 0.5 + random.next() * 0.3
    }),
    () => ({
      kind: 'infinite_regression',
      depth: 3 + Math.floor(random.next() * 5)
    })
  ];

  const generator = changeOptions[Math.floor(random.next() * changeOptions.length)];
  changes.push(generator());

  return { type: 'surreal', changes };
}
```

### Self-Reflection System

```typescript
class SelfReflectionEffect {
  private ghostMesh: THREE.Mesh | null = null;
  private ghostAnimations: THREE.AnimationClip[] = [];

  createGhost(
    playerPosition: THREE.Vector3,
    variationPosition: THREE.Vector3
  ): void {
    // Create a copy of player's appearance
    this.ghostMesh = this.clonePlayerAppearance();

    // Position it in the variation spot
    this.ghostMesh.position.copy(variationPosition);

    // Ghost behavior options:
    // 1. Mirrors player movement (delayed)
    // 2. Stands still, watching
    // 3. Performs actions player hasn't done
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    playerRotation: THREE.Euler
  ): void {
    if (!this.ghostMesh) return;

    // Make ghost look at player
    this.ghostMesh.lookAt(playerPosition);

    // Occasionally glitch
    if (Math.random() < 0.01) {
      this.ghostMesh.visible = false;
      setTimeout(() => {
        if (this.ghostMesh) this.ghostMesh.visible = true;
      }, 50 + Math.random() * 150);
    }
  }
}
```

### Gravity Shift Shader

```glsl
uniform vec3 u_gravityDirection;
uniform float u_gravityStrength;

vec3 applyGravityShift(vec3 position, vec3 normal) {
  // Shift vertex positions based on altered gravity
  float gravityInfluence = dot(normal, -u_gravityDirection);
  vec3 shift = u_gravityDirection * gravityInfluence * u_gravityStrength * 0.1;
  return position + shift;
}
```

### Visual Examples
- Gravity pulls slightly sideways (objects lean, player movement affected)
- Stairs that go up on all sides (Escher-like)
- You see yourself standing across the room, watching
- A smaller version of the room exists inside the room
- Looking down a hallway shows infinite copies receding

---

## Level 5: Bizarre Variations

### Description
Complete reality breakdown. Rooms from other games/dimensions, abstract spaces, existential horror.

### Effects

```typescript
interface Level5Variation {
  type: 'bizarre';
  changes: BizarreChange[];
}

type BizarreChange =
  | { kind: 'reality_tear'; position: THREE.Vector3; size: number }
  | { kind: 'dimension_bleed'; sourceAesthetic: AlternateAesthetic }
  | { kind: 'void_room'; voidIntensity: number }
  | { kind: 'backrooms_transition'; }
  | { kind: 'memory_palace'; memories: MemoryFragment[] }
  | { kind: 'abstract_space'; geometryMode: AbstractMode }
  | { kind: 'the_presence'; };  // Growl manifests visually

type AlternateAesthetic =
  | 'ps1_horror'        // Low-poly, dithered textures
  | 'liminal_office'    // Empty corporate spaces
  | 'vaporwave'         // Aesthetic overload
  | 'void_black'        // Nearly pure darkness
  | 'digital_decay';    // Corrupted textures, missing geometry

type AbstractMode =
  | 'wireframe'
  | 'particle_only'
  | 'inverted_space'
  | 'impossible_colors';

function generateLevel5Variation(
  baseRoom: RoomConfig,
  random: SeededRandom
): Level5Variation {
  const changes: BizarreChange[] = [];

  const changeOptions: (() => BizarreChange)[] = [
    () => ({
      kind: 'reality_tear',
      position: new THREE.Vector3(
        (random.next() - 0.5) * baseRoom.width,
        baseRoom.height / 2,
        (random.next() - 0.5) * baseRoom.depth
      ),
      size: 1 + random.next() * 2
    }),
    () => ({
      kind: 'dimension_bleed',
      sourceAesthetic: ['ps1_horror', 'liminal_office', 'vaporwave', 'void_black', 'digital_decay'][
        Math.floor(random.next() * 5)
      ] as AlternateAesthetic
    }),
    () => ({
      kind: 'void_room',
      voidIntensity: 0.7 + random.next() * 0.3
    }),
    () => ({
      kind: 'backrooms_transition'
    }),
    () => ({
      kind: 'abstract_space',
      geometryMode: ['wireframe', 'particle_only', 'inverted_space', 'impossible_colors'][
        Math.floor(random.next() * 4)
      ] as AbstractMode
    }),
    () => ({
      kind: 'the_presence'
    })
  ];

  const generator = changeOptions[Math.floor(random.next() * changeOptions.length)];
  changes.push(generator());

  return { type: 'bizarre', changes };
}
```

### Reality Tear Shader

```glsl
uniform vec3 u_tearPosition;
uniform float u_tearSize;
uniform float u_time;

vec3 applyRealityTear(vec3 fragColor, vec3 worldPos) {
  float distToTear = length(worldPos - u_tearPosition);

  if (distToTear < u_tearSize) {
    // Inside tear - show the void
    float tearIntensity = 1.0 - (distToTear / u_tearSize);
    tearIntensity = pow(tearIntensity, 2.0);

    // Void color with distortion
    vec3 voidColor = vec3(0.02, 0.01, 0.05);

    // Edge glow
    float edgeDist = abs(distToTear - u_tearSize * 0.8);
    float edgeGlow = exp(-edgeDist * 5.0);
    vec3 glowColor = vec3(0.78, 0.57, 0.96);  // #c792f5

    // Pulsing
    float pulse = 0.5 + 0.5 * sin(u_time * 2.0);
    edgeGlow *= 0.5 + 0.5 * pulse;

    vec3 tearColor = mix(voidColor, glowColor, edgeGlow);
    return mix(fragColor, tearColor, tearIntensity);
  }

  return fragColor;
}
```

### Dimension Bleed Aesthetics

```typescript
interface AestheticConfig {
  colorPalette: THREE.Color[];
  textureStyle: TextureStyle;
  geometryResolution: number;
  fogDensity: number;
  postProcessing: PostProcessEffect[];
}

const AESTHETIC_CONFIGS: Record<AlternateAesthetic, AestheticConfig> = {
  ps1_horror: {
    colorPalette: [
      new THREE.Color(0x1a1a2e),
      new THREE.Color(0x16213e),
      new THREE.Color(0x0f3460)
    ],
    textureStyle: 'dithered_lowres',
    geometryResolution: 0.3,  // Reduce vertex count
    fogDensity: 0.15,
    postProcessing: ['pixelate', 'dither', 'vertex_jitter']
  },
  liminal_office: {
    colorPalette: [
      new THREE.Color(0xf5f5dc),
      new THREE.Color(0xd3d3d3),
      new THREE.Color(0x808080)
    ],
    textureStyle: 'fluorescent_lit',
    geometryResolution: 1.0,
    fogDensity: 0.02,
    postProcessing: ['bloom_harsh', 'desaturate']
  },
  vaporwave: {
    colorPalette: [
      new THREE.Color(0xff71ce),
      new THREE.Color(0x01cdfe),
      new THREE.Color(0x05ffa1)
    ],
    textureStyle: 'grid_neon',
    geometryResolution: 1.0,
    fogDensity: 0.05,
    postProcessing: ['chromatic_aberration', 'bloom_strong', 'scanlines']
  },
  void_black: {
    colorPalette: [
      new THREE.Color(0x000000),
      new THREE.Color(0x050505),
      new THREE.Color(0x0a0a0a)
    ],
    textureStyle: 'none',
    geometryResolution: 0.5,
    fogDensity: 0.3,
    postProcessing: ['darkness', 'grain']
  },
  digital_decay: {
    colorPalette: [
      new THREE.Color(0xff0000),
      new THREE.Color(0x00ff00),
      new THREE.Color(0x0000ff)
    ],
    textureStyle: 'corrupted',
    geometryResolution: 0.7,
    fogDensity: 0.08,
    postProcessing: ['glitch_heavy', 'color_corruption', 'uv_distortion']
  }
};
```

### Visual Examples
- A tear in reality showing pure void with glowing edges
- Room suddenly has PS1-era graphics and dithered textures
- Endless empty office space with fluorescent lights
- Everything fades to near-black void
- Textures corrupted, geometry missing pieces
- The Growl becomes visible as a dark presence

---

## Portal Shimmer Effect

When a doorway leads to a variation, it has a subtle shimmer:

### Shimmer Shader

```glsl
uniform float u_variationLevel;  // 1-5
uniform float u_time;

float portalShimmer(vec2 uv) {
  if (u_variationLevel < 1.0) return 0.0;

  // Base shimmer wave
  float wave = sin(uv.y * 20.0 + u_time * 2.0) * 0.5 + 0.5;

  // Intensity based on variation level
  float intensity = u_variationLevel * 0.1;

  // Distortion increases with level
  float distortion = sin(uv.x * 10.0 + u_time) * u_variationLevel * 0.02;

  return wave * intensity + distortion;
}

vec3 applyPortalShimmer(vec3 color, vec2 uv) {
  float shimmer = portalShimmer(uv);

  // Shimmer color based on level
  vec3 shimmerColor = mix(
    vec3(0.78, 0.57, 0.96),  // #c792f5 - subtle purple
    vec3(1.0, 0.2, 0.2),     // Red - danger for high levels
    (u_variationLevel - 1.0) / 4.0
  );

  return mix(color, shimmerColor, shimmer * 0.3);
}
```

### Shimmer Intensity by Level

| Level | Shimmer Appearance |
|-------|-------------------|
| 1 | Nearly invisible, occasional purple flicker |
| 2 | Subtle purple wave at doorway edges |
| 3 | Noticeable shimmer, slight distortion |
| 4 | Strong shimmer, geometry warping at edges |
| 5 | Intense glow, reality visibly breaking at threshold |

---

## Variation State Management

### Persistence for Backtracking

```typescript
interface VariationState {
  roomId: number;
  variationLevel: VariationLevel | null;
  variationSeed: number;
  visitCount: number;
  firstVisitTimestamp: number;
}

class VariationStateManager {
  private states: Map<number, VariationState> = new Map();

  getOrCreateState(
    roomId: number,
    depth: number,
    growlIntensity: number
  ): VariationState {
    if (this.states.has(roomId)) {
      const state = this.states.get(roomId)!;
      state.visitCount++;
      return state;
    }

    // First visit - determine variation
    const seed = generateRoomSeed(roomId);
    const probabilities = calculateVariationProbabilities(depth, growlIntensity, seed);
    const random = new SeededRandom(seed);
    const level = selectVariationLevel(probabilities, random);

    const state: VariationState = {
      roomId,
      variationLevel: level,
      variationSeed: seed,
      visitCount: 1,
      firstVisitTimestamp: Date.now()
    };

    this.states.set(roomId, state);
    return state;
  }

  // For saving/loading
  serialize(): string {
    return JSON.stringify(Array.from(this.states.entries()));
  }

  deserialize(data: string): void {
    this.states = new Map(JSON.parse(data));
  }
}
```

### Consistency Rules

1. **Same room = same variation**: Revisiting a room shows the same variation
2. **Seed determines everything**: Given the same seed, variation is reproducible
3. **No variation escalation on revisit**: A Level 2 room stays Level 2
4. **Session persistence**: Variations persist for the browser session
5. **Optional permanent storage**: Can save to localStorage for cross-session consistency

---

## PortalVariationSystem Class

### Main System Class

```typescript
class PortalVariationSystem {
  private stateManager: VariationStateManager;
  private variationGenerators: Map<VariationLevel, VariationGenerator>;

  constructor() {
    this.stateManager = new VariationStateManager();

    // Register generators for each level
    this.variationGenerators = new Map([
      [1, new Level1Generator()],
      [2, new Level2Generator()],
      [3, new Level3Generator()],
      [4, new Level4Generator()],
      [5, new Level5Generator()]
    ]);
  }

  processPortalTransition(
    fromRoomId: number,
    toRoomId: number,
    depth: number,
    growlIntensity: number
  ): RoomConfig {
    // Get or create variation state for destination
    const state = this.stateManager.getOrCreateState(
      toRoomId,
      depth,
      growlIntensity
    );

    // Get base room config
    const baseConfig = generateBaseRoom(toRoomId);

    // If no variation, return base
    if (!state.variationLevel) {
      return baseConfig;
    }

    // Generate variation
    const generator = this.variationGenerators.get(state.variationLevel);
    if (!generator) return baseConfig;

    const random = new SeededRandom(state.variationSeed);
    const variation = generator.generate(baseConfig, random);

    return applyVariation(baseConfig, variation);
  }

  getShimmerLevel(doorwayId: number): number {
    // Calculate shimmer without revealing exact variation level
    const state = this.stateManager.states.get(doorwayId);
    return state?.variationLevel || 0;
  }
}
```

---

## Integration with Other Systems

### Growl System Integration

```typescript
// In useFrame or update loop
function updateVariationSystem(
  variationSystem: PortalVariationSystem,
  growlIntensity: number
) {
  // Higher Growl = more likely high-level variations
  // This is factored into probability calculation

  // Also affects shimmer visibility
  variationSystem.setGlobalShimmerBoost(growlIntensity * 0.5);
}
```

### Audio System Integration

```typescript
// Variation-specific audio cues
function getVariationAudio(level: VariationLevel): AudioCue[] {
  switch (level) {
    case 1:
      return [];  // Silent - no audio warning
    case 2:
      return [{ type: 'subtle_hum', volume: 0.1 }];
    case 3:
      return [
        { type: 'reversed_sound', volume: 0.2 },
        { type: 'dissonant_chord', volume: 0.1 }
      ];
    case 4:
      return [
        { type: 'gravity_shift_whoosh', volume: 0.4 },
        { type: 'reality_creak', volume: 0.3 }
      ];
    case 5:
      return [
        { type: 'dimension_tear', volume: 0.6 },
        { type: 'void_rumble', volume: 0.5 },
        { type: 'presence_breath', volume: 0.3 }
      ];
  }
}
```

---

## Debug Tools

### Variation Debug Panel

```typescript
function VariationDebugPanel() {
  const [forceLevel, setForceLevel] = useState<VariationLevel | null>(null);

  return (
    <div className="debug-panel">
      <h3>Portal Variation Debug</h3>
      <div>
        <label>Force Variation Level:</label>
        <select
          value={forceLevel ?? 'auto'}
          onChange={(e) => setForceLevel(
            e.target.value === 'auto' ? null : parseInt(e.target.value) as VariationLevel
          )}
        >
          <option value="auto">Auto (probability-based)</option>
          <option value="0">None (normal room)</option>
          <option value="1">Level 1 - Subtle</option>
          <option value="2">Level 2 - Noticeable</option>
          <option value="3">Level 3 - Unsettling</option>
          <option value="4">Level 4 - Surreal</option>
          <option value="5">Level 5 - Bizarre</option>
        </select>
      </div>
      <button onClick={() => variationSystem.clearAllStates()}>
        Reset All Variations
      </button>
    </div>
  );
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/systems/PortalVariationSystem.ts` | Main variation system orchestration |
| `src/generators/VariationGenerator.ts` | Base class and level-specific generators |
| `src/generators/variations/Level1Generator.ts` | Subtle variation generation |
| `src/generators/variations/Level2Generator.ts` | Noticeable variation generation |
| `src/generators/variations/Level3Generator.ts` | Unsettling variation generation |
| `src/generators/variations/Level4Generator.ts` | Surreal variation generation |
| `src/generators/variations/Level5Generator.ts` | Bizarre variation generation |
| `src/shaders/portal-shimmer.frag` | Doorway shimmer effect |
| `src/shaders/reality-tear.frag` | Level 5 void tear effect |
| `src/store/variationStore.ts` | Zustand store for variation state |
| `src/components/Debug/VariationDebugPanel.tsx` | Development tools |
