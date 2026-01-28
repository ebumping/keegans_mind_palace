# Keegan's Mind Palace - 3D Audio-Reactive Visualizer

A surreal, procedurally generated 3D experience inspired by House of Leaves and MyHouse.wad, featuring audio-reactive rooms derived from pale-strata component patterns.

**Project Location:** `/home/lain/git/keegans_mind_palace`
**GitHub Repo:** `keegans_mind_palace`

---

## How Agents Should Work

1. **Use Three.js** for all 3D rendering and procedural geometry
2. **Use Web Audio API** for desktop audio capture and analysis
3. **Derive patterns** from pale-strata AudioAnalyser, effects chain, and color schemes
4. **Test with Playwright** at `http://localhost:3000` (or dev server port)
5. **Use frontend-design skill** for final polish tasks

---

## Source Pattern Analysis (from pale-strata)

### Color Palette to Apply
- Primary accent: `#c792f5` (soft purple/magenta) - glows, portals
- Secondary accent: `#8eecf5` (cyan) - interactive highlights
- Background: `#1a1834`, `#211f3c` - deep purple darkness
- Gradients: `#3a3861` → `#2c2c4b`

### Audio Analysis Structure
- Frequency bands: bass (20-250Hz), mid (250-4000Hz), high (4000-20000Hz)
- Transient detection for impact moments
- FFT size 2048, smoothing 0.8

### Procedural Patterns Available
- Slicer patterns: 8/16/32 step sequences
- LFO waveforms: sine, square, sawtooth, triangle, random
- Envelope ADSR curves
- Grain scheduling intervals

---

## Technical Architecture

### Data Flow
```
Desktop Audio → getDisplayMedia({ audio: true })
     ↓
Web Audio API → AnalyserNode (fftSize: 2048)
     ↓
AudioAnalyser → { bass, mid, high, transient }
     ↓
Zustand Store → Smoothed values + history
     ↓
useFrame() → Update shader uniforms per frame
     ↓
Shader Materials → Wall breathing, pattern distortion, color shifts
```

### Room Pool System
- Keep 5 rooms in memory: current ±2
- Deterministic seeding: `baseSeed + roomIndex * 7919`
- Abnormality factor increases with distance from origin
- Rooms get procedurally stranger the deeper you go

### Non-Euclidean Effects
- Stencil buffer portal rendering for impossible geometry
- Interior scale multiplier: 1.5-3x deeper than doorway suggests
- Fog density transitions mask seams between rooms

### Shader Uniform Structure
```typescript
{
  // Audio (0-1 normalized)
  u_bass, u_mid, u_high, u_transient,
  u_bassSmooth, u_midSmooth, u_highSmooth,

  // Environment
  u_time, u_seed, u_roomIndex,

  // Colors (pale-strata palette)
  u_colorPrimary,    // #c792f5
  u_colorSecondary,  // #8eecf5
  u_colorBackground, // #1a1834

  // Effects
  u_patternScale, u_breatheIntensity, u_distortionAmount
}
```

### Performance Targets
- 60fps on desktop, 30fps on mobile
- ~20MB GPU memory budget
- Room pooling + frustum culling
- Audio analysis in Web Worker with SharedArrayBuffer

---

## House of Leaves + MyHouse.wad Mechanics

### The Growl (Time-Based Dread)
- **Hour 0-2:** Silent, peaceful exploration
- **Hour 2-6:** Distant, barely perceptible rumble (sub-bass hum)
- **Hour 6-12:** Occasional distant sounds, shadows move wrong
- **Hour 12-24:** Audible presence, lights flicker, rooms feel watched
- **Hour 24+:** The Growl is close. Distortions intensify. Reality breaks.
- Uses `deploymentTimestamp` stored in localStorage vs current time

### Portal Variations (MyHouse.wad-inspired)
Each portal has a chance to lead to an "alternate version" with ONE subtle difference:
- **Level 1 (subtle):** Different wallpaper pattern, furniture moved
- **Level 2 (noticeable):** Doors lead to different rooms, extra hallway
- **Level 3 (unsettling):** Photos on walls have wrong faces, text backwards
- **Level 4 (surreal):** Gravity shifts, impossible architecture, you see yourself
- **Level 5 (bizarre):** Rooms from other games, reality breaks completely
- Escalation based on depth + time since deployment

