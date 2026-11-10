#!/usr/bin/env bash
# relaunch the 4K build if its workers are not running (finished segments are kept and skipped)
cd "$(dirname "$0")"
if ! pgrep -f "render.mjs --segdir" > /dev/null && ! [ -f ../../output/the-last-two-v2-4k.mp4 ]; then
  rm -f segments/*.part.mkv; setsid nohup ./build.sh 3 >> build.log 2>&1 < /dev/null & echo relaunched
fi
