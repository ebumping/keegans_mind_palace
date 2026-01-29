# Curated Liminal Room Overhaul

Replace procedurally-generated, wall-less rooms with intentionally crafted, sprawling liminal spaces that have proper boundaries, visible audio reactivity, and surreal architectural beauty. No more black void, no more walking through walls, no more walking off the map.

---

## How Agents Should Work

1. **Read existing code** before modifying — understand RoomGenerator.ts, Room.tsx, CollisionManager.ts, NavigationSystem.ts patterns
2. **Use the existing shader/material system** — AudioReactiveSystem.ts and liminal shaders are the rendering backbone
3. **Test with `npm run dev`** at `http://localhost:5173` after each phase
4. **Preserve Room 0** as the stable entry point — changes target rooms 1+
5. **Commit incrementally** after each section with descriptive messages

---

## Phase 1: Fix Core Rendering & Collision (Foundation)

### 1.1 Fix Wall Rendering for All Room Shapes
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`, `src/components/Room.tsx`

**Tasks:**
- [x] Audit `RoomGenerator.generateRoom()` (line ~457) to confirm mesh group contains walls, floor, and ceiling for every room shape type
- [x] Fix `createWallsFromPolygon()` to ensure every polygon edge produces a visible, properly-UV-mapped wall mesh with correct normals facing inward
- [x] Ensure floor and ceiling meshes are always created for non-rectangular rooms using THREE.ShapeGeometry from polygon vertices
- [x] Force `ceilingConfig.isVisible = true` for all rooms (remove the abnormality-based ceiling hiding at line ~820) — rooms need ceilings, period
- [x] Verify Room.tsx `groupRef.current.add(room.mesh)` (line ~91) executes for every room transition and the mesh is non-empty
- [x] Add a dark floor color fallback (#1a1a2e) so rooms never show pure black void beneath the player

---

### 1.2 Fix Collision System for Non-Rectangular Rooms
**Priority:** High
**Files:** `src/systems/CollisionManager.ts`, `src/systems/NavigationSystem.ts`

**Tasks:**
- [x] Extend `CollisionManager.createWallColliders()` to handle polygon-shaped rooms by creating collision planes along each polygon edge, not just AABB boxes
- [x] Fix NavigationSystem position clamping (line ~377) to use polygon containment test (point-in-polygon) instead of AABB clamp for non-rectangular rooms
- [x] Remove the `if (!inDoorwayZone)` bypass that allows players to escape room bounds entirely
- [x] Add a hard safety boundary: if player position is outside room polygon + 1 unit margin, teleport them back to room center
- [x] Ensure doorway trigger zones are correctly placed on polygon edges, not just cardinal walls

---

### 1.3 Fix Audio Reactivity Pipeline
**Priority:** High
**Files:** `src/core/AudioCapture.ts`, `src/core/AudioAnalyser.ts`, `src/systems/AudioReactiveSystem.ts`, `src/shaders/liminal.frag`

**Tasks:**
- [x] Add a visible audio indicator UI element (small pulsing dot or bar in corner) that shows when audio is being captured and current bass/mid/high levels — so users can tell if audio is working
- [x] Fix AudioContext resume — call `audioContext.resume()` on first user interaction (click/keypress) to handle browser autoplay restrictions
- [x] Verify liminal.frag actually reads and uses `u_bass`, `u_mid`, `u_high`, `u_transient` uniforms in its color/displacement calculations — if not, wire them in
- [x] Reduce the triple-smoothing on audio levels in AudioAnalyser that destroys transient response — use single exponential smoothing with faster decay (0.15 instead of current value)
- [x] Add a fallback ambient pulse when no audio is detected (slow sine wave on bass uniform) so rooms always have subtle visual movement

---

## Phase 2: Curated Room Definitions (The Art)

### 2.1 Create Room Template System
**Priority:** High
**Files:** `src/rooms/RoomTemplates.ts` (new), `src/types/room.ts`

**Tasks:**
- [x] Create `src/rooms/RoomTemplates.ts` that exports an array of hand-crafted `CuratedRoom` definitions with: exact wall positions, floor plan shape, lighting config, color palette, furniture layout, and doorway positions
- [x] Define a `CuratedRoom` interface extending RoomConfig with fields: `wallSegments` (array of wall start/end/height), `lightSources` (position/color/intensity), `palette` (primary/secondary/accent/fog colors), `atmospherePreset` (fog density, particle type, ambient sound hint)
- [x] Create at least 15 curated room templates that are selected by room index (not random) — rooms 1-15 are hand-crafted, rooms 16+ cycle through templates with increasing wrongness modifications
- [x] Each template must define explicit closed boundaries — no gaps, no open edges, no way to walk into void

---

### 2.2 The Infinite Hallway (Room 1)
**Priority:** High
**Files:** `src/rooms/templates/InfiniteHallway.ts` (new)

**Tasks:**
- [x] Create a long, narrow corridor (3m wide x 40m deep x 4m tall) with warm fluorescent overhead lighting casting pools of light on linoleum-textured floor
- [x] Add slightly yellowed walls with subtle water stain textures using procedural noise in the shader
- [x] Place evenly-spaced identical wooden doors on both sides (6 doors per side) — all closed, all identical, none functional except the exit at the far end
- [x] Add a single flickering fluorescent light midway that creates a subtle strobe effect synced to audio high frequencies
- [x] Floor has faint scuff marks pattern, ceiling has acoustic tile grid pattern generated via shader UV manipulation
- [x] Exit doorway at the far end glows faintly with the next room's color palette

---

### 2.3 The Empty Pool (Room 2)
**Priority:** High
**Files:** `src/rooms/templates/EmptyPool.ts` (new)

**Tasks:**
- [x] Create a large rectangular space (20m x 30m x 8m) with a drained swimming pool depression in the center (sunken 2m, using VerticalElementGenerator)
- [x] Tile the pool interior with cyan-tinted ceramic tile pattern (procedural shader grid), walls above pool level are beige concrete
- [x] Add rusted pool ladder meshes at two corners of the pool, diving board platform at one end
- [x] Overhead skylight panels in ceiling emit diffuse blue-white light that pulses gently with audio bass
- [x] Pool bottom has a dark drain grate at the center that emits faint particle effects (dust motes rising)
- [x] Two exits: one at pool level (through a door in the wall) and one at the bottom of the pool (a dark corridor entrance)
- [x] Ambient echo/reverb atmosphere — the space should feel cavernous

---

### 2.4 The Backrooms Office (Room 3)
**Priority:** High
**Files:** `src/rooms/templates/BackroomsOffice.ts` (new)

**Tasks:**
- [x] Create an open-plan office space (25m x 25m x 3m) with low drop-ceiling and harsh buzzing fluorescent panels
- [x] Populate with a grid of identical beige cubicle partition walls (1.5m tall) creating a maze-like layout with 12-16 cubicles
- [x] Each cubicle has identical empty desk geometry, identical office chair, identical dead monitor (dark screen)
- [x] Damp-looking carpet floor with that specific institutional carpet pattern (dark repeating geometric shader pattern)
- [x] Walls are off-white with slightly peeling wallpaper texture effect (shader-driven distortion on wall UV)
- [x] One water cooler mesh near the entrance, empty, with a faint dripping particle effect
- [x] Audio reactivity: fluorescent lights buzz intensity scales with mid frequencies, lights flicker on transients
- [x] Three exits in different walls, each leading deeper

---

### 2.5 The Stairwell to Nowhere (Room 4)
**Priority:** High
**Files:** `src/rooms/templates/StairwellNowhere.ts` (new)

**Tasks:**
- [x] Create a vertical stairwell shaft (6m x 6m x 12m tall) with concrete stairs spiraling upward along the walls
- [x] Player enters at ground level; stairs go up 3 flights but loop back to the same floor (non-Euclidean: walking up returns you to the bottom)
- [x] Raw concrete walls with exposed pipe meshes running vertically, emergency exit signs that glow green
- [x] Each landing has a heavy fire door — only one actually opens (the exit)
- [x] Handrails are cold metal tube geometry along stair edges
- [x] Audio reactivity: footstep echo intensity scales with bass, pipe vibration with mid, emergency sign flicker with transients
- [x] Harsh single bulb at each landing casting sharp shadows via point lights

---

### 2.6 The Hotel Corridor (Room 5)
**Priority:** High
**Files:** `src/rooms/templates/HotelCorridor.ts` (new)

**Tasks:**
- [x] Create an L-shaped hotel hallway (4m wide, 30m on long arm, 20m on short arm, 3.5m tall)
- [x] Deep red/burgundy patterned carpet (Overlook Hotel inspired geometric pattern via shader)
- [x] Ornate wallpaper on upper walls, dark wood wainscoting on lower third (two-tone wall materials)
- [x] Room doors with brass number plates every 4m on both sides — numbers are wrong/impossible (Room 237, Room -1, Room ∞)
- [x] Warm wall sconce lighting between doors casting pools of amber light
- [x] A single room service cart mesh abandoned mid-corridor with a covered plate
- [x] Around the L-corner, the carpet pattern subtly shifts color (same pattern, different hue — wrongness)
- [x] Exit at the far end of the short arm

---

### 2.7 The Sunken Mall Atrium (Room 6)
**Priority:** Medium
**Files:** `src/rooms/templates/MallAtrium.ts` (new)

**Tasks:**
- [x] Create a large two-level atrium (30m x 30m x 10m) with a mezzanine balcony ring around the perimeter at 5m height
- [x] Ground level has dead fountain geometry in center (dry, cracked basin), surrounded by empty planter boxes
- [x] Shuttered storefront walls around the perimeter — metal security gates pulled down over dark openings
- [x] Floor is polished (reflective) faux-marble tile pattern via shader environment mapping
- [x] Mezzanine level visible but unreachable — broken escalator meshes at two corners
- [x] Skylights above are dark/night — no natural light, only the orange sodium-vapor quality of mall emergency lighting
- [x] Audio reactivity: fountain basin glows with bass, storefront security gates rattle (vertex displacement) with transients
- [x] Faint muzak-quality ambient that plays from invisible speakers (audio system integration)

---

### 2.8 The Bathroom (Room 7)
**Priority:** Medium
**Files:** `src/rooms/templates/Bathroom.ts` (new)

**Tasks:**
- [x] Create a public restroom (8m x 12m x 3m) with clinical white tile walls and floor
- [x] Row of 4 bathroom stall partitions along one wall — all doors slightly ajar, all empty
- [x] Row of mirrors and sinks along opposite wall — mirrors show the room but NOT the player (render a static room texture in mirror material)
- [x] Harsh overhead fluorescent strip lighting that makes everything look washed out (high color temperature shader tint)
- [x] One sink drips with particle effect, creating a rhythmic drip that syncs with audio if present
- [x] Wet floor patches with reflective shader areas on the tile
- [x] Single exit door with "EMPLOYEES ONLY" text mesh — this is the way forward
- [x] Audio reactivity: drip frequency matches bass, fluorescent buzz with mid, mirror flicker on transients

---

### 2.9 The Subway Platform (Room 8)
**Priority:** Medium
**Files:** `src/rooms/templates/SubwayPlatform.ts` (new)

**Tasks:**
- [ ] Create a long subway platform (5m x 50m x 5m) with yellow safety line along the platform edge
- [ ] Track pit on one side (sunken 1.5m) with rail geometry — no train, just empty dark tunnel openings at each end
- [ ] Tiled walls with colored stripe pattern (classic NYC subway aesthetic via shader bands)
- [ ] Weathered metal benches every 8m along the platform wall
- [ ] Station name signs on pillars — but the station name is the player's room index number
- [ ] Map display on wall showing impossible transit routes (procedural colored lines on a flat mesh)
- [ ] Audio reactivity: a distant rumbling (bass) makes the platform subtly vibrate (vertex displacement on floor), track area gets wind particles on transients
- [ ] Exit via stairs at one end going "up"

---

### 2.10 The Server Room (Room 9)
**Priority:** Medium
**Files:** `src/rooms/templates/ServerRoom.ts` (new)

**Tasks:**
- [ ] Create a cold, narrow room (6m x 20m x 3.5m) with rows of server rack meshes on both sides creating a central aisle
- [ ] Server racks are dark metal cabinets with small blinking LED point lights (green, amber, red) scattered across faces
- [ ] Raised floor with perforated metal floor tiles (grid pattern shader with alpha cutout)
- [ ] Cool blue ambient lighting from under-rack LED strips
- [ ] Constant low hum atmosphere — tie rack LED blink rate to audio frequencies (each rack responds to different frequency band)
- [ ] Cable management overhead: mesh of bundled cables running along ceiling cable trays
- [ ] Temperature display mesh on wall showing "2°C" (always cold)
- [ ] Audio reactivity: LED colors shift with audio spectrum, rack fans (particle effects) speed up with bass intensity
- [ ] Exit at the far end through a heavy security door

---

### 2.11 The Liminal Classroom (Room 10)
**Priority:** Medium
**Files:** `src/rooms/templates/Classroom.ts` (new)

**Tasks:**
- [ ] Create a school classroom (10m x 12m x 3.5m) with rows of student desk-chair combo meshes (5 rows of 6)
- [ ] Teacher's desk at the front, green chalkboard mesh on the wall with faint chalk dust particles
- [ ] Chalkboard has procedural text that's almost readable but not quite (shader noise distortion on text texture)
- [ ] Large windows on one wall showing pure white/overexposed light (no actual outside — just white plane behind glass geometry)
- [ ] Institutional clock on wall — hands don't move (or move backwards on audio transients)
- [ ] Linoleum floor with that specific school-floor speckle pattern (procedural noise shader)
- [ ] Audio reactivity: window light intensity pulses with bass, chalkboard text writhes with mid, clock ticks on transients
- [ ] Two exits: the main classroom door and a supply closet door that leads deeper

---

## Phase 3: Room Loading & Transition Integration

### 3.1 Integrate Curated Rooms into Room System
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`, `src/components/Room.tsx`, `src/systems/RoomPoolManager.ts`