### Circuitry Pattern Overlay
- Random chance (15-25%) per room to have circuitry pattern
- Glowing circuit traces overlay on walls/floor
- Pulses with audio frequency data
- More common in deeper rooms

### Glitch Animations
- Triggered by transient peaks AND time-based chance
- Effects: screen tear, color channel split, geometry distortion
- Intensity scales with Growl proximity
- Subtle at first, aggressive over time

---

## Project Structure

```
keegans_mind_palace/
├── specs/
│   ├── audio-system.md           # Audio capture & analysis specification
│   ├── room-generation.md        # Procedural room algorithm spec
│   ├── pattern-system.md         # Pattern generation derived from pale-strata
│   ├── shader-architecture.md    # Audio-reactive shader design
│   ├── navigation.md             # Movement and transition system spec
│   ├── house-of-leaves.md        # Liminal aesthetic reference guide
│   ├── the-growl.md              # Time-based dread system specification
│   ├── portal-variations.md      # MyHouse.wad-inspired alternate versions
│   └── circuitry-glitch.md       # Circuit patterns and glitch effects
├── src/
│   ├── core/
│   │   ├── AudioCapture.ts       # Desktop audio stream capture
│   │   ├── AudioAnalyser.ts      # Frequency/time domain analysis
│   │   └── SceneManager.ts       # Three.js scene orchestration
│   ├── generators/
│   │   ├── RoomGenerator.ts      # Procedural room creation
│   │   ├── PatternGenerator.ts   # Visual pattern algorithms
│   │   ├── DoorwayGenerator.ts   # Infinite corridor system
│   │   ├── CircuitryGenerator.ts # Procedural circuit trace patterns
│   │   └── VariationGenerator.ts # Alternate version differences
│   ├── shaders/
│   │   ├── liminal.vert          # Vertex displacement
│   │   ├── liminal.frag          # Fragment with audio reactivity
│   │   ├── circuitry.frag        # Glowing circuit overlay
│   │   ├── glitch.frag           # Screen tear, RGB split
│   │   └── glow.frag             # Bloom/glow post-processing
│   ├── components/
│   │   ├── Room.tsx              # Room mesh with audio bindings
│   │   ├── Doorway.tsx           # Portal/door geometry
│   │   ├── Hallway.tsx           # Infinite corridor segments
│   │   ├── Artifact.tsx          # Floating procedural objects
│   │   └── UI/
│   │       ├── AudioPermission.tsx
│   │       └── Controls.tsx
│   ├── systems/
│   │   ├── NavigationSystem.ts   # Movement through spaces
│   │   ├── TransitionSystem.ts   # Room-to-room transitions
│   │   ├── AudioReactiveSystem.ts # Binds audio to visuals
│   │   ├── GrowlSystem.ts        # Time-based dread mechanics
│   │   ├── PortalVariationSystem.ts # Alternate version spawning
│   │   └── GlitchSystem.ts       # Audio + time triggered distortions
│   ├── store/
│   │   ├── audioStore.ts         # Audio levels state
│   │   └── timeStore.ts          # Deployment timestamp, Growl intensity
│   ├── utils/
│   │   ├── colors.ts             # Pale-strata color utilities
│   │   ├── patterns.ts           # Procedural pattern functions
│   │   └── math.ts               # Interpolation, easing
│   ├── App.tsx                   # Main React component
│   └── main.tsx                  # Entry point
├── public/
│   └── index.html
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions deployment
├── package.json
├── vite.config.ts
├── tsconfig.json
├── commit1.md                    # Commit messages
├── pr1.md                        # PR description
└── README.md
```

---

## Phase 1: Project Foundation

### 1.0 Specifications Documentation
**Priority:** High
**Files:** `specs/*.md`

