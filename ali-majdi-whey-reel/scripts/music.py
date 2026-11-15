import pretty_midi as pm, numpy as np
BPM=120; B=0.5; G0=2.8  # beat grid anchored at 2.8s
def gt(beat): return G0+beat*B
m=pm.PrettyMIDI(initial_tempo=BPM)
def inst(prog,drum=False,name=''):
    i=pm.Instrument(program=prog,is_drum=drum,name=name); m.instruments.append(i); return i
drums=inst(25,True,'808kit'); orch=inst(48,True,'orchkit')
bass=inst(38); strings=inst(48); pad=inst(89); pizz=inst(45); brass=inst(61); trem=inst(44); hit=inst(55); timp=inst(47); bell=inst(14); taiko=inst(116); rcym=inst(119)
def n(i,p,t0,d,v=100):
    if t0<0: d+=t0; t0=0
    if d<=0: return
    i.notes.append(pm.Note(velocity=int(max(1,min(127,v))),pitch=p,start=t0,end=t0+d))
END=39.43
# chord roots per bar (2s): Dm Bb Gm A
prog=[(50,[62,65,69]),(46,[58,62,65]),(43,[55,58,62]),(45,[57,61,64])]
def chord(bar): return prog[bar%4]
FULL=[(2.8,12.3),(12.8,24.75),(24.77,26.3),(32.8,END)]
BREAK=(26.3,32.8)
def in_(t,rngs): return any(a<=t<b for a,b in rngs)
# ---- intro 0-2.8: tremolo strings crescendo + reverse cymbal + timpani roll
for p_ in [38,50,62,65,69]: 
    for k in range(14):
        n(trem,p_,k*0.2,0.2,40+k*5)
n(rcym,60,0.55,2.25,110)
for k in range(16): n(timp,38,1.6+k*0.075,0.07,40+k*5)
n(hit,50,0.0,0.6,90); n(taiko,36,0.0,0.8,110)
# ---- impacts
for t in [2.8,12.63,24.77,32.87]:
    n(hit,50,t,0.8,118); n(hit,62,t,0.8,105); n(taiko,36,t,1.2,127); n(timp,38,t,1.5,120)
    n(drums,49,t,1.5,120); n(drums,36,t,0.5,127)
# ---- grid
nb=int((END-G0)/B)+1
for b in range(nb):
    t=gt(b); bar=b//4; beat=b%4
    root,tri=chord(bar)
    full=in_(t,FULL); brk=in_(t,[BREAK])
    if full:
        # 808 drums: half-time trap
        if beat==0 or (beat==2 and bar%2==1 and False): n(drums,36,t,0.3,122)
        if beat==1 and bar%2==0: n(drums,36,t+0.375,0.3,105)
        if beat==3 and bar%2==1: n(drums,36,t+0.25,0.3,110)
        if beat==2: n(drums,39,t,0.3,118); n(drums,38,t,0.3,90)
        roll = (bar%4==3 and beat==3)
        for s in range(4 if roll else 2):
            st=t+s*(B/(4 if roll else 2)); n(drums,42,st,0.08,78+(20 if s==0 else 0)+(s*8 if roll else 0))
        if beat==3 and bar%2==0: n(drums,46,t+0.25,0.2,70)
        # 808 bass: long root on bar start + syncopated
        if beat==0: n(bass,root-12,t,1.3,118)
        if beat==1 and bar%2==0: n(bass,root-12,t+0.375,0.5,100)
        if beat==3: n(bass,root-12+(7 if bar%2 else 0),t+0.25,0.25,95)
        # pizz ostinato 8ths
        if not (12.8<=t<16.8):
            for s in range(2):
                pat=[tri[0]+12,tri[2],tri[1]+12,tri[2]]
                n(pizz,pat[(beat*2+s)%4],t+s*0.25,0.22,78)
        # bell motif, every 2 bars
        if beat==0 and bar%2==0 and t>=5:
            mel=[(0,74),(0.75,72),(1.5,69),(2.25,70),(3.0,69)]
            for dt,p_ in mel: n(bell,p_-12,t+dt,0.6,58)
        if t>=24.77 and beat==0: 
            for p_ in tri: n(brass,p_-12,t,0.35,100)
        if t>=32.8 and beat in (0,2):
            for p_ in tri: n(brass,p_-12,t,0.25,92 if beat==0 else 80)
    if brk:
        if beat==0:
            for p_ in tri: n(pad,p_-12,t,2.0,70)
            n(bass,root-24,t,2.0,60)
        n(drums,42,t+0.25,0.06,45)
        if beat==2 and bar%2==1: n(drums,39,t,0.3,70)
        pat=[tri[0]+12,tri[2]]
        n(pizz,pat[beat%2],t,0.3,55)
    # pads/strings under full
    if full and beat==0:
        for p_ in tri: n(strings,p_-12,t,2.0,62); n(pad,p_,t,2.0,45)
# outro hit
n(hit,50,38.8,0.6,90); n(bell,74,38.8,1.0,100); n(bell,81,38.95,1.0,90)
m.write('music.mid'); print('midi ok', m.get_end_time())
