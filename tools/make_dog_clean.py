"""Clean 8-frame gallop (public/assets/dog_gait_0..7.webp) built from public/assets/dog_jump.webp.
Every leg is a 2-3 joint chain (hip/knee/hock or shoulder/elbow/wrist) with rounded paper joint caps,
despilled edges and smoothed outlines. Run: python3 tools/make_dog_clean.py (Pillow + numpy)."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT, N, MAX_DROP, MARGIN = 'public/assets/dog_jump.webp', 'public/assets/dog_gait_%d.webp', 8, 70, 4
im = Image.open(SRC).convert('RGBA')
W, H = im.size
a = np.array(im).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0

def grow(m, px):
    return np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(px * 2 + 1))) > 0

purple = (b > g + 12) & (r > g + 25) & (r < 205) & (al > 20)
zone = poly([(0, 346), (W, 346), (W, H), (0, H)]) | poly([(425, 303), (W, 303), (W, 450), (425, 450)])
a2 = a.copy()  # despill the magenta key-fringe on the leg areas only (not tongue, scarf, etc.)
sel = purple & zone
a2[sel, 0] = a2[sel, 1]; a2[sel, 2] = a2[sel, 1]
r, g, b = a2[..., 0], a2[..., 1], a2[..., 2]
dark = ((r < 56) & (g < 56) & (b < 56) & (al > 40))
orange = (r > 190) & (g > 110) & (b < 120) & (al > 40)
BLACK, ORANGE = (26, 23, 21, 255), (243, 160, 58, 255)

def drop_specks(mask, min_px=140):
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    if n == 0: return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool); keep[1:] = sizes >= min_px
    return keep[lab]

def to_layer(mask):
    mask = drop_specks(mask)
    arr = np.zeros(a.shape, dtype='uint8'); arr[mask] = a2[mask]
    L = Image.fromarray(arr, 'RGBA')
    A = L.getchannel('A').filter(ImageFilter.GaussianBlur(1.1))  # soften jaggies from the cut
    A = A.point(lambda v: int(255 * min(1.0, max(0.0, (v - 70) / 110))))
    L.putalpha(Image.fromarray(np.minimum(np.array(A), np.array(L.getchannel('A'))).astype('uint8')))
    return L

def cap(L, pivot, rad, color):  # rounded paper joint: fill the circle where the layer is empty
    if rad <= 0: return L
    d = Image.new('RGBA', L.size, (0, 0, 0, 0))
    ImageDraw.Draw(d).ellipse([pivot[0] - rad, pivot[1] - rad, pivot[0] + rad, pivot[1] + rad], fill=color)
    d.alpha_composite(L); return d

def split(all_m, child_core):
    child_m = child_core | (grow(child_core, MARGIN) & all_m & grow(all_m & ~child_core, MARGIN))
    return all_m, child_m

# ---- legs: list of segments root->tip: (mask, pivot, cap radius, colour, fold sign, amplitude, peak phase)
def opened(m, px=2):  # erode then regrow: cuts off hairline slivers thinner than ~2*px
    e = np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MinFilter(px * 2 + 1))) > 0
    return grow(e, px) & m

FH_all = opened((dark | purple) & zone & poly([(80, 300), (265, 300), (265, 500), (80, 500)]))
FF_all = opened((dark | purple) & zone & poly([(425, 303), (640, 303), (640, 452), (425, 452)]))
NH_all = orange & poly([(0, 322), (112, 322), (126, 376), (98, 485), (0, 485)])
NF_all = orange & poly([(500, 335), (410, 415), (520, 495), (615, 495), (615, 370)])
NH_core = orange & poly([(0, 336), (98, 336), (122, 374), (98, 485), (0, 485)])
NF_core = orange & poly([(487, 347), (423, 424), (520, 495), (615, 495), (615, 380)])
NH_paw = NH_core & poly([(0, 395), (80, 452), (80, 490), (0, 490)])
NF_paw = NF_core & poly([(540, 388), (496, 440), (620, 505), (640, 400)])
FH_low = FH_all & poly([(0, 398), (300, 398), (300, 505), (0, 505)])
FF_low = FF_all & poly([(569, 350), (521, 414), (521, 470), (650, 470), (650, 350)])

def seg(m, piv, rad, col): return [to_layer(m), piv, rad, col]
LEGS = {
  'fh': dict(under=True, segs=[(seg(FH_all, (205, 332), 30, BLACK), +1, 50, 0.53)]),
  'ff': dict(under=True, segs=[(seg(FF_all, (440, 322), 30, BLACK), -1, 46, 0.70)]),
  'nh': dict(under=False, segs=[(seg(NH_all & ~NH_paw | (NH_all & grow(NH_paw, MARGIN) & grow(NH_all & ~NH_paw, MARGIN)), (98, 354), 16, ORANGE), +1, 64, 0.45),
                               (seg(NH_paw | (NH_all & grow(NH_all & ~NH_paw, MARGIN) & grow(NH_paw, MARGIN)), (40, 425), 9, ORANGE), -1, 36, 0.45)]),
  'nf': dict(under=False, segs=[(seg(NF_all & ~NF_paw | (NF_all & grow(NF_paw, MARGIN) & grow(NF_all & ~NF_paw, MARGIN)), (478, 345), 0, ORANGE), -1, 68, 0.62),
                               (seg(NF_paw | (NF_all & grow(NF_all & ~NF_paw, MARGIN) & grow(NF_paw, MARGIN)), (528, 412), 9, ORANGE), -1, 30, 0.62)]),
}
# body = everything minus the cores of the legs, with round caps at the knee / elbow so the cut never shows
body_arr = a2.copy().astype('uint8')
for core in (FH_all, FF_all):
    body_arr[grow(core, 3)] = 0
for core in (NH_core, NF_core):
    body_arr[grow(core, 2)] = 0
body_arr[(r < 120) & (g < 80) & (b < 140) & (al > 20) & zone & ~grow(dark, 0)] = body_arr[(r < 120) & (g < 80) & (b < 140) & (al > 20) & zone & ~grow(dark, 0)] * 0
body_arr[..., 3] = np.where(drop_specks(body_arr[..., 3] > 20, 400), body_arr[..., 3], 0)
body = Image.fromarray(body_arr, 'RGBA')

def ImageChops_offset(L, dy):
    O = Image.new('RGBA', L.size, (0, 0, 0, 0)); O.alpha_composite(L, (0, dy) if dy >= 0 else (0, 0)) if dy >= 0 else O.alpha_composite(L.crop((0, -dy, L.width, L.height)), (0, 0)); return O

def fold(phi, peak): return 0.5 + 0.5 * math.cos(2 * math.pi * (phi - peak))

def chain(segs, phi, i=0):
    (layer, piv, rad, col), sgn, amp, peak = segs[i]
    L = cap(layer, piv, rad, col)
    if i + 1 < len(segs):
        L.alpha_composite(chain(segs, phi, i + 1))
    R = L.rotate(sgn * amp * fold(phi, peak), resample=Image.BICUBIC, center=piv)
    if i == 0 and L.getpixel((0, 0)) is not None and piv in ((205, 332), (440, 322)):
        R = ImageChops_offset(R, -int(13 * fold(phi, peak)))
    return R

for i in range(N):
    phi = i / N
    C = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k in ('fh', 'ff'): C.alpha_composite(chain(LEGS[k]['segs'], phi))
    C.alpha_composite(body)
    for k in ('nh', 'nf'): C.alpha_composite(chain(LEGS[k]['segs'], phi))
    ys = np.where(np.array(C)[..., 3].max(axis=1) > 60)[0]
    drop = max(0, min(MAX_DROP, H - 1 - int(ys.max())))
    F = Image.new('RGBA', (W, H), (0, 0, 0, 0)); F.alpha_composite(C, (0, drop))
    F.save(OUT % i, 'WEBP', quality=95, method=6)
print('ok')
