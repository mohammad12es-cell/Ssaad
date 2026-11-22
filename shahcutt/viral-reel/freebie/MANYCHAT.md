# ManyChat: keyword «پرامپت» for the reel https://www.instagram.com/reel/DgDzIYQn5hU/

## Trigger
- Instagram → **Comments** → "User comments on your Post or Reel" → choose this reel.
- Comment **contains** any of: `پرامپت`, `پرامت`, `پرامپ`, `prompt`. People misspell it, so match all four.

## Public reply to the comment (turn on "Randomize", one per comment)
1. فرستادم دایرکتت 📩
2. رفت تو دایرکتت! چک کن ✌️
3. برات فرستادم، دایرکتت رو ببین 🎬

## DM 1 (opening message, with a button)
Instagram holds back links in the first DM until the person replies or taps something, so the files come after a button.

```
سلام {first_name} 👋
ممنون که «پرامپت» رو کامنت کردی!
پرامپت کامل و چک‌لیست آماده‌ست. روی دکمه بزن تا برات بفرستم 👇
```
- Button: **بفرست 📩**
- In ManyChat, insert `{first_name}` as the "First Name" field.

## DM 2 (after the button)
```
اینم پرامپت 👇
کپیش کن، جای [متن خودت] متن ریلت رو بذار و بدش به Claude.
```

## DM 3: the prompt (951 characters, fits one Instagram message)
Paste the full text of `prompt.txt` as its own message, unchanged.

## DM 4: the checklist
```
اینم چک‌لیست کامل (PDF، ۵ صفحه) با همه‌ی عددها:
[لینک PDF]
خروجی Claude رو باهاش چک کن. هر تیکی که نخورد، همون مورد رو دوباره ازش بخواه.
```
- Link: upload `shahcutt-prompt-checklist.pdf` to Google Drive → Share → "Anyone with the link" → paste the link in place of [لینک PDF].

## DM 5 (5 s delay)
```
این قسمت ۱ از ۳ بود 🎬
قسمت ۲: طراحی صدا با هوش مصنوعی. فالو کن که از دستش ندی.
اگه می‌خوای ریلزهات رو خودم برات بسازم، همین‌جا پیام بده.
شاهین | @shahcutt
```

## Files
- `prompt.txt`: the prompt (DM 3).
- `shahcutt-prompt-checklist.pdf`: 5 pages, 9:16, Vazirmatn (OFL, embeddable) + JetBrains Mono (OFL). The licensed Abar font is not used.
- Pages: cover / prompt + how to use / checklist 1-2 / checklist 3-4 + delivery / the series + CTA.
- `checklist.html`: source of the PDF. Re-render: `node pdf.cjs checklist.html shahcutt-prompt-checklist.pdf` (Playwright).
