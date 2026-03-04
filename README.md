# DeepSeek Exporter

A browser extension for Chrome and Firefox that allows you to export your DeepSeek chats in various formats with support for browsing, sorting, and bulk exports.

## Features

- 📥 **Export Individual Conversations** - Export any conversation directly from DeepSeek
- 📚 **Bulk Export** - Export all or filtered conversations as a ZIP file
- 🔍 **Browse & Search** - View all your conversations in a searchable table
- 🔀 **Sort Conversations** - Sort by name, creation date, and recently updated
- 🌳 **Branch-Aware Export** - Correctly handles conversation branches
- 📝 **Multiple Formats** - JSON (full data), Markdown, or Plain Text
- 🗂️ **ZIP Archives** - Bulk exports create organized ZIP files with all of your chats
- 🏷️ **Metadata Options** - Include or exclude timestamps, ids, and other metadata
- ☀️  **Light/Dark Mode** - Toggle between color schemes

---
### Quick Installation (Recommended)
The simplest way to install DeepSeek Exporter and receive automatic updates is through your browser's official Extensions page.

#### Chrome and Chromium-based browsers
Available on the [Chrome Web Store] —**Coming Soon!**

#### Firefox
Available as a [Firefox extension] —**Coming Soon!**

---
### Manual Installation

#### Chrome and Chromium-based browsers
1. Download the `deepseek-exporter-chrome-vX.X.X.zip` from the [Releases page](https://github.com/agoramachina/deepseek-exporter/releases)
2. Extract the zip into a safe folder (this will be the permanent location - don't move or delete it)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in top right)
5. Click **Load unpacked** and select the extracted `deepseek-exporter-chrome` folder

#### Firefox
1. Download the latest `.xpi` file from the [Releases page](https://github.com/agoramachina/deepseek-exporter/releases)
2. Drag and drop the `.xpi` file into Firefox
3. Click **Add** when Firefox asks for permission

---
### Usage

#### Export Current Chat
1. Navigate to any chat on DeepSeek's webUI
2. Click the extension icon
3. Choose your export format and metadata preferences
4. Click "Export Current Chat"

#### Browse All Chats
1. Click the extension icon
2. Click "Browse All Chats" (green button)
3. In the browse page, you can:
   - Search conversations by name
   - Sort by date or name
   - Export individual or multiple conversations
   - Export all filtered conversations as ZIP
   
#### Bulk Export
1. In the browse page, select your format and filters
2. Click "Export All"
3. A progress dialog will show the export status
4. Once complete, a ZIP file will download containing all conversations

---
### Export Formats

#### JSON
- Complete data including all branches and metadata
- Best for data preservation and programmatic use
- Includes all message versions and conversation branches

#### Markdown
- Human-readable format with formatting
- Shows only the current conversation branch
- Includes optional metadata (timestamps, model info)
- Great for documentation or sharing

#### Plain Text
- Simple format following Claude's prompt style
- Uses "User:" and "Claude:" prefixes
- Shows only the current conversation branch
- Ideal for copying into other LLMs or text editors

#### PDF
- Easy to read format
- Ideal for printing
- Coming Soon!

---
### Known Limitations

- Plaintext and markdown formats only export the currently selected branch in conversations with multiple branches
- Large bulk exports may take several minutes
- Rate limiting: The extension processes conversations in small batches to avoid overwhelming the API

---
### Privacy & Security

- **Local Processing**: All data processing happens in your browser
- **No External Servers**: The extension doesn't send data anywhere
- **Your Authentication**: Uses your existing Claude.ai session
- **Open Source**: You can review all code before installation

---
### Contributing

Feel free to submit issues or pull requests if you find bugs or have suggestions for improvements!

---
### Acknowledgments

- **Claude Exporter**: Ported from [agoramachina/claude-exporter](https://github.com/agoramachina/claude-exporter)
- **Original Project**: Original exporter forked from [socketteer/Claude-Conversation-Exporter](https://github.com/socketteer/Claude-Conversation-Exporter)
- **Code Development**: Written in collaboration with Claude Opus 4.6
- **ZIP Library**: Uses [JSZip](https://stuk.github.io/jszip/) for creating ZIP archives

---