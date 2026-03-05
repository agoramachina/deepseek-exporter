// Handle extension installation
browser.runtime.onInstalled.addListener(() => {
  console.log('DeepSeek Chat Exporter installed');
});

// Inject content script into already-open DeepSeek tabs when extension is installed/updated
browser.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await browser.tabs.query({ url: 'https://chat.deepseek.com/a/chat/s/*' });
    for (const tab of tabs) {
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['jszip.min.js', 'utils.js', 'content.js']
        });
      } catch (err) {
        console.log('Could not inject into tab', tab.id, err);
      }
    }
  } catch (err) {
    console.log('Could not query tabs', err);
  }
});

// Handle messages from popup when content script might not be injected
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'ensureContentScript') {
    return browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]) {
        await browser.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['jszip.min.js', 'utils.js', 'content.js']
        });
      }
      return { success: true };
    });
  }
});
