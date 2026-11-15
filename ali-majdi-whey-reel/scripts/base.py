import cv2, numpy as np, json, subprocess, sys
W,H,FPS=1080,1920,30
SRC='../src/orig.mp4'
t_start=float(sys.argv[1]) if len(sys.argv)>1 else 0
t_end=float(sys.argv[2]) if len(sys.argv)>2 else 39.4333
out=sys.argv[3] if len(sys.argv)>3 else 'base.mp4'

cap=cv2.VideoCapture(SRC); frames=[]
while True:
    ok,f=cap.read()
    if not ok: break
    frames.append(f)
NF=len(frames)

# --- old subtitle boxes (centered at x=360) ---
chunks=json.load(open('../chunks.json'))
box=[None]*NF
for i,c in enumerate(chunks):
    f1=chunks[i+1]['f0'] if i+1<len(chunks) else NF
    if c['cnt']<300 or c['f0']<60: continue
    half=min(360, 360-c['x0']+30)
    for f in range(c['f0'],f1): box[f]=half
def clean(fi):
    im=frames[fi]
    half=box[fi]
    if half is None: return im
    y0,y1=928,1006
    x0,x1=max(0,360-half),min(720,360+half)
    pad=14
    ry0,ry1=y0-pad,y1+pad; rx0,rx1=max(0,x0-pad),min(720,x1+pad)
    reg=im[ry0:ry1,rx0:rx1].copy()
    m=np.zeros(reg.shape[:2],np.uint8); m[pad:pad+(y1-y0), (x0-rx0):(x1-rx0)]=255
    sm=cv2.resize(reg,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
    mm=cv2.resize(m,(sm.shape[1],sm.shape[0]),interpolation=cv2.INTER_NEAREST)
    fill=cv2.inpaint(sm,mm,6,cv2.INPAINT_TELEA)
    fill=cv2.resize(fill,(reg.shape[1],reg.shape[0]),interpolation=cv2.INTER_CUBIC)
    fill=cv2.GaussianBlur(fill,(9,9),0)
    a=cv2.GaussianBlur(m.astype(np.float32)/255,(15,15),0)[...,None]
    reg=(reg*(1-a)+fill*a).astype(np.uint8)
    out=im.copy(); out[ry0:ry1,rx0:rx1]=reg
    return out

_ref=frames[int(27.8*FPS)][60:1200].reshape(-1,3).astype(np.float32)
_rm,_rs=_ref.mean(0),_ref.std(0)
def leakfix(im):
    r=im[60:1200].reshape(-1,3).astype(np.float32); m,s=r.mean(0),r.std(0)
    out=(im.astype(np.float32)-m)*(_rs/(s+1e-3))+_rm
    return np.clip(out,0,255).astype(np.uint8)
def ease_out(x): x=min(max(x,0),1); return 1-(1-x)**3
def warp(img, cx, cy, cw, z, ax=None, ay=None):
    """map source rect centered (cx,cy) of width cw (9:16) to output, zoomed by z around anchor (ax,ay) in src"""
    s=W/cw
    # base mapping: out = (src - (cx-cw/2, cy-ch/2))*s
    ch=cw*16/9
    ox,oy=cx-cw/2, cy-ch/2
    if ax is None: ax,ay=cx,cy
    # zoom around anchor: out' = A + (out-A)*z, A = anchor in out
    Ax,Ay=(ax-ox)*s,(ay-oy)*s
    S=s*z
    tx=Ax+(-ox*s-Ax)*z; ty=Ay+(-oy*s-Ay)*z
    M=np.float32([[S,0,tx],[0,S,ty]])
    return cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REFLECT)

def src_frame(t, lo=None):
    ts=t if lo is None else max(t,lo)
    return clean(min(NF-1,int(round(ts*FPS))))

medal=cv2.imread('../img/stage_medal.jpg'); medal=cv2.resize(medal,(1080,int(5706*1080/3099)),interpolation=cv2.INTER_AREA)
studio=cv2.imread('../img/studio.jpg'); studio=cv2.resize(studio,None,fx=1920/2664,fy=1920/2664,interpolation=cv2.INTER_AREA) # 1537x1920
camp=cv2.imread('../img/team_camp.jpg')
_st=cv2.imread('../img/studio.jpg'); studio_full=cv2.resize(_st,(1080,1347),interpolation=cv2.INTER_AREA)
studio_bg=cv2.resize(_st,(int(2132*1920/2664),1920))[:, 200:1280]; studio_bg=(cv2.GaussianBlur(studio_bg,(0,0),30)*0.5).astype(np.uint8)
campbg=cv2.resize(camp,(int(750*1920/486),1920)); x0=(campbg.shape[1]-1080)//2; campbg=campbg[:,x0+150:x0+150+1080]
campbg=cv2.GaussianBlur(campbg,(0,0),28); campbg=(campbg*0.45).astype(np.uint8)

