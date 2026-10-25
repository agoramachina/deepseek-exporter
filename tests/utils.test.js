import { describe, it, expect } from 'vitest';
import utils from '../chrome/utils.js';

const {
  getCurrentBranch,
  getMessageContent,
  getMessageThinking,
  convertToMarkdown,
  convertToText,
  sanitizeFilename,
  uniqueFilename,
  getLocalDateTimeString,
  rememberExportFormat,
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

// Regression coverage for PR #9: DeepSeek moved message text out of the flat
// `content` / `thinking_content` fields into a typed `fragments` array, which
// made Markdown and plain-text exports come out empty (JSON was unaffected).
function makeFragmentConversation() {
  return {
    chat_session: { id: 's', title: 'Fragments', inserted_at: 1735689600, updated_at: 1735689600, current_message_id: 2 },
    chat_messages: [
      {
        message_id: 1, parent_id: null, role: 'USER', inserted_at: 1735689600,
        fragments: [{ type: 'REQUEST', content: 'What is 2+2?' }],
      },
      {
        message_id: 2, parent_id: 1, role: 'ASSISTANT', inserted_at: 1735689610,
        fragments: [
          { type: 'SEARCH', content: 'Found 9 web pages', results: [{ url: 'https://example.com' }] },
          { type: 'THINK', content: 'Simple arithmetic.' },
          { type: 'RESPONSE', content: 'Four.' },
        ],
      },
    ],
  };
}

describe('fragment-format messages (PR #9)', () => {
  const [user, assistant] = makeFragmentConversation().chat_messages;

  it('reads REQUEST for user messages and RESPONSE for assistant messages', () => {
    expect(getMessageContent(user)).toBe('What is 2+2?');
    expect(getMessageContent(assistant)).toBe('Four.');
  });

  it('reads THINK as thinking, and ignores SEARCH fragments', () => {
    expect(getMessageThinking(assistant)).toBe('Simple arithmetic.');
    expect(getMessageContent(assistant)).not.toContain('Found 9 web pages');
  });

  it('joins multiple fragments of the same type', () => {
    const msg = { role: 'ASSISTANT', fragments: [
      { type: 'RESPONSE', content: 'Part one.' },
      { type: 'RESPONSE', content: 'Part two.' },
    ] };
    expect(getMessageContent(msg)).toBe('Part one.\n\nPart two.');
  });

  it('prefers legacy flat fields when present', () => {
    const msg = { role: 'ASSISTANT', content: 'Old', thinking_content: 'Old think',
      fragments: [{ type: 'RESPONSE', content: 'New' }, { type: 'THINK', content: 'New think' }] };
    expect(getMessageContent(msg)).toBe('Old');
    expect(getMessageThinking(msg)).toBe('Old think');
  });

  it('returns empty strings when there is no content at all', () => {
    expect(getMessageContent({ role: 'USER' })).toBe('');
    expect(getMessageThinking({ role: 'ASSISTANT', fragments: [] })).toBe('');
  });

  it('produces non-empty Markdown and plain text', () => {
    const data = makeFragmentConversation();
    const md = convertToMarkdown(data, false);
    expect(md).toContain('What is 2+2?');
    expect(md).toContain('### Thinking\n````\nSimple arithmetic.\n````');
    expect(md).toContain('Four.');

    expect(convertToText(data, false, false)).toBe('User: What is 2+2?\n\nDeepSeek: Four.');
  });
});

// PR #6 / issue #5: the popup and browse page remember the chosen export format
describe('rememberExportFormat', () => {
  function setup(saved) {
    const store = saved === undefined ? {} : { deepseekExportFormat: saved };
    globalThis.chrome = { storage: { local: {
      get: (key, cb) => cb({ [key]: store[key] }),
      set: (obj) => Object.assign(store, obj),
    } } };
    const listeners = {};
    const select = {
      value: 'text',
      options: [{ value: 'json' }, { value: 'markdown' }, { value: 'text' }],
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
    };
    let calls = 0;
    rememberExportFormat(select, () => { calls++; });
    return { store, select, fire: (ev) => listeners[ev](), calls: () => calls };
  }

  it('restores a saved format and initializes once', () => {
    const t = setup('markdown');
    expect(t.select.value).toBe('markdown');
    expect(t.calls()).toBe(1);
  });

  it('keeps the default when nothing is saved', () => {
    expect(setup(undefined).select.value).toBe('text');
  });

  it('ignores a saved value that is no longer an option', () => {
    expect(setup('pdf').select.value).toBe('text');
  });

  it('saves the format on every change and re-runs the state logic', () => {
    const t = setup(undefined);
    t.select.value = 'json';
    t.fire('change');
    expect(t.store.deepseekExportFormat).toBe('json');
    expect(t.calls()).toBe(2);
  });
});
