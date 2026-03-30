# vinyl-player

vinyl-player is now a full browser app, not just a static turntable scene. It keeps the vinyl experience at the center with a spinning record deck and tonearm, while adding a modern three-panel workspace for local audio playback.

## Features

- App-like layout with responsive desktop/mobile behavior.
- Search and sorting for your local track library.
- Queue management with add, remove, clear, and autofill actions.
- Playback controls: play/pause, previous, next, shuffle, repeat modes.
- Timeline scrubbing with current/total time display.
- Volume and speed controls with saved preferences in local storage.
- Drag-and-drop file ingestion anywhere on the page.
- Procedural artwork colors generated from filenames.
- Animated vinyl record and tonearm behavior tied to playback progress.

## Getting Started

1. Open index.html in a modern browser.
2. Click Add Tracks or drag audio files onto the app.
3. Use Play, Queue, and transport controls to run your session.

## Keyboard Shortcuts

- Space: Play/Pause
- Right Arrow: Next track
- Left Arrow: Previous track

## Notes

- Tracks are read locally in the browser using blob URLs.
- Audio files are never uploaded to a server.
