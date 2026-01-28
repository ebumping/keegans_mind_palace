# Keegan's Mind Palace - Zerg Loop Refinement Plan

**Purpose:** Intensive parallel execution plan to transform the current implementation from "functional but generic" to "compelling surreal environmental storytelling" using the `surreal-game-design` plugin skills.

**Plugin Location:** `~/.claude/plugins/surreal-game-design/`

**Invocation:** `claude --plugin-dir ~/.claude/plugins/surreal-game-design`

---

## Current State Assessment

### What's Working
- ✅ Procedural room generation (6 types)
- ✅ AABB collision detection
- ✅ First-person navigation with pointer lock
- ✅ Audio capture and FFT analysis
- ✅ Growl system (time-based dread)
- ✅ Circuitry overlays
- ✅ Portal variations and shimmer
- ✅ Glitch effects
- ✅ Audio-reactive shaders

### What's Wrong
- ❌ Rooms are rectangular boxes—not sprawling palace spaces
- ❌ Collision is AABB only—no furniture, no object collision
- ❌ No art—empty rooms with patterns but no paintings, sculptures, objects
- ❌ Transitions are defined but not visually implemented
- ❌ Movement feels generic—no asymmetry, no audio weight
- ❌ Wrongness is random—not escalating with depth/Growl
- ❌ No spatial narrative—rooms don't tell stories

---

## Zerg Loop Structure

Three parallel agent streams, each consuming one skill from the plugin:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ZERG LOOP ORCHESTRATOR                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  STREAM A        │  │  STREAM B        │  │  STREAM C        │  │
│  │  game-design     │  │  movement-system │  │  level-design    │  │
│  │                  │  │                  │  │                  │  │
│  │  Art & Aesthetic │  │  Collision &     │  │  Room Shapes &   │  │
│  │  Integration     │  │  Feel            │  │  Spatial Flow    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │             │
│           └─────────────────────┼─────────────────────┘             │
│                                 │                                    │
│                         ┌───────▼───────┐                           │
│                         │  INTEGRATION  │                           │
│                         │  & TESTING    │                           │
│                         └───────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## STREAM A: Art & Aesthetic (game-design skill)

**Skill Reference:** `skills/game-design/SKILL.md`
**Key References:**
- `references/art-direction.md` - Beauty that knows pain
- `references/liminal-spaces.md` - Taxonomy of unease
- `references/time-based-horror.md` - Growl integration

### A1: Painting System
**Priority:** HIGH
**Files:** `src/generators/ArtGenerator.ts`, `src/components/Painting.tsx`

Create procedural paintings that follow art-direction principles:
- NOT horror imagery—landscapes with wrong horizons, portraits of composite faces
- Placement slightly too low or too high
- Canvas that shows the room it's in (recursive wrongness)
- Frame styles that don't match room era

```typescript
interface PaintingConfig {
  style: 'landscape' | 'portrait' | 'still_life' | 'abstract';
  wrongness: {
    type: 'lighting' | 'perspective' | 'content' | 'recursive';
    intensity: number; // Based on depth + Growl
  };
  frame: 'ornate' | 'minimal' | 'none' | 'wrong_era';
  placement: { height: number; tilt: number }; // Slightly wrong
}
```

**Collision:** Paintings have frame depth collision (0.05-0.1m)

### A2: Sculpture System
**Priority:** MEDIUM
**Files:** `src/generators/SculptureGenerator.ts`, `src/components/Sculpture.tsx`

Procedural forms that suggest without showing:
- Figure Facing Wall (always turns away)
- Accumulation (too many identical objects)
- The Weight (heavy on thin support)
- Threshold Guardian (in doorways)

**Collision:** Full mesh collision—player navigates around

### A3: Furniture with Intent
**Priority:** HIGH
**Files:** `src/generators/FurnitureGenerator.ts`

