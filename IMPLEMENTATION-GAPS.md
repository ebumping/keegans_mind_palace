# Keegan's Mind Palace - Implementation Gaps

A comprehensive audit of disconnected systems, missing integrations, and broken pipelines. Audio reactivity does not work end-to-end. Environment creation past room 1 lacks polish and curation.

**Audited from:** `lovely-hatching-lovelace.md` (project spec)
**Date:** 2026-01-28

---

## Critical: Audio Reactivity Pipeline is Broken

The spec defines a clean data flow:
```
Desktop Audio → getDisplayMedia → AnalyserNode → AudioAnalyser → Zustand Store → useFrame() → Shader Uniforms
```

In practice, this pipeline has multiple breaks, dead code, and over-smoothing that render audio reactivity non-functional or imperceptible.

---

### A1. Missing Glitch Shader Uniforms — Geometry Glitch Dead on Arrival
**Priority:** Critical
**Files:** `src/systems/AudioReactiveSystem.ts`, `src/shaders/liminal.vert`

**Problem:** `createLiminalUniforms()` never defines `u_geometryGlitch` or `u_glitchTime`, but the vertex shader (`liminal.vert`) expects them. When `GlitchSystem.registerMaterial()` checks for `u_geometryGlitch`, it doesn't find it. Materials never register for glitch updates.

**Tasks:**
- [ ] Add `u_geometryGlitch: { value: 0.0 }` and `u_glitchTime: { value: 0.0 }` to `createLiminalUniforms()` in `AudioReactiveSystem.ts`
- [ ] Verify `GlitchSystem.registerMaterial()` can find and update these uniforms after the fix
- [ ] Test geometry distortion visually responds to audio transients

---

### A2. Triple Smoothing Makes Audio Response Sluggish/Invisible
**Priority:** Critical
**Files:** `src/core/AudioAnalyser.ts`, `src/store/audioStore.ts`, `src/shaders/liminal.frag`

**Problem:** Audio data is smoothed three separate times before reaching shaders:
1. `AudioAnalyser` applies `smoothingTimeConstant = 0.8` (AnalyserNode-level, very aggressive)
2. `audioStore.updateLevels()` applies `SMOOTH_FACTOR = 0.15` (exponential moving average)
3. Shaders use `u_bassSmooth` / `u_midSmooth` / `u_highSmooth` (yet another layer)

Combined, this makes audio feel delayed and unresponsive. Sharp transients are rounded off before they reach the GPU.

**Tasks:**
- [ ] Reduce `smoothingTimeConstant` from `0.8` to `0.4`–`0.5` on the AnalyserNode
- [ ] Remove or reduce store-level smoothing (`SMOOTH_FACTOR`) — AnalyserNode smoothing is sufficient
- [ ] Audit shader smoothing — decide whether `u_bassSmooth` should exist at all, or if raw values are enough
- [ ] Verify audio transients visually punch through with a test track (kick drum isolation)

---

### A3. Transient Uniform Receives Boolean, Not Intensity
**Priority:** High
**Files:** `src/systems/AudioReactiveSystem.ts`, `src/core/AudioAnalyser.ts`

**Problem:** `AudioLevels.transient` is a `boolean` (true/false). `AudioLevels.transientIntensity` is a `number` (0–1). The shader update writes:
```typescript
uniforms.u_transient.value = audioData.transient; // boolean → 0 or 1
```
This means the shader only ever sees `0` or `1` — no gradual falloff, no proportional response. The useful `transientIntensity` value is ignored.

**Tasks:**
- [ ] Change shader update to use `audioData.transientIntensity` instead of `audioData.transient`
- [ ] Audit all consumers of `audioData.transient` boolean and decide if it should be removed from the API
- [ ] Verify transient-driven effects (glitch triggers, artifact spawns) respond proportionally

---

### A4. AudioContext Never Resumed — Silent in Autoplay-Restricted Browsers
**Priority:** High
**Files:** `src/hooks/useAudioAnalysis.ts`, `src/core/AudioCapture.ts`

**Problem:** `AudioCapture.resumeContext()` exists but is never called. Browsers with autoplay restrictions (Chrome, Safari) suspend AudioContext until explicit user-gesture resume. Analysis loop runs but receives all zeros.

