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
  private resumeOnInteractionBound: (() => void) | null = null;
  private trackEndedListener: (() => void) | null = null;
  private trackEndedTarget: MediaStreamTrack | null = null;

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

      // Listen for stream end (store reference for cleanup)
      this.removeTrackEndedListener();
      this.trackEndedListener = () => this.handleStreamEnded();
      this.trackEndedTarget = audioTracks[0];
      audioTracks[0].addEventListener('ended', this.trackEndedListener);

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

      // Listen for stream end (store reference for cleanup)
      this.removeTrackEndedListener();
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        this.trackEndedListener = () => this.handleStreamEnded();
        this.trackEndedTarget = audioTrack;
        audioTrack.addEventListener('ended', this.trackEndedListener);
      }

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

    // Monitor AudioContext state changes
    this.audioContext.addEventListener('statechange', () => {
      if (this.audioContext?.state === 'suspended') {
        console.warn('[AudioCapture] AudioContext is suspended — audio analysis will receive silence. Waiting for user interaction to resume.');
        this.addResumeOnInteraction();
      } else if (this.audioContext?.state === 'running') {
        this.removeResumeOnInteraction();
      }
    });

    // Resume context if suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      console.warn('[AudioCapture] AudioContext created in suspended state (autoplay restriction). Attempting resume...');
      try {
        await this.audioContext.resume();
      } catch {
        console.warn('[AudioCapture] Initial resume failed. Will retry on next user interaction.');
        this.addResumeOnInteraction();
      }
    }

    // Log sample rate for diagnostics — frequency band calculations depend on this
    console.log(`[AudioCapture] AudioContext sample rate: ${this.audioContext.sampleRate}Hz`);

    // Create media stream source
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
  }

  /**
   * Register a one-shot listener on user interaction events to resume a suspended AudioContext
   */
  private addResumeOnInteraction(): void {
    if (this.resumeOnInteractionBound) return; // already registered

    this.resumeOnInteractionBound = () => {
      this.resumeContext().then(() => {
        if (this.audioContext?.state === 'running') {
          console.log('[AudioCapture] AudioContext resumed after user interaction.');
          this.removeResumeOnInteraction();
        }
      });
    };

    const events = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;
    for (const evt of events) {
      document.addEventListener(evt, this.resumeOnInteractionBound, { once: false, passive: true });
    }
  }

  /**
   * Remove the user-interaction resume listeners
   */
  private removeResumeOnInteraction(): void {
    if (!this.resumeOnInteractionBound) return;

    const events = ['click', 'keydown', 'touchstart', 'pointerdown'] as const;
    for (const evt of events) {
      document.removeEventListener(evt, this.resumeOnInteractionBound);
    }
    this.resumeOnInteractionBound = null;
  }

  /**
   * Remove the audio track 'ended' event listener
   */
  private removeTrackEndedListener(): void {
    if (this.trackEndedListener && this.trackEndedTarget) {
      this.trackEndedTarget.removeEventListener('ended', this.trackEndedListener);
    }
    this.trackEndedListener = null;
    this.trackEndedTarget = null;
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
    // Remove user-interaction resume listeners
    this.removeResumeOnInteraction();

    // Remove track ended listener before stopping tracks
    this.removeTrackEndedListener();

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