Furniture that tells stories through wrongness:
- Chairs facing walls or corners
- Beds in wrong rooms (kitchen, hallway)
- Tables with items arranged for ritual
- Sofas for conversation with no conversants

Apply wrongness escalation from `examples/room-wrongness-catalog.md`:
- Level 1: Offset positions
- Level 2: Wrong orientations
- Level 3: Wrong rooms
- Level 4: Hostile arrangements (facing player)
- Level 5: Ceiling-mounted, gravity-defiant

**Collision:** Every furniture piece has collision mesh

### A4: Light as Art
**Priority:** MEDIUM
**Files:** `src/systems/LightArtSystem.ts`

Light installations per art-direction:
- Column of Light (no source, illuminates dust)
- The Glow (walls emit, no shadows cast)
- Window Light Without Window

### A5: Audio as Art
**Priority:** LOW
**Files:** `src/systems/AmbientAudioSystem.ts`

- The Chord That Never Resolves (sustained dissonance)
- The Distant Music (always muffled, no source)
- Room-specific frequency signatures

---

## STREAM B: Collision & Feel (movement-system skill)

**Skill Reference:** `skills/movement-system/SKILL.md`
**Key References:**
- `references/non-euclidean-collision.md` - CRITICAL
- `references/audio-movement-binding.md`

### B1: Capsule Controller Upgrade
**Priority:** CRITICAL
**Files:** `src/systems/NavigationSystem.ts`

Replace AABB with proper capsule collision per `examples/capsule-controller.ts`:

```typescript
// Current (WRONG)
const blocked = position.x < -width/2 || position.x > width/2;

// Required (RIGHT)
const collision = multiRayCapsuleCheck(position, targetPosition);
if (collision.hit) {
  const slide = slideAlongSurface(movement, collision.normal);
  position.add(slide);
}
```

Implement:
- Sphere cast from multiple capsule points
- Step climbing (0.4m max step)
- Slide response along surfaces
- Ground detection with slope handling

### B2: Object Collision Integration
**Priority:** CRITICAL
**Files:** `src/systems/CollisionManager.ts`

New collision manager that tracks all collidable objects:

```typescript
class CollisionManager {
  private staticColliders: Collider[] = [];  // Walls, floors
  private dynamicColliders: Collider[] = []; // Breathing walls
  private furnitureColliders: Collider[] = [];
  private artColliders: Collider[] = [];

  addRoom(room: Room): void;
  removeRoom(room: Room): void;
  testMovement(start: Vector3, end: Vector3, radius: number): CollisionResult;
}
```

### B3: Breathing Wall Collision
**Priority:** HIGH
**Files:** Integrate with existing wall system

Per `examples/breathing-walls.ts`:
- Walls that oscillate update their collision bounds
- Player pushed when wall expands into them
- Collision matches visual exactly

### B4: Portal Collision & Transition
**Priority:** HIGH
**Files:** `src/systems/TransitionSystem.ts`

