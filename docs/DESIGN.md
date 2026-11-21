# Design notes

**Idea:** one diya, five days. Tihar honours the creatures and people who guard life. The diya gains
one wick each night (1 on Night 1, 5 on Night 5) and the music grows with it. Every night has a soft
night overlay with holes of light punched by each lamp (`systems/Lighting.js`); most nights keep it
light so the paper art reads clearly, and only Bhai Tika (Night 5) is deliberately gloomy.

**Look:** paper-cut illustration, flat shapes, torn edges, a faint paper grain over everything.
Palette: marigold `#F2A33A`, vermilion `#C8432B`, indigo `#1D2540`, turmeric `#E8C44B`,
cream `#EFE2C4`, soot `#1A1714`. Fonts: Yatra One (titles), Kalam (everything else).

**Flow:** Title, prologue card, Night 1, card, Night 2, card, ... Night 5, card, Ending.
Each card lights the next wick on a big diya. Nights unlock in order and can be replayed from the title.

| Night | Verb | Fail state | Why it fits |
|------:|------|-----------|-------------|
| 1 Crows | stand beside plates to light them, crows land on lit plates | dusk runs out | feeding the crows first, as the tradition says |
| 2 Dog | run and jump (auto-run) | none; stumbles slow you down | the loyal guard dog at the gate |
| 3 Cow and light | refill door-lamps, give the cow a garland | sparks run out | Laxmi visits lit homes; the cow is honoured |
| 4 Annakut | stack swinging offerings, cap with the maha-deep | lean past the limit slides the top layers off | Govardhan Puja, the hill of food, crowned with a lamp |
| 5 Tika | repeat colour sequences (memory game) | Yama arrives (slips or time) | seven-colour tika, Yamuna and Yama |

**Feel targets:** about 10 minutes total, no night longer than about 90 s, one new idea per night,
forgiving: nothing is punishing, every fail screen offers an instant retry.

**Difficulty knobs** are constants at the top of each `NightN.js` file.
