# TEHRAN — 323 · Horizontal cut (music: Jon Lajoie – "Everyday Normal Guy 2")

| File | What |
|---|---|
| `final/TEHRAN_323_instagram_1080x1920_rotate.mp4` | **For Instagram.** 9:16 file. It opens with an animated "گوشی رو بچرخون / ROTATE YOUR PHONE" card over the song's intro, then the landscape film rotated 90°. Turning the phone counter-clockwise, as the animation shows, makes it full-screen and upright. 45.8 s |
| `final/TEHRAN_323_horizontal_1920x1080.mp4` | Landscape master, 16:9, for YouTube, TV or desktop. Starts on the song's first downbeat. 41.4 s |
| `preview/…540x960.mp4` | Lightweight preview of the Instagram version |

- The song was beat-tracked with librosa: 89 BPM, montage starts on the first strong downbeat at 4.39 s. Every cut follows the song's actual beat times (`project/beats.npy`), so tempo drift does not affect sync.
- Upright Tehran footage, the Mazda rolling shots and the landscape photos fill the 16:9 frame. The two portrait night-drive shots sit in a 3:4 window over a blurred extension of themselves.
- Audio is normalized to −14 LUFS / −1.5 dBTP, with a fade-out over the final shot.
- The music file was supplied by the user. The track is copyrighted, so Instagram may limit or mute it depending on licensing in your region.
- Rebuild: `render_h.py <uploads> build project/beats.npy` → `rotate_prompt.py <font_dir> 4.4 prompt.mp4` (Vazirmatn font from npm) → `assemble_h.py build <song.mp3> prompt.mp4 out`.