Portal-based collision handling:
- Door frame is solid (can't walk through frame)
- Door opening is trigger volume
- Scale transformation for impossible interiors
- Momentum preservation through portals

### B5: Audio-Movement Binding
**Priority:** MEDIUM
**Files:** `src/systems/NavigationSystem.ts`

Per `references/audio-movement-binding.md`:

```typescript
// Bass adds weight
const bassWeight = 1 + audioData.bass * 0.15;
velocity.divideScalar(bassWeight);

// Transients cause micro-stumble
if (audioData.transient > 0.8 && transientCooldown <= 0) {
  velocity.multiplyScalar(0.85);
  camera.rotation.z += (Math.random() - 0.5) * 0.02;
  transientCooldown = 0.3;
}

// Asymmetric traversal
const forwardSpeed = baseSpeed * 1.0;
const backwardSpeed = baseSpeed * 0.85;
```

### B6: Camera Drift
**Priority:** MEDIUM
**Files:** `src/hooks/useNavigation.ts`

Subtle autonomous camera behavior:
- Micro-sway increases with Growl
- Occasional drift toward points of interest
- Head-bob occasionally desyncs from footsteps

---

## STREAM C: Room Shapes & Flow (level-design skill)

**Skill Reference:** `skills/level-design/SKILL.md`
**Key References:**
- `references/sprawling-palace-design.md` - Beyond rectangles
- `references/room-archetypes.md` - 12 detailed templates
- `references/spatial-narrative.md` - Architecture as story

### C1: Non-Rectangular Room Shapes
**Priority:** CRITICAL
**Files:** `src/generators/RoomGenerator.ts`

Replace rectangular generation with organic shapes:

```typescript
type RoomShape =
  | 'rectangle'    // Keep for some rooms
  | 'L_shape'      // Can't see all at once
  | 'H_shape'      // Vulnerable traverse
  | 'triangle'     // No back wall
  | 'hexagon'      // Which door did you enter?
  | 'spiral'       // Center has no exit
  | 'irregular';   // Procedural polygon

interface OrganicRoomConfig {
  vertices: Vector2[];           // Floor polygon
  heightVariations: HeightPoint[]; // Split levels
  wallCurves: CurveDefinition[]; // Curved walls
}
```

Shape selection based on depth:
- Depth 0-5: 70% rectangle, 20% L, 10% other
- Depth 6-15: 40% rectangle, 30% L/H, 30% other
- Depth 16+: 20% rectangle, 30% L/H, 50% irregular/spiral

### C2: Vertical Complexity
**Priority:** HIGH
**Files:** `src/generators/RoomGenerator.ts`

Add vertical elements per sprawling-palace-design:
- Sunken areas (pits within rooms)
- Raised platforms (islands of floor)
- Mezzanines (half-floors overlooking)
- Split levels (steps interrupting space)

```typescript
interface VerticalElement {
  type: 'sunken' | 'raised' | 'mezzanine' | 'split';
  footprint: Vector2[];
  heightDelta: number;
  hasRail: boolean;
  accessible: boolean;
}
```

**Collision:** Step climbing handles transitions; rails prevent falls

### C3: Corridor Evolution
**Priority:** HIGH
**Files:** `src/generators/CorridorGenerator.ts` (NEW)

Corridors are not tubes—they are spaces:

```typescript
interface EvolvingCorridor {
  segments: CorridorSegment[];
  widthProgression: number[];    // Widening or narrowing
  heightProgression: number[];   // Ceiling changes
  curvature: number;             // Slight curves
  branches: CorridorBranch[];    // Fractal branching
}
```

Types:
- Widening (pressure → release)
- Narrowing (comfort → claustrophobia)
- Breathing (width pulses with audio)
- Branching (fractal multiplication)

### C4: Room Archetype Implementation
**Priority:** HIGH
**Files:** `src/generators/ArchetypeRooms.ts` (NEW)

Implement archetypes from `references/room-archetypes.md`:

**Domestic:**
- The Living Room That Isn't (L-shaped, furniture facing wrong)
- The Kitchen That Doesn't Feed (galley, appliances non-functional)
- The Bedroom That Doesn't Rest (bed positioned wrong)

**Institutional:**
- The Corridor of Too Many Doors (some fake)
- The Waiting Room for Nothing (too many chairs)
- The Office That Doesn't Work (identical personal effects)

**Transitional:**
- The Stairwell of Wrong Floors (count doesn't match)
- The Elevator Bank for No Building (impossible floors)

**Commercial:**
- The Store That Sells Nothing (empty packaging)
- The Restaurant That Doesn't Serve (food untouched)

**Void:**
- The Atrium of Scale (multi-story void)
- The Parking Structure of No Cars (low ceiling, columns)

### C5: Wrongness Escalation System
**Priority:** HIGH
**Files:** `src/systems/WrongnessSystem.ts` (NEW)

Per `examples/wrongness-escalation.ts`:

```typescript
function calculateWrongness(depth: number, growlIntensity: number): WrongnessConfig {
  const level = getVariationLevel(depth, growlIntensity);
  // Level 1: Subtle (offset furniture)
  // Level 2: Noticeable (wrong door connections)
  // Level 3: Unsettling (backwards text, wrong faces)
  // Level 4: Surreal (gravity shifts, see yourself)
  // Level 5: Bizarre (reality breaks)
  return buildConfig(level, depth, growlIntensity);
}
```

Apply to:
- Room proportions (skew increases)
- Furniture orientation
- Door placement logic
- Window targets
- Clock behavior
- Light flicker chance

### C6: Spatial Narrative Flow
**Priority:** MEDIUM
**Files:** `src/generators/FlowGenerator.ts` (NEW)

Implement flow patterns from spatial-narrative:

**The Descent Structure:**
```
Entrance → Mundane → Slightly Wrong → Wrong → Impossible → [The Deep]
     ↑                                                          ↓
     ←←←← Return Path (Everything Changed) ←←←←←←←←←←←←←←←←←←←←←
```

**Hub and Spoke:**
- Central hub with radiating wings
- Hub changes each time player returns

**Infinite Regression:**
- Room → Door → Hallway → Room (same room, smaller)

---

## Integration Phase

After streams complete, integration work:

### I1: Collision Debug Visualization
**Files:** `src/debug/CollisionDebug.tsx`

Toggle-able wireframe showing all collision:
- Green: Static geometry
- Blue: Triggers (doorways)
- Yellow: Furniture
- Red: Dynamic (breathing walls)

### I2: Wrongness Debug Panel
**Files:** `src/debug/WrongnessDebug.tsx`

Display current:
- Depth
- Growl intensity
- Variation level
- Active wrongnesses
- Room archetype

### I3: Performance Optimization
**Files:** Multiple

- Spatial hash for collision queries
- Collision LOD (detailed near, simple far)
- Room pooling (keep 5 rooms, dispose others)
- Frustum culling for furniture/art

### I4: Playwright Visual Testing
**Files:** `tests/`

Per `lovely-hatching-lovelace.md` Phase 7:
- Desktop 1920x1080 bloom/glow verification
- Mobile 375x667 touch controls
- Growl phase progression screenshots
- Portal variation captures

---

## Execution Order

### Phase 1: Foundation (Parallel)
| Stream | Task | Dependency |
|--------|------|------------|
| B | B1: Capsule Controller | None |
| B | B2: Collision Manager | B1 |
| C | C1: Non-Rectangular Shapes | None |
| C | C5: Wrongness System | None |

### Phase 2: Structure (Parallel)
| Stream | Task | Dependency |
|--------|------|------------|
| B | B3: Breathing Wall Collision | B2 |
| B | B4: Portal Collision | B2 |
| C | C2: Vertical Complexity | C1 |
| C | C3: Corridor Evolution | C1 |
| C | C4: Room Archetypes | C1, C5 |

### Phase 3: Art (Parallel)
| Stream | Task | Dependency |
|--------|------|------------|
| A | A1: Painting System | B2 (collision) |
| A | A2: Sculpture System | B2 |
| A | A3: Furniture with Intent | B2, C5 |
| B | B5: Audio-Movement | B1 |
| B | B6: Camera Drift | B5 |

### Phase 4: Polish (Parallel)
| Stream | Task | Dependency |
|--------|------|------------|
| A | A4: Light as Art | A1-A3 |
| A | A5: Audio as Art | None |
| C | C6: Spatial Flow | C4 |

### Phase 5: Integration (Sequential)
| Task | Dependency |
|------|------------|
| I1: Collision Debug | All B |
| I2: Wrongness Debug | All C |
| I3: Performance | All |
| I4: Playwright Tests | All |

---

## Success Criteria

### Collision (Stream B)
- [x] Player cannot walk through any visible geometry
- [x] Player can navigate around all furniture
- [x] Breathing walls push player correctly
- [x] Portal transitions preserve momentum
- [x] No invisible walls anywhere

### Spatial Design (Stream C)
- [x] At least 6 non-rectangular room shapes implemented
- [x] Vertical elements (sunken, raised, mezzanine) present
- [x] Corridors evolve (widen, narrow, branch)
- [x] 8+ room archetypes implemented
- [x] Wrongness escalates with depth and Growl

### Art Direction (Stream A)
- [x] Paintings present with procedural wrongness
- [x] Sculptures that suggest without showing
- [x] Furniture tells stories through arrangement
- [x] No cheap horror—dignified dread only
- [x] Beauty that makes you sad

### Overall
- [x] 60fps on desktop, 30fps on mobile
- [x] No invisible walls
- [x] Every room feels unique yet consistent
- [x] Player questions their perception
- [x] The palace feels alive

---

## Agent Prompts

### Stream A Agent (Art)
```
You are implementing art and aesthetic systems for a surreal 3D experience.
Use the game-design skill from surreal-game-design plugin.

Key principles:
- Beauty that knows pain—class, taste, nuance
- NOT horror imagery—wrongness in the mundane
- Paintings with wrong horizons, composite faces
- Sculptures that suggest without showing
- Furniture arranged with hostile intent

Reference: ~/.claude/plugins/surreal-game-design/skills/game-design/

All art objects MUST have collision meshes.
```

### Stream B Agent (Collision)
```
You are implementing collision and movement feel for a surreal 3D experience.
Use the movement-system skill from surreal-game-design plugin.

CRITICAL: No invisible walls. Every collision must have visible geometry.

Implement:
1. Capsule controller with step climbing
2. Collision manager for all objects
3. Breathing wall dynamic collision
4. Portal transition with scale handling
5. Audio-movement binding (bass = weight)

Reference: ~/.claude/plugins/surreal-game-design/skills/movement-system/
Example: examples/capsule-controller.ts
```

### Stream C Agent (Level Design)
```
You are implementing level design systems for a surreal 3D experience.
Use the level-design skill from surreal-game-design plugin.

The palace is an organism, not boxes connected by tubes.

Implement:
1. Non-rectangular room shapes (L, H, triangle, hexagon, spiral)
2. Vertical complexity (sunken, raised, mezzanine)
3. Evolving corridors (widen, narrow, branch)
4. Room archetypes (12 types from references)
5. Wrongness escalation system

Reference: ~/.claude/plugins/surreal-game-design/skills/level-design/
Example: examples/wrongness-escalation.ts

All geometry MUST have corresponding collision.
```

---

---

## STREAM D: Audio Reactivity Verification

**Priority:** CRITICAL — runs parallel to all other streams

The visualizer MUST react to the audio stream. This is the core experience.

### D1: Audio Pipeline Verification
**Priority:** CRITICAL
**Files:** `src/core/AudioCapture.ts`, `src/core/AudioAnalyser.ts`, `src/store/audioStore.ts`

Verify the complete audio pipeline:

```
Audio Source → AudioCapture → AnalyserNode → AudioAnalyser → audioStore → Shaders
```

**Checklist:**
- [x] `getDisplayMedia({ audio: true })` or `getUserMedia({ audio: true })` connects
- [x] AnalyserNode receives data (check `getByteFrequencyData` returns non-zero)
- [x] FFT bands extracted correctly (bass 20-250Hz, mid 250-4kHz, high 4k+)
- [x] Transient detection fires on audio peaks
- [x] Smoothed values update every frame
- [x] Store updates propagate to subscribers

**Debug logging:**
```typescript
// Add to AudioAnalyser.update()
console.log(`Audio: bass=${this.bass.toFixed(2)} mid=${this.mid.toFixed(2)} high=${this.high.toFixed(2)} transient=${this.transient.toFixed(2)}`);
```

### D2: Shader Uniform Binding
**Priority:** CRITICAL
**Files:** `src/systems/AudioReactiveSystem.ts`, `src/shaders/liminal.frag`

Verify audio data reaches shaders:

```typescript
// In useFrame or update loop
material.uniforms.u_bass.value = audioStore.bass;
material.uniforms.u_mid.value = audioStore.mid;
material.uniforms.u_high.value = audioStore.high;
material.uniforms.u_transient.value = audioStore.transient;
material.uniforms.u_bassSmooth.value = audioStore.bassSmooth;
material.uniforms.u_midSmooth.value = audioStore.midSmooth;
material.uniforms.u_highSmooth.value = audioStore.highSmooth;
```

**Shader verification:**
```glsl
// In liminal.frag - temporary debug visualization
// Makes walls flash red on bass hits
vec3 debugColor = mix(finalColor, vec3(1.0, 0.0, 0.0), u_bass * 0.5);
gl_FragColor = vec4(debugColor, 1.0);
```

### D3: Visual Response Verification
**Priority:** CRITICAL

Each of these MUST visibly respond to audio:

| Element | Audio Band | Expected Response |
|---------|------------|-------------------|
| Wall breathing | Bass | Walls pulse in/out with bass |
| Pattern distortion | Mid | Surface patterns shift with mids |
| Glow intensity | High | Edge glows brighten with highs |
| Glitch triggers | Transient | Screen glitches on audio peaks |
| Doorway shimmer | Bass + Mid | Portal edges pulse |
| Dust particles | High | Particles agitate with highs |
| Fog density | Bass | Fog thickens on heavy bass |
| Circuitry pulse | All bands | Traces glow with frequency |
| Camera sway | Mid | Subtle sway increases with mids |
| Light flicker | Transient | Lights flicker on peaks |

### D4: Audio Debug Overlay
**Priority:** HIGH
**Files:** `src/debug/AudioDebug.tsx`

Real-time audio visualization overlay:

```tsx
function AudioDebug() {
  const { bass, mid, high, transient, bassSmooth } = useAudioStore();

  return (
    <div className="audio-debug">
      <div className="bar bass" style={{ width: `${bass * 100}%` }} />
      <div className="bar mid" style={{ width: `${mid * 100}%` }} />
      <div className="bar high" style={{ width: `${high * 100}%` }} />
      <div className="bar transient" style={{ width: `${transient * 100}%` }} />
      <div className="label">Bass: {bass.toFixed(2)}</div>
      <div className="label">Mid: {mid.toFixed(2)}</div>
      <div className="label">High: {high.toFixed(2)}</div>
      <div className="label">Transient: {transient.toFixed(2)}</div>
    </div>
  );
}
```

### D5: Fallback Test Patterns
**Priority:** MEDIUM
**Files:** `src/core/AudioAnalyser.ts`

When no audio connected, generate test patterns:

```typescript
function generateTestAudio(time: number): AudioLevels {
  return {
    bass: 0.3 + Math.sin(time * 0.5) * 0.3,
    mid: 0.2 + Math.sin(time * 1.2) * 0.2,
    high: 0.1 + Math.sin(time * 3.0) * 0.1,
    transient: Math.random() > 0.95 ? 1.0 : 0.0
  };
}
```

This proves the visual system works even without live audio.

### D6: Audio Capture Troubleshooting

**Common issues:**

1. **No audio data (all zeros)**
   - Check browser permissions for audio capture
   - Verify `getDisplayMedia` or `getUserMedia` succeeded
   - Ensure audio source is actually playing
   - Check AnalyserNode is connected to source

2. **Audio data but no visual response**
   - Verify uniforms are updating in useFrame
   - Check shader uniform names match
   - Ensure materials are using AudioReactiveSystem materials
   - Look for normalization issues (values 0-255 vs 0-1)

3. **Delayed response**
   - Reduce smoothing factor (0.15 → 0.3)
   - Check for frame drops
   - Verify requestAnimationFrame is running

4. **Only some elements respond**
   - Each mesh needs AudioReactiveMaterial
   - Check material assignment in RoomGenerator
   - Verify all shader variants receive uniforms

---

## Notes

- **Collision is non-negotiable.** Every visual element must be solid.
- **Wrongness escalates.** Depth 0 is strange; depth 20 is impossible.
- **Art has dignity.** No jump scares, no gore, no obvious horror.
- **The palace breathes.** Audio reactivity is fundamental, not decoration.
- **Memory is unreliable.** Backtracking reveals changes.

The goal is not to scare. The goal is to unsettle. The goal is wrongness.

---

---

## Quick Start Verification

Before running the zerg loop, verify the audio pipeline works:

### 1. Start the dev server
```bash
cd /home/lain/git/keegans_mind_palace
npm run dev
```

### 2. Open browser and grant audio permission
- Click "Share Audio" when prompted
- Select a window/tab playing music
- Or use microphone fallback

### 3. Verify audio data is flowing
Open browser console and look for audio updates. If no data:
- Check `isCapturing` in audioStore
- Verify `requestAnimationFrame` loop is running
- Check for errors in AudioCapture

### 4. Verify visual response
With audio playing:
- Walls should pulse/breathe with bass
- Surface patterns should shift with mids
- Glows should brighten with highs
- Glitches should fire on transients (audio peaks)

### 5. Demo mode fallback
If no audio available, demo mode auto-starts:
- Procedural sine-wave audio simulation
- Proves visual system works independent of capture

### Audio Pipeline Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AUDIO PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌───────────────┐    ┌───────────────┐             │
│  │ User Grants  │───▶│ AudioCapture  │───▶│ MediaStream   │             │
│  │ Permission   │    │               │    │ to SourceNode │             │
│  └──────────────┘    └───────────────┘    └───────┬───────┘             │
│                                                   │                      │
│                                                   ▼                      │
│  ┌──────────────┐    ┌───────────────┐    ┌───────────────┐             │
│  │ Every Frame  │◀───│ AudioAnalyser │◀───│ AnalyserNode  │             │
│  │ rAF loop     │    │ .getLevels()  │    │ FFT 2048      │             │
│  └──────┬───────┘    └───────────────┘    └───────────────┘             │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────┐    ┌───────────────┐    ┌───────────────┐             │
│  │ audioStore   │───▶│ React hooks   │───▶│ useFrame()    │             │
│  │ Zustand      │    │ useAudioLevels│    │ update loop   │             │
│  └──────────────┘    └───────────────┘    └───────┬───────┘             │
│                                                   │                      │
│                                                   ▼                      │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │              SHADER UNIFORMS UPDATE                       │           │
│  │  u_bass, u_mid, u_high, u_transient                       │           │
│  │  u_bassSmooth, u_midSmooth, u_highSmooth                  │           │
│  └──────────────────────────────────────────────────────────┘           │
│                              │                                           │
│                              ▼                                           │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │              VISUAL RESPONSE                              │           │
│  │  • Walls breathe (bass)                                   │           │
│  │  • Patterns shift (mid)                                   │           │
│  │  • Glows pulse (high)                                     │           │
│  │  • Glitches fire (transient)                              │           │
│  └──────────────────────────────────────────────────────────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Files for Audio Binding
- `src/core/AudioCapture.ts` - Captures browser audio
- `src/core/AudioAnalyser.ts` - FFT analysis, band extraction
- `src/store/audioStore.ts` - Zustand store for levels
- `src/hooks/useAudioAnalysis.ts` - React hook for capture
- `src/systems/AudioReactiveSystem.ts` - Material updates
- `src/shaders/liminal.frag` - Shader using audio uniforms

---

*Plan generated for Keegan's Mind Palace refinement using surreal-game-design plugin skills.*
