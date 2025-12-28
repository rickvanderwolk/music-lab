/**
 * Audio Engine - Web Audio API synthesizers
 * Genereert drum sounds zonder samples
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
    }

    /**
     * Initialiseer de audio context (moet door user interaction)
     */
    init() {
        if (this.audioContext) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7; // Master volume
        this.masterGain.connect(this.audioContext.destination);
    }

    /**
     * Resume audio context (nodig voor autoplay policy)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Get current audio context time
     */
    getCurrentTime() {
        return this.audioContext ? this.audioContext.currentTime : 0;
    }

    /**
     * KICK DRUM - Improved with click and body
     * Lage frequentie oscillator met pitch envelope
     */
    playKick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Body oscillator
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);

        oscGain.gain.setValueAtTime(volume * 1.2, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Click/attack component
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        const clickFilter = ctx.createBiquadFilter();

        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(800, t);
        clickOsc.frequency.exponentialRampToValueAtTime(100, t + 0.01);

        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 400;

        clickGain.gain.setValueAtTime(volume * 0.4, t);
        clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);

        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
        clickOsc.start(t);
        clickOsc.stop(t + 0.02);
    }

    /**
     * SNARE DRUM
     * Combinatie van toon + noise
     */
    playSnare(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Tonal component (twee oscillators)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'triangle';
        osc1.frequency.value = 180;
        osc2.frequency.value = 330;

        oscGain.gain.setValueAtTime(0.7 * volume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Noise component
        const noise = this.createNoise(t, 0.2, 0.3 * volume);

        osc1.start(t);
        osc1.stop(t + 0.2);
        osc2.start(t);
        osc2.stop(t + 0.2);
    }

    /**
     * HI-HAT - Improved with metallic resonances
     * High frequency noise met korte envelope
     */
    playHiHat(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Main noise
        const noise = this.createNoise(t, 0.04, 0.25 * volume);

        // High-pass filter
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 8000;
        highpass.Q.value = 0.5;

        // Metallic resonance filters
        const resonance1 = ctx.createBiquadFilter();
        resonance1.type = 'bandpass';
        resonance1.frequency.value = 10000;
        resonance1.Q.value = 3;

        const resonance2 = ctx.createBiquadFilter();
        resonance2.type = 'bandpass';
        resonance2.frequency.value = 6500;
        resonance2.Q.value = 2;

        noise.gain.connect(highpass);
        highpass.connect(resonance1);
        resonance1.connect(resonance2);
        resonance2.connect(this.masterGain);
    }

    /**
     * CLAP - Improved with layered noise
     * Multiple korte noise bursts
     */
    playClap(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multi-layered clap for more realistic sound
        const delays = [0, 0.008, 0.016, 0.024];
        const volumes = [0.7, 0.5, 0.6, 0.4];

        delays.forEach((delay, i) => {
            const noise = this.createNoise(t + delay, 0.08, volumes[i] * volume);

            // Bandpass filter voor clap karakter
            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.value = 1200 + (i * 200);
            bandpass.Q.value = 2;

            // Highpass to remove mud
            const highpass = ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 800;

            noise.gain.connect(highpass);
            highpass.connect(bandpass);
            bandpass.connect(this.masterGain);
        });

        // Add tail
        const tail = this.createNoise(t + 0.03, 0.15, 0.15 * volume);
        const tailFilter = ctx.createBiquadFilter();
        tailFilter.type = 'bandpass';
        tailFilter.frequency.value = 2500;
        tailFilter.Q.value = 1.5;

        tail.gain.connect(tailFilter);
        tailFilter.connect(this.masterGain);
    }

    /**
     * Helper: Genereer noise
     */
    createNoise(time, duration, volume) {
        const ctx = this.audioContext;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(noiseGain);

        noise.start(time);

        return { source: noise, gain: noiseGain };
    }

    /**
     * TOM DRUM
     * Midrange drum sound
     */
    playTom(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        // Tom pitch envelope
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);

        oscGain.gain.setValueAtTime(volume * 0.8, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.3);
    }

    /**
     * OPEN HI-HAT
     * Longer sustain hi-hat
     */
    playOpenHiHat(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.3, 0.25 * volume);

        // High-pass filter voor metallic sound
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 7000;

        // Bandpass voor extra resonantie
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 10000;
        bandpass.Q.value = 1;

        noise.gain.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(this.masterGain);
    }

    /**
     * 808 BASS
     * Sub bass synth
     */
    playBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 65; // C2 note

        oscGain.gain.setValueAtTime(volume * 0.9, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    /**
     * PERCUSSION / SHAKER
     * Fast noise burst
     */
    playPerc(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.08, 0.15 * volume);

        // Bandpass voor shaker karakter
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 4000;
        bandpass.Q.value = 2;

        noise.gain.connect(bandpass);
        bandpass.connect(this.masterGain);
    }

    /**
     * 808 KICK - Improved with harmonic distortion
     * Deep sub bass kick
     */
    play808Kick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Main body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const distortion = ctx.createWaveShaper();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.08);

        // Subtle distortion for harmonics
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.tanh(x * 1.5);
        }
        distortion.curve = curve;

        oscGain.gain.setValueAtTime(volume * 1.4, t);
        oscGain.gain.exponentialRampToValueAtTime(volume * 0.7, t + 0.05);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

        osc.connect(distortion);
        distortion.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.8);
    }

    /**
     * HARD KICK (Techno)
     * Punchy, short kick
     */
    playHardKick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.03);

        oscGain.gain.setValueAtTime(volume * 1.1, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.3);
    }

    /**
     * PUNCHY SNARE (Hip Hop)
     */
    playPunchySnare(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'triangle';
        osc1.frequency.value = 200;
        osc2.frequency.value = 350;

        oscGain.gain.setValueAtTime(0.8 * volume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(this.masterGain);

        const noise = this.createNoise(t, 0.15, 0.4 * volume);
        noise.gain.connect(this.masterGain);

        osc1.start(t);
        osc1.stop(t + 0.15);
        osc2.start(t);
        osc2.stop(t + 0.15);
    }

    /**
     * RIMSHOT
     */
    playRimshot(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 400;

        oscGain.gain.setValueAtTime(0.5 * volume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    /**
     * REESE BASS (DnB) - Improved with phase modulation
     */
    playReeseBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multiple detuned saws for thick reese
        const detunes = [-7, -3, 0, 3, 7];
        const oscs = [];
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 55; // A1
            osc.detune.value = detune;
            osc.connect(filter);
            oscs.push(osc);
        });

        // Low-pass filter with slight movement
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(600, t + 0.1);
        filter.frequency.linearRampToValueAtTime(350, t + 0.3);
        filter.Q.value = 2;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 0.4);
        });
    }

    /**
     * ACID BASS (Techno)
     */
    playAcidBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 65;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        filter.Q.value = 10;

        oscGain.gain.setValueAtTime(volume * 0.7, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.3);
    }

    /**
     * SUB BASS - Improved with harmonic layer
     */
    playSubBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Sub layer (pure sine)
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();

        sub.type = 'sine';
        sub.frequency.value = 55; // A1

        subGain.gain.setValueAtTime(volume * 1.0, t);
        subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

        sub.connect(subGain);
        subGain.connect(this.masterGain);

        // Harmonic layer for presence
        const harmonic = ctx.createOscillator();
        const harmonicGain = ctx.createGain();
        const harmonicFilter = ctx.createBiquadFilter();

        harmonic.type = 'sawtooth';
        harmonic.frequency.value = 55;

        harmonicFilter.type = 'lowpass';
        harmonicFilter.frequency.value = 300;
        harmonicFilter.Q.value = 1;

        harmonicGain.gain.setValueAtTime(volume * 0.15, t);
        harmonicGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        harmonic.connect(harmonicFilter);
        harmonicFilter.connect(harmonicGain);
        harmonicGain.connect(this.masterGain);

        sub.start(t);
        sub.stop(t + 0.6);
        harmonic.start(t);
        harmonic.stop(t + 0.5);
    }

    /**
     * STAB SYNTH
     */
    playStab(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 523; // C5

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    /**
     * PLUCK SYNTH - Improved with harmonics
     */
    playPluck(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multi-oscillator pluck
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.value = 330; // E4
        osc2.frequency.value = 330;
        osc2.detune.value = 5;

        // Fast filter sweep for pluck
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3500, t);
        filter.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        filter.Q.value = 4;

        // Pluck envelope
        oscGain.gain.setValueAtTime(volume * 0.7, t);
        oscGain.gain.exponentialRampToValueAtTime(volume * 0.3, t + 0.03);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc1.start(t);
        osc1.stop(t + 0.2);
        osc2.start(t);
        osc2.stop(t + 0.2);
    }

    /**
     * COWBELL
     */
    playCowbell(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc1.frequency.value = 540;
        osc2.frequency.value = 800;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc1.start(t);
        osc1.stop(t + 0.15);
        osc2.start(t);
        osc2.stop(t + 0.15);
    }

    /**
     * CRASH CYMBAL
     */
    playCrash(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 1.5, 0.4 * volume);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 8000;

        noise.gain.connect(highpass);
        highpass.connect(this.masterGain);
    }

    /**
     * RIDE CYMBAL
     */
    playRide(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.8, 0.2 * volume);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 6000;
        bandpass.Q.value = 2;

        noise.gain.connect(bandpass);
        bandpass.connect(this.masterGain);
    }

    /**
     * 808 SNARE
     */
    play808Snare(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Tonal component
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'triangle';
        osc1.frequency.value = 185;
        osc2.frequency.value = 225;

        oscGain.gain.setValueAtTime(0.5 * volume, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Noise component
        const noise = this.createNoise(t, 0.1, 0.3 * volume);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 2000;

        noise.gain.connect(highpass);
        highpass.connect(this.masterGain);

        osc1.start(t);
        osc1.stop(t + 0.1);
        osc2.start(t);
        osc2.stop(t + 0.1);
    }

    /**
     * BONGO
     */
    playBongo(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.05);

        oscGain.gain.setValueAtTime(volume * 0.6, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    /**
     * CONGA
     */
    playConga(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

        oscGain.gain.setValueAtTime(volume * 0.7, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    /**
     * TIMBALE
     */
    playTimbale(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 350;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Add some noise for metallic sound
        const noise = this.createNoise(t, 0.12, 0.15 * volume);
        noise.gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    /**
     * FM BASS
     */
    playFMBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Carrier
        const carrier = ctx.createOscillator();
        const carrierGain = ctx.createGain();

        // Modulator
        const modulator = ctx.createOscillator();
        const modulatorGain = ctx.createGain();

        carrier.frequency.value = 55; // A1
        modulator.frequency.value = 110; // 2x carrier

        modulatorGain.gain.setValueAtTime(100, t);
        modulatorGain.gain.exponentialRampToValueAtTime(10, t + 0.3);

        carrierGain.gain.setValueAtTime(volume * 0.8, t);
        carrierGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        modulator.connect(modulatorGain);
        modulatorGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(this.masterGain);

        carrier.start(t);
        carrier.stop(t + 0.4);
        modulator.start(t);
        modulator.stop(t + 0.4);
    }

    /**
     * LEAD SYNTH
     */
    playLead(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 440; // A4

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(400, t + 0.15);
        filter.Q.value = 8;

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.25);
    }

    /**
     * PAD SYNTH
     */
    playPad(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multiple detuned oscillators for thick pad sound
        const oscs = [];
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        const detunes = [-7, 0, 7]; // Cents
        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 220; // A3
            osc.detune.value = detune;
            osc.connect(oscGain);
            oscs.push(osc);
        });

        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 1;

        oscGain.gain.setValueAtTime(volume * 0.15, t);
        oscGain.gain.linearRampToValueAtTime(volume * 0.25, t + 0.1);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

        oscGain.connect(filter);
        filter.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 0.8);
        });
    }

    /**
     * BELL SYNTH
     */
    playBell(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multiple harmonics for bell sound
        const freqs = [523, 1046, 1568]; // C5 and harmonics
        const oscs = [];
        const gains = [];

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const vol = volume * (1 / (i + 1)) * 0.3;
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

            osc.connect(gain);
            gain.connect(this.masterGain);

            oscs.push(osc);
            gains.push(gain);
        });

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 1.0);
        });
    }

    /**
     * ZAP/LASER
     */
    playZap(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    /**
     * BLIP
     */
    playBlip(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1000;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    /**
     * NOISE BURST
     */
    playNoiseBurst(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.06, 0.3 * volume);
        noise.gain.connect(this.masterGain);
    }

    /**
     * CHORD STAB
     */
    playChord(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Major chord (C - E - G)
        const freqs = [261.63, 329.63, 392.00];
        const oscs = [];

        freqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(volume * 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.3);
            oscs.push(osc);
        });
    }

    /**
     * VOCAL SYNTH (formant-like)
     */
    playVocal(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        // Formant filters
        const filter1 = ctx.createBiquadFilter();
        const filter2 = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 110;

        filter1.type = 'bandpass';
        filter1.frequency.value = 800;
        filter1.Q.value = 10;

        filter2.type = 'bandpass';
        filter2.frequency.value = 1200;
        filter2.Q.value = 10;

        oscGain.gain.setValueAtTime(volume * 0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(filter1);
        filter1.connect(filter2);
        filter2.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    /**
     * HOOVER BASS (Classic Rave/House)
     */
    playHooverBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multiple detuned saw waves for thick hoover sound
        const oscs = [];
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        const detunes = [-25, -12, 0, 12, 25];
        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 65; // C2
            osc.detune.value = detune;
            osc.connect(oscGain);
            oscs.push(osc);
        });

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.linearRampToValueAtTime(1200, t + 0.15);
        filter.frequency.linearRampToValueAtTime(400, t + 0.3);
        filter.Q.value = 8;

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        oscGain.connect(filter);
        filter.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 0.4);
        });
    }

    /**
     * SAW BASS (Modern House) - Improved with unison
     */
    playSawBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Unison saws for fatter sound
        const detunes = [-15, -7, 0, 7, 15];
        const oscs = [];
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 65; // C2
            osc.detune.value = detune;
            osc.connect(filter);
            oscs.push(osc);
        });

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(250, t + 0.15);
        filter.Q.value = 8;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 0.3);
        });
    }

    /**
     * PIANO STAB (Classic House Piano) - Improved with harmonics
     */
    playPianoStab(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Piano chord (Am7) with harmonics
        const notes = [
            { freq: 220, harmonics: [1, 2, 3, 4] },      // A3
            { freq: 261.63, harmonics: [1, 2, 3] },     // C4
            { freq: 329.63, harmonics: [1, 2, 2.5] },   // E4
            { freq: 392, harmonics: [1, 1.5, 2] }        // G4
        ];

        notes.forEach((note, noteIndex) => {
            note.harmonics.forEach((harmonic, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = i === 0 ? 'triangle' : 'sine';
                osc.frequency.value = note.freq * harmonic;

                const vol = volume * (1 / (noteIndex + 1)) * 0.25 * (1 / (i + 1));

                // Piano-like envelope: fast attack, slower decay
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(vol * 1.3, t + 0.005);
                gain.gain.linearRampToValueAtTime(vol, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.start(t);
                osc.stop(t + 0.8);
            });
        });

        // Add subtle high-frequency click for attack
        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        const clickFilter = ctx.createBiquadFilter();

        click.type = 'square';
        click.frequency.value = 3000;

        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 2000;

        clickGain.gain.setValueAtTime(volume * 0.15, t);
        clickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.01);

        click.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.masterGain);

        click.start(t);
        click.stop(t + 0.01);
    }

    /**
     * VOCAL CHOP (Sampled vocal effect) - Improved with formants
     */
    playVocalChop(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Source oscillator
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 220; // A3

        // Formant filters for vocal quality (simulating "ah" sound)
        const formant1 = ctx.createBiquadFilter();
        const formant2 = ctx.createBiquadFilter();
        const formant3 = ctx.createBiquadFilter();

        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(800, t);
        formant1.frequency.linearRampToValueAtTime(950, t + 0.08);
        formant1.Q.value = 8;

        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(1150, t);
        formant2.frequency.linearRampToValueAtTime(1300, t + 0.08);
        formant2.Q.value = 6;

        formant3.type = 'bandpass';
        formant3.frequency.value = 2800;
        formant3.Q.value = 4;

        // Fast envelope for chop effect
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(volume * 0.6, t + 0.005);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(formant1);
        formant1.connect(formant2);
        formant2.connect(formant3);
        formant3.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    /**
     * WHITE NOISE RISER (Build-up effect)
     */
    playRiser(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.5, 0.3 * volume);
        const filter = ctx.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(8000, t + 0.5);
        filter.Q.value = 2;

        noise.gain.gain.setValueAtTime(0.1 * volume, t);
        noise.gain.gain.linearRampToValueAtTime(0.4 * volume, t + 0.5);

        noise.gain.connect(filter);
        filter.connect(this.masterGain);
    }

    /**
     * SIDE STICK (Modern percussion)
     */
    playSideStick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.value = 600;

        filter.type = 'highpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1;

        oscGain.gain.setValueAtTime(volume * 0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Add click
        const noise = this.createNoise(t, 0.03, 0.2 * volume);
        noise.gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.04);
    }

    /**
     * SIDECHAIN KICK (Pumping house kick)
     */
    playSidechainKick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

        // Punchy envelope for sidechain effect
        oscGain.gain.setValueAtTime(volume * 1.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    /**
     * WOBBLE BASS (Dubstep/Bass Music)
     */
    playWobbleBass(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Multiple detuned saws
        const oscs = [];
        const detunes = [-10, 0, 10];
        const filter = ctx.createBiquadFilter();
        const filterGain = ctx.createGain();

        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 55; // A1
            osc.detune.value = detune;
            osc.connect(filter);
            oscs.push(osc);
        });

        // LFO for wobble
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        lfo.frequency.value = 6; // 6 Hz wobble
        lfoGain.gain.value = 800;

        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        filter.Q.value = 15; // High resonance for wobble

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        filterGain.gain.setValueAtTime(volume * 0.6, t);
        filterGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        filter.connect(filterGain);
        filterGain.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 0.5);
        });
        lfo.start(t);
        lfo.stop(t + 0.5);
    }

    /**
     * TRAP HI-HAT (Fast rolling hi-hats)
     */
    playTrapHat(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.03, 0.2 * volume);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 9000;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 11000;
        bandpass.Q.value = 2;

        noise.gain.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(this.masterGain);
    }

    /**
     * SNARE ROLL (Trap/DnB)
     */
    playSnareRoll(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Quick snare hit for rolls
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = 200;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        const noise = this.createNoise(t, 0.08, 0.3 * volume);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;

        noise.gain.connect(filter);
        filter.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    /**
     * TRANCE PLUCK (Uplifting Trance)
     */
    playTrancePluck(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.value = 523; // C5
        osc2.frequency.value = 523;
        osc2.detune.value = 8;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, t);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.12);
        filter.Q.value = 6;

        oscGain.gain.setValueAtTime(volume * 0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc1.start(t);
        osc1.stop(t + 0.15);
        osc2.start(t);
        osc2.stop(t + 0.15);
    }

    /**
     * AMBIENT PAD (Long, evolving pad)
     */
    playAmbientPad(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const oscs = [];
        const detunes = [-12, -5, 0, 5, 12];
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        detunes.forEach(detune => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 130.81; // C3
            osc.detune.value = detune;
            osc.connect(filter);
            oscs.push(osc);
        });

        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 1;

        // Slow attack for ambient
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(volume * 0.2, t + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        oscs.forEach(osc => {
            osc.start(t);
            osc.stop(t + 1.0);
        });
    }

    /**
     * UK GARAGE SHUFFLE HAT
     */
    playShuffleHat(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.035, 0.25 * volume);

        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 7500;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 9500;
        bandpass.Q.value = 2.5;

        noise.gain.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(this.masterGain);
    }

    /**
     * ARPEGGIO (Trance/Techno)
     */
    playArpeggio(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.value = 659.25; // E5

        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.Q.value = 3;

        oscGain.gain.setValueAtTime(volume * 0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    /**
     * LOFI KICK (Soft, warm kick)
     */
    playLofiKick(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.04);

        // Warm filter
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;

        oscGain.gain.setValueAtTime(volume * 0.9, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.35);
    }

    /**
     * LOFI SNARE (Soft, dusty snare)
     */
    playLofiSnare(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Tonal part
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = 180;

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        // Noise (reduced for lofi feel)
        const noise = this.createNoise(t, 0.12, 0.2 * volume);
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = 3000; // Less bright
        filter.Q.value = 0.5;

        noise.gain.connect(filter);
        filter.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    /**
     * VINYL CRACKLE (Lofi texture)
     */
    playVinylCrackle(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Short crackle/pop
        const noise = this.createNoise(t, 0.02, 0.12 * volume);
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 3000; // Random frequency
        filter.Q.value = 4;

        noise.gain.connect(filter);
        filter.connect(this.masterGain);
    }

    /**
     * JAZZ CHORD (Lofi piano chord)
     */
    playJazzChord(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        // Jazz chord (Dm7)
        const freqs = [146.83, 174.61, 220, 261.63]; // D3, F3, A3, C4
        const oscs = [];

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 10; // Slight detune for warmth

            filter.type = 'lowpass';
            filter.frequency.value = 1200; // Warm, muffled
            filter.Q.value = 0.5;

            const vol = volume * (1 / (i + 1)) * 0.3;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.8);
            oscs.push(osc);
        });
    }

    /**
     * LOFI HAT (Soft closed hat)
     */
    playLofiHat(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const noise = this.createNoise(t, 0.04, 0.15 * volume);
        const filter = ctx.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.value = 5000; // Less bright than regular
        filter.Q.value = 0.5;

        noise.gain.connect(filter);
        filter.connect(this.masterGain);
    }

    /**
     * TAPE STOP (Lofi pitch drop effect)
     */
    playTapeStop(time = 0, volume = 1) {
        const ctx = this.audioContext;
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.3); // Pitch drop

        oscGain.gain.setValueAtTime(volume * 0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.3);
    }

    /**
     * Play instrument by name
     */
    playInstrumentByName(instrumentName, time = 0, volume = 1) {
        switch(instrumentName) {
            // Kicks
            case 'kick':
                this.playKick(time, volume);
                break;
            case '808-kick':
                this.play808Kick(time, volume);
                break;
            case 'hard-kick':
                this.playHardKick(time, volume);
                break;
            // Snares
            case 'snare':
                this.playSnare(time, volume);
                break;
            case 'punchy-snare':
                this.playPunchySnare(time, volume);
                break;
            case '808-snare':
                this.play808Snare(time, volume);
                break;
            // Hats & Cymbals
            case 'hihat':
                this.playHiHat(time, volume);
                break;
            case 'openhat':
                this.playOpenHiHat(time, volume);
                break;
            case 'crash':
                this.playCrash(time, volume);
                break;
            case 'ride':
                this.playRide(time, volume);
                break;
            // Percussion
            case 'clap':
                this.playClap(time, volume);
                break;
            case 'tom':
                this.playTom(time, volume);
                break;
            case 'rimshot':
                this.playRimshot(time, volume);
                break;
            case 'cowbell':
                this.playCowbell(time, volume);
                break;
            case 'bongo':
                this.playBongo(time, volume);
                break;
            case 'conga':
                this.playConga(time, volume);
                break;
            case 'timbale':
                this.playTimbale(time, volume);
                break;
            case 'perc':
                this.playPerc(time, volume);
                break;
            // Bass
            case 'bass':
                this.playBass(time, volume);
                break;
            case 'sub-bass':
                this.playSubBass(time, volume);
                break;
            case 'reese-bass':
                this.playReeseBass(time, volume);
                break;
            case 'acid-bass':
                this.playAcidBass(time, volume);
                break;
            case 'fm-bass':
                this.playFMBass(time, volume);
                break;
            // Synths
            case 'stab':
                this.playStab(time, volume);
                break;
            case 'pluck':
                this.playPluck(time, volume);
                break;
            case 'lead':
                this.playLead(time, volume);
                break;
            case 'pad':
                this.playPad(time, volume);
                break;
            case 'bell':
                this.playBell(time, volume);
                break;
            case 'chord':
                this.playChord(time, volume);
                break;
            case 'vocal':
                this.playVocal(time, volume);
                break;
            // FX
            case 'zap':
                this.playZap(time, volume);
                break;
            case 'blip':
                this.playBlip(time, volume);
                break;
            case 'noise':
                this.playNoiseBurst(time, volume);
                break;
            case 'riser':
                this.playRiser(time, volume);
                break;
            // Modern House
            case 'hoover-bass':
                this.playHooverBass(time, volume);
                break;
            case 'saw-bass':
                this.playSawBass(time, volume);
                break;
            case 'piano-stab':
                this.playPianoStab(time, volume);
                break;
            case 'vocal-chop':
                this.playVocalChop(time, volume);
                break;
            case 'side-stick':
                this.playSideStick(time, volume);
                break;
            case 'sidechain-kick':
                this.playSidechainKick(time, volume);
                break;
            // Genre-specific
            case 'wobble-bass':
                this.playWobbleBass(time, volume);
                break;
            case 'trap-hat':
                this.playTrapHat(time, volume);
                break;
            case 'snare-roll':
                this.playSnareRoll(time, volume);
                break;
            case 'trance-pluck':
                this.playTrancePluck(time, volume);
                break;
            case 'ambient-pad':
                this.playAmbientPad(time, volume);
                break;
            case 'shuffle-hat':
                this.playShuffleHat(time, volume);
                break;
            case 'arpeggio':
                this.playArpeggio(time, volume);
                break;
            // Lofi
            case 'lofi-kick':
                this.playLofiKick(time, volume);
                break;
            case 'lofi-snare':
                this.playLofiSnare(time, volume);
                break;
            case 'lofi-hat':
                this.playLofiHat(time, volume);
                break;
            case 'vinyl-crackle':
                this.playVinylCrackle(time, volume);
                break;
            case 'jazz-chord':
                this.playJazzChord(time, volume);
                break;
            case 'tape-stop':
                this.playTapeStop(time, volume);
                break;
        }
    }

    /**
     * Play instrument by index (backwards compatibility)
     */
    playInstrument(instrumentIndex, time = 0, volume = 1) {
        const instruments = ['kick', 'snare', 'hihat', 'clap', 'tom', 'openhat', 'bass', 'perc'];
        const instrument = instruments[instrumentIndex];
        this.playInstrumentByName(instrument, time, volume);
    }
}

