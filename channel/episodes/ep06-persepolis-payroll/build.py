"""Builds index.html for ep06 from vo/timing.json (scene timings come from the voiceover)."""
import json, pathlib

HERE = pathlib.Path(__file__).parent
T = json.loads((HERE / "vo" / "timing.json").read_text())
scenes, total = T["scenes"], T["total"]

# kind: photo = uploaded key art, vec = vector scene
KIND = ["photo", "vec", "photo", "photo", "vec", "photo", "photo", "vec", "vec", "vec", "vec", "vec", "photo", "vec", "vec"]
CAPS = [
    'قدیمی‌ترین <span class="hl">فیش حقوقی</span> ایران... زیرِ تخت جمشید!',
    '<span class="hl">۲۵۰۰ سال پیش</span>: داریوش شروع کرد به ساختن',
    '<span class="hl">۱۹۳۳</span>: صندوق‌های سنگی زیرِ کاخ آپادانا',
    'لوح <span class="hl">طلا</span>... و لوح <span class="hl2">نقره</span>!',
    '<span class="hl">رزومه‌ی</span> امپراتوری!',
    'کف‌پوشِ لاکچری: <span class="hl">سکه!</span>',
    'گنجِ اصلی: <span class="hl">لوح‌های گِلی</span>',
    '<span class="hl">هزاران</span> لوحِ حساب‌وکتاب',
    'جو، شراب، گوسفند... با <span class="hl">خط میخی!</span>',
    '<span class="hl">مزد و جیره</span> برای کارگرا',
    '<span class="hl">زن‌ها</span> هم کار می‌کردن و جیره می‌گرفتن',
    'سهمیه‌ی اضافه برای <span class="hl">مادرای تازه‌زا</span>',
    '۲۵۰۰ سال پیش... <span class="hl">حساب‌وکتاب</span> داشت!',
    'فیشِ ما گم میشه... <span class="hl">گِلِ اونا موند!</span>',
    'از امروزِ ما چی می‌مونه؟ <span class="hl">کامنت کن</span>',
]

clips = []
for i, s in enumerate(scenes, 1):
    st = 0 if i == 1 else s["start"]
    du = round(s["end"] - st, 3)
    if KIND[i - 1] == "photo":
        clips.append(
            f'<div id="p{i}" class="clip photo" data-start="{st}" data-duration="{du}" data-track-index="1">'
            f'<div class="cam"><img class="ph" src="assets/hero.png" alt="" /><svg class="ov" viewBox="0 0 1080 1919"><g id="ov{i}"></g></svg></div></div>'
        )
    else:
        clips.append(
            f'<svg id="v{i}" class="clip stage" data-start="{st}" data-duration="{du}" data-track-index="2" viewBox="0 0 1080 1920"><g id="g{i}"></g></svg>'
        )
    clips.append(f'<div id="c{i}" class="clip cap" data-start="{st}" data-duration="{du}" data-track-index="3"><div class="card">{CAPS[i-1]}</div></div>')

html = (HERE / "template.html.tpl").read_text()
html = html.replace("__TOTAL__", str(total)).replace("__CLIPS__", "\n      ".join(clips))
html = html.replace("__SCENES__", json.dumps([s["start"] for s in scenes]))
(HERE / "index.html").write_text(html)
print("ok", total)
