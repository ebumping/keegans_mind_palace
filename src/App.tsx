import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Room } from './components/Room'
import { GrowlController } from './components/GrowlController'
import { GlitchEffect } from './components/GlitchEffect'
import { AudioPermission } from './components/UI/AudioPermission'
import { Controls } from './components/UI/Controls'
import { useTimeStore } from './store/timeStore'
import { useNavigationInit, useNavigation } from './hooks/useNavigation'
import { getNavigationSystem, calculateEntryPosition, calculateEntryYaw, getOppositeWall, DEFAULT_MOVEMENT_CONFIG } from './systems/NavigationSystem'
import { useTransition } from './hooks/useTransition'
import type { RoomConfig, DoorwayPlacement } from './types/room'
import { getTransitionSystem } from './systems/TransitionSystem'
import { CollisionDebug } from './debug/CollisionDebug'
import { DebugOverlay } from './debug/DebugOverlay'
import { getWrongnessSystem } from './systems/WrongnessSystem'
import { getPortalVariationSystem } from './systems/PortalVariationSystem'
import { getRoomPoolManager, disposeRoomPoolManager } from './systems/RoomPoolManager'
import { usePerformanceStore, usePerformanceSettings, type PerformanceSettings } from './store/performanceStore'

// Pale-strata color palette
const COLORS = {
  background: '#1a1834',
  fogColor: '#211f3c',
  primary: '#c792f5',
  secondary: '#8eecf5',
}


/**
 * FPS Monitor - Updates performance store for adaptive quality
 */
function FpsMonitor() {
  const updateFps = usePerformanceStore((state) => state.updateFps)
  const adaptQuality = usePerformanceStore((state) => state.adaptQuality)
  const frameCount = useMemo(() => ({ current: 0, lastTime: performance.now() }), [])

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    const delta = now - frameCount.lastTime

    // Calculate FPS every second
    if (delta >= 1000) {
      const fps = (frameCount.current / delta) * 1000
      updateFps(fps)
      frameCount.current = 0
      frameCount.lastTime = now

      // Check if we need to adapt quality (every 5 seconds worth of samples)
      adaptQuality()
    }
  })

  return null
}

/**
 * Growl-Reactive Chromatic Aberration
 * Increases distortion based on Growl intensity.
 */
function GrowlReactiveChromaticAberration() {
  // Use primitive selector to avoid object reference issues
  const colorDistortion = useTimeStore((state) => state.growlEffects.colorDistortion)
  const baseOffset = 0.002
  const offset = baseOffset + colorDistortion * 0.01

  // Memoize offset vector to prevent infinite re-renders
  const offsetVector = useMemo(() => new THREE.Vector2(offset, offset), [offset])

  return (
    <ChromaticAberration
      blendFunction={BlendFunction.NORMAL}
      offset={offsetVector}
      radialModulation={false}
      modulationOffset={0.5}
    />
  )
}

/**
 * Post-Processing Effects Component
 * Renders different effect configurations based on performance tier.
 * This avoids TypeScript issues with conditional children in EffectComposer.
 */
function PostProcessingEffects({ settings }: { settings: PerformanceSettings }) {
  if (!settings.enablePostProcessing) {
    return null
  }

  // High quality: all effects
  if (settings.enableBloom && settings.enableChromaticAberration && settings.enableGlitch && settings.enableVignette) {
    return (
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
        <GrowlReactiveChromaticAberration />
        <GlitchEffect />
        <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    )
  }

  // Medium quality: bloom + vignette only
  if (settings.enableBloom && settings.enableVignette) {
    return (
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    )
  }

  // Bloom only
  if (settings.enableBloom) {
    return (
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    )
  }

  // Vignette only
  if (settings.enableVignette) {
    return (
      <EffectComposer>
        <Vignette offset={0.3} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    )
  }

  return null
}

/**
 * First-Person Navigation Controller with Transition Support
 * Manages player movement, camera, and room transitions in first-person mode.
 */
function NavigationController({ roomConfig, onTransition }: { roomConfig: RoomConfig | null; onTransition: (doorway: DoorwayPlacement) => void }) {
  // Initialize navigation system
  useNavigationInit()

  // Use navigation with room collision and transition handling
  useNavigation({
    roomConfig,
    enabled: true,
    enableAudioSway: true,
    baseFOV: 75,
    onTransition: (trigger) => {
      // Trigger room transition when entering doorway - pass the full doorway info
      onTransition(trigger.doorway)
    },
  })

  return null
}

/**
 * Pointer Lock Overlay
 * Shows instructions when pointer is not locked.
 * On mobile, tapping enters the experience without pointer lock.
 */