**Tasks:**
- [ ] Call `audioCapture.resumeContext()` after successful `startCapture()` in `useAudioAnalysis.ts`
- [ ] Add a check: if `audioContext.state === 'suspended'`, resume on next user interaction
- [ ] Log a warning when AudioContext is suspended so developers can diagnose

---

### A5. Audio Stream End Doesn't Fallback — Visuals Freeze on Stale Data
**Priority:** High
**Files:** `src/hooks/useAudioAnalysis.ts`, `src/core/AudioCapture.ts`

**Problem:** When the user stops sharing audio (stream ends), `handleStreamEnded()` fires cleanup. But:
- Shader uniforms retain their last values (stale audio data)
- No automatic fallback to demo mode
- UI shows audio inactive, but room still "breathes" at frozen intensity

**Tasks:**
- [ ] On stream end, zero out all audio store values (bass/mid/high/transient → 0)
- [ ] Auto-transition to demo mode when stream drops, or smoothly decay values to zero
- [ ] Show UI indicator that audio source was lost

---

### A6. Demo Mode Timing Assumes Fixed 60fps
**Priority:** Medium
**Files:** `src/core/AudioAnalyser.ts`

**Problem:** `DemoAudioGenerator` increments time with hardcoded `this.time += 0.016` (~60fps). At 30fps the demo runs at half speed; at 144fps it runs at 2.4x speed.

**Tasks:**
- [ ] Pass actual delta time to `DemoAudioGenerator.getLevels(delta)`
- [ ] Replace `this.time += 0.016` with `this.time += delta`

---

### A7. useAudioHistory Selector Defeats Memoization — Re-renders Every Frame
**Priority:** Medium
**Files:** `src/store/audioStore.ts`

**Problem:** `useAudioHistory()` calls `.toArray()` on ring buffers, creating new array instances each frame. `useShallow` always sees new references. Every consumer re-renders every frame regardless of actual change.

**Tasks:**
- [ ] Cache `toArray()` results and only regenerate when `historyVersion` changes
- [ ] Or expose a ref-stable getter instead of a selector
- [ ] Remove `historyVersion` counter if unused after fix (currently dead code)

---

### A8. Dead Store History Arrays Never Updated
**Priority:** Low
**Files:** `src/store/audioStore.ts`

**Problem:** Store state contains `bassHistory`, `midHistory`, `highHistory` arrays initialized to zeros but never written to by `updateLevels()`. Actual history lives in ring buffers. These arrays are dead code that misleads consumers.

**Tasks:**
- [ ] Remove `bassHistory`, `midHistory`, `highHistory` from store state
- [ ] Or populate them from ring buffers in `updateLevels()` if they serve a purpose

---

### A9. Missing Audio Event Listener Cleanup
**Priority:** Low
**Files:** `src/core/AudioCapture.ts`

**Problem:** Audio track `ended` event listeners are added but never removed. Starting a new stream leaves stale listeners on old disposed tracks.

**Tasks:**
- [ ] Store listener references and remove them in `cleanup()`
- [ ] Verify no stale callbacks fire after stream replacement

---

### A10. Double `setCapturing` Call on Stream Start
**Priority:** Low
**Files:** `src/hooks/useAudioAnalysis.ts`

**Problem:** `setCapturing(true, source)` is called both in the `onStreamStart` callback (line ~102) and again after analyser creation (line ~134). Redundant state update could cause race conditions.

**Tasks:**
- [ ] Remove one of the duplicate calls
- [ ] Verify capturing state transitions are clean

---

## Critical: Environment Creation Post-Room-1 Lacks Integration

The generators produce rich configs (shapes, archetypes, vertical elements, wrongness, circuitry, corridors, variations). But `Room.tsx` only partially consumes them. The result: rooms past the first one are procedurally complex in data but visually generic.

---

### E1. Vertical Elements Generated But Never Rendered
**Priority:** Critical
**Files:** `src/generators/RoomGenerator.ts`, `src/generators/VerticalElementGenerator.ts`, `src/components/Room.tsx`

**Problem:** `RoomGenerator` calls `VerticalElementGenerator.generate()` and stores results in `RoomConfig.verticalElements`. But `Room.tsx` has no component that renders vertical elements. Sunken areas, raised platforms, mezzanines, pits, shafts, and split-level floors are all invisible.

