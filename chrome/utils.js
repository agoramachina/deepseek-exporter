// Shared utility functions for DeepSeek Exporter

// Fragment types used by the current DeepSeek API message structure
const FRAGMENT_RESPONSE_TYPES = ['RESPONSE', 'TEMPLATE_RESPONSE'];
const FRAGMENT_THINK_TYPE = 'THINK';

// Extract the main text content of a message.
// Older API responses used message.content; the current ones use message.fragments.
function getMessageText(message) {
  if (!message) return '';
  if (typeof message.content === 'string' && message.content.trim()) {
    return message.content;
  }
  if (Array.isArray(message.fragments)) {
    const types = message.role === 'USER' ? ['REQUEST'] : FRAGMENT_RESPONSE_TYPES;
    return message.fragments
      .filter(f => types.includes(f.type) && typeof f.content === 'string' && f.content.trim())
      .map(f => f.content)
      .join('\n\n');
  }
  return '';
}

// Extract the thinking content of a message.
// Older API responses used message.thinking_content; the current ones use fragments.
function getThinkingText(message) {
  if (!message) return '';
  if (typeof message.thinking_content === 'string' && message.thinking_content.trim()) {
    return message.thinking_content;
  }
  if (Array.isArray(message.fragments)) {
    return message.fragments
      .filter(f => f.type === FRAGMENT_THINK_TYPE && typeof f.content === 'string' && f.content.trim())
      .map(f => f.content)
      .join('\n\n');
  }
  return '';
}

// Helper function to reconstruct the current branch from the message tree
function getCurrentBranch(data) {
  if (!data.chat_messages || !data.chat_session) {
    return [];
  }

  const leafId = data.chat_session.current_message_id ||
    (data.chat_messages.length > 0 ? data.chat_messages[data.chat_messages.length - 1].message_id : null);

  // Create a map of message_id to message for quick lookup
  const messageMap = new Map();
  data.chat_messages.forEach(msg => {
    messageMap.set(msg.message_id, msg);
  });

  // Trace back from the current leaf to the root
  const branch = [];
  let currentId = leafId;

  while (currentId && messageMap.has(currentId)) {
    const message = messageMap.get(currentId);
    branch.unshift(message);
    currentId = message.parent_id;
  }

  return branch;
}

// Convert to markdown format
function convertToMarkdown(data, includeMetadata, sessionId = null, includeThinking = true) {
  const session = data.chat_session;
  let markdown = `# ${session.title || 'Untitled Chat'}\n\n`;

  if (includeMetadata) {
    markdown += `**Created:** ${new Date(session.inserted_at * 1000).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(session.updated_at * 1000).toLocaleString()}\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
    if (sessionId) {
      markdown += `**Link:** [https://chat.deepseek.com/a/chat/s/${sessionId}](https://chat.deepseek.com/a/chat/s/${sessionId})\n`;
    }
    markdown += `\n---\n\n`;
  }

  const branchMessages = getCurrentBranch(data);

  for (const message of branchMessages) {
    const sender = message.role === 'USER' ? '## User' : '## DeepSeek';
    markdown += `${sender}\n`;

    if (includeMetadata && message.inserted_at) {
      markdown += `**${new Date(message.inserted_at * 1000).toISOString()}**\n`;
    }
    markdown += `\n`;

    const thinking = getThinkingText(message);
    if (includeThinking && thinking) {
      markdown += `### Thinking\n\`\`\`\`\n${thinking}\n\`\`\`\`\n\n`;
    }

    const content = getMessageText(message);
    if (content) {
      markdown += `${content}\n\n`;
    }
  }

  return markdown;
}

// Convert to plain text
function convertToText(data, includeMetadata, includeThinking = true) {
  const session = data.chat_session;
  let text = '';

  if (includeMetadata) {
    text += `${session.title || 'Untitled Chat'}\n`;
    text += `Created: ${new Date(session.inserted_at * 1000).toLocaleString()}\n`;
    text += `Updated: ${new Date(session.updated_at * 1000).toLocaleString()}\n`;
    text += '---\n\n';
  }

  const branchMessages = getCurrentBranch(data);

  branchMessages.forEach((message) => {
    const senderLabel = message.role === 'USER' ? 'User' : 'DeepSeek';

    const thinking = getThinkingText(message);
    if (includeThinking && thinking) {
      text += `[Thinking]\n${thinking}\n[End Thinking]\n\n`;
    }

    text += `${senderLabel}: ${getMessageText(message)}\n\n`;
  });

  return text.trim();
}

// Download file utility
function downloadFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
