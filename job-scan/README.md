# job-scan

Daily scan of Armenian job sites for content creation, short-form video (Reels/Shorts/TikTok),
video editing and motion design ads.

```bash
python3 job-scan/scan.py /path/to/out.json          # list relevant open ads (title filter)
node job-scan/pagetexts.cjs urls.txt texts.json       # full visible text of chosen ads
```

- `scan.py` covers staff.am, job.am (rendered with Playwright via `links.cjs`), jobfinder.am,
  myjob.am, hr.am and thejobs.am. list.am refuses automated requests and is skipped.
- staff.am ads carry an official apply-by-email address (`apply_email`, `...@e.staff.am`).
- job.am, BambooHR, spark.work and similar forms use reCAPTCHA; they are applied to by hand.
- No personal data (CV, contact details) is kept in this folder.
