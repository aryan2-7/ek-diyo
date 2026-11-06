#!/usr/bin/env python3
"""Subset the Kalam Devanagari fonts to just the glyphs the game actually shows.

The full Devanagari files are ~108 KB each; the game only uses a few words
(title + ending). This scans src/ for Devanagari characters and writes tiny
woff2 files to src/fonts/. Re-run after editing any Devanagari text:

    pip install fonttools brotli
    python3 tools/subset_fonts.py
"""
import pathlib, re
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
chars = set()
for f in (root / "src").rglob("*.js"):
    chars.update(re.findall(r"[\u0900-\u097F\u200C\u200D]", f.read_text(encoding="utf-8")))
chars.update(" \u25CC")  # space, dotted circle (used by shaping engines)
text = "".join(sorted(chars))
print("glyphs:", text)

out = root / "src" / "fonts"
out.mkdir(exist_ok=True)
for weight in (400, 700):
    src = root / "node_modules/@fontsource/kalam/files" / f"kalam-devanagari-{weight}-normal.woff2"
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]  # keep conjunct shaping (GSUB/GPOS)
    font = subset.load_font(str(src), opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(font)
    dst = out / f"kalam-devanagari-{weight}-subset.woff2"
    subset.save_font(font, str(dst), opts)
    print(dst.name, dst.stat().st_size, "bytes")
