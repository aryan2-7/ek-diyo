# What is still open

See `docs/NEXT_STEPS.md` for the full list with how-tos and prompts. In short:

**Needed from you**
- [ ] Test on a real phone (landscape) and a mid-range laptop: every check so far ran in a headless browser with software rendering.
- [ ] Verify the festival facts in `docs/CONTENT_TO_VERIFY.md` (including the two new lines in Nights 3 and 5).
- [ ] Fill in "Special thanks" in `src/data/credits.js`; check the contest rules about AI-generated art.
- [ ] Remove the dead dog frames: `git rm public/assets/dog_gait_*.webp public/assets/dog_gal_*.webp`
- [ ] Check the shipped music loop (`public/audio/looper_tihar.ogg`); the generated score is the fallback and effects are synthesized (`docs/AUDIO.md`).

**Art that would help (all optional, placeholders work)**
- [ ] Family / villager figures for the Night 4 procession (currently the Keeper picture, tinted and small).
- [ ] A "worn garland" overlay for Night 5 (currently the flat garland picture).
- [ ] Golden footprint art for Night 3 (currently drawn in code as `footprint`).
- [ ] Keeper walking frames, crow eating pose, Yama step-in pose, small illustrations for each story card.

**Not built (ideas)**
- [ ] Nepali language toggle (all copy is in `src/data/nights.js`).
- [ ] A short Chhath epilogue, if the contest rubric counts both festivals.
- [ ] A monkey rival on the Night 1 rooftop.
