# Fix All Critical Issues — Keegan's Mind Palace

Resolve 7 issues (2 critical, 3 high, 1 medium, 1 low) identified by specialist reviews covering curated room rendering, transition effects, audio controls, lighting, color palettes, no-jump communication, and debug key conflicts.

---

## How Agents Should Work

1. **Read existing code** before modifying — understand the patterns in place
2. **Run `npm run dev`** to test UI changes in the browser at `http://localhost:5173`
3. **Run `npm run build`** after each phase to verify no TypeScript errors
4. **Commit incrementally** after each phase with descriptive messages
5. **Use Playwright** to screenshot verify visual changes when possible

---

## Phase 1: Quick Wins

### 1.1 Fix Ambient Light Stacking
**Priority:** High
**Files:** `src/App.tsx`, `src/components/CeilingLights.tsx`

**Tasks:**
- [x] Delete the `<ambientLight intensity={0.5} />` element near line 356 in `src/App.tsx`
- [x] In `src/components/CeilingLights.tsx` near line 439, reduce ambient light intensity from `0.08` to `0.04`
- [x] Verify total ambient light drops from ~0.66-0.83 to ~0.12-0.29, restoring scene contrast

---

### 1.2 Fix Debug Toggle Key Conflict
**Priority:** Low
**Files:** `src/App.tsx`

**Tasks:**
- [x] In `src/App.tsx` near line 500, change debug panel toggle from `G` key to `Ctrl+Shift+D`
- [x] Update the key event handler to check for `e.ctrlKey && e.shiftKey && e.key === 'D'`

---

### 1.3 Uncomment Transition Effects
**Priority:** High
**Files:** `src/App.tsx`

**Tasks:**
- [x] In `src/App.tsx` near lines 377-378, uncomment the `<TransitionEffect>` component
- [x] In `src/App.tsx` near lines 377-378, uncomment the `<CameraTransitionEffect>` component
- [x] Verify both transition effects render without errors in the browser

---

## Phase 2: Audio Source Buttons

### 2.1 Store AudioCapture Instance in Audio Store
**Priority:** Critical
**Files:** `src/store/audioStore.ts`

**Tasks:**
- [x] Add `audioCaptureInstance: AudioCapture | null` field to the audio store state (default `null`)
- [x] Add `setAudioCaptureInstance: (capture: AudioCapture | null) => void` action to the store

---

### 2.2 Save AudioCapture Instance During Permission Flow
**Priority:** Critical
**Files:** `src/components/UI/AudioPermission.tsx`

**Tasks:**
- [x] After creating the `AudioCapture` instance in the permission flow, call `setAudioCaptureInstance(capture)` to persist it in the store
- [x] Import `useAudioStore` and destructure `setAudioCaptureInstance` from it

---

### 2.3 Wire Dropdown Buttons to Switch Audio Sources
**Priority:** Critical
**Files:** `src/components/UI/Controls.tsx`

**Tasks:**
- [x] Add `onSourceChange` handler to audio source dropdown buttons
- [x] Wire the Desktop Audio button to call `audioCaptureInstance.startDesktopCapture()`
- [x] Wire the Microphone button to call `audioCaptureInstance.startMicrophoneCapture()`
- [x] Wire the Demo Mode button to switch to demo/fallback audio mode
- [x] Close the dropdown menu after a source is selected

---

## Phase 3: Curated Room Integration

### 3.1 Create Curated Room Builder Registry
**Priority:** Critical
**Files:** `src/rooms/CuratedRoomRegistry.ts` (new file)

**Tasks:**
- [x] Create `src/rooms/CuratedRoomRegistry.ts` exporting a registry that maps `templateId` to builder functions
- [x] Import the 7 existing room builders: `InfiniteHallway`, `EmptyPool`, `BackroomsOffice`, `StairwellNowhere`, `HotelCorridor`, `MallAtrium`, `Bathroom` from `src/rooms/templates/`
- [x] Export a `getCuratedBuilder(templateId: string)` function that returns the builder or `undefined`

---

### 3.2 Add isCurated Flag to RoomConfig
**Priority:** Critical
**Files:** `src/types/room.ts`

**Tasks:**
- [x] Add `isCurated?: boolean` optional field to the `RoomConfig` interface

---

### 3.3 Modify RoomGenerator to Use Curated Rooms
**Priority:** Critical
**Files:** `src/generators/RoomGenerator.ts`

**Tasks:**
- [x] Import `getCuratedBuilder` from `src/rooms/CuratedRoomRegistry.ts`
- [x] In the `generate()` method (near line 575), add branching logic before procedural generation:
  - If `getCuratedTemplate(roomIndex)` exists AND has a builder → call `wrapCuratedRoom()`
  - If template exists but NO builder → generate procedurally, then apply palette
  - If no template (room 0) → fully procedural (existing behavior)

---

### 3.4 Implement wrapCuratedRoom Method
**Priority:** Critical
**Files:** `src/generators/RoomGenerator.ts`

