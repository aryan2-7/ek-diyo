"""Gallop frames (public/assets/dog_stride_0..7.webp) built from public/assets/dog_jump.webp.
Near legs now swing from the hip / shoulder as a chain (hip -> knee -> hock/paw, shoulder -> elbow -> wrist/paw)
with overlapping, rounded joints so no gap shows. Far legs swing from a hidden hip. Run: python3 tools/make_dog_stride.py"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC, OUT, N, MAX_DROP = 'public/assets/dog_jump.webp', 'public/assets/dog_stride_%d.webp', 8, 70
im = Image.open(SRC).convert('RGBA')
W, H = im.size
a = np.array(im).astype(int)
al = a[..., 3]

def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0

def filt(m, f, px):
    return np.array(Image.fromarray((m * 255).astype('uint8')).filter(f(px * 2 + 1))) > 0
grow = lambda m, px: filt(m, ImageFilter.MaxFilter, px)
opened = lambda m, px=2: grow(filt(m, ImageFilter.MinFilter, px), px) & m

r0, g0, b0 = a[..., 0], a[..., 1], a[..., 2]
purple = (b0 > g0 + 12) & (r0 > g0 + 25) & (r0 < 205) & (al > 20)
zone = poly([(0, 346), (W, 346), (W, H), (0, H)]) | poly([(425, 303), (W, 303), (W, 450), (425, 450)])
a2 = a.copy()  # despill the magenta key fringe on the leg areas only
sel = purple & zone
a2[sel, 0] = a2[sel, 1]; a2[sel, 2] = a2[sel, 1]
r, g, b = a2[..., 0], a2[..., 1], a2[..., 2]
dark = (r < 56) & (g < 56) & (b < 56) & (al > 40)
orange = (r > 190) & (g > 110) & (g < 176) & (b < 120) & (al > 40)
BLACK, ORANGE = (26, 23, 21, 255), (243, 160, 58, 255)

def specks(mask, min_px=140):
    lab, n = ndimage.label(mask)
    if n == 0: return mask
    keep = np.zeros(n + 1, bool); keep[1:] = ndimage.sum(mask, lab, range(1, n + 1)) >= min_px
    return keep[lab]

def to_layer(mask):
    mask = specks(mask)
    arr = np.zeros(a.shape, dtype='uint8'); arr[mask] = a2[mask]
    L = Image.fromarray(arr, 'RGBA')
    A = L.getchannel('A').filter(ImageFilter.GaussianBlur(1.1)).point(lambda v: int(255 * min(1.0, max(0.0, (v - 70) / 110))))
    L.putalpha(Image.fromarray(np.minimum(np.array(A), np.array(L.getchannel('A'))).astype('uint8')))
    return L

def cap(L, pivot, rad, color, above=False):
    """Rounded joint. Uses the real paper pixels (same texture) where they exist, flat colour elsewhere.
    above=True keeps only the half-disc above the pivot: it sits inside the body (hip / shoulder)."""
    if rad <= 0: return L
    yy, xx = np.mgrid[0:H, 0:W]
    disc = (xx - pivot[0]) ** 2 + (yy - pivot[1]) ** 2 <= rad * rad
    if above:
        disc &= yy <= pivot[1] + 1
    else:
        disc &= grow(orange | dark, 2)  # joint knobs stay inside the leg outline
    arr = np.zeros(a.shape, dtype='uint8')
    arr[disc] = color
    real = disc & (orange | dark)
    arr[real] = a2[real]
    if above:  # feather the rim so the overlap blends into the body without a visible circle
        soft = Image.fromarray((disc * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(6))
        arr[..., 3] = (np.array(soft).astype(float) / 255 * arr[..., 3]).astype('uint8')
    D = Image.fromarray(arr, 'RGBA'); D.alpha_composite(L); return D

# ---------------- far legs: one clean piece each, swinging from a hidden hip
FH = opened((dark | purple) & zone & poly([(80, 300), (265, 300), (265, 500), (80, 500)]))
FF = opened((dark | purple) & zone & poly([(425, 303), (640, 303), (640, 452), (425, 452)]))
# ---------------- near hind: thigh(lower) -> shin -> paw.  hip (148,296), knee (72,372), hock (30,428)
ORA = orange
nh_zone = poly([(0, 292), (216, 292), (216, 500), (0, 500)])  # starts 4px above the cut so pieces overlap
nh_shin_line = poly([(0, 328), (105, 328), (113, 382), (113, 505), (0, 505)])
nh_paw_line = poly([(0, 410), (62, 448), (62, 505), (0, 505)])
NH_all = ORA & nh_zone
NH_paw = NH_all & nh_paw_line
NH_shin = NH_all & nh_shin_line & ~NH_paw
NH_thigh = NH_all & ~NH_shin & ~NH_paw
# ---------------- near front: shoulder(lower) -> forearm -> paw.  shoulder (415,290), elbow (455,372), wrist (529,415)
nf_zone = poly([(360, 286), (640, 286), (640, 500), (360, 500)])
nf_fore_line = poly([(470, 350), (440, 394), (440, 505), (640, 505), (640, 350)])
nf_paw_line = poly([(542, 399), (516, 432), (560, 505), (640, 505), (640, 390)])
NF_all = ORA & nf_zone
NF_paw = NF_all & nf_paw_line
NF_fore = NF_all & nf_fore_line & ~NF_paw
NF_upper = NF_all & ~NF_fore & ~NF_paw

M = 4  # overlap margin so neighbouring pieces always overlap, never leave a gap
def ov(own, other_all):  # own pixels plus a thin overlap strip of the neighbouring segment
    return own | (grow(own, M) & other_all)

def seg(mask, piv, rad, col, above=False):
    return [to_layer(mask), piv, rad, col, above]

LEGS = {
  'fh': dict(segs=[(seg(FH, (205, 332), 30, BLACK), +1, 50, 0.53)], lift=13),
  'ff': dict(segs=[(seg(FF, (445, 328), 22, BLACK), -1, 46, 0.70)], lift=13),
  'nh': dict(segs=[(seg(ov(NH_thigh, NH_shin), (148, 296), 58, ORANGE, True), +1, 14, 0.45),
                   (seg(ov(NH_shin, NH_thigh | NH_paw), (104, 350), 17, ORANGE), +1, 48, 0.49),
                   (seg(ov(NH_paw, NH_shin), (30, 428), 8, ORANGE), -1, 36, 0.54)], lift=0),
  'nf': dict(segs=[(seg(ov(NF_upper, NF_fore), (415, 290), 52, ORANGE, True), -1, 15, 0.62),
                   (seg(ov(NF_fore, NF_upper | NF_paw), (455, 372), 22, ORANGE), -1, 52, 0.66),
                   (seg(ov(NF_paw, NF_fore), (529, 415), 8, ORANGE), -1, 32, 0.71)], lift=0),
}

# ---------------- body: everything minus the legs, plus an under-paint where the near legs were
body_arr = a2.copy().astype('uint8')
for core, px in ((FH, 3), (FF, 3)):
    body_arr[grow(core, px)] = 0
yy_ = np.mgrid[0:H, 0:W][0]
body_arr[grow(NH_all, 2) & (yy_ >= 300)] = 0
body_arr[grow(NF_all, 2) & (yy_ >= 294)] = 0
loose = (r < 120) & (g < 80) & (b < 140) & (al > 20) & zone & ~dark
body_arr[loose] = 0
body_arr[..., 3] = np.where(specks(body_arr[..., 3] > 20, 400), body_arr[..., 3], 0)
under = np.zeros(a.shape, dtype='uint8')  # soft paper underlay so a swinging limb never reveals a hole
nh_u = filt(NH_thigh, ImageFilter.MinFilter, 3)
under[nh_u & (body_arr[..., 3] == 0)] = (226, 140, 46, 255)
nf_u = filt(NF_upper, ImageFilter.MinFilter, 3) & (body_arr[..., 3] == 0)
under[nf_u] = (238, 222, 186, 255)
body_arr = np.where(under[..., 3:4] > 0, under, body_arr).astype('uint8') if False else body_arr
U = Image.fromarray(under, 'RGBA'); B = Image.fromarray(body_arr, 'RGBA')
body = Image.new('RGBA', (W, H), (0, 0, 0, 0)); body.alpha_composite(U); body.alpha_composite(B)

def fold(phi, peak): return 0.5 + 0.5 * math.cos(2 * math.pi * (phi - peak))

def chain(segs, phi, i=0, lift=0):
    (layer, piv, rad, col, above), sgn, amp, peak = segs[i]
    L = cap(layer, piv, rad, col, above)
    if i + 1 < len(segs):
        L.alpha_composite(chain(segs, phi, i + 1))
    R = L.rotate(sgn * amp * fold(phi, peak), resample=Image.BICUBIC, center=piv)
    if i == 0 and lift:
        O = Image.new('RGBA', R.size, (0, 0, 0, 0)); O.alpha_composite(R.crop((0, int(lift * fold(phi, peak)), R.width, R.height)), (0, 0)); R = O
    return R

for i in range(N):
    phi = i / N
    C = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k in ('fh', 'ff'): C.alpha_composite(chain(LEGS[k]['segs'], phi, lift=LEGS[k]['lift']))
    C.alpha_composite(body)
    for k in ('nh', 'nf'): C.alpha_composite(chain(LEGS[k]['segs'], phi))
    ys = np.where(np.array(C)[..., 3].max(axis=1) > 60)[0]
    drop = max(0, min(MAX_DROP, H - 1 - int(ys.max())))
    F = Image.new('RGBA', (W, H), (0, 0, 0, 0)); F.alpha_composite(C, (0, drop))
    F.save(OUT % i, 'WEBP', quality=95, method=6)
print('ok')
