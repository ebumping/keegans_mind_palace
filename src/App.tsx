import { useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Room } from './components/Room'
import { GrowlController, GrowlDebugPanel } from './components/GrowlController'
import { GlitchDebugPanel } from './components/GlitchController'
import { GlitchEffect } from './components/GlitchEffect'
import { useTimeStore } from './store/timeStore'
import { useNavigationInit, useNavigation } from './hooks/useNavigation'
import { RoomGenerator } from './generators/RoomGenerator'
import type { RoomConfig } from './types/room'

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

  return <fogExp2 attach="fog" args={[COLORS.fogColor, density]} />
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

  return (
    <ChromaticAberration
      blendFunction={BlendFunction.NORMAL}
      offset={new THREE.Vector2(offset, offset)}
      radialModulation={false}
      modulationOffset={0.5}
    />
  )
}

/**
 * First-Person Navigation Controller
 * Manages player movement and camera in first-person mode.
 */
function NavigationController({ roomConfig }: { roomConfig: RoomConfig | null }) {
  // Initialize navigation system
  useNavigationInit()

  // Use navigation with room collision
  useNavigation({
    roomConfig,
    enabled: true,
    enableAudioSway: true,
    baseFOV: 75,
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
  // Generate room config for collision detection
  const generator = useMemo(() => new RoomGenerator({ baseSeed: 42 }), [])
  const roomConfig = useMemo(() => generator.generateConfig(0, null), [generator])
  return (
    <>
      {/* Scene background color */}
      <color attach="background" args={[COLORS.background]} />

      {/* Growl-reactive fog for liminal depth effect */}
      <GrowlReactiveFog />

      {/* Minimal fallback lighting - dynamic lights handled by RoomAtmosphere */}
      <ambientLight intensity={0.1} />

      {/* Growl System Controller - manages time-based dread effects */}
      {/* Camera effects disabled - handled by NavigationController */}
      <GrowlController
        enableCameraShake={false}
        enableFOVDistortion={false}
        baseFOV={75}
        debug={false}
      />

      {/* Procedurally generated room */}
      <Room roomIndex={0} />

      {/* First-person navigation controller */}
      <NavigationController roomConfig={roomConfig} />

      {/* Post-processing effects pipeline */}
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
    </>
  )
}

function App() {
  // Temporarily disable debug panels to avoid pre-existing Zustand selector issues
  const [showDebug, setShowDebug] = useState(false)

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
  useMemo(() => {
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
