import { EqualizerSettings, Track } from '../types/music';
import { offlineCacheService } from './indexedDbCache';
import { getOrGenerateDemoTrackUrl } from './proceduralMusic';

export type PlaybackState = 'playing' | 'paused' | 'loading' | 'stopped';

export interface AudioDiagnostics {
  audioContextState: AudioContextState | 'uninitialized';
  currentTrackTitle?: string;
  streamUrl?: string;
  isCORSCompliant: boolean;
  pipelineMode: 'WebAudio_Gapless' | 'HTML5_DirectFallback' | 'Procedural_Synthesizer';
  lastError: string | null;
  autoplayBlocked: boolean;
  isOfflineMode: boolean;
}

export class SeshAudioEngine {
  private audioCtx: AudioContext | null = null;
  private primaryAudio: HTMLAudioElement;
  private secondaryAudio: HTMLAudioElement;
  private isUsingSecondary = false;

  private primarySourceNode: MediaElementAudioSourceNode | null = null;
  private secondarySourceNode: MediaElementAudioSourceNode | null = null;

  private primaryGainNode: GainNode | null = null;
  private secondaryGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private bassBoostNode: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private eqFilters: { [freq: number]: BiquadFilterNode } = {};
  private readonly FREQUENCIES = [60, 230, 910, 3600, 14000];

  private currentTrack: Track | null = null;
  private nextTrack: Track | null = null;
  private playbackState: PlaybackState = 'stopped';
  private currentTime = 0;
  private duration = 0;
  private volume = 0.8;
  private isMuted = false;

  private eqSettings: EqualizerSettings = {
    enabled: true,
    preset: 'Flat',
    bands: { 60: 0, 230: 0, 910: 0, 3600: 0, 14000: 0 },
    bassBoost: false,
    crossfadeDuration: 2,
    gaplessEnabled: true,
  };

  private isOfflineMode = false;

  private diagnostics: AudioDiagnostics = {
    audioContextState: 'uninitialized',
    isCORSCompliant: true,
    pipelineMode: 'WebAudio_Gapless',
    lastError: null,
    autoplayBlocked: false,
    isOfflineMode: false,
  };

  private onStateChangeCallbacks: Array<(state: PlaybackState) => void> = [];
  private onTimeUpdateCallbacks: Array<(current: number, duration: number) => void> = [];
  private onTrackEndCallbacks: Array<() => void> = [];
  private onTrackChangeCallbacks: Array<(track: Track | null) => void> = [];
  private onDiagnosticCallbacks: Array<(diag: AudioDiagnostics) => void> = [];
  private onOfflineBlockedCallbacks: Array<(track: Track, reason: string) => void> = [];

  private isPreloadedNext = false;
  private nextTrackToPlayGetter: (() => Track | null) | null = null;

