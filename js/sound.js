/**
 * Parking Management System - Sound & Haptic FX Engine (sound.js)
 * Native Web Audio API synthesis for realistic feedback:
 * gate motor, scan beeps, payment chime, and selection ticks.
 * Zero external sound files needed.
 */

const SoundFX = {
    audioCtx: null,
    enabled: true,

    init() {
        const stored = localStorage.getItem('prms_sound_enabled');
        if (stored !== null) {
            this.enabled = stored === 'true';
        }
        this.updateToggleUI();
    },

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('prms_sound_enabled', this.enabled.toString());
        this.updateToggleUI();
        if (this.enabled) {
            this.playChime();
        }
    },

    updateToggleUI() {
        const toggleBtn = document.getElementById('btn-sound-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.enabled 
                ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Sound: ON'
                : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> Sound: OFF';
            toggleBtn.classList.toggle('active', this.enabled);
        }
    },

    playTick() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch (e) {
            // Audio policy fallback
        }
    },

    playSelect() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    },

    playChime() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.07);
                gain.gain.setValueAtTime(0.15, now + index * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + index * 0.07);
                osc.stop(now + index * 0.07 + 0.26);
            });
        } catch (e) {}
    },

    playGateOpen() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            
            // Dual warning chime tone
            [660, 880].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.12);
                gain.gain.setValueAtTime(0.18, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.23);
            });

            // Motor mechanical hum
            const motorOsc = ctx.createOscillator();
            const motorGain = ctx.createGain();
            motorOsc.type = 'sawtooth';
            motorOsc.frequency.setValueAtTime(95, now);
            motorOsc.frequency.linearRampToValueAtTime(140, now + 0.6);
            motorGain.gain.setValueAtTime(0.04, now);
            motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            motorOsc.connect(motorGain);
            motorGain.connect(ctx.destination);
            motorOsc.start(now);
            motorOsc.stop(now + 0.7);
        } catch (e) {}
    },

    playScanBeep() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) {}
    }
};

// Initialize
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        SoundFX.init();
    });
}
