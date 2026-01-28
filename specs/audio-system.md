# Audio System Specification

## Overview

The audio system captures desktop audio and performs real-time frequency analysis to drive visual reactivity throughout Keegan's Mind Palace. It derives patterns and analysis techniques from pale-strata's AudioAnalyser.

---

## Audio Capture API

### Primary Method: Desktop Audio Capture

```typescript
// Request desktop audio stream
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,  // Required by spec, but can use minimal constraints
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 44100
  }
});

// Extract audio track
const audioTrack = stream.getAudioTracks()[0];

// Stop video track immediately (we only need audio)
stream.getVideoTracks().forEach(track => track.stop());
```

**Browser Support:**
- Chrome/Edge: Full support
- Firefox: Partial (requires `media.getdisplaymedia.enabled` flag)
- Safari: Not supported

### Fallback Method: Microphone Input

When desktop audio is unavailable or denied:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
});
```

**Limitations:**
- Captures ambient room audio, not direct system audio
- User must play audio through speakers (not headphones)
- Lower quality reactivity due to room acoustics

### Fallback Priority

1. `getDisplayMedia({ audio: true })` - Desktop audio (preferred)
2. `getUserMedia({ audio: true })` - Microphone fallback
3. Demo mode - Procedural audio simulation (no real input)

---

## Web Audio API Configuration

### AudioContext Setup

```typescript
const audioContext = new AudioContext({
  sampleRate: 44100,
  latencyHint: 'interactive'
});

// Resume context on user gesture (required by autoplay policy)
await audioContext.resume();
```

### AnalyserNode Configuration

```typescript
const analyser = audioContext.createAnalyser();

// FFT Configuration
analyser.fftSize = 2048;           // Results in 1024 frequency bins
analyser.smoothingTimeConstant = 0.8;  // Smooth transitions (0-1)
analyser.minDecibels = -90;        // Minimum signal threshold
analyser.maxDecibels = -10;        // Maximum signal threshold
```

**Configuration Rationale:**
- `fftSize: 2048` provides ~46.9ms time resolution at 44.1kHz
- 1024 frequency bins gives ~21.5Hz resolution per bin
- `smoothingTimeConstant: 0.8` prevents jarring visual changes

### Signal Chain

```
MediaStream → MediaStreamSourceNode → AnalyserNode → (Destination optional)
```

```typescript
const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);
// No need to connect to destination if only analyzing
```

---

## AudioAnalyser Class (ported from pale-strata)

### Interface

```typescript
interface AudioLevels {
  bass: number;      // 0-1 normalized
  mid: number;       // 0-1 normalized
  high: number;      // 0-1 normalized
  overall: number;   // 0-1 normalized
  transient: boolean; // Impact detection flag
  transientIntensity: number; // 0-1 intensity of current transient
}

interface AudioAnalyserConfig {
  fftSize?: number;
  smoothing?: number;
  transientThreshold?: number;
  transientDecay?: number;
}

class AudioAnalyser {
  constructor(audioContext: AudioContext, source: AudioNode, config?: AudioAnalyserConfig);

  getFrequencyData(): Uint8Array;
  getTimeDomainData(): Uint8Array;
  getLevels(): AudioLevels;

  dispose(): void;
}
```

### Frequency Band Extraction

Frequency bins are divided into three bands:

| Band | Frequency Range | Bin Range (at 44.1kHz) | Visual Mapping |
|------|-----------------|------------------------|----------------|
| Bass | 20 - 250 Hz | 0 - 11 | Room breathing, deep pulses |
| Mid | 250 - 4,000 Hz | 12 - 185 | Pattern distortion, light flicker |
| High | 4,000 - 20,000 Hz | 186 - 929 | Particle activity, sharp details |

```typescript
private extractBands(frequencyData: Uint8Array): { bass: number; mid: number; high: number } {
  const binCount = frequencyData.length;
  const nyquist = this.audioContext.sampleRate / 2;

  const bassEnd = Math.floor(250 / nyquist * binCount);
  const midEnd = Math.floor(4000 / nyquist * binCount);

  const bassSum = this.averageRange(frequencyData, 0, bassEnd);
  const midSum = this.averageRange(frequencyData, bassEnd, midEnd);
  const highSum = this.averageRange(frequencyData, midEnd, binCount);

  return {
    bass: bassSum / 255,
    mid: midSum / 255,
    high: highSum / 255
  };
}
```

### Transient Detection

Detects sudden changes in amplitude for impact-driven effects:

```typescript
private previousEnergy: number = 0;
private transientDecay: number = 0;

