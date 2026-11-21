#!/usr/bin/env python3
"""ODDLY EXPLAINED — final assembly + QC.
usage: compose.py VIDEO_DIR BUILD_DIR OUT_DIR [--steps mix,srt,text,encode,preview,qc]

Inputs (from earlier steps):
  BUILD_DIR/frames3d/f%04d.png       3D layer (render_frames.js scene.html)
  BUILD_DIR/audio/narration.wav      tts.py
  BUILD_DIR/audio/score.wav          videos/<id>/sound.py
  BUILD_DIR/audio/timings.json       tts.py
Outputs:
  <ID>_EN.mp4 (EN titles + burned EN subs), <ID>_FA.mp4 (FA titles + burned FA subs), <ID>_CLEAN.mp4 (textless,
  soft EN/FA subtitle tracks), <ID>_EN.srt, <ID>_FA.srt, <ID>_PREVIEW.mp4, <ID>_CONTACT.jpg, <ID>_POSTER.jpg, QC_REPORT.json"""
import json, os, subprocess, sys, argparse, re

ap = argparse.ArgumentParser(); ap.add_argument('vdir'); ap.add_argument('build'); ap.add_argument('out')
ap.add_argument('--steps', default='mix,srt,text,encode,clean,preview,qc'); ap.add_argument('--workers', default='2')
a = ap.parse_args(); steps = a.steps.split(',')
ENGINE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(ENGINE)
cfg = json.load(open(os.path.join(a.vdir, 'config.json'))); ID = cfg['id']; D = cfg['duration']; FPS = cfg['fps']
os.makedirs(a.out, exist_ok=True)
B = lambda *p: os.path.join(a.build, *p); O = lambda *p: os.path.join(a.out, *p)

def run(cmd, **kw):
    print('$', ' '.join(cmd) if isinstance(cmd, list) else cmd)
    return subprocess.run(cmd, check=True, **kw)

# ------------------------------------------------------------------ audio mix
if 'mix' in steps:
    voice = ("[0:a]highpass=f=70,equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3400:t=q:w=1.4:g=2.5,"
             "acompressor=threshold=-21dB:ratio=3:attack=4:release=140:makeup=3dB,"
             "aecho=0.85:0.55:31|57:0.09|0.06,pan=stereo|c0=c0|c1=c0,asplit=2[v][sc];"
             "[1:a]volume=0.6[m];[m][sc]sidechaincompress=threshold=0.035:ratio=5:attack=20:release=380:makeup=1[md];"
             "[v][md]amix=inputs=2:normalize=0:duration=longest")
    pre = B('audio', 'premaster.wav')
    run(['ffmpeg', '-v', 'error', '-y', '-i', B('audio', 'narration.wav'), '-i', B('audio', 'score.wav'), '-filter_complex', voice, '-t', str(D), '-ar', '48000', pre])
    # two-pass EBU R128 loudness normalisation to -14 LUFS integrated, -1.5 dBTP (social platforms)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rfind('{'):])
    ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run(['ffmpeg', '-v', 'error', '-y', '-i', pre, '-af', ln + ',aresample=48000', '-t', str(D), '-c:a', 'pcm_s24le', B('audio', 'mix.wav')])

# ------------------------------------------------------------------ subtitles
def cues(lang):
    tim = json.load(open(B('audio', 'timings.json'))); out = []
    for li, ln in enumerate(tim['lines']):
        nxt = tim['lines'][li + 1] if li + 1 < len(tim['lines']) else None
        for ci, c in enumerate(ln['chunks']):
            last = ci == len(ln['chunks']) - 1
            end = min(ln['end'] + 0.35, nxt['start'] - 0.1 if nxt else 29.0) if last else ln['chunks'][ci + 1]['start'] - 0.06
            out.append((max(0, c['start'] - 0.06), end, c[lang]))
    return out