// Global instance
const audioEngine = new AudioEngine();

// Available instruments list (grouped by category)
const AVAILABLE_INSTRUMENTS = [
    {
        category: 'Bass',
        instruments: [
            { name: 'acid-bass', displayName: 'Acid Bass' },
            { name: 'bass', displayName: 'Bass' },
            { name: 'fm-bass', displayName: 'FM Bass' },
            { name: 'hoover-bass', displayName: 'Hoover Bass' },
            { name: 'reese-bass', displayName: 'Reese Bass' },
            { name: 'saw-bass', displayName: 'Saw Bass' },
            { name: 'sub-bass', displayName: 'Sub Bass' },
            { name: 'wobble-bass', displayName: 'Wobble Bass' }
        ]
    },
    {
        category: 'FX',
        instruments: [
            { name: 'blip', displayName: 'Blip' },
            { name: 'noise', displayName: 'Noise' },
            { name: 'riser', displayName: 'Riser' },
            { name: 'tape-stop', displayName: 'Tape Stop' },
            { name: 'vinyl-crackle', displayName: 'Vinyl Crackle' },
            { name: 'zap', displayName: 'Zap' }
        ]
    },
    {
        category: 'Hats & Cymbals',
        instruments: [
            { name: 'crash', displayName: 'Crash' },
            { name: 'hihat', displayName: 'Hi-Hat' },
            { name: 'lofi-hat', displayName: 'Lofi Hat' },
            { name: 'openhat', displayName: 'Open HH' },
            { name: 'ride', displayName: 'Ride' },
            { name: 'shuffle-hat', displayName: 'Shuffle Hat' },
            { name: 'trap-hat', displayName: 'Trap Hat' }
        ]
    },
    {
        category: 'Kicks',
        instruments: [
            { name: '808-kick', displayName: '808 Kick' },
            { name: 'hard-kick', displayName: 'Hard Kick' },
            { name: 'kick', displayName: 'Kick' },
            { name: 'lofi-kick', displayName: 'Lofi Kick' }
        ]
    },
    {
        category: 'Percussion',
        instruments: [
            { name: 'bongo', displayName: 'Bongo' },
            { name: 'clap', displayName: 'Clap' },
            { name: 'conga', displayName: 'Conga' },
            { name: 'cowbell', displayName: 'Cowbell' },
            { name: 'rimshot', displayName: 'Rimshot' },
            { name: 'perc', displayName: 'Shaker' },
            { name: 'side-stick', displayName: 'Side Stick' },
            { name: 'snare-roll', displayName: 'Snare Roll' },
            { name: 'timbale', displayName: 'Timbale' },
            { name: 'tom', displayName: 'Tom' }
        ]
    },
    {
        category: 'Snares',
        instruments: [
            { name: '808-snare', displayName: '808 Snare' },
            { name: 'lofi-snare', displayName: 'Lofi Snare' },
            { name: 'punchy-snare', displayName: 'Punchy Snare' },
            { name: 'snare', displayName: 'Snare' }
        ]
    },
    {
        category: 'Synths',
        instruments: [
            { name: 'ambient-pad', displayName: 'Ambient Pad' },
            { name: 'arpeggio', displayName: 'Arpeggio' },
            { name: 'bell', displayName: 'Bell' },
            { name: 'chord', displayName: 'Chord' },
            { name: 'jazz-chord', displayName: 'Jazz Chord' },
            { name: 'lead', displayName: 'Lead' },
            { name: 'pad', displayName: 'Pad' },
            { name: 'piano-stab', displayName: 'Piano Stab' },
            { name: 'pluck', displayName: 'Pluck' },
            { name: 'sidechain-kick', displayName: 'SC Kick' },
            { name: 'stab', displayName: 'Stab' },
            { name: 'trance-pluck', displayName: 'Trance Pluck' },
            { name: 'vocal', displayName: 'Vocal' },
            { name: 'vocal-chop', displayName: 'Vocal Chop' }
        ]
    }
];