**Tasks:**
- [ ] Create `VerticalElements.tsx` component that renders floor depressions, platforms, stairs, and mezzanines from config
- [ ] Integrate into `Room.tsx` rendering pipeline
- [ ] Add collision geometry for vertical elements in `CollisionManager.ts`
- [ ] Test that room spatial complexity is visible when walking through rooms 5+

---

### E2. Circuitry System Completely Orphaned
**Priority:** Critical
**Files:** `src/generators/CircuitryGenerator.ts`, `src/systems/CircuitrySystem.ts`, `src/shaders/circuitry.vert`, `src/shaders/circuitry.frag`

**Problem:** Full circuitry generation exists — spawn probability, node layout, trace patterns, audio-reactive pulse shader. But `RoomGenerator` never calls `CircuitryGenerator`. `Room.tsx` has no circuitry rendering. The entire electronic circuit aesthetic is absent.

**Tasks:**
- [ ] Call `CircuitryGenerator.generate()` from `RoomGenerator` when `shouldSpawnCircuitry()` returns true
- [ ] Create `CircuitryOverlay.tsx` component that renders circuit traces on wall/floor surfaces
- [ ] Connect `CircuitrySystem` audio pulse uniforms to rendered materials
- [ ] Verify ~20% of rooms show glowing circuit traces (spec target: 15–25%)

---

### E3. Corridor Generator Never Used
**Priority:** High
**Files:** `src/generators/CorridorGenerator.ts`, `src/generators/RoomGenerator.ts`

**Problem:** `CorridorGenerator` implements 6 evolution types (widening, narrowing, breathing, branching, terminated, serpentine). It is never called. Rooms connect through simple rectangular doorways. No hallway segments exist between rooms.

**Tasks:**
- [ ] Integrate corridor generation into room transitions — when transitioning between rooms, generate a corridor segment
- [ ] Or create corridor-type rooms that appear between standard rooms at intervals
- [ ] Connect corridor breathing/width animation to bass frequency data
- [ ] Test that corridors add spatial variety to the exploration loop

---

### E4. Variation System (Levels 1–5) Never Activated
**Priority:** High
**Files:** `src/generators/VariationGenerator.ts`, `src/systems/PortalVariationSystem.ts`, `src/systems/TransitionSystem.ts`

**Problem:** `VariationGenerator` fully implements 5 escalating levels of portal variations (subtle wallpaper changes → reality breaks). `PortalVariationSystem` calculates variation probabilities. Neither is called from `TransitionSystem.generateRoom()`. The game never escalates into surreal territory.

**Tasks:**
- [ ] Call `PortalVariationSystem.calculateVariationLevel()` during room transition
- [ ] Apply `VariationGenerator` changes to room config before rendering
- [ ] Implement visual rendering for each variation level:
  - [ ] Level 1: Wallpaper seed change, furniture offset — config changes only
  - [ ] Level 2: Door target remapping, extra geometry, room stretch — geometry changes
  - [ ] Level 3: UV flips for backwards text, wrong painting content — material changes
  - [ ] Level 4: Gravity uniform, Escher geometry, mirror self — shader + physics changes
  - [ ] Level 5: Reality tear shader, PS1 graphics mode, void room — post-processing changes
- [ ] Add portal shimmer effect on doorways leading to alternate versions

---

### E5. Wrongness Affects Config But Not Rendered Geometry
**Priority:** High
**Files:** `src/systems/WrongnessSystem.ts`, `src/generators/RoomGenerator.ts`, `src/components/Room.tsx`

**Problem:** `WrongnessSystem.applyWrongnessToShape()` modifies vertex positions with proportion skew and angle variance. `WrongnessSystem` generates parameters for fake doors, ceiling height variance, furniture displacement, and impossible shadows. But:
- Wall geometry uses the pre-wrongness shape vertices for rendering
- Fake doors never spawn
- Ceiling height variance not applied
- Impossible shadows not implemented
- Only furniture displacement is partially connected

**Tasks:**
- [ ] Apply wrongness-skewed vertices to actual wall mesh generation (not just config)
- [ ] Implement fake door rendering (doors that lead nowhere, sealed shut)
- [ ] Add ceiling height variance per room segment
- [ ] Implement shadow direction anomalies (lights casting wrong-direction shadows)
- [ ] Verify wrongness escalation is visually noticeable at room depths 10, 20, 50