def ts(x):
    ms = int(round(x * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"

if 'srt' in steps:
    for lang, suffix in [('en', 'EN'), ('fa', 'FA')]:
        lines = []
        for i, (s, e, t) in enumerate(cues(lang), 1):
            if lang == 'fa': t = '\u200f' + t + '\u200f'  # RLM marks: correct punctuation placement in players with weak bidi support
            lines += [str(i), f'{ts(s)} --> {ts(e)}', t, '']
        open(O(f'{ID}_{suffix}.srt'), 'w', encoding='utf-8').write('\n'.join(lines))
        print('wrote', O(f'{ID}_{suffix}.srt'))

# ------------------------------------------------------------------ text layers (transparent PNG sequences)
if 'text' in steps:
    page = os.path.relpath(os.path.join(a.vdir, 'text.html'), ROOT)
    tim = os.path.relpath(B('audio', 'timings.json'), ROOT)
    for lang in ['en', 'fa']:
        run(['node', os.path.join(ENGINE, 'render_frames.js'), '--page', page, '--query', f'lang={lang}&timings=/{tim}', '--transparent', '--workers', a.workers, '--out', B(f'text_{lang}')])

# ------------------------------------------------------------------ encode
# CRF 18 capped at 14 Mb/s: film grain is incompressible, uncapped CRF 16 produced ~125 Mb/s files
X264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-x264-params', 'keyint=60:min-keyint=30',
        '-r', str(FPS), '-frames:v', str(int(D * FPS))]
AAC = ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000']
if 'encode' in steps:
    f3d = B('frames3d', 'f%04d.png'); mix = B('audio', 'mix.wav')
    for lang, suffix in [('en', 'EN'), ('fa', 'FA')]:
        run(['ffmpeg', '-v', 'error', '-stats', '-y', '-framerate', str(FPS), '-i', f3d, '-framerate', str(FPS), '-i', B(f'text_{lang}', 'f%04d.png'), '-i', mix,
             '-filter_complex', '[0:v][1:v]overlay=format=auto,format=yuv420p[v]', '-map', '[v]', '-map', '2:a', *X264, *AAC, '-shortest',
             '-metadata', f"title={cfg['title']}", '-metadata', f"artist={cfg['brand']}", '-metadata:s:a:0', 'language=eng', '-movflags', '+faststart', O(f'{ID}_{suffix}.mp4')])
if 'clean' in steps:  # separate step; no -shortest here: the soft subtitle track ends before the picture and would truncate it
    f3d = B('frames3d', 'f%04d.png'); mix = B('audio', 'mix.wav')
    run(['ffmpeg', '-v', 'error', '-stats', '-y', '-framerate', str(FPS), '-i', f3d, '-i', mix, '-i', O(f'{ID}_EN.srt'), '-i', O(f'{ID}_FA.srt'),
         '-map', '0:v', '-map', '1:a', '-map', '2', '-map', '3', *X264, *AAC, '-c:s', 'mov_text', '-t', str(D),
         '-metadata:s:a:0', 'language=eng', '-metadata:s:s:0', 'language=eng', '-metadata:s:s:1', 'language=per',
         '-metadata', f"title={cfg['title']} (clean)", '-metadata', f"artist={cfg['brand']}", '-movflags', '+faststart', O(f'{ID}_CLEAN.mp4')])

# ------------------------------------------------------------------ preview + contact sheet + poster
if 'preview' in steps:
    run(['ffmpeg', '-v', 'error', '-y', '-i', O(f'{ID}_EN.mp4'), '-vf', 'scale=540:960:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', O(f'{ID}_PREVIEW.mp4')])
    tiles = 'select=not(mod(n\\,45)),scale=270:480,tile=10x2'
    run(['ffmpeg', '-v', 'error', '-y', '-i', O(f'{ID}_EN.mp4'), '-vf', tiles, '-frames:v', '1', '-q:v', '3', O(f'{ID}_CONTACT.jpg')])
    run(['ffmpeg', '-v', 'error', '-y', '-ss', '1.6', '-i', O(f'{ID}_EN.mp4'), '-frames:v', '1', '-q:v', '2', O(f'{ID}_POSTER.jpg')])

# ------------------------------------------------------------------ QC
if 'qc' in steps:
    rep = {}
    for suffix in ['EN', 'FA', 'CLEAN']:
        f = O(f'{ID}_{suffix}.mp4')
        pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', f], capture_output=True, text=True).stdout)
        v = next(s for s in pr['streams'] if s['codec_type'] == 'video'); au = next(s for s in pr['streams'] if s['codec_type'] == 'audio')
        lu = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lu)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', lu)[-1])
        bl = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-vf', 'blackdetect=d=0.25:pic_th=0.97', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr
        rep[suffix] = {'width': v['width'], 'height': v['height'], 'fps': v['r_frame_rate'], 'frames': int(v['nb_read_frames']), 'duration': float(pr['format']['duration']),
                       'video_codec': v['codec_name'], 'pix_fmt': v['pix_fmt'], 'audio': f"{au['codec_name']} {au['sample_rate']}Hz {au['channels']}ch",
                       'loudness_LUFS': I, 'true_peak_dBFS': TP, 'black_segments': re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', bl),
                       'size_MB': round(os.path.getsize(f) / 1e6, 2), 'streams': [s['codec_type'] for s in pr['streams']]}
    rep['srt'] = {s: len(open(O(f'{ID}_{s}.srt'), encoding='utf-8').read().strip().split('\n\n')) for s in ['EN', 'FA']}
    ok = all(rep[s]['width'] == cfg['width'] and rep[s]['height'] == cfg['height'] and rep[s]['frames'] == int(D * FPS) and rep[s]['fps'] == f'{FPS}/1' for s in ['EN', 'FA', 'CLEAN'])
    rep['pass_spec'] = ok
    json.dump(rep, open(O('QC_REPORT.json'), 'w'), indent=2); print(json.dumps(rep, indent=2))
