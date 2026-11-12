# Yerevan Christmas edit — credits / منابع

## B-roll photos (Flickr via Openverse)

Attribution is required by these licenses; paste this into the post caption or description.

| used at | photo | author | license |
|---|---|---|---|
| ۶٫۲–۷٫۶ ث (کنسرت‌های شاد) | [Հրապարակ (II)](https://www.flickr.com/photos/37328175@N08/4126692628) | ninastoessinger | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| ۷٫۶–۹٫۴ ث (برنامه‌های هیجان‌انگیز) | ['My World' event in Gyumri (37)](https://www.flickr.com/photos/62764835@N02/5808080692) | UN Armenia | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| ۱۰–۱۲٫۹ ث (ساعت ۱۸) | [Walking around the Hraparak at night](https://www.flickr.com/photos/37328175@N08/3772136571) | ninastoessinger | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| (رزرو، استفاده نشده) | [Հրապարակ (I)](https://www.flickr.com/photos/37328175@N08/4125921685) | ninastoessinger | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |

Short form for the caption: Photos: ninastoessinger (CC BY-SA 2.0), UN Armenia (CC BY-SA 2.0) via Flickr.

## Cover

- Armenian flags: [Flag of Armenia.](https://www.flickr.com/photos/14759783@N04/13903872876) by young shanahan, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) (cut out from the sky with BiRefNet, `tools/cutout.py`).

## Everything else

- Footage and voice: the supplied clip (graded, voice cleaned and normalized).
- Presenter cutout: MODNet (Apache-2.0) via ONNX Runtime, `tools/matte.py`.
- Transcript: Whisper large-v3 via faster-whisper, `tools/asr.py` → `transcript.json`.
- 3D props (tree, gifts, notes, confetti, clock, calendar, pin, snow): Three.js r170, `assets/world3d.js`.
- Music and SFX: synthesized in `tools/music.py`.
- Font: Vazirmatn (OFL).
