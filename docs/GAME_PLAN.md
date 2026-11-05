# The Five Nights — Game Plan, Assets & Prompts (v2)

KUCC Tihar–Chhath Web UI Contest · Advanced track · register by Nov 8, submit by Nov 19

**What changed since v1 of this plan** (read the ✅/🆕 marks carefully — most core art is already generated and wired in):

- Night 4 is **no longer the mandala**. It is being rebuilt as **Govardhan Puja: Stack the Annakut** — you stack offerings (cow-dung pats, plates, bowls, garlands) into a wobbling hill of food and crown it with the maha-deep. This needs **2 must-have new sprites** (`dung_pat`, `bowl_rice`).
- The Night 2 runner has been rebalanced: one steady pace, side-by-side double obstacles, tight fair hitboxes, glowing garlands, no diya lamp (the street is lit by ambient light), and every level now opens with a **"Got it" how-to-play panel** instead of jumping straight in.
- Sound is **on by default**: the ambience (drone + random temple bells) starts on its own, with a deliberate beat of quiet on the title screen first.
- The single-wick diya art was replaced by the **five-wick diya** (`five_diya.png` ✓) everywhere the lamp is shown large (story cards, run escort, ending).
- A few **walking / acting animation frames** are now wanted — see section 6. That section is the only place multi-frame sprites are asked for; everything else is still single poses animated by code.

---

## 1. The game in one line

You carry one diya through the five days of Tihar. Each night is a 1.5–2 minute mini-game that opens with a "Got it" instructions panel, the diya's light (or ambient street light) reveals the scene, and every night ends with a paper story card that adds one more wick to the lamp. Around 10 minutes total.

**Through-line:** the diya gains one more wick each night — 1 wick on Night 1 … 5 flames on Night 5 — and one character (the Keeper) appears throughout.

## 2. The five nights, as they are now

**Night 1 — Kaag Tihar (the crow).** Rooftop at dusk. Move the Keeper with drag / arrows / WASD; standing beside a grain plate lights it, and crows fly in to feed. Feed **10 crows before the 85-second dusk bar runs out**. HUD: crow icons + dusk gradient bar. Story card: why the crow, the messenger, is fed first.

**Night 2 — Kukur Tihar (the dog).** Side-scrolling street run, roughly 80 s at one steady pace. You play the dog guarding the gate: jump pots and baskets (Space/W/tap, hold for height), catch glowing marigold garlands (each one is haloed so it reads against the busy street). Obstacle **doubles are side-by-side so one leap clears them**; hitboxes are tight and derived from the sprites; one hit = a short stumble with 1.9 s of grace, no speed ramp. The five-wick diya escorts you from the **top-right corner** and the run ends at the gate: the dog sits, gets its garland and tika. Story card: why the dog is honoured.

**Night 3 — Gai Tihar & Laxmi Puja (the cow and the light).** One continuous night (~75 s) in a courtyard: four lamps stand in an arc and slowly burn down; stand beside one to refill its oil (1.15/s) — a lamp dark for 2.5 s costs one of **5 sparks**. Wind gusts dim two lamps at a time. Partway through, a marigold garland appears: bring it to the wandering cow for **Gai Puja** — full lamps, +1 spark, and a 9-second blessing where oil drains 65% slower. She wears the garlanded art from then on. Story card: Laxmi visits the bright houses; the garlanded cow brings a blessing.

