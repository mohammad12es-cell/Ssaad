"""ADAM BARFI — Black Friday: master timeline shared by audio and picture.

Music is 120 BPM. Beat k lands at  T0 + k*BEAT  (T0 = 0.2 s after a short black frame).
Every cut, text hit and impact is placed on this grid so picture and sound lock.
"""
FPS = 30
W, H = 1080, 1920
BPM = 120
BEAT = 60.0 / BPM
T0 = 0.2
DURATION = 25.7


def b(k):
    """time (s) of beat k"""
    return T0 + k * BEAT


# Instagram handle shown in the CTA pill. Left empty on purpose (no unverified
# username is invented). Set it, e.g.  HANDLE=@yourshop python3 src/render.py
import os
HANDLE = os.environ.get("HANDLE", "").strip()

# ---------------------------------------------------------------- picture edit
# (out_start, out_end, source, src_in, speed, params)
#   source: 'store' | 'fur' (prepped clips) | photo file name | 'black'
SHOTS = [
    # SCENE 01 — hook: burgundy velvet garland, slow motion
    (0.0,   b(0),  'black', 0, 1, {}),
    (b(0),  b(3),  'store', 0.10, 0.70, dict(zoom=(1.06, 1.10))),
    (b(3),  b(6),  'store', 4.05, 0.65, dict(zoom=(1.08, 1.04))),
    # SCENE 02 — brand: tree + ADAM BARFI sign
    (b(6),  b(9),  'store', 7.00, 0.80, dict(zoom=(1.04, 1.06), roll=1.6)),
    (b(9),  b(14), 'store', 9.55, 0.55, dict(zoom=(1.03, 1.08), roll=1.6)),
    # SCENE 03 — fashion experience: storefront + runway inserts
    (b(14), b(17), 'store', 17.2, 1.00, dict(zoom=(1.03, 1.07))),
    (b(17), b(19), 'fur',   4.55, 1.00, dict(zoom=(1.00, 1.04))),
    (b(19), b(20), 'p2_floral_knit_front.jpg', 0, 1, dict(cx=0.50, cy=0.48, zoom=(1.00, 1.05))),
    (b(20), b(21), 'p6_orange_studded_knit.jpg', 0, 1, dict(cx=0.45, cy=0.50, zoom=(1.05, 1.00))),
    (b(21), b(22), 'p9_red_tweed_suit.jpg', 0, 1, dict(cx=0.50, cy=0.40, zoom=(1.00, 1.05))),
    (b(22), b(23), 'p3_red_peanut_knit.jpg', 0, 1, dict(cx=0.58, cy=0.50, zoom=(1.05, 1.00))),
    (b(23), b(24), 'fur',   7.00, 1.00, dict(zoom=(1.02, 1.05))),
    # SCENE 04 — discount reveal over the velvet garland, then product montage
    (b(24), b(32), 'store', 1.30, 0.55, dict(zoom=(1.12, 1.18), dim=0.55)),
    (b(32), b(33), 'p10_taupe_sweetheart_knit.jpg', 0, 1, dict(cx=0.50, cy=0.50, zoom=(1.00, 1.04), dim=0.25)),
    (b(33), b(34), 'p4_fur_coat_mirror.jpg', 0, 1, dict(cx=0.52, cy=0.50, zoom=(1.04, 1.00), dim=0.25)),
    (b(34), b(35), 'p1_black_jumpsuit.jpg', 0, 1, dict(cx=0.42, cy=0.47, zoom=(1.00, 1.04), dim=0.25)),
    (b(35), b(36), 'p5_taupe_knit_front.jpg', 0, 1, dict(cx=0.50, cy=0.50, zoom=(1.04, 1.00), dim=0.25)),
    # SCENE 05a — the ADAM BARFI Black Friday board walk (re-branded ad photo)
    (b(36), b(40), 'p11_sign_walk_adambarfi_9x16.jpg', 0, 1, dict(cx=0.5, cy=0.5, zoom=(1.00, 1.07))),
    # SCENE 05b — CTA on the brand sign (bookend), slow and steady
    (b(40), DURATION, 'store', 9.45, 0.24, dict(zoom=(1.02, 1.07), roll=1.6, dim=0.12)),
]

# ---------------------------------------------------------------- voiceover
# Default cut has NO narration (music + sound design + Persian on-screen text).
# NARRATION=1 restores the Persian voiceover version.
NARRATION = os.environ.get("NARRATION", "0") == "1"
# (file, start). Start times are chosen from Whisper word timings so that
# "سی" (thirty) in line 3 lands on the 30% reveal at beat 28.
VO = [
    ('vo1.wav', 0.38),
    ('vo2.wav', 3.80),
    ('vo3.wav', b(28) - 2.10),
    ('vo4.wav', 15.10),
    ('vo5.wav', 18.80),
    ('vo6.wav', 22.30),
]
if not NARRATION:
    VO = []
