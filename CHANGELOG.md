# Changelog

## 0.4.0 (2026-11-20): a somewhat shorter game, and finishing touches

**Length (Nights 1 to 3 trimmed; Nights 4 and 5 unchanged)**

* **Night 1:** still five crows to feed, with 45 s of dusk instead of 55 s. Plates now come on a slow 3 to 4 s beat (they used to be replaced two at a time), at most 3 on the roof at once and never more than the crows still needed plus two spare, so about seven birds appear for the five that must eat (`SPARE_PLATES`, `SPAWN_GAP`). The golden crow is the third one sent, gusts come a little less often, and the flame rating counts spare dusk out of 45 s (3 flames at 16 s or more, 2 at 8 s or more; the old bars were out of reach)
* **Night 2:** 35 garlands instead of 45 (`GARLAND_GOAL`), about 31 s of running and 8 jumps instead of about 38 s and 11
* **Night 3:** 36 s until midnight instead of 45 s, and the garlands come on a fixed rhythm: the first at 3 s and each next one 5 s after the last is given, so even a slow player gets at least three

**Fixes**

* **Night 2 auto mode** no longer runs into every obstacle. It used to jump when the obstacle was a fixed 460 px away, but a leap lasts about a second (about 430 px of running), so the dog landed on it (8 to 10 stumbles a run). It now jumps when the obstacle is half a leap ahead, and treats a close pair as one jump
* All timed nights now pause by themselves when the window or tab loses focus (alt-tab, a phone notification, switching apps), instead of running on while the player is away
* **Title:** with saved progress and the story not yet finished, the main button is "Continue · Night N" (Enter or Space), with "Begin again" above it. A first-time player still sees "Begin"
* **Failed downloads:** a picture that fails to load (flaky connection) is retried quietly. If the background art still will not load, choosing Begin or a night shows "Some pictures did not load" with Try again and Play anyway. If the title's own pictures fail, the loading screen retries and then offers a reload, instead of silently showing blank boxes

**Music**

* A single finished track can now replace the generated score: put the file in `public/audio/` and set `music.track` in `public/audio/manifest.json` (details in `docs/AUDIO.md`). It loops, and gets louder and brighter as the wicks are lit. With no file, the generated score plays as before

**Finishing touches**

* **Ending:** the closing words and your five results now sit on a paper card, so they read on any part of the picture; the buttons are one even column (Credits is a real button now, not a faint link) and no longer collide with the results line
* **Credits:** the card is sized to its text with an even margin (it used to run nearly edge to edge with Close sitting on its border), has a title and a row of five lights, balanced line breaks, a settle-in, and closes with Esc, Enter or Space
* Night 5: the "Doing well? Try a wrong colour" hint no longer sits on top of Yama's mistake counter; it is centred under the status banner. The lose screen now counts the tika's colours properly (the bar plus one blossom per round, out of 7)

## 0.3.0 (2026-11-09): polish pass

* **Ending:** the five wicks are lit one by one (each with a note), the glow grows, the town's windows light up, marigold petals fall, then the title and the buttons arrive
* **Keyboard menus:** arrow keys or W / S move a highlight over the pause menu, the lose screen and the ending buttons; Enter or Space presses it (a short pause on the lose screen, so a held jump key cannot retry by accident)
* **Pause menu** now reminds you of the controls of the night you are in
* **Day 4 story card** has its own picture: the hill of offerings from the game, with the maha-deep on top
* **Phones:** buttons grow so they are easy to hit, and the keyboard hints are hidden where there is no keyboard
* **Settings:** "Reset saved progress" (from the title screen; asks twice)
* **Small things:** a soft tick when hovering buttons, a PNG favicon, "best with headphones" on the first screen, a 2x canvas only on machines with 8 or more cores (1.5x otherwise), no accidental text selection while playing, and a "Something went wrong / Reload" note if the game ever throws an error instead of freezing silently
* Clean-up: the unused `makhamali_mala` picture is no longer loaded, `Album.captureLamp` and an unused constant are gone

