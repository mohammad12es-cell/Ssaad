# 2026-11-28 · «ویدیوی افقی رو دستی کراپ نکن» (P12 hidden button walkthrough + P1 result first)

**Video:** `output/shahcutt-2026-11-28-reframe.mp4`
- 39.7 s, 1080×1920, −15.0 LUFS.
- Cover: frame 0, `output/shahcutt-2026-11-28-reframe-cover.png`.

**Voice:** Gemini 3.8 Flash TTS, Charon.
- 4 takes were made:
  - Takes 1 and 2 said «بفرستن» (they send) instead of «بفرستم»; take 2 also said «بیشتر» and dropped «تند».
  - Takes 3 and 4 also spoke part of a pronunciation note aloud.
- Used take 3 with that 2.75 s cut out at its pauses, ×1.06 tempo. Whisper confirms all 10 sentences.

**Look:** v2 follows Shahin's reference (an editing-agency promo).
- Light studio, ice-blue extruded 3D type with glow, blue stripe sets.
- Full-frame 3D scenes (hill + laptop, clock floor + light beam, CRT TV stack), rendered in three.js (`scenes/`).
- The "horizontal footage" is a 3D studio with a presenter layer, so the 9:16 crop can really track him.
- Raw-vs-new split cards, pixel-dissolve cuts, light app panels with blue arrows, and an end card with ripples.
- Built by `build_ref.py` + `src/ref.html`. The first, dark engine version is still reproducible with `build.py`.

**Why no Gemini images or Veo:**
- The AI Studio key has 0 free-tier quota for every image model (gemini-3-pro-image, 3.1-flash-image, 2.5-flash-image).
- No Veo model is listed for it (veo-3.1 returns 404).
- `tools/gen_image.py` is ready. With billing on, any plate in `assets/img/` can be replaced by a generated image of the same name.

## Pattern and source reels
**P12: hidden in-app button walkthrough with red arrows.**
- Volume business-and-marketing #1: 10 accounts, 44x.
  - Measured 2026-11-27; unchanged when checked on 2026-11-28.
  - Tech-and-ai #1 is P1 «show the finished result in second one» (9 accounts, 28x), so frame 0 shows the finished 9:16 crop tracking the subject.

vidIQ outlier search (2026-11-28, 5 credits):

| Creator | Lift | What it is | Link |
|---|---|---|---|
| @deanwetherstechreviews | 2519x | 3 Premiere Pro features walked through on screen; same niche, same app | https://www.tiktok.com/@deanwetherstechreviews/video/7706608499500846367 |
| @enriquestories | 39.7x, 4.6M views | «How To Do This?» CapCut feature, every tap shown | https://www.instagram.com/reel/Df7kFJDIENM |
| @lourrutiappt | — | «Why is Canva hiding this!!»: the hidden-button hook | https://www.instagram.com/reel/DgKRgmUAjOG |
| @sofis.designspot | 17.3x | «I still do my designs MANUALLY»: manual vs automatic. That is the angle of today's hook «دستی کراپ نکن» | https://www.instagram.com/reel/DfsOwaEpsod |

## Script (Charon, about 30 s)
- Hook (frame 0): «ویدیوی افقی رو دستی برای ریلز کراپ نکن.», over the 16:9 frame with the red 9:16 crop following the subject.
- Promise: «پریمیر یه دکمه داره که خودش عمودیش می‌کنه و سوژه رو وسط کادر نگه می‌داره.»
- Proof: «بیش از ۵۰۰ پروژه» (CV: 500+ projects across three studios), then «این سه تا کلیک».
- Steps:
  1. Project panel → right-click the sequence → **Auto Reframe Sequence…** (menu, cursor, red arrow).
  2. **Target Aspect Ratio** → **Vertical 9:16** (the dropdown opens and the value changes).
  3. **Motion Tracking** → **Default** → **Create**.
- Tip: fast subject → **Faster Motion**.
- Payoff: a new vertical sequence; the original is untouched (16:9 next to 9:16 with a check).
- CTA: «پریمیر» → 7 automatic Premiere tools with exact paths.
- Loop: «دیگه دستی کراپ نکن.»