**Tasks:**
- [x] Create `specs/audio-system.md` documenting desktop audio capture API, fallback strategy, and AudioAnalyser port from pale-strata
- [x] Create `specs/room-generation.md` documenting procedural room algorithm, dimension ranges, doorway placement rules
- [x] Create `specs/pattern-system.md` documenting pattern derivations from pale-strata (slicer, LFO, grain scheduling)
- [x] Create `specs/shader-architecture.md` documenting audio uniform bindings, vertex displacement, fragment effects
- [x] Create `specs/navigation.md` documenting first-person controls, collision detection, room transition triggers
- [x] Create `specs/house-of-leaves.md` documenting liminal aesthetic reference (non-euclidean geometry, impossible spaces, disorientation)
- [x] Create `specs/the-growl.md` documenting time-based dread system (hour thresholds, intensity scaling, effects)
- [x] Create `specs/portal-variations.md` documenting MyHouse.wad-inspired alternate versions (5 escalating levels)
- [x] Create `specs/circuitry-glitch.md` documenting circuit patterns and glitch animation triggers

---

### 1.1 Project Setup
**Priority:** High
**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`

**Tasks:**
- [x] Initialize Vite project with React and TypeScript
- [x] Install Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- [x] Configure TypeScript for strict mode with Three.js types
- [x] Set up basic HTML template with full-viewport canvas
- [x] Add Tailwind CSS for UI overlay elements

---

### 1.2 Audio Capture System
**Priority:** High
**Files:** `src/core/AudioCapture.ts`, `src/core/AudioAnalyser.ts`

**Tasks:**
- [x] Implement `AudioCapture` class using `getDisplayMedia({ audio: true })` for desktop audio
- [x] Add fallback to `getUserMedia({ audio: true })` for microphone input
- [x] Port AudioAnalyser from pale-strata with `getFrequencyData()`, `getTimeDomainData()`, `getLevels()`
- [x] Add frequency band extraction (bass: 20-250Hz, mid: 250-4kHz, high: 4k-20kHz)
- [x] Implement transient detection with configurable threshold
- [x] Create React hook `useAudioAnalysis()` returning real-time levels

---

### 1.3 Three.js Scene Foundation
**Priority:** High
**Files:** `src/core/SceneManager.ts`, `src/App.tsx`

**Tasks:**
- [x] Set up React Three Fiber canvas with dark purple background (`#1a1834`)
- [x] Configure perspective camera with FOV 75, near 0.1, far 1000
- [x] Add OrbitControls for initial development (disable for final)
- [x] Implement fog for liminal depth effect (`FogExp2` with purple tint)
- [x] Set up post-processing pipeline: Bloom, ChromaticAberration, Vignette

---

## Phase 2: Procedural Room Generation

### 2.1 Room Geometry Generator
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`, `src/components/Room.tsx`

**Tasks:**
- [x] Create `RoomGenerator` class with configurable dimensions (width, height, depth)
- [x] Implement non-euclidean room scaling based on audio levels (rooms breathe)
- [x] Generate wall, floor, ceiling meshes with UV coordinates for patterns
- [x] Add procedural doorway cutouts (variable count 1-4 based on seed)
- [x] Implement room "complexity" parameter affecting subdivision density

---

### 2.2 Pattern Generator (derived from pale-strata)
**Priority:** High
**Files:** `src/generators/PatternGenerator.ts`, `src/utils/patterns.ts`

**Tasks:**
- [x] Port slicer pattern generation (8/16/32 step sequences) for texture animation
- [x] Implement procedural stripe/grid patterns using sine wave combinations
- [x] Create wallpaper-like repeating patterns with audio-modulated distortion
- [x] Generate carpet patterns using grain scheduling intervals as seeds
- [x] Add LFO-driven pattern morphing (sine, square, sawtooth, triangle, random)

---

### 2.3 Doorway and Hallway System
**Priority:** High
**Files:** `src/generators/DoorwayGenerator.ts`, `src/components/Doorway.ts`, `src/components/Hallway.ts`

**Tasks:**
- [x] Create doorway frames with glowing edges (`#c792f5` accent)
- [x] Implement infinite hallway illusion using portal-like rendering
- [x] Generate hallway segments that extend/contract with bass frequencies
- [x] Add door state: open, closed, partially open (audio-reactive)
- [x] Create "impossible geometry" effects (hallways longer inside than outside)

