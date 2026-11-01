/**
 * Procedural Web Audio API sound synthesizer for vehicle engines, tire squeal,
 * collision impacts, nitro boost, and horn.
 * Zero external audio files required.
 */

export class VehicleAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;

  // Master Gain
  private masterGain: GainNode | null = null;

  // Engine nodes
  private oscSub: OscillatorNode | null = null;
  private oscMain: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Tire squeal nodes
  private squealSource: AudioBufferSourceNode | null = null;
  private squealFilter: BiquadFilterNode | null = null;
  private squealGain: GainNode | null = null;

  // Nitro hiss nodes
  private nitroSource: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  // Horn nodes
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  // Noise buffers cache
  private noiseBuffer: AudioBuffer | null = null;

  private prevThrottle: number = 0;
  private prevRpm: number = 800;

  constructor() {
    // AudioContext will be initialized on first user gesture to comply with browser autoplay policies
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.setupEngineSynth();
      this.setupTireSquealSynth();
      this.setupNitroSynth();
      this.setupHornSynth();
      this.isUnlocked = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public unlock() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of white noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Sub rumble
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(32, this.ctx.currentTime);

    // Main engine tone (sawtooth for aggressive inline-6 / V8 growl)
    this.oscMain = this.ctx.createOscillator();
    this.oscMain.type = 'sawtooth';
    this.oscMain.frequency.setValueAtTime(65, this.ctx.currentTime);

    // Secondary cylinder harmonics
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'triangle';
    this.oscHarmonic.frequency.setValueAtTime(130, this.ctx.currentTime);

    this.oscSub.connect(this.engineFilter);
    this.oscMain.connect(this.engineFilter);
    this.oscHarmonic.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.oscSub.start();
    this.oscMain.start();
    this.oscHarmonic.start();
  }

  private setupTireSquealSynth() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.squealFilter = this.ctx.createBiquadFilter();
    this.squealFilter.type = 'bandpass';
    this.squealFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.squealFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.squealSource = this.ctx.createBufferSource();
    this.squealSource.buffer = this.noiseBuffer;
    this.squealSource.loop = true;

    this.squealSource.connect(this.squealFilter);
    this.squealFilter.connect(this.squealGain);
    this.squealGain.connect(this.masterGain);

    this.squealSource.start();
  }

  private setupNitroSynth() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const nitroFilter = this.ctx.createBiquadFilter();
    nitroFilter.type = 'highpass';
    nitroFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = this.noiseBuffer;
    this.nitroSource.loop = true;

    this.nitroSource.connect(nitroFilter);
    nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.masterGain);

    this.nitroSource.start();
  }

  private setupHornSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.setValueAtTime(440, this.ctx.currentTime); // A4

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.setValueAtTime(554.37, this.ctx.currentTime); // C#5

    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.setValueAtTime(1600, this.ctx.currentTime);

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.masterGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  public update(rpm: number, speedKmH: number, throttle: number, driftFactor: number, isBoosting: boolean, isHorn: boolean) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const absSpeed = Math.abs(speedKmH);

    // Map RPM (800 - 8000) to engine frequencies
    const normRpm = (rpm - 800) / 7200;
    const baseFreq = 38 + normRpm * 135;

    if (this.oscSub && this.oscMain && this.oscHarmonic && this.engineFilter && this.engineGain) {
      this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
      this.oscMain.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.oscHarmonic.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.04);

      // Low pass filter opens up when throttle is applied
      const filterFreq = 300 + throttle * 1200 + normRpm * 800;
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

      const targetGain = 0.16 + throttle * 0.14 + (absSpeed > 5 ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.04);
    }

    // Turbo blow-off whoosh when releasing throttle at high RPM
    if (this.prevThrottle > 0.8 && throttle < 0.2 && this.prevRpm > 4500) {
      this.playTurboBlowoff();
    }
    this.prevThrottle = throttle;
    this.prevRpm = rpm;

    // Tire squeal volume based on drift factor & speed
    if (this.squealGain && this.squealFilter) {
      const squealIntensity = (driftFactor > 0.35 && absSpeed > 15) ? Math.min(0.28, (driftFactor - 0.3) * 0.45) : 0;
      this.squealGain.gain.setTargetAtTime(squealIntensity, now, 0.05);
      const squealPitch = 900 + Math.min(600, absSpeed * 5);
      this.squealFilter.frequency.setTargetAtTime(squealPitch, now, 0.08);
    }

    // Nitro hiss
    if (this.nitroGain) {
      const nitroVolume = isBoosting ? 0.22 : 0;
      this.nitroGain.gain.setTargetAtTime(nitroVolume, now, 0.05);
    }

    // Horn
    if (this.hornGain) {
      const hornVolume = isHorn ? 0.25 : 0;
      this.hornGain.gain.setTargetAtTime(hornVolume, now, 0.03);
    }
  }

  public playCollisionImpact(intensity: number) {
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);

      const vol = Math.min(0.45, Math.max(0.1, intensity * 0.4));
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Audio context might be busy
    }
  }

  private playTurboBlowoff() {
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.35);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      src.start(now);
      src.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioSystem = new VehicleAudioSystem();
