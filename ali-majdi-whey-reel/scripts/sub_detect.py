import cv2,numpy as np,json
cap=cv2.VideoCapture('src/orig.mp4'); fps=30
prev=None; chunks=[]; i=0; ious=[]
k=np.ones((7,7),np.uint8)
while True:
    ok,im=cap.read()
    if not ok: break
    band=im[942:992]; hsv=cv2.cvtColor(band,cv2.COLOR_BGR2HSV)
    wht=((hsv[...,2]>215)&(hsv[...,1]<45)).astype(np.uint8)
    dark=(hsv[...,2]<100).astype(np.uint8)
    m=wht&cv2.dilate(dark,k)
    md=cv2.dilate(m,np.ones((3,3),np.uint8))
    if prev is not None:
        inter=(md&prev).sum(); uni=(md|prev).sum()+1
        iou=inter/uni
    else: iou=0
    ious.append(iou)
    if iou<0.45:
        cols=np.where(m.sum(0)>0)[0]
        chunks.append({'f0':i,'cnt':int(m.sum()),'x0':int(cols.min()) if len(cols) else -1,'x1':int(cols.max()) if len(cols) else -1})
        cv2.imwrite(f'frames/ch_{len(chunks)-1:02d}.png',im[925:1010])
    prev=md; i+=1
for n,c in enumerate(chunks): print(n,c['f0'],round(c['f0']/fps,2),c['cnt'],c['x0'],c['x1'])
json.dump(chunks,open('chunks.json','w'))
