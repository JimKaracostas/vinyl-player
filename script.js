const elements = {
  audio: document.getElementById("audioPlayer"),
  fileInput: document.getElementById("fileInput"),
  addTracksBtn: document.getElementById("addTracksBtn"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  libraryStats: document.getElementById("libraryStats"),
  libraryList: document.getElementById("libraryList"),
  emptyState: document.getElementById("emptyState"),
  queueList: document.getElementById("queueList"),
  clearQueueBtn: document.getElementById("clearQueueBtn"),
  autofillQueueBtn: document.getElementById("autofillQueueBtn"),
  nowTitle: document.getElementById("nowTitle"),
  nowSub: document.getElementById("nowSub"),
  currentTime: document.getElementById("currentTime"),
  totalTime: document.getElementById("totalTime"),
  progressSlider: document.getElementById("progressSlider"),
  playPauseBtn: document.getElementById("playPauseBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  volumeSlider: document.getElementById("volumeSlider"),
  speedSlider: document.getElementById("speedSlider"),
  record: document.getElementById("record"),
  recordLabel: document.getElementById("recordLabel"),
  recordLabelText: document.getElementById("recordLabelText"),
  tonearm: document.getElementById("tonearm"),
  dropOverlay: document.getElementById("dropOverlay"),
};

const state = {
  tracks: [],
  queue: [],
  currentTrackId: null,
  search: "",
  sort: "added",
  isPlaying: false,
  isSeeking: false,
  shuffle: false,
  repeat: "off",
  volume: Number(localStorage.getItem("vinyl-player-volume") || 80),
  speed: Number(localStorage.getItem("vinyl-player-speed") || 1),
};

const TONEARM_REST = -36;
const TONEARM_START = -20;
const TONEARM_END = 18;

bootstrap();

function bootstrap() {
  elements.audio.volume = state.volume / 100;
  elements.audio.playbackRate = state.speed;
  elements.volumeSlider.value = String(state.volume);
  elements.speedSlider.value = String(state.speed);
  updateRecordSpeed();
  updateRepeatButton();
  bindEvents();
  render();
}

function bindEvents() {
  elements.addTracksBtn.addEventListener("click", () =>
    elements.fileInput.click(),
  );
  elements.fileInput.addEventListener("change", handleFilePick);
  elements.searchInput.addEventListener("input", handleSearch);
  elements.sortSelect.addEventListener("change", handleSortChange);
  elements.clearQueueBtn.addEventListener("click", clearQueue);
  elements.autofillQueueBtn.addEventListener("click", fillQueueFromLibrary);

  elements.playPauseBtn.addEventListener("click", togglePlayPause);
  elements.prevBtn.addEventListener("click", playPrevious);
  elements.nextBtn.addEventListener("click", playNext);
  elements.shuffleBtn.addEventListener("click", toggleShuffle);
  elements.repeatBtn.addEventListener("click", cycleRepeatMode);

  elements.volumeSlider.addEventListener("input", handleVolumeChange);
  elements.speedSlider.addEventListener("input", handleSpeedChange);
  elements.progressSlider.addEventListener("input", handleSeekInput);
  elements.progressSlider.addEventListener("change", handleSeekCommit);

  elements.audio.addEventListener("timeupdate", handleTimeUpdate);
  elements.audio.addEventListener("loadedmetadata", handleMetadataLoaded);
  elements.audio.addEventListener("ended", handleTrackEnded);

  document.addEventListener("keydown", handleKeyboard);
  window.addEventListener("dragover", handleGlobalDragOver);
  window.addEventListener("dragleave", handleGlobalDragLeave);
  window.addEventListener("drop", handleGlobalDrop);
}

function handleFilePick(event) {
  const files = Array.from(event.target.files || []);
  loadAudioFiles(files, true);
  event.target.value = "";
}

function loadAudioFiles(files, autoplayFirst) {
  const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
  if (!audioFiles.length) {
    return;
  }

  const newTracks = [];
  for (const file of audioFiles) {
    const duplicate = state.tracks.some(
      (track) => track.fileName === file.name && track.size === file.size,
    );
    if (duplicate) {
      continue;
    }

    const id = `track-${crypto.randomUUID()}`;
    const palette = buildPalette(file.name);
    const title = file.name.replace(/\.[^/.]+$/, "");
    const track = {
      id,
      title,
      fileName: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      addedAt: Date.now(),
      duration: 0,
      gradient: palette.gradient,
      labelColor: palette.labelColor,
    };
    newTracks.push(track);
    state.tracks.push(track);
    extractDuration(track);
  }

  if (!state.queue.length) {
    state.queue = state.tracks.map((track) => track.id);
  } else {
    state.queue.push(...newTracks.map((track) => track.id));
  }

  if (autoplayFirst && !state.currentTrackId && newTracks.length) {
    setCurrentTrack(newTracks[0].id, true);
  }

  render();
}

function extractDuration(track) {
  const probe = new Audio(track.url);
  probe.addEventListener("loadedmetadata", () => {
    track.duration = Number.isFinite(probe.duration) ? probe.duration : 0;
    renderLibrary();
    renderNowPlaying();
  });
}

function buildPalette(seedText) {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = seedText.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hueA = Math.abs(hash % 360);
  const hueB = Math.abs((hash * 2) % 360);
  return {
    gradient: `linear-gradient(140deg, hsl(${hueA}, 78%, 56%), hsl(${hueB}, 72%, 45%))`,
    labelColor: `hsl(${hueA}, 76%, 52%)`,
  };
}

function handleSearch(event) {
  state.search = event.target.value.trim().toLowerCase();
  renderLibrary();
}

function handleSortChange(event) {
  state.sort = event.target.value;
  renderLibrary();
}

function render() {
  renderLibrary();
  renderQueue();
  renderNowPlaying();
}

function filteredTracks() {
  let filtered = state.tracks.filter((track) =>
    track.title.toLowerCase().includes(state.search),
  );

  filtered = filtered.sort((a, b) => {
    if (state.sort === "title") {
      return a.title.localeCompare(b.title);
    }
    if (state.sort === "duration") {
      return (b.duration || 0) - (a.duration || 0);
    }
    return b.addedAt - a.addedAt;
  });

  return filtered;
}

function renderLibrary() {
  const list = filteredTracks();
  const totalDuration = state.tracks.reduce(
    (sum, track) => sum + (track.duration || 0),
    0,
  );
  elements.libraryStats.textContent = `${state.tracks.length} tracks • ${formatTime(totalDuration)}`;
  elements.emptyState.style.display = state.tracks.length ? "none" : "grid";

  elements.libraryList.innerHTML = "";
  for (const track of list) {
    const item = document.createElement("li");
    if (state.currentTrackId === track.id) {
      item.classList.add("is-active");
    }

    item.innerHTML = `
            <div class="track-swatch" style="background: ${track.gradient}"></div>
            <div class="track-main">
                <h3>${escapeHtml(track.title)}</h3>
                <p>${formatTime(track.duration)}</p>
            </div>
            <div class="mini-actions">
                <button type="button" data-action="play" data-id="${track.id}">Play</button>
                <button type="button" data-action="queue" data-id="${track.id}">Queue</button>
            </div>
        `;

    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      setCurrentTrack(track.id, false);
    });

    item.querySelector('[data-action="play"]').addEventListener("click", () => {
      setCurrentTrack(track.id, true);
    });

    item
      .querySelector('[data-action="queue"]')
      .addEventListener("click", () => {
        state.queue.push(track.id);
        renderQueue();
      });

    elements.libraryList.appendChild(item);
  }
}

