# EP01 voiceover direction

**Text:** every `VO:` line in `scripts/ep01-flannan-isles.md` (bracket tags removed). Extract it with:
`grep -oP '^\*\*\[S\d+\]\*\* VO: \K.*' scripts/ep01-flannan-isles.md | sed 's/ \[[^]]*\]//g' > voiceovers/ep01-vo.txt`

**Voice:** male or female, 35–50, calm, low-mid pitch, British or neutral transatlantic. The tone is "trusted archivist", not "horror narrator".
**Pace:** 140–150 wpm. Pause 0.6s after each scene line, and 1.2s before reveals (S3, S16, S21, S26).
**Emphasis:** *"don't appear in any official record"*, *"Only one coat was left"*, *"It added a storm."*
**Options (commercial use must be allowed; log the plan):** your own recording (best for authenticity), or ElevenLabs / similar on a paid plan that includes commercial rights. **No cloned celebrity or creator voices.**
**Post:** run `whisper ep01-vo.wav --model small --output_format srt` to make captions, then fix proper nouns (Eilean Mòr, Muirhead, Ducat).