function PointerLockOverlay({ isTouchDevice, onEnter }: { isTouchDevice: boolean; onEnter: () => void }) {
  const [isLocked, setIsLocked] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement !== null)
    }
    document.addEventListener('pointerlockchange', handleLockChange)
    return () => document.removeEventListener('pointerlockchange', handleLockChange)
  }, [])

  const enter = useCallback(() => {
    if (isTouchDevice) {
      // On mobile, just dismiss the overlay and enable touch controls
      setHasEntered(true)
      onEnter()
    } else {
      // On desktop, request pointer lock
      const canvas = document.querySelector('canvas')
      canvas?.requestPointerLock()
    }
  }, [isTouchDevice, onEnter])

  // Hide overlay when entered (mobile) or pointer locked (desktop)
  if (hasEntered || isLocked) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(26, 24, 52, 0.85)',
        zIndex: 100,
        cursor: 'pointer',
        touchAction: 'none',
      }}
      onClick={enter}
      onTouchEnd={(e) => {
        e.preventDefault()
        enter()
      }}
    >
      <div style={{
        color: '#c792f5',
        fontSize: '24px',
        fontFamily: 'monospace',
        marginBottom: '16px',
      }}>
        {isTouchDevice ? 'Tap to Enter' : 'Click to Enter'}
      </div>
      <div style={{
        color: '#8eecf5',
        fontSize: '14px',
        fontFamily: 'monospace',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.6',
        padding: '0 20px',
      }}>
        {isTouchDevice ? (
          <>
            Left Joystick - Move<br />
            Right Zone - Look Around<br />
            Center Button - Sprint
          </>
        ) : (
          <>
            WASD / Arrow Keys - Move<br />
            Mouse - Look Around<br />
            Shift - Sprint<br />
            ESC - Release Cursor
          </>
        )}
      </div>
    </div>
  )
}

interface SceneProps {
  showCollisionDebug?: boolean;
}

function Scene({ showCollisionDebug = false }: SceneProps) {
  // Current room state
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null)

  // Track the entry wall for repositioning after transition
  const pendingEntryRef = useRef<{ wall: import('./types/room').Wall; position: number } | null>(null)

  // Performance settings
  const perfSettings = usePerformanceSettings()

  // Initialize room pool manager (singleton, keeps current +-2 rooms)
  const poolManager = useMemo(() => getRoomPoolManager(42), [])

  // Initialize transition system
  const transition = useTransition({
    onTransitionComplete: (toRoom) => {
      // Room change happens at transition midpoint
      setCurrentRoomIndex(toRoom.index)

      // Reposition player to entry point of new room
      const entry = pendingEntryRef.current
      if (entry) {
        const navSystem = getNavigationSystem()
        const entryPos = calculateEntryPosition(
          entry.wall,
          entry.position,
          toRoom.dimensions,
          DEFAULT_MOVEMENT_CONFIG.playerRadius
        )
        const entryYaw = calculateEntryYaw(entry.wall)
        navSystem.setPosition(entryPos)
        navSystem.setYaw(entryYaw)
        navSystem.resetTransitionCooldown()
        pendingEntryRef.current = null
      }
    },
  })

  // Cleanup pool manager on unmount
  useEffect(() => {
    return () => {
      disposeRoomPoolManager()
    }
  }, [])

  // Update room config when room index changes.
  // Uses the pool manager which handles visited room caching,
  // adjacent room pre-generation, and disposal of distant rooms.
  useEffect(() => {
    // Update pool window — evicts far rooms, pre-generates adjacent configs
    poolManager.setCurrentRoom(currentRoomIndex)

    // Get config from pool (uses TransitionSystem cache or generates fresh)
    const config = poolManager.getRoomConfig(currentRoomIndex)
    setRoomConfig(config)

    // Update wrongness system depth
    const wrongnessSystem = getWrongnessSystem()
    wrongnessSystem.setDepth(currentRoomIndex)

    // Log pool stats periodically
    const stats = poolManager.getStats()
    console.log(
      `[RoomPool] Room ${currentRoomIndex} | Pool: ${stats.poolSize}/${stats.maxPoolSize} | ` +
      `GPU: ${(stats.estimatedGpuMemory / 1024 / 1024).toFixed(1)}MB/${(stats.gpuBudget / 1024 / 1024).toFixed(0)}MB | ` +
      `Disposed: ${stats.disposedCount}`
    )
  }, [currentRoomIndex, poolManager])

  // Handle transition trigger from navigation
  const handleTransition = useCallback((doorway: DoorwayPlacement) => {
    // Get current room config
    const fromRoom = roomConfig
    if (!fromRoom) return

    // Check if already transitioning
    const transitionSystem = getTransitionSystem()
    if (!transitionSystem || transitionSystem.isTransitioning()) return

    // Store the entry wall for repositioning (enter from opposite wall of the exit doorway)
    const entryWall = getOppositeWall(doorway.wall)
    pendingEntryRef.current = { wall: entryWall, position: doorway.position }

    // Start transition to the room the doorway leads to
    transition.startTransition(doorway, fromRoom, doorway.leadsTo)
  }, [roomConfig, transition])

  // Memoize background color args
  const backgroundColorArgs = useMemo(() => [COLORS.background] as const, [])

  return (
    <>
      {/* Scene background color */}
      <color attach="background" args={backgroundColorArgs} />

      {/* Static fog for now - disable Growl-reactive fog */}
      {/* Reduced fog density for larger rooms */}
      <fogExp2 attach="fog" args={[COLORS.fogColor, 0.015]} />

      {/* Minimal fallback lighting - dynamic lights handled by RoomAtmosphere */}
      <ambientLight intensity={0.5} />

      {/* FPS Monitor for adaptive quality */}
      <FpsMonitor />

      {/* Growl System Controller - manages time-based dread effects */}
      {/* Camera effects disabled - handled by NavigationController */}
      <GrowlController
        enableCameraShake={false}
        enableFOVDistortion={false}
        baseFOV={75}
        debug={false}
      />

      {/* Procedurally generated room */}
      <Room roomIndex={currentRoomIndex} />

      {/* Collision debug visualization */}
      <CollisionDebug enabled={showCollisionDebug} />

      {/* Transition effects */}
      {/*<TransitionEffect enabled={true} />*/}
      {/*<CameraTransitionEffect enabled={true} baseFOV={75} />*/}

      {/* First-person navigation controller with transition support */}
      <NavigationController roomConfig={roomConfig} onTransition={handleTransition} />

      {/* Post-processing effects pipeline - conditional based on performance tier */}
      <PostProcessingEffects settings={perfSettings} />
    </>
  )
}