---

### E6. Archetype System Doesn't Differentiate Room Visuals
**Priority:** High
**Files:** `src/generators/ArchetypeRoomGenerator.ts`, `src/components/Room.tsx`

**Problem:** Archetypes (LIVING_ROOM, KITCHEN, OFFICE, BEDROOM, STAIRWELL, PARKING, LAUNDRY, etc.) are selected and configure dimensions, but `Room.tsx` only passes archetype to `Furniture`. Room lighting, materials, ceiling style, floor pattern, and atmosphere don't change per archetype.

**Tasks:**
- [ ] Map each archetype to distinct floor material (carpet for bedroom, tile for kitchen, concrete for parking)
- [ ] Map each archetype to distinct lighting style (fluorescent for office, warm for bedroom, bare bulb for stairwell)
- [ ] Map each archetype to ceiling treatment (drop ceiling for office, exposed pipes for parking, ornate for living room)
- [ ] Add archetype-specific ambient sound hints (hum for fluorescent, drip for parking)
- [ ] Verify archetype variety is perceptible when traversing 10 rooms

---

### E7. Doorway Placement Broken for Non-Rectangular Shapes
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`

**Problem:** `placeDoorwaysForShape()` has an explicit TODO and falls back to rectangular placement logic for all complex shapes (L, H, Triangle, Hexagon, Spiral, Curved, Irregular). This means doorways may be placed on walls that don't exist, or clip through geometry.

```typescript
// TODO: Place doorways on polygon edges for non-rectangular shapes
return this.placeDoorways(...); // Uses rectangular logic
```

**Tasks:**
- [ ] Implement doorway placement along actual polygon edges
- [ ] Calculate valid wall segments from shape vertices
- [ ] Prevent doorway placement on edges shorter than door width
- [ ] Test with L-shape and hexagon room shapes

---

### E8. Visited Room Consistency is Broken
**Priority:** High
**Files:** `src/systems/TransitionSystem.ts`

**Problem:** `markRoomVisited()` stores the room seed, but `generateRoom()` regenerates the config from scratch using `roomIndex` — it doesn't use the stored seed to reproduce the exact same room. Backtracking creates subtly different rooms each time, breaking immersion.

**Tasks:**
- [ ] Use stored `visited.seed` when regenerating a previously visited room
- [ ] Store full room config (or deterministic inputs) for visited rooms, not just seed
- [ ] Verify entering and re-entering room N produces identical layout
- [ ] Test: walk forward 5 rooms, walk back 5 rooms, confirm visual consistency

---

### E9. Room Pooling / Memory Management Not Implemented
**Priority:** Medium
**Files:** `src/App.tsx`, `src/components/Room.tsx`

**Problem:** Spec calls for keeping 5 rooms in memory (current ±2) with pooling. Current implementation loads one room at a time. No unloading, no geometry disposal, no material cleanup.

**Tasks:**
- [ ] Implement room pool manager holding current room + adjacent rooms
- [ ] Dispose Three.js geometries and materials when rooms leave the pool
- [ ] Pre-generate adjacent rooms for instant transitions
- [ ] Monitor GPU memory usage to stay within ~20MB budget

---

### E10. Complex Room Shapes Rendered as Flat Planes
**Priority:** Medium
**Files:** `src/generators/RoomGenerator.ts`, `src/generators/RoomShapeGenerator.ts`

**Problem:** Spiral, curved, and irregular polygon shapes generate vertices but wall geometry is created as flat planes between vertex pairs. Curved walls appear as faceted segments. Spiral rooms look like angular corridors.

**Tasks:**
- [ ] Add tessellation for curved wall segments (subdivide arc into smooth segments)
- [ ] Implement proper spiral room rendering with continuous curve
- [ ] Test that complex shapes read as intentionally non-rectangular, not glitchy

---

### E11. Lighting Behavioral System Not Rendered
**Priority:** Medium
**Files:** `src/generators/RoomGenerator.ts`, `src/components/Room.tsx`

**Problem:** Room config generates ceiling lighting parameters (type: recessed/fluorescent/bare_bulb/chandelier, flicker probability, color temperature). But no dynamic light objects are created from these configs. `MelancholicLight.tsx` exists but doesn't consume room-level lighting config.

**Tasks:**
- [ ] Create light objects from room ceiling config (point lights, area lights)
- [ ] Implement flicker behavior driven by Growl intensity + audio mid-frequency
- [ ] Connect lighting type to visual appearance (tube geometry for fluorescent, bare mesh for bulb)
- [ ] Map archetype → lighting preset as a starting point

---

### E12. Doorway Navigation / Transition Trigger Unclear
**Priority:** Medium
**Files:** `src/systems/NavigationSystem.ts`, `src/systems/TransitionSystem.ts`, `src/App.tsx`

**Problem:** It's unclear how walking into a doorway triggers a room transition. `NavigationSystem` handles collision with walls, but the bridge between doorway proximity detection and `TransitionSystem.transitionToRoom()` needs verification.

**Tasks:**
- [ ] Verify doorway bounding boxes are checked each frame in navigation loop
- [ ] Ensure crossing the doorway threshold triggers `TransitionSystem.transitionToRoom()`
- [ ] Add visual feedback when approaching a doorway (glow intensifies, subtle pull)
- [ ] Test: walk through 10 doors consecutively without getting stuck or skipping rooms

---

## Medium: The Growl & Horror Systems Need Polish

### G1. Growl Sub-Bass Drone Not Audible
**Priority:** Medium
**Files:** `src/systems/GrowlSystem.ts`

**Problem:** The Growl system tracks time and intensity, but the sub-bass drone (30Hz oscillator) may not be perceptible on most speakers and needs volume calibration. Additionally, GrowlSystem effects (shadow anomalies, light flickers, presence feel) need integration testing.

**Tasks:**
- [ ] Calibrate sub-bass drone frequency and volume for laptop speakers (bump to 50–80Hz)
- [ ] Add a secondary harmonic or modulated noise layer for perceptibility
- [ ] Test shadow anomaly rendering at Growl intensity 0.3, 0.6, 0.9
- [ ] Verify camera shake / FOV distortion scales correctly
- [ ] Test with simulated timestamps (localStorage override) at hour 2, 6, 12, 24

---

### G2. Glitch System Only Triggers on Audio — Should Also Trigger on Time/Growl
**Priority:** Medium
**Files:** `src/systems/GlitchSystem.ts`, `src/components/GlitchController.tsx`

**Problem:** Glitch effects currently trigger on audio transients only. Spec says glitches should also trigger from time-based chance scaled by Growl intensity. Without audio playing, no glitches ever occur — breaking the horror atmosphere.

**Tasks:**
- [ ] Add time-based random glitch trigger in `GlitchSystem` scaled by Growl intensity
- [ ] Implement Growl-driven ambient glitch probability: `baseChance * growlIntensity`
- [ ] Ensure glitches can occur even without audio input
- [ ] Test: let site sit for simulated 12 hours with no audio — glitches should appear

---

### G3. Glitch Effects Incomplete
**Priority:** Medium
**Files:** `src/systems/GlitchSystem.ts`, `src/shaders/glitch.frag`

**Problem:** Only basic screen tear is implemented. Missing: RGB channel separation intensity scaling, pixel dissolve/dithering, geometry distortion (vertex jitter), and "reality break" full-screen effect.

**Tasks:**
- [ ] Implement RGB channel split with intensity proportional to transient + Growl
- [ ] Add pixel dissolve effect (posterize + dither at high Growl)
- [ ] Implement geometry glitch (vertex jitter in world space, requires A1 fix first)
- [ ] Create "reality break" full-screen inversion/distortion for Growl > 0.8
- [ ] Add post-processing pipeline integration for screen-space glitches

---

## Low Priority: Polish & Performance

### P1. Analyser Decibel Range Too Aggressive
**Priority:** Low
**Files:** `src/core/AudioAnalyser.ts`

**Problem:** `minDecibels = -90`, `maxDecibels = -10` creates an 80dB range. Quiet passages map to near-zero; loud passages compress. Reduces dynamic range of visual response.

**Tasks:**
- [ ] Test with `-70` to `-20` range for more usable dynamic range
- [ ] Consider auto-gain normalization based on recent peak levels

---

### P2. No Sample Rate Validation
**Priority:** Low
**Files:** `src/core/AudioCapture.ts`, `src/core/AudioAnalyser.ts`

**Problem:** AudioContext created without explicit sample rate. Frequency band calculations assume standard rates. Different devices may map bass/mid/high bands incorrectly.

**Tasks:**
- [ ] Read `audioContext.sampleRate` and log it
- [ ] Verify frequency band bin calculations use actual sample rate (not assumed 44.1kHz)

---

### P3. Transient Detection Can Fire Spuriously
**Priority:** Low
**Files:** `src/core/AudioAnalyser.ts`

**Problem:** Energy smoothing happens after transient check. Sudden audio drops can trigger false transients. Decay behavior could be more robust.

**Tasks:**
- [ ] Smooth energy before comparing to threshold
- [ ] Add minimum interval between transient triggers (debounce ~50ms)
- [ ] Test with music that has clear vs. ambiguous transients

---

### P4. Performance Monitor Quality Tiers May Need Tuning
**Priority:** Low
**Files:** `src/store/performanceStore.ts`, `src/debug/PerformanceMonitor.tsx`

**Problem:** FPS-based quality adaptation exists but thresholds haven't been tested across hardware. Could downgrade quality unnecessarily on capable hardware or fail to downgrade on weak hardware.

**Tasks:**
- [ ] Test quality tier thresholds on low-end hardware (integrated GPU)
- [ ] Test on high-refresh monitors (144Hz) — ensure tier doesn't drop from higher target FPS
- [ ] Add hysteresis to prevent quality tier oscillation

---

## Summary: Severity Matrix

| # | Gap | Severity | Area |
|---|-----|----------|------|
| A1 | Missing glitch shader uniforms | **Critical** | Audio |
| A2 | Triple audio smoothing | **Critical** | Audio |
| A3 | Transient boolean vs intensity | High | Audio |
| A4 | AudioContext never resumed | High | Audio |
| A5 | Stream end doesn't fallback | High | Audio |
| A6 | Demo mode 60fps assumption | Medium | Audio |
| A7 | History selector re-renders every frame | Medium | Audio |
| A8 | Dead store history arrays | Low | Audio |
| A9 | Missing event listener cleanup | Low | Audio |
| A10 | Double setCapturing call | Low | Audio |
| E1 | Vertical elements not rendered | **Critical** | Environment |
| E2 | Circuitry system orphaned | **Critical** | Environment |
| E3 | Corridor generator unused | High | Environment |
| E4 | Variation system never activated | High | Environment |
| E5 | Wrongness not applied to geometry | High | Environment |
| E6 | Archetypes don't differentiate visuals | High | Environment |
| E7 | Doorway placement broken for complex shapes | High | Environment |
| E8 | Visited room consistency broken | High | Environment |
| E9 | Room pooling not implemented | Medium | Environment |
| E10 | Complex shapes rendered flat | Medium | Environment |
| E11 | Lighting behavioral system not rendered | Medium | Environment |
| E12 | Doorway transition trigger unclear | Medium | Environment |
| G1 | Growl sub-bass not audible | Medium | Horror |
| G2 | Glitch only on audio, not time/Growl | Medium | Horror |
| G3 | Glitch effects incomplete | Medium | Horror |
| P1 | Analyser dB range too aggressive | Low | Polish |
| P2 | No sample rate validation | Low | Polish |
| P3 | Transient false positives | Low | Polish |
| P4 | Quality tier tuning | Low | Polish |

---

## Recommended Fix Order

1. **A1 + A2 + A3** — Fix audio pipeline first (uniforms, smoothing, transients)
2. **A4 + A5** — Make audio reliable (context resume, stream fallback)
3. **E5 + E7 + E8** — Fix wrongness rendering, doorway placement, room consistency
4. **E1 + E2** — Render vertical elements and circuitry (biggest visual impact)
5. **E4 + E6** — Activate variations and archetype differentiation
6. **E3** — Integrate corridors for spatial variety
7. **G1 + G2 + G3** — Polish horror systems (Growl, glitch escalation)
8. **E9 + E10 + E11 + E12** — Room pooling, shape polish, lighting, navigation
9. **A6–A10, P1–P4** — Low-priority cleanup and optimization
