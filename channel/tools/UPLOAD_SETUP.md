# Let Claude upload to YouTube (one-time, about 10 minutes)

1. Open https://console.cloud.google.com, create a project (for example "pip-pebble") and enable **YouTube Data API v3**.
2. Go to **APIs & Services → OAuth consent screen**. Choose External, add your Gmail as a *Test user*, and publish it (or keep it in Testing).
3. Go to **Credentials → Create credentials → OAuth client ID** and choose type **Web application**.
   Add the authorized redirect URI `https://developers.google.com/oauthplayground`.
   Copy the **Client ID** and **Client secret**.
4. Open https://developers.google.com/oauthplayground, then:
   - Click the ⚙️ icon, tick "Use your own OAuth credentials" and paste the Client ID and secret.
   - In Step 1, enter the scopes `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube` and click Authorize. Sign in with the channel's Google account.
   - In Step 2, click "Exchange authorization code for tokens" and copy the **Refresh token**.
5. In the Claude Code cloud environment settings (environment menu in the session title bar → Edit), add these three values under Network secrets or environment variables:
   - `YT_CLIENT_ID`
   - `YT_CLIENT_SECRET`
   - `YT_REFRESH_TOKEN`

   **Do not paste them into the chat.** A new session picks them up.

Then each upload is:
```
python3 channel/tools/yt_upload.py output/pip-pebble-ep02-one-fly.mp4 channel/episodes/ep02-one-fly/meta-upload.json
```

# Shorts checklist the episodes follow
- Hook in the first 0.5 s (motion and a caption on frame 1, no logo intro).
- 12–20 s long. Shorter loops rack up rewatches, which helps "viewed vs. swiped".
- The last frame flows back into the first (ep02 loops perfectly) and there's no end card.
- Captions high in the frame, clear of the bottom UI.
- No dialogue, so the jokes travel across languages. Original music only (no Content ID claims).
- Title under 60 characters with a question or emoji, plus 3 hashtags (#animation #cartoon #shorts).
- A description that asks a question to drive comments ("Team Pip or Team Pebble?").
- 3 uploads a week at a consistent time. Check retention and swipe rate 48 h after each upload.
- `madeForKids` is set to **false** in the meta files. Change it if your audience is mainly children (legal requirement).
