#!/bin/bash
# re-mux audio with loudness normalisation: remux.sh <module> <file>
cd /home/user/Ssaad/geo-shorts/out
ffmpeg -v error -y -f concat -safe 0 -i work_$1/list.txt -i work_$1/mix.wav -map 0:v -map 1:a -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart $2.tmp.mp4 && mv $2.tmp.mp4 $2.mp4
