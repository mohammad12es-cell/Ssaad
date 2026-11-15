import numpy as np, wave
SR=48000; END=39.43; N=int(END*SR)+SR
rng=np.random.default_rng(7); out=np.zeros(N)
def add(t,s,g):
    i=int(t*SR); j=min(N,i+len(s)); out[i:j]+=s[:j-i]*g
def bp(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def click():
    n=int(0.03*SR); t=np.arange(n)/SR; x=bp(rng.standard_normal(n),1500,7000)*np.exp(-t*260)
    body=np.sin(2*np.pi*(180+rng.random()*60)*t)*np.exp(-t*120)*0.6
    return (x/np.abs(x).max()+body)*0.8
def type_run(t0,t1,rate=14):
    t=t0
    while t<t1: add(t,click(),0.45*(0.7+0.3*rng.random())); t+=1/rate*(0.7+0.6*rng.random())
def thud(dur=0.7):
    t=np.arange(int(dur*SR))/SR; f=40+70*np.exp(-t*18); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*5)
    nz=bp(rng.standard_normal(len(t)),200,3000)*np.exp(-t*40); return s+nz/np.abs(nz).max()*0.5
def slide(dur=0.35):
    n=int(dur*SR); x=bp(rng.standard_normal(n),800,6000); e=np.sin(np.pi*np.linspace(0,1,n))**1.5; return x/np.abs(x).max()*e
def shutter():
    n=int(0.12*SR); t=np.arange(n)/SR; x=bp(rng.standard_normal(n),1000,9000)
    e=np.exp(-t*90)+0.8*np.exp(-np.maximum(0,t-0.06)*120)*(t>0.06); return x/np.abs(x).max()*e
def blip(f=1400):
    t=np.arange(int(0.07*SR))/SR; return np.sin(2*np.pi*f*t)*np.exp(-t*60)
def scribble(dur):
    n=int(dur*SR); t=np.arange(n)/SR; x=bp(rng.standard_normal(n),2000,8000); am=0.5+0.5*np.sin(2*np.pi*9*t)**2; return x/np.abs(x).max()*am*np.sin(np.pi*t/dur)
type_run(0.05,0.45); type_run(3.3,3.65); type_run(4.65,5.1); type_run(5.35,5.7); type_run(33.1,33.55)
for t in [1.46,7.22,15.62,25.0,38.75]: add(t,thud(),0.75)
for t in [0.0,3.1,5.43,17.57,26.7,37.9]: add(t,slide(),0.3)
for c in [2.80,5.43,6.77,7.93,10.57,20.33,24.77,25.60,26.45,32.87]: add(c-0.02,shutter(),0.35); add(c,thud(0.4),0.35)
add(8.05,scribble(0.55),0.25); add(19.7,scribble(0.25),0.25)
for t in [18.9,22.13,22.55,22.95,23.6]: add(t,blip(1200),0.25)
for k,t in enumerate([31.0,31.25,31.45,31.9,32.1]): add(t,blip(700+k*150),0.3)
for k in range(10): add(12.63+k*0.055,blip(2000+k*80)*0.5,0.3)
x=np.clip(out,-1,1); y=(np.stack([x,x],1)*32767).astype(np.int16)
w=wave.open('sfx2.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); print('ok')
