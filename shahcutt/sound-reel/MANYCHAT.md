# ManyChat: keyword «صدا» for the sound-reel «بی‌صدا یا باصدا؟»

The gift promised in the reel and its caption is the list of this reel's sounds (when and how loud) plus the 3 rules. Every number below comes from the build: `tools/mix_sfx.py`, `tools/mix_full.py`, `tools/deliver.sh`. It goes out as DM text, so there is no file to host.

## Trigger
- Instagram → **Comments** → "User comments on your Post or Reel" → choose this reel once it is published.
- Comment **contains** any of: `صدا`, `seda`, `sound`.
- «صدا» is a common word, so a comment like «صداش عالیه» also gets the gift. That is harmless.

## Public reply to the comment (turn on "Randomize")
1. فرستادم دایرکتت 🎧
2. لیست صداها رفت تو دایرکتت ✌️
3. برات فرستادم، دایرکتت رو ببین 🔊

## DM 1 (opening message, with a button)
```
سلام {first_name} 👋
ممنون که «صدا» رو کامنت کردی!
لیست صداهای ریل «بی‌صدا یا باصدا؟» آماده‌ست. روی دکمه بزن تا برات بفرستم 👇
```
- Button: **بفرست 🎧**. In ManyChat, insert `{first_name}` as the "First Name" field.

## DM 2 (after the button): the sound list
```
🎧 لیست صداهای کلیپ B (۳.۷۵ ثانیه، موزیک ۱۲۰ BPM)

۰.۰۰ ووش: گره‌ی کروم وارد می‌شه
۰.۵۰ بوم + ضربه‌ی بم: فرود گره
۱.۰۰ ضربه + کلیک: کلمه‌ی «حرکت» می‌کوبه
۱.۲۵ / ۱.۵۰ / ۱.۷۵ تیک: هر ردیف نقطه یه تیک
۲.۰۰ اسنپ + درخشش: ستاره پیدا می‌شه
۲.۵۰ سوییش + ووش: گره می‌چرخه
۳.۰۰ ووش: متن بیرون می‌ره
۳.۵۰ بوم + کلیک: پایان

همه‌ی صداها دقیقاً روی ضرب یا نیم‌ضرب موزیکن (هر ۰.۲۵ ثانیه).
```

## DM 3: levels + the 3 rules
```
🔊 بلندی‌ها
• بوم، ضربه و ووش اصلی: بلندترین افکت‌ها
• اسنپ و سوییش: حدود ۳.۵ دسی‌بل پایین‌تر
• کلیک و تیک: حدود ۶ دسی‌بل پایین‌تر
• درخشش: حدود ۷ دسی‌بل پایین‌تر، با فیلتر Low-pass روی ۷ کیلوهرتز که تیز نباشه
• کل افکت‌ها منفی ۷ دسی‌بل، موزیک منفی ۳ دسی‌بل؛ هر دو با داکینگ (Sidechain) زیر صدای گوینده می‌رن
• خروجی نهایی: منفی ۱۴ LUFS، پیک زیر منفی ۱.۵ dBTP

📌 ۳ قانون
۱. هر حرکت، صدای خودش: ووش برای جابه‌جایی، کلیک برای متن، بوم برای ضربه
۲. قبل از ضربه‌ی اصلی، نیم ثانیه سکوت کامل
۳. موزیک همیشه زیر صدای گوینده، حدود ۱۰ تا ۲۰ دسی‌بل پایین‌تر
```

## DM 4 (5 s delay)
```
این قسمت ۲ از ۳ بود 🎬
قسمت ۳: ۵ اشتباه تایپوگرافی فارسیِ هوش مصنوعی. فالو کن که از دستش ندی.
اگه می‌خوای ریلزهات رو خودم برات بسازم، همین‌جا پیام بده.
شاهین | @shahcutt
```

## ManyChat setup (same flow as the «پرامپت» reel, see viral-reel/freebie/MANYCHAT.md)
1. Trigger + keywords + public replies.
2. Send Message with DM 1 and its button.
3. The button leads to a Send Message holding DM 2 and DM 3 as two text blocks.
4. Smart Delay 5 s → DM 4.
5. Go Live.
6. Test from a second account.
