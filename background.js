// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('DeepSeek Chat Exporter installed');
});

// Inject content script into already-open DeepSeek tabs when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: 'https://chat.deepseek.com/a/chat/s/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['jszip.min.js', 'utils.js', 'content.js']
      }).catch(err => console.log('Could not inject into tab', tab.id, err));
    });
  });
});

// Handle messages from popup when content script might not be injected
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ensureContentScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['jszip.min.js', 'utils.js', 'content.js']
        }, () => {
          sendResponse({ success: true });
        });
      }
    });
    return true;
  }
});