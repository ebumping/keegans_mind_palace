/**
 * CeilingLights Component
 *
 * Renders dynamic light fixtures from room ceiling config.
 * Each archetype gets a distinct lighting character:
 * - Fluorescent: tube geometry with cold buzz, institutional flicker
 * - Bare bulb: sphere mesh with warm glow, erratic flicker at high Growl
 * - Recessed: disc geometry with soft diffuse wash
 * - None: darkness (atrium, void spaces)
 *
 * Flicker behavior is driven by Growl intensity + audio mid-frequency,
 * so lights destabilize as the palace ages and react to music.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioSmooth } from '../store/audioStore';
import { useGrowlIntensity } from '../store/timeStore';
import { SeededRandom } from '../utils/seededRandom';
import type { RoomDimensions, CeilingConfig } from '../types/room';

// Lighting preset per archetype — color temperature, intensity, fixture count
interface LightingPreset {
  colorTemp: THREE.Color;       // Base light color
  intensity: number;            // Base point light intensity
  flickerRate: number;          // Base flicker speed (higher = faster)
  flickerDepth: number;         // How deep flickers cut (0 = none, 1 = full off)
  fixtureCount: [number, number]; // Min/max fixture count range
  emissiveColor: THREE.Color;   // Color of the glowing fixture mesh
  emissiveIntensity: number;    // Brightness of the fixture mesh
}

const ARCHETYPE_LIGHT_PRESETS: Partial<Record<string, LightingPreset>> = {
  // Domestic — warm, inviting
  living_room: {
    colorTemp: new THREE.Color('#ffe4c4'),
    intensity: 1.2,
    flickerRate: 0.3,
    flickerDepth: 0.05,
    fixtureCount: [2, 4],
    emissiveColor: new THREE.Color('#fff0d0'),
    emissiveIntensity: 0.8,
  },
  kitchen: {
    colorTemp: new THREE.Color('#f0f0e0'),
    intensity: 1.5,
    flickerRate: 8.0,
    flickerDepth: 0.03,
    fixtureCount: [2, 3],
    emissiveColor: new THREE.Color('#e8f0e8'),
    emissiveIntensity: 1.0,
  },
  bedroom: {
    colorTemp: new THREE.Color('#ffd8a8'),
    intensity: 0.8,
    flickerRate: 0.2,
    flickerDepth: 0.04,
    fixtureCount: [1, 2],
    emissiveColor: new THREE.Color('#ffe0b0'),
    emissiveIntensity: 0.6,
  },
  bathroom: {
    colorTemp: new THREE.Color('#e8f0f8'),
    intensity: 1.4,
    flickerRate: 12.0,
    flickerDepth: 0.06,
    fixtureCount: [1, 2],
    emissiveColor: new THREE.Color('#e0f0f8'),
    emissiveIntensity: 1.0,
  },
  // Institutional — cold, sterile
  corridor_of_doors: {
    colorTemp: new THREE.Color('#e8e0c8'),
    intensity: 1.0,
    flickerRate: 6.0,
    flickerDepth: 0.08,
    fixtureCount: [3, 6],
    emissiveColor: new THREE.Color('#e0e0d0'),
    emissiveIntensity: 0.9,
  },
  waiting_room: {
    colorTemp: new THREE.Color('#e0e0e0'),
    intensity: 1.3,
    flickerRate: 10.0,
    flickerDepth: 0.05,
    fixtureCount: [2, 4],
    emissiveColor: new THREE.Color('#e8e8e8'),
    emissiveIntensity: 1.0,
  },
  office: {
    colorTemp: new THREE.Color('#d8e0f0'),
    intensity: 1.6,
    flickerRate: 15.0,
    flickerDepth: 0.04,
    fixtureCount: [3, 6],
    emissiveColor: new THREE.Color('#d0e0f0'),
    emissiveIntensity: 1.2,
  },
  // Transitional — stark, bare
  stairwell: {
    colorTemp: new THREE.Color('#f0d8a0'),
    intensity: 0.6,
    flickerRate: 1.5,
    flickerDepth: 0.25,
    fixtureCount: [1, 2],
    emissiveColor: new THREE.Color('#f0d090'),
    emissiveIntensity: 0.7,
  },
  elevator_bank: {
    colorTemp: new THREE.Color('#e8d8c0'),
    intensity: 0.9,
    flickerRate: 0.5,
    flickerDepth: 0.08,
    fixtureCount: [1, 2],
    emissiveColor: new THREE.Color('#e0d0b0'),
    emissiveIntensity: 0.6,
  },
  // Commercial — artificial brightness
  store: {
    colorTemp: new THREE.Color('#f0e8d0'),
    intensity: 1.8,
    flickerRate: 20.0,
    flickerDepth: 0.02,
    fixtureCount: [4, 8],
    emissiveColor: new THREE.Color('#f0e8c8'),
    emissiveIntensity: 1.3,
  },
  restaurant: {
    colorTemp: new THREE.Color('#ffd0a0'),
    intensity: 0.7,
    flickerRate: 0.1,
    flickerDepth: 0.03,
    fixtureCount: [2, 4],
    emissiveColor: new THREE.Color('#ffc890'),
    emissiveIntensity: 0.5,
  },
  // Void — oppressive, minimal
  atrium: {
    colorTemp: new THREE.Color('#a0a8c0'),
    intensity: 0.3,
    flickerRate: 0.8,
    flickerDepth: 0.15,
    fixtureCount: [1, 2],
    emissiveColor: new THREE.Color('#9098b0'),
    emissiveIntensity: 0.3,
  },
  parking: {
    colorTemp: new THREE.Color('#d8c880'),
    intensity: 0.5,
    flickerRate: 2.0,
    flickerDepth: 0.20,
    fixtureCount: [2, 4],
    emissiveColor: new THREE.Color('#d0c070'),
    emissiveIntensity: 0.6,
  },
};

const DEFAULT_PRESET: LightingPreset = {
  colorTemp: new THREE.Color('#e8e0d0'),
  intensity: 1.0,
  flickerRate: 1.0,
  flickerDepth: 0.06,
  fixtureCount: [2, 3],
  emissiveColor: new THREE.Color('#e0d8c8'),
  emissiveIntensity: 0.7,
};

// Fixture configuration generated once per room
interface FixtureConfig {
  position: THREE.Vector3;
  lightingType: CeilingConfig['lightingType'];
  preset: LightingPreset;
  flickerPhase: number; // Random phase offset so fixtures don't flicker in sync
  flickerStyle: 'smooth' | 'snap' | 'buzz'; // Personality of flicker
}

interface CeilingLightsProps {
  dimensions: RoomDimensions;
  ceilingConfig: CeilingConfig;
  archetype?: string;
  roomIndex: number;
  seed: number;
  wrongnessLightingBehavior?: string;
  enabled?: boolean;
}

/**
 * Single light fixture — renders geometry + point light + flicker animation
 */
