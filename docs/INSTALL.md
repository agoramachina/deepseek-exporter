# Installation Guide

Complete installation instructions for DeepSeek Exporter on Chrome and Firefox.

## Install from Browser Store (Recommended)

The simplest way to install DeepSeek Exporter and receive automatic updates:

- **Chrome/Chromium-based browsers:** [Chrome Web Store](https://chromewebstore.google.com/detail/deepseek-exporter/iephoekbbcoecicnjjfiljochnpekmnb)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/deepseek-exporter/)

After installing, proceed to [Configuration](#configuration).

---

## Install from Releases (.zip / .xpi)

For users who want to install manually without the browser stores.

### Chrome (and Chromium-based browsers)

1. Download the `deepseek-exporter-chrome-vX.X.X.zip` from the [Releases page](https://github.com/agoramachina/deepseek-exporter/releases)
2. Extract the zip into a safe folder (this will be the permanent location - don't move or delete it!)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top right)
5. Click **Load unpacked** and select the extracted `deepseek-exporter-chrome` folder
6. Done! Proceed to [Configuration](#configuration)

### Firefox

1. Download the latest `.xpi` file from the [Releases page](https://github.com/agoramachina/deepseek-exporter/releases)
2. Drag and drop the `.xpi` file into Firefox
3. Click **Add** when Firefox asks for permission
4. Done! Proceed to [Configuration](#configuration)

---

## Install from Source

For developers or those who want to build from source:

### Prerequisites
- **Chrome**: Google Chrome browser (or Chromium-based browser like Edge, Brave, etc.)
- **Firefox**: Mozilla Firefox (version 109 or later)
- Git (optional, for cloning)
- A DeepSeek account

### Chrome Installation from Source

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/agoramachina/deepseek-exporter.git
   cd deepseek-exporter
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome` folder (inside the repository)
   - The extension icon should appear in your toolbar

5. **Proceed to [Configuration](#configuration)**

### Firefox Installation from Source

#### Option 1: Temporary Installation (For Development)

1. **Clone or Download the Repository** (if not already done)
   ```bash
   git clone https://github.com/agoramachina/deepseek-exporter.git
   cd deepseek-exporter
   ```

2. **Load in Firefox**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..."
   - Navigate to the `firefox` folder (inside the repository)
   - Select the `manifest.json` file
   - Extension loads until you restart Firefox

3. **Proceed to [Configuration](#configuration)**

#### Option 2: Developer Installation (Unsigned, Permanent)

**Not recommended** - only for advanced development:

1. Clone the repository (see Option 1)
2. Open Firefox and navigate to `about:config`
3. Search for `xpinstall.signatures.required`
4. Set it to `false` (this allows unsigned extensions)
5. Package the extension:
   ```bash
   cd firefox
   zip -r ../deepseek-exporter-firefox.zip *
   ```
6. Go to `about:addons`
7. Click the gear icon → "Install Add-on From File..."
8. Select the `deepseek-exporter-firefox.zip` file

**Warning**: Setting `xpinstall.signatures.required` to `false` disables important security protections. Only use for development.

---

## Configuration

No setup is required. DeepSeek Exporter uses your existing DeepSeek login session.

1. Log in at [chat.deepseek.com](https://chat.deepseek.com/)
2. If you already had DeepSeek tabs open before installing, refresh them once
3. Click the extension icon in your browser toolbar
4. Choose your export format and options, then click **Export Current Chat**, **Export All**, or **Browse All Chats**

---

## Troubleshooting

### Common Issues (Both Browsers)

#### "Not logged in to DeepSeek"
- Make sure you're logged into [chat.deepseek.com](https://chat.deepseek.com/)
- Try refreshing the DeepSeek page
- If you recently logged out and back in, refresh any other open DeepSeek tabs

#### "Please open a DeepSeek tab first" (Browse page)
- The browse page talks to DeepSeek through an open DeepSeek tab
- Open [chat.deepseek.com](https://chat.deepseek.com/) in another tab, then reload the browse page

#### "downloadFile is not defined" or "Receiving end does not exist" error
If you see this error when trying to export the current chat:
1. **Refresh the DeepSeek page** (F5 or Ctrl+R)
2. Try the export again
3. This happens when the content script hasn't fully loaded yet

#### Export fails for some chats
- Check the browser console for specific error messages
- Bulk exports report how many chats succeeded and list any that failed
- Large bulk exports may take several minutes; the extension intentionally pauses between requests to avoid overwhelming the API

### Chrome-Specific Issues

#### Extension doesn't appear after loading
- Make sure you selected the `chrome` folder, not a subfolder
- Check that Developer mode is enabled
- Look in the Extensions page for any error messages

#### Content Security Policy errors
- Make sure you're using the latest version of the extension
- Try removing and re-adding the extension from `chrome://extensions/`

### Firefox-Specific Issues

#### Extension doesn't appear after loading
- Make sure you selected the `manifest.json` file, not the folder
- Check the Browser Console (Ctrl+Shift+J) for errors

#### "Could not establish connection" errors
- Refresh the DeepSeek page after loading the extension
- Check that you're on `https://chat.deepseek.com/*`
- Try unloading and reloading the extension from `about:debugging`

#### Content script not injecting
- Firefox may require you to refresh DeepSeek tabs after installing the extension
- Check the extension's permissions in `about:addons` — it needs access to `chat.deepseek.com`

#### Extension showing old UI or features after update
Firefox aggressively caches extension files. To force a reload:
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "DeepSeek Exporter" and click **Remove**
3. Close ALL Firefox windows completely
4. Restart Firefox and reload the extension
5. Alternatively, hard-refresh (Ctrl+Shift+R) on DeepSeek after reloading

If you still see old cached content:
- Clear Firefox cache: `Ctrl+Shift+Delete` → Check "Cache" → Clear Now
- Reload the extension from `about:debugging`
- Refresh the DeepSeek page

#### "This add-on could not be installed because it has not been verified"
- Use the signed `.xpi` from the Releases page, not a self-built zip
- Or use temporary installation via `about:debugging` for development

---

## Browser Differences

### Technical Differences

The Firefox and Chrome versions are functionally identical. Both use Manifest V3; only `manifest.json` and `background.js` differ:

**Firefox version:**
- `background.scripts` (event page) instead of a service worker
- `browser_specific_settings.gecko` block (add-on ID, minimum Firefox version, data-collection declaration)
- `background.js` uses the promise-based `browser.*` API

**Chrome version:**
- `background.service_worker`
- `background.js` uses the callback-based `chrome.*` API

All other files are identical across both browsers!

### Installation Methods Comparison

#### Firefox Installation Methods

| Feature | Signed .xpi (Recommended) | Temporary | Unsigned (Dev Mode) |
|---------|---------------------------|-----------|---------------------|
| Persists after restart | ✅ | ❌ | ✅ |
| Requires dev mode | ❌ | ❌ | ✅ |
| Easy to install | ✅ | ✅ | ⚠️ |
| Mozilla-signed | ✅ | N/A | ❌ |
| Recommended for | General use | Development/testing | Advanced development |

#### Chrome Installation Methods

| Feature | From Releases | From Source |
|---------|---------------|-------------|
| Persists after restart | ✅ | ✅ |
| Requires dev mode | ✅ | ✅ |
| Easy to install | ✅ | ✅ |
| Recommended for | General use | Development |

---

## Using Both Browsers

The repository includes separate folders for Chrome and Firefox, so you can easily use both:
- Use the `chrome/` folder for Chrome installation
- Use the `firefox/` folder for Firefox installation

Both folders are complete, standalone extensions with no need to switch files!

---

## Additional Resources

### Chrome
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/intro/)

### Firefox
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions API Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Temporary Installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)

---

## Getting Help

If you encounter issues:

1. Check the browser console for errors:
   - **Chrome**: Right-click on page → Inspect → Console tab
   - **Firefox**: Ctrl+Shift+J (Cmd+Option+J on Mac)
2. Verify you're using the correct folder (`chrome/` or `firefox/`)
3. Make sure your browser version is up to date
4. Check the [Troubleshooting](#troubleshooting) section above
5. Open an issue on GitHub with:
   - Browser name and version
   - Error messages from console
   - Steps to reproduce the problem

---

**Note**: This extension is not officially affiliated with DeepSeek. It's a community tool that uses the web interface's API endpoints.
