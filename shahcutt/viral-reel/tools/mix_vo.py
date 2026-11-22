"""Place the Gemini voice (Puck) on the 7 s sample and duck the SFX under it.

in : assets/audio/vo-gemini.wav (24 kHz mono, 7.08 s), assets/audio/sfx-mix.wav
out: assets/audio/vo-placed.wav (voice stem), assets/audio/mix-vo.wav (final pre-master)

Each sentence is cut in silence (40 ms pre-roll before the onset found by
silencedetect -40 dB), given 5 ms fades, optionally sped up with atempo and
dropped at a fixed time. Lines 1-3 finish by ~4.25 s so the raw v1 keeps
~0.7 s of total silence before line 4.
"""
import os
import subprocess

FF = os.path.join(os.environ["LOCALAPPDATA"], "AVFX", "ffmpeg", "ffmpeg.exe")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, "assets", "audio")
VO = os.path.join(AUD, "vo-gemini.wav")
SFX = os.path.join(AUD, "sfx-mix.wav")
DUR = 7.0
FADE = 0.005
SFX_GAIN_DB = -7.0  # static, before sidechain ducking

# (src_start, src_end, tempo, place_at)  -> speech onset ~ place_at + 0.04/tempo
CLIPS = [
    (0.00, 1.36, 1.00, 0.10),  # «اینو Claude ساخت.»          speech 0.10-1.40
    (1.47, 3.12, 1.06, 1.46),  # «یه خط کد هم ننوشتم.»       speech 1.50-2.96
    (3.30, 4.58, 1.06, 3.06),  # «ولی نسخه‌ی اولش این بود.»  speech 3.11-4.24
    (4.76, 7.08, 1.04, 4.92),  # «کلمه به کلمه، نه حرف به حرف.» speech 4.96-6.87
]

FMT = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo"
parts = [f"[0:a]aresample=48000,{FMT},asplit={len(CLIPS)}" + "".join(f"[v{i}]" for i in range(len(CLIPS)))]
for i, (a, b, tempo, at) in enumerate(CLIPS):
    d = (b - a) / tempo
    chain = f"[v{i}]atrim={a}:{b},asetpts=PTS-STARTPTS"
    if tempo != 1.0:
        chain += f",atempo={tempo}"
    ms = int(round(at * 1000))
    chain += (f",afade=t=in:st=0:d={FADE},afade=t=out:st={d - FADE:.4f}:d={FADE}"
              f",adelay={ms}|{ms}[c{i}]")
    parts.append(chain)
parts.append("".join(f"[c{i}]" for i in range(len(CLIPS)))
             + f"amix=inputs={len(CLIPS)}:normalize=0,apad=whole_dur={DUR},atrim=0:{DUR},"
               f"afade=t=out:st={DUR - 0.05}:d=0.05,asplit=3[vo][key][stem]")
parts.append(f"[1:a]{FMT},volume={SFX_GAIN_DB}dB[sfx0]")
parts.append("[sfx0][key]sidechaincompress=threshold=0.03:ratio=4:attack=5:release=250[sfxd]")
parts.append(f"[vo][sfxd]amix=inputs=2:normalize=0,atrim=0:{DUR}[mix]")

subprocess.run([FF, "-y", "-v", "error", "-i", VO, "-i", SFX,
                "-filter_complex", ";".join(parts),
                "-map", "[mix]", "-c:a", "pcm_s24le", os.path.join(AUD, "mix-vo.wav"),
                "-map", "[stem]", "-c:a", "pcm_s24le", os.path.join(AUD, "vo-placed.wav")],
               check=True)
print("wrote mix-vo.wav + vo-placed.wav")
