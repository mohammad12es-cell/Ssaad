"""Pre-mix the sample's SFX into assets/audio/sfx-mix.wav (7 s, 48 kHz stereo).

Group A (hook + rewind) is cut hard at 3.89 s so v1 plays in total silence.
"""
import os
import subprocess

FF = os.path.join(os.environ["LOCALAPPDATA"], "AVFX", "ffmpeg", "ffmpeg.exe")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "assets", "sfx")
OUT = os.path.join(ROOT, "assets", "audio")
DUR = 7.0
os.makedirs(OUT, exist_ok=True)

# tape rewind: reversed ball whoosh, pitched down, low-passed
REW = os.path.join(OUT, "rewind.wav")
subprocess.run([FF, "-y", "-v", "error", "-i", os.path.join(SFX, "ballwhoosh-rev.wav"),
                "-af", "asetrate=38400,aresample=48000,lowpass=f=3000,atrim=0:0.6,afade=t=out:st=0.59:d=0.01",
                "-c:a", "pcm_s24le", REW], check=True)

def s(name):
    return name if os.path.isabs(name) else os.path.join(SFX, name)

A = ([(0.10, "focus-click.mp3", 0.9), (0.45, "focus-click.mp3", 0.9), (0.85, "boom.mp3", 1.0)]
     + [(t, "focus-click-n.wav", 0.45) for t in (1.35, 1.47, 1.59, 1.71, 1.83)]
     + [(2.40, "whoosh-dark.mp3", 0.8)]
     + [(t, "focus-click-n.wav", 0.4) for t in (2.68, 2.80, 2.92, 3.08, 3.18)]
     + [(3.30, REW, 0.9)])
B = ([(5.0, "focus-click-n.wav", 0.6), (5.6, "focus-click.mp3", 0.9), (5.6, "boom.mp3", 0.7)]
     + [(t, "focus-click-n.wav", 0.35) for t in (5.95, 6.05, 6.15, 6.30, 6.38, 6.46, 6.54)]
     + [(6.62, "glint-n.wav", 0.6)])

args, fc = [FF, "-y", "-v", "error"], []
cues = A + B
for i, (t, name, vol) in enumerate(cues):
    args += ["-i", s(name)]
    fc.append(f"[{i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
              f"volume={vol},adelay=delays={int(round(t * 1000))}:all=1,apad=whole_dur={DUR},atrim=0:{DUR}[a{i}]")
na = len(A)
fc.append("".join(f"[a{i}]" for i in range(na))
          + f"amix=inputs={na}:normalize=0:duration=longest,afade=t=out:st=3.89:d=0.01[A]")
fc.append("".join(f"[a{i}]" for i in range(na, len(cues)))
          + f"amix=inputs={len(cues) - na}:normalize=0:duration=longest[B]")
fc.append(f"[A][B]amix=inputs=2:normalize=0:duration=longest,apad=whole_dur={DUR},atrim=0:{DUR}[out]")
args += ["-filter_complex", ";".join(fc), "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s24le",
         os.path.join(OUT, "sfx-mix.wav")]
subprocess.run(args, check=True)
print("ok:", os.path.join(OUT, "sfx-mix.wav"), len(cues), "cues")
