# What is not done, and how to do it

Everything below was left out on purpose: it needs art, audio, a real device or a person, or it was too big to do safely.
Where a feature needs a new asset, the game already has a placeholder so nothing is broken in the meantime.

## 1. Things only you can do (about an hour)

1. **Test on a real phone and a mid-range laptop.** Turn the phone sideways, play all five nights, watch for lag (Settings > Picture quality > Low helps) and for text that is too small.
   Everything was checked in a headless browser with software rendering, which cannot judge real speed or touch feel.
2. **Verify the festival facts** (`docs/CONTENT_TO_VERIFY.md`) with someone at home. Edit the text in `src/data/nights.js`.
3. **Credits** (`src/data/credits.js`): "Special thanks" names Claude, Gemini and ChatGPT; add your playtesters if you like. Check the contest rule on AI-generated art.
   Also: the Day 5 story card still says "a tika of seven colours" while the game's tika now has six (as in your reference). Change the card text in `src/data/nights.js` if you want them to agree.
4. **Remove dead files:** `git rm public/assets/dog_gait_*.webp public/assets/dog_gal_*.webp` (16 images, 0.7 MB, never loaded).
5. **Deploy and look at the link preview.** On Vercel `og:image` is automatic. Elsewhere build with `VITE_SITE_URL=https://your-site`. Paste the link into WhatsApp/Discord to check `public/og.jpg`.
6. **Listen to the music** (`public/audio/looper_tihar.ogg`, or just play the game). Check the loop point and the volume across the five wicks (`TRACK_VOL` / `cutoff` in `src/systems/music.js`). The built-in synthesized score is only the fallback; if you switch to it, its layers are tuned with `LAYER_VOL`. See `docs/AUDIO.md`.

## 2. Assets to generate (each has a placeholder in code today)

| Asset | Placeholder now | How to replace |
|---|---|---|
| **Family figures** for the Night 4 procession | the Keeper picture, tinted dark and small (`parikrama` in `Night4.js`) | Generate 3 small paper-cut figures walking toward the viewer carrying diyas, magenta background, ids `villager_a/b/c`. Add them to `MANIFEST` in `tools/process_assets.py` and `src/data/assets.js`, then use `'villager_a'` etc. instead of `'keeper'` in `parikrama()` |
| **Worn garland** on the brother in Night 5 | the flat garland picture placed on his shoulders (`taskDone` in `Night5.js`) | A garland drawn as a "U" around a neck, transparent middle, id `keeper_mala`; swap the key in `taskDone` |
| **Golden footprint** in Night 3 | drawn in code (`makeFootprint` in `Night3.js`) | A golden lotus footprint, id `footprint` (add it to `assets.js`): `makeFootprint` skips drawing when the texture exists |
| Keeper walking frames, crow eating pose, Yama step-in pose, card illustrations | squash-and-hop, tilt, slide, reused sprites | see `docs/ANIMATION_PROMPTS.md` and `docs/TODO.md` |
| Replacement music or real effects | the shipped `looper_tihar.ogg` track and synthesized effects | `docs/AUDIO.md` |

## 3. Not built

* **Nepali / English toggle.** Plan: put every string through one `t()` helper (`src/ui/ui.js text()` is the single entry point for in-game text), keep a Nepali dictionary keyed by the English string, load the full Devanagari fonts only when Nepali is chosen
  (`@fontsource/kalam/devanagari-400.css`, `@fontsource/yatra-one/devanagari-400.css`; the tiny subset used now only has a few words), and have a Nepali speaker check every line. About half a day.
* **A short Chhath epilogue** (a river at sunrise, a bamboo soop with offerings). Only worth it if the contest rubric scores both festivals: re-read the rules first.
* **A monkey rival on the Night 1 rooftop** that sneaks onto lit plates and is scared off by your light. Needs a monkey sprite (paper-cut, side view, two poses).
* **Offline / installable play.** The manifest and icons are there (Add to Home Screen works); a service worker was left out on purpose because a stale cache can hide a fresh deploy during judging.
* **Parallax layers** from the painted backgrounds: needs the artwork split into sky / buildings / ground (regenerate each night's background as layers).

## 4. Known limits

* The 16:9 canvas is letterboxed on phones (about half size on a 19.5:9 screen). Fullscreen and Add to Home Screen help; text in the story cards is small there.
* `renderer.snapshot` (the album pictures) logs a harmless "GPU stall" warning in some browsers.
* Browsers allow sound and full screen only after a tap or key press, so the title shows a "tap to begin" screen: that one tap starts the music and goes full screen.
* Full screen is not available on iPhones (no browser support); "Add to Home Screen" gives the same effect there.
