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
async function apiFetch(url, timeoutMs = 30000) {
  const token = getAuthToken();
  if (!token) throw new Error('Not logged in to DeepSeek. Please log in and try again.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const json = await response.json();
    if (json.code !== 0 || json.data?.biz_code !== 0) {
      throw new Error(`API error: ${json.msg || json.data?.biz_msg || 'Unknown error'}`);
    }

    return json.data.biz_data;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch full message history for a single conversation
async function fetchConversation(sessionId) {
  return apiFetch(`https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}&cache_version=0`);
}

// Fetch all conversations, paginating via lte_cursor if needed
async function fetchAllConversations() {
  const sessions = [];
  const seenIds = new Set();
  let url = 'https://chat.deepseek.com/api/v0/chat_session/fetch_page?lte_cursor.pinned=false';
  let page = 0;
  const MAX_PAGES = 500;

  while (page < MAX_PAGES) {
    const bizData = await apiFetch(url);
    const pageItems = bizData.chat_sessions || [];

    let newCount = 0;
    for (const item of pageItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        sessions.push(item);
        newCount++;
      }
    }

    chrome.storage.local.set({ deepseekLoadProgress: sessions.length });

    if (!bizData.has_more || pageItems.length === 0 || newCount === 0) break;

    const last = pageItems[pageItems.length - 1];
    url = `https://chat.deepseek.com/api/v0/chat_session/fetch_page?lte_cursor.pinned=false&lte_cursor.updated_at=${last.updated_at}`;
    page++;
  }

  console.log(`DeepSeek Exporter: fetched ${sessions.length} conversations total`);
  return sessions;
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

        // Fetch each full conversation and package as a ZIP
        const zip = new JSZip();
        let count = 0;
        const errors = [];
        const includeThinking = request.includeThinking !== false;
        const ext = request.format === 'markdown' ? 'md' : request.format === 'json' ? 'json' : 'txt';

        for (const session of sessions) {
          try {
            console.log(`Fetching conversation ${count + 1}/${sessions.length}: ${session.title}`);
            const data = await fetchConversation(session.id);
            const filename = (session.title || session.id).replace(/[<>:"/\\|?*]/g, '_');

            let content;
            if (request.format === 'markdown') {
              content = convertToMarkdown(data, request.includeMetadata, session.id, includeThinking);
            } else if (request.format === 'json') {
              content = JSON.stringify(data, null, 2);
            } else {
              content = convertToText(data, request.includeMetadata, includeThinking);
            }
            zip.file(`${filename}.${ext}`, content);

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
            warnings: `Exported ${count}/${sessions.length} chats. Some failed: ${errors.join('; ')}`
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
        chrome.storage.local.set({ deepseekSessionList: sessions }, () => {
          sendResponse({ success: true, count: sessions.length });
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (request.action === 'fetchConversationData') {
    fetchConversation(request.sessionId)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

} // End of double-injection guard
