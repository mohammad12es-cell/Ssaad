#!/usr/bin/env python3
"""SFX for «بی‌صدا یا باصدا؟» -> assets/audio/sfx-full.wav (48 kHz stereo).

The demo clip's sound design (CLIP) plays ONLY in clip B; clip A gets none (that is the point).
Other cues follow the word onsets in vo/words.json and the visual events in index.html.
"""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = json.load(open(os.path.join(ROOT, "tools", "scenes.json")))
W = json.load(open(os.path.join(ROOT, "vo", "words.json"), encoding="utf-8"))
SFX = os.path.join(ROOT, "assets", "sfx"); OUT = os.path.join(ROOT, "assets", "audio"); DUR = SC["total"]
def w(word, line):
    return next(o["t"] for o in W if o["w"] == word and o["line"] == line)
def s(n): return os.path.join(SFX, n)

# the demo clip, local time u (s): every visual event has its sound
CLIP = [(0.00, "whoosh-dark.mp3", 0.9), (0.50, "boom.mp3", 0.9), (0.50, "gen/thump.wav", 0.5),
        (1.00, "smash.mp3", 0.9), (1.00, "focus-click.mp3", 0.6),
        (1.25, "gen/tick.wav", 0.45), (1.50, "gen/tick.wav", 0.45), (1.75, "gen/tick.wav", 0.45),
        (2.00, "gen/snap.wav", 0.6), (2.00, "glint-n.wav", 0.4), (2.50, "gen/swish.wav", 0.6), (2.50, "whoosh-dark.mp3", 0.4),
        (3.00, "whoosh-dark.mp3", 0.55), (3.50, "boom.mp3", 0.55), (3.50, "focus-click.mp3", 0.5)]
B = SC["clipB"]
cues = [(B + u, n, g) for u, n, g in CLIP]
# hook: the finished sound design, first
cues += [(0.15, "whoosh-dark.mp3", 0.9), (0.65, "boom.mp3", 0.9), (0.65, "gen/thump.wav", 0.5)]
cues += [(w(x, "L1"), "focus-click-n.wav", 0.35) for x in ("صدای", "این", "ویدیو", "رو", "هم")]
cues += [(w("Claude", "L1"), "glint-n.wav", 0.4), (w("ساخت.", "L1"), "smash.mp3", 0.8)]
# title cards
for t in (SC["scenes"][1]["start"], SC["scenes"][8]["start"]):
    cues += [(t, "gen/tick.wav", 0.5), (t, "gen/thump.wav", 0.45)]
# the dead moment and «سه تا قانون»
cues += [(7.78, "gen/dead.wav", 0.5), (w("سه", "L4"), "boom.mp3", 0.6), (w("قانون.", "L4"), "gen/tick.wav", 0.4)]
# rule 1: the voice names the sound and the sound plays
cues += [(w("یک:", "L5"), "focus-click-n.wav", 0.5)] + [(w(x, "L5"), "focus-click-n.wav", 0.3) for x in ("هر", "حرکت،")]
cues += [(w("ووش", "L6a"), "whoosh-dark.mp3", 1.0), (w("ووش", "L6a"), "gen/swish.wav", 0.5),
         (w("کلیک", "L6b"), "focus-click.mp3", 1.0), (w("کلیک", "L6b") + 0.08, "focus-click-n.wav", 0.5),
         (w("بوم", "L6c"), "boom.mp3", 1.0), (w("بوم", "L6c"), "gen/thump.wav", 0.6)]
# rule 2: silence, then the hit (the music already holds the riser, the silence and the impact)
cues += [(w("دو:", "L7"), "focus-click-n.wav", 0.5), (SC["drop"], "smash.mp3", 1.0), (SC["drop"], "glint-n.wav", 0.35)]
# rule 3 and the CTA
cues += [(w("سه:", "L8"), "focus-click-n.wav", 0.5), (w("کامنت", "L10"), "focus-click-n.wav", 0.45),
         (w("«صدا»،", "L10"), "gen/snap.wav", 0.6), (w("«صدا»،", "L10"), "glint-n.wav", 0.45), (31.95, "ballwhoosh-rev.wav", 0.4)]

args, fc = ["ffmpeg", "-y", "-v", "error"], []
for i, (t, n, g) in enumerate(cues):
    args += ["-i", s(n)]
    tone = ",lowpass=f=7000" if "glint" in n else ""
    fc.append(f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo{tone},volume={g},"
              f"adelay=delays={int(round(t * 1000))}:all=1,apad=whole_dur={DUR},atrim=0:{DUR}[a{i}]")
fc.append("".join(f"[a{i}]" for i in range(len(cues))) + f"amix=inputs={len(cues)}:normalize=0:duration=longest,atrim=0:{DUR}[out]")
subprocess.run(args + ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s24le",
                       os.path.join(OUT, "sfx-full.wav")], check=True)
print("sfx-full.wav", len(cues), "cues")
