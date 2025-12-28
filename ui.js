/**
 * UI Controller - Grid interface en controls
 */

class UI {
    constructor() {
        this.gridContainer = document.getElementById('sequencerGrid');
        this.stepIndicators = document.getElementById('stepIndicators');
        this.gridCells = [];
        this.currentStepCells = [];
        this.selectedChannel = 0; // Default to first channel
        this.quickFillMode = true; // Default to Quick Fill ON (only Random button)

        this.init();
    }

    /**
     * Initialize UI
     */
    init() {
        this.createGrid();
        this.createStepIndicators();
        this.populateInstrumentSelectors();
        this.setupControls();
        this.setupTrackControls();
        this.setupPatternButtons();
        this.setupKeyboardShortcuts();
        this.setupMobileInterface();
        this.updateModeDisplay(); // Initialize mode display
        this.alignStepIndicators(); // Align step indicators with grid

        // Connect sequencer callbacks
        sequencer.onStepChange = (step) => this.updateStepIndicator(step);
        sequencer.onPatternChange = (patternIndex) => this.onPatternChange(patternIndex);
        sequencer.onInstrumentChange = (track, instrumentName, displayName) => this.updateInstrumentSelector(track, instrumentName);

        // Load saved pattern or demo pattern
        const hasLoadedPattern = sequencer.load('autosave');
        if (!hasLoadedPattern) {
            // Only load demo if no saved pattern exists
            sequencer.loadDemoPattern();
        } else {
            // Update BPM displays if pattern was loaded
            const bpmSlider = document.getElementById('bpmSlider');
            const bpmValue = document.getElementById('bpmValue');
            const mobileBpmSlider = document.getElementById('mobileBpmSlider');
            const mobileBpmValue = document.getElementById('mobileBpmValue');

            if (bpmSlider) bpmSlider.value = sequencer.bpm;
            if (bpmValue) bpmValue.textContent = sequencer.bpm;
            if (mobileBpmSlider) mobileBpmSlider.value = sequencer.bpm;
            if (mobileBpmValue) mobileBpmValue.textContent = sequencer.bpm;

            // Update instrument selectors
            for (let i = 0; i < sequencer.tracks; i++) {
                const instrumentName = sequencer.getTrackInstrument(i);
                this.updateInstrumentSelector(i, instrumentName);
            }

            // Update track controls
            this.updateTrackControlsUI();

            // Update pattern buttons
            const currentPattern = sequencer.getCurrentPattern();
            const patternButtons = document.querySelectorAll('.pattern-btn');
            patternButtons.forEach(btn => {
                const btnIndex = parseInt(btn.dataset.pattern);
                btn.classList.toggle('active', btnIndex === currentPattern);
            });
        }

        this.updateGrid();

        // Set initial channel selection
        this.updateChannelSelection();
        this.updateMobileView();
    }

    /**
     * Genereer grid cells
     */
    createGrid() {
        this.gridCells = [];

        for (let track = 0; track < sequencer.tracks; track++) {
            this.gridCells[track] = [];

            for (let step = 0; step < sequencer.steps; step++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.track = track;
                cell.dataset.step = step;

                // Click handler
                cell.addEventListener('click', () => {
                    this.selectChannel(track); // Select channel on click
                    sequencer.toggleNote(track, step);
                    this.updateCell(track, step);

                    // Preview sound (alleen als niet playing)
                    if (!sequencer.isPlaying) {
                        audioEngine.init();
                        const instrument = sequencer.getTrackInstrument(track);
                        audioEngine.playInstrumentByName(instrument);
                    }
                });

                this.gridContainer.appendChild(cell);
                this.gridCells[track][step] = cell;
            }
        }
    }

    /**
     * Genereer step indicators (1-16)
     */
    createStepIndicators() {
        for (let i = 0; i < sequencer.steps; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = i + 1;
            this.stepIndicators.appendChild(indicator);
            this.currentStepCells.push(indicator);
        }
    }

