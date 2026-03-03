// Shared utility functions for DeepSeek Exporter

// Helper function to reconstruct the current branch from the message tree
function getCurrentBranch(data) {
  if (!data.chat_messages || !data.chat_session) {
    return [];
  }

  const leafId = data.chat_session.current_message_id;

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

    if (includeThinking && message.thinking_content) {
      markdown += `### Thinking\n\`\`\`\`\n${message.thinking_content}\n\`\`\`\`\n\n`;
    }

    if (message.content) {
      markdown += `${message.content}\n\n`;
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

    if (includeThinking && message.thinking_content) {
      text += `[Thinking]\n${message.thinking_content}\n[End Thinking]\n\n`;
    }

    text += `${senderLabel}: ${message.content || ''}\n\n`;
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
