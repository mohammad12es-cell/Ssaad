import sys, wave, numpy as np, json, glob, os
def trimmed(f, thr=0.02):
    w=wave.open(f); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
    e=np.convolve(np.abs(x),np.ones(256)/256,'same'); idx=np.where(e>thr*e.max())[0]
    return x[max(idx[0]-200,0):idx[-1]+800], sr
if __name__=="__main__":
    tot=0
    for d in sys.argv[1:]:
        tot=0; s=[]
        for f in sorted(glob.glob(d+"/*.wav")):
            x,sr=trimmed(f); tot+=len(x)/sr; s.append((os.path.basename(f)[:-4], round(len(x)/sr,2)))
        print(d.split('/')[-1], round(tot,1), s)
