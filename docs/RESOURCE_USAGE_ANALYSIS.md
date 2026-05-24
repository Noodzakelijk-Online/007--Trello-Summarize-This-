# Resource Usage Analysis

Date: 2026-05-24

## Summary

The active Trello Power-Up is already lightweight because it is a static browser app. The biggest resource risk was not CPU or memory, but unbounded AI request size on very large cards and unnecessary static surface area in a Windows install. Both were reduced without removing user-facing features.

## Measured Footprint

Measured with:

```powershell
npm run analyze:resources
```

Current results:

- Active popup initial local files: about 41.9 KB (`popup.html`, `summarizer-core.js`, `icon.svg`).
- Windows installer runtime payload: about 130.5 KB.
- Whole repository source footprint, excluding `.git` and `dist`: about 1.24 MB.
- Large-card AI prompt after caps: 12,572 characters.
- Large-card prompt comments included: 12.
- Longest included comment: 700 characters.
- Included card description: 2,499 characters.

## Optimizations Applied

1. Bounded AI prompt size:
   - Card descriptions sent to AI are capped at 2,500 characters.
   - AI prompt comments are capped to the first 12 comments.
   - Each included comment is capped at 700 characters.
   - Labels and members are capped to 25 each.

2. Bounded AI response size and time:
   - OpenAI and Google outputs are capped at 900 output tokens.
   - Anthropic output is capped at 900 tokens.
   - AI provider requests time out after 30 seconds and fall back cleanly in auto mode.

3. Reduced background polling:
   - Trello card badge refresh moved from 60 seconds to 300 seconds.
   - This avoids repeated settings reads while keeping the badge useful.

4. Lightweight Windows runtime:
   - The installer includes only runtime static files and launcher scripts, not the full repository, docs, benchmarks, or prototype modules.
   - The Windows launcher uses PowerShell and a tiny local HTTP server, avoiding Electron and background services.
   - The Trello setup assistant adds about 12 KB to the runtime payload.

5. No always-on service:
   - The installed app starts only when the user launches it.
   - Closing the launcher window stops the local server.

## Resource Risk Review

### CPU

Low. The local summarizer uses simple string processing and checklist counting. There are no animation loops, polling loops, workers, or recurring CPU tasks in the popup. AI work runs on provider APIs, not locally.

### Memory

Low. The active popup loads a small static HTML page and one shared JS helper. The local Windows launcher holds one lightweight PowerShell process while the local app is open.

### Disk

Low for installed users. The installer payload is roughly 118 KB before executable wrapper overhead. The generated `SummarizeThisSetup.exe` is larger because IExpress wraps the files into a Windows installer.

### Network

Moderate only when AI is enabled. The app sends Trello card context to the selected AI provider. The new prompt caps reduce token use, latency, and provider cost for large cards. In local-only mode no AI provider network request is made.

### Trello Runtime

Low. The Power-Up reads card, board, list, and settings data on demand. Badge refresh now uses a slower interval to reduce background reads.

## Tradeoffs

- The prompt caps preserve the feature but may omit very old or very long comment text from AI analysis. This is intentional: the latest 12 comments and card description usually carry the strongest context, and the local summary still uses structured metadata.
- The Windows `.exe` installer runs the standalone/local version. Trello Power-Up usage still requires hosting the static files on HTTPS, because Trello cannot load a private local Windows installer path inside Trello.

## Remaining Opportunities

- Move AI calls behind an optional backend proxy to reduce browser-held key risk and enable better request caching.
- Add a user-facing “include more comments” setting for unusually large cards.
- Split the standalone `index.html` demo from the production install if the installer should become even smaller.
- Add browser performance timing metrics in the popup for future regression checks.
