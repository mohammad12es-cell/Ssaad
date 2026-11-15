#!/bin/bash
# comp.sh base overlay out [audio]
GRADE="unsharp=5:5:0.6:5:5:0,eq=contrast=1.07:saturation=1.12:gamma=0.98,curves=r='0/0.02 0.5/0.5 1/0.98':b='0/0.05 0.5/0.48 1/0.95',vignette=angle=PI/5,noise=alls=5:allf=t"
if [ -n "$4" ]; then
ffmpeg -v error -y -i $1 -i $2 -i $4 -filter_complex "[0:v]$GRADE[g];[g][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 17 -profile:v high -c:a aac -b:a 256k -movflags +faststart -shortest $3
else
ffmpeg -v error -y -i $1 -i $2 -filter_complex "[0:v]$GRADE[g];[g][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset fast -crf 18 $3
fi
