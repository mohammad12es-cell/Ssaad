# Production system: The Last Log

One episode per week. Episode ID format: `epNN-slug`.

| Step | Output file | Tool | Time |
|---|---|---|---|
| 1. Topic pick | add a row to `trend-reports/<date>-opportunity-scores.md` | vidIQ keyword/outliers, web search | 30m |
| 2. Research | `research/epNN-sources.md` (from `research/_TEMPLATE-sources.md`) | primary archives first | 2–4h |
| 3. Script | `scripts/epNN-slug.md` (from `scripts/_TEMPLATE.md`) | — | 2h |
| 4. Fact check | resolve every [CHECK] | sources file | 30m |
| 5. Scene prompts | `video-prompts/epNN-scenes.md` (reuse the global style block) | image model | 1h |
| 6. Generate stills | `long-form/epNN/assets/` | **needs budget approval** | 1–2h |
| 7. VO | `voiceovers/epNN.wav` + direction file | TTS or a mic | 45m |
| 8. Assemble | HyperFrames composition → MP4 | HyperFrames + FFmpeg | 2h |
| 9. Captions | `.srt` | `whisper --model small` | 10m |
| 10. Thumbnail | `thumbnails/epNN-*.png` (2 variants) | image model + text layer | 45m |
| 11. Copyright check | tick `copyright-checks/policy-and-checklist.md` → `copyright-checks/epNN.md` | — | 15m |
| 12. Upload package | `long-form/epNN-upload-package.md` | `channel/tools/yt_upload.py` | 15m |
| 13. Shorts ×3 | `shorts/epNN-*.md`, cut from the same assets | HyperFrames 9:16 | 1.5h |
| 14. Review after 7 days | `analytics/<week>.md` | YouTube Studio | 30m |

## Anti-"inauthentic content" rules
- Change at least 30% of the structure beats between episodes (a different opening device, a different act order).
- Every episode needs a new primary-source finding or angle, stated in the description.
- No more than 2 long-form episodes per week.
