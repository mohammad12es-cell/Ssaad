#!/bin/bash
cd /home/user/Ssaad/geo-shorts
for v in "$@"; do
  python3 src/video.py $v > out/log_$v.txt 2>&1 || echo "FAIL $v" >> out/fails.txt
done
