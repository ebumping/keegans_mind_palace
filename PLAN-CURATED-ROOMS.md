# Curated Room Palace - Implementation Plan

Implement 8 new curated room builders (Rooms 8–15) and fix polygon wall rotation in RoomGenerator.ts.

---

## How Agents Should Work

1. **Follow existing builder patterns** — Reference `src/rooms/templates/Bathroom.ts` or `src/rooms/templates/BackroomsOffice.ts` for structure (PALETTE → dimension constants → material helpers using `createLiminalMaterial` → geometry builders → main export returning `{mesh, geometries, materials, update, dispose}`)
2. **Import `createLiminalMaterial` and `updateLiminalMaterial`** from `src/systems/AudioReactiveSystem.ts`
3. **Use Three.js** for all geometry — `THREE.BoxGeometry`, `THREE.PlaneGeometry`, `THREE.CylinderGeometry`, `THREE.Group`, etc.
4. **Register each builder** in `src/rooms/CuratedRoomRegistry.ts` following the existing import + registry pattern
5. **Build and typecheck** with `npx tsc --noEmit` after each room to catch errors early

---

## Phase 1: Wall Rotation Fix

### 1.1 Fix Polygon Wall Rotation in RoomGenerator.ts
**Priority:** High
**Files:** `src/generators/RoomGenerator.ts`

**Tasks:**
- [x] Add a `polygonWallRotation(edgeAngle: number): number` private helper method that returns `-edgeAngle + Math.PI / 2`, restoring the 90° offset needed for PlaneGeometry orientation
- [x] Replace `mesh.rotation.set(0, -angle, 0)` at line ~1356 (flat polygon walls) with `mesh.rotation.set(0, this.polygonWallRotation(angle), 0)`
- [x] Replace `mesh.rotation.set(0, -angle, 0)` at line ~1463 (curved wall segments) with `mesh.rotation.set(0, this.polygonWallRotation(angle), 0)`

---

## Phase 2: Room Builders (Batch A)

### 2.1 SubwayPlatform (Room 8)
**Priority:** High
**Files:** `src/rooms/templates/SubwayPlatform.ts`

**Tasks:**
- [x] Create `SubwayPlatform.ts` with PALETTE (yellow-green tile, grimy concrete, dark rail metal) and dimensions (30×4×8m)
- [x] Build platform floor with tiled pattern and track pit below with rail geometry (two parallel cylinders)
- [x] Add tiled columns along the platform at regular intervals using BoxGeometry
- [x] Add bench seating geometry along the platform wall
- [x] Add fluorescent tube row lighting (emissive rectangles along ceiling) and a flickering "NEXT TRAIN" sign (emissive plane)
- [x] Wire audio: bass rumble mapped to distant train vibration (subtle platform shake), mid-freq mapped to tile hum ambience
- [x] Export `buildSubwayPlatform` function matching `CuratedBuilderFn` signature

### 2.2 ServerRoom (Room 9)
**Priority:** High
**Files:** `src/rooms/templates/ServerRoom.ts`

**Tasks:**
- [x] Create `ServerRoom.ts` with PALETTE (cold blue, green LED, dark metal) and dimensions (12×3×20m)
- [x] Build narrow aisle corridor between two rows of tall server rack geometry (BoxGeometry with panel details)
- [x] Add raised floor tiles (grid of slightly elevated planes) and overhead cable trays (BoxGeometry rails)
- [x] Add blue LED strip emissive geometry on rack faces and a grid of blinking status light point lights
- [x] Add terminal screen planes with static-like emissive material at aisle ends
- [x] Wire audio: high-freq synced to LED blink intensity, bass mapped to rack vibration hum, transient triggers random blink pattern changes
- [x] Export `buildServerRoom` function matching `CuratedBuilderFn` signature

### 2.3 LiminalClassroom (Room 10)
**Priority:** High
**Files:** `src/rooms/templates/LiminalClassroom.ts`