function renderQueue() {
  elements.queueList.innerHTML = "";
  if (!state.queue.length) {
    const item = document.createElement("li");
    item.innerHTML = '<span class="queue-title">Queue is empty</span>';
    elements.queueList.appendChild(item);
    return;
  }

  state.queue.forEach((id, index) => {
    const track = getTrackById(id);
    if (!track) {
      return;
    }
    const item = document.createElement("li");
    item.innerHTML = `
            <span class="queue-title">${escapeHtml(track.title)}</span>
            <button type="button" data-index="${index}">Remove</button>
        `;

    item.querySelector("button").addEventListener("click", () => {
      state.queue.splice(index, 1);
      renderQueue();
    });

    elements.queueList.appendChild(item);
  });
}

function renderNowPlaying() {
  const track = getTrackById(state.currentTrackId);
  if (!track) {
    elements.nowTitle.textContent = "No Track Loaded";
    elements.nowSub.textContent = "Add a few files and hit play.";
    elements.recordLabel.style.background =
      "linear-gradient(140deg, #ef6f2c, #f79d67)";
    elements.recordLabelText.textContent = "Drop Tracks";
    elements.currentTime.textContent = "00:00";
    elements.totalTime.textContent = "00:00";
    elements.progressSlider.value = "0";
    return;
  }

  elements.nowTitle.textContent = track.title;
  elements.nowSub.textContent = `${formatTime(track.duration)} • ${track.fileName}`;
  elements.recordLabel.style.background = track.gradient;
  elements.recordLabelText.textContent = truncateLabel(track.title);

  const duration = Number.isFinite(elements.audio.duration)
    ? elements.audio.duration
    : track.duration;
  elements.totalTime.textContent = formatTime(duration);
}

