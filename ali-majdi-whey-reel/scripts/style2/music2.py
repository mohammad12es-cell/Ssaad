import pretty_midi as pm
BPM=96; B=60/BPM; G0=2.8; END=39.43
m=pm.PrettyMIDI(initial_tempo=BPM)
def inst(prog,drum=False): i=pm.Instrument(program=prog,is_drum=drum); m.instruments.append(i); return i
dr=inst(0,True); bass=inst(39); cb=inst(43); pad=inst(95); piano=inst(0); brass=inst(61); trb=inst(57); strl=inst(48); timp=inst(47); celst=inst(8); trem=inst(44)
def n(i,p,t0,d,v=100):
    if t0<0: d+=t0; t0=0
    if d>0: i.notes.append(pm.Note(velocity=int(max(1,min(127,v))),pitch=p,start=t0,end=min(t0+d,END+2)))
# A minor dark: Am - F - Dm - E
prog=[(45,[57,60,64]),(41,[53,57,60]),(38,[50,53,57]),(40,[52,56,59])]
FULL=[(2.8,12.3),(12.8,24.75),(24.77,26.3),(32.8,END)]; BRK=(26.3,32.8)
inr=lambda t,R:any(a<=t<b for a,b in R)
# intro: drone + tremolo + ticking + rising
n(cb,33,0,2.9,90); n(pad,57,0,2.9,70); n(pad,64,0,2.9,60)
for k in range(12): n(trem,45+12,k*0.233,0.233,30+k*6); n(trem,52+12,k*0.233,0.233,25+k*6)
for k in range(int(2.8/(B/2))): n(dr,76 if k%2==0 else 77,k*B/2,0.05,70+k*2)
# braams
for t in [2.8,12.63,24.77,32.87]:
    for p_ in [33,45]: n(trb,p_,t,1.8,120); n(brass,p_+12,t,1.6,110); n(strl,p_,t,2.2,110)
    n(timp,33,t,2.0,127); n(dr,49,t,2,110); n(dr,35,t,0.5,127)
nb=int((END-G0)/B)+1
for b in range(nb):
    t=G0+b*B; bar=b//4; beat=b%4; root,tri=prog[bar%4]
    full=inr(t,FULL); brk=BRK[0]<=t<BRK[1]
    if full:
        # heartbeat kick
        if beat==0: n(dr,35,t,0.2,118); n(dr,35,t+0.22,0.2,92)
        if beat==2: n(dr,40,t,0.2,96)   # snare (electric)
        # clock tick 8ths
        n(dr,76,t,0.05,72); n(dr,77,t+B/2,0.05,58)
        if beat==3 and bar%2: n(dr,42,t+B*0.75,0.05,60)
        # pulsing 16th bass
        for s in range(4): n(bass,root-12,t+s*B/4,B/4*0.8,95 if s==0 else 72)
        if beat==0: n(cb,root-12,t,4*B,85); [n(pad,p_,t,4*B,55) for p_ in tri]
        # piano motif (sparse, high)
        if beat==0 and bar%2==0 and t>5:
            for dt,p_ in [(0,76),(B*1.5,72),(B*2,71),(B*3,69)]: n(piano,p_,t+dt,0.8,62)
        if t>=32.8 and beat in (1,3): [n(strl,p_,t,B*0.9,80) for p_ in tri]
        if t>=36.5 and beat==3: 
            for s in range(4): n(dr,38,t+s*B/4,0.05,60+s*10)
    if brk:
        if beat==0: n(cb,root-12,t,4*B,70); [n(pad,p_,t,4*B,62) for p_ in tri]
        n(dr,76,t,0.05,45)
        if beat==0 and bar%2==0: 
            for dt,p_ in [(0,76),(B,72),(B*2,71),(B*3,69)]: n(piano,p_,t+dt,1.2,58)
        if beat==2: n(celst,tri[2]+12,t,1.0,40)
# end
n(timp,33,38.75,1.5,120); n(trb,33,38.75,1.2,115); n(brass,45,38.75,1.0,105); n(piano,57,38.75,1.5,90); n(piano,64,38.75,1.5,80)
m.write('music2.mid'); print('ok')