function LightFixture({ config }: { config: FixtureConfig }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const audioSmooth = useAudioSmooth();
  const growlIntensity = useGrowlIntensity();

  const state = useRef({
    time: config.flickerPhase, // Start at random phase
    currentIntensity: config.preset.intensity,
    flickerCooldown: 0,
    isFlickering: false,
  });

  // Create fixture geometry based on lighting type
  const fixtureGeometry = useMemo(() => {
    switch (config.lightingType) {
      case 'fluorescent': {
        // Long tube shape
        return new THREE.BoxGeometry(1.8, 0.06, 0.15);
      }
      case 'bare_bulb': {
        // Small sphere
        return new THREE.SphereGeometry(0.08, 8, 6);
      }
      case 'recessed': {
        // Flat disc
        return new THREE.CylinderGeometry(0.25, 0.25, 0.04, 12);
      }
      default:
        return new THREE.SphereGeometry(0.06, 6, 4);
    }
  }, [config.lightingType]);

  useFrame((_, delta) => {
    if (!lightRef.current || !meshRef.current) return;

    const s = state.current;
    s.time += delta;

    const { preset, flickerStyle } = config;
    const midLevel = audioSmooth.midSmooth;

    // Base intensity from preset
    let targetIntensity = preset.intensity;

    // --- Flicker behavior ---
    // Flicker depth increases with Growl intensity
    const growlFlickerBoost = growlIntensity * 0.4;
    const effectiveFlickerDepth = Math.min(
      preset.flickerDepth + growlFlickerBoost,
      0.95 // Never fully black unless Growl is extreme
    );

    // Flicker rate modulated by audio mid-frequency
    const effectiveFlickerRate = preset.flickerRate * (1 + midLevel * 0.5);

    // Different flicker styles
    let flickerValue = 0;
    switch (flickerStyle) {
      case 'buzz': {
        // High-frequency fluorescent buzz — rapid oscillation
        const buzz = Math.sin(s.time * effectiveFlickerRate * Math.PI * 2);
        const buzzNoise = Math.sin(s.time * effectiveFlickerRate * 7.3) * 0.3;
        flickerValue = (buzz * 0.5 + buzzNoise) * effectiveFlickerDepth;
        break;
      }
      case 'snap': {
        // Bare bulb snap — occasional hard cuts to dim/off
        s.flickerCooldown -= delta;
        if (s.flickerCooldown <= 0 && !s.isFlickering) {
          // Chance to start a flicker event, scaled by Growl
          const flickerChance = (0.02 + growlIntensity * 0.08) * effectiveFlickerRate;
          if (Math.random() < flickerChance) {
            s.isFlickering = true;
            s.flickerCooldown = 0.05 + Math.random() * 0.15; // Short flicker duration
          }
        }
        if (s.isFlickering) {
          flickerValue = effectiveFlickerDepth * (0.6 + Math.random() * 0.4);
          s.flickerCooldown -= delta;
          if (s.flickerCooldown <= 0) {
            s.isFlickering = false;
            s.flickerCooldown = 0.5 + Math.random() * 2.0; // Cooldown before next flicker
          }
        }
        break;
      }
      case 'smooth':
      default: {
        // Gentle sine-based dimming for recessed lights
        const wave = Math.sin(s.time * effectiveFlickerRate * 0.5) * 0.5 + 0.5;
        flickerValue = wave * effectiveFlickerDepth * 0.5;
        break;
      }
    }

    // Audio mid-frequency adds subtle pulsing
    const audioPulse = midLevel * 0.15;

    targetIntensity = preset.intensity * (1 - flickerValue) + audioPulse;

    // Smooth toward target
    s.currentIntensity = THREE.MathUtils.lerp(
      s.currentIntensity,
      Math.max(0, targetIntensity),
      delta * 8
    );

    // Apply to light
    lightRef.current.intensity = s.currentIntensity;

    // Shift color toward sickly green/purple at high Growl
    if (growlIntensity > 0.3) {
      const sicklyColor = new THREE.Color('#a0c090');
      lightRef.current.color.copy(preset.colorTemp).lerp(sicklyColor, (growlIntensity - 0.3) * 0.4);
    } else {
      lightRef.current.color.copy(preset.colorTemp);
    }

    // Update fixture mesh emissive to match light state
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = s.currentIntensity * (preset.emissiveIntensity / preset.intensity);
  });

  // Light distance based on room height (implicit from position.y)
  const lightDistance = config.position.y * 2.5;

  return (
    <group position={config.position}>
      {/* The actual light */}
      <pointLight
        ref={lightRef}
        color={config.preset.colorTemp}
        intensity={config.preset.intensity}
        distance={lightDistance}
        decay={2}
        castShadow={false}
      />

      {/* Fixture geometry — visible glowing shape */}
      <mesh ref={meshRef} geometry={fixtureGeometry}>
        <meshStandardMaterial
          color={config.preset.emissiveColor}
          emissive={config.preset.emissiveColor}
          emissiveIntensity={config.preset.emissiveIntensity}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Main CeilingLights component — generates fixture layout from room config
 */
export function CeilingLights({
  dimensions,
  ceilingConfig,
  archetype,
  roomIndex,
  seed,
  wrongnessLightingBehavior,
  enabled = true,
}: CeilingLightsProps) {
  // Generate fixture configurations deterministically from seed
  const fixtures = useMemo(() => {
    if (!enabled || !ceilingConfig.hasLighting || ceilingConfig.lightingType === 'none') {
      return [];
    }

    const rng = new SeededRandom(seed + 40000);

    // Get archetype-specific preset or default
    const preset: LightingPreset = (archetype && ARCHETYPE_LIGHT_PRESETS[archetype])
      ? { ...ARCHETYPE_LIGHT_PRESETS[archetype]! }
      : { ...DEFAULT_PRESET };

    // Override preset color/style if wrongness demands it
    if (wrongnessLightingBehavior === 'wrong_direction') {
      // Lights are placed at wrong heights / positions — handled by WrongShadows component
      // Still render normal ceiling fixtures but dimmer
      preset.intensity *= 0.4;
      preset.flickerDepth *= 2;
    } else if (wrongnessLightingBehavior === 'sourceless') {
      // Light exists but no visible source — skip fixture geometry
      preset.emissiveIntensity = 0;
    } else if (wrongnessLightingBehavior === 'flicker') {
      // Amplified flicker
      preset.flickerDepth = Math.min(preset.flickerDepth * 3, 0.8);
      preset.flickerRate *= 2;
    }

    // Determine fixture count from preset range
    const [minCount, maxCount] = preset.fixtureCount;
    const count = rng.int(minCount, maxCount);

    // Determine flicker style from lighting type
    const flickerStyle: FixtureConfig['flickerStyle'] =
      ceilingConfig.lightingType === 'fluorescent' ? 'buzz' :
      ceilingConfig.lightingType === 'bare_bulb' ? 'snap' :
      'smooth';

    const fixtures: FixtureConfig[] = [];
    const fixtureY = dimensions.height - 0.1; // Just below ceiling

    // Place fixtures in a grid-like pattern with some randomness
    const cols = Math.ceil(Math.sqrt(count * (dimensions.width / dimensions.depth)));
    const rows = Math.ceil(count / Math.max(1, cols));

    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        // Grid position with jitter
        const gridX = ((c + 0.5) / cols - 0.5) * dimensions.width * 0.7;
        const gridZ = ((r + 0.5) / rows - 0.5) * dimensions.depth * 0.7;
        const jitterX = rng.range(-dimensions.width * 0.08, dimensions.width * 0.08);
        const jitterZ = rng.range(-dimensions.depth * 0.08, dimensions.depth * 0.08);

        fixtures.push({
          position: new THREE.Vector3(
            gridX + jitterX,
            fixtureY,
            gridZ + jitterZ
          ),
          lightingType: ceilingConfig.lightingType,
          preset,
          flickerPhase: rng.range(0, Math.PI * 2),
          flickerStyle,
        });

        placed++;
      }
    }

    return fixtures;
  }, [dimensions, ceilingConfig, archetype, seed, enabled, wrongnessLightingBehavior, roomIndex]);

  if (!enabled || fixtures.length === 0) return null;

  return (
    <group>
      {fixtures.map((fixture, i) => (
        <LightFixture key={`ceil-light-${i}`} config={fixture} />
      ))}

      {/* Ambient fill so rooms aren't pitch black between fixtures */}
      <ambientLight intensity={0.08} color="#e8e0d8" />
    </group>
  );
}

export default CeilingLights;
