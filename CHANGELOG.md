# Changelog

## Unreleased: playtest fixes

* Sound on by default (unlocks on first tap/key, always unmuted at start of a visit)
* Five-wick lamp art on story cards and the ending; in-game diyas keep the old art
* Night 1: walk area limited to the floor. Night 3: only bg_n3, lamps on the floor, player kept in the yard, garlanded cow art after the first garland
* Night 2: higher jump, more varied obstacle spacing, a little more tilt in the air
* Night 4: star corners joined, single flame as the cursor
* Night 5: three slips, Yama visible from the start, no pause before you can tap

## 0.1.0 (2026-11-05): first complete build

* All five nights playable, with prologue, story cards after every night and an ending
* Shared engine: dark-overlay lighting, paper-cut flames, multi-wick diya (one more wick each night)
* Art pipeline: magenta chroma-key to WebP (`tools/process_assets.py`), 29 assets, ~2 MB total
* Synthesized sound effects and ambient temple-bell loop (placeholder for recorded audio)
* Keyboard, mouse and touch controls, landscape-only hint on phones, progress saved in localStorage