  constructor() {
    this.primaryAudio = new Audio();
    this.secondaryAudio = new Audio();

    // Default preload
    this.primaryAudio.preload = 'auto';
    this.secondaryAudio.preload = 'auto';

    this.setupAudioListeners(this.primaryAudio, false);
    this.setupAudioListeners(this.secondaryAudio, true);

    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('sesh_audio_eq_settings');
      if (saved) {
        this.eqSettings = { ...this.eqSettings, ...JSON.parse(saved) };
      }
      const savedVol = localStorage.getItem('sesh_audio_volume');
      if (savedVol) {
        this.volume = parseFloat(savedVol);
      }
    } catch {
      // ignore
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('sesh_audio_eq_settings', JSON.stringify(this.eqSettings));
      localStorage.setItem('sesh_audio_volume', this.volume.toString());
    } catch {
      // ignore
    }
  }

  public async resumeContext(): Promise<boolean> {
    try {
      this.initAudioContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
        this.diagnostics.audioContextState = this.audioCtx.state;
        this.diagnostics.autoplayBlocked = false;
        this.notifyDiagnostics();
      }
      return true;
    } catch (err) {
      console.warn('Could not resume AudioContext:', err);
      return false;
    }
  }

  private initAudioContext() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      this.diagnostics.pipelineMode = 'HTML5_DirectFallback';
      this.notifyDiagnostics();
      return;
    }

    try {
      this.audioCtx = new AudioContextClass();
      this.diagnostics.audioContextState = this.audioCtx.state;

      // Master Gain
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = this.isMuted ? 0 : this.volume;

      // Analyser Node for visualizer
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;

      // Bass Boost Node
      this.bassBoostNode = this.audioCtx.createBiquadFilter();
      this.bassBoostNode.type = 'lowshelf';
      this.bassBoostNode.frequency.value = 100;
      this.bassBoostNode.gain.value = this.eqSettings.bassBoost ? 6 : 0;

      // 5 EQ Band Filters
      let prevNode: AudioNode = this.bassBoostNode;

      this.FREQUENCIES.forEach((freq, idx) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === this.FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.eqSettings.enabled ? (this.eqSettings.bands[freq] || 0) : 0;

        prevNode.connect(filter);
        prevNode = filter;
        this.eqFilters[freq] = filter;
      });

      // Connect last EQ filter to Analyser, then to Master Gain, then to Destination
      prevNode.connect(this.analyserNode);
      this.analyserNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioCtx.destination);

      // Deck gains
      this.primaryGainNode = this.audioCtx.createGain();
      this.secondaryGainNode = this.audioCtx.createGain();

      this.primaryGainNode.gain.value = 1;
      this.secondaryGainNode.gain.value = 0;

      this.primaryGainNode.connect(this.bassBoostNode);
      this.secondaryGainNode.connect(this.bassBoostNode);

      // Connect primary audio element safely
      try {
        this.primarySourceNode = this.audioCtx.createMediaElementSource(this.primaryAudio);
        this.primarySourceNode.connect(this.primaryGainNode);

        this.secondarySourceNode = this.audioCtx.createMediaElementSource(this.secondaryAudio);
        this.secondarySourceNode.connect(this.secondaryGainNode);
      } catch (nodeErr) {
        console.warn('MediaElementAudioSourceNode creation skipped (direct playback):', nodeErr);
      }
    } catch (err) {
      console.warn('Web Audio API initialized in fallback mode:', err);
      this.diagnostics.pipelineMode = 'HTML5_DirectFallback';
    }
    this.notifyDiagnostics();
  }

  private getActiveAudio(): HTMLAudioElement {
    return this.isUsingSecondary ? this.secondaryAudio : this.primaryAudio;
  }

  private getInactiveAudio(): HTMLAudioElement {
    return this.isUsingSecondary ? this.primaryAudio : this.secondaryAudio;
  }

  private setupAudioListeners(audio: HTMLAudioElement, isSecondary: boolean) {
    audio.addEventListener('play', () => {
      if ((isSecondary && this.isUsingSecondary) || (!isSecondary && !this.isUsingSecondary)) {
        this.playbackState = 'playing';
        this.diagnostics.lastError = null;
        this.diagnostics.autoplayBlocked = false;
        this.notifyState();
        this.notifyDiagnostics();
      }
    });

    audio.addEventListener('pause', () => {
      if ((isSecondary && this.isUsingSecondary) || (!isSecondary && !this.isUsingSecondary)) {
        this.playbackState = 'paused';
        this.notifyState();
      }
    });

    audio.addEventListener('timeupdate', () => {
      if ((isSecondary && this.isUsingSecondary) || (!isSecondary && !this.isUsingSecondary)) {
        this.currentTime = audio.currentTime;
        this.duration = audio.duration || this.currentTrack?.duration || 0;
        this.notifyTime();
        this.checkGaplessLookahead(audio);
      }
    });

    audio.addEventListener('ended', () => {
      if ((isSecondary && this.isUsingSecondary) || (!isSecondary && !this.isUsingSecondary)) {
        this.handleTrackEnded();
      }
    });

    audio.addEventListener('error', async () => {
      const err = audio.error;
      const errorMsg = err
        ? `Audio element error code: ${err.code} (${err.message || 'Media source error'})`
        : 'Unknown media load error';
      console.warn('Media playback error detected:', errorMsg);

      this.diagnostics.lastError = errorMsg;
      this.notifyDiagnostics();

      if (!this.currentTrack) return;

      // If it's a remote Subsonic stream:
      if (this.currentTrack.streamUrl.startsWith('http://') || this.currentTrack.streamUrl.startsWith('https://')) {
        // Step 1: If crossOrigin was set and caused a CORS failure, retry once without crossOrigin (direct HTML5 playback)
        if (audio.hasAttribute('crossorigin')) {
          console.log('Retrying remote Subsonic stream without crossOrigin (direct HTML5 playback)...');
          this.diagnostics.pipelineMode = 'HTML5_DirectFallback';
          this.notifyDiagnostics();
          audio.removeAttribute('crossorigin');
          audio.src = this.currentTrack.streamUrl;
          audio.load();
          audio.play().catch((retryErr) => {
            console.warn('Direct HTML5 play attempt error:', retryErr);
            this.playbackState = 'paused';
            this.notifyState();
          });
          return;
        }

        // If it failed even without crossOrigin (e.g. 401 or offline)
        this.diagnostics.lastError = `Subsonic stream failed to load: ${errorMsg}. Please check server connectivity.`;
        this.playbackState = 'paused';
        this.notifyState();
        this.notifyDiagnostics();
        return;
      }

      // If it's a built-in demo track with local:// stream, synthesize in-browser
      if (this.currentTrack.streamUrl.startsWith('local://')) {
        this.diagnostics.pipelineMode = 'Procedural_Synthesizer';
        this.notifyDiagnostics();
        const genre = (this.currentTrack.genre as any) || 'Synthwave';
        const proceduralUrl = await getOrGenerateDemoTrackUrl(this.currentTrack.id, genre);
        audio.removeAttribute('crossorigin');
        audio.src = proceduralUrl;
        audio.load();
        audio.play().catch(() => {});
      }
    });
  }

  private checkGaplessLookahead(activeAudio: HTMLAudioElement) {
    if (!this.eqSettings.gaplessEnabled) return;
    const remaining = activeAudio.duration - activeAudio.currentTime;
    const preloadThreshold = Math.max(5, this.eqSettings.crossfadeDuration + 3);

    if (remaining <= preloadThreshold && !this.isPreloadedNext && this.nextTrackToPlayGetter) {
      const next = this.nextTrackToPlayGetter();
      if (next && next.id !== this.currentTrack?.id) {
        this.preloadNextTrack(next);
      }
    }

    if (this.eqSettings.crossfadeDuration > 0 && remaining <= this.eqSettings.crossfadeDuration && this.isPreloadedNext) {
      this.executeCrossfade();
    }
  }

  async preloadNextTrack(track: Track) {
    this.nextTrack = track;
    this.isPreloadedNext = true;

    const cachedUrl = await offlineCacheService.getCachedAudioBlobUrl(track.id);
    let streamUrl = cachedUrl;

    if (!streamUrl) {
      if (this.isOfflineMode && track.streamUrl && (track.streamUrl.startsWith('http://') || track.streamUrl.startsWith('https://'))) {
        return; // Don't preload live remote streams when offline
      }
      if (track.streamUrl && (track.streamUrl.startsWith('http://') || track.streamUrl.startsWith('https://'))) {
        streamUrl = track.streamUrl;
      } else {
        const genre = (track.genre as any) || 'Synthwave';
        streamUrl = await getOrGenerateDemoTrackUrl(track.id, genre);
      }
    }

    const inactiveAudio = this.getInactiveAudio();
    inactiveAudio.src = streamUrl;
    inactiveAudio.currentTime = 0;
    inactiveAudio.load();
  }

  private executeCrossfade() {
    if (!this.isPreloadedNext || !this.nextTrack) return;
    this.isPreloadedNext = false;

    const outgoingAudio = this.getActiveAudio();
    const incomingAudio = this.getInactiveAudio();
    const crossfadeTime = this.eqSettings.crossfadeDuration || 1;

    this.isUsingSecondary = !this.isUsingSecondary;
    this.currentTrack = this.nextTrack;
    this.notifyTrackChange();

    if (this.audioCtx && this.primaryGainNode && this.secondaryGainNode) {
      const now = this.audioCtx.currentTime;
      const outGain = this.isUsingSecondary ? this.primaryGainNode : this.secondaryGainNode;
      const inGain = this.isUsingSecondary ? this.secondaryGainNode : this.primaryGainNode;

      outGain.gain.setValueAtTime(1, now);
      outGain.gain.linearRampToValueAtTime(0, now + crossfadeTime);

      inGain.gain.setValueAtTime(0, now);
      inGain.gain.linearRampToValueAtTime(1, now + crossfadeTime);
    }

    incomingAudio.play().catch(() => {});
    setTimeout(() => {
      outgoingAudio.pause();
      outgoingAudio.currentTime = 0;
    }, crossfadeTime * 1000);
  }

  private handleTrackEnded() {
    if (this.isPreloadedNext && this.nextTrack) {
      this.isPreloadedNext = false;
      this.isUsingSecondary = !this.isUsingSecondary;
      this.currentTrack = this.nextTrack;
      this.notifyTrackChange();

      const incoming = this.getActiveAudio();
      incoming.play().catch(() => {});
      return;
    }

    this.onTrackEndCallbacks.forEach((cb) => cb());
  }

  setNextTrackGetter(getter: () => Track | null) {
    this.nextTrackToPlayGetter = getter;
  }

  setOfflineMode(offline: boolean) {
    this.isOfflineMode = offline;
    this.diagnostics.isOfflineMode = offline;

    // If switching to Offline Mode while playing or holding an uncached remote stream, stop it!
    if (offline && this.currentTrack) {
      offlineCacheService.isTrackCached(this.currentTrack.id).then((isCached) => {
        if (!isCached && this.currentTrack?.streamUrl && (this.currentTrack.streamUrl.startsWith('http://') || this.currentTrack.streamUrl.startsWith('https://'))) {
          console.warn(`[Offline Mode] Stopping live remote stream for uncached track: ${this.currentTrack.title}`);
          const blockedTrack = this.currentTrack;
          this.pause();
          const audio = this.getActiveAudio();
          audio.removeAttribute('src');
          audio.load();
          this.playbackState = 'paused';
          this.diagnostics.lastError = `Offline Mode: Stopped remote streaming for "${blockedTrack.title}". Only cached tracks play in Offline Mode.`;
          this.notifyState();
          this.notifyDiagnostics();
          this.notifyOfflineBlocked(blockedTrack, `Playback paused because "${blockedTrack.title}" is not downloaded for offline mode.`);
        }
      });
    }

    this.notifyDiagnostics();
  }

  getOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  async playTrack(track: Track) {
    await this.resumeContext();

    this.currentTrack = track;
    this.isPreloadedNext = false;
    this.diagnostics.currentTrackTitle = track.title;
    this.notifyTrackChange();

    // 1. Check if track is cached in IndexedDB
    let audioUrl = await offlineCacheService.getCachedAudioBlobUrl(track.id);

    // 2. Strict Offline Mode check: block remote server streaming if uncached!
    if (this.isOfflineMode && !audioUrl) {
      if (track.streamUrl && (track.streamUrl.startsWith('http://') || track.streamUrl.startsWith('https://'))) {
        console.warn(`[Offline Mode] Blocked live stream request for uncached track: ${track.title}`);
        this.diagnostics.lastError = `Offline Mode is active: "${track.title}" is not cached yet. Download it for offline playback or turn off Offline Mode.`;
        this.playbackState = 'paused';
        const active = this.getActiveAudio();
        active.removeAttribute('src');
        active.load();
        this.notifyState();
        this.notifyDiagnostics();
        this.notifyOfflineBlocked(track, `"${track.title}" is not cached. Download it for offline playback or turn off Offline Mode.`);
        return;
      }
    }

    // 3. If not cached, check if track has a remote Subsonic or HTTP stream URL
    if (!audioUrl) {
      if (track.streamUrl && (track.streamUrl.startsWith('http://') || track.streamUrl.startsWith('https://'))) {
        // Real Subsonic or HTTP streaming URL
        audioUrl = track.streamUrl;
      } else {
        // Built-in demo track with local:// procedural stream
        const genre = (track.genre as any) || 'Synthwave';
        audioUrl = await getOrGenerateDemoTrackUrl(track.id, genre);
      }
    }

    this.diagnostics.streamUrl = audioUrl;
    this.diagnostics.pipelineMode = audioUrl.startsWith('blob:')
      ? 'Procedural_Synthesizer'
      : 'WebAudio_Gapless';
    this.notifyDiagnostics();

    const audio = this.getActiveAudio();

    // Avoid strict crossOrigin if URL is local procedural blob
    if (audioUrl.startsWith('blob:') || audioUrl.startsWith('data:')) {
      audio.removeAttribute('crossorigin');
    } else {
      audio.crossOrigin = 'anonymous';
    }

    audio.src = audioUrl;
    audio.currentTime = 0;

    // Reset gain levels
    if (this.audioCtx && this.primaryGainNode && this.secondaryGainNode) {
      if (this.isUsingSecondary) {
        this.secondaryGainNode.gain.setValueAtTime(1, this.audioCtx.currentTime);
        this.primaryGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      } else {
        this.primaryGainNode.gain.setValueAtTime(1, this.audioCtx.currentTime);
        this.secondaryGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      }
    }

    this.playbackState = 'loading';
    this.notifyState();

    try {
      await audio.play();
      this.playbackState = 'playing';
      this.diagnostics.lastError = null;
      this.diagnostics.autoplayBlocked = false;
      this.notifyState();
      this.notifyDiagnostics();
      this.updateMediaSession(track);
    } catch (err: any) {
      console.warn('Playback play() call was prevented:', err);

      if (err.name === 'NotAllowedError') {
        this.diagnostics.autoplayBlocked = true;
        this.diagnostics.lastError = 'Browser autoplay blocked. Tap anywhere on the page to enable audio.';
      } else {
        this.diagnostics.lastError = err.message || 'Media playback failed';
      }

      this.playbackState = 'paused';
      this.notifyState();
      this.notifyDiagnostics();
    }
  }

  // Diagnostic Test Tone to verify Edge/Chrome speaker pipeline
  playDiagnosticTestTone() {
    this.initAudioContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const g = this.audioCtx.createGain();

    osc.type = 'sine';
    // Pleasant musical chord: 440 Hz (A4)
    osc.frequency.setValueAtTime(440, now);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(g);
    g.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  async togglePlayPause() {
    await this.resumeContext();
    const audio = this.getActiveAudio();
    if (this.playbackState === 'playing') {
      audio.pause();
    } else if (this.currentTrack) {
      if (this.isOfflineMode) {
        const isCached = await offlineCacheService.isTrackCached(this.currentTrack.id);
        if (!isCached && this.currentTrack.streamUrl && (this.currentTrack.streamUrl.startsWith('http://') || this.currentTrack.streamUrl.startsWith('https://'))) {
          this.diagnostics.lastError = `Offline Mode: "${this.currentTrack.title}" is not cached. Please download it or toggle Offline Mode off.`;
          this.playbackState = 'paused';
          audio.removeAttribute('src');
          audio.load();
          this.notifyState();
          this.notifyDiagnostics();
          this.notifyOfflineBlocked(this.currentTrack, `Cannot play "${this.currentTrack.title}" in Offline Mode because it is not downloaded.`);
          return;
        }
      }
      audio.play().catch((err) => {
        console.warn('Play toggle error:', err);
      });
    }
  }

  pause() {
    this.getActiveAudio().pause();
  }

  seek(seconds: number) {
    const audio = this.getActiveAudio();
    if (!isNaN(seconds) && isFinite(seconds)) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || this.duration));
      this.currentTime = audio.currentTime;
      this.notifyTime();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    this.primaryAudio.volume = this.isMuted ? 0 : this.volume;
    this.secondaryAudio.volume = this.isMuted ? 0 : this.volume;
    this.saveSettings();
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  getEqualizerSettings(): EqualizerSettings {
    return { ...this.eqSettings };
  }

  getDiagnostics(): AudioDiagnostics {
    return {
      ...this.diagnostics,
      audioContextState: this.audioCtx ? this.audioCtx.state : 'uninitialized',
    };
  }

  setEqualizerBand(frequency: number, gainDb: number) {
    this.eqSettings.bands[frequency] = gainDb;
    const filter = this.eqFilters[frequency];
    if (filter && this.audioCtx) {
      filter.gain.setValueAtTime(this.eqSettings.enabled ? gainDb : 0, this.audioCtx.currentTime);
    }
    this.saveSettings();
  }

  setEqualizerPreset(presetName: string, bands: { [f: number]: number }) {
    this.eqSettings.preset = presetName;
    this.eqSettings.bands = { ...bands };
    this.FREQUENCIES.forEach((freq) => {
      const gain = bands[freq] || 0;
      const filter = this.eqFilters[freq];
      if (filter && this.audioCtx) {
        filter.gain.setValueAtTime(this.eqSettings.enabled ? gain : 0, this.audioCtx.currentTime);
      }
    });
    this.saveSettings();
  }

  toggleEqualizer(enabled: boolean) {
    this.eqSettings.enabled = enabled;
    this.FREQUENCIES.forEach((freq) => {
      const filter = this.eqFilters[freq];
      if (filter && this.audioCtx) {
        filter.gain.setValueAtTime(enabled ? (this.eqSettings.bands[freq] || 0) : 0, this.audioCtx.currentTime);
      }
    });
    this.saveSettings();
  }

  toggleBassBoost(enabled: boolean) {
    this.eqSettings.bassBoost = enabled;
    if (this.bassBoostNode && this.audioCtx) {
      this.bassBoostNode.gain.setValueAtTime(enabled ? 7 : 0, this.audioCtx.currentTime);
    }
    this.saveSettings();
  }

  setCrossfadeDuration(seconds: number) {
    this.eqSettings.crossfadeDuration = Math.max(0, Math.min(12, seconds));
    this.saveSettings();
  }

  toggleGapless(enabled: boolean) {
    this.eqSettings.gaplessEnabled = enabled;
    this.saveSettings();
  }

  getAudioFrequencies(): Uint8Array | null {
    if (!this.analyserNode) return null;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  private updateMediaSession(track: Track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: track.coverArt, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  onStateChange(cb: (state: PlaybackState) => void) {
    this.onStateChangeCallbacks.push(cb);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter((c) => c !== cb);
    };
  }

  onTimeUpdate(cb: (cur: number, dur: number) => void) {
    this.onTimeUpdateCallbacks.push(cb);
    return () => {
      this.onTimeUpdateCallbacks = this.onTimeUpdateCallbacks.filter((c) => c !== cb);
    };
  }

  onTrackEnd(cb: () => void) {
    this.onTrackEndCallbacks.push(cb);
    return () => {
      this.onTrackEndCallbacks = this.onTrackEndCallbacks.filter((c) => c !== cb);
    };
  }

  onTrackChange(cb: (t: Track | null) => void) {
    this.onTrackChangeCallbacks.push(cb);
    return () => {
      this.onTrackChangeCallbacks = this.onTrackChangeCallbacks.filter((c) => c !== cb);
    };
  }

  onDiagnosticUpdate(cb: (diag: AudioDiagnostics) => void) {
    this.onDiagnosticCallbacks.push(cb);
    return () => {
      this.onDiagnosticCallbacks = this.onDiagnosticCallbacks.filter((c) => c !== cb);
    };
  }

  onOfflineBlocked(cb: (track: Track, reason: string) => void) {
    this.onOfflineBlockedCallbacks.push(cb);
    return () => {
      this.onOfflineBlockedCallbacks = this.onOfflineBlockedCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyState() {
    this.onStateChangeCallbacks.forEach((cb) => cb(this.playbackState));
  }

  private notifyTime() {
    this.onTimeUpdateCallbacks.forEach((cb) => cb(this.currentTime, this.duration));
  }

  private notifyTrackChange() {
    this.onTrackChangeCallbacks.forEach((cb) => cb(this.currentTrack));
  }

  private notifyDiagnostics() {
    this.onDiagnosticCallbacks.forEach((cb) => cb(this.getDiagnostics()));
  }

  private notifyOfflineBlocked(track: Track, reason: string) {
    this.onOfflineBlockedCallbacks.forEach((cb) => {
      try {
        cb(track, reason);
      } catch (e) {
        console.warn('Error in onOfflineBlocked callback:', e);
      }
    });
  }
}

export const audioEngine = new SeshAudioEngine();
