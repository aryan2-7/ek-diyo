# Ek Diyo: one diya, five days

A paper-cut browser game about **Tihar**, the Nepali festival of lights. You carry one diya
through the five days of the festival. Every night one more wick joins the flame, one more voice
joins the music, and the diya's light is the only way to see.

Made for the **KUCC Tihar-Chhath Web UI Contest 2026** (Kathmandu University Computer Club).
Around seven minutes start to finish. Runs in any modern browser, desktop or phone (landscape).

| Night | Festival day | What you do |
|------:|--------------|-------------|
| 1 | Kaag Tihar (crows) | Light offering plates on the rooftop and feed five crows before dusk fades. Gusts blow plates out unless you shield them; a golden crow counts double |
| 2 | Kukur Tihar (dogs) | Run the street as the guard dog: jump the pots, gather the marigold garlands, reach the gate |
| 3 | Gai Tihar & Laxmi Puja | Keep four lamps burning until midnight (stand beside one to refill and shield it), garland the cow. Laxmi's golden footprints walk as far as your lamps lit the way |
| 4 | Govardhan Puja | Stack the annakut hill of offerings from a swinging rope and crown it with the maha-deep |
| 5 | Bhai Tika | Garland your brother, offer Yama dry fruits, repeat Yamuna's colours, then swipe down his forehead to lay the tika (a yellow bar with six blossoms of colour) |

## Controls

| | Desktop | Phone / tablet |
|---|---|---|
| Nights 1 and 3 (walk) | Arrow keys / WASD, or click and drag | Touch and drag |
| Night 2 (run) | Space / W / Up, or click. Hold for a higher jump | Tap anywhere |
| Night 4 (annakut stacking) | Click / tap / Space to drop the swinging offering | Tap to drop |
| Night 5 (ritual) | Drag the garland and the plate (Space does it for you); click a powder or press 1 to 7; swipe down the forehead (or hold Space / the down arrow) | Drag, tap, swipe |
| Anywhere | `P` pause, `Esc` settings (in full screen the browser keeps Esc: use `P` for pause), `M` sound, `F` full screen. In menus: arrow keys or W / S, Enter | Icons at the top |

Settings (gear icon on the title, or in the pause menu): music and effects volume, picture quality,
reduce motion, full screen at start, **Unlock levels and playthrough** (auto-play and fast-play in every level), and **Reset saved progress** (from the title).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (works from any sub-path)
npm run preview    # serve the production build locally
npm run smoke      # optional: boots every scene in a headless browser and fails on console errors (needs: pip install playwright && playwright install chromium)
```

`dist/` is plain static files: upload it to GitHub Pages, Netlify, Vercel, or any web server.
(It must be served over http; opening `index.html` straight from disk will not load the ES modules.)

**Link previews:** `og:image` needs an absolute URL. On Vercel it is filled in automatically; anywhere else build with
`VITE_SITE_URL=https://your-site npm run build`. The preview picture is `public/og.jpg` (1200x630).

### Handy test URLs

| URL | Opens |
|-----|-------|
| `?night=3` | Jump straight into Night 3 (works for 1 to 5) |
| `?card=2` | The story card shown after Night 2 (`card=0` is the prologue) |
| `?scene=Ending` | The ending screen |
| `?nofull` | Do not go full screen on the first tap (also a setting) |
| `?unlock` | Open every night on the title screen (also a switch in Settings) |
| `?quality=low` / `?quality=high` | Force a picture quality for this visit |
| `?debug` | Exposes `window.__game` and `window.__dbg` for poking around in the console |

## Project layout

```
index.html            page shell (fonts are bundled, nothing is loaded from a CDN)
vite.config.js        build config; fills in the absolute og:image URL
src/
  main.js             boots Phaser, registers scenes
  config.js           canvas size (1280x720), palette, fonts
  state.js            save system (unlocked nights, best results, star ratings, mute) in localStorage
  data/
    nights.js         ALL story text, goals and card content: edit copy here (also the music layer per night)
    credits.js        the credits screen: fill in "Special thanks"
    assets.js         list of images (CORE_ASSETS load first, the rest in the background)
  systems/
    Lighting.js       the dark overlay with soft light holes (the core visual idea; drawn at half resolution)
    Flame.js          paper-cut flame, multi-wick diya (DiyaRig) and flame cluster
    Keeper.js         the player character (walking, footsteps, carrying the diya)
    textures.js       textures drawn in code: light, flame, wick, petals, gate, star
    sfx.js            sound engine: effects, reverb, volumes, muffle on pause; real files can replace any effect
    music.js          the generated score: five layers (one more per wick); real loops can replace it (docs/AUDIO.md)
    quality.js        high / low picture quality and the automatic drop on slow devices
    render.js         draws at 1.5x or 2x on big or sharp screens, so text stays crisp
    settings.js       player settings (volumes, quality, reduce motion, unlock all)
    ambience.js       window glows, birds, fireflies, pointer parallax
    album.js          pictures taken at each win (story cards, album, greeting card)
    loading.js        flag for the background art loader
  ui/
    ui.js             text, paper buttons, banners, paper-wipe transitions, HUD icons
    greeting.js       the Shubha Tihar greeting-card maker (HTML overlay)
    draw.js           a paper-cut flame drawn on a 2D canvas (greeting card, Day 4 card)
  scenes/
    Preload, BgLoad, Title, StoryCard, Night1 ... Night5, Ending, Pause, Settings, Credits, Album
public/assets/        game-ready .webp files (generated, committed)
public/audio/         optional real audio + manifest.json (empty = built-in synthesized sound)
art-source/           original generated art goes here (not committed, see below)
tools/                process_assets.py (art), smoke_test.py (headless check), font subsetting
docs/                 asset manifest, design notes, things to verify, audio guide, next steps
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
`Night3.js` (`DURATION`, `REFILL`, burn rates, gust timing), `Night4.js` (`DROP`, `NEED`, `LEAN_MAX`, `ROPE_L`),
`Night5.js` (`ROUNDS`, `MAX_MISTAKES`, `TIME_LIMIT`, `TASK_BONUS`).

## Credits and licences

* Code: MIT (see `LICENSE`). Phaser 3 (MIT), Vite (MIT).
* Fonts: Yatra One and Kalam, SIL Open Font License, bundled through `@fontsource`.
* Music and sound: synthesized in the browser (no audio files, no licences to track).
* Illustrations: generated paper-cut art supplied by the author. Check the contest rules on
  AI-generated art and disclose it if required (the credits screen already says so). The art is not covered by the MIT licence.