**Tasks:**
- [ ] Modify `RoomGenerator.generateConfig()` to check if a curated template exists for the given room index — if yes, use the template instead of procedural generation
- [ ] For room indices beyond the curated set (16+), select templates cyclically `templates[index % templates.length]` and apply wrongness modifications from the existing WrongnessSystem
- [ ] Update `RoomPoolManager` to handle curated rooms the same as generated rooms — pre-load adjacent curated rooms into the pool
- [ ] Ensure Room.tsx renders curated room geometry (walls, furniture, lights) by iterating the template's wall segments and creating meshes with the liminal shader material
- [ ] Connect each curated room's doorways to the next room index — maintain the linear progression (Room 1 → Room 2 → Room 3 etc.) with branching doorways leading to higher indices

---

### 3.2 Smooth Room Transitions
**Priority:** Medium
**Files:** `src/systems/TransitionSystem.ts`, `src/components/Room.tsx`

**Tasks:**
- [ ] Ensure transition effects (FADE, WARP) work correctly between curated rooms of different sizes/shapes
- [ ] Calculate entry position for the new room based on which doorway was used — place player at the corresponding entry doorway, facing inward
- [ ] Add a brief (0.5s) fade-to-black between rooms to mask geometry loading and prevent seeing the void during transition
- [ ] Preserve audio reactivity during transitions — don't reset or interrupt audio capture

