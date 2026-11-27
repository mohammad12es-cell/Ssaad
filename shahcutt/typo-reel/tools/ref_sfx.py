#!/usr/bin/env python3
"""Sound-alike of the reference's sound design, rebuilt from measurements (no samples of the original are used).

Analysis of the reference -> parameters -> new synthesis:
1. Tones (> 150 Hz): partial tracking on a 4096-point STFT (5.3 ms hop). Peaks 9 dB over the local floor are linked
   frame to frame (within 18 Hz, gaps up to 3 frames); tracks of >= 80 ms become new sine oscillators that follow the
   measured frequency (vibrato included) and level, per channel.
2. Noise above 150 Hz: what is not tonal is measured as energy in 14 log bands every 5.3 ms (1024-point STFT) per
   channel; fresh white noise is shaped by those envelopes (random phase).
3. Noise below 150 Hz (the rumble, the low end of hits): 4 bands on a 2048-point STFT, same method.
The signal is padded by 4096 samples each side for analysis and synthesis, then trimmed.

usage: ref_sfx.py <ref.wav 48 kHz stereo> <out.wav> [--report]
"""
import sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(5)

def read(p):
    w = wave.open(p); assert w.getframerate() == SR and w.getnchannels() == 2
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(float) / 32768

def stft(x, n, hop):
    win = np.hanning(n); k = 1 + (len(x) - n) // hop
    return np.array([np.fft.rfft(x[i * hop:i * hop + n] * win) for i in range(k)])

def istft(X, length, n, hop):
    win = np.hanning(n); out = np.zeros(length + n); norm = np.zeros(length + n)
    for i, spec in enumerate(X):
        out[i * hop:i * hop + n] += np.fft.irfft(spec, n) * win; norm[i * hop:i * hop + n] += win ** 2
    return out[:length] / np.maximum(norm[:length], 1e-6)

def track_partials(X, n, hop):
    """X: frames x bins complex (n-point). Returns list of tracks: (frame_idx array, freq array, amp array)."""
    f = np.fft.rfftfreq(n, 1 / SR); mag = np.abs(X); db = 20 * np.log10(mag + 1e-9); win_sum = np.hanning(n).sum()
    from numpy.lib.stride_tricks import sliding_window_view
    floor = np.median(sliding_window_view(np.pad(db, ((0, 0), (40, 40)), mode="edge"), 81, axis=1), axis=-1)
    tracks, active = [], []
    for t in range(db.shape[0]):
        row = db[t]; ok = (row > floor[t] + 9) & (row > np.roll(row, 1)) & (row >= np.roll(row, -1)) & (f > 150) & (f < 16000)
        pk = []
        for b in np.where(ok)[0]:
            if 0 < b < len(f) - 1:
                a0, a1, a2 = row[b - 1], row[b], row[b + 1]; d = 0.5 * (a0 - a2) / (a0 - 2 * a1 + a2 + 1e-9)
                pk.append(((b + d) * SR / n, 10 ** ((a1 - 0.25 * (a0 - a2) * d) / 20) * 2 / win_sum))
        used = set(); nxt = []
        for tr in active:
            last_f = tr["f"][-1]; best, bd = None, 18.0
            for i, (pf, pa) in enumerate(pk):
                if i not in used and abs(pf - last_f) < bd: best, bd = i, abs(pf - last_f)
            if best is not None:
                used.add(best); tr["t"].append(t); tr["f"].append(pk[best][0]); tr["a"].append(pk[best][1]); tr["miss"] = 0; nxt.append(tr)
            elif tr["miss"] < 3: tr["miss"] += 1; nxt.append(tr)
            else: tracks.append(tr)
        for i, (pf, pa) in enumerate(pk):
            if i not in used: nxt.append({"t": [t], "f": [pf], "a": [pa], "miss": 0})
        active = nxt
    tracks += active
    return [(np.array(tr["t"]), np.array(tr["f"]), np.array(tr["a"])) for tr in tracks if tr["t"][-1] - tr["t"][0] >= 15]

