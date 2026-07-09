export interface SoundscapeEngine {
  setWeatherCode(code: number): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

const ENABLED_GAIN = 0.7;
const RAMP_SECONDS = 0.5;

// Procedural ambience, not audio samples — a shared white-noise buffer routed
// through different filters/gains per condition (rain hiss, snow hush, storm
// rumble), plus a constant, very quiet two-oscillator drone underneath so
// there's always some sense of atmosphere. Kept intentionally simple: no
// wind-speed-driven modulation, since the per-city weather endpoint doesn't
// return wind speed and adding it would mean touching the server again for
// a subtle effect.
export function createSoundscapeEngine(): SoundscapeEngine {
  const ctx = new AudioContext();

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.05;
  droneGain.connect(master);
  const droneOsc1 = ctx.createOscillator();
  droneOsc1.type = 'sine';
  droneOsc1.frequency.value = 110;
  const droneOsc2 = ctx.createOscillator();
  droneOsc2.type = 'sine';
  droneOsc2.frequency.value = 110 * 1.5; // perfect fifth above
  droneOsc1.connect(droneGain);
  droneOsc2.connect(droneGain);
  droneOsc1.start();
  droneOsc2.start();

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 600;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.025;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noiseSource.start();

  let thunderActive = false;
  let thunderTimer: ReturnType<typeof setTimeout> | null = null;

  function playThunderBurst() {
    const now = ctx.currentTime;
    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0, now);
    burstGain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    const burstFilter = ctx.createBiquadFilter();
    burstFilter.type = 'lowpass';
    burstFilter.frequency.value = 200;
    const burstSource = ctx.createBufferSource();
    burstSource.buffer = noiseBuffer;
    burstSource.connect(burstFilter);
    burstFilter.connect(burstGain);
    burstGain.connect(master);
    burstSource.start(now);
    burstSource.stop(now + 1.3);
  }

  function scheduleNextThunder() {
    if (!thunderActive) return;
    const delay = 4000 + Math.random() * 8000;
    thunderTimer = setTimeout(() => {
      playThunderBurst();
      scheduleNextThunder();
    }, delay);
  }

  function setThunderActive(active: boolean) {
    if (active === thunderActive) return;
    thunderActive = active;
    if (thunderTimer) {
      clearTimeout(thunderTimer);
      thunderTimer = null;
    }
    if (active) scheduleNextThunder();
  }

  function setWeatherCode(code: number) {
    const now = ctx.currentTime;
    const isThunder = code >= 95;
    const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
    const isFog = code === 45 || code === 48;

    if (isThunder) {
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setTargetAtTime(1200, now, 1);
      noiseGain.gain.setTargetAtTime(0.09, now, 1);
    } else if (isRain) {
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setTargetAtTime(2000, now, 1);
      noiseGain.gain.setTargetAtTime(0.06, now, 1);
    } else if (isSnow) {
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setTargetAtTime(3000, now, 1);
      noiseGain.gain.setTargetAtTime(0.015, now, 1);
    } else if (isFog) {
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setTargetAtTime(300, now, 1);
      noiseGain.gain.setTargetAtTime(0.02, now, 1);
    } else {
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setTargetAtTime(600, now, 1);
      noiseGain.gain.setTargetAtTime(0.025, now, 1);
    }

    setThunderActive(isThunder);
  }

  function setEnabled(enabled: boolean) {
    if (enabled && ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(enabled ? ENABLED_GAIN : 0, now, RAMP_SECONDS);
  }

  function dispose() {
    setThunderActive(false);
    droneOsc1.stop();
    droneOsc2.stop();
    noiseSource.stop();
    void ctx.close();
  }

  return { setWeatherCode, setEnabled, dispose };
}
