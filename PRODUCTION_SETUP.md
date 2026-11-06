# Video production environment

This setup was verified on Ubuntu 24.04 (x86_64, 4 CPU cores, no GPU) on 2026-11-06.

| Tool | Version | Where | Status |
|---|---|---|---|
| FFmpeg / FFprobe | 6.1.1 | `/usr/bin` (system, preinstalled) | ✅ libx264, libx265, VP9, SVT-AV1, AAC, Opus, MP3 and libass subtitles all tested |
| HyperFrames | 0.9.13 (pinned by every project; 0.9.19 is the latest release) | `hyperframes-diya/node_modules`, run per project with `npx hyperframes@0.9.13` | ✅ `doctor` passes; 16:9 and 9:16 test renders succeeded |
| OpenAI Whisper | 20250625 (torch 2.15, CPU) | venv `~/.venvs/media`, linked as `~/.local/bin/whisper` | ⚠ installed, but its models are hosted on `openaipublic.azureedge.net`, which this cloud environment's network blocks |
| yt-dlp | 2026.10.26 (+ yt-dlp-ejs) | the same venv, linked as `~/.local/bin/yt-dlp` | ⚠ works and uses FFmpeg for extraction and remuxing, but YouTube and other sites are blocked by this cloud environment's network |

Node 22.23 and Python 3.13 (system) / 3.12 (venv) are present. No global pip or npm packages were changed.

## Re-creating the Python tools (cloud containers are temporary)

```bash
uv venv --python 3.12 ~/.venvs/media
VIRTUAL_ENV=~/.venvs/media uv pip install openai-whisper "yt-dlp[default]"
ln -sf ~/.venvs/media/bin/whisper ~/.local/bin/whisper
ln -sf ~/.venvs/media/bin/yt-dlp  ~/.local/bin/yt-dlp
(cd hyperframes-diya && npm install)
```

## Workflows

```bash
# HyperFrames: new project, preview, render
npx hyperframes@0.9.13 init my-film --resolution portrait --non-interactive   # 9:16 Shorts
npx hyperframes@0.9.13 init my-film --resolution landscape --non-interactive  # 16:9
cd my-film && npx hyperframes@0.9.13 preview --background
npx hyperframes@0.9.13 render -q delivery -o ../output/my-film.mp4
# Note: new scaffolds load GSAP from a CDN. Where the CDN is blocked, copy
# hyperframes-diya/node_modules/gsap/dist/gsap.min.js into assets/ and point the <script> at it.

# Whisper: transcription → SRT and VTT subtitles
whisper voice.wav --model small --language en --output_format srt --output_dir subs
whisper voice.wav --model small --output_format vtt --output_dir subs

# yt-dlp: download (best video + audio merged to MP4) or audio only
yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "%(title)s.%(ext)s" URL
yt-dlp -x --audio-format wav URL

# FFmpeg: post-production
ffmpeg -i in.mp4 -vf "scale=-2:1920,crop=1080:1920" -c:v libx264 -crf 18 -c:a copy short.mp4          # 16:9 → 9:16
ffmpeg -i in.mp4 -vf "subtitles=subs/voice.srt" -c:v libx264 -crf 18 -c:a copy captioned.mp4           # burn in captions
ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1:LRA=11 -c:v copy -c:a aac -b:a 192k loud.mp4                 # YouTube loudness
ffmpeg -i video.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest synced.mp4             # replace or sync audio
ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k -movflags +faststart master.mp4  # high-quality export
```