**Tasks:**
- [x] Create `LiminalClassroom.ts` with PALETTE (beige walls, cream ceiling, green chalkboard, institutional carpet brown) and dimensions (10×3×12m)
- [x] Build 4×5 grid of student desk geometry (BoxGeometry desk + attached chair) and a teacher's desk at the front
- [x] Add chalkboard on the front wall (dark green plane with frame BoxGeometry) and a wall clock (cylinder with face detail)
- [x] Add overhead fluorescent panel lights (emissive planes in ceiling grid) and window-light glow on one side wall (emissive plane behind curtain geometry)
- [x] Wire audio: transient mapped to clock tick (clock hand rotation pulse), high-freq mapped to fluorescent buzz intensity
- [x] Export `buildLiminalClassroom` function matching `CuratedBuilderFn` signature

### 2.4 ParkingGarage (Room 11)
**Priority:** High
**Files:** `src/rooms/templates/ParkingGarage.ts`

**Tasks:**
- [x] Create `ParkingGarage.ts` with PALETTE (raw concrete grey, sodium orange, yellow lane paint, dark oil stain) and dimensions (30×2.8×30m)
- [x] Build open floor plane with painted lane line geometry (thin BoxGeometry strips) and concrete column grid (CylinderGeometry or BoxGeometry)
- [x] Add a ramp structure (angled plane leading to a wall — goes nowhere) and ceiling pipe runs (CylinderGeometry horizontal pipes)
- [x] Add sparse sodium-vapor ceiling lights (orange-tinted point lights with emissive disc geometry) and an exit sign (emissive green/red plane)
- [x] Wire audio: bass mapped to echo/footstep reverb intensity, mid-freq mapped to pipe drip, high-freq mapped to light buzz flicker
- [x] Export `buildParkingGarage` function matching `CuratedBuilderFn` signature

---

## Phase 3: Room Builders (Batch B)

### 3.1 Laundromat (Room 12)
**Priority:** Medium
**Files:** `src/rooms/templates/Laundromat.ts`

**Tasks:**
- [x] Create `Laundromat.ts` with PALETTE (white tile, chrome silver, warm fluorescent, linoleum beige) and dimensions (8×3×15m)
- [x] Build rows of front-loading washing machines (CylinderGeometry drums inside BoxGeometry housings) along both walls
- [x] Add a folding table (BoxGeometry slab on legs) in the center and a vending machine (BoxGeometry with emissive front panel) at one end
- [x] Add harsh overhead fluorescent lights (emissive ceiling planes), vending machine glow, and dryer window light (small emissive circles on machine fronts)
- [x] Wire audio: bass mapped to washing machine rumble cycle (oscillating intensity), mid mapped to tumble rhythm, transient triggers coin-drop light flash
- [x] Export `buildLaundromat` function matching `CuratedBuilderFn` signature

### 3.2 WaitingRoom (Room 13)
**Priority:** Medium
**Files:** `src/rooms/templates/WaitingRoom.ts`

**Tasks:**
- [x] Create `WaitingRoom.ts` with PALETTE (mauve chair fabric, teal accents, drop-ceiling white, beige walls) and dimensions (12×3×10m)
- [x] Build rows of connected chairs (BoxGeometry seats with shared armrest bars) and a reception window with frosted glass plane
- [x] Add a "NOW SERVING" number display (emissive plane with backlight), magazines on a side table (thin BoxGeometry stack), and a water cooler (CylinderGeometry)
- [x] Add flat overhead panel lights (emissive ceiling grid) and blank motivational poster frames (BoxGeometry frames with empty plane centers) on walls
- [x] Wire audio: transient mapped to number display tick/change, bass mapped to HVAC drone ambience
- [x] Export `buildWaitingRoom` function matching `CuratedBuilderFn` signature

### 3.3 ElevatorBank (Room 14)
**Priority:** Medium
**Files:** `src/rooms/templates/ElevatorBank.ts`

