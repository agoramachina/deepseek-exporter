import { describe, it, expect } from 'vitest';
import utils from '../chrome/utils.js';

const {
  getCurrentBranch,
  convertToMarkdown,
  convertToText,
  sanitizeFilename,
  uniqueFilename,
  getLocalDateTimeString,
} = utils;

// Minimal DeepSeek history_messages payload: a root exchange, then two
// alternative assistant replies (branches). current_message_id selects the leaf.
function makeConversation({ currentId = 4, thinking = true } = {}) {
  return {
    chat_session: {
      id: 'session-1',
      title: 'Test Chat',
      inserted_at: 1735689600, // 2025-01-01T00:00:00Z
      updated_at: 1735693200,
      current_message_id: currentId,
    },
    chat_messages: [
      { message_id: 1, parent_id: null, role: 'USER', content: 'Hello', inserted_at: 1735689600 },
      {
        message_id: 2, parent_id: 1, role: 'ASSISTANT', content: 'Hi there',
        thinking_content: thinking ? 'User said hello' : null, inserted_at: 1735689610,
      },
      { message_id: 3, parent_id: 2, role: 'USER', content: 'Pick a number', inserted_at: 1735689620 },
      { message_id: 4, parent_id: 3, role: 'ASSISTANT', content: 'Seven', inserted_at: 1735689630 },
      { message_id: 5, parent_id: 3, role: 'ASSISTANT', content: 'Forty-two', inserted_at: 1735689640 },
    ],
  };
}

describe('getCurrentBranch', () => {
  it('walks from current_message_id back to the root, in order', () => {
    const ids = getCurrentBranch(makeConversation()).map(m => m.message_id);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('follows the selected branch when siblings exist', () => {
    const contents = getCurrentBranch(makeConversation({ currentId: 5 })).map(m => m.content);
    expect(contents).toEqual(['Hello', 'Hi there', 'Pick a number', 'Forty-two']);
  });

  it('returns [] when session or messages are missing', () => {
    expect(getCurrentBranch({})).toEqual([]);
    expect(getCurrentBranch({ chat_session: {} })).toEqual([]);
  });

  it('stops cleanly when a parent_id points at a missing message', () => {
    const data = makeConversation();
    data.chat_messages = data.chat_messages.filter(m => m.message_id !== 1);
    expect(getCurrentBranch(data).map(m => m.message_id)).toEqual([2, 3, 4]);
  });
});

describe('convertToMarkdown', () => {
  it('renders title, User/DeepSeek headers, and only the current branch', () => {
    const md = convertToMarkdown(makeConversation(), false);
    expect(md.startsWith('# Test Chat\n')).toBe(true);
    expect(md).toContain('## User\n');
    expect(md).toContain('## DeepSeek\n');
    expect(md).toContain('Seven');
    expect(md).not.toContain('Forty-two');
  });

  it('includes thinking in a quadruple-backtick block by default', () => {
    const md = convertToMarkdown(makeConversation(), false);
    expect(md).toContain('### Thinking\n````\nUser said hello\n````');
  });

  it('omits thinking when includeThinking is false', () => {
    const md = convertToMarkdown(makeConversation(), false, null, false);
    expect(md).not.toContain('Thinking');
    expect(md).not.toContain('User said hello');
  });

  it('includes metadata and a chat link only when requested', () => {
    const withMeta = convertToMarkdown(makeConversation(), true, 'session-1');
    expect(withMeta).toContain('**Created:**');
    expect(withMeta).toContain('**Link:** [https://chat.deepseek.com/a/chat/s/session-1]');

    const without = convertToMarkdown(makeConversation(), false, 'session-1');
    expect(without).not.toContain('**Created:**');
    expect(without).not.toContain('**Link:**');
  });

  it('falls back to "Untitled Chat" when the session has no title', () => {
    const data = makeConversation();
    data.chat_session.title = '';
    expect(convertToMarkdown(data, false).startsWith('# Untitled Chat\n')).toBe(true);
  });
});

describe('convertToText', () => {
  it('uses "User:" and "DeepSeek:" prefixes', () => {
    const text = convertToText(makeConversation(), false, false);
    expect(text).toBe('User: Hello\n\nDeepSeek: Hi there\n\nUser: Pick a number\n\nDeepSeek: Seven');
  });

  it('wraps thinking in [Thinking] markers when included', () => {
    const text = convertToText(makeConversation(), false, true);
    expect(text).toContain('[Thinking]\nUser said hello\n[End Thinking]');
  });

  it('adds a title/date header only with metadata', () => {
    expect(convertToText(makeConversation(), true, false).startsWith('Test Chat\nCreated: ')).toBe(true);
    expect(convertToText(makeConversation(), false, false).startsWith('User: ')).toBe(true);
  });
});

// Regression coverage for v1.4.2: bulk ZIP exports silently overwrote chats
// that shared a title (zip.file() replaces same-named entries).
describe('sanitizeFilename', () => {
  it('replaces filesystem-reserved characters', () => {
    expect(sanitizeFilename('A/B: testing?')).toBe('A_B_ testing_');
  });

  it('replaces control characters and collapses whitespace', () => {
    expect(sanitizeFilename('line\nbreak\ttab')).toBe('line_break_tab');
    expect(sanitizeFilename('  lots   of   space  ')).toBe('lots of space');
  });

  it('strips trailing dots and spaces (invalid on Windows)', () => {
    expect(sanitizeFilename('trailing...  ')).toBe('trailing');
  });

  it('falls back to "Untitled Chat" for null, empty, or whitespace-only names', () => {
    expect(sanitizeFilename(null)).toBe('Untitled Chat');
    expect(sanitizeFilename('')).toBe('Untitled Chat');
    expect(sanitizeFilename('   ')).toBe('Untitled Chat');
  });

  it('caps length at 150 characters', () => {
    expect(sanitizeFilename('x'.repeat(300))).toHaveLength(150);
  });
});

describe('uniqueFilename', () => {
  it('suffixes duplicates with (2), (3), ...', () => {
    const used = new Set();
    expect(uniqueFilename('New chat', 'md', used)).toBe('New chat.md');
    expect(uniqueFilename('New chat', 'md', used)).toBe('New chat (2).md');
    expect(uniqueFilename('New chat', 'md', used)).toBe('New chat (3).md');
  });

  it('treats names case-insensitively', () => {
    const used = new Set();
    uniqueFilename('Notes', 'md', used);
    expect(uniqueFilename('notes', 'md', used)).toBe('notes (2).md');
  });

  it('does not collide with a real title that looks like a suffix', () => {
    const used = new Set();
    uniqueFilename('Chat', 'md', used);
    uniqueFilename('Chat', 'md', used); // -> "Chat (2).md"
    expect(uniqueFilename('Chat (2)', 'md', used)).toBe('Chat (2) (2).md');
  });
});

describe('getLocalDateTimeString', () => {
  it('formats as YYYYMMDD-HHMMSS', () => {
    expect(getLocalDateTimeString()).toMatch(/^\d{8}-\d{6}$/);
  });
});
