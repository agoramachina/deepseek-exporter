# Changelog

## [1.4.2]

- **Fixed Markdown and plain-text exports coming out empty.** DeepSeek moved message text from the flat `content` / `thinking_content` fields into a typed `fragments` array (`REQUEST`, `SEARCH`, `THINK`, `RESPONSE`), so exports contained only the `User:` / `DeepSeek:` labels. New `getMessageContent()` / `getMessageThinking()` read the fragments (search results are skipped) and fall back to the old fields. JSON exports were unaffected. Thanks to [@m-tommy](https://github.com/m-tommy) ([PR #9](https://github.com/agoramachina/deepseek-exporter/pull/9)).
- Fixed bulk ZIP exports silently dropping chats that share a title (e.g. several "New chat"s). `zip.file()` replaces same-named entries, so only the last one survived. Duplicates are now suffixed `" (2)"`, `" (3)"`, … via new `uniqueFilename()` (case-insensitive, since Windows/macOS filesystems are). Applies to both popup Export All and browse-page Export Selected/All.
- New `sanitizeFilename()` strips control characters/newlines, trailing dots/spaces, and caps length at 150; falls back to `"Untitled Chat"`. Replaces four copies of the inline invalid-character regex.
- Blob download URLs are now revoked after a delay instead of synchronously after `a.click()`, which can cancel the download in Firefox. ZIP downloads reuse `downloadFile()` instead of duplicating the anchor-click code.
- Popup now follows the theme chosen on the browse page. `popup-theme.js` read `localStorage['theme']` while `browse.js` wrote `'deepseek-exporter-theme'`; both now use `'theme'`, matching Claude Exporter. (A theme saved under the old key resets to the system preference once.)
- "Export Selected" now exports every checked chat, including ones currently hidden by the search. Before, the selection was intersected with the filtered list, so the export could contain fewer chats than the button's count.
- Browse-page progress modal stays open with "Creating ZIP..." until the download starts (it used to close before ZIP generation, making large exports look frozen).
- On install/update, the content script is now injected into all open `chat.deepseek.com` tabs, not just `/a/chat/s/*` chat pages — fixes "Receiving end does not exist" on tabs sitting on the DeepSeek home page.
- Popup "Export All" now checks for a DeepSeek tab first instead of failing with a connection error.
- `getLocalDateTimeString()` moved to shared `utils.js` (was inline in `content.js` and duplicated in `browse.js`).
- README: plain-text format uses `User:` / `DeepSeek:` prefixes (was documented as `Claude:`).
- Added `docs/` folder: INSTALL.md, TODO.md, CHANGELOG.md (same structure as Claude Exporter).
- README + INSTALL.md now link the Chrome Web Store and Firefox Add-ons listings (were "Coming Soon").
- Added vitest unit tests (`tests/`, 21 tests) for branch traversal, Markdown/plain-text conversion, and the filename helpers. `utils.js` exposes its functions via a Node-only `module.exports` block (ignored in the browser).
- Releases are now built by GitHub Actions: pushing a `vX.Y.Z` tag runs checks + tests, builds `deepseek-exporter-chrome.zip` / `deepseek-exporter-firefox.zip`, and creates the GitHub release with notes from this CHANGELOG. A checks workflow runs on every push to `testing`. README + INSTALL.md updated to the actual zip name (no `-vX.X.X` suffix).

## [1.4.1]

- Fixed browse window
- Firefox manifest permissions (`data_collection_permissions`, `strict_min_version`)

_Published_

## [1.4.0]

- Firefox port (Manifest V3 with `background.scripts`)
- Split into parallel `chrome/` and `firefox/` folders
- Bulk retrieval of large numbers of chats via `lte_cursor` pagination
- Browse page: search, multi-level sort, created-date column (fetched and cached), select/shift-select, export selected or all as ZIP
- Exports as JSON, Markdown, or plain text, with optional thinking and metadata
- Ported from [Claude Exporter](https://github.com/agoramachina/claude-exporter)
