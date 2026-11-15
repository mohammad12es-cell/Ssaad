import numpy as np, wave, json
from captions_src import CH
w=wave.open('../src/voice16.wav'); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768; sr=16000
hop=160; rms=np.array([np.sqrt((a[i:i+400]**2).mean()) for i in range(0,len(a)-400,hop)])
db=20*np.log10(rms+1e-9); thr=np.percentile(db,35)
voiced=db>thr
out=[]
for s,e,txt,hl in CH:
    words=txt.split()
    i0,i1=int(s*100),int(e*100)
    v=voiced[i0:i1]
    idx=np.where(v)[0]
    vs = s+idx[0]/100 if len(idx) else s
    ve = s+idx[-1]/100 if len(idx) else e
    vs=max(s,min(vs,s+0.25))
    L=np.array([len(x)+2 for x in words],float); c=np.concatenate([[0],np.cumsum(L)])/L.sum()
    ws=[]
    for k,wd in enumerate(words):
        t0=vs+(ve-vs)*c[k]
        clean=wd
        style='hl' if wd in hl else ('neg' if '!'+wd in hl else '')
        ws.append({'w':wd,'t':round(t0,3),'s':style})
    out.append({'s':s,'e':e,'words':ws})
json.dump(out,open('captions.json','w'),ensure_ascii=False,indent=0)
for o in out: print(o['s'],[ (x['w'],x['t']) for x in o['words']])