**Night 4 — Govardhan Puja & Mha Puja (the hill and the self).** 🆕 **Stack the Annakut.** In the Newar courtyard (existing `bg_n4` — its empty cream platform is the build spot), offerings swing slowly left–right above the platform: alternating **cow-dung pats** (the hill's base, as it is built in real households), a grain thali, a bowl of rice, a plate of dry fruits, and marigold malas. Click/Space to drop. Every drop that lands off-centre leans the hill; the whole stack visibly tilts and wobbles, and if the lean passes the limit the top few offerings slide off (offerings scatter — never a harsh game-over, you just lose layers and seconds). Near-perfect drops steady the hill and earn a chime. Stack **14 offerings before the evening bar empties**, then the final item is the **maha-deep** (`diya.png`) — crowning the top with the butter lamp wins, petals burst, the hill glows. Story card: the Govardhan hill of food, Krishna lifting the mountain, and Mha Puja's message that the one carrying the light deserves care too.

**Night 5 — Bhai Tika (the finale).** Seven-colour memory duel against Yama. Yamuna flashes a sequence of coloured tika powders on the thali (1-2-3-3-4-4-5 colours across 7 rounds); repeat them by tapping the piles or keys 1–7. Each round finished paints one stripe of the tika; **3 slips and Yama arrives** (he steps closer per third of the danger meter — slips or the 170 s clock). When the tika is complete, pleased Yama steps in, accepts the dry-fruit plate, petals fall. Story card: how Yamuna held off death itself.

## 3. How to generate so everything matches

1. One image generator for the whole game. Mixing tools breaks the style.
2. Fresh chat per night (or per ~8 images). Paste the STYLE block first, attach an existing game sprite (e.g. `keeper`, `thali_grain`) as a style reference.
3. New art for this version: generate the **two must-have Night 4 pieces first** (`dung_pat`, `bowl_rice`), matching the look of the existing `thali_grain` / `dry_fruit_plate` plates.
4. Backgrounds are generated **bright and flat**; the game darkens them and lights reveal them. No night lighting, no vignettes.
5. Sprites go on **solid #FF00FF magenta** — this repo's pipeline (`tools/process_assets.py`, `npm run assets`) keys the magenta out, trims, feathers the edge and saves `public/assets/<id>.webp`. Drop raw files in `art-source/nightN/` and add one line to the MANIFEST.
6. **Do not generate animation frames unless listed in section 6.** The code bobs, squashes, flips, sways and flickers every sprite.
7. Name every file exactly as its ID below (lower snake_case).

## 4. The three blocks you paste

**STYLE** (once at the start of every chat):

> STYLE: Hand-cut paper collage illustration with layered flat shapes, slightly rough torn paper edges, visible paper fibre and grain, and soft paper drop-shadows only between layers. Strictly limited palette: marigold orange #F2A33A, vermilion #C8432B, deep indigo #1D2540, turmeric yellow #E8C44B, aged cream #EFE2C4, soot black #1A1714, with small touches of magenta #B0306A and leaf green #5C7A3A allowed. No outlines, no gradients, no photorealism, no 3D render look, no text or lettering. Mood: warm, calm, hand-made, Kathmandu Tihar festival, cute indie-game vibe. Lighting: flat, even and bright, with NO dark vignette and NO strong cast shadows, because lighting is added later in the game. Keep this exact style for every image in this chat.

**SPRITE** (before every sprite subject):

> SPRITE RULES: exactly one subject, centred, the entire subject visible with a generous margin, on a perfectly flat solid #FF00FF magenta background (no gradient, no floor, no shadow on the background), square 1:1.

**SCENE** (before every background subject):

> SCENE RULES: wide 16:9, no people or animals unless stated, no text, no border. Keep the bottom 25% as a simple open ground or floor area where characters can stand. Clear layered depth: a distinct foreground, middle and far layer.

## 5. Asset list and prompts

✅ = already generated and in the game — reuse the file, don't regenerate unless the style broke.
🆕 = still needed. Build the ★ set first. (Current gaps: Night 4 must-haves + optional liveliness frames.)

### Core

**1. paper_bg ★ ✅** — aged lokta-paper texture for cards/menus. *Prompt kept for reference:* seamless tileable aged handmade Nepali lokta paper, cream #EFE2C4, long visible fibres, faint stains and fold creases, very low contrast, 1:1, no objects.

**2. card_frame ★ ✅** — portrait 3:4 cream lokta story card, torn edges, thin hand-inked indigo border, marigold in each corner, empty centre.

**3. diya ★ ✅** — terracotta oil lamp, three-quarter side view, vermilion dot ring, cotton wick, **no flame** (flame is code), chunky-cute. Also reused as the *maha-deep cap* of the Night 4 hill.

**4. keeper ★ ✅** — the child, front view, cream shawl over indigo kurta, bare feet, hands cupped to hold a lamp.

**5. keeper_side ☆ ✅** — same child side profile facing right, mid-step. *(A second stride frame would complete a 2-frame walk cycle — see section 6.)*

**6. marigold_mala ★ ✅** — orange/yellow marigold garland in a gentle U-curve, 16 blooms, leaf accents. Used as Night 2 collectible (it gets a code glow) and Night 3/4 offering.

**7. makhamali_mala ★ ✅** — globe amaranth garland in deep magenta #B0306A, 14 pom-pom blooms, cream thread. (Night 5 flavour.)

**8. title_bg ★ ✅** — Kathmandu dusk skyline silhouettes: stupa with painted eyes, pagoda, brick houses, mountains, crescent moon, hand-cut stars, empty lower-centre space for the diya.

**9. five_diya ★ ✅ 🆕(done this version)** — the big five-wick brass lamp seen from a three-quarter top view, five wicks around the rim, no flames. Progression lamp on story cards, Night 2 escort, ending screen.

### Night 1 — Kaag Tihar

**10. bg_n1 ★ ✅** — rooftop terrace at evening: terracotta roof edge, brick parapet, laundry line, clay pot, potted marigolds, distant stupa/pagoda rooftops, peach-and-indigo sky layers.

**11. crow_perched ★ ✅** — glossy black house crow perched facing right, ash-grey neck, cream eye highlight.

**12. crow_fly ★ ✅** — same crow, wings fully raised, angled slightly down, flying right. *(A wings-down companion frame is an optional liveliness add — section 6.)*

**13. thali_grain ★ ✅** — round brass plate, three-quarter top view, rice mound + yellow flowers + tiny clay cup. **Also reused as a stackable offering in Night 4.**

### Night 2 — Kukur Tihar

**14. bg_n2 ★ ✅** — 21:9 mirrorable old Kathmandu street: brick houses both sides, cobbled road bottom 30%, marigold strings, shop awnings, similar edges so it loops.

**15. dog_run ★ ✅** — tan-and-black street dog, side view facing right, mid-stride, all paws off the ground, tongue out, vermilion neck cloth.

**16. dog_jump ★ ✅** — same dog mid-jump, front legs stretched, back legs tucked, ears flapping.

**17. dog_run_b 🆕 ☆ (walk-cycle frame — section 6)** — same dog, opposite gallop stride: front legs gathered under the chest, hind legs stretched back, belly slightly higher off the ground, tongue out. Alternated with dog_run in code.

**18. obstacle_pots ★ ✅** — stack of three terracotta water pots (gagri) with cloth, flat side view.

**19. obstacle_baskets ☆ ✅** — pile of two woven bamboo doko baskets, flat side view.

**20. dog_tika ☆ ✅** — the reward shot: same dog sitting facing front, garland + red tika, happy. (Also Night 2 story-card art.)

### Night 3 — Gai Tihar & Laxmi Puja

**21. bg_n3 ★ ✅** — empty alley: plain far brick wall, slice of sky, cobbled floor bottom 40%.

**22. house_a ★ ✅** — Newar brick house front, 2 floors, lattice windows **dark and empty inside** (diyas are coded).

**23. house_b ☆ ✅** — variant house, 3 floors, blue-grey door.

**24. cow ★ ✅** — calm white-and-brown cow side view facing right, curved horns, brass bell, NO garland.

**25. cow_mala ★ ✅** — the same cow wearing the marigold garland (code swaps the texture after Gai Puja). *(Two stroll frames are an optional liveliness add — section 6.)*

### Night 4 — Govardhan Puja / Mha Puja 🆕

**26. bg_n4 ★ ✅** — Newar courtyard (bahal): red brick buildings with carved windows, small stone shrine at back, marigold strings, **large empty swept cream circular floor area centre** — that empty circle is exactly where the annakut hill is stacked, so no new background is needed.

**27. dung_pat ★ 🆕 MUST** — for the hill's base layers.
> SPRITE RULES as above. Subject: a single flattened round cow-dung patty (gobar) as traditionally used to build the Govardhan hill, seen from a high three-quarter top view so it reads very flat and wide: a low, barely-raised disc of warm umber brown with ochre and tan flecks mixed through, a softly irregular hand-formed edge, a few tiny bits of dried marigold pressed into the surface. Thin and wide, NOT a ball of dung. Cute, clean, paper-cut.

**28. bowl_rice ★ 🆕 MUST** — mid-offering layer.
> SPRITE RULES as above. Subject: a shallow terracotta bowl with gently flared sides seen from a three-quarter top view (like a plate in the reference images), filled with a tall, slightly overflowing white mound of individually visible paper-cut rice grains, a few stray grains at the rim, warm terracotta rim with a thin cream band. Cut-paper collage, matching the existing thali and dry-fruit plates in scale and feel.

**29. bowl_curd ☆ 🆕** — extra variety layer (generate only if time allows).
> SPRITE RULES as above. Subject: the same terracotta bowl shape from the same three-quarter top view, filled with a glossy white mound of fresh curd (dahi), one small vermilion dot at the centre of the mound, a couple of spoon marks in the curd surface.

**30. diya (reused) —** the **maha-deep**: after 14 offerings, the tenth sprite that swings overhead is the existing diya; dropping it on top of the hill crowns it. No new asset.

**Layer rhythm in code:** layers 1–2 are dung pats, layers 3–11 choose randomly between thali_grain, bowl_rice, dry_fruit_plate (and bowl_curd if generated), layers 12–13 are marigold malas, layer 14 is the diya cap. The hill narrows as it rises so the code scales every layer to its target width.

### Night 5 — Bhai Tika

**31. bg_n5 ★ ✅** — warm old home interior: long hall, wooden floor, low cushioned platform, unlit brass lamps, window with night view, doorway on the far right (Yama arrives there).

**32. yamuna ★ ✅** — young woman, deep red sari with gold border, braid with marigold, small gold nose ring, calm determined face, plate held at her waist.

**33. yamuna_point 🆕 ☆ (acting pose — section 6)** — same sister, one arm gracefully extended toward one side, palm open, exactly the pose of showing which colour she points to; used (flipped) each time she flashes a colour.

**34. yama ★ ✅** — tall dignified Yama: layered indigo robes, ornate gold crown, long staff, grey-indigo skin, softly glowing amber eyes. Stern but suitable for all ages.

**35. tika_thali ★ ✅** — brass plate, top view, seven mounds of coloured tika powder in a row (seven-colour order the game follows), rice grains and petals.

**36. dry_fruit_plate ☆ ✅** — walnuts, almonds, raisins, golden sel roti ring, banana. **Also reused as a Night 4 offering layer.**

**37. yama_pleased ☆ ✅** — same Yama, open hands, faint smile, staff lowered.

### Story-card art (☆, optional — game currently uses cropped sprites)

Loose ink-and-wash spot illustration, indigo ink with marigold-orange accents on cream paper, 4:3, soft edges fading into the paper, no text, no border.

- 38. card_1 ☆ — crow on a window ledge, small diya glowing beside it.
- 39. card_2 ☆ — dog sitting calmly at a stone gateway, two garlands in front of it.
- 40. card_3 ☆ — cow in a courtyard, golden footprints leading to a doorway full of diyas.
- 41. card_4 ☆ **(reworded for Govardhan)** — a hill of stacked bowls of food built on a flat cow-dung base, garlands draped over it, one lit butter lamp on top, a small figure with a diya kneeling beside it.
- 42. card_5 ☆ — sister applying the seven-colour tika to her brother, both seated on a straw mat.
- 43. final ending card — five diyas in a row on a ledge, each slightly bigger, all lit, glow as simple rings.

## 6. Animation frames — where the game gets livelier

The rule stays: **only these are multi-frame**; everything else is code-animated (bob, squash, flip, sway, flame flicker). Each is a two-frame cycle, which is smooth enough at this art style and keeps the asset count tiny.

| # | Files | Used where | How the code uses it |
|---|-------|------------|----------------------|
| 1 | `dog_run_b.png` ☆ | Night 2, the whole run | Alternates `dog_run` / `dog_run_b` at the gallop cadence (currently fighting dog_jump as a stand-in — this looks much better) |
| 2 | `cow_walk_a.png` + `cow_walk_b.png` ☆☆ | Night 3, the wandering cow | Two-frame stroll instead of the current slide; a/b or just `cow_b` if the base cow pose counts as frame a |
| 3 | `crow_peck.png` ☆ | Night 1, while a crow eats | Pecked grain: 2–3 quick pecks then back to perched |
| 4 | `crow_fly_b.png` ☆ | Night 1, flights | Alternate at ~430 ms for a real wingbeat instead of scale-squash flapping |
| 5 | `yamuna_point.png` ☆ | Night 5, every sequence flash | She swings to the pointing pose while the colour flashes, then settles back |
| 6 | `keeper_side_b.png` ☆ | Nights 1 & 3 walking | Completes a 2-frame stride with the existing keeper_side |

Prompts for the 🆕 frames (always: "Attached `<id>.png` as reference" + SPRITE RULES):

- **dog_run_b —** Using the attached dog_run as reference, the same street dog in the same style and side view facing right, captured in the opposite gallop stride: front legs folded up under the chest, hind legs stretched back, body lifted a touch higher, tail streaming behind, same blush of motion, tongue out, vermilion neck cloth.
- **cow_walk_a / cow_walk_b —** Using the attached cow as reference, the same cow walking calmly facing right as two frames: (a) left front leg and right hind leg forward, (b) right front leg and left hind leg forward, head a touch lower, gentle eyes, same bell. Identical framing both frames so they read as one stride.
- **crow_peck —** Using the attached crow_perched as reference, the same crow leaning its whole body down and forward, beak touching the ground mid-peck, tail raised, as if grabbing grain.
- **crow_fly_b —** Using the attached crow_fly as reference, the same crow with both wings swept down and back at the bottom of the stroke, body angled slightly up, flying right.
- **yamuna_point —** Using the attached yamuna as reference, the same sister, same sari and braid, now in profile facing right with one arm extended straight toward the right side, palm gracefully open as she indicates a colour, holding the plate low in the other hand, calm expression.
- **keeper_side_b —** Using keeper_side as reference, the same child facing right but with the opposite stride (the arm holding the lamp steady), feet swapped mid-step.

## 7. What the code does (do NOT generate these)

Diya flame and flicker, glow halos, the darkness-and-light overlay system, embers/petals/rain-free particle bursts, parallax street scrolling, walking character controller and lean collision, **the annakut stacking + tilt/slide-off physics**, offer meters, dusk/midnight/evening bars, Simon sequence with ring flashes, the "Got it" panel, story-card system, wick progression, HUD, transitions, synths of every sound (bells, drone, barks, chimes, fanfares).

## 8. Suggested stack

Phaser 3 + Vite, deploy on Vercel, public GitHub repo. Darkness = overlay render-texture with radial holes punched by each `light`. Fonts: Yatra One (titles) + Kalam (handwriting) via Fontsource. Art pipeline committed in `tools/process_assets.py` (`npm run assets`).

## 9. Timeline from today (Nov 5)

- **Nov 5–6:** generate `dung_pat` + `bowl_rice` (must), then as many ☆ liveliness frames as time allows. Rebuild Night 4 as Stack the Annakut (scene + night text).
- **Nov 7–9:** Night 4 beat, layer/lean tuning; finish Night 5 polish (call it feature-complete).
- **Nov 10–12:** story-card copy pass + festival-fact verification with an elder source (docs/CONTENT_TO_VERIFY.md), sound pass.
- **Nov 13–15:** playtest with friends (phone and desktop), balance the lee-way of Night 2 doubles and Night 4 lean, trim runtime to ~10 min.
- **Nov 16–17:** deploy, public repo, README + 2–3 sentence description, screenshot/GIF for the submission.
- **Nov 18–19:** buffer; submit before the deadline.