---

## Phase 4: Visual Polish & Atmosphere

### 4.1 Unified Color Palette System
**Priority:** Medium
**Files:** `src/rooms/RoomPalettes.ts` (new), `src/systems/AudioReactiveSystem.ts`

**Tasks:**
- [ ] Create `RoomPalettes.ts` with named color palettes for each room (e.g., "fluorescent_office", "pool_cyan", "hotel_warm", "subway_tile")
- [ ] Each palette defines: wallColor, floorColor, ceilingColor, accentColor, fogColor, lightColor, emissiveColor
- [ ] Pass palette colors into liminal shader uniforms (`u_colorPrimary`, `u_colorSecondary`, `u_colorBackground`) per room
- [ ] Ensure fog color matches room palette — no more generic dark purple fog for every room

### 4.2 Lighting Per Room
**Priority:** Medium
**Files:** `src/components/RoomLighting.tsx` (new), `src/components/Room.tsx`

**Tasks:**
- [ ] Create `RoomLighting` component that reads a curated room's light source definitions and creates Three.js PointLight/SpotLight/RectAreaLight instances
- [ ] Each curated room template specifies its own light positions, colors, intensities, and whether lights flicker
- [ ] Replace the generic ambient-only lighting with per-room lighting setups
- [ ] Add light flicker system driven by audio transients for rooms that specify it (fluorescent rooms)
- [ ] Ensure shadows are enabled for at least one key light per room (directional or spot) for depth perception