---

## Phase 3: Audio-Reactive Visualization

### 3.1 Audio-Reactive Materials
**Priority:** High
**Files:** `src/shaders/liminal.vert`, `src/shaders/liminal.frag`, `src/systems/AudioReactiveSystem.ts`

**Tasks:**
- [x] Create custom ShaderMaterial with audio uniform inputs (bass, mid, high, transient)
- [x] Implement vertex displacement based on frequency data (walls ripple)
- [x] Add fragment shader effects: color shifting, pattern distortion, glow pulsing
- [x] Map transient detection to sudden visual "glitches" (color inversion, geometry spike)
- [x] Implement pale-strata color interpolation for smooth state transitions

---

### 3.2 Room Atmosphere Effects
**Priority:** Medium
**Files:** `src/components/Room.ts`, `src/shaders/glow.frag`

**Tasks:**
- [x] Add floating dust particles that react to high frequencies
- [x] Implement ambient occlusion that deepens with bass intensity
- [x] Create light sources that flicker/pulse with mid frequencies
- [x] Add shadow intensity modulation based on overall audio level
- [x] Implement "breathing" scale animation (rooms expand/contract subtly)

---

### 3.3 Artifact Generation
**Priority:** Medium
**Files:** `src/components/Artifact.tsx`, `src/generators/PatternGenerator.ts`

**Tasks:**
- [x] Create procedural floating objects (geometric shapes, abstract forms)
- [x] Implement artifact rotation/movement driven by audio phase
- [x] Add artifacts that appear/disappear based on transient peaks
- [x] Generate artifact patterns using pale-strata envelope curves
- [x] Create "impossible objects" (Penrose-inspired) for surreal effect

---

## Phase 4: The Growl & Portal Variations

### 4.0 The Growl System (Time-Based Dread)
**Priority:** High
**Files:** `src/systems/GrowlSystem.ts`, `src/store/timeStore.ts`

**Tasks:**
- [x] Create `timeStore` tracking deployment timestamp in localStorage
- [x] Implement `getHoursSinceDeployment()` utility function
- [x] Create GrowlSystem class managing ambient dread state (0-1 intensity)
- [x] Add sub-bass drone audio that fades in over hours (starts inaudible)
- [x] Implement shadow movement anomalies triggered by Growl intensity
- [x] Add light flickering system scaled by Growl level
- [x] Create "presence" effect - subtle camera shake, peripheral shadows
- [x] Integrate Growl intensity with shader distortion uniforms

---

### 4.1 Portal Variation System (MyHouse.wad-inspired)
**Priority:** High
**Files:** `src/systems/PortalVariationSystem.ts`, `src/generators/VariationGenerator.ts`

**Tasks:**
- [ ] Create variation level calculator based on depth + time
- [ ] Implement Level 1 variations: wallpaper seed changes, furniture offset
- [ ] Implement Level 2 variations: door target remapping, extra geometry
- [ ] Implement Level 3 variations: texture UV flip for backwards text, face swap textures
- [ ] Implement Level 4 variations: gravity uniform, mirror self reflection
- [ ] Implement Level 5 variations: reality break shaders, cross-universe aesthetics
- [ ] Add portal shimmer effect indicating alternate version
- [ ] Store variation state for backtracking consistency

---

### 4.2 Circuitry Pattern Overlay
**Priority:** Medium
**Files:** `src/generators/CircuitryGenerator.ts`, `src/shaders/circuitry.frag`

**Tasks:**
- [ ] Create procedural circuit trace generator using Voronoi/grid hybrid
- [ ] Implement circuit glow shader with audio-reactive pulse
- [ ] Add random spawn chance (15-25%) per room generation
- [ ] Increase spawn probability in deeper rooms
- [ ] Create circuit "data flow" animation along traces
- [ ] Integrate with pale-strata color palette (cyan accent for circuits)

---

### 4.3 Glitch Animation System
**Priority:** Medium
**Files:** `src/systems/GlitchSystem.ts`, `src/shaders/glitch.frag`