**Tasks:**
- [x] Add `wrapCuratedRoom()` method that calls a curated builder function
- [x] Synthesize a minimal `RoomConfig` from the `CuratedRoom` data with `isCurated: true`
- [x] Wrap builder output in the `GeneratedRoom` interface format
- [x] Convert `CuratedDoorway[]` to the format `NavigationSystem` expects

---

### 3.5 Apply Curated Palettes to Procedural Rooms
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`

**Tasks:**
- [x] Add `applyRoomPalette()` method that sets shader uniform colors from a `RoomPalette`
- [x] Map palette fields: `primary` → `u_colorPrimary`, `secondary` → `u_colorSecondary`, `fog` → `u_colorBackground`, `wall` → `u_colorGradientStart`, `fog` → `u_colorGradientEnd`
- [x] Call `applyRoomPalette()` automatically for rooms 8-15 (template data exists, no builder)

---

### 3.6 Gate Room.tsx Sub-Components for Curated Rooms
**Priority:** Critical
**Files:** `src/components/Room.tsx`

**Tasks:**
- [x] Wrap the following sub-components with `!roomConfig.isCurated` guard so they don't render for curated rooms: `Furniture`, `CeilingLights`, `Paintings`, `Sculptures`, `VerticalElements`, `CircuitryOverlay`, `FakeDoors`, `WrongShadows`
- [x] Keep rendering these components regardless of `isCurated`: `RoomAtmosphere`, `DoorwayShimmer`, `DoorwayProximityGlow`, `Artifact`, `VariationEffects`, `MelancholicLight`

---

## Phase 4: No-Jump Communication

### 4.1 Add Space Key Handler to NavigationSystem
**Priority:** Medium
**Files:** `src/systems/NavigationSystem.ts`

**Tasks:**
- [x] In the key handler (near line 890), add a `'Space'` case that dispatches a `'ground-cue'` CustomEvent on `window`
- [x] Ensure the event only fires on keydown, not on key repeat

---

### 4.2 Create GroundedHint UI Component
**Priority:** Medium
**Files:** `src/components/UI/GroundedHint.tsx` (new file)

**Tasks:**
- [x] Create `src/components/UI/GroundedHint.tsx` component
- [x] Listen for `'ground-cue'` CustomEvent on `window`
- [x] Display "You are grounded here" text in pale-strata styling with a fade-in/fade-out animation
- [x] Debounce so holding Space doesn't spam the message (show once, ignore repeats for ~2 seconds)

---

### 4.3 Mount GroundedHint in App
**Priority:** Medium
**Files:** `src/App.tsx`

**Tasks:**
- [x] Import `GroundedHint` from `src/components/UI/GroundedHint.tsx`
- [x] Add `<GroundedHint />` alongside other UI overlays in `src/App.tsx`

---

## Phase 5: Verification

### 5.1 Build and Manual Test
**Priority:** High
**Files:** N/A

**Tasks:**
- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Run `npm run dev` and verify the dev server launches
- [ ] Walk through doorway from Room 0 → Room 1 (Infinite Hallway) — verify curated builder geometry renders, not procedural
- [ ] Walk through rooms 2-7 — each should have distinct curated geometry
- [ ] Check rooms 8-15 — procedural geometry but with curated color palettes (not default purple/cyan)
- [ ] Verify transition effects (fade/warp) are visible when crossing doorways
- [ ] Verify audio source dropdown actually switches between Desktop/Mic/Demo
- [ ] Verify lighting has contrast — dark corners visible, scene not washed out
- [ ] Press Space → "You are grounded here" message appears briefly
- [ ] Press Ctrl+Shift+D → debug panel toggles (G key no longer toggles it)

---

## Priority Execution Order

1. **1.1** Fix Ambient Light Stacking — simple delete/tweak, immediate visual improvement
2. **1.2** Fix Debug Toggle Key Conflict — one-line key binding change
3. **1.3** Uncomment Transition Effects — uncomment two lines
4. **2.1** Store AudioCapture Instance — foundation for audio fix
5. **2.2** Save Instance During Permission Flow — connects capture to store
6. **2.3** Wire Dropdown Buttons — completes audio source switching
7. **3.1** Create Curated Room Registry — foundation for room integration
8. **3.2** Add isCurated Flag — type system support
9. **3.3** Modify RoomGenerator Branching — routing logic
10. **3.4** Implement wrapCuratedRoom — curated room rendering
11. **3.5** Apply Curated Palettes — color theming for procedural rooms
12. **3.6** Gate Room.tsx Sub-Components — prevent duplicate geometry in curated rooms
13. **4.1** Add Space Key Handler — event source for grounded hint
14. **4.2** Create GroundedHint Component — UI for no-jump messaging
15. **4.3** Mount GroundedHint — wire it into the app
16. **5.1** Build and Manual Test — end-to-end verification
