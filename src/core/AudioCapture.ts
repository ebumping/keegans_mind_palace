/**
 * AudioCapture - Desktop audio stream capture with microphone fallback
 *
 * Primary: getDisplayMedia({ audio: true }) for desktop audio
 * Fallback: getUserMedia({ audio: true }) for microphone input
 */

export type AudioSource = 'desktop' | 'microphone' | 'demo' | null;

export interface AudioCaptureEvents {
  onStreamStart?: (source: AudioSource) => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private audioSource: AudioSource = null;
  private events: AudioCaptureEvents;
  private autoResumeCleanup: (() => void) | null = null;

  constructor(events: AudioCaptureEvents = {}) {
    this.events = events;
  }

  /**
   * Get the current audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the source node for connecting to analysers
   */
  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.sourceNode;
  }

  /**
   * Get the current audio source type
   */
  getAudioSource(): AudioSource {
    return this.audioSource;
  }

  /**
   * Check if audio is currently being captured
   */
  isCapturing(): boolean {
    return this.mediaStream !== null && this.audioSource !== null;
  }

  /**
   * Start audio capture - tries desktop audio first, falls back to microphone
   */
  async startCapture(): Promise<AudioSource> {
    // Try desktop audio first
    try {
      await this.startDesktopCapture();
      return this.audioSource;
    } catch (desktopError) {
      console.log('Desktop audio unavailable, trying microphone fallback:', desktopError);

      // Try microphone fallback
      try {
        await this.startMicrophoneCapture();
        return this.audioSource;
      } catch (micError) {
        console.log('Microphone unavailable:', micError);
        this.events.onError?.(micError instanceof Error ? micError : new Error(String(micError)));
        throw micError;
      }
    }
  }

  /**
   * Start desktop audio capture using getDisplayMedia
   */
  async startDesktopCapture(): Promise<void> {
    // Stop any existing capture
    this.stopCapture();

    try {
      // Request desktop audio stream
      // video: true is required by spec, but we only use audio
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required by spec
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      // Check if we got audio
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available from screen share');
      }

      // Stop video track immediately - we only need audio
      this.mediaStream.getVideoTracks().forEach(track => track.stop());

      // Set up audio context and source
      await this.setupAudioContext();

      this.audioSource = 'desktop';

      // Listen for stream end
      audioTracks[0].addEventListener('ended', () => this.handleStreamEnded());

      this.events.onStreamStart?.('desktop');
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Start microphone capture using getUserMedia
   */
  async startMicrophoneCapture(): Promise<void> {
    // Stop any existing capture
    this.stopCapture();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      await this.setupAudioContext();

      this.audioSource = 'microphone';

      // Listen for stream end
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      audioTrack?.addEventListener('ended', () => this.handleStreamEnded());

      this.events.onStreamStart?.('microphone');
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Set up the Web Audio API context and source node
   */
  private async setupAudioContext(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('No media stream available');
    }

    // Create audio context - don't specify sampleRate to let it match the stream's sample rate
    // This avoids "different sample-rate" errors when connecting MediaStreamSource
    this.audioContext = new AudioContext({
      latencyHint: 'interactive'
    });

    // Resume context if suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Install a one-time user-interaction listener to resume the context
    // if the browser suspends it due to autoplay restrictions
    this.installAutoResumeListener();

    // Create media stream source
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
  }

  /**
   * Install a one-time click/keypress listener that resumes a suspended AudioContext.
   * Browsers may suspend contexts created outside a direct user gesture; this ensures
   * the first real interaction unlocks playback.
   */
  private installAutoResumeListener(): void {
    const ctx = this.audioContext;
    if (!ctx) return;

    const resume = () => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Remove listeners once resumed
      window.removeEventListener('click', resume);
      window.removeEventListener('keydown', resume);
      window.removeEventListener('pointerdown', resume);
    };

    window.addEventListener('click', resume, { once: false });
    window.addEventListener('keydown', resume, { once: false });
    window.addEventListener('pointerdown', resume, { once: false });

    // Also store a cleanup reference so we can remove on dispose
    this.autoResumeCleanup = () => {
      window.removeEventListener('click', resume);
      window.removeEventListener('keydown', resume);
      window.removeEventListener('pointerdown', resume);
    };
  }

  /**
   * Handle stream ended event (user stopped sharing or closed app)
   */
  private handleStreamEnded(): void {
    this.cleanup();
    this.events.onStreamEnd?.();
  }

  /**
   * Stop audio capture and clean up resources
   */
  stopCapture(): void {
    this.cleanup();
    this.events.onStreamEnd?.();
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    // Remove auto-resume listeners
    if (this.autoResumeCleanup) {
      this.autoResumeCleanup();
      this.autoResumeCleanup = null;
    }

    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioSource = null;
  }

  /**
   * Resume audio context if suspended
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.cleanup();
  }
}
