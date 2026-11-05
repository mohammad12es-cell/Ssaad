"""Ep02 Ink Blot: original tune and effects, built from the shared synth."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shared"))
from sfx import Mix

m = Mix(20.0, seed=12)
mel = ["A4", "C5", "E5", "C5", "D5", "C5", "A4", None, "G4", "B4", "D5", "B4", "C5", "A4", "G4", None,
       "A4", "C5", "E5", "G5", "E5", "D5", "C5", None, "D5", "C5", "A4", "G4", "A4", None, "E5", None]
bass = ["A3", "A3", "F3", "G3", "A3", "E3", "F3", "G3"]
m.tune(mel, bass, bpm=136, square=0.18)

m.whoosh(0.0, 0.38, 0.3); m.splat(0.38, 0.9)
m.scribble(1.9, 0.6); m.pop(2.5, 1100, 0.3)
for t in (2.85, 5.0, 6.9):
    m.rub(t, 0.6, 0.45)
for t, f in ((3.5, 700), (5.6, 820), (7.5, 950)):
    m.pop(t, f, 0.5); m.pop(t + 0.08, f * 1.3, 0.35); m.splat(t + 0.34, 0.35)
m.gulp(5.7, 0.3); m.gulp(7.62, 0.35)
m.steps(8.0, 6, 0.18, 0.22)
m.thud(8.75, 300, 0.15, 0.3)
m.ding(9.45, 0.3)
m.scribble(9.5, 0.6)
for i in range(8):
    t = 10.6 + i * 0.24
    m.blip(t, 500 + i * 40, 0.18)
    m.gulp(t + 0.36, 0.28, 650 - i * 30)
m.pop(12.85, 900, 0.3); m.pop(13.2, 1000, 0.3)
m.rumble(14.6, 1.0, 0.7)
m.boing(15.2, 0.35); m.thud(15.3, 70, 0.6, 0.9)
m.ha(16.4, 0.45, 120)
m.scribble(17.35, 0.55)
m.blip(18.05, 400, 0.3)
m.whoosh(18.2, 0.3, 0.35)
m.slam(18.6, 0.9)
m.blip(19.2, 700, 0.15, up=False)
m.write(sys.argv[1] if len(sys.argv) > 1 else "assets/audio.wav", mutes=[(14.55, 17.3)])
print("ok")
