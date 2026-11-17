import onnxruntime as o, numpy as np, sys
from PIL import Image
s=o.InferenceSession(sys.argv[1]); U=sys.argv[2]
for f in sys.argv[3:]:
    im=Image.open(f"{U}/{f}").convert("RGB"); W,H=im.size
    sc=640/max(W,H); w,h=int(W*sc)//32*32, int(H*sc)//32*32
    x=(np.asarray(im.resize((w,h),Image.BICUBIC),np.float32)/255-0.5)/0.5
    m=s.run(None,{"input":x.transpose(2,0,1)[None]})[0][0,0]
    Image.fromarray((m*255).astype(np.uint8)).resize((W,H),Image.BICUBIC).save(f"{f.split('-')[0]}_matte.png")
    prev=np.asarray(im.resize((w,h)),np.float32)*(0.25+0.75*m[...,None])
    Image.fromarray(prev.astype(np.uint8)).save(f"{f.split('-')[0]}_prev.jpg")