function App() {
  // Audio permission state
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false)

  // Debug panels
  const [showDebug, setShowDebug] = useState(false)
  const [showCollisionDebug, setShowCollisionDebug] = useState(false)

  // Mobile touch controls (detect touch device)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Mobile entry state (for enabling touch controls after tapping to enter)
  const [mobileEntered, setMobileEntered] = useState(false)

  // Performance settings
  const perfSettings = usePerformanceSettings()
  const perfTier = usePerformanceStore((state) => state.tier)

  // Initialize time store once on mount
  useEffect(() => {
    useTimeStore.getState().initialize()
  }, [])

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Log detected performance tier
  useEffect(() => {
    console.log(`[Performance] Detected tier: ${perfTier}, DPR: ${perfSettings.pixelRatio.toFixed(2)}`)
  }, [perfTier, perfSettings.pixelRatio])

  // Handle mobile enter
  const handleMobileEnter = useCallback(() => {
    setMobileEntered(true)
  }, [])

  // Handle audio permission granted
  const handleAudioPermissionGranted = useCallback(() => {
    setAudioPermissionGranted(true)
  }, [])

  // Handle first movement to hide navigation hints
  const handleFirstMovement = useCallback(() => {
    // Navigation hints will be handled by Controls component
  }, [])

  // Handle collision debug toggle from debug overlay
  const handleCollisionDebugToggle = useCallback((enabled: boolean) => {
    setShowCollisionDebug(enabled)
  }, [])

  return (
    <>
      <Canvas
        camera={{
          position: [0, 2, 5],
          fov: 75,
          near: 0.1,
          far: 2000,
        }}
        dpr={perfSettings.pixelRatio}
        gl={{
          antialias: perfSettings.antialias,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          powerPreference: 'high-performance',
        }}
        performance={{ min: 0.5 }}
      >
        <Scene showCollisionDebug={showCollisionDebug} />
      </Canvas>

      {/* Audio permission modal */}
      <AudioPermission
        onGranted={handleAudioPermissionGranted}
        onError={(error) => console.error('Audio permission error:', error)}
      />

      {/* Controls overlay (only shown after permission granted) */}
      {audioPermissionGranted && (
        <Controls
          onFirstMovement={handleFirstMovement}
          enableTouchControls={isTouchDevice && mobileEntered}
        />
      )}

      {/* Pointer lock overlay with instructions */}
      <PointerLockOverlay isTouchDevice={isTouchDevice} onEnter={handleMobileEnter} />

      {/* Debug Overlay - unified debug panel system */}
      <DebugOverlay
        enabled={showDebug}
        onCollisionDebugToggle={handleCollisionDebugToggle}
      />

      {/* Toggle debug panel with 'G' key */}
      <DebugToggle onToggle={() => setShowDebug(prev => !prev)} />
    </>
  )
}

/**
 * Keyboard handler for toggling debug panel.
 * Press 'G' to show/hide the Growl debug panel.
 */
function DebugToggle({ onToggle }: { onToggle: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        onToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])

  return null
}

export default App
