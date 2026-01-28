import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Room } from './components/Room'
import { GrowlController, GrowlDebugPanel } from './components/GrowlController'
import { useGrowlEffects } from './store/timeStore'

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
  const growlEffects = useGrowlEffects()
  const baseDensity = 0.05
  const density = baseDensity + growlEffects.fogDensityBonus

  return <fogExp2 attach="fog" args={[COLORS.fogColor, density]} />
}

/**
 * Growl-Reactive Chromatic Aberration
 * Increases distortion based on Growl intensity.
 */
function GrowlReactiveChromaticAberration() {
  const growlEffects = useGrowlEffects()
  const baseOffset = 0.002
  const offset = baseOffset + growlEffects.colorDistortion * 0.01

  return (
    <ChromaticAberration
      blendFunction={BlendFunction.NORMAL}
      offset={new THREE.Vector2(offset, offset)}
      radialModulation={false}
      modulationOffset={0.5}
    />
  )
}

function Scene() {
  return (
    <>
      {/* Scene background color */}
      <color attach="background" args={[COLORS.background]} />

      {/* Growl-reactive fog for liminal depth effect */}
      <GrowlReactiveFog />

      {/* Minimal fallback lighting - dynamic lights handled by RoomAtmosphere */}
      <ambientLight intensity={0.1} />

      {/* Growl System Controller - manages time-based dread effects */}
      <GrowlController
        enableCameraShake={true}
        enableFOVDistortion={true}
        baseFOV={75}
        debug={false}
      />

      {/* Procedurally generated room */}
      <Room roomIndex={0} />

      {/* OrbitControls for initial development */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={50}
      />

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
  // Show debug panel in development mode
  const [showDebug, setShowDebug] = useState(import.meta.env.DEV)

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

      {/* Growl Debug Panel (outside Canvas, HTML overlay) */}
      {showDebug && <GrowlDebugPanel />}

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
