#!/usr/bin/env python3
"""Cut the one-take VO into its 9 lines at the measured pauses and place each line on its beat.

usage: place_vo.py <vo-full.wav> <out vo-placed.wav 48 kHz stereo> [--total 23.4]
Speech chunks are found by loudness (quieter than peak - 40 dB for >= 0.2 s is a pause). The script has 14 chunks:
lines 4-8 are «number،» + phrase, the others one chunk each (CHUNKS below). Inside a line the pause after the
number keeps 0.22 s; every chunk keeps 50 ms before and 80 ms after. The voice is cleaned (high-pass 80 Hz, light
compression, presence). Whisper (work/whisper.json) was used to check that every line was spoken as written.
"""
import subprocess, sys, wave
import numpy as np

SR = 48000
START = [0.30, 3.00, 4.60, 6.08, 8.70, 11.40, 14.08, 16.80, 19.45]
CHUNKS = [1, 1, 1, 2, 2, 2, 2, 2, 1]
GAP_IN_LINE = 0.22

def main():
    src, out = sys.argv[1], sys.argv[2]
    total = float(sys.argv[sys.argv.index("--total") + 1]) if "--total" in sys.argv else 23.4
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-af",
                          "highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=6:release=120:makeup=2dB,equalizer=f=4000:t=q:w=1:g=2",
                          "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(float)
    h = int(0.01 * SR); k = len(x) // h
    db = 20 * np.log10(np.sqrt((x[:k * h].reshape(k, h) ** 2).mean(1)) + 1e-9); loud = db >= db.max() - 40
    chunks, i = [], 0                                     # speech runs, bridging pauses shorter than 0.2 s
    while i < k:
        if loud[i]:
            j = i
            while j < k and (loud[j] or (j + 20 < k and loud[j:j + 20].any())): j += 1
            chunks.append((i * 0.01, j * 0.01)); i = j
        else: i += 1
    chunks = [c for c in chunks if c[1] - c[0] > 0.12]                 # drops breaths and clicks
    assert len(chunks) == sum(CHUNKS), f"found {len(chunks)} speech chunks, expected {sum(CHUNKS)}: {chunks}"
    N = int(total * SR); y = np.zeros(N); f = int(0.012 * SR); ci = 0
    for line, (n, at) in enumerate(zip(CHUNKS, START)):
        parts = []
        for c in chunks[ci:ci + n]:
            s0, s1 = max(0, c[0] - 0.05), min(len(x) / SR, c[1] + 0.08)
            seg = x[int(s0 * SR):int(s1 * SR)].copy(); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
            parts.append(seg)
        ci += n
        sil = np.zeros(int((GAP_IN_LINE - 0.13) * SR))
        seg = parts[0] if n == 1 else np.concatenate([parts[0], sil, parts[1]])
        i0 = int((at - 0.05) * SR); i1 = min(N, i0 + len(seg)); y[i0:i1] += seg[:i1 - i0]
        print(f"line {line + 1}: {at:5.2f}-{at - 0.05 + len(seg) / SR:5.2f} s" + ("   (cut at the end of the reel!)" if i0 + len(seg) > N else ""))
    with wave.open(out, "wb") as w:
        st = np.stack([y, y], 1); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    main()
