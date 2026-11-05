"""Ep03 Draw a Friend: original tune and effects, built from the shared synth."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shared"))
from sfx import Mix

m = Mix(20.0, seed=33)
sad = ["E4", None, "D4", "C4", "D4", None, "E4", None]
happy = ["C5", "E5", "G5", "E5", "F5", "E5", "D5", None, "C5", "D5", "E5", "C5", "D5", None, "G4", None]
m.tune(sad, ["A3", "F3"], bpm=96, mel_gain=0.2, square=0.0, start=0.0, end=1.9)
m.tune(happy, ["C3", "A3", "F3", "G3"], bpm=132, start=3.0, end=9.0)
m.tune(sad, ["A3", "F3"], bpm=96, mel_gain=0.2, square=0.0, start=9.4, end=11.1)
m.tune(happy, ["C3", "A3", "F3", "G3"], bpm=140, start=12.5, end=20.0)

m.rumble(0.0, 1.8, 0.12)
m.scribble(1.95, 1.0)
m.pop(3.0, 900, 0.35); m.ding(3.1, 0.25)
m.steps(3.4, 4, 0.17, 0.2)
m.scribble(5.1, 1.7, 0.4)
m.pop(6.85, 700, 0.4); m.boing(7.0, 0.3)
m.pop(7.6, 1200, 0.25)
m.gulp(8.5, 0.3)
m.steps(9.0, 9, 0.18, 0.25)
m.scribble(11.15, 1.4)
m.bark(12.6); m.bark(12.85)
m.steps(12.65, 3, 0.1, 0.25)
m.pop(13.1, 1100, 0.3); m.pop(13.3, 1250, 0.3)
m.bark(14.1, 0.35)
m.whoosh(15.45, 0.3, 0.25)
m.crunch(15.75, 0.6)
m.gulp(16.3, 0.35, 420)
m.burp(17.5, 0.55)
m.scribble(17.6, 0.7, 0.25)
m.bark(18.6, 0.35)
m.write(sys.argv[1] if len(sys.argv) > 1 else "assets/audio.wav", mutes=[(1.9, 3.0), (15.7, 17.4)])
print("ok")
