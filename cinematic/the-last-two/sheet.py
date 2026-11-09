import sys
from PIL import Image
ts=sys.argv[1].split(',')
ims=[Image.open(f't{float(t):.2f}.png') for t in ts]
W,H=ims[0].size; rows=(len(ims)+1)//2; s=Image.new('RGB',(W*2,H*rows))
for i,im in enumerate(ims): s.paste(im,((i%2)*W,(i//2)*H))
s.save('sheet.png')