**Tasks:**
- [ ] Create GlitchSystem tracking trigger conditions (transients + time + random)
- [ ] Implement screen tear effect (horizontal slice displacement)
- [ ] Add RGB channel separation with audio-reactive offset
- [ ] Create geometry distortion (vertex jitter in world space)
- [ ] Implement "reality break" full-screen effect for intense glitches
- [ ] Scale glitch intensity with Growl proximity
- [ ] Add post-processing integration for screen-space glitches

---

## Phase 5: Navigation and Transitions

### 5.1 First-Person Navigation
**Priority:** High
**Files:** `src/systems/NavigationSystem.ts`

**Tasks:**
- [ ] Implement WASD/arrow key movement with smooth acceleration
- [ ] Add mouse look controls for camera rotation
- [ ] Create collision detection with room boundaries
- [ ] Implement doorway detection and room transition triggers
- [ ] Add subtle camera sway based on audio levels (disorientation effect)

---

### 5.2 Room Transition System
**Priority:** High
**Files:** `src/systems/TransitionSystem.ts`

**Tasks:**
- [ ] Create smooth fade/warp transitions between rooms
- [ ] Implement procedural room generation on transition (infinite exploration)
- [ ] Add transition effects: zoom, dissolve, color shift (audio-synced)
- [ ] Store visited room seeds for backtracking consistency
- [ ] Create "impossible transition" effects (entering same room from different angles)

---

## Phase 6: UI and Deployment

### 6.1 Minimal UI Overlay
**Priority:** Medium
**Files:** `src/components/UI/AudioPermission.tsx`, `src/components/UI/Controls.tsx`

**Tasks:**
- [ ] Create audio permission request modal with pale-strata styling
- [ ] Add minimal controls overlay (audio source toggle, fullscreen)
- [ ] Implement audio level indicator (subtle, non-intrusive)
- [ ] Add "how to navigate" hints that fade after first movement
- [ ] Create mobile-responsive touch controls fallback

---

### 6.2 GitHub Actions Deployment
**Priority:** High
**Files:** `.github/workflows/deploy.yml`, `vite.config.ts`

**Tasks:**
- [ ] Configure Vite for static build with correct base path for `keegans_mind_palace` repo
- [ ] Create GitHub Actions workflow for GitHub Pages deployment
- [ ] Add build step with Node.js 20
- [ ] Configure automatic deployment on push to main branch
- [ ] Store deployment timestamp for Growl system initialization
- [ ] Add build status badge to README

---

## Phase 7: Final Polish and Refinement

### 7.1 Desktop Visual Polish
**Priority:** High
**Files:** Multiple

