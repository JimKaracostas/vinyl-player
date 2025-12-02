// Get DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const vinyl = document.getElementById('vinyl');
const platter = document.getElementById('platter');
const tonearm = document.getElementById('tonearm');
const centerLabel = document.getElementById('centerLabel');
const labelCircle = document.getElementById('labelCircle');
const labelText = document.getElementById('labelText');
const trackName = document.getElementById('trackName');
const trackTime = document.getElementById('trackTime');
const powerLight = document.getElementById('powerLight');

const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');

const volumeSlider = document.getElementById('volumeSlider');
const pitchSlider = document.getElementById('pitchSlider');
const fileInput = document.getElementById('fileInput');
const recordsRow = document.getElementById('recordsRow');

// State
let tracks = [];
let currentTrackIndex = -1;
let isPlaying = false;
let isDragging = false;
let tonearmInterval;

// Constants for Tonearm Physics
const TONEARM_REST_ANGLE = -35;
const TONEARM_START_ANGLE = -18;
const TONEARM_END_ANGLE = 15;

// Initialize
audioPlayer.volume = 0.7;

// --- File Handling ---

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    loadAudioFiles(files);
});

function loadAudioFiles(files) {
    const audioFiles = files.filter(f => f.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) return;

    if (tracks.length === 0) {
        recordsRow.innerHTML = ''; // Clear "empty" message
    }

    audioFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        // Create a unique color set based on filename
        const colors = generateColorFromTitle(file.name);
        
        const track = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            file: file,
            url: url,
            duration: 0,
            colors: colors
        };
        
        const trackIndex = tracks.length;
        tracks.push(track);
        createVinylSleeve(track, trackIndex);
    });
}

function generateColorFromTitle(title) {
    // Simple hash function to get deterministic numbers from string
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h1 = Math.abs(hash % 360);
    const h2 = Math.abs((hash * 2) % 360);
    
    return {
        gradient: `linear-gradient(135deg, hsl(${h1}, 60%, 40%), hsl(${h2}, 50%, 30%))`,
        label: `hsl(${h1}, 70%, 50%)`
    };
}

function createVinylSleeve(track, index) {
    const sleeve = document.createElement('div');
    sleeve.className = 'vinyl-sleeve';
    sleeve.draggable = true;
    sleeve.dataset.index = index;

    sleeve.innerHTML = `
        <div class="sleeve-art" style="background: ${track.colors.gradient}"></div>
        <div class="sleeve-info">
            <div class="sleeve-title">${track.title}</div>
            <div class="time-display" id="time-${index}">--:--</div>
        </div>
    `;

    // Metadata loading for duration
    const temp = new Audio(track.url);
    temp.addEventListener('loadedmetadata', () => {
        track.duration = temp.duration;
        const timeEl = document.getElementById(`time-${index}`);
        if (timeEl) timeEl.textContent = formatTime(track.duration);
    });

    // Drag Events
    sleeve.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('trackIndex', index);
        sleeve.style.opacity = '0.5';
    });

    sleeve.addEventListener('dragend', (e) => {
        sleeve.style.opacity = '1';
    });

    // Click to Load
    sleeve.addEventListener('click', () => {
        loadTrack(index);
        play();
    });

    recordsRow.appendChild(sleeve);
}

// --- Drag & Drop Zones ---

platter.addEventListener('dragover', (e) => {
    e.preventDefault();
    platter.classList.add('drag-over');
});

platter.addEventListener('dragleave', () => {
    platter.classList.remove('drag-over');
});

platter.addEventListener('drop', (e) => {
    e.preventDefault();
    platter.classList.remove('drag-over');

    const trackIndex = e.dataTransfer.getData('trackIndex');
    
    // Internal drop (from crate)
    if (trackIndex) {
        loadTrack(parseInt(trackIndex));
        play();
        return;
    }

    // External drop (from desktop)
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        loadAudioFiles(files);
        // Auto-play the first new file
        setTimeout(() => {
            if (tracks.length > 0) {
                loadTrack(tracks.length - files.length);
                play();
            }
        }, 100);
    }
});

// Allow dropping files anywhere on body
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!platter.contains(e.target)) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) loadAudioFiles(files);
    }
});

// --- Player Logic ---

function loadTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    
    // Stop previous track
    pause(); 
    moveTonearmToRest();

    currentTrackIndex = index;
    const track = tracks[index];
    
    audioPlayer.src = track.url;
    audioPlayer.playbackRate = pitchSlider.value; // Apply current pitch
    
    trackName.textContent = track.title;
    
    // Update Vinyl Label
    labelCircle.style.background = track.colors.label;
    
    // Format label text
    const shortTitle = track.title.length > 20 
        ? track.title.substring(0, 20) + '...' 
        : track.title;
    labelText.innerHTML = shortTitle.split(' ').join('<br>');
    
    updateTimeDisplay();
    powerLight.classList.add('on');
}

// Toggle Play/Pause
playPauseBtn.addEventListener('click', () => {
    if (currentTrackIndex === -1) return;
    isPlaying ? pause() : play();
});

// Click vinyl to pause
vinyl.addEventListener('click', () => {
    if (currentTrackIndex !== -1) isPlaying ? pause() : play();
});

function play() {
    if (currentTrackIndex === -1) return;
    
    vinyl.classList.add('spinning');
    playPauseIcon.textContent = '⏸';
    powerLight.classList.add('on');
    
    // 1. Move Tonearm to start
    moveTonearmToStart();

    // 2. Wait for arm to land before audio starts (Needle Drop effect)
    setTimeout(() => {
        if(vinyl.classList.contains('spinning')) { // Check if still supposed to be playing
            audioPlayer.play().then(() => {
                isPlaying = true;
                startTonearmTracking();
            }).catch(e => console.error(e));
        }
    }, 800); // 800ms delay for arm movement
}

function pause() {
    audioPlayer.pause();
    vinyl.classList.remove('spinning');
    isPlaying = false;
    playPauseIcon.textContent = '►';
    
    stopTonearmTracking();
    moveTonearmToRest();
    
    // We keep power light on if track is loaded, just paused
}

// --- Tonearm Animation Physics ---

function moveTonearmToRest() {
    tonearm.style.transform = `rotate(${TONEARM_REST_ANGLE}deg)`;
}

function moveTonearmToStart() {
    tonearm.style.transform = `rotate(${TONEARM_START_ANGLE}deg)`;
}

function startTonearmTracking() {
    clearInterval(tonearmInterval);
    tonearmInterval = setInterval(() => {
        if (!isPlaying) return;
        
        const duration = audioPlayer.duration || 1;
        const current = audioPlayer.currentTime || 0;
        const percent = current / duration;
        
        // Calculate angle between Start and End based on percentage
        const angle = TONEARM_START_ANGLE + (percent * (TONEARM_END_ANGLE - TONEARM_START_ANGLE));
        tonearm.style.transform = `rotate(${angle}deg)`;
        
    }, 100);
}

function stopTonearmTracking() {
    clearInterval(tonearmInterval);
}

// --- Navigation ---

prevBtn.addEventListener('click', () => {
    if (currentTrackIndex > 0) {
        loadTrack(currentTrackIndex - 1);
        play();
    }
});

nextBtn.addEventListener('click', playNext);

function playNext() {
    if (currentTrackIndex < tracks.length - 1) {
        loadTrack(currentTrackIndex + 1);
        play();
    } else {
        // End of playlist: lift arm, stop spinning
        pause();
        powerLight.classList.remove('on');
    }
}

shuffleBtn.addEventListener('click', () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    loadTrack(randomIndex);
    play();
});

// --- Controls ---

// Volume
volumeSlider.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value / 100;
});

// Pitch (Speed)
pitchSlider.addEventListener('input', (e) => {
    // Normal range 0.8 to 1.2
    audioPlayer.playbackRate = e.target.value;
    
    // Visual feedback: Spin faster/slower?
    // We can tweak animation duration
    const speed = 1.8 / e.target.value; // Base speed is 1.8s per rotation
    if (isPlaying) {
        vinyl.style.animationDuration = `${speed}s`;
    }
});

// Time Display Update
audioPlayer.addEventListener('timeupdate', () => {
    updateTimeDisplay();
});

function updateTimeDisplay() {
    const current = audioPlayer.currentTime || 0;
    const duration = audioPlayer.duration || 0;
    trackTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Auto-play next on end
audioPlayer.addEventListener('ended', () => {
    playNext();
});

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (currentTrackIndex !== -1) isPlaying ? pause() : play();
    }
});