### 4.3 Fog & Atmosphere Per Room
**Priority:** Low
**Files:** `src/components/RoomAtmosphere.tsx`

**Tasks:**
- [ ] Update RoomAtmosphere to accept per-room fog density, fog color, and particle configuration from curated templates
- [ ] Add dust mote particles that drift slowly in all rooms (visible in light beams) — subtle, not overwhelming
- [ ] Add room-specific particle effects: water drips in bathroom/pool, dust in office, cold breath vapor in server room
- [ ] Ensure fog density scales with audio bass — rooms breathe with the music

---

## Phase 5: Wrongness Escalation (Rooms 16+)

### 5.1 Apply Wrongness to Recycled Templates
**Priority:** Low
**Files:** `src/systems/WrongnessSystem.ts`, `src/rooms/RoomTemplates.ts`

**Tasks:**
- [ ] When a curated template is reused for rooms 16+, apply wrongness modifications: slightly skewed wall angles, shifted color palette toward more unsettling tones, furniture rotated to wrong orientations
- [ ] Add "impossible" features that escalate: doors on ceilings, windows showing other rooms instead of outside, furniture floating slightly off the floor
- [ ] Increase audio reactivity intensity for deeper rooms — walls breathe more dramatically, transient effects are more violent
- [ ] Add the existing circuitry overlay system to deep rooms (20+) as an additional layer
- [ ] Ensure wrongness never breaks collision boundaries — walls can look wrong but must still block movement

