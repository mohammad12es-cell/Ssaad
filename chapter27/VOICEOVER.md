# CHAPTER 27 — Persian voiceover (روایت فارسی)

Each line is its own `<audio>` clip in `index.html` (`#vo-01` … `#vo-08`). They currently point to
**silent placeholder files** of the exact slot length in `assets/audio/vo/`. To add the real narration:

1. Record each line (or the whole take and cut it) as WAV/MP3, mono or stereo, 48 kHz.
2. Save over the placeholder with the same name (`assets/audio/vo/vo-01.wav` …) — or change the `src`.
3. If a take is longer than its slot, raise that clip's `data-duration` (the slots leave 1–3 s of air).
4. Music ducks automatically to 35 % under each slot (`data-automation` on `#score`).
5. Re-run `npx hyperframes check` and `npm run render`.

Tone: low, close-mic, unhurried. Pause on "…" for ~0.6 s.

| Clip  | Start → End (s) | Scene          | Persian line |
| ----- | --------------- | -------------- | ------------ |
| vo-01 | 2.5 → 9.5       | 1 The Beginning | پانزدهمِ آبانِ هزار و سیصد و هفتاد و هشت… یک داستان شروع شد. |
| vo-02 | 14.0 → 23.5     | 2 The Dreamer   | پسری که به افق خیره می‌شد… و باور داشت آن دوردست‌ها، جایی برای او هست. |
| vo-03 | 28.0 → 39.5     | 3 The Warrior   | زمینِ والیبال شد خانه‌اش. با دستِ چپ، با عرق، با هر پرش… یاد گرفت هیچ چیز بی‌جنگیدن به دست نمی‌آید. |
| vo-04 | 43.5 → 53.5     | 4 The Silence   | بعد… سکوت آمد. سال‌هایی که گم شدند. سؤال‌هایی که جوابی نداشتند. |
| vo-05 | 56.5 → 66.0     | 4b The Grind    | هر روز… هر شب. وقتی هیچ‌کس نگاه نمی‌کرد. عرق، درد، تکرار… تا روزی که آماده شد. |
| vo-06 | 69.0 → 79.0     | 5 The Return    | اما کسی که یک بار طعمِ پرواز را چشیده باشد… برمی‌گردد. قوی‌تر از قبل. |
| vo-07 | 82.0 → 95.5     | 6 The Search    | حالا دنبالِ چیزی بزرگ‌تر است: استقلال، ساختن، خلق کردن… و دنیایی فراتر از مرزها. |
| vo-08 | 99.0 → 109.0    | 7 Chapter 27    | بیست و هفت سال. این پایان نیست… این فقط فصلِ بیست و هفتم است. |

Transcribe a finished take to check its timing (Whisper is installed):

```bash
npx hyperframes transcribe assets/audio/vo/vo-01.wav --json     # or:
whisper assets/audio/vo/vo-01.wav --language fa --model small --word_timestamps True
```
