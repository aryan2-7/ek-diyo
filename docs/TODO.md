# What is still open

**Needed from you**
- [ ] Audio (optional but it would lift the whole game): a gentle looping festival theme (bells/flute/sarangi, ~60-90 s loop),
      plus real SFX if wanted: caw, bark, wind gust, chime. The synthesized kit in `systems/sfx.js` is a placeholder
      with the same method names, so recorded files can drop in.
- [ ] Verify the festival facts in `docs/CONTENT_TO_VERIFY.md`.
- [ ] Check the contest rules about AI-generated art and add a credit line if required.
- [ ] Test on a real phone (landscape) and a mid-range laptop: all checks so far ran in a headless browser with software rendering.

**Art that would help (all optional, current art works)**
- [ ] Dog: a third gallop pose (the run is currently two poses alternating with a bob).
- [ ] Keeper: two walking frames for each direction (he currently squashes and hops while walking).
- [ ] Crow: an eating / head-down pose for Night 1 (currently a tilt animation).
- [ ] Yama: a step-in pose for Night 5 (currently slides in); a smiling pose exists (`yama_pleased`).
- [ ] Small illustrations for each story card (cards currently reuse a character sprite).
- [ ] `makhamali_mala` is loaded but unused: could decorate Night 3 or the title.

**Code ideas**
- [ ] Night select with best scores on the title screen.
- [ ] Pause menu (Esc) and a volume slider.
- [ ] Nepali language toggle (all copy is in `src/data/nights.js`).