## 0.2.1 (2026-11-09): your feedback

* **Sharper everything:** the game now draws at 1.5x or 2x when the screen can show it (fullscreen on a 1080p screen, retina laptops), so text and the icons in the corner are crisp. Small windows and "low" quality still draw at 1x. See `src/systems/render.js`
* **Title:** the "Nights" label, the Devanagari line and the key hints sit on paper labels (readable, no longer clipped); a "tap to begin" first screen; the first tap or key also goes full screen and starts the music at once; the hint shows how to leave full screen
* **Full screen by default** (browsers only allow it after a tap, so it happens on the first tap); Settings > "Full screen at start" turns it off. `?nofull` skips it
* **Music** starts on the first tap with no delay, and keeps playing when the tab or window is in the background
* **Open every night** now takes effect as soon as Settings closes (no refresh)
* **Night 2:** exactly 67 garlands in the whole run (`GARLAND_GOAL`), about a minute; the counter shows `x/67`, the last garlands come as one wave, then the gate
* **Night 3:** the garland can be picked up from a much wider area (feet and body)
* **Night 5:** the numbered powders work from the keyboard (the 1-7 keys never fired before: Phaser names them ONE, TWO...), also on the keypad; a proper U-shaped garland drawn in code; the tika now looks like the real one (a yellow bar with six blossoms: red, purple, pink, green, red, white), six rounds, and the close-up is a swipe *down* the forehead
* **Greeting card:** the lamp is drawn on its own (no screen text in it), no overlaps, saved at 1080 x 1350
* **Credits:** Special thanks now names Claude, Gemini and ChatGPT

## 0.2.0 (2026-11-09): audit pass

**Sound**
* New sound engine: reverb, volume sliders, music ducks under story cards, everything muffles when paused, stereo caws
* A generated score of five layers (tanpura drone, bansuri flute, madal pulse, choir pad, shimmering bells); one more layer joins as each wick is lit
* New effects: footsteps, cow bell, footprints, shimmer, "steady" chime. iPhone silent-switch fix. Real audio files can replace any of it (`docs/AUDIO.md`)

**Phones, speed, packaging**
* Bigger touch targets, HUD icons grow on small screens, fullscreen button, landscape request with an animated phone, installable (manifest, icons)
* Light overlay at half resolution; "low" quality (no bloom or colour grade, fewer particles) chosen automatically when the frame rate sags; Settings > Picture quality
* Title screen appears after four images; the rest loads in the background. Unused `house_a` / `house_b` no longer loaded
* Absolute `og:image` (automatic on Vercel), `public/og.jpg`, boot text instead of a blank page, stale docs refreshed
* `?unlock` / Settings > Open every night for reviewers; Enter or Space starts the game on the title

**Screens**
* Settings, Credits, "Your five nights" album, and a Shubha Tihar greeting-card maker (save or share a PNG)
* Torn-paper scene transitions; flame ratings (1 to 3) under each night on the title, visible on touch
* Title: text no longer collides with the stupa and pagoda, flickering windows, birds, fireflies, pointer parallax
* Story cards: art and button no longer touch the paper edge, text always fits (picture shrinks first, then type), polaroid of your win
* Ending: layout fixed, album and card buttons, credits link

**Nights**
* Keeper: smaller flame (it covered his face), footsteps with dust
* Night 1: darker start, gusts that blow plates out unless you stand beside them, a rare golden crow
* Night 2: brighter street, the diya floats beside the dog, bunting and cobbles scroll faster than the street (depth)
* Night 3: harder lamps (faster burn, slower refill, shielding), blow-outs late in the night, visible garland, the cow turns see-through over the Keeper, Laxmi's golden footprints as the finale
* Night 4: the offering hangs from a rope and swings in an arc, the Keeper watches and cheers, "Steady" streaks, the family walks round the hill at the end
* Night 5: garland to place, dry fruits for Yama (forgives a slip), longer sequences, Yama's shadow creeps across the floor, the tika close-up (swipe) as the climax, flames readable on the shawl

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
