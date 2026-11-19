"""Re-brand the supplied "woman carrying a Black Friday board" photo for ADAM BARFI.

- the original board graphics are removed (board shading is rebuilt from the clean board area)
- a new ADAM BARFI board design is printed onto the board in perspective
- the storefront's neon lettering at the top is cropped out of every export
Outputs:
  assets/photos/p11_sign_walk_adambarfi.jpg   (full frame, used by the reel)
  output/ADAM_BARFI_BlackFriday_Post_1080x1350.jpg   (Instagram feed post 4:5)
  output/ADAM_BARFI_BlackFriday_Story_1080x1920.jpg  (Story 9:16)
"""
import os, sys
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(__file__))
from render import render_text, over, SERIF_SB, SERIF_BLACK, SANS_SB, SANS_B, FA_BOLD, FA_MED, ROOT

src = cv2.imread(os.path.join(ROOT, 'assets', 'ad_source', 'sign_walk_original.jpg'))
img = cv2.cvtColor(src, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
H0, W0 = img.shape[:2]

# board corners (TL, TR, BR, BL) measured on the 853x1280 source
Q = np.float32([[184, 230], [656, 158], [737, 742], [260, 815]])


def inset(q, d):
    c = q.mean(0)
    return np.float32([p + (c - p) / np.linalg.norm(c - p) * d for p in q])


# 1) rebuild a clean board inside an inset quad (keeps the hands on the edges untouched)
inner = inset(Q, 26)
mask_in = np.zeros((H0, W0), np.uint8)
cv2.fillConvexPoly(mask_in, inner.astype(np.int32), 255)
board = np.zeros((H0, W0), np.uint8)
cv2.fillConvexPoly(board, Q.astype(np.int32), 255)
lum = img.mean(2)
clean = ((board > 0) & (lum < 0.16)).astype(np.float32)          # board pixels that are not graphics
clean = cv2.erode(clean, np.ones((5, 5), np.uint8))
num = cv2.GaussianBlur(img * clean[..., None], (0, 0), 25)
den = cv2.GaussianBlur(clean, (0, 0), 25)[..., None] + 1e-6
fill = num / den
fill = fill + np.random.default_rng(1).normal(0, 0.006, fill.shape).astype(np.float32)  # keep the print texture
m = cv2.GaussianBlur(mask_in.astype(np.float32) / 255, (0, 0), 2)[..., None]
img = img * (1 - m) + fill * m

# 2) the new board design, flat, then warped onto the board
CW, CH = 810, 1000
canvas = np.zeros((CH, CW, 4), np.float32)


def put(el, cy, cx=CW / 2):
    h, w = el.shape[:2]
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    canvas[y0:y0 + h, x0:x0 + w] = over(canvas[y0:y0 + h, x0:x0 + w], el)


put(render_text('ADAM BARFI', SERIF_SB, 66, 14, 'gold', pad=10), 120)
put(render_text('آدم برفی', FA_BOLD, 44, rtl=True, pad=10), 192)
put(render_text('SPECIAL OFFER', SANS_SB, 34, 7, pad=10), 300)
put(render_text('BLACK', SERIF_BLACK, 200, 2, pad=10, max_w=640), 430)
put(render_text('FRIDAY', SERIF_BLACK, 200, 2, pad=10, max_w=660), 600)
put(render_text('UP TO 30% OFF', SANS_B, 54, 5, 'gold', pad=10), 735)
put(render_text('تا ۳۰٪ تخفیف ویژه', FA_BOLD, 46, rtl=True, pad=10), 812)
put(render_text('سفارش از طریق دایرکت اینستاگرام', FA_MED, 30, rtl=True, pad=10), 905)
# hairline under the brand
canvas[232:234, 300:510, :3] = np.array([0.85, 0.72, 0.45]) ; canvas[232:234, 300:510, 3] = 1

M = cv2.getPerspectiveTransform(np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]]), Q)
warped = cv2.warpPerspective(canvas, M, (W0, H0), flags=cv2.INTER_CUBIC)
warped = cv2.GaussianBlur(warped, (0, 0), 0.6)                    # match the photo's softness
# printed ink picks up the board's lighting
shade = np.clip(fill.mean(2, keepdims=True) / 0.09, 0.75, 1.25)
warped[..., :3] *= shade
img = warped[..., :3] + img * (1 - warped[..., 3:4])
img = np.clip(img, 0, 1)

out = (img * 255 + 0.5).astype(np.uint8)
cv2.imwrite(os.path.join(ROOT, 'assets', 'photos', 'p11_sign_walk_adambarfi.jpg'),
            cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])

# 3) exports without the neon (top 125 px cropped)
os.makedirs(os.path.join(ROOT, 'output'), exist_ok=True)
post = out[120:120 + 1066, :]                                   # 853 x 1066  (4:5)
post = cv2.resize(post, (1080, 1350), interpolation=cv2.INTER_LANCZOS4)
cv2.imwrite(os.path.join(ROOT, 'output', 'ADAM_BARFI_BlackFriday_Post_1080x1350.jpg'),
            cv2.cvtColor(post, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
story = out[125:1280, 135:785]                                   # 650 x 1155  (9:16)
story = cv2.resize(story, (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
cv2.imwrite(os.path.join(ROOT, 'output', 'ADAM_BARFI_BlackFriday_Story_1080x1920.jpg'),
            cv2.cvtColor(story, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
cv2.imwrite(os.path.join(ROOT, 'assets', 'photos', 'p11_sign_walk_adambarfi_9x16.jpg'),
            cv2.cvtColor(story, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 95])
print('sign ad done')
