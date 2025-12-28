/**
 * Sequencer - Timing en scheduling engine
 */

class Sequencer {
    constructor() {
        this.bpm = 120;
        this.steps = 16;
        this.tracks = 8; // kick, snare, hihat, clap, tom, openhat, bass, perc

        // Multiple patterns (A, B, C, D)
        this.numPatterns = 4;
        this.currentPattern = 0;
        this.patterns = [];
        for (let i = 0; i < this.numPatterns; i++) {
            this.patterns[i] = this.createEmptyPattern();
        }

        // Track instrument mapping (wat speelt elk kanaal)
        this.trackInstruments = ['kick', 'snare', 'hihat', 'clap', 'tom', 'openhat', 'bass', 'perc'];
        this.trackNames = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Tom', 'Open HH', 'Bass', 'Perc'];

        // Track controls (shared across patterns)
        this.trackVolumes = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7]; // Volume per track (0-1)
        this.trackMuted = [false, false, false, false, false, false, false, false]; // Mute state per track
        this.trackSolo = [false, false, false, false, false, false, false, false]; // Solo state per track

        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStep = 0;

        // Timing
        this.scheduleAheadTime = 0.1; // Hoeveel seconden vooruit schedulen
        this.nextNoteTime = 0;
        this.timerID = null;

