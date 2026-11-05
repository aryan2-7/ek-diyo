# The Five Nights: one diya, five days

A paper-cut browser game about **Tihar**, the Nepali festival of lights. You carry one diya
through the five days of the festival. Every night one more wick joins the flame, and the diya's
light is the only way to see.

Made for the **KUCC Tihar-Chhath Web UI Contest 2026** (Kathmandu University Computer Club).
About 10 minutes start to finish. Runs in any modern browser, desktop or phone (landscape).

| Night | Festival day | What you do |
|------:|--------------|-------------|
| 1 | Kaag Tihar (crows) | Light offering plates on the rooftop and feed ten crows before dusk fades |
| 2 | Kukur Tihar (dogs) | Run the street as the guard dog: jump the pots, gather marigold garlands, reach the gate |
| 3 | Gai Tihar & Laxmi Puja | Keep four house-lamps burning until midnight, garland the cow for a blessing |
| 4 | Mha Puja | Trace a mandala line by line with the light of your diya |
| 5 | Bhai Tika | Repeat Yamuna's colours to finish the seven-colour tika before Yama arrives |

## Controls

| | Desktop | Phone / tablet |
|---|---|---|
| Nights 1 and 3 (walk) | Arrow keys / WASD, or click and drag | Touch and drag |
| Night 2 (run) | Space / W / Up, or click. Hold for a higher jump | Tap anywhere |
| Night 4 (mandala) | Click and drag (or hold Space + arrow keys) | Touch and drag |
| Night 5 (tika) | Click a powder, or press 1 to 7 | Tap a powder |
| Anywhere | `M` sound on/off, `F` fullscreen | |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (works from any sub-path)
npm run preview    # serve the production build locally
```

`dist/` is plain static files: upload it to GitHub Pages, Netlify, Vercel, or any web server.
(It must be served over http; opening `index.html` straight from disk will not load the ES modules.)

### Handy test URLs

| URL | Opens |
|-----|-------|
| `?night=3` | Jump straight into Night 3 (works for 1 to 5) |
| `?card=2` | The story card shown after Night 2 (`card=0` is the prologue) |
| `?scene=Ending` | The ending screen |
| `?debug` | Exposes `window.__game` for poking around in the console |

## Project layout

```
index.html            page shell (fonts are bundled, nothing is loaded from a CDN)
src/
  main.js             boots Phaser, registers scenes
  config.js           canvas size (1280x720), palette, fonts
  state.js            tiny save system (unlocked nights, mute) in localStorage
  data/
    nights.js         ALL story text, goals and card content: edit copy here
    assets.js         list of images to load
  systems/
    Lighting.js       the dark overlay with soft light holes (the core visual idea)
    Flame.js          paper-cut flame, multi-wick diya (DiyaRig) and flame cluster
    Keeper.js         the player character (walking, carrying the diya)
    textures.js       textures drawn in code: light, flame, wick, petals, gate, star
    sfx.js            synthesized sound kit + ambient bells (swap for real audio later)
  ui/ui.js            text, paper buttons, banners, transitions, paper grain
  scenes/
    Preload, Title, StoryCard, Night1 ... Night5, Ending
public/assets/        game-ready .webp files (generated, committed)
art-source/           original generated art goes here (not committed, see below)
tools/process_assets.py   turns art-source/ into public/assets/
docs/                 asset manifest, design notes, things to verify, to-do list
```

## Art pipeline

The generated illustrations are on a flat magenta (`#FF00FF`) background. `tools/process_assets.py`
removes the magenta (soft edges and colour-spill cleanup), trims, resizes and writes WebP files.

```bash
pip install -r tools/requirements.txt
# put the original art in art-source/  (any sub-folders; files named <asset id>.jpeg or .png)
npm run assets                      # all assets
python3 tools/process_assets.py cow # just one
```

To add an asset: drop the file in `art-source/`, add one line to `MANIFEST` in
`tools/process_assets.py`, add its id to `src/data/assets.js`, run `npm run assets`.
The raw art (about 57 MB) is deliberately **not** in git; keep your original zip safe.

## Tuning the game

Each night has a block of constants at the top of its scene file (duration, speeds, goals):
`Night1.js` (`DURATION`, `GOAL`, `MAX_PLATES`), `Night2.js` (`TRACK`, speeds, jump),
`Night3.js` (`DURATION`, drain rate, gust timing), `Night4.js` (`HIT`, `NEED`),
`Night5.js` (`ROUNDS`, `MAX_MISTAKES`, `TIME_LIMIT`).

## Credits and licences

* Code: MIT (see `LICENSE`). Phaser 3 (MIT), Vite (MIT).
* Fonts: Yatra One and Kalam, SIL Open Font License, bundled through `@fontsource`.
* Illustrations: generated paper-cut art supplied by the author. Check the contest rules on
  AI-generated art and disclose it if required. The art is not covered by the MIT licence.