def photo_kb(img, t, t0, t1, fx, fy, z0, z1):
    p=(t-t0)/(t1-t0); z=z0+(z1-z0)*(p*p*(3-2*p))
    h,w=img.shape[:2]
    M=np.float32([[z,0,W/2-fx*z],[0,z,H/2-fy*z]])
    return cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE)

CUTS=[2.80,5.43,6.77,7.93,10.57,20.33,24.77,25.60,26.45,32.87]
def punch(t):
    z=1.0
    for c in CUTS:
        d=t-c
        if 0<=d<0.35: z*=1+0.10*(1-ease_out(d/0.35))
    return z

def frame(t):
    zp=punch(t)
    if t<2.80:   # hook: top crop of rooftop, video panel occupies top area
        im=src_frame(t)
        z=1.0+0.07*(t/2.8)
        # crop width 720 -> rows 0..1280 mapping, anchor face
        s=1.5*z; fx,fy=360,330
        M=np.float32([[s,0,540-fx*s],[0,s,560-fy*s]])
        out=cv2.warpAffine(im,M,(W,H),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE)
        g=np.clip((np.arange(H)-900)/320,0,1)[:,None,None]
        out=(out*(1-g)).astype(np.uint8)
        return out
    if t<5.43 or (6.77<=t<7.93):  # stage
        im=src_frame(t, 3.07)
        p=(t-2.8)/5.13
        return warp(im, 323, 40+575, 646, (1.0+0.06*p)*zp, 330, 967)
    if t<6.77:
        return campbg.copy()
    if t<10.57:
        return photo_kb(medal,t,7.93,10.57, 540, 1000, 1.0, 1.12)
    if t<20.33:  # kitchen
        im=src_frame(t,10.74)
        z=1.0+0.03*((t-10.57)/9.8)
        if 12.63<=t<15.40: z*=1.0+0.14*ease_out((t-12.63)/0.18)
        return warp(im,360,640,720,z*zp,360,967)
    if t<24.77:  # cooking (letterboxed source)
        im=src_frame(t)
        p=(t-20.33)/4.44
        return warp(im,360,160+480,540,(1.0+0.08*p)*zp,360,967)
    if t<25.60:  # stage posing
        im=src_frame(t)
        return warp(im,360,640,720,(1.04+0.04*(t-24.77))*zp,360,967)
    if t<26.45:
        p=(t-25.60)/0.85; z=1.0+0.05*p
        fit=cv2.resize(studio_full,(int(1080*z),int(1347*z)),interpolation=cv2.INTER_AREA)
        out=studio_bg.copy(); h,w=fit.shape[:2]; y0=(H-h)//2; x0=(W-w)//2
        if x0<0: fit=fit[:,-x0:-x0+W]; x0=0
        out[y0:y0+h,x0:x0+fit.shape[1]]=fit
        return out
    if t<32.87:  # rooftop talking head
        im=src_frame(t,26.62)
        if t<27.75: im=leakfix(im)
        z=1.0+0.03*((t-26.45)/6.4)
        if t>=31.0: z*=1.0+0.12*ease_out((t-31.0)/0.2)
        if 29.27<=t<31.0: z*=1.06
        return warp(im,360,640,720,z*zp,360,967)
    im=src_frame(t,33.03)  # gym
    z=1.0+0.05*((t-32.87)/6.5)
    if t>=38.33: z*=1.0+0.08*ease_out((t-38.33)/0.25)
    return warp(im,360,640,720,z*zp,360,967)

f0,f1=int(round(t_start*FPS)),int(round(t_end*FPS))
p=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
  '-c:v','libx264','-preset','medium','-crf','12','-pix_fmt','yuv420p',out],stdin=subprocess.PIPE)
for fi in range(f0,f1):
    p.stdin.write(frame(fi/FPS).tobytes())
p.stdin.close(); p.wait(); print('base done',f1-f0)
