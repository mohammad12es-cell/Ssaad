#!/bin/bash
ffmpeg -v error -y -i ../src/audio48.wav -i music2_raw.wav -i sfx2.wav -filter_complex "
[0:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=85,afftdn=nf=-30,equalizer=f=200:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1.2:g=3,acompressor=threshold=-22dB:ratio=3.5:attack=8:release=120:makeup=4,alimiter=limit=0.9,asplit=2[v][vsc];
[1:a]atrim=0:39.43,asetpts=PTS-STARTPTS,volume=0.3[mus];
[mus][vsc]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350[duck];
[2:a]atrim=0:39.43,asetpts=PTS-STARTPTS,volume=0.8[fx];
[v][duck][fx]amix=inputs=3:normalize=0,afade=t=out:st=38.9:d=0.53,loudnorm=I=-14:TP=-1.5:LRA=9[out]" -map "[out]" -ar 48000 -c:a pcm_s16le mix2.wav
