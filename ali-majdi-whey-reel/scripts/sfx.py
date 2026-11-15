import numpy as np, pretty_midi as pm, wave
SR=48000; END=39.43; N=int(END*SR)+SR
def wr(fn,x):
    x=np.clip(x,-1,1); y=(np.stack([x,x],1)*32767).astype(np.int16)
    w=wave.open(fn,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
rng=np.random.default_rng(3)
def bp_sweep(dur,f0,f1,rise=True):
    n=int(dur*SR); x=rng.standard_normal(n)
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR)
    # time-varying filter approximated by chunks
    out=np.zeros(n); seg=1024
    for i in range(0,n,seg//2):
        p=i/n; fc=f0*(f1/f0)**p
        win=np.hanning(seg); chunk=x[i:i+seg]
        if len(chunk)<seg: break
        C=np.fft.rfft(chunk*win); f=np.fft.rfftfreq(seg,1/SR)
        g=np.exp(-0.5*((np.log(f+1)-np.log(fc))/0.45)**2)
        out[i:i+seg]+=np.fft.irfft(C*g,seg)
    e=np.sin(np.pi*np.linspace(0,1,n))**2
    if rise: e*=np.linspace(0.3,1,n)
    return out/np.abs(out).max()*e
sfx=np.zeros(N)
def add(t,sig,g):
    i=int(t*SR); j=min(N,i+len(sig)); sfx[i:j]+=sig[:j-i]*g
CUTS=[2.80,5.43,6.77,7.93,10.57,20.33,24.77,25.60,26.45,32.87]
for c in CUTS:
    add(c-0.28, bp_sweep(0.42,500,5000), 0.32)
# sub booms at impacts
def boom(dur=1.2,f0=60,f1=32):
    t=np.arange(int(dur*SR))/SR; f=f1+(f0-f1)*np.exp(-t*6); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*3.2)
for t in [0.0,2.8,12.63,24.77,32.87]: add(t,boom(),0.75)
# stamps: thud
for t in [7.20,15.62]: add(t,boom(0.6,90,40),0.7); add(t,bp_sweep(0.12,3000,1500,False),0.4)
# counter ticks 12.63-13.18
for k in range(12):
    t=12.63+k*0.046; s=np.sin(2*np.pi*(2400+k*90)*np.arange(int(0.025*SR))/SR)*np.exp(-np.arange(int(0.025*SR))/SR*180); add(t,s,0.18)
# pops for chips / cards
def pop():
    t=np.arange(int(0.09*SR))/SR; f=900*np.exp(-t*25)+300; return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*45)
for t in [0.70,1.46,5.43,8.6,18.95,22.13,22.55,22.95,24.85,26.55,31.0,31.45,33.15,37.9,38.8]: add(t,pop(),0.35)
# strike swish
add(19.7,bp_sweep(0.25,1500,7000),0.28)
# 808 sine sub following the bass track
m=pm.PrettyMIDI('music.mid')
sub=np.zeros(N)
for ins in m.instruments:
    if ins.program==38 and not ins.is_drum:
        for nt in ins.notes:
            f=440*2**((nt.pitch-12-69)/12)
            d=nt.end-nt.start+0.25; t=np.arange(int(d*SR))/SR
            pitch=f*(1+0.6*np.exp(-t*40))
            s=np.sin(2*np.pi*np.cumsum(pitch)/SR)*np.minimum(1,t*200)*np.exp(-t*1.4)*(nt.velocity/127)
            s=np.tanh(s*1.6)
            i=int(nt.start*SR); j=min(N,i+len(s)); sub[i:j]+=s[:j-i]
wr('sfx.wav',sfx*0.9); wr('sub.wav',sub*0.5); print('ok')
