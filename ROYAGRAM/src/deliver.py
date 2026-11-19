#!/usr/bin/env python3
"""Encode + package all ROYAGRAM deliverables from rendered frames and the audio mix.
usage: python3 src/deliver.py   (run from the ROYAGRAM folder after render.mjs and audio/build_audio.py)"""
import json, os, subprocess, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
D = 'deliverables'; os.makedirs(D, exist_ok=True); os.makedirs(f'{D}/thumbnails', exist_ok=True); os.makedirs(f'{D}/audio', exist_ok=True)
FR = 'renders/frames/f%05d.png'
X264 = ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart']
AAC = ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000']
def ff(*a): print('ffmpeg', ' '.join(a[-1:])); subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *a], check=True)

# 1. clean master (no subtitles) — 1080x1920 H.264
ff('-framerate', '24', '-i', FR, '-i', 'audio/mix/mix.wav', *X264, '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-x264-params', 'keyint=48:min-keyint=24', *AAC, '-t', '45', '-shortest', f'{D}/ROYAGRAM_Launch_45s_1080x1920_NoSubs.mp4')
# 2. subtitled version (burned-in, top safe zone)
ff('-i', f'{D}/ROYAGRAM_Launch_45s_1080x1920_NoSubs.mp4', '-vf', 'ass=src/subtitles.ass', *X264, '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', '-c:a', 'copy', f'{D}/ROYAGRAM_Launch_45s_1080x1920_Subtitled.mp4')
# 3. UHD 2160x3840 master — Lanczos upscale of the 1080p render (see README: native 4K = render.mjs --scale 2)
ff('-framerate', '24', '-i', FR, '-i', 'audio/mix/mix.wav', '-vf', 'scale=2160:3840:flags=lanczos', *X264[:6], '-level', '5.2', *X264[8:], '-crf', '20', '-maxrate', '16M', '-bufsize', '32M', *AAC, '-t', '45', '-shortest', f'{D}/ROYAGRAM_Launch_45s_2160x3840_UHD-upscale.mp4')
# 4. 15-second cutdown (beat-aligned EDL shared with the audio build)
edl = json.load(open('src/cutdown_edl.json'))
parts = ''.join(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}];" for i, (a, b) in enumerate(edl['segments']))
cat = ''.join(f'[v{i}]' for i in range(len(edl['segments']))) + f"concat=n={len(edl['segments'])}:v=1:a=0[v]"
ff('-framerate', '24', '-i', FR, '-i', 'audio/mix/cutdown_mix.wav', '-filter_complex', parts + cat, '-map', '[v]', '-map', '1:a', *X264, '-crf', '17', '-maxrate', '14M', '-bufsize', '28M', *AAC, '-t', '15', f'{D}/ROYAGRAM_Cutdown_15s_1080x1920.mp4')
# 5. audio deliverables
shutil.copy('audio/mix/mix.wav', f'{D}/audio/ROYAGRAM_Launch_Mix_48k24.wav')
for s in ['music', 'sfx', 'vo']: shutil.copy(f'audio/mix/stem_{s}.wav', f'{D}/audio/ROYAGRAM_Stem_{s.upper()}.wav')
shutil.copy('audio/mix/cutdown_mix.wav', f'{D}/audio/ROYAGRAM_Cutdown15_Mix_48k24.wav')
# 6. thumbnails (frame numbers chosen in QC)
for name, f in json.load(open('src/thumbnails.json')).items():
    ff('-i', f'renders/frames/f{f:05d}.png', '-q:v', '2', f'{D}/thumbnails/{name}.jpg')
print('done')