def synth_tracks(tracks_by_ch, L, n, hop):
    out = np.zeros((L, 2)); ts = np.arange(L) / SR
    for c, tracks in enumerate(tracks_by_ch):
        for fr_idx, fq, am in tracks:
            tt = (fr_idx * hop + n / 2) / SR
            s0, s1 = int(max(0, tt[0] - 0.01) * SR), int(min(L / SR, tt[-1] + 0.01) * SR)
            seg_t = ts[s0:s1]
            f_i = np.interp(seg_t, tt, fq); a_i = np.interp(seg_t, tt, am, left=0, right=0)
            fade = np.minimum(1, np.minimum(seg_t - seg_t[0], seg_t[-1] - seg_t) / 0.008)
            out[s0:s1, c] += a_i * fade * np.sin(2 * np.pi * np.cumsum(f_i) / SR + rng.uniform(0, 6.28))
    return out

def shaped_noise(mag, edges, n, hop, L, mask=None):
    f = np.fft.rfftfreq(n, 1 / SR); band = np.clip(np.searchsorted(edges, f) - 1, -1, len(edges) - 2)
    if mask is not None: mag = mag * (1 - mask)
    nb = len(edges) - 1; E = np.zeros((mag.shape[0], nb))
    for k in range(nb):
        sel = band == k
        if sel.any(): E[:, k] = np.sqrt((mag[:, sel] ** 2).mean(1))
    cen = np.sqrt(edges[:-1] * edges[1:])
    shape = np.array([np.interp(np.log(np.maximum(f, edges[0])), np.log(cen), E[t]) for t in range(mag.shape[0])])
    shape[:, (f < edges[0]) | (f > edges[-1])] = 0
    Z = stft(rng.normal(0, 1, L), n, hop); Z = Z / (np.abs(Z) + 1e-9) * shape
    return istft(Z, L, n, hop)

def rebuild(x):
    PAD = 4096; x = np.pad(x, ((PAD, PAD), (0, 0)))                            # no window-edge blow-up at the ends
    L = len(x); out = np.zeros((L, 2)); NT, HT = 4096, 256; NH, HH = 1024, 256; NL, HL = 2048, 256
    tracks_by_ch = []
    for c in range(2):
        XT = stft(x[:, c], NT, HT); tracks_by_ch.append(track_partials(XT, NT, HT))
    out += synth_tracks(tracks_by_ch, L, NT, HT)
    fH = np.fft.rfftfreq(NH, 1 / SR)
    for c in range(2):
        XH = stft(x[:, c], NH, HH); mag = np.abs(XH)
        mask = np.zeros_like(mag)                       # bins owned by a tone at that frame
        for fr_idx, fq, am in tracks_by_ch[c]:
            tt = (fr_idx * HT + NT / 2) / SR; fh = (np.arange(mag.shape[0]) * HH + NH / 2) / SR
            on = (fh >= tt[0]) & (fh <= tt[-1]); fi = np.interp(fh, tt, fq)
            for t in np.where(on)[0]:
                b = fi[t] * NH / SR; mask[t, max(0, int(b) - 1):int(b) + 3] = 1
        out[:, c] += shaped_noise(mag, np.geomspace(150, 20000, 15), NH, HH, L, mask)
        XL = stft(x[:, c], NL, HL)
        out[:, c] += shaped_noise(np.abs(XL), np.array([18, 40, 70, 110, 150.0]), NL, HL, L)
    return out[PAD:-PAD], [[(t, f, a) for t, f, a in tr] for tr in tracks_by_ch]

if __name__ == "__main__":
    x = read(sys.argv[1]); y, tr = rebuild(x)
    y *= np.sqrt((x ** 2).mean() / max((y ** 2).mean(), 1e-12))                   # same RMS as the reference
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    if "--report" in sys.argv:
        rows = [((t[0] * 256 + 2048 - 4096) / SR, (t[-1] * 256 + 2048 - 4096) / SR, float(np.median(f)), 20 * np.log10(a.max() + 1e-9)) for t, f, a in tr[0]]
        print(f"{len(rows)} tone tracks (left channel), longest/loudest first:")
        for s, e, fq, db in sorted(rows, key=lambda r: -(r[3] + 20 * (r[1] - r[0])))[:24]:
            print(f"  {s:5.2f}-{e:5.2f} s  {fq:7.1f} Hz  {db:6.1f} dB")
