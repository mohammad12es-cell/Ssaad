#!/usr/bin/env python3
"""Sound design for typo-reel -> assets/audio/sfx.wav (48 kHz stereo, length = the reel).

The reference's own sound design, rebuilt from measurements by tools/ref_sfx.py (new oscillators and shaped noise,
no samples of the original), placed on the reel by device:

  hook + black   0 - 5.965 s       the rebuilt reference as it is (the hook follows the reference beat for beat)
  each mistake   tau 0             ref 5.90-6.60 s  cut back, focus pull, word lands       (device E)
                 tau 1.20          ref 2.80-3.80 s  cursor click, morph impact, low tail   (device B)
                 tau 2.19          ref 3.90-4.60 s  smear exit: whoosh + 336/895 Hz tones  (device C1)
  CTA            19.405 s          ref 5.90-7.54 s  cut back, word lands, tail             (device E)
  everywhere     the reference's quiet stretch (ref 1.45-2.80 s: low rumble + the high C) as a seamless bed,
                 faded in only where no device sound covers it, so the drone never drops out.

usage: make_sfx.py <ref-rebuilt.wav> [--beats 5.965,8.665,...] [--cta 19.47] [--total 22.5]
"""
import argparse, os, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rd(p):
    w = wave.open(p); assert w.getframerate() == SR
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("rebuilt")
    ap.add_argument("--beats", default="5.965,8.665,11.365,14.065,16.765"); ap.add_argument("--cta", type=float, default=19.47)
    ap.add_argument("--total", type=float, default=22.5); ap.add_argument("--out", default="assets/audio/sfx.wav")
    a = ap.parse_args()
    R = rd(a.rebuilt); N = int(a.total * SR); out = np.zeros((N, 2)); cover = np.zeros(N)
    def seg(t0, t1, at, gain=1.0, fin=0.01, fout=0.12):
        s = R[int(t0 * SR):int(t1 * SR)].copy(); n = len(s)
        env = np.ones(n); fi, fo = int(fin * SR), int(fout * SR)
        env[:fi] = np.linspace(0, 1, fi); env[n - fo:] *= np.linspace(1, 0, fo)
        s0 = int(at * SR); e = min(N, s0 + n); k = e - s0
        if k <= 0: return
        out[s0:e] += s[:k] * env[:k, None] * gain; cover[s0:e] = np.maximum(cover[s0:e], env[:k])
    beats = [float(b) for b in a.beats.split(",")]
    seg(0.0, 5.965, 0.0, fin=0.0, fout=0.02)                                 # hook + black, as the reference
    for k, t in enumerate(beats):
        if k == 0: seg(5.965, 6.60, t, fin=0.0)                              # straight on from the black scene
        else: seg(5.90, 6.60, t - 0.065, gain=0.8, fin=0.02)                 # cut-in without the black: a touch softer
        seg(2.80, 3.80, t + 1.20, fout=0.3)                                  # fix: click, impact, low tail
        seg(3.90, 4.60, t + 2.19, fout=0.05)                                 # exit
    seg(5.90, len(R) / SR, a.cta - 0.065, fin=0.02, fout=0.4)                # CTA
    # the bed: ref 1.45-2.80 s looped with 0.35 s equal-power crossfades
    b0, b1, xf = int(1.45 * SR), int(2.80 * SR), int(0.35 * SR); B = R[b0:b1]; L = len(B)
    bed = np.zeros((N + L, 2)); pos = 0; fade_in = np.sqrt(np.linspace(0, 1, xf))[:, None]; fade_out = np.sqrt(np.linspace(1, 0, xf))[:, None]
    while pos < N:
        piece = B.copy(); piece[:xf] *= fade_in; piece[-xf:] *= fade_out
        bed[pos:pos + L] += piece; pos += L - xf
    bed = bed[:N]
    sm = np.convolve(cover, np.ones(int(0.06 * SR)) / int(0.06 * SR), "same")
    gap = np.clip(1 - sm, 0, 1)[:, None]
    tail = np.clip((a.total - np.arange(N) / SR) / 1.2, 0, 1)[:, None]      # everything fades over the last 1.2 s
    mix = (out + bed * gap) * tail
    pk = np.abs(mix).max()
    os.makedirs(os.path.join(ROOT, "assets", "audio"), exist_ok=True)
    with wave.open(os.path.join(ROOT, a.out), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"{a.out}: {a.total} s, peak {pk:.2f}")

if __name__ == "__main__":
    main()
