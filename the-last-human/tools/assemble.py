#!/usr/bin/env python3
"""Encode the three deliverables + preview from build/frames, build/audio/mix.wav and build/subs.
H.264 High, yuv420p, 1080x1920, 30 fps CFR, exactly 900 frames; AAC 48 kHz stereo 192 kb/s."""
import json, os, subprocess, sys, shutil
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
VER = next((a.split("=")[1] for a in sys.argv[1:] if a.startswith("--version=")), "")
SUF = f"_{VER}" if VER else ""
FRAMES = f"build/frames{SUF}"; AUDIO_WAV = f"build/audio{SUF}/mix.wav"; SUBS = f"build/subs{SUF}"; SRTDIR = f"subtitles/{VER}" if VER else "subtitles"
out = f"output/{VER}" if VER else "output"; os.makedirs(out, exist_ok=True)
TAG = f"EP01_{VER.upper()}" if VER else "EP01"
cues = json.load(open(f"{SUBS}/cues.json"))
n = len([f for f in os.listdir(FRAMES) if f.endswith(".png")])
assert n == 900, f"expected 900 frames, found {n}"
VIDEO = ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "16M", "-bufsize", "32M", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2",
         "-r", "30", "-g", "60", "-x264-params", "keyint=60:min-keyint=30", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
AUDIO = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
def encode(name, lang=None):
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", "30", "-i", f"{FRAMES}/f%04d.png"]
    fc, last, k = [], "[0:v]", 1
    for c in (cues[lang] if lang else []):
        d = c["end"] - c["start"]
        cmd += ["-loop", "1", "-framerate", "30", "-t", f"{d:.3f}", "-i", c["png"]]
        fc.append(f"[{k}:v]format=rgba,fade=in:st=0:d=0.12:alpha=1,fade=out:st={d - 0.12:.3f}:d=0.12:alpha=1,setpts=PTS-STARTPTS+{c['start']:.3f}/TB[s{k}]")
        fc.append(f"{last}[s{k}]overlay=0:0:eof_action=pass:enable='between(t,{c['start']:.3f},{c['end']:.3f})'[v{k}]")
        last = f"[v{k}]"; k += 1
    cmd += ["-i", AUDIO_WAV]
    if fc: cmd += ["-filter_complex", ";".join(fc), "-map", last]
    else: cmd += ["-map", "0:v"]
    cmd += ["-map", f"{k}:a"] + VIDEO + AUDIO + ["-frames:v", "900", "-t", "30", "-movflags", "+faststart",
            "-metadata", f"title=THE LAST HUMAN — EP01 NO SIGNAL{(' (' + VER + ')') if VER else ''}", os.path.join(out, name)]
    subprocess.run(cmd, check=True); print("wrote", name)
encode(f"THE_LAST_HUMAN_{TAG}_CLEAN.mp4")
encode(f"THE_LAST_HUMAN_{TAG}_FA.mp4", "fa")
encode(f"THE_LAST_HUMAN_{TAG}_EN.mp4", "en")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", os.path.join(out, f"THE_LAST_HUMAN_{TAG}_FA.mp4"), "-vf", "scale=540:960:flags=lanczos",
                "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
                os.path.join(out, f"THE_LAST_HUMAN_{TAG}_PREVIEW_540p.mp4")], check=True); print("wrote preview")
for s in ("FA", "EN"): shutil.copy(os.path.join(SRTDIR, f"EP01_{s}.srt"), os.path.join(out, f"{TAG}_{s}.srt"))
print("copied SRT files")
