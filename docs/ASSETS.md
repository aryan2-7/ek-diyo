# Asset manifest

Generated from `tools/process_assets.py`. Source files live in `art-source/` (not committed); game files are in `public/assets/`.

| id | kind | size | used for |
|----|------|-----:|----------|
| `keeper` | sprite | 720px (34 KB) | Player (front view), Title, Night 4 card, Night 5 brother |
| `keeper_side` | sprite | 720px (33 KB) | Player walking sideways, Night 2 intro |
| `diya` | sprite | 420px (30 KB) | Diya rig (cards, Night 2, Ending), Night 3 lamps, held diya |
| `marigold_mala` | sprite | 640px (31 KB) | Night 2 collectible, Night 3 garland, HUD icon |
| `five_diya` | sprite | 640px (65 KB) | Five-wick lamp: story-card progression and ending (flames light at its wick tips) |
| `makhamali_mala` | sprite | 640px (32 KB) | (not used yet: spare for a richer Night 3 or title) |
| `card_frame` | card | 1280px (222 KB) | Story cards |
| `title_bg` | bg | 2048px (65 KB) | Title, Ending, card backdrops |
| `paper_bg` | bg | 1024px (131 KB) | Paper grain over every scene |
| `bg_n1` | bg | 2048px (116 KB) | Night 1 |
| `crow_perched` | sprite | 440px (23 KB) | Night 1 crows, HUD, card art |
| `crow_fly` | sprite | 560px (42 KB) | Night 1 flying crows |
| `thali_grain` | sprite | 380px (26 KB) | Night 1 offering plates |
| `bg_n2` | bg_loop | 810px (199 KB) | Night 2 (mirrored so it loops) |
| `dog_run` | sprite | 640px (41 KB) | Night 2 gallop frame A, progress icon |
| `dog_jump` | sprite | 640px (41 KB) | Night 2 jump / gallop frame B |
| `dog_tika` | sprite | 620px (40 KB) | Night 2 ending, card art |
| `obstacle_pots` | sprite | 480px (26 KB) | Night 2 tall obstacle |
| `obstacle_baskets` | sprite | 420px (65 KB) | Night 2 low obstacle |
| `bg_n3` | bg | 2048px (129 KB) | Night 3 |
| `cow` | sprite | 700px (53 KB) | Night 3, card art |
| `cow_mala` | sprite | 700px (57 KB) | Night 3 cow after her first garland (replaces the loose garland overlay) |
| `house_a` | sprite | 640px (70 KB) | Night 3 houses |
| `house_b` | sprite | 700px (91 KB) | Night 3 houses |
| `bg_n4` | bg | 2048px (168 KB) | Night 4 |
| `bg_n5` | bg | 2048px (83 KB) | Night 5 |
| `yamuna` | sprite | 700px (32 KB) | Night 5, card art |
| `yama` | sprite | 760px (64 KB) | Night 5 (arriving) |
| `yama_pleased` | sprite | 760px (65 KB) | Night 5 (won) |
| `tika_thali` | sprite | 560px (37 KB) | Night 5 powders (tap targets) |
| `dry_fruit_plate` | sprite | 420px (44 KB) | Night 5 offering |

Drawn in code, no file needed: light and glow gradients, paper-cut flame, extra wick, embers, petals, sparkle star, the Night 2 gate (`src/systems/textures.js`).

Kinds: `sprite` = magenta removed, trimmed, size is the longest side. `bg` = size is the width. `bg_loop` = size is the height, image is mirrored side by side so it tiles. `card` = like a sprite.