**Tasks:**
- [x] Create `ElevatorBank.ts` with PALETTE (brass gold, marble white, art deco green, carpet burgundy) and dimensions (8×3×6m)
- [x] Build 3 elevator door pairs (brushed metal BoxGeometry panels) set into the main wall with frame trim
- [x] Add indicator arrows above each door (emissive triangle planes) and floor number displays (small emissive rectangles)
- [x] Add marble floor plane, carpet runner (slightly raised textured plane), mirrored back wall (reflective material plane), and a potted plant (CylinderGeometry pot + cone/sphere foliage)
- [x] Add recessed ceiling downlights (point lights with disc geometry) and elevator call button glow (small emissive circles)
- [x] Wire audio: transient mapped to elevator ding (indicator arrow change), bass mapped to mechanical hum behind doors
- [x] Export `buildElevatorBank` function matching `CuratedBuilderFn` signature

### 3.4 LivingRoom (Room 15)
**Priority:** Medium
**Files:** `src/rooms/templates/LivingRoom.ts`

**Tasks:**
- [x] Create `LivingRoom.ts` with PALETTE (warm beige walls, brown wood floor, muted wallpaper pattern, soft lamp yellow) and dimensions (8×2.8×10m)
- [x] Build couch geometry (BoxGeometry cushions + frame), coffee table (BoxGeometry slab on legs), and bookshelf (BoxGeometry shelves with thin book-block fills)
- [x] Add a TV on a stand (thin BoxGeometry screen with emissive static-flicker material), a lamp (CylinderGeometry base + cone shade with point light), and a curtained window (plane with light-emitting backplane)
- [x] Add wood floor plane, wallpaper-tinted walls, and the uncanny detail: no personal items, TV shows static, everything slightly too perfect
- [x] Wire audio: high-freq mapped to TV static intensity, transient mapped to lamp flicker pulse, bass mapped to ambient drone
- [x] Export `buildLivingRoom` function matching `CuratedBuilderFn` signature

---

## Phase 4: Registry Integration

### 4.1 Register All Builders in CuratedRoomRegistry.ts
**Priority:** High
**Files:** `src/rooms/CuratedRoomRegistry.ts`

**Tasks:**
- [x] Add import for `buildSubwayPlatform` from `./templates/SubwayPlatform`
- [x] Add import for `buildServerRoom` from `./templates/ServerRoom`
- [x] Add import for `buildLiminalClassroom` from `./templates/LiminalClassroom`
- [x] Add import for `buildParkingGarage` from `./templates/ParkingGarage`
- [x] Add import for `buildLaundromat` from `./templates/Laundromat`
- [x] Add import for `buildWaitingRoom` from `./templates/WaitingRoom`
- [x] Add import for `buildElevatorBank` from `./templates/ElevatorBank`
- [x] Add import for `buildLivingRoom` from `./templates/LivingRoom`
- [x] Add all 8 entries to `BUILDER_REGISTRY`: `subway_platform`, `server_room`, `liminal_classroom`, `parking_garage`, `laundromat`, `waiting_room`, `elevator_bank`, `living_room`
- [x] Update the registry comment to reflect rooms 1–15 having full curated builders

---

## Priority Execution Order

1. **1.1** Fix Polygon Wall Rotation — Quick fix, unblocks correct wall rendering for all rooms
2. **2.1** SubwayPlatform — First new room, establishes pattern for batch
3. **2.2** ServerRoom — Independent, can parallel with 2.1
4. **2.3** LiminalClassroom — Independent, can parallel
5. **2.4** ParkingGarage — Independent, can parallel
6. **3.1** Laundromat — Batch B starts after confirming Batch A pattern works
7. **3.2** WaitingRoom — Independent within batch
8. **3.3** ElevatorBank — Independent within batch
9. **3.4** LivingRoom — Independent within batch
10. **4.1** Register All Builders — Final step, requires all builders to exist
