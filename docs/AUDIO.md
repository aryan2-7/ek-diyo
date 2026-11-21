# Audio

The game makes all of its sound itself (Web Audio), so it works with no audio files:

* `src/systems/sfx.js`: effects (caw, bark, chime, footsteps...), reverb, volume sliders, muffle while paused.
* `src/systems/music.js`: a generated score in G major pentatonic, ~75 bpm, in **five layers**:
  1 tanpura drone + soft bells, 2 bansuri flute, 3 madal pulse, 4 choir pad, 5 shimmering bells.
  One more layer joins as each wick is lit (`NIGHT_LEVEL` in `src/data/nights.js`: Title 1, Night 1 = 2, Night 2 = 3, Nights 3 and 4 = 4, Night 5 and the ending = 5).

A 30 second render of the full mix (`audio-preview.wav`) was sent along with the patch so you can hear it without running the game. It is not committed (4 MB).

## One finished track (the quick way)

Put any audio file in `public/audio/` (say `tihar.mp3`) and set `"track": "audio/tihar.mp3"` in `public/audio/manifest.json` (it is left empty on purpose: a name for a file that is not there would make a failed request on every load).
It loops for the whole game and takes the place of the generated score: quiet and a little muffled on the title, then louder and brighter as each wick is lit.
If the file is missing or cannot be decoded, the generated score plays instead. Effects stay synthesized. Check the loop point (a track that fades out sounds odd when it repeats).
The track is part of the page, so anyone who opens the hosted game can download it.

## Using real recordings

For effects or five matching stems, list them in `public/audio/manifest.json`. Nothing else changes; anything not listed stays synthesized.

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
* Test: open the game with `?debug`, then in the console `__dbg.Sfx.caw()`.