## Fact check (Adobe pages were reached through search; a direct fetch of helpx.adobe.com returned 403)
**Confirmed:**
- Open it by right-clicking the sequence in the Project panel, or from Sequence > Auto Reframe Sequence.
- The dialog has Target Aspect Ratio presets and Motion Tracking (Slower Motion, Default, Faster Motion). Adobe says Faster Motion is for footage with a lot of motion.
- Create makes a duplicate sequence at the new size, inside an «Auto Reframe Sequences» folder. Every clip in it has the Auto Reframe effect.

**Stylised, not a screen recording:**
- The panel is a clean rebuild.
- The context menu shows only five items.
- The dropdown starts on «Square 1:1»; that is an assumption about the default.
- If Shahin has a real screen recording of his Premiere, it can replace the UI beats (see the #18 idea).

## Checklist (PLAYBOOK §7): 9.5 / 10
- Hook on frame 0 shows the result ✓.
- Proof by 3 s (the tracking crop is visible from frame 0) ✓.
- Re-hooks: step counter, menu, dropdown, button; something moves at least every 1.2 s ✓.
- Payoff held for the end ✓; value ✓; real proof (CV) ✓; keyword and gift ✓; loop line ✓.
- Half point off: «سه تا کلیک» (the promise) lands at about 8 s, not by 5 s.
- Length and pace to confirm after the voice.
- Trend fit: P12 + P1.

## Keyword
«پریمیر» → the 7 automatic Premiere tools with exact paths, delivered in the DM itself.

## Caption
ویدیوی افقی رو دستی برای ریلز کراپ نکن ✋
پریمیر خودش عمودیش می‌کنه و سوژه رو وسط کادر نگه می‌داره:
۱. پنل Project ← راست‌کلیک روی سکانس ← Auto Reframe Sequence
۲. تارگت اسپکت ریشیو: Vertical 9:16
۳. موشن ترکینگ: Default (سوژه تند حرکت می‌کنه؟ Faster Motion) ← Create
یه سکانس عمودی جدید می‌سازه و سکانس اصلیت دست نمی‌خوره.
«پریمیر» رو کامنت کن تا لیست ۷ ابزار خودکار پریمیر رو با مسیر دقیقشون برات بفرستم 👇
#تدوین #پریمیر #ادیت_ویدیو #ریلز #موشن_گرافیک

## DM (sent by Shahin or his ManyChat keyword automation)
Paths 1–3 were checked against Adobe's documentation today. **Shahin should confirm 4–7 in his own Premiere version before the DM goes out**, because menu names move between versions.

سلام! ممنون که «پریمیر» رو کامنت کردی 🙏
این ۷ تا ابزار خودکار پریمیر، با مسیر دقیق:
۱. Auto Reframe (افقی به عمودی): پنل Project ← راست‌کلیک روی سکانس ← Auto Reframe Sequence ← Target Aspect Ratio: Vertical 9:16 ← Motion Tracking: Default (برای حرکت تند Faster Motion) ← Create
۲. Scene Edit Detection (کات‌های یه ویدیوی رندرشده رو خودش پیدا می‌کنه): راست‌کلیک روی کلیپ توی تایم‌لاین ← Scene Edit Detection ← تیک Apply a cut at each detected cut point ← OK. اگه نمی‌خوای صدا هم بریده بشه، اول صدا رو از تصویر جدا کن.
۳. Auto Ducking (موزیک زیر صدا خودش پایین میاد): کلیپ موزیک ← پنل Essential Sound ← Music ← تیک Ducking ← Duck against: Dialogue ← Generate Keyframes
۴. Speech to Text (زیرنویس خودکار): پنل Text ← Transcript ← Transcribe، بعد Create captions
۵. Enhance Speech (صدای گوشی رو استودیویی می‌کنه): کلیپ صدا ← Essential Sound ← Dialogue ← Enhance
۶. Remix (موزیک رو هم‌اندازه‌ی ویدیو می‌کنه): Essential Sound ← Music ← Duration ← Remix، یا ابزار Remix روی تایم‌لاین
۷. Morph Cut (پرش وسط مصاحبه رو صاف می‌کنه): پنل Effects ← Video Transitions ← Dissolve ← Morph Cut ← بنداز روی محل کات
اگه خواستی ریلزهای پیجت رو من تدوین کنم، همین‌جا پیام بده.
شاهین | @shahcutt

## Publishing
Not published. That needs Shahin's approval of this exact video and caption.
