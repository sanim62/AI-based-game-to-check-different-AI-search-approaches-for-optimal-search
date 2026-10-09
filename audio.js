/**
 * AI Dungeon Duel — Ascension Edition
 * Web Audio API Sound Synthesizer & Sound Effects
 */

class SoundSystem {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
    this.volume = 0.2;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setMuted(state) {
    this.muted = !!state;
  }

  playTone(freq, type = 'sine', duration = 0.15, vol = 0.18, detune = 0, delay = 0) {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      setTimeout(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = type;
          osc.frequency.value = freq;
          osc.detune.value = detune;

          const now = ctx.currentTime;
          const masterVol = vol * (this.volume / 0.2);
          gain.gain.setValueAtTime(masterVol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

          osc.start(now);
          osc.stop(now + duration);
        } catch (err) {
          // Audio errors suppressed safely
        }
      }, delay * 1000);
    } catch (e) {}
  }

  sfxHit(crit = false) {
    if (crit) {
      this.playTone(180, 'sawtooth', 0.2, 0.26);
      this.playTone(90, 'square', 0.15, 0.2, 80);
      this.playTone(350, 'sawtooth', 0.1, 0.15, 0, 0.05);
    } else {
      this.playTone(130, 'sawtooth', 0.12, 0.2);
      this.playTone(75, 'square', 0.08, 0.12, 40);
    }
  }

  sfxHeal() {
    this.playTone(440, 'sine', 0.16, 0.14);
    this.playTone(660, 'sine', 0.22, 0.12, 0, 0.08);
    this.playTone(880, 'triangle', 0.25, 0.1, 0, 0.16);
  }

  sfxFire() {
    this.playTone(210, 'sawtooth', 0.2, 0.22, 280);
    this.playTone(140, 'square', 0.15, 0.16, 180);
  }

  sfxPoison() {
    this.playTone(190, 'triangle', 0.24, 0.12);
    this.playTone(230, 'triangle', 0.2, 0.1, 80, 0.06);
  }

  sfxStun() {
    this.playTone(320, 'square', 0.18, 0.18);
    this.playTone(220, 'sawtooth', 0.15, 0.16, 0, 0.05);
  }

  sfxShield() {
    this.playTone(460, 'sine', 0.14, 0.16);
    this.playTone(550, 'triangle', 0.18, 0.14, 0, 0.06);
  }

  sfxRage() {
    this.playTone(110, 'sawtooth', 0.25, 0.25);
    this.playTone(80, 'square', 0.2, 0.2, 0, 0.07);
  }

  sfxDrain() {
    this.playTone(260, 'triangle', 0.2, 0.16);
    this.playTone(400, 'sine', 0.25, 0.14, 0, 0.08);
  }

  sfxUlt() {
    [220, 330, 440, 660, 880].forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.22, 0.26, 0, idx * 0.06);
    });
  }

  sfxTrap() {
    this.playTone(95, 'sawtooth', 0.22, 0.28);
    this.playTone(55, 'square', 0.18, 0.22, 0, 0.04);
  }

  sfxItem(type = 'potion') {
    if (type === 'power' || type === 'chest') {
      this.playTone(600, 'sine', 0.1, 0.14);
      this.playTone(900, 'triangle', 0.15, 0.15, 0, 0.07);
    } else if (type === 'shrine') {
      [400, 600, 800].forEach((f, i) => this.playTone(f, 'sine', 0.2, 0.15, 0, i * 0.07));
    } else {
      this.playTone(840, 'sine', 0.1, 0.12);
      this.playTone(1100, 'sine', 0.14, 0.1, 0, 0.05);
    }
  }

  sfxVictory() {
    [523, 659, 784, 1047].forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.32, 0.2, 0, idx * 0.1);
    });
  }

  sfxClick() {
    this.playTone(800, 'sine', 0.04, 0.08);
  }
}

// Global audio singleton
const soundSystem = new SoundSystem();
