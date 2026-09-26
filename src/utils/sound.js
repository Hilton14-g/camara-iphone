// Apple iPhone Audio Synthesizer via Web Audio API
// Generates realistic iPhone shutter click, Live Photo chime, and timer beeps without external assets.

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays the iconic Apple iPhone camera mechanical shutter sound
 */
export function playShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First click: shutter curtain opening
    createClick(ctx, now, 2200, 0.035, 0.45);
    createMechanicalThud(ctx, now, 120, 0.04, 0.35);

    // Second click: shutter curtain closing (~50ms later)
    createClick(ctx, now + 0.055, 1850, 0.03, 0.55);
    createMechanicalThud(ctx, now + 0.055, 95, 0.05, 0.4);
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

/**
 * Plays the subtle Apple Live Photo audio notification
 */
export function playLivePhotoSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Gentle dual-tone chime (F#5 -> A#5)
    playTone(ctx, 740, now, 0.08, 0.15, 'sine');
    playTone(ctx, 932, now + 0.06, 0.12, 0.18, 'sine');
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

/**
 * Plays timer countdown beep
 * @param {boolean} isFinal - true on the 0-second shutter trigger
 */
export function playTimerBeep(isFinal = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freq = isFinal ? 1560 : 1040;
    const duration = isFinal ? 0.2 : 0.08;
    playTone(ctx, freq, now, duration, 0.25, 'triangle');
  } catch (err) {
    console.warn('Audio playback failed:', err);
  }
}

function createClick(ctx, startTime, freq, duration, gainValue) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.2, startTime + duration);

  filter.type = 'highpass';
  filter.frequency.setValueAtTime(800, startTime);

  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

function createMechanicalThud(ctx, startTime, freq, duration, gainValue) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  osc.frequency.exponentialRampToValueAtTime(30, startTime + duration);

  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playTone(ctx, freq, startTime, duration, gainValue, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}
