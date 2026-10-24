# DeepSeek Exporter - TODO List

## Pending 🔄

### Critical Priority 🔴

### High Priority 🟠

### Medium Priority 🟡

- **Verify automated store uploads on the first real tagged release**
  - The release workflow now submits to the Chrome Web Store and AMO, but the store jobs have only been tested against stubbed responses
  - Watch the first tag's run; if a store job fails, fix it and use "Re-run failed jobs"
  - Follow-ups: pass CHANGELOG notes to AMO (`--amo-metadata`), and optionally attach AMO's signed .xpi to the GitHub release once it's approved

- **"Chat" checkbox is vestigial**
  - Unchecking it disables the Thinking/Metadata options, but no converter reads `includeChats`, so chats are exported regardless
  - Leftover from the Claude Exporter port (where it toggles chat text vs. artifacts-only). Either remove it from popup + browse, or give it a meaning

- **Include time with date**
  - Browse table and exports currently show date only

- **Flag new or updated chats since last export**

### Low Priority 🟢

- **Export as PDF**

- **Sync to Google Drive or local filesystem**

## Bugs 🐛

- **File-only messages export as an empty `User:` line**
  - A message containing only an uploaded file has a single `FILE` fragment and no `REQUEST` text, so text/Markdown show an empty label. Show something like `[attached file: name]` instead (`getMessageContent` in `utils.js`, both browsers + a test)

- **Reduce load on DeepSeek's servers so users don't get flagged**
  - Opening the browse page fetches every chat's full history (`eagerLoadCreatedDates`, every 200 ms) just to fill in the Created column. Check whether `fetch_page` items already include a creation time, or fetch dates only when sorting by Created
  - Bulk export fetches every chat 300–500 ms apart with no backoff. Add retry with exponential backoff on errors or rate-limit responses, and slightly randomized delays

## Completed ✅

- **100-chat limit gone** (v1.4.2, [issue #1](https://github.com/agoramachina/deepseek-exporter/issues/1))
  - DeepSeek's `fetch_page` cursor works again server-side; verified 2026-10-24 with a 109-chat export in all three formats. No code change needed

- **Automated store uploads in the release workflow** (v1.4.2)
  - Tag push: build → Chrome Web Store (API v2, Workload Identity Federation, no stored key) + AMO (`web-ext sign`, listed) in parallel → GitHub release only if both succeed
  - Credentials in the `stores` GitHub environment (tags `v*` only)

- **Fix empty Markdown/plain-text exports after DeepSeek's message format change** (v1.4.2)
  - DeepSeek moved message text into a typed `fragments` array (`REQUEST` / `SEARCH` / `THINK` / `RESPONSE`); converters read the old flat `content` / `thinking_content` fields, so exports had only `User:` / `DeepSeek:` labels
  - Fix contributed by @m-tommy in [PR #9](https://github.com/agoramachina/deepseek-exporter/pull/9): `getMessageContent()` / `getMessageThinking()` read fragments, falling back to the legacy fields
  - Regression tests cover both formats

- **GitHub Actions release + checks workflows** (v1.4.2)
  - Tag push (`vX.Y.Z`) runs checks + tests, builds both zips, and creates the GitHub release with CHANGELOG notes since the last `_Published_`; manual run = dry-run artifact
  - Every push to `testing`: manifest versions, Chrome/Firefox parity, JS syntax, vitest, `web-ext lint`, test build
  - Scripts in `.github/scripts/` are shared with Claude Exporter (only `ALLOWED_DIFFS` differs)

- **Vitest unit tests for `utils.js`** (v1.4.2)
  - 21 tests: branch traversal, Markdown/plain-text conversion (thinking, metadata, title fallback), `sanitizeFilename`, `uniqueFilename`, `getLocalDateTimeString`
  - `npm test` from `tests/`; canonical source is `chrome/utils.js`, `firefox/utils.js` must mirror (enforced by the checks workflow)

- **Store listings** (v1.4.2)
  - Live on the [Chrome Web Store](https://chromewebstore.google.com/detail/deepseek-exporter/iephoekbbcoecicnjjfiljochnpekmnb) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/deepseek-exporter/); README + INSTALL.md linked

- **Duplicate-title ZIP overwrites + filename sanitizing** (v1.4.2)
  - Bulk exports no longer drop same-titled chats (`uniqueFilename()` suffixes `(2)`, `(3)`, …)
  - `sanitizeFilename()` handles control chars, trailing dots/spaces, length, empty titles
  - Same fix ported to Claude Exporter (v1.10.21)

- **Firefox download reliability** (v1.4.2)
  - Blob URLs revoked after a delay; ZIP downloads go through shared `downloadFile()`

- **Popup theme sync with browse page** (v1.4.2)
  - Popup and browse page now share the same `theme` localStorage key (matches Claude Exporter)

- **Export Selected includes chats hidden by search** (v1.4.2)

- **Progress modal stays open during ZIP creation** (v1.4.2)

- **Content script injection on all DeepSeek tabs** (v1.4.2)
  - Install/update re-injection now matches `chat.deepseek.com/*`, not just chat pages

- **Popup Export All guards against non-DeepSeek tabs** (v1.4.2)

- **README plain-text prefix corrected** (v1.4.2)
  - `DeepSeek:` instead of `Claude:`

- **Docs folder** (v1.4.2)
  - INSTALL.md, TODO.md, CHANGELOG.md mirroring Claude Exporter's structure

- **Firefox port** (v1.4.0 – v1.4.1)
  - Parallel `chrome/` and `firefox/` folders; Firefox MV3 with `background.scripts`

- **Browse page** (v1.4.0)
  - Search, multi-level sort, cached created dates, select/shift-select, bulk ZIP export

- **Core export** (v1.4.0)
  - JSON / Markdown / plain text, branch-aware, optional thinking + metadata
