# Animation-frame prompts — paste-ready

Six two-frame sets. Rules of thumb so the frames actually cycle:

- One generator, one chat for all frames of the same subject (up to 8 images — frame pairs live together).
- Paste STYLE once, then SPRITE RULES once, then attach the reference sprite image.
- Every prompt below says "identical framing" — that's the important part: **same square, same subject size, same position on the canvas, only the pose changes.** If subject size/position drifts between frames, the cycle will jitter.
- Save raw images to `art-source/night{n}/`, add a line to the MANIFEST in `tools/process_assets.py` and to `src/data/assets.js`, then `npm run assets`.

---

## 0. Paste first — STYLE block

> STYLE: Hand-cut paper collage illustration with layered flat shapes, slightly rough torn paper edges, visible paper fibre and grain, and soft paper drop-shadows only between layers. Strictly limited palette: marigold orange #F2A33A, vermilion #C8432B, deep indigo #1D2540, turmeric yellow #E8C44B, aged cream #EFE2C4, soot black #1A1714, with small touches of magenta #B0306A and leaf green #5C7A3A allowed. No outlines, no gradients, no photorealism, no 3D render look, no text or lettering. Mood: warm, calm, hand-made, Kathmandu Tihar festival, cute indie-game vibe. Lighting: flat, even and bright, with NO dark vignette and NO strong cast shadows, because lighting is added later in the game. Keep this exact style for every image in this chat.

## 0. Paste second — SPRITE RULES

> SPRITE RULES: exactly one subject, centred, the entire subject visible with a generous margin, on a perfectly flat solid #FF00FF magenta background (no gradient, no floor, no shadow on the background), square 1:1.

## 0. Rule to append to every frame prompt

> FRAME CONSISTENCY: this is one frame of a 2-frame animation cycle with an attached reference frame. Keep the subject at exactly the same scale, height and horizontal position in the square as the attached image — only the pose changes. Identical camera, identical framing, no story-telling details added or removed.

---

## 1. dog_run_b — Night 2 gallop (reference: dog_run)

> Using the attached dog_run image as reference, the same friendly Nepali street dog in the same paper-cut style, same side view facing right, same vermilion cloth around the neck, this time captured in the OPPOSITE gallop stride to the reference: front legs gathered up under the chest, hind legs stretched straight back, belly lifted a touch higher off the ground, tail streaming behind, tongue out, ears slightly back. + FRAME CONSISTENCY.

## 2. cow_walk_a + cow_walk_b — Night 3 stroll (reference: cow)

> Using the attached cow image as reference, the same calm white-and-brown Nepali cow in the same paper-cut style, side view facing right, same curved horns and brass bell, mid-walking step with the LEFT FRONT leg and the RIGHT HIND leg lifted and forward, head a touch lower, gentle eyes. + FRAME CONSISTENCY.

Then, in the same chat, still with the same cow reference:

> Same cow, same framing, mid-walking step with the RIGHT FRONT leg and the LEFT HIND leg lifted and forward, the mirror image of the previous stride. + FRAME CONSISTENCY.

*(Only the bare cow is needed: when the cow gets garlanded in the game, the marigold garland is overlaid in code, so no garlanded walk frames.)*

## 3. crow_peck — Night 1 feeding (reference: crow_perched)

> Using the attached crow_perched image as reference, the same glossy black house crow in the same paper-cut style, same perch pose and framing, now leaning its whole body down and forward over the edge it sits on, both legs folded under it, beak touching the ground surface mid-peck, tail raised and fanned slightly, as if grabbing a grain of rice. + FRAME CONSISTENCY.

*(Tip: keep the feet on the same invisible perch line as the reference so the peck reads as a nod.)*

## 4. crow_fly_b — Night 1 wingbeat (reference: crow_fly)

> Using the attached crow_fly image as reference, the same glossy black house crow in the same paper-cut style, flying to the right, now at the bottom of the wingbeat: both wings swept down and slightly back mid downstroke, tips separated, body angled a touch upward, same tail spread. + FRAME CONSISTENCY.

## 5. yamuna_point — Night 5 showing colours (reference: yamuna)

> Using the attached yamuna image as reference, the same young sister in the same deep red sari with gold border, same braid with marigold, same small gold nose ring and calm determined face, same paper-cut style — turned to a three-quarter profile facing right, her near arm extended straight toward the right side of the frame, palm open and fingers gracefully together, the way she points at a tika colour, plate with the seven powders still held low in the other hand at waist height. + FRAME CONSISTENCY.

## 6. keeper_side_b — Nights 1 & 3 stride (reference: keeper_side)

> Using the attached keeper_side image as reference, the same small child in the same cream shawl over indigo kurta, same paper-cut style, same side profile facing right, mid-step walking, now the opposite stride: the other leg forward and the arm holding the lamp extended in the same position as the reference, posture and head exactly matched. + FRAME CONSISTENCY.

---

## File IDs (for MANIFEST + `src/data/assets.js`)

| id | night folder | reference sprite |
|----|--------------|------------------|
| `dog_run_b` | night2 | dog_run |
| `cow_walk_a` | night3 | cow |
| `cow_walk_b` | night3 | cow |
| `crow_peck` | night1 | crow_perched |
| `crow_fly_b` | night1 | crow_fly |
| `yamuna_point` | night5 | yamuna |
| `keeper_side_b` | core | keeper_side |
