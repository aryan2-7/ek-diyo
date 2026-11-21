# Audio

The game ships with a finished music track, and still works if it cannot be loaded:

* `public/audio/looper_tihar.ogg` is the music you hear. It loops through the whole game, quiet and a little muffled on the title, then louder and brighter as each wick is lit. It is listed as `music.track` in `public/audio/manifest.json`.
* `src/systems/sfx.js`: effects (caw, bark, chime, footsteps...), reverb, volume sliders, muffle while paused.
* `src/systems/music.js`: the built-in fallback score, synthesized in the browser (G major pentatonic, ~75 bpm, in **five layers**: 1 tanpura drone + soft bells, 2 bansuri flute, 3 madal pulse, 4 choir pad, 5 shimmering bells). One more layer joins as each wick is lit (`NIGHT_LEVEL` in `src/data/nights.js`: Title 1, Night 1 = 2, Night 2 = 3, Nights 3 and 4 = 4, Night 5 and the ending = 5). The track takes its place; the two never play together.

If the track is missing or cannot be decoded, the generated score plays instead. Effects stay synthesized. A 30 second render of the generated full mix (`audio-preview.wav`) was sent along with an earlier patch; it is not committed (4 MB).

## One finished track (the quick way)

Put an audio file in `public/audio/` and set `"track"` in `public/audio/manifest.json` (it currently points at `audio/looper_tihar.ogg`). The name must match the file exactly; an empty name asks for no file, so nothing is fetched and the generated score plays. Check the loop point (a track that fades out sounds odd when it repeats). The file is part of the page, so anyone who opens the hosted game can download it. Track volume and brightness per wick are set in `Music.setLevel` (`TRACK_VOL`, `cutoff` in `src/systems/music.js`).

## Using real recordings

For effects or five matching stems, list them in `public/audio/manifest.json`. Anything not listed stays synthesized. Stems win over a single track if both are given. To go back to the generated score, remove the `track` name.

```json
{
  "sfx": { "caw": "audio/caw.ogg", "bark": "audio/bark.ogg", "cowbell": "audio/cowbell.ogg" },
  "music": { "stems": ["audio/stem_1.ogg", "audio/stem_2.ogg", "audio/stem_3.ogg", "audio/stem_4.ogg", "audio/stem_5.ogg"] }
}
```

* **Effect names** are the methods of `Sfx`: click, chime, caw, flap, light, jump, land, collect, hit, yelp, bark, slide, paper, whoosh,
  note, fanfare, bell, fail, step, cowbell, footprint, shimmer, perfect, tick. Short `.ogg` or `.mp3` files are fine.
* **Music stems**: five loops of exactly the same length (30 to 90 s), exported from the same session so they sync:
  stem 1 = drone only, stem 2 = drone + flute, and so on (or each layer alone: the game adds them together as the layers join).
  Loop-friendly `.ogg` works in every browser; `.mp3` can add a tiny gap at the loop point.
* Free sources: check the licence of every file, credit it in `src/data/credits.js`, and keep a note of where it came from.
  If you use an AI music tool, check the contest rules and the tool's licence for hosted games.
* Test: open the game with `?debug`, then in the console `__dbg.Sfx.caw()` or `__dbg.Music.mode()` (should say `track`).
