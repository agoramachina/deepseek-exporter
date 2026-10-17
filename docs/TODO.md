# DeepSeek Exporter - TODO List

## Pending 🔄

### Critical Priority 🔴

### High Priority 🟠

- **Verify message format against the live DeepSeek API**
  - `convertToMarkdown` / `convertToText` in [chrome/utils.js](../chrome/utils.js) read `message.content` and `message.thinking_content`
  - If DeepSeek has moved to a different message structure (e.g. a `fragments` array), Markdown and plain-text exports would come out empty while JSON still works
  - Export one real chat in each format and compare against the JSON

### Medium Priority 🟡

- **"Chat" checkbox is vestigial**
  - Unchecking it disables the Thinking/Metadata options, but no converter reads `includeChats`, so chats are exported regardless
  - Leftover from the Claude Exporter port (where it toggles chat text vs. artifacts-only). Either remove it from popup + browse, or give it a meaning

- **Include time with date**
  - Browse table and exports currently show date only

- **Flag new or updated chats since last export**

### Low Priority 🟢

- **Export as PDF**

- **Sync to Google Drive or local filesystem**

- **Store listings**
  - Publish to Chrome Web Store and Firefox Add-ons; update README + INSTALL.md links

## Bugs 🐛

(none currently open)

## Completed ✅

- **Duplicate-title ZIP overwrites + filename sanitizing** (v1.4.2)
  - Bulk exports no longer drop same-titled chats (`uniqueFilename()` suffixes `(2)`, `(3)`, …)
  - `sanitizeFilename()` handles control chars, trailing dots/spaces, length, empty titles
  - Same fix ported to Claude Exporter (v1.10.21)

- **Firefox download reliability** (v1.4.2)
  - Blob URLs revoked after a delay; ZIP downloads go through shared `downloadFile()`

- **Popup theme sync with browse page** (v1.4.2)
  - Popup reads the same `deepseek-exporter-theme` key the browse page writes

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
