"""Builds an 8-frame gallop (public/assets/dog_run_0..7.webp) from public/assets/dog_run.webp.
The dog is cut into body + four legs; legs swing about hip/knee pivots on a gallop cycle.
Run: python3 tools/make_dog_frames.py   (needs Pillow + numpy)"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC, OUT, N, PAD = 'public/assets/dog_run.webp', 'public/assets/dog_run_%d.webp', 8, 40
im = Image.open(SRC).convert('RGBA')
W, H = im.size
a = np.array(im).astype(int)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0

dark = (r < 52) & (g < 52) & (b < 52) & (al > 40)
orange = (r > 190) & (g > 110) & (b < 120) & (al > 40)
# leg regions (original pixel coords of dog_run)
far_hind = dark & poly([(180, 280), (320, 280), (320, 490), (180, 490)])
far_front = dark & poly([(425, 282), (640, 282), (640, 430), (425, 430)])
near_hind = orange & poly([(0, 334), (196, 334), (196, 400), (80, 470), (0, 470)])
near_front = orange & poly([(330, 330), (505, 330), (505, 450), (330, 450)])
# overlap copies so the joint seam stays hidden (these pixels stay in the body too)
near_hind_ov = orange & poly([(0, 318), (196, 318), (196, 400), (80, 470), (0, 470)])
near_front_ov = orange & poly([(330, 314), (505, 314), (505, 450), (330, 450)])

def grow(m, px=2):
    return np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(px * 2 + 1))) > 0

def layer(mask, extra=None):
    arr = np.zeros_like(a, dtype='uint8')
    arr[mask] = a[mask]
    L = Image.fromarray(arr, 'RGBA')
    if extra:  # synthesised hidden leg top (solid black paper) so a swung leg never shows a cut edge
        ImageDraw.Draw(L).polygon(extra, fill=(26, 23, 21, 255))
    return L

body_arr = a.copy().astype('uint8')
# clear the legs plus their 1-2px dark/purple edge shadow so no stray lines are left in the body
below = poly([(0, 296), (W, 296), (W, H), (0, H)])
for m, reg in ((far_hind, 'fh'), (far_front, 'ff'), (near_hind, 'nh'), (near_front, 'nf')):
    body_arr[grow(m, 4) & below] = 0
    body_arr[grow(m, 2)] = 0
body = Image.fromarray(body_arr, 'RGBA')
# far legs get a hidden "thigh" so they can rotate under the body
legs = {
    'fh': (layer(far_hind, [(204, 240), (272, 240), (272, 300), (204, 300)]), (238, 262)),
    'ff': (layer(far_front, [(445, 262), (505, 262), (505, 320), (440, 320)]), (478, 288)),
    'nh': (layer(near_hind_ov), (125, 338)),
    'nf': (layer(near_front_ov), (428, 334)),
}

def swing(c, amp, phase, phi):  # forward(+)/back(-) angle in degrees
    return c + amp * math.cos(2 * math.pi * (phi - phase))

# (centre, amplitude, phase lag, base angle of that leg in dog_run); + = foot forward
GAIT = {'fh': (-8, 36, 0.10, -8), 'nh': (-7, 38, 0.0, -45), 'ff': (22, 40, 0.08, 70), 'nf': (-2, 32, 0.0, 15)}

def put(canvas, L, pivot, delta, lift):
    px, py = pivot[0], pivot[1] + PAD
    R = L.rotate(delta, resample=Image.BICUBIC, center=pivot)  # PIL: positive = counter-clockwise = foot forward
    canvas.alpha_composite(R, (0, PAD - lift))

for i in range(N):
    phi = i / N
    C = Image.new('RGBA', (W, H + PAD), (0, 0, 0, 0))
    ang = {}
    for k in ('fh', 'ff'):
        pass
    def delta(k):
        c, amp, ph, base = GAIT[k]
        t = swing(c, amp, ph, phi)
        return t - base, max(0.0, -math.sin(2 * math.pi * (phi - ph))) * 0  # lift computed below
    def lift(k):
        c, amp, ph, base = GAIT[k]
        v = -math.sin(2 * math.pi * (phi - ph))  # >0 while the leg recovers forward
        return int(16 * max(0.0, v))
    for k in ('fh', 'ff'):
        L, p = legs[k]
        put(C, L, p, delta(k)[0], lift(k))
    C.alpha_composite(body, (0, PAD))
    for k in ('nh', 'nf'):
        L, p = legs[k]
        put(C, L, p, delta(k)[0], 0)
    C.save(OUT % i, 'WEBP', quality=94, method=6)
print('ok')
