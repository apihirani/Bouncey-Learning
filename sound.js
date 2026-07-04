/* =========================================================
   Bouncy Learning — Sound System
   Additive module. Zero external libraries or audio files —
   every sound is synthesized on the fly with the Web Audio API,
   so it works instantly on GitHub Pages with no asset hosting.
   ========================================================= */

(function () {
  'use strict';

  const MUTE_KEY = 'bouncyMuted_v1';
  let ctx = null;
  let muted = localStorage.getItem(MUTE_KEY) === '1';

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, gainStart, delay) {
    const c = getCtx();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const startAt = c.currentTime + (delay || 0);
    gain.gain.setValueAtTime(gainStart || 0.12, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  const SOUNDS = {
    click: () => tone(520, 0.07, 'square', 0.08),
    hover: () => tone(720, 0.04, 'sine', 0.04),
    correct: () => { tone(660, 0.1, 'sine', 0.12); tone(880, 0.14, 'sine', 0.1, 0.09); },
    wrong: () => { tone(220, 0.18, 'sawtooth', 0.1); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, i * 0.11)); },
    coin: () => { tone(988, 0.06, 'square', 0.08); tone(1319, 0.09, 'square', 0.08, 0.06); },
    levelup: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.08)); },
    countdown: () => tone(440, 0.12, 'square', 0.1),
    go: () => { tone(880, 0.22, 'square', 0.14); tone(1175, 0.26, 'square', 0.12, 0.05); },
    popup: () => tone(600, 0.08, 'sine', 0.08)
  };

  function play(name) {
    const fn = SOUNDS[name];
    if (fn) fn();
  }

  function isMuted() { return muted; }
  function setMuted(val) {
    muted = val;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    document.querySelectorAll('[data-mute-toggle]').forEach(btn => {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(muted));
    });
  }
  function toggleMute() { setMuted(!muted); }

  window.BouncySound = { play, isMuted, toggleMute };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-mute-toggle]').forEach(btn => {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(muted));
      btn.addEventListener('click', toggleMute);
    });
    // Unlock audio context on first user gesture (autoplay policies)
    const unlock = () => { getCtx(); document.removeEventListener('click', unlock); };
    document.addEventListener('click', unlock, { once: true });
  });
})();