function setCurrentTrack(trackId, autoplay) {
  const track = getTrackById(trackId);
  if (!track) {
    return;
  }

  state.currentTrackId = track.id;
  elements.audio.src = track.url;
  elements.audio.playbackRate = state.speed;
  elements.progressSlider.value = "0";
  elements.currentTime.textContent = "00:00";
  moveTonearm(TONEARM_START);

  renderLibrary();
  renderNowPlaying();

  if (autoplay) {
    playCurrent();
  } else {
    pauseCurrent();
  }
}

async function playCurrent() {
  if (!state.currentTrackId) {
    const firstTrack = filteredTracks()[0];
    if (firstTrack) {
      setCurrentTrack(firstTrack.id, true);
    }
    return;
  }

  try {
    await elements.audio.play();
    state.isPlaying = true;
    elements.playPauseBtn.textContent = "Pause";
    elements.record.classList.add("playing");
    updateRecordSpeed();
  } catch (_error) {
    state.isPlaying = false;
    elements.playPauseBtn.textContent = "Play";
  }
}

function pauseCurrent() {
  elements.audio.pause();
  state.isPlaying = false;
  elements.playPauseBtn.textContent = "Play";
  elements.record.classList.remove("playing");
}

function togglePlayPause() {
  if (state.isPlaying) {
    pauseCurrent();
    moveTonearm(TONEARM_REST);
    return;
  }

  moveTonearm(TONEARM_START);
  playCurrent();
}

function playNext() {
  if (!state.tracks.length) {
    return;
  }

  if (state.shuffle) {
    const randomTrack =
      state.tracks[Math.floor(Math.random() * state.tracks.length)];
    setCurrentTrack(randomTrack.id, true);
    return;
  }

  if (state.queue.length) {
    const nextId = state.queue.shift();
    renderQueue();
    setCurrentTrack(nextId, true);
    return;
  }

  const tracks = filteredTracks();
  const currentIndex = tracks.findIndex(
    (track) => track.id === state.currentTrackId,
  );
  const nextTrack = tracks[currentIndex + 1];
  if (nextTrack) {
    setCurrentTrack(nextTrack.id, true);
    return;
  }

  if (state.repeat === "all" && tracks[0]) {
    setCurrentTrack(tracks[0].id, true);
    return;
  }

  pauseCurrent();
  moveTonearm(TONEARM_REST);
}