**Tasks:**
- [ ] Use your Playwright and frontend-design skill to verify bloom and glow effects render correctly at 1920x1080
- [ ] Use your Playwright and frontend-design skill to check audio reactive materials respond visibly to frequency changes
- [ ] Use your Playwright and frontend-design skill to verify room transitions are smooth without frame drops
- [ ] Use your Playwright and frontend-design skill to ensure color palette matches pale-strata aesthetic (#c792f5, #8eecf5, #1a1834)
- [ ] Use your Playwright and frontend-design skill to verify post-processing chain (bloom, chromatic aberration, vignette) creates liminal atmosphere
- [ ] Use your Playwright and frontend-design skill to test circuitry pattern overlay visibility and pulse animation
- [ ] Use your Playwright and frontend-design skill to verify glitch effects trigger on audio transients

---

### 7.2 Mobile View Checks
**Priority:** High
**Files:** Multiple

**Tasks:**
- [ ] Use your Playwright and frontend-design skill to test on 375x667 viewport (iPhone SE) for touch controls
- [ ] Use your Playwright and frontend-design skill to test on 390x844 viewport (iPhone 14) for visual scaling
- [ ] Use your Playwright and frontend-design skill to verify audio permission modal is readable on mobile
- [ ] Use your Playwright and frontend-design skill to check performance on mobile (target 30fps minimum)
- [ ] Use your Playwright and frontend-design skill to ensure UI overlay elements don't obstruct 3D view on small screens

---

### 7.3 The Growl and Portal Variation Testing
**Priority:** High
**Files:** Multiple

**Tasks:**
- [ ] Use your Playwright and frontend-design skill to verify Growl intensity scales with simulated time progression
- [ ] Use your Playwright and frontend-design skill to test portal variations spawn correctly at different depths
- [ ] Use your Playwright and frontend-design skill to verify variation levels escalate appropriately (subtle → bizarre)
- [ ] Use your Playwright and frontend-design skill to check shadow/flicker effects at high Growl levels
- [ ] Use your Playwright and frontend-design skill to test reality break shader effects trigger correctly

---

### 7.4 Final Accessibility and Performance
**Priority:** Medium
**Files:** Multiple

**Tasks:**
- [ ] Use your Playwright and frontend-design skill to verify keyboard navigation works for all interactive elements
- [ ] Use your Playwright and frontend-design skill to check console for WebGL warnings or errors
- [ ] Use your Playwright and frontend-design skill to verify graceful fallback when audio capture is denied
- [ ] Use your Playwright and frontend-design skill to test loading state and initial render performance
- [ ] Use your Playwright and frontend-design skill to capture final screenshots for documentation

---

## Priority Execution Order

1. **1.0** Specifications Documentation - Design docs before code
2. **1.1** Project Setup - Foundation for everything
3. **1.2** Audio Capture System - Core audio input
4. **1.3** Three.js Scene Foundation - Rendering foundation
5. **2.1** Room Geometry Generator - Primary visual element
6. **2.2** Pattern Generator - Pale-strata derived visuals
7. **3.1** Audio-Reactive Materials - Core interactivity
8. **2.3** Doorway and Hallway System - Liminal navigation
9. **4.0** The Growl System - Time-based dread mechanics
10. **4.1** Portal Variation System - MyHouse.wad-inspired alternate versions
11. **4.2** Circuitry Pattern Overlay - Random circuit traces
12. **4.3** Glitch Animation System - Audio + time triggered distortions
13. **5.1** First-Person Navigation - User control
14. **5.2** Room Transition System - Infinite exploration
15. **3.2** Room Atmosphere Effects - Immersion
16. **3.3** Artifact Generation - Visual interest
17. **6.1** Minimal UI Overlay - User onboarding
18. **6.2** GitHub Actions Deployment - Distribution
19. **7.1** Desktop Visual Polish - Quality assurance
20. **7.2** Mobile View Checks - Responsive verification
21. **7.3** The Growl and Portal Variation Testing - Horror mechanics QA
22. **7.4** Final Accessibility and Performance - Completeness

---

## Verification

### Basic Functionality
1. Run `npm run dev` and open in browser
2. Click "Share Audio" and select desktop audio source
3. Play music and verify rooms react to audio levels (walls breathe, patterns pulse)
4. Navigate with WASD/mouse and verify room transitions work
5. Look for circuitry pattern overlay in ~20% of rooms

### The Growl System
6. Open DevTools and manually set earlier deployment timestamp in localStorage
7. Verify Growl intensity increases with simulated time
8. Check for shadow anomalies and light flickers at higher intensities

### Portal Variations
9. Navigate through 10+ rooms and verify some lead to alternate versions
10. Check that variations escalate (subtle → surreal → bizarre)
11. Backtrack and verify variation consistency

### Deployment
12. Push to `keegans_mind_palace` repo on GitHub
13. Verify GitHub Actions workflow runs successfully
14. Check deployed site on GitHub Pages
15. Verify deployment timestamp is set on first visit

### Mobile
16. Check mobile view in DevTools responsive mode
17. Verify touch controls work for navigation

---

## Commit/PR Messages

After implementation, write:
- **`commit1.md`** - Commit message for the initial implementation
- **`pr1.md`** - Pull request description with summary, features, and test plan

---

## Agent Instructions

**For claude/droid (code-focused):**
- Start dev server: `npm run dev`
- Use React Three Fiber patterns from existing codebases
- Follow pale-strata color palette strictly

**For Playwright testing (Phase 7):**
- Base URL: `http://localhost:5173` (Vite default)
- Screenshot directory: `tests/screenshots/`
- Test viewports: 375x667 (mobile), 1920x1080 (desktop)
- Simulate time progression by manipulating localStorage timestamps
