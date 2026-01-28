# House of Leaves Aesthetic Reference

## Overview

This document defines the liminal aesthetic principles drawn from Mark Z. Danielewski's *House of Leaves* and Andrew Hulshult's *MyHouse.wad*. These works establish the foundational atmosphere of impossible architecture, psychological dread, and spaces that defy physical law.

---

## Core Aesthetic Principles

### 1. The Space is Wrong

The fundamental horror is spatial. Measurements don't match. Rooms are larger inside than outside. Distances change when you're not looking.

**Implementation:**
- Non-Euclidean room scaling (interior 1.2-2.5x larger than doorway suggests)
- Corridor lengths that extend beyond the building's footprint
- Rooms that seem to shift position relative to each other

### 2. Mundane Made Uncanny

The most effective liminal horror uses ordinary spaces - hallways, empty rooms, fluorescent lighting - but presents them slightly *wrong*. Not overtly supernatural, but fundamentally unsettling.

**Visual Language:**
- Commercial carpet patterns (hotels, offices, airports)
- Institutional paint colors (beige, pale green, off-white) mixed with our purple palette
- Fluorescent lighting with subtle flicker
- Exit signs that lead nowhere
- Doors that shouldn't be there

### 3. The Absence of Expected Things

Horror through omission. Spaces feel wrong because of what's *missing*: windows, furniture, logical layout, other people.

**Elements to Exclude:**
- No windows in inner rooms (emphasizes labyrinthine depth)
- Minimal furniture (occasional chair, table, lamp)
- No other inhabitants (player is always alone)
- No outside sounds (complete isolation)

### 4. Impossible Yet Familiar

The architecture should feel like a place you've been before, but can't quite remember. Office buildings, hotels, school hallways - familiar archetypes twisted.

---

## House of Leaves Reference Points

### The Navidson Record

The fictional documentary within the novel documents a house with an impossible interior. Key elements:

#### The Five and a Half Minute Hallway
A hallway that appears in the house, leading to an impossibly vast space. It grows and contracts. The deeper one goes, the more vast and featureless it becomes.

**Implementation:**
- Some hallways extend indefinitely (use fog to hide the end)
- Hallway length can change between visits
- No features or doors on extremely long corridors

#### The Growl
A low rumbling sound that permeates the impossible space. Never clearly identifiable. Associated with an unseen presence.

**Implementation:**
- Sub-bass drone that fades in over hours of real time
- Directional ambiguity (seems to come from everywhere)
- Intensity correlates with depth and time

#### The Spiral Staircase
Descending into darkness. The deeper you go, the more the space defies comprehension.

**Implementation:**
- Room abnormality increases with depth (room index)
- Patterns become more distorted
- Colors shift subtly toward wrongness

#### The Constantly Changing Space
Rooms rearrange. Doorways appear and disappear. The space refuses to be mapped.

**Implementation:**
- Portal variations (same doorway, different destination)
- Rooms that are slightly different on return
- Impossible connections (exiting room A leads to room C, not back to B)

---

## MyHouse.wad Reference Points

### Level Design Philosophy

The DOOM WAD that redefined environmental horror through subtle wrongness:

#### Visual Glitches as Horror
- Textures that don't quite align
- Geometry that clips through itself
- Lighting that casts shadows in wrong directions

**Implementation:**
- Shader glitches triggered by time and audio
- Pattern misalignment in stressed rooms
- Light sources that flicker independently

#### The "Wrong" Version
Alternate versions of rooms with one unsettling change:
- Photos with different faces
- Furniture in different positions
- Text that's reversed or changed

**Implementation:**
- Portal variation system (5 escalating levels)
- Seed modifications produce subtle differences
- Some differences are obvious, others require attention to notice

#### Breaking the Fourth Wall
Moments where the game acknowledges it's a game, then uses that against you.

**Implementation:**
- UI elements that glitch (battery indicator, compass)
- Audio that seems to come from outside the game
- Geometry that references the player's real-world time

---

## Color Palette Application

### Base Palette (pale-strata)

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#c792f5` | Doorway glows, accent lighting, important elements |
| Secondary | `#8eecf5` | Circuitry, interactive highlights, data flow |
| Background | `#1a1834` | Deep shadows, void spaces, liminal darkness |
| Gradient Start | `#3a3861` | Wall bases, floor tones |
| Gradient End | `#2c2c4b` | Ceiling, distant fog |

### Atmosphere Modulation

As abnormality increases, colors shift:

```
Normal (depth 0-5):
  Warm undertones, balanced palette

Unsettled (depth 5-15):
  Cooler tones, reduced saturation
  Primary: #b080e0 (desaturated purple)

Dread (depth 15-30):
  Color bleeding, chromatic instability
  Primary shifts toward cyan: #a0c0f5
  Secondary bleeds into shadows

Abyss (depth 30+):
  Near-monochrome, purple-black
  Only doorways retain color
  Fog absorbs all detail
```

---

## Spatial Design Rules

### Room Proportions

**Normal Rooms:**
- Ceiling height: 3-4 meters
- Width/depth ratio: 0.5-2.0
- At least one wall visible