        // Callbacks
        this.onStepChange = null; // Callback voor UI updates
        this.onPatternChange = null; // Callback voor pattern change
        this.onInstrumentChange = null; // Callback voor instrument change
    }

    /**
     * Maak een leeg pattern
     */
    createEmptyPattern() {
        const pattern = [];
        for (let track = 0; track < this.tracks; track++) {
            pattern[track] = new Array(this.steps).fill(false);
        }
        return pattern;
    }

    /**
     * Get current pattern
     */
    getPattern() {
        return this.patterns[this.currentPattern];
    }

    /**
     * Toggle een note aan/uit
     */
    toggleNote(track, step) {
        if (track >= 0 && track < this.tracks && step >= 0 && step < this.steps) {
            const pattern = this.getPattern();
            pattern[track][step] = !pattern[track][step];
        }
    }

    /**
     * Check of een note actief is
     */
    isNoteActive(track, step) {
        const pattern = this.getPattern();
        return pattern[track][step];
    }

    /**
     * Set een note direct (voor preset loading)
     */
    setNote(track, step, value, patternIndex = null) {
        const pattern = patternIndex !== null ? this.patterns[patternIndex] : this.getPattern();
        if (track >= 0 && track < this.tracks && step >= 0 && step < this.steps) {
            pattern[track][step] = value;
        }
    }

    /**
     * Switch to a different pattern
     */
    switchPattern(patternIndex) {
        if (patternIndex >= 0 && patternIndex < this.numPatterns) {
            this.currentPattern = patternIndex;

            if (this.onPatternChange) {
                this.onPatternChange(patternIndex);
            }
        }
    }

    /**
     * Get current pattern index
     */
    getCurrentPattern() {
        return this.currentPattern;
    }

    /**
     * Copy pattern to another slot
     */
    copyPattern(fromIndex, toIndex) {
        if (fromIndex >= 0 && fromIndex < this.numPatterns &&
            toIndex >= 0 && toIndex < this.numPatterns) {
            // Deep copy
            this.patterns[toIndex] = JSON.parse(JSON.stringify(this.patterns[fromIndex]));
        }
    }

    /**
     * Set BPM
     */
    setBPM(bpm) {
        this.bpm = Math.max(60, Math.min(200, bpm));
    }

    /**
     * Set instrument voor een track
     */
    setTrackInstrument(track, instrumentName, displayName = null) {
        if (track >= 0 && track < this.tracks) {
            this.trackInstruments[track] = instrumentName;
            if (displayName) {
                this.trackNames[track] = displayName;
            }

            if (this.onInstrumentChange) {
                this.onInstrumentChange(track, instrumentName, displayName);
            }
        }
    }

    /**
     * Get instrument voor een track
     */
    getTrackInstrument(track) {
        return this.trackInstruments[track];
    }

    /**
     * Get display name voor een track
     */
    getTrackName(track) {
        return this.trackNames[track];
    }

    /**
     * Set volume voor een track (0-100)
     */
    setTrackVolume(track, volume) {
        if (track >= 0 && track < this.tracks) {
            this.trackVolumes[track] = volume / 100; // Convert to 0-1
        }
    }

    /**
     * Toggle mute voor een track
     */
    toggleMute(track) {
        if (track >= 0 && track < this.tracks) {
            this.trackMuted[track] = !this.trackMuted[track];
            return this.trackMuted[track];
        }
        return false;
    }

    /**
     * Toggle solo voor een track
     */
    toggleSolo(track) {
        if (track >= 0 && track < this.tracks) {
            this.trackSolo[track] = !this.trackSolo[track];
            return this.trackSolo[track];
        }
        return false;
    }

    /**
     * Check of een track gemute is
     */
    isTrackMuted(track) {
        return this.trackMuted[track];
    }

    /**
     * Check of een track solo is
     */
    isTrackSolo(track) {
        return this.trackSolo[track];
    }

    /**
     * Bereken de tijd tussen steps (in seconden)
     */
    getStepDuration() {
        // 16th notes bij 120 BPM = 0.125 seconden per step
        return (60.0 / this.bpm) / 4;
    }

    /**
     * Start playback
     */
    play() {
        if (this.isPlaying) return;

        audioEngine.init();
        audioEngine.resume();

        this.isPlaying = true;
        this.isPaused = false;

        // Reset als we van stop komen
        if (this.currentStep === 0) {
            this.nextNoteTime = audioEngine.getCurrentTime();
        }

        this.schedule();
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.isPaused = true;

        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    /**
     * Stop playback
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStep = 0;

        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }

        // Update UI
        if (this.onStepChange) {
            this.onStepChange(this.currentStep);
        }
    }

    /**
     * Schedule notes (Web Audio timing)
     */
    schedule() {
        if (!this.isPlaying) return;

        const currentTime = audioEngine.getCurrentTime();

        // Schedule notes die binnen de scheduleAheadTime vallen
        while (this.nextNoteTime < currentTime + this.scheduleAheadTime) {
            this.playStep(this.currentStep, this.nextNoteTime);
            this.nextStep();
        }

        // Blijf schedulen (timeout voor CPU efficiency)
        this.timerID = setTimeout(() => this.schedule(), 25);
    }

    /**
     * Play alle actieve notes in een step
     */
    playStep(step, time) {
        // Update UI op juiste moment
        const uiUpdateDelay = (time - audioEngine.getCurrentTime()) * 1000;
        setTimeout(() => {
            if (this.onStepChange) {
                this.onStepChange(step);
            }
        }, Math.max(0, uiUpdateDelay));

        // Check of er solo tracks zijn
        const hasSolo = this.trackSolo.some(solo => solo);

        // Get current pattern
        const pattern = this.getPattern();

        // Trigger alle actieve notes in deze step
        for (let track = 0; track < this.tracks; track++) {
            if (pattern[track][step]) {
                // Check of track moet spelen (niet muted EN (geen solo OF track is solo))
                const shouldPlay = !this.trackMuted[track] && (!hasSolo || this.trackSolo[track]);

                if (shouldPlay) {
                    const volume = this.trackVolumes[track];
                    const instrument = this.trackInstruments[track];
                    audioEngine.playInstrumentByName(instrument, time, volume);
                }
            }
        }
    }

    /**
     * Ga naar volgende step
     */
    nextStep() {
        const stepDuration = this.getStepDuration();
        this.nextNoteTime += stepDuration;

        this.currentStep++;
        if (this.currentStep >= this.steps) {
            this.currentStep = 0;
        }
    }

    /**
     * Clear current pattern
     */
    clear() {
        this.patterns[this.currentPattern] = this.createEmptyPattern();
    }

    /**
     * Clear a specific track in current pattern
     */
    clearTrack(track) {
        if (track >= 0 && track < this.tracks) {
            const pattern = this.getPattern();
            pattern[track] = new Array(this.steps).fill(false);
        }
    }

    /**
     * Randomize een specifieke track
     */
    randomizeTrack(track) {
        if (track < 0 || track >= this.tracks) return;

        const pattern = this.getPattern();

        // Different density per instrument type voor muzikaal resultaat
        let density = 0.3; // Default 30% kans

        if (track === 0 || track === 6) { // Kick & Bass
            density = 0.25; // Minder dicht
        } else if (track === 1 || track === 3) { // Snare & Clap
            density = 0.2; // Nog minder (backbeat)
        } else if (track === 2 || track === 5) { // Hi-hats
            density = 0.4; // Dichter voor hi-hats
        } else if (track === 7) { // Perc/shaker
            density = 0.5; // Meest dicht
        }

        // Genereer random pattern
        for (let step = 0; step < this.steps; step++) {
            pattern[track][step] = Math.random() < density;
        }
    }

    /**
     * Euclidean rhythm algorithm - spreads n hits evenly across k steps
     */
    generateEuclideanRhythm(hits, steps) {
        const pattern = new Array(steps).fill(false);
        const bucket = new Array(steps).fill(0);

        for (let i = 0; i < steps; i++) {
            bucket[i] = Math.floor((hits * i) / steps);
        }

        for (let i = 0; i < steps; i++) {
            if (i === 0 || bucket[i] !== bucket[i - 1]) {
                pattern[i] = true;
            }
        }

        return pattern;
    }

    /**
     * Fill track with pattern (supports various pattern types)
     */
    fillTrack(track, patternType) {
        if (track < 0 || track >= this.tracks) return;

        const pattern = this.getPattern();
        let fillPattern = new Array(this.steps).fill(false);

        // Parse pattern type
        if (patternType.startsWith('every-')) {
            // Basic: every N steps
            const stepInterval = parseInt(patternType.split('-')[1]);
            for (let step = 0; step < this.steps; step++) {
                fillPattern[step] = (step % stepInterval === 0);
            }
        } else if (patternType.startsWith('kick-')) {
            // Kick patterns
            const kickType = patternType.split('-')[1];
            switch (kickType) {
                case '4floor':
                    fillPattern = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
                    break;
                case '2step':
                    fillPattern = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
                    break;
                case 'broken':
                    fillPattern = [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0];
                    break;
                case 'offbeat':
                    fillPattern = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
                    break;
            }
        } else if (patternType.startsWith('hat-')) {
            // Hi-hat patterns
            const hatType = patternType.split('-')[1];
            switch (hatType) {
                case '8ths':
                    fillPattern = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
                    break;
                case '16ths':
                    fillPattern = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
                    break;
                case 'shuffle':
                    fillPattern = [1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,0];
                    break;
                case 'trap':
                    fillPattern = [1,0,1,0, 1,1,1,1, 1,0,1,0, 1,1,1,1];
                    break;
            }
        } else if (patternType.startsWith('snare-')) {
            // Snare patterns
            const snareType = patternType.split('-')[1];
            switch (snareType) {
                case 'backbeat':
                    fillPattern = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
                    break;
                case 'halftime':
                    fillPattern = [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
                    break;
                case 'clap':
                    fillPattern = [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0];
                    break;
            }
        } else if (patternType.startsWith('euclidean-')) {
            // Euclidean rhythms
            const hits = parseInt(patternType.split('-')[1]);
            fillPattern = this.generateEuclideanRhythm(hits, this.steps);
        } else if (patternType.startsWith('poly-')) {
            // Polyrhythms
            const polyType = patternType.split('-')[1];
            if (polyType === '3over4') {
                // 3 hits evenly over 16 steps (triplet feel)
                fillPattern = [1,0,0,0,0, 1,0,0,0,0, 1,0,0,0,0,0];
            } else if (polyType === '5over4') {
                // 5 hits evenly over 16 steps
                fillPattern = this.generateEuclideanRhythm(5, this.steps);
            }
        }

        // Apply the fill pattern
        for (let step = 0; step < this.steps; step++) {
            pattern[track][step] = fillPattern[step] === 1 || fillPattern[step] === true;
        }
    }

    /**
     * Clear all patterns
     */
    clearAll() {
        for (let i = 0; i < this.numPatterns; i++) {
            this.patterns[i] = this.createEmptyPattern();
        }
    }

    /**
     * Demo pattern laden (alleen pattern A)
     */
    loadDemoPattern() {
        // Clear pattern A
        this.patterns[0] = this.createEmptyPattern();

        // Basic house beat in pattern A
        // Kick op 1, 5, 9, 13 (four on the floor)
        this.patterns[0][0][0] = true;
        this.patterns[0][0][4] = true;
        this.patterns[0][0][8] = true;
        this.patterns[0][0][12] = true;

        // Snare op 4, 12 (backbeat)
        this.patterns[0][1][4] = true;
        this.patterns[0][1][12] = true;

        // Closed hi-hat op alle even beats (8th notes)
        for (let i = 0; i < 16; i += 2) {
            this.patterns[0][2][i] = true;
        }

        // Clap op 4, 12 (samen met snare)
        this.patterns[0][3][4] = true;
        this.patterns[0][3][12] = true;

        // Tom fills op 14, 15 (end of bar fill)
        this.patterns[0][4][14] = true;
        this.patterns[0][4][15] = true;

        // Open hi-hat op offbeats (tussen closed hats)
        this.patterns[0][5][3] = true;
        this.patterns[0][5][7] = true;
        this.patterns[0][5][11] = true;
        this.patterns[0][5][15] = true;

        // Bass op 1, 5, 9, 13 (met kick mee)
        this.patterns[0][6][0] = true;
        this.patterns[0][6][4] = true;
        this.patterns[0][6][8] = true;
        this.patterns[0][6][12] = true;

        // Perc/shaker op alle 16th notes (constant rhythm)
        for (let i = 0; i < 16; i++) {
            this.patterns[0][7][i] = true;
        }
    }

    /**
     * Save all patterns naar localStorage
     */
    save(name = 'pattern') {
        const data = {
            bpm: this.bpm,
            patterns: this.patterns,
            currentPattern: this.currentPattern,
            trackVolumes: this.trackVolumes,
            trackMuted: this.trackMuted,
            trackSolo: this.trackSolo,
            trackInstruments: this.trackInstruments,
            trackNames: this.trackNames
        };
        localStorage.setItem(`sequencer_${name}`, JSON.stringify(data));
    }

    /**
     * Load patterns van localStorage
     */
    load(name = 'pattern') {
        const stored = localStorage.getItem(`sequencer_${name}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.bpm = data.bpm || 120;

                // Load patterns (backwards compatible)
                if (data.patterns) {
                    this.patterns = data.patterns;

                    // Extend old 4-track patterns to 8 tracks
                    for (let i = 0; i < this.patterns.length; i++) {
                        if (this.patterns[i].length < 8) {
                            // Add empty tracks for new instruments
                            for (let t = this.patterns[i].length; t < 8; t++) {
                                this.patterns[i][t] = new Array(this.steps).fill(false);
                            }
                        }
                    }
                } else if (data.pattern) {
                    // Old format - put in pattern A and extend
                    this.patterns[0] = data.pattern;
                    if (this.patterns[0].length < 8) {
                        for (let t = this.patterns[0].length; t < 8; t++) {
                            this.patterns[0][t] = new Array(this.steps).fill(false);
                        }
                    }
                }

                this.currentPattern = data.currentPattern || 0;

                // Extend track volumes/muted/solo arrays if needed
                if (data.trackVolumes && data.trackVolumes.length < 8) {
                    this.trackVolumes = [...data.trackVolumes, ...new Array(8 - data.trackVolumes.length).fill(0.7)];
                } else {
                    this.trackVolumes = data.trackVolumes || [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
                }

                if (data.trackMuted && data.trackMuted.length < 8) {
                    this.trackMuted = [...data.trackMuted, ...new Array(8 - data.trackMuted.length).fill(false)];
                } else {
                    this.trackMuted = data.trackMuted || [false, false, false, false, false, false, false, false];
                }

                if (data.trackSolo && data.trackSolo.length < 8) {
                    this.trackSolo = [...data.trackSolo, ...new Array(8 - data.trackSolo.length).fill(false)];
                } else {
                    this.trackSolo = data.trackSolo || [false, false, false, false, false, false, false, false];
                }

                // Load track instruments and names
                if (data.trackInstruments) {
                    this.trackInstruments = data.trackInstruments;
                }
                if (data.trackNames) {
                    this.trackNames = data.trackNames;
                }

                return true;
            } catch (e) {
                console.error('Failed to load pattern:', e);
            }
        }
        return false;
    }
}

// Global instance
const sequencer = new Sequencer();
