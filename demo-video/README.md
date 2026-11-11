# Tangent demo video

The ~27 s LinkedIn launch video (issue #45): the real app on gotangent.app, driven by Playwright, cut together in Remotion at 1080×1350 (4:5).

This is its own Node project. The app never imports it, and the root typecheck, lint, Jest and Metro skip it.

## Make the video

```bash
npm install
npx playwright install chromium

npm run record    # live run on prod: saves Wikimedia responses to capture/wikimedia.har
npm run capture   # replays the HAR: same path every take → public/capture/screen.mp4 + timeline.json
npm run render    # → out/tangent-demo.mp4
npm run studio    # preview and scrub in the browser
```

- **Choose the path with `record`.** Home is random, so each `record` takes a new path. Check `capture/stills/` (one still per hop, reader and Logbook) and run `record` again until the path looks good. `record` also saves a take, so you can render straight away.
- **UI changed?** Run `capture` then `render`. The recorded path stays the same.
- **Music:** put a royalty-free track at `public/music.mp3` (gitignored). It is picked up automatically, fades in, and fades out over the end card. Without it the video is silent.
- `--headed` on `record` or `capture` shows the browser while it runs.

## How it stays repeatable

- Wikimedia requests replay from the HAR. The app itself is the live production build.
- The page's `Date` starts at the time of recording and `Math.random` is seeded, so a replay sends exactly the requests the recording saved.
- PostHog is blocked, so demo runs never reach the beta funnels.
- Onboarding is done off camera with **Just start**.
- `capture` lists any Wikimedia request the HAR couldn't answer. Some misses are expected: Home rebuilds itself in the background with the same random query, so the brief pass through Home before the Logbook shows different cards than the recording. Misses anywhere else mean the path has drifted, so run `record` again.

## Where things live

| What | File |
|---|---|
| What happens on camera, and when | `scripts/storyboard.ts` |
| Captions per beat | `src/captions.ts` |
| Layout, colours, fonts | `src/theme.ts` (Paper tokens from `DESIGN.md`) |
| End card | `src/EndCard.tsx` (glyph shared with the app via `src/brand/tangentGlyph.ts`) |

Beat 5 shows Logbook stamps and finds because the atlas wasn't in production yet. Once it ships, change that beat to show the atlas.
