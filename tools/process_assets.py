#!/usr/bin/env python3
"""
Turns the raw AI-generated art in art-source/ into game-ready WebP files in public/assets/.

  sprites  -> magenta (#FF00FF) removed, soft alpha edge, magenta spill cleaned, trimmed, resized
  cards    -> same as sprites (the card frame is also generated on magenta)
  bgs      -> resized + compressed
  bg_loop  -> resized, then mirrored side by side so it tiles seamlessly (Night 2 street)

Usage:   python tools/process_assets.py            (process everything)
         python tools/process_assets.py keeper cow (only those ids)

Add a new asset: drop the .jpeg/.png into art-source/ (any subfolder), add one line to MANIFEST.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-source"
OUT = ROOT / "public" / "assets"

# id: (kind, size)   sprite/card: size = max side in px | bg: size = width | bg_loop: size = height
MANIFEST = {
    # core
    "keeper": ("sprite", 720),
    "keeper_side": ("sprite", 720),
    "diya": ("sprite", 420),
    "marigold_mala": ("sprite", 640),
    "makhamali_mala": ("sprite", 640),
    "card_frame": ("card", 1280),
    "title_bg": ("bg", 2048),
    "paper_bg": ("bg", 1024),
    # night 1
    "bg_n1": ("bg", 2048),
    "crow_perched": ("sprite", 440),
    "crow_fly": ("sprite", 560),
    "thali_grain": ("sprite", 380),
    # night 2
    "bg_n2": ("bg_loop", 810),
    "dog_run": ("sprite", 640),
    "dog_jump": ("sprite", 640),
    "dog_tika": ("sprite", 620),
    "obstacle_pots": ("sprite", 480),
    "obstacle_baskets": ("sprite", 420),
    # night 3
    "bg_n3": ("bg", 2048),
    "cow": ("sprite", 700),
    "house_a": ("sprite", 640),
    "house_b": ("sprite", 700),
    # night 4
    "bg_n4": ("bg", 2048),
    # night 5
    "bg_n5": ("bg", 2048),
    "yamuna": ("sprite", 700),
    "yama": ("sprite", 760),
    "yama_pleased": ("sprite", 760),
    "tika_thali": ("sprite", 560),
    "dry_fruit_plate": ("sprite", 420),
}

KEY = np.array([255, 0, 255], dtype=np.float32)


def find_source(asset_id):
    for ext in ("jpeg", "jpg", "png", "webp"):
        hits = list(SRC.rglob(f"{asset_id}.{ext}"))
        if hits:
            return hits[0]
    return None


def key_out_magenta(img):
    """Return an RGBA image with the magenta background removed."""
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    dist = np.sqrt(((rgb - KEY) ** 2).sum(axis=2))
    # soft alpha: <70 away from the key = fully background, >135 = fully subject
    alpha = np.clip((dist - 70.0) / 65.0, 0.0, 1.0)
    # drop tiny stray specks that are not really background / subject
    hard_bg = alpha < 0.02
    lab, n = ndimage.label(hard_bg)
    if n:
        sizes = ndimage.sum(hard_bg, lab, range(1, n + 1))
        tiny = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < 40])
        alpha[tiny] = 1.0
    # shave one pixel off the edge to kill the pink halo, then feather slightly
    solid = alpha > 0.5
    solid = ndimage.binary_erosion(solid, iterations=1)
    alpha = np.minimum(alpha, ndimage.gaussian_filter(solid.astype(np.float32), 0.8) * 1.0 + 0.0)
    alpha = np.clip(alpha * 1.15 - 0.05, 0.0, 1.0)
    # despill: only on the edge band, so genuinely magenta flowers stay magenta
    near_bg = ndimage.binary_dilation(alpha < 0.98, iterations=3)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = np.clip(np.minimum(r, b) - g, 0, None)
    k = np.where(near_bg, 0.9, 0.0)
    rgb[..., 0] = r - spill * k
    rgb[..., 2] = b - spill * k
    rgb = np.clip(rgb, 0, 255)
    rgb[alpha < 0.01] = 0
    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(img, pad=6):
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return img
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + pad + 1, img.width), min(ys.max() + pad + 1, img.height))
    return img.crop(box)


def resize_rgba(img, max_side):
    scale = max_side / max(img.size)
    if scale >= 1:
        return img
    size = (round(img.width * scale), round(img.height * scale))
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def save_webp(img, name, quality):
    path = OUT / f"{name}.webp"
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {name:18s} {img.width:5d}x{img.height:<5d} {path.stat().st_size // 1024:5d} KB")


def process(asset_id, kind, size):
    src = find_source(asset_id)
    if src is None:
        print(f"  !! missing source for {asset_id}")
        return
    img = Image.open(src)
    if kind in ("sprite", "card"):
        out = resize_rgba(trim(key_out_magenta(img)), size)
        save_webp(out, asset_id, 90)
    elif kind == "bg":
        img = img.convert("RGB")
        h = round(img.height * size / img.width)
        save_webp(img.resize((size, h), Image.LANCZOS), asset_id, 84)
    elif kind == "bg_loop":
        img = img.convert("RGB")
        w = round(img.width * size / img.height)
        img = img.resize((w, size), Image.LANCZOS)
        loop = Image.new("RGB", (w * 2, size))
        loop.paste(img, (0, 0))
        loop.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
        save_webp(loop, asset_id, 84)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[1:] or list(MANIFEST)
    print(f"Processing {len(wanted)} asset(s) -> {OUT.relative_to(ROOT)}")
    for asset_id in wanted:
        if asset_id not in MANIFEST:
            print(f"  !! {asset_id} not in MANIFEST")
            continue
        kind, size = MANIFEST[asset_id]
        process(asset_id, kind, size)


if __name__ == "__main__":
    main()
