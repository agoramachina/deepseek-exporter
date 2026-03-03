// Prevent double-injection of content script
if (window.deepseekExporterContentScriptLoaded) {
  console.log('DeepSeek Exporter content script already loaded, skipping re-injection');
} else {
  window.deepseekExporterContentScriptLoaded = true;

// Helper to format datetime for filenames (e.g. 20250301-143045)
function getLocalDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Get auth token from localStorage
function getAuthToken() {
  const userToken = localStorage.getItem('userToken');
  if (!userToken) return null;
  try {
    return JSON.parse(userToken).value;
  } catch (e) {
    return null;
  }
}

// Authenticated fetch — unwraps response.data.biz_data or throws
async function apiFetch(url) {
  const token = getAuthToken();
  if (!token) throw new Error('Not logged in to DeepSeek. Please log in and try again.');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0 || json.data?.biz_code !== 0) {
    throw new Error(`API error: ${json.msg || json.data?.biz_msg || 'Unknown error'}`);
  }

  return json.data.biz_data;
}

// Fetch full message history for a single conversation
async function fetchConversation(sessionId) {
  return apiFetch(`https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}&cache_version=0`);
}

// Fetch conversation list (single page for now — pagination TBD)
async function fetchAllConversations() {
  const bizData = await apiFetch('https://chat.deepseek.com/api/v0/chat_session/fetch_page');
  if (bizData.has_more) {
    console.warn('DeepSeek Exporter: there are more conversations beyond the first page — pagination not yet implemented.');
  }
  return bizData.chat_sessions;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'exportConversation') {
    console.log('Export conversation request received:', request);

    fetchConversation(request.conversationId)
      .then(data => {
        if (!data || !data.chat_messages || !Array.isArray(data.chat_messages)) {
          throw new Error('Invalid conversation data. Please refresh the page and try again.');
        }

        const title = (data.chat_session?.title || request.conversationId).replace(/[<>:"/\\|?*]/g, '_');
        const includeThinking = request.includeThinking !== false;
        let content, filename, type;

        switch (request.format) {
          case 'markdown':
            content = convertToMarkdown(data, request.includeMetadata, request.conversationId, includeThinking);
            filename = `${title}.md`;
            type = 'text/markdown';
            break;
          case 'text':
            content = convertToText(data, request.includeMetadata, includeThinking);
            filename = `${title}.txt`;
            type = 'text/plain';
            break;
          default: // json
            content = JSON.stringify(data, null, 2);
            filename = `${title}.json`;
            type = 'application/json';
        }

        downloadFile(content, filename, type);
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Export conversation error:', error);
        sendResponse({ success: false, error: error.message, details: error.stack });
      });

    return true;
  }

  if (request.action === 'exportAllConversations') {
    console.log('Export all conversations request received:', request);

    fetchAllConversations()
      .then(async sessions => {
        console.log(`Fetched ${sessions.length} conversations`);

        if (request.format === 'json') {
          // For JSON, export the session list as-is (summary only — no full message fetch)
          const datetime = getLocalDateTimeString();
          downloadFile(JSON.stringify(sessions, null, 2), `deepseek-exports-${datetime}.json`);
          sendResponse({ success: true, count: sessions.length });
          return;
        }

        // For markdown/text, fetch each full conversation and package as a ZIP
        const zip = new JSZip();
        let count = 0;
        const errors = [];

        for (const session of sessions) {
          try {
            console.log(`Fetching conversation ${count + 1}/${sessions.length}: ${session.title}`);
            const data = await fetchConversation(session.id);
            const filename = (session.title || session.id).replace(/[<>:"/\\|?*]/g, '_');

            let content;
            if (request.format === 'markdown') {
              content = convertToMarkdown(data, request.includeMetadata, session.id, true);
              zip.file(`${filename}.md`, content);
            } else {
              content = convertToText(data, request.includeMetadata, true);
              zip.file(`${filename}.txt`, content);
            }

            count++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            console.error(`Failed to export conversation ${session.id}:`, error);
            errors.push(`${session.title || session.id}: ${error.message}`);
          }
        }

        const datetime = getLocalDateTimeString();
        zip.generateAsync({ type: 'blob' }).then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `deepseek-exports-${datetime}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });

        if (errors.length > 0) {
          sendResponse({
            success: true,
            count,
            warnings: `Exported ${count}/${sessions.length} conversations. Some failed: ${errors.join('; ')}`
          });
        } else {
          sendResponse({ success: true, count });
        }
      })
      .catch(error => {
        console.error('Export all conversations error:', error);
        sendResponse({ success: false, error: error.message, details: error.stack });
      });

    return true;
  }

  if (request.action === 'loadConversations') {
    fetchAllConversations()
      .then(sessions => {
        sendResponse({ success: true, conversations: sessions });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

} // End of double-injection guard
