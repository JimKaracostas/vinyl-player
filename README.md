# 🎵 Vintage Vinyl Player

A nostalgic, browser-based audio player that brings the tactile experience of a physical turntable to your digital music collection. Built with vanilla HTML, CSS, and JavaScript, it features realistic tonearm mechanics, pitch control, and procedurally generated album art.

## ✨ Features

  * **Realistic Mechanics:**
      * **Tonearm Physics:** The arm lifts, moves to the record, tracks inward as the song plays, and returns to rest automatically.
      * **Needle Drop Logic:** Audio playback waits until the needle physically hits the record groove.
      * **Spinning Platter:** Visual feedback varies based on playback state and pitch speed.
  * **Audio Controls:**
      * **Pitch/Speed Slider:** Adjust playback speed from 0.8x to 1.2x (Vertical slider).
      * **Master Volume:** Analog-style volume control.
      * **Transport:** Play, Pause, Next, Previous, and Shuffle.
  * **Library Management:**
      * **Drag & Drop:** Drop audio files anywhere on the page or directly onto the platter.
      * **Procedural Album Art:** Unique color gradients are generated for every track based on the filename—no external images required.
      * **Metadata Reading:** Automatically extracts song titles and durations.
  * **Aesthetics:**
      * **CSS-Only Textures:** Wood grain, brushed metal, and vinyl grooves created entirely with CSS gradients (no image assets).
      * **Warm Lighting:** Toggleable power indicator and realistic shadows.

## 🚀 Getting Started

No build tools, frameworks, or backend servers are required. This is a pure client-side application.

### Prerequisites

  * A modern web browser (Chrome, Firefox, Safari, Edge).
  * Local audio files (`.mp3`, `.wav`, `.ogg`, etc.).

### Installation

1.  **Clone or Download** the repository.
2.  Ensure you have the following file structure:
    ```text
    /vinyl-player
    ├── index.html
    ├── style.css
    ├── script.js
    └── README.md
    ```
3.  **Open `index.html`** in your browser.

## 🎮 How to Use

1.  **Add Music:** \ Click the "ADD RECORDS" button in the bottom shelf area.
      * *Or* drag and drop a folder of MP3s anywhere onto the screen.
2.  **Play a Record:**
      * Click a record sleeve from the bottom shelf.
      * *Or* drag a sleeve from the shelf and drop it onto the turntable platter.
3.  **Control Playback:**
      * Click the **Play/Pause** button or press `Spacebar`.
      * Use the **Pitch Slider** (vertical fader) to speed up or slow down the track like a DJ.

## 🛠️ Technical Highlights

  * **Tonearm Tracking:** The rotation of the tonearm is calculated dynamically based on the `currentTime` and `duration` of the HTML5 Audio element.
  * **Procedural Colors:** The `generateColorFromTitle` function hashes the filename string to produce consistent HSL color values, ensuring every song gets a unique but consistent album cover.
  * **Blob URLs:** Audio files are loaded using `URL.createObjectURL()`, allowing local file playback without uploading data to a server.

## 🔮 Future Roadmap

  * [ ] Mobile touch gesture support for scratching.
  * [ ] Audio visualizer (VU meters).
  * [ ] LocalStorage support to remember your playlist between sessions.
  * [ ] ID3 Tag reading for real album art support.

## 📄 License

This project is open source and available under the [MIT License](https://www.google.com/search?q=LICENSE).