---

## Priority Execution Order

1. **1.1** Fix Wall Rendering — Nothing else matters if geometry isn't visible
2. **1.2** Fix Collision System — Players must not escape rooms
3. **1.3** Fix Audio Reactivity — Core experience feature must be perceptible
4. **2.1** Create Room Template System — Foundation for all curated rooms
5. **2.2** The Infinite Hallway (Room 1) — First room after entry, sets the tone
6. **2.3** The Empty Pool (Room 2) — First large-scale space, demonstrates verticality
7. **2.4** The Backrooms Office (Room 3) — Iconic liminal space archetype
8. **2.5** The Stairwell to Nowhere (Room 4) — Non-Euclidean showcase
9. **2.6** The Hotel Corridor (Room 5) — Atmospheric horror classic
10. **3.1** Integrate Curated Rooms — Wire templates into the game loop
11. **3.2** Smooth Room Transitions — Polish room-to-room flow
12. **2.7-2.11** Remaining curated rooms (6-10) — Expand the level set
13. **4.1-4.3** Visual polish — Palettes, lighting, atmosphere per room
14. **5.1** Wrongness escalation — Make deep rooms increasingly surreal

---

## Agent Instructions

**For claude/droid (code-focused):**
- Run `npm run dev` to start the Vite dev server
- The app runs at `http://localhost:5173`
- All 3D rendering uses React Three Fiber — components return `<mesh>`, `<group>`, etc.
- Shader materials are in `src/shaders/` — GLSL fragment and vertex shaders
- Room state is managed via Zustand stores in `src/store/`
- Use existing `AudioReactiveSystem.createLiminalMaterial()` for all room surface materials
- Follow the pattern in existing generators (RoomGenerator, VerticalElementGenerator) for creating THREE.js geometry
- Curated room files go in `src/rooms/templates/` — each exports a function returning a CuratedRoom config

**Testing with Playwright:**
```typescript
await page.goto('http://localhost:5173');
// Wait for WebGL canvas to load
await page.waitForSelector('canvas');
await page.screenshot({ path: 'room-test.png' });
// Navigate with WASD
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.screenshot({ path: 'room-after-walk.png' });
```
