import { useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Room } from './components/Room'
import { GrowlController, GrowlDebugPanel } from './components/GrowlController'
import { GlitchDebugPanel } from './components/GlitchController'
import { GlitchEffect } from './components/GlitchEffect'
import { TransitionEffect, CameraTransitionEffect } from './components/TransitionEffect'
import { AudioPermission } from './components/UI/AudioPermission'
import { Controls } from './components/UI/Controls'
import { useTimeStore } from './store/timeStore'
import { useNavigationInit, useNavigation } from './hooks/useNavigation'
import { useTransition } from './hooks/useTransition'
import { RoomGenerator } from './generators/RoomGenerator'
import type { RoomConfig } from './types/room'
import { getTransitionSystem } from './systems/TransitionSystem'

// Pale-strata color palette
const COLORS = {
  background: '#1a1834',
  fogColor: '#211f3c',
  primary: '#c792f5',
  secondary: '#8eecf5',
}

/**
 * Growl-Reactive Fog Component
 * Adjusts fog density based on Growl intensity for atmospheric dread.
 */
function GrowlReactiveFog() {
  // Use primitive selector to avoid object reference issues
  const fogDensityBonus = useTimeStore((state) => state.growlEffects.fogDensityBonus)
  const baseDensity = 0.05
  const density = baseDensity + fogDensityBonus

  // Memoize args array to prevent infinite re-renders
  const fogArgs = useMemo(() => [COLORS.fogColor, density] as const, [density])

  return <fogExp2 attach="fog" args={fogArgs} />
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
 * First-Person Navigation Controller with Transition Support
 * Manages player movement, camera, and room transitions in first-person mode.
 */
function NavigationController({ roomConfig, onTransition }: { roomConfig: RoomConfig | null; onTransition: (toRoomIndex: number) => void }) {
  // Initialize navigation system
  useNavigationInit()

  // Use navigation with room collision and transition handling
  useNavigation({
    roomConfig,
    enabled: true,
    enableAudioSway: true,
    baseFOV: 75,
    onTransition: (trigger) => {
      // Trigger room transition when entering doorway
      onTransition(trigger.doorway.leadsTo)
    },
  })

  return null
}

/**
 * Pointer Lock Overlay
 * Shows instructions when pointer is not locked.
 */
function PointerLockOverlay() {
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement !== null)
    }
    document.addEventListener('pointerlockchange', handleLockChange)
    return () => document.removeEventListener('pointerlockchange', handleLockChange)
  }, [])

  const lock = useCallback(() => {
    const canvas = document.querySelector('canvas')
    canvas?.requestPointerLock()
  }, [])

  if (isLocked) return null

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
      }}
      onClick={lock}
    >
      <div style={{
        color: '#c792f5',
        fontSize: '24px',
        fontFamily: 'monospace',
        marginBottom: '16px',
      }}>
        Click to Enter
      </div>
      <div style={{
        color: '#8eecf5',
        fontSize: '14px',
        fontFamily: 'monospace',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.6',
      }}>
        WASD / Arrow Keys - Move<br />
        Mouse - Look Around<br />
        Shift - Sprint<br />
        ESC - Release Cursor
      </div>
    </div>
  )
}

function Scene() {
  // Current room state
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null)

  // Initialize transition system
  const transition = useTransition({
    onTransitionComplete: (toRoom) => {
      // Room change happens at transition midpoint
      setCurrentRoomIndex(toRoom.index)
    },
  })

  // Generate room config for collision detection
  const generator = useMemo(() => new RoomGenerator({ baseSeed: 42 }), [])

  // Update room config when room index changes
  useEffect(() => {
    const config = generator.generateConfig(currentRoomIndex, null)
    setRoomConfig(config)
  }, [currentRoomIndex, generator])

  // Handle transition trigger from navigation
  const handleTransition = useCallback((toRoomIndex: number) => {
    // Get current room config
    const fromRoom = roomConfig
    if (!fromRoom) return

    // Find the doorway being used (from NavigationSystem trigger)
    const transitionSystem = getTransitionSystem()
    if (!transitionSystem) return

    // Get doorway from navigation trigger
    // Note: The actual doorway info comes from NavigationSystem's trigger
    // For now, we'll start the transition with the doorways in current room
    if (fromRoom.doorways.length > 0) {
      const doorway = fromRoom.doorways[0] // Use first doorway for simplicity
      transition.startTransition(doorway, fromRoom, toRoomIndex)
    }
  }, [roomConfig, transition])

  // Memoize background color args
  const backgroundColorArgs = useMemo(() => [COLORS.background] as const, [])

  // Enable post-processing for visual polish
  const enablePostProcessing = true

  return (
    <>
      {/* Scene background color */}
      <color attach="background" args={backgroundColorArgs} />

      {/* Static fog for now - disable Growl-reactive fog */}
      <fogExp2 attach="fog" args={[COLORS.fogColor, 0.05]} />

      {/* Minimal fallback lighting - dynamic lights handled by RoomAtmosphere */}
      <ambientLight intensity={0.5} />

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

      {/* Transition effects */}
      {/*<TransitionEffect enabled={true} />*/}
      {/*<CameraTransitionEffect enabled={true} baseFOV={75} />*/}

      {/* First-person navigation controller with transition support */}
      <NavigationController roomConfig={roomConfig} onTransition={handleTransition} />

      {/* Post-processing effects pipeline - temporarily disabled */}
      {enablePostProcessing && (
        <EffectComposer>
          {/* Bloom for glowing elements */}
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />

          {/* Growl-reactive chromatic aberration for color fringing */}
          <GrowlReactiveChromaticAberration />

          {/* Glitch effects - audio and Growl-triggered distortions */}
          <GlitchEffect />

          {/* Vignette for liminal atmosphere */}
          <Vignette
            offset={0.3}
            darkness={0.7}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      )}
    </>
  )
}

function App() {
  // Audio permission state
  const [audioPermissionGranted, setAudioPermissionGranted] = useState(false)

  // Debug panels
  const [showDebug, setShowDebug] = useState(false)

  // Mobile touch controls (detect touch device)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Initialize time store once on mount
  useEffect(() => {
    useTimeStore.getState().initialize()
  }, [])

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Handle audio permission granted
  const handleAudioPermissionGranted = useCallback(() => {
    setAudioPermissionGranted(true)
  }, [])

  // Handle first movement to hide navigation hints
  const handleFirstMovement = useCallback(() => {
    // Navigation hints will be handled by Controls component
  }, [])

  return (
    <>
      <Canvas
        camera={{
          position: [0, 2, 5],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <Scene />
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
          enableTouchControls={isTouchDevice}
        />
      )}

      {/* Pointer lock overlay with instructions */}
      <PointerLockOverlay />

      {/* Debug Panels (outside Canvas, HTML overlay) */}
      {showDebug && (
        <>
          <GrowlDebugPanel />
          <GlitchDebugPanel />
        </>
      )}

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
