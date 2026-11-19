#!/usr/bin/env bash
# Footage rescue pass (both phone clips):
#  - two-pass vid.stab with gentle smoothing (keeps the real camera move, removes jitter)
#  - temporal denoise (stronger on the low-bitrate 464x848 storefront clip)
#  - Lanczos upscale to 1080x1920 (+ centre crop to 9:16 where the aspect differs)
#  - mild sharpening (no artificial detail)
# Output: near-lossless intermediates used by render.py
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
prep () { # $1 src  $2 name  $3 extra-filters
  ffmpeg -v error -y -i "$1" -vf vidstabdetect=shakiness=6:accuracy=15:result=build/$2.trf -f null -
  ffmpeg -v error -y -i "$1" -an -vf "vidstabtransform=input=build/$2.trf:smoothing=12:optzoom=2:zoomspeed=0.15:interpol=bicubic,$3" \
    -c:v libx264 -preset slow -crf 8 -pix_fmt yuv444p build/$2.mp4
  echo "prepped -> build/$2.mp4"
}
prep assets/footage/fur_coat_mirror.mp4 fur  "hqdn3d=1.2:1.0:3:3,scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0.0"
prep assets/footage/storefront.mp4      store "hqdn3d=2.0:1.6:4:4,scale=1080:-2:flags=lanczos,crop=1080:1920,unsharp=5:5:0.55:5:5:0.0"
