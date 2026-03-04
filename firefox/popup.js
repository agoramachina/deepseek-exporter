// Get current chat ID from URL
async function getCurrentConversationId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  const match = url.pathname.match(/\/a\/chat\/s\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;

  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = '';
    }, 3000);
  }
}

// Handle checkbox dependencies on popup load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('header-version').textContent = 'v' + chrome.runtime.getManifest().version;
  const formatSelect = document.getElementById('format');
  const includeChatsCheckbox = document.getElementById('includeChats');
  const includeThinkingCheckbox = document.getElementById('includeThinking');
  const includeMetadataCheckbox = document.getElementById('includeMetadata');

  function updateCheckboxStates() {
    const isJson = formatSelect.value === 'json';
    const chatsEnabled = !isJson && includeChatsCheckbox.checked;

    // Lock all checkboxes checked when JSON is selected
    includeChatsCheckbox.disabled = isJson;
    includeThinkingCheckbox.disabled = isJson || !chatsEnabled;
    includeMetadataCheckbox.disabled = isJson || !chatsEnabled;

    if (isJson) {
      includeChatsCheckbox.checked = true;
      includeThinkingCheckbox.checked = true;
      includeMetadataCheckbox.checked = true;
    } else if (!chatsEnabled) {
      includeThinkingCheckbox.checked = false;
      includeMetadataCheckbox.checked = false;
    }
  }

  formatSelect.addEventListener('change', updateCheckboxStates);
  includeChatsCheckbox.addEventListener('change', updateCheckboxStates);
  updateCheckboxStates(); // Initialize on load
});

// Export current chat
document.getElementById('exportCurrent').addEventListener('click', async () => {
  const button = document.getElementById('exportCurrent');
  button.disabled = true;
  showStatus('Fetching chat...', 'info');

  try {
    const conversationId = await getCurrentConversationId();

    if (!conversationId) {
      throw new Error('Could not detect chat ID. Make sure you are on a DeepSeek chat page.');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('chat.deepseek.com')) {
      throw new Error('Please navigate to a DeepSeek chat page first.');
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'exportConversation',
      conversationId,
      format: document.getElementById('format').value,
      includeChats: document.getElementById('includeChats').checked,
      includeThinking: document.getElementById('includeThinking').checked,
      includeMetadata: document.getElementById('includeMetadata').checked,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        button.disabled = false;
        return;
      }

      if (response?.success) {
        showStatus('Chat exported successfully!', 'success');
      } else {
        const errorMsg = response?.error || 'Export failed';
        console.error('Export failed:', errorMsg, response?.details);
        showStatus(errorMsg, 'error');
      }
      button.disabled = false;
    });
  } catch (error) {
    showStatus(error.message, 'error');
    button.disabled = false;
  }
});

// Browse chats
document.getElementById('browsechats').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('browse.html') });
});

// Export all chats
document.getElementById('exportAll').addEventListener('click', async () => {
  const button = document.getElementById('exportAll');
  button.disabled = true;
  showStatus('Fetching all chats...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, {
      action: 'exportAllConversations',
      format: document.getElementById('format').value,
      includeChats: document.getElementById('includeChats').checked,
      includeThinking: document.getElementById('includeThinking').checked,
      includeMetadata: document.getElementById('includeMetadata').checked,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        button.disabled = false;
        return;
      }

      if (response?.success) {
        if (response.warnings) {
          showStatus(response.warnings, 'info');
        } else {
          showStatus(`Exported ${response.count} chats!`, 'success');
        }
      } else {
        const errorMsg = response?.error || 'Export failed';
        console.error('Export failed:', errorMsg, response?.details);
        showStatus(errorMsg, 'error');
      }
      button.disabled = false;
    });
  } catch (error) {
    showStatus(error.message, 'error');
    button.disabled = false;
  }
});