    /**
     * Populate instrument selectors with all available instruments
     */
    populateInstrumentSelectors() {
        const selectors = document.querySelectorAll('.instrument-select');

        selectors.forEach((select, track) => {
            // Clear existing options
            select.innerHTML = '';

            // Add grouped instruments with optgroups
            AVAILABLE_INSTRUMENTS.forEach(group => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.category;

                group.instruments.forEach(instrument => {
                    const option = document.createElement('option');
                    option.value = instrument.name;
                    option.textContent = instrument.displayName;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            });

            // Set current selection
            const currentInstrument = sequencer.getTrackInstrument(track);
            select.value = currentInstrument;

            // Add change listener
            select.addEventListener('change', (e) => {
                this.selectChannel(track); // Select channel on instrument change
                const instrumentName = e.target.value;

                // Find instrument in grouped structure
                let foundInstrument = null;
                AVAILABLE_INSTRUMENTS.forEach(group => {
                    const inst = group.instruments.find(i => i.name === instrumentName);
                    if (inst) foundInstrument = inst;
                });

                if (foundInstrument) {
                    sequencer.setTrackInstrument(track, foundInstrument.name, foundInstrument.displayName);
                    sequencer.save('autosave');

                    // Preview sound
                    audioEngine.init();
                    audioEngine.playInstrumentByName(foundInstrument.name);
                }
            });
        });
    }

    /**
     * Update instrument selector for a specific track
     */
    updateInstrumentSelector(track, instrumentName) {
        const selectors = document.querySelectorAll('.instrument-select');
        if (selectors[track]) {
            selectors[track].value = instrumentName;
        }
    }

    /**
     * Select a channel
     */
    selectChannel(channel) {
        if (channel >= 0 && channel < sequencer.tracks) {
            this.selectedChannel = channel;
            this.updateChannelSelection();
        }
    }

    /**
     * Update visual feedback for selected channel
     */
    updateChannelSelection() {
        const trackControls = document.querySelectorAll('.track-control');
        trackControls.forEach((control, index) => {
            control.classList.toggle('selected', index === this.selectedChannel);
        });
    }

    /**
     * Update een enkele cell
     */
    updateCell(track, step) {
        const cell = this.gridCells[track][step];
        const isActive = sequencer.isNoteActive(track, step);

        if (isActive) {
            cell.classList.add('active');
        } else {
            cell.classList.remove('active');
        }
    }

    /**
     * Update hele grid
     */
    updateGrid() {
        for (let track = 0; track < sequencer.tracks; track++) {
            for (let step = 0; step < sequencer.steps; step++) {
                this.updateCell(track, step);
            }
        }
    }

    /**
     * Update step indicator
     */
    updateStepIndicator(currentStep) {
        // Remove previous highlights
        this.currentStepCells.forEach(cell => cell.classList.remove('current'));
        this.gridCells.forEach(track => {
            track.forEach(cell => {
                cell.classList.remove('current-step', 'playing');
            });
        });

        // Add new highlights
        this.currentStepCells[currentStep].classList.add('current');

        // Highlight current column
        for (let track = 0; track < sequencer.tracks; track++) {
            const cell = this.gridCells[track][currentStep];
            cell.classList.add('current-step');

            // Pulse effect voor actieve notes
            if (sequencer.isNoteActive(track, currentStep)) {
                cell.classList.add('playing');
            }
        }
    }

    /**
     * Setup transport controls
     */
    setupControls() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const clearBtn = document.getElementById('clearBtn');
        const bpmSlider = document.getElementById('bpmSlider');
        const bpmValue = document.getElementById('bpmValue');
        const presetSelect = document.getElementById('presetSelect');

        // Play button
        playBtn.addEventListener('click', () => {
            sequencer.play();
            this.updateControlButtons('playing');
        });

        // Pause button
        pauseBtn.addEventListener('click', () => {
            sequencer.pause();
            this.updateControlButtons('paused');
        });

        // Stop button
        stopBtn.addEventListener('click', () => {
            sequencer.stop();
            this.updateControlButtons('stopped');
            this.updateStepIndicator(0);
        });

        // Clear button
        clearBtn.addEventListener('click', () => {
            const menuContent = document.getElementById('menuContent');
            if (menuContent) menuContent.classList.remove('show');

            if (confirm('Clear current pattern?')) {
                sequencer.clear();
                this.updateGrid();
                sequencer.save('autosave');
            }
        });

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            const menuContent = document.getElementById('menuContent');
            if (menuContent) menuContent.classList.remove('show');
            this.exportProject();
        });

        // Import button
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');

        importBtn.addEventListener('click', () => {
            const menuContent = document.getElementById('menuContent');
            if (menuContent) menuContent.classList.remove('show');
            importFile.click();
        });

        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importProject(file);
                // Reset file input
                importFile.value = '';
            }
        });

        // BPM slider
        bpmSlider.addEventListener('input', (e) => {
            const bpm = parseInt(e.target.value);
            sequencer.setBPM(bpm);
            bpmValue.textContent = bpm;
            sequencer.save('autosave'); // Auto-save
        });

        // Menu dropdown toggle
        const menuBtn = document.getElementById('menuBtn');
        const menuContent = document.getElementById('menuContent');
        if (menuBtn && menuContent) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menuContent.classList.toggle('show');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.menu-dropdown')) {
                    menuContent.classList.remove('show');
                }
            });
        }

        // Mode toggle menu item (Quick Fill ON/OFF)
        const modeToggleMenuItem = document.getElementById('modeToggleMenuItem');
        if (modeToggleMenuItem) {
            modeToggleMenuItem.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't close menu
                this.quickFillMode = !this.quickFillMode;
                this.updateModeDisplay();
            });
        }

        // Preset selector
        presetSelect.addEventListener('change', (e) => {
            const presetId = e.target.value;
            if (presetId) {
                if (confirm('Load preset? This will replace your current patterns.')) {
                    if (loadPreset(presetId)) {
                        // Update BPM display
                        bpmSlider.value = sequencer.bpm;
                        bpmValue.textContent = sequencer.bpm;

                        // Update instrument selectors
                        for (let i = 0; i < sequencer.tracks; i++) {
                            const instrumentName = sequencer.getTrackInstrument(i);
                            this.updateInstrumentSelector(i, instrumentName);
                        }

                        // Update grid
                        this.updateGrid();

                        // Switch to pattern A
                        sequencer.switchPattern(0);

                        // Save after loading preset
                        sequencer.save('autosave');
                    }
                }
                // Reset selector
                setTimeout(() => {
                    presetSelect.value = '';
                }, 100);
            }
        });

        // Load saved patterns
        if (sequencer.load('autosave')) {
            bpmSlider.value = sequencer.bpm;
            bpmValue.textContent = sequencer.bpm;
            this.updateGrid();
            this.updateTrackControlsUI();

            // Update instrument selectors
            for (let i = 0; i < sequencer.tracks; i++) {
                const instrumentName = sequencer.getTrackInstrument(i);
                this.updateInstrumentSelector(i, instrumentName);
            }

            // Update pattern button states
            const currentPattern = sequencer.getCurrentPattern();
            const patternButtons = document.querySelectorAll('.pattern-btn');
            patternButtons.forEach(btn => {
                const btnIndex = parseInt(btn.dataset.pattern);
                btn.classList.toggle('active', btnIndex === currentPattern);
            });
        }

        // Auto-save op pattern changes
        this.gridContainer.addEventListener('click', () => {
            sequencer.save('autosave');
        });

        // Mobile controls
        this.setupMobileControls();
    }

    /**
     * Setup mobile-specific controls
     */
    setupMobileControls() {
        // Mobile play/pause/stop buttons
        const mobilePlayBtn = document.getElementById('mobilePlayBtn');
        const mobilePauseBtn = document.getElementById('mobilePauseBtn');
        const mobileStopBtn = document.getElementById('mobileStopBtn');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        if (mobilePlayBtn) {
            mobilePlayBtn.addEventListener('click', () => {
                sequencer.play();
                this.updateMobileControlButtons('playing');
            });
        }

        if (mobilePauseBtn) {
            mobilePauseBtn.addEventListener('click', () => {
                sequencer.pause();
                this.updateMobileControlButtons('paused');
            });
        }

        if (mobileStopBtn) {
            mobileStopBtn.addEventListener('click', () => {
                sequencer.stop();
                this.updateMobileControlButtons('stopped');
            });
        }

        // Mobile menu
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        const mobileMenuClose = document.getElementById('mobileMenuClose');

        if (mobileMenuBtn && mobileMenuOverlay) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuOverlay.classList.add('active');
            });
        }

        if (mobileMenuClose && mobileMenuOverlay) {
            mobileMenuClose.addEventListener('click', () => {
                mobileMenuOverlay.classList.remove('active');
            });

            // Close on overlay click
            mobileMenuOverlay.addEventListener('click', (e) => {
                if (e.target === mobileMenuOverlay) {
                    mobileMenuOverlay.classList.remove('active');
                }
            });
        }

        // Mobile preset selector
        const mobilePresetSelect = document.getElementById('mobilePresetSelect');
        if (mobilePresetSelect) {
            mobilePresetSelect.addEventListener('change', (e) => {
                const presetId = e.target.value;
                if (presetId) {
                    if (confirm('Load preset? This will replace your current patterns.')) {
                        if (loadPreset(presetId)) {
                            const bpmSlider = document.getElementById('bpmSlider');
                            const bpmValue = document.getElementById('bpmValue');
                            const mobileBpmSlider = document.getElementById('mobileBpmSlider');
                            const mobileBpmValue = document.getElementById('mobileBpmValue');

                            if (bpmSlider) bpmSlider.value = sequencer.bpm;
                            if (bpmValue) bpmValue.textContent = sequencer.bpm;
                            if (mobileBpmSlider) mobileBpmSlider.value = sequencer.bpm;
                            if (mobileBpmValue) mobileBpmValue.textContent = sequencer.bpm;

                            for (let i = 0; i < sequencer.tracks; i++) {
                                const instrumentName = sequencer.getTrackInstrument(i);
                                this.updateInstrumentSelector(i, instrumentName);
                            }

                            this.updateGrid();
                            sequencer.switchPattern(0);
                            sequencer.save('autosave');

                            // Close menu
                            if (mobileMenuOverlay) {
                                mobileMenuOverlay.classList.remove('active');
                            }
                        }
                    }
                    // Reset selector
                    setTimeout(() => {
                        mobilePresetSelect.value = '';
                    }, 100);
                }
            });
        }

        // Mobile clear button
        const mobileClearBtn = document.getElementById('mobileClearBtn');
        if (mobileClearBtn) {
            mobileClearBtn.addEventListener('click', () => {
                if (confirm('Clear current pattern?')) {
                    sequencer.clear();
                    this.updateGrid();
                    sequencer.save('autosave');
                    if (mobileMenuOverlay) {
                        mobileMenuOverlay.classList.remove('active');
                    }
                }
            });
        }

        // Mobile export/import
        const mobileExportBtn = document.getElementById('mobileExportBtn');
        const mobileImportBtn = document.getElementById('mobileImportBtn');
        const mobileImportFile = document.getElementById('mobileImportFile');

        if (mobileExportBtn) {
            mobileExportBtn.addEventListener('click', () => {
                this.exportProject();
                if (mobileMenuOverlay) {
                    mobileMenuOverlay.classList.remove('active');
                }
            });
        }

        if (mobileImportBtn && mobileImportFile) {
            mobileImportBtn.addEventListener('click', () => {
                mobileImportFile.click();
            });

            mobileImportFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importProject(file);
                    mobileImportFile.value = '';
                    if (mobileMenuOverlay) {
                        mobileMenuOverlay.classList.remove('active');
                    }
                }
            });
        }

        // Mobile mode toggle (Quick Fill)
        const mobileModeToggle = document.getElementById('mobileModeToggle');
        if (mobileModeToggle) {
            mobileModeToggle.addEventListener('click', () => {
                this.quickFillMode = !this.quickFillMode;
                this.updateModeDisplay();
                // Don't close menu on toggle
            });
        }

        // Mobile BPM slider
        const mobileBpmSlider = document.getElementById('mobileBpmSlider');
        const mobileBpmValue = document.getElementById('mobileBpmValue');

        if (mobileBpmSlider && mobileBpmValue) {
            mobileBpmSlider.addEventListener('input', (e) => {
                const bpm = parseInt(e.target.value);
                sequencer.setBPM(bpm);
                mobileBpmValue.textContent = bpm;

                // Sync with desktop slider
                const bpmSlider = document.getElementById('bpmSlider');
                const bpmValue = document.getElementById('bpmValue');
                if (bpmSlider) bpmSlider.value = bpm;
                if (bpmValue) bpmValue.textContent = bpm;

                sequencer.save('autosave');
            });
        }
    }

    /**
     * Update mobile control buttons state
     */
    updateMobileControlButtons(state) {
        const mobilePlayBtn = document.getElementById('mobilePlayBtn');
        const mobilePauseBtn = document.getElementById('mobilePauseBtn');
        const mobileStopBtn = document.getElementById('mobileStopBtn');

        if (!mobilePlayBtn || !mobilePauseBtn || !mobileStopBtn) return;

        switch(state) {
            case 'playing':
                mobilePlayBtn.disabled = true;
                mobilePauseBtn.disabled = false;
                mobileStopBtn.disabled = false;
                break;
            case 'paused':
                mobilePlayBtn.disabled = false;
                mobilePauseBtn.disabled = true;
                mobileStopBtn.disabled = false;
                break;
            case 'stopped':
                mobilePlayBtn.disabled = false;
                mobilePauseBtn.disabled = true;
                mobileStopBtn.disabled = true;
                break;
        }

        // Also update desktop buttons
        this.updateControlButtons(state);
    }

    /**
     * Setup track controls (volume, mute, solo, random)
     */
    setupTrackControls() {
        // Volume sliders
        const volumeSliders = document.querySelectorAll('.volume-slider');
        volumeSliders.forEach(slider => {
            const track = parseInt(slider.dataset.track);

            slider.addEventListener('input', (e) => {
                this.selectChannel(track); // Select channel on volume change
                const volume = parseInt(e.target.value);
                sequencer.setTrackVolume(track, volume);
                sequencer.save('autosave');
            });
        });

        // Clear track buttons
        const clearTrackButtons = document.querySelectorAll('.btn-clear-track');
        clearTrackButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);

            btn.addEventListener('click', () => {
                this.selectChannel(track); // Select channel on clear
                sequencer.clearTrack(track);
                this.updateGrid();
                sequencer.save('autosave');
            });
        });

        // Random buttons
        const randomButtons = document.querySelectorAll('.btn-random');
        randomButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);

            btn.addEventListener('click', () => {
                this.selectChannel(track); // Select channel on random
                sequencer.randomizeTrack(track);
                this.updateGrid();
                sequencer.save('autosave');
            });
        });

        // Fill dropdowns
        const fillSelects = document.querySelectorAll('.fill-select');
        fillSelects.forEach(select => {
            const track = parseInt(select.dataset.track);

            select.addEventListener('change', (e) => {
                const patternType = e.target.value;
                if (patternType) {
                    this.selectChannel(track); // Select channel on fill

                    if (patternType === 'random') {
                        sequencer.randomizeTrack(track);
                    } else {
                        sequencer.fillTrack(track, patternType);
                    }

                    this.updateGrid();
                    sequencer.save('autosave');
                    // Reset dropdown to placeholder
                    e.target.value = '';
                }
            });
        });

        // Mute buttons
        const muteButtons = document.querySelectorAll('.btn-mute');
        muteButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);

            btn.addEventListener('click', () => {
                this.selectChannel(track); // Select channel on mute
                const isMuted = sequencer.toggleMute(track);
                btn.classList.toggle('active', isMuted);

                // Update track control visual
                const trackControl = btn.closest('.track-control');
                trackControl.classList.toggle('muted', isMuted);

                sequencer.save('autosave');
            });
        });

        // Solo buttons
        const soloButtons = document.querySelectorAll('.btn-solo');
        soloButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);

            btn.addEventListener('click', () => {
                this.selectChannel(track); // Select channel on solo
                const isSolo = sequencer.toggleSolo(track);
                btn.classList.toggle('active', isSolo);
                sequencer.save('autosave');
            });
        });
    }

    /**
     * Update track name in UI
     */
    updateTrackName(track, displayName) {
        const trackControls = document.querySelectorAll('.track-control');
        if (trackControls[track]) {
            const trackNameElement = trackControls[track].querySelector('.track-name');
            if (trackNameElement) {
                trackNameElement.textContent = displayName;
            }
        }
    }

    /**
     * Update all track names from sequencer
     */
    updateAllTrackNames() {
        for (let i = 0; i < sequencer.tracks; i++) {
            const displayName = sequencer.getTrackName(i);
            this.updateTrackName(i, displayName);
        }
    }

    /**
     * Update track controls UI from sequencer state
     */
    updateTrackControlsUI() {
        // Update volume sliders
        const volumeSliders = document.querySelectorAll('.volume-slider');
        volumeSliders.forEach(slider => {
            const track = parseInt(slider.dataset.track);
            slider.value = Math.round(sequencer.trackVolumes[track] * 100);
        });

        // Update mute buttons
        const muteButtons = document.querySelectorAll('.btn-mute');
        muteButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);
            const isMuted = sequencer.isTrackMuted(track);
            btn.classList.toggle('active', isMuted);

            const trackControl = btn.closest('.track-control');
            trackControl.classList.toggle('muted', isMuted);
        });

        // Update solo buttons
        const soloButtons = document.querySelectorAll('.btn-solo');
        soloButtons.forEach(btn => {
            const track = parseInt(btn.dataset.track);
            const isSolo = sequencer.isTrackSolo(track);
            btn.classList.toggle('active', isSolo);
        });
    }

    /**
     * Setup pattern selector buttons
     */
    setupPatternButtons() {
        const patternButtons = document.querySelectorAll('.pattern-btn');

        patternButtons.forEach(btn => {
            const patternIndex = parseInt(btn.dataset.pattern);

            btn.addEventListener('click', () => {
                sequencer.switchPattern(patternIndex);
                sequencer.save('autosave');
            });
        });
    }

    /**
     * Handle pattern change
     */
    onPatternChange(patternIndex) {
        // Update button states
        const patternButtons = document.querySelectorAll('.pattern-btn');
        patternButtons.forEach(btn => {
            const btnIndex = parseInt(btn.dataset.pattern);
            btn.classList.toggle('active', btnIndex === patternIndex);
        });

        // Update grid to show new pattern
        this.updateGrid();
    }

    /**
     * Update button states
     */
    updateControlButtons(state) {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');

        switch(state) {
            case 'playing':
                playBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                break;
            case 'paused':
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = false;
                break;
            case 'stopped':
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = true;
                break;
        }
    }

    /**
     * Update mode display (Quick Fill ON/OFF)
     */
    updateModeDisplay() {
        const modeToggleMenuItem = document.getElementById('modeToggleMenuItem');
        const mobileModeToggle = document.getElementById('mobileModeToggle');
        const fillSelects = document.querySelectorAll('.fill-select');
        const randomButtons = document.querySelectorAll('.btn-random');

        // Update desktop menu item indicator
        if (modeToggleMenuItem) {
            const indicator = modeToggleMenuItem.querySelector('.toggle-indicator');
            if (indicator) {
                // Quick Fill ON = only Random button visible
                // Quick Fill OFF = full dropdown visible
                indicator.textContent = this.quickFillMode ? 'ON' : 'OFF';
            }
            modeToggleMenuItem.classList.toggle('active', this.quickFillMode);
        }

        // Update mobile toggle button
        if (mobileModeToggle) {
            const indicator = mobileModeToggle.querySelector('.toggle-indicator');
            if (indicator) {
                indicator.textContent = this.quickFillMode ? 'ON' : 'OFF';
            }
            mobileModeToggle.classList.toggle('active', this.quickFillMode);
        }

        // Show/hide fill dropdowns and random buttons
        fillSelects.forEach(select => {
            // Quick Fill ON = hide dropdown, Quick Fill OFF = show dropdown
            select.style.display = this.quickFillMode ? 'none' : 'block';
        });

        randomButtons.forEach(btn => {
            // Quick Fill ON = show Random button, Quick Fill OFF = hide Random button
            btn.style.display = this.quickFillMode ? 'inline-block' : 'none';
        });
    }

    /**
     * Align step indicators with grid by calculating exact track-controls width
     */
    alignStepIndicators() {
        const trackControls = document.querySelector('.track-controls');
        const sequencer = document.querySelector('.sequencer');

        if (trackControls && this.stepIndicators) {
            // Get computed width of track-controls
            const trackControlsWidth = trackControls.offsetWidth;
            // Get gap from sequencer (10px)
            const computedStyle = window.getComputedStyle(sequencer);
            const gap = parseInt(computedStyle.gap) || 10;

            // Set margin-left to match track-controls width + gap
            this.stepIndicators.style.marginLeft = `${trackControlsWidth + gap}px`;
        }
    }

    /**
     * Update volume slider UI for a track
     */
    updateVolumeSlider(track, volume) {
        const volumeSlider = document.querySelector(`.volume-slider[data-track="${track}"]`);
        if (volumeSlider) {
            volumeSlider.value = volume;
        }
    }

    /**
     * Export project as JSON
     */
    exportProject() {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            bpm: sequencer.bpm,
            patterns: sequencer.patterns,
            currentPattern: sequencer.currentPattern,
            trackInstruments: sequencer.trackInstruments,
            trackNames: sequencer.trackNames,
            trackVolumes: sequencer.trackVolumes,
            trackMuted: sequencer.trackMuted,
            trackSolo: sequencer.trackSolo
        };

        // Create JSON blob
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `music-lab-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import project from JSON file
     */
    importProject(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate data
                if (!data.version || !data.patterns) {
                    alert('Invalid project file format');
                    return;
                }

                // Load data into sequencer
                sequencer.bpm = data.bpm || 120;
                sequencer.patterns = data.patterns;
                sequencer.currentPattern = data.currentPattern || 0;
                sequencer.trackInstruments = data.trackInstruments || ['kick', 'snare', 'hihat', 'clap', 'tom', 'openhat', 'bass', 'perc'];
                sequencer.trackNames = data.trackNames || ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Tom', 'Open HH', 'Bass', 'Perc'];
                sequencer.trackVolumes = data.trackVolumes || [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
                sequencer.trackMuted = data.trackMuted || [false, false, false, false, false, false, false, false];
                sequencer.trackSolo = data.trackSolo || [false, false, false, false, false, false, false, false];

                // Update UI
                const bpmSlider = document.getElementById('bpmSlider');
                const bpmValue = document.getElementById('bpmValue');
                bpmSlider.value = sequencer.bpm;
                bpmValue.textContent = sequencer.bpm;

                this.updateGrid();
                this.updateTrackControlsUI();

                // Update instrument selectors
                for (let i = 0; i < sequencer.tracks; i++) {
                    const instrumentName = sequencer.getTrackInstrument(i);
                    this.updateInstrumentSelector(i, instrumentName);
                }

                // Update pattern button states
                const patternButtons = document.querySelectorAll('.pattern-btn');
                patternButtons.forEach(btn => {
                    const btnIndex = parseInt(btn.dataset.pattern);
                    btn.classList.toggle('active', btnIndex === sequencer.currentPattern);
                });

                // Save to autosave
                sequencer.save('autosave');

                console.log('Project imported successfully');
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import project: ' + error.message);
            }
        };

        reader.readAsText(file);
    }

    /**
     * Keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                return;
            }

            // Debug: log key info for + and - keys
            if (e.key === '-' || e.key === '+' || e.key === '=' || e.code === 'Minus' || e.code === 'Equal') {
                console.log('Key pressed:', {
                    key: e.key,
                    code: e.code,
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                    metaKey: e.metaKey
                });
            }

            // Spacebar = play/pause
            if (e.code === 'Space') {
                e.preventDefault();
                if (sequencer.isPlaying) {
                    sequencer.pause();
                    this.updateControlButtons('paused');
                } else {
                    sequencer.play();
                    this.updateControlButtons('playing');
                }
            }

            // Escape = stop
            if (e.code === 'Escape') {
                e.preventDefault();
                sequencer.stop();
                this.updateControlButtons('stopped');
                this.updateStepIndicator(0);
            }

            // Numbers 1-8 = select channel
            if (e.code >= 'Digit1' && e.code <= 'Digit8' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const channel = parseInt(e.code.replace('Digit', '')) - 1;
                this.selectChannel(channel);
            }

            // Shift + C = clear selected channel
            if (e.code === 'KeyC' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.clearTrack(this.selectedChannel);
                this.updateGrid();
                sequencer.save('autosave');
            }

            // Shift + R = random selected channel
            if (e.code === 'KeyR' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.randomizeTrack(this.selectedChannel);
                this.updateGrid();
                sequencer.save('autosave');
            }

            // Shift + M = mute toggle selected channel
            if (e.code === 'KeyM' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.toggleMute(this.selectedChannel);
                this.updateTrackControlsUI();
                sequencer.save('autosave');
            }

            // Shift + S = solo toggle selected channel
            if (e.code === 'KeyS' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.toggleSolo(this.selectedChannel);
                this.updateTrackControlsUI();
                sequencer.save('autosave');
            }

            // Arrow Up = increase volume of selected channel
            if (!e.ctrlKey && !e.metaKey && e.code === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                const currentVolume = (sequencer.trackVolumes[this.selectedChannel] || 0.7) * 100; // Convert 0-1 to 0-100
                const newVolume = Math.min(100, currentVolume + 5);
                sequencer.setTrackVolume(this.selectedChannel, newVolume);
                this.updateVolumeSlider(this.selectedChannel, newVolume);
                sequencer.save('autosave');
                return;
            }

            // Arrow Down = decrease volume of selected channel
            if (!e.ctrlKey && !e.metaKey && e.code === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const currentVolume = (sequencer.trackVolumes[this.selectedChannel] || 0.7) * 100; // Convert 0-1 to 0-100
                const newVolume = Math.max(5, currentVolume - 5);
                sequencer.setTrackVolume(this.selectedChannel, newVolume);
                this.updateVolumeSlider(this.selectedChannel, newVolume);
                sequencer.save('autosave');
                return;
            }

            // A, B, C, D = switch patterns (without Shift)
            if (e.code === 'KeyA' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.switchPattern(0);
                sequencer.save('autosave');
            }
            if (e.code === 'KeyB' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.switchPattern(1);
                sequencer.save('autosave');
            }
            if (e.code === 'KeyC' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.switchPattern(2);
                sequencer.save('autosave');
            }
            if (e.code === 'KeyD' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                sequencer.switchPattern(3);
                sequencer.save('autosave');
            }
        });
    }

    /**
     * Setup mobile interface with track selector tabs
     */
    setupMobileInterface() {
        const mobileSelector = document.getElementById('mobileTrackSelector');
        if (!mobileSelector) return;

        // Create mobile track tabs
        for (let i = 0; i < sequencer.tracks; i++) {
            const tab = document.createElement('div');
            tab.className = 'mobile-track-tab';
            tab.dataset.track = i;
            tab.textContent = sequencer.getTrackName(i);

            // Make first tab active
            if (i === 0) {
                tab.classList.add('active');
            }

            // Click handler
            tab.addEventListener('click', () => {
                this.selectChannel(i);
                this.updateMobileView();
            });

            mobileSelector.appendChild(tab);
        }

        // Update tabs when instruments change
        const originalUpdateInstrumentSelector = this.updateInstrumentSelector.bind(this);
        this.updateInstrumentSelector = (track, instrumentName) => {
            originalUpdateInstrumentSelector(track, instrumentName);
            this.updateMobileTrackTabs();
        };
    }

    /**
     * Update mobile view to show only selected track
     */
    updateMobileView() {
        if (window.innerWidth > 768) return; // Only on mobile

        // Update track tabs
        this.updateMobileTrackTabs();

        // Show only selected track controls
        const allTrackControls = document.querySelectorAll('.track-control');
        const trackControlsContainer = document.querySelector('.track-controls');

        if (trackControlsContainer) {
            trackControlsContainer.classList.add('mobile-visible');

            // Show only the selected track control
            allTrackControls.forEach((control, index) => {
                control.classList.remove('mobile-selected');
                if (index === this.selectedChannel) {
                    control.classList.add('mobile-selected');
                }
            });
        }

        // Show only selected track in 4x4 grid
        const gridContainer = document.querySelector('.grid-container');
        if (gridContainer) {
            gridContainer.classList.add('mobile-visible');

            // Hide all cells first
            this.gridCells.forEach(trackCells => {
                trackCells.forEach(cell => {
                    cell.style.display = 'none';
                });
            });

            // Show only selected track cells (16 cells in 4x4 grid)
            if (this.gridCells[this.selectedChannel]) {
                this.gridCells[this.selectedChannel].forEach(cell => {
                    cell.style.display = 'flex';
                });
            }
        }
    }

    /**
     * Update mobile track tabs
     */
    updateMobileTrackTabs() {
        const tabs = document.querySelectorAll('.mobile-track-tab');
        tabs.forEach((tab, index) => {
            const isActive = index === this.selectedChannel;
            const isMuted = sequencer.isTrackMuted(index);
            const trackName = sequencer.getTrackName(index);

            tab.classList.toggle('active', isActive);
            tab.classList.toggle('muted', isMuted);
            tab.textContent = trackName;
        });
    }

    /**
     * Override selectChannel to update mobile view
     */
    selectChannel(channel) {
        if (channel >= 0 && channel < sequencer.tracks) {
            this.selectedChannel = channel;
            this.updateChannelSelection();
            this.updateMobileView();
        }
    }
}

// Start UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const ui = new UI();

    // Welcome message in console
    console.log('%c🎵 Music Lab', 'font-size: 20px; font-weight: bold;');
    console.log('Keyboard shortcuts:');
    console.log('  Space - Play/Pause');
    console.log('  Escape - Stop');
    console.log('  1-8 - Select channel');
    console.log('  A/B/C/D - Switch patterns');
    console.log('  Shift + C - Clear selected channel');
    console.log('  Shift + R - Random fill selected channel');
    console.log('  Shift + M - Mute toggle selected channel');
    console.log('  Shift + S - Solo toggle selected channel');
    console.log('  Arrow Up - Increase volume selected channel');
    console.log('  Arrow Down - Decrease volume selected channel');
});