function playPrevious() {
  const tracks = filteredTracks();
  if (!tracks.length) {
    return;
  }

  const currentIndex = tracks.findIndex(
    (track) => track.id === state.currentTrackId,
  );
  const previousTrack = tracks[currentIndex - 1] || tracks[0];
  setCurrentTrack(previousTrack.id, true);
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  elements.shuffleBtn.textContent = state.shuffle ? "Shuffle On" : "Shuffle";
}

function cycleRepeatMode() {
  if (state.repeat === "off") {
    state.repeat = "one";
  } else if (state.repeat === "one") {
    state.repeat = "all";
  } else {
    state.repeat = "off";
  }
  updateRepeatButton();
}

function updateRepeatButton() {
  const label =
    state.repeat === "off"
      ? "Repeat Off"
      : state.repeat === "one"
        ? "Repeat One"
        : "Repeat All";
  elements.repeatBtn.textContent = label;
}

function clearQueue() {
  state.queue = [];
  renderQueue();
}

function fillQueueFromLibrary() {
  state.queue = filteredTracks().map((track) => track.id);
  renderQueue();
}

function handleTimeUpdate() {
  const duration = elements.audio.duration || 0;
  const current = elements.audio.currentTime || 0;
  elements.currentTime.textContent = formatTime(current);
  elements.totalTime.textContent = formatTime(duration);

  if (!state.isSeeking && duration > 0) {
    elements.progressSlider.value = ((current / duration) * 100).toFixed(2);
  }

  const progress = duration > 0 ? current / duration : 0;
  const angle = TONEARM_START + progress * (TONEARM_END - TONEARM_START);
  moveTonearm(angle);
}

function handleMetadataLoaded() {
  renderNowPlaying();
}

function handleTrackEnded() {
  if (state.repeat === "one") {
    elements.audio.currentTime = 0;
    playCurrent();
    return;
  }
  playNext();
}

function handleVolumeChange(event) {
  state.volume = Number(event.target.value);
  elements.audio.volume = state.volume / 100;
  localStorage.setItem("vinyl-player-volume", String(state.volume));
}

function handleSpeedChange(event) {
  state.speed = Number(event.target.value);
  elements.audio.playbackRate = state.speed;
  localStorage.setItem("vinyl-player-speed", String(state.speed));
  updateRecordSpeed();
}

function updateRecordSpeed() {
  const speed = Math.max(0.6, 1.8 / state.speed);
  document.documentElement.style.setProperty(
    "--record-speed",
    `${speed.toFixed(2)}s`,
  );
}

function handleSeekInput(event) {
  state.isSeeking = true;
  const duration = elements.audio.duration || 0;
  const previewTime = (Number(event.target.value) / 100) * duration;
  elements.currentTime.textContent = formatTime(previewTime);
}

function handleSeekCommit(event) {
  const duration = elements.audio.duration || 0;
  const nextTime = (Number(event.target.value) / 100) * duration;
  elements.audio.currentTime = nextTime;
  state.isSeeking = false;
}

function handleKeyboard(event) {
  if (event.target.tagName === "INPUT" || event.target.tagName === "SELECT") {
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayPause();
  }
  if (event.code === "ArrowRight") {
    playNext();
  }
  if (event.code === "ArrowLeft") {
    playPrevious();
  }
}

function handleGlobalDragOver(event) {
  event.preventDefault();
  elements.dropOverlay.classList.add("active");
}

function handleGlobalDragLeave(event) {
  if (event.relatedTarget || event.clientX > 0 || event.clientY > 0) {
    return;
  }
  elements.dropOverlay.classList.remove("active");
}

function handleGlobalDrop(event) {
  event.preventDefault();
  elements.dropOverlay.classList.remove("active");
  const files = Array.from(event.dataTransfer?.files || []);
  loadAudioFiles(files, true);
}

function moveTonearm(angle) {
  elements.tonearm.style.transform = `rotate(${angle}deg)`;
}

function getTrackById(trackId) {
  return state.tracks.find((track) => track.id === trackId) || null;
}

function truncateLabel(text) {
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
