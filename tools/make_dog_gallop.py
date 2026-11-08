"""Builds an 8-frame gallop (public/assets/dog_gal_0..7.webp) from public/assets/dog_jump.webp.
The dog is cut into body + 4 legs. Near legs fold at the knee/elbow, far legs swing from a hidden hip;
front and hind pairs are out of phase like a real gallop. Run: python3 tools/make_dog_gallop.py (Pillow + numpy)."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT, N = 'public/assets/dog_jump.webp', 'public/assets/dog_gal_%d.webp', 8
MAX_DROP = 70  # px a frame may sink so planted paws meet the ground line
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

dark = ((r < 52) & (g < 52) & (b < 52) & (al > 40)) | ((r > 70) & (r < 190) & (g < 60) & (b > 70) & (b < 170) & (al > 40))
orange = (r > 190) & (g > 110) & (b < 120) & (al > 40)
far_hind = dark & poly([(80, 300), (265, 300), (265, 500), (80, 500)])
far_front = dark & poly([(425, 303), (640, 303), (640, 450), (425, 450)])
near_hind = orange & poly([(0, 336), (98, 336), (122, 374), (98, 485), (0, 485)])
near_front = orange & poly([(487, 347), (423, 424), (520, 495), (615, 495), (615, 380)])
near_hind_ov = orange & poly([(0, 322), (112, 322), (126, 376), (98, 485), (0, 485)])
near_front_ov = orange & poly([(500, 335), (410, 415), (520, 495), (615, 495), (615, 370)])

def layer(mask, blob=None):
    arr = np.zeros(a.shape, dtype='uint8')
    arr[mask] = a[mask]
    L = Image.fromarray(arr, 'RGBA')
    if blob:  # hidden hip so a swung leg never shows a cut edge
        d = ImageDraw.Draw(L)
        d.ellipse([blob[0] - blob[2], blob[1] - blob[2], blob[0] + blob[2], blob[1] + blob[2]], fill=(26, 23, 21, 255))
    return L

body_arr = a.copy().astype('uint8')
for m in (far_hind, far_front):
    body_arr[grow(m, 3)] = 0
for m in (near_hind, near_front):
    body_arr[grow(m, 2)] = 0
# sweep leftover dark/purple edge slivers out of the leg areas (the body proper has none below y=346)
loose = (r < 115) & (g < 75) & (b < 135) & (al > 20)
body_arr[loose & (poly([(0, 346), (W, 346), (W, H), (0, H)]) | poly([(425, 303), (W, 303), (W, 450), (425, 450)]))] = 0
body = Image.fromarray(body_arr, 'RGBA')

# name: (layer, pivot, fold direction, max fold in degrees, peak phase, lift px)   (+angle = foot swings forward)
LEGS = {
    'fh': (layer(far_hind, (205, 332, 30)), (205, 332), +1, 52, 0.53, 14),
    'ff': (layer(far_front, (440, 322, 30)), (440, 322), -1, 48, 0.70, 12),
    'nh': (layer(near_hind_ov), (98, 354), +1, 68, 0.45, 0),
    'nf': (layer(near_front_ov), (478, 345), -1, 70, 0.62, 0),
}
order_under, order_over = ('fh', 'ff'), ('nh', 'nf')

def fold(phi, peak):  # 0 = leg extended as drawn, 1 = fully gathered, smooth in and out
    return 0.5 + 0.5 * math.cos(2 * math.pi * (phi - peak))

def put(C, key, phi):
    L, pivot, sgn, amp, peak, lift = LEGS[key]
    f = fold(phi, peak)
    R = L.rotate(sgn * amp * f, resample=Image.BICUBIC, center=pivot)  # PIL: + = counter-clockwise = foot forward
    C.alpha_composite(R, (0, -int(lift * f)))

for i in range(N):
    phi = i / N
    C = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k in order_under: put(C, k, phi)
    C.alpha_composite(body)
    for k in order_over: put(C, k, phi)
    # sink the frame so the lowest paw meets the ground line (gives the stride its natural dip)
    ys = np.where(np.array(C)[..., 3].max(axis=1) > 60)[0]
    drop = min(MAX_DROP, H - 1 - int(ys.max()))
    F = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    F.alpha_composite(C, (0, max(0, drop)))
    F.save(OUT % i, 'WEBP', quality=94, method=6)
print('ok')