**Unsettling Rooms:**
- Ceiling height: 2.5m OR 6m+ (too low or too high)
- Extreme proportions: very narrow or very wide
- Corners that feel too sharp or too rounded

**Impossible Rooms:**
- Variable ceiling height within same room
- Non-parallel walls (subtle, 1-2 degree deviation)
- Corners that don't add up to 360 degrees

### Doorway Logic

**Normal (depth 0-5):**
- Doorways on opposite walls (logical flow)
- 2-3 doorways per room
- Clear entrance/exit relationship

**Disorienting (depth 5-15):**
- Doorways on adjacent walls
- Multiple doorways on same wall
- Exit leads to unexpected room type

**Impossible (depth 15+):**
- Doorway leads back to same room (rotated)
- Doorway visible from both sides simultaneously
- Doorway that exits don't lead back to entry room

### Corridor Design

**Short Corridors (<10m):**
- Normal perspective
- Visible end
- 1-2 doorways

**Medium Corridors (10-30m):**
- Slight perspective distortion
- End obscured by fog
- 0-3 doorways

**Long Corridors (30m+):**
- Strong perspective distortion (converging walls)
- No visible end
- No doorways (pure passage)
- Occasional alcoves that lead nowhere

---

## Lighting Principles

### Light Source Types

| Type | Color Temp | Behavior | Usage |
|------|-----------|----------|-------|
| Fluorescent | 4000K-6500K | Subtle flicker, buzz | Corridors, offices |
| Incandescent | 2700K-3000K | Warm glow, stable | Residential rooms |
| Emergency | Red/amber | Slow pulse | Stairwells, exits |
| Unknown | Primary palette | Steady glow | Doorways, portals |

### Shadow Behavior

**Normal:**
- Shadows fall away from light sources
- Consistent intensity
- Sharp edges near sources, soft at distance

**Abnormal:**
- Shadows fall in wrong directions (subtly)
- Shadows move when player isn't looking
- Shadow intensity doesn't match light brightness

**Growl-Affected:**
- Shadows seem to have depth (darker centers)
- Peripheral shadows move in corner of vision
- Some shadows have no source

---

## Sound Design Principles

### Ambient Sound

**Silence is Never Silent:**
- Room tone (subtle air handling noise)
- Distant, unidentifiable sounds
- Own footsteps echoing wrong

**The Growl:**
- Subsonic (20-40Hz)
- Directionally ambiguous
- Grows over real-world hours

**Wrongness Cues:**
- Sound that should echo doesn't
- Sound that shouldn't echo does
- Footsteps on different surface than visible

### Audio-Visual Correlation

The audio analysis drives visuals, but with intentional mismatches:
- Patterns move to beat, but occasionally slip
- Color responds to frequency, but with delay drift
- Transients cause glitches, but sometimes nothing happens

---

## Psychological Techniques

### Delayed Wrongness

Changes that happen after the player has moved on:
- Return to room: one thing different
- Progression: rooms get stranger gradually
- Memory: player unsure if they're misremembering

### False Patterns

Establish rules, then break them:
- First 5 rooms: doorways always on opposite walls
- Room 6: doorway on same wall as entry
- Player now questions all navigation

### The Waiting Game

Time-based escalation (The Growl):
- Nothing happens for the first hour
- Subtle changes in hour 2
- Noticeable by hour 6
- Unavoidable by hour 24

This rewards (punishes?) dedicated exploration.

---

## Technical Manifestation

### Shader Effects for Liminal Space

```glsl
// Subtle wall breathing (unsettling movement)
float breathe = sin(u_time * 0.3 + worldPos.y * 0.5) * 0.003 * u_abnormality;

// Wrong shadows (shadow direction offset)
vec3 shadowDir = normalize(lightDir + vec3(sin(u_time * 0.1), 0.0, cos(u_time * 0.1)) * u_growlIntensity * 0.2);

// Perspective distortion (converging walls)
float distort = length(worldPos.xz) * 0.001 * u_abnormality;
```

### Fog Configuration

```typescript
// Liminal fog setup
const fog = new THREE.FogExp2(
  new THREE.Color('#1a1834'),
  0.015 + abnormality * 0.01  // Denser in deeper rooms
);

// The fog gets closer as Growl intensifies
fog.density = 0.015 + growlIntensity * 0.02;
```

---

## Reference Implementation Checklist

- [ ] Non-Euclidean room scaling (portal rendering)
- [ ] Room abnormality progression with depth
- [ ] Doorway glow with portal variation indicator
- [ ] The Growl sub-bass drone with time progression
- [ ] Shadow movement anomalies
- [ ] Fog density responsive to depth and Growl
- [ ] Corridor perspective distortion
- [ ] Light flicker system
- [ ] Color palette shift with abnormality
- [ ] Pattern distortion in shaders
- [ ] False pattern establishment and breaking
- [ ] Time-based dread escalation

---

## Files

This document serves as an aesthetic guide and does not directly correspond to implementation files. It should be referenced when implementing:

- `src/generators/RoomGenerator.ts` - Room proportions, doorway logic
- `src/systems/GrowlSystem.ts` - Time-based dread
- `src/shaders/*.glsl` - Visual distortions
- `src/systems/PortalVariationSystem.ts` - Wrong versions