detectTransient(frequencyData: Uint8Array): { isTransient: boolean; intensity: number } {
  const currentEnergy = this.calculateEnergy(frequencyData);
  const delta = currentEnergy - this.previousEnergy;

  // Decay transient state over time
  this.transientDecay = Math.max(0, this.transientDecay - 0.05);

  if (delta > this.transientThreshold) {
    this.transientDecay = Math.min(1, delta / 100);
  }

  this.previousEnergy = currentEnergy * 0.9 + this.previousEnergy * 0.1; // Smooth

  return {
    isTransient: this.transientDecay > 0.1,
    intensity: this.transientDecay
  };
}
```

**Configuration:**
- `transientThreshold: 30` - Minimum energy delta to trigger
- `transientDecay: 0.05` - Rate of transient state decay per frame

---

## React Integration

### useAudioAnalysis Hook

```typescript
interface UseAudioAnalysisReturn {
  levels: AudioLevels;
  isCapturing: boolean;
  error: Error | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  audioSource: 'desktop' | 'microphone' | 'demo' | null;
}

function useAudioAnalysis(): UseAudioAnalysisReturn;
```

### Zustand Store for Audio State

```typescript
interface AudioStore {
  // Raw levels (updated every frame)
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;

  // Smoothed levels (for shader uniforms)
  bassSmooth: number;
  midSmooth: number;
  highSmooth: number;

  // History for pattern generation
  bassHistory: number[];  // Last 64 frames
  midHistory: number[];
  highHistory: number[];

  // Actions
  updateLevels: (levels: AudioLevels) => void;
}
```

### Frame Update Pattern

```typescript
useFrame(() => {
  if (!analyser) return;

  const levels = analyser.getLevels();

  // Update Zustand store
  useAudioStore.getState().updateLevels(levels);

  // Get smoothed values for shaders
  const { bassSmooth, midSmooth, highSmooth } = useAudioStore.getState();

  // Update shader uniforms
  material.uniforms.u_bass.value = bassSmooth;
  material.uniforms.u_mid.value = midSmooth;
  material.uniforms.u_high.value = highSmooth;
  material.uniforms.u_transient.value = levels.transientIntensity;
});
```

---

## Performance Considerations

### Web Worker Analysis (Optional Optimization)

For complex analysis, offload to Web Worker:

```typescript
// Main thread
const worker = new Worker('./audioWorker.ts');
const sharedBuffer = new SharedArrayBuffer(1024 * 4);
const sharedArray = new Float32Array(sharedBuffer);

// Worker thread
self.onmessage = (e) => {
  const frequencyData = e.data;
  // Perform analysis
  // Write results to SharedArrayBuffer
};
```

### Memory Budget

- Frequency data buffer: 1024 bytes (Uint8Array)
- Time domain buffer: 2048 bytes (Uint8Array)
- History arrays: ~1.5KB (3 arrays × 64 floats × 8 bytes)
- Total per frame: ~5KB maximum

### Target Performance

- Analysis update rate: 60Hz (synced with requestAnimationFrame)
- Maximum CPU usage for audio: <5% of single core
- Latency budget: <16ms total including rendering

---

## Error Handling

### Permission Denied

```typescript
try {
  await startCapture();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // User denied permission - show friendly message
    // Fall back to demo mode
  } else if (error.name === 'NotFoundError') {
    // No audio device found
    // Fall back to demo mode
  }
}
```

### Context Suspension

```typescript
// Handle browser autoplay policy
document.addEventListener('click', async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}, { once: true });
```

### Stream Ended

```typescript
audioTrack.addEventListener('ended', () => {
  // User stopped sharing or closed source application
  // Attempt reconnect or fall back to demo mode
});
```

---

## Demo Mode

When no audio input is available, generate procedural "fake" audio data:

```typescript
class DemoAudioGenerator {
  private time: number = 0;

  getLevels(): AudioLevels {
    this.time += 0.016; // ~60fps

    return {
      bass: (Math.sin(this.time * 0.5) + 1) / 2 * 0.6 + 0.2,
      mid: (Math.sin(this.time * 1.2) + 1) / 2 * 0.5 + 0.1,
      high: (Math.sin(this.time * 3.0) + 1) / 2 * 0.3,
      overall: 0.4,
      transient: Math.random() < 0.02,
      transientIntensity: Math.random() * 0.5
    };
  }
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/core/AudioCapture.ts` | Stream capture and permission handling |
| `src/core/AudioAnalyser.ts` | Frequency analysis and band extraction |
| `src/store/audioStore.ts` | Zustand store for audio state |
| `src/hooks/useAudioAnalysis.ts` | React hook for components |
