// State
let allConversations = [];
let filteredConversations = [];
let sortStack = [{ field: 'updated', direction: 'desc' }];
let selectedConversations = new Set();
let lastCheckedIndex = null;
let createdDatesCache = {}; // { [sessionId]: insertedAt (unix timestamp) }

// ---- Created date cache ----

function loadCreatedDatesCache() {
  return new Promise(resolve => {
    chrome.storage.local.get('deepseekCreatedDates', (result) => {
      createdDatesCache = result.deepseekCreatedDates || {};
      resolve();
    });
  });
}

function saveCreatedDate(sessionId, insertedAt) {
  if (!insertedAt || createdDatesCache[sessionId]) return;
  createdDatesCache[sessionId] = insertedAt;
  chrome.storage.local.set({ deepseekCreatedDates: createdDatesCache });
  const cell = document.querySelector(`tr[data-id="${sessionId}"] .date-created`);
  if (cell) cell.textContent = formatDate(insertedAt);
}

// ---- Theme ----

function initTheme() {
  const saved = localStorage.getItem('deepseek-exporter-theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved, sunIcon, moonIcon);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateThemeIcon(prefersDark ? 'dark' : 'light', sunIcon, moonIcon);
  }
}

function updateThemeIcon(theme, sunIcon, moonIcon) {
  if (theme === 'dark') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const newTheme = current ? (current === 'dark' ? 'light' : 'dark') : (prefersDark ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('deepseek-exporter-theme', newTheme);
  updateThemeIcon(newTheme, sunIcon, moonIcon);
}

// ---- Messaging ----

function sendMessageToDeepSeekTab(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ url: 'https://chat.deepseek.com/*' }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!tabs || tabs.length === 0) {
        reject(new Error('Please open a DeepSeek tab first, then reload this page.'));
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Request failed'));
        }
      });
    });
  });
}

// ---- Load conversations ----

async function loadConversations() {
  try {
    await loadCreatedDatesCache();
    const response = await sendMessageToDeepSeekTab('loadConversations');
    allConversations = response.conversations;
    applyFiltersAndSort();
  } catch (error) {
    showError(`Failed to load chats: ${error.message}`);
  }
}

// ---- Filtering / Sorting / Display ----

function applyFiltersAndSort() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  filteredConversations = allConversations.filter(session => {
    return !searchTerm || session.title?.toLowerCase().includes(searchTerm);
  });

  sortConversations();
  lastCheckedIndex = null;
  displayConversations();
  updateStats();
}

function sortConversations() {
  filteredConversations.sort((a, b) => {
    for (const { field, direction } of sortStack) {
      let aVal, bVal;
      if (field === 'title') {
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
      } else { // updated
        aVal = a.updated_at;
        bVal = b.updated_at;
      }
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

function handleColumnSort(field) {
  const idx = sortStack.findIndex(s => s.field === field);
  if (idx === 0) {
    sortStack[0].direction = sortStack[0].direction === 'asc' ? 'desc' : 'asc';
  } else if (idx > 0) {
    const [item] = sortStack.splice(idx, 1);
    sortStack.unshift(item);
  } else {
    sortStack.unshift({ field, direction: 'asc' });
  }
  applyFiltersAndSort();
}

function getSortIndicator(field) {
  if (sortStack[0]?.field !== field) return '';
  return ` <span class="sort-indicator">${sortStack[0].direction === 'asc' ? '↑' : '↓'}</span>`;
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function displayConversations() {
  const tableContent = document.getElementById('tableContent');

  if (filteredConversations.length === 0) {
    tableContent.innerHTML = '<div class="no-results">No chats found</div>';
    document.getElementById('exportAllBtn').disabled = true;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th class="sortable" data-sort="title">Title${getSortIndicator('title')}</th>
          <th>Created</th>
          <th class="sortable" data-sort="updated">Updated${getSortIndicator('updated')}</th>
          <th>Actions</th>
          <th class="checkbox-col">
            <input type="checkbox" id="selectAll" ${selectedConversations.size > 0 ? 'checked' : ''}>
          </th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredConversations.forEach((session, index) => {
    const updatedDate = formatDate(session.updated_at);
    const pinIcon = session.pinned ? '<span class="pin-icon">📌</span>' : '';
    html += `
      <tr data-id="${escapeHtml(session.id)}">
        <td>
          <div class="conv-title">
            ${pinIcon}<a href="https://chat.deepseek.com/a/chat/s/${escapeHtml(session.id)}" target="_blank" title="${escapeHtml(session.title)}">
              ${escapeHtml(session.title || session.id)}
            </a>
          </div>
        </td>
        <td class="date date-created">${createdDatesCache[session.id] ? escapeHtml(formatDate(createdDatesCache[session.id])) : '-'}</td>
        <td class="date">${escapeHtml(updatedDate)}</td>
        <td>
          <div class="actions">
            <button class="btn-small btn-export" data-id="${escapeHtml(session.id)}" data-title="${escapeHtml(session.title || session.id)}">Export</button>
            <button class="btn-small btn-view" data-id="${escapeHtml(session.id)}">View</button>
          </div>
        </td>
        <td class="checkbox-col">
          <input type="checkbox" class="conversation-checkbox" data-id="${escapeHtml(session.id)}" data-index="${index}" ${selectedConversations.has(session.id) ? 'checked' : ''}>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tableContent.innerHTML = html;

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const title = e.target.dataset.title;
      exportSingle(id, title, e.target);
    });
  });

  document.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      window.open(`https://chat.deepseek.com/a/chat/s/${e.target.dataset.id}`, '_blank');
    });
  });

  document.querySelectorAll('.conversation-checkbox').forEach(cb => {
    cb.addEventListener('click', handleCheckboxChange);
  });

  const selectAll = document.getElementById('selectAll');
  if (selectAll) selectAll.addEventListener('click', handleSelectAll);

  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => handleColumnSort(th.dataset.sort));
  });

  updateExportButtonText();
  document.getElementById('exportAllBtn').disabled = false;
}

// ---- Checkbox handling ----

function handleCheckboxChange(e) {
  const id = e.target.dataset.id;
  const currentIndex = parseInt(e.target.dataset.index);

  if (e.shiftKey && lastCheckedIndex !== null) {
    const start = Math.min(lastCheckedIndex, currentIndex);
    const end = Math.max(lastCheckedIndex, currentIndex);
    const checkboxes = document.querySelectorAll('.conversation-checkbox');
    for (let i = start; i <= end; i++) {
      const cb = checkboxes[i];
      if (cb) {
        cb.checked = e.target.checked;
        e.target.checked ? selectedConversations.add(cb.dataset.id) : selectedConversations.delete(cb.dataset.id);
      }
    }
  } else {
    e.target.checked ? selectedConversations.add(id) : selectedConversations.delete(id);
  }

  lastCheckedIndex = currentIndex;
  updateExportButtonText();
  updateSelectAllCheckbox();
}

function handleSelectAll(e) {
  document.querySelectorAll('.conversation-checkbox').forEach(cb => {
    cb.checked = e.target.checked;
    e.target.checked ? selectedConversations.add(cb.dataset.id) : selectedConversations.delete(cb.dataset.id);
  });
  lastCheckedIndex = null;
  updateExportButtonText();
}

function updateSelectAllCheckbox() {
  const sa = document.getElementById('selectAll');
  if (sa) sa.checked = selectedConversations.size > 0;
}

function updateExportButtonText() {
  const btn = document.getElementById('exportAllBtn');
  if (!btn) return;
  btn.textContent = selectedConversations.size > 0
    ? `Export Selected (${selectedConversations.size})`
    : 'Export All';
}

// ---- Stats ----

function updateStats() {
  document.getElementById('stats').textContent =
    `Showing ${filteredConversations.length} of ${allConversations.length} chats`;
}

// ---- Export: single ----

async function exportSingle(sessionId, title, button) {
  const format = document.getElementById('exportFormat').value;
  const includeThinking = document.getElementById('includeThinking').checked;
  const includeMetadata = document.getElementById('includeMetadata').checked;

  if (button) button.disabled = true;
  showToast(`Exporting ${title}...`);

  try {
    const response = await sendMessageToDeepSeekTab('fetchConversationData', { sessionId });
    const data = response.data;
    saveCreatedDate(sessionId, data.chat_session?.inserted_at);
    const safeName = (data.chat_session?.title || title || sessionId).replace(/[<>:"/\\|?*]/g, '_');

    let content, filename, type;
    if (format === 'markdown') {
      content = convertToMarkdown(data, includeMetadata, sessionId, includeThinking);
      filename = `${safeName}.md`;
      type = 'text/markdown';
    } else if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename = `${safeName}.json`;
      type = 'application/json';
    } else {
      content = convertToText(data, includeMetadata, includeThinking);
      filename = `${safeName}.txt`;
      type = 'text/plain';
    }

    downloadFile(content, filename, type);
    showToast(`Exported: ${safeName}`);
  } catch (error) {
    showToast(`Failed: ${error.message}`, true);
  } finally {
    if (button) button.disabled = false;
  }
}

// ---- Export: bulk ----

async function exportMultiple() {
  const format = document.getElementById('exportFormat').value;
  const includeThinking = document.getElementById('includeThinking').checked;
  const includeMetadata = document.getElementById('includeMetadata').checked;

  const toExport = selectedConversations.size > 0
    ? filteredConversations.filter(s => selectedConversations.has(s.id))
    : filteredConversations;

  const button = document.getElementById('exportAllBtn');
  button.disabled = true;

  const progressModal = document.getElementById('progressModal');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressStats = document.getElementById('progressStats');
  progressModal.style.display = 'block';

  let cancelled = false;
  document.getElementById('cancelExport').onclick = () => {
    cancelled = true;
    progressText.textContent = 'Cancelling...';
  };

  const zip = new JSZip();
  const ext = format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt';
  const total = toExport.length;
  let completed = 0;
  const errors = [];

  progressText.textContent = `Exporting ${total} chats...`;

  for (const session of toExport) {
    if (cancelled) break;

    try {
      const response = await sendMessageToDeepSeekTab('fetchConversationData', { sessionId: session.id });
      const data = response.data;
      saveCreatedDate(session.id, data.chat_session?.inserted_at);
      const filename = (session.title || session.id).replace(/[<>:"/\\|?*]/g, '_');

      let content;
      if (format === 'markdown') {
        content = convertToMarkdown(data, includeMetadata, session.id, includeThinking);
      } else if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        content = convertToText(data, includeMetadata, includeThinking);
      }
      zip.file(`${filename}.${ext}`, content);
      completed++;
    } catch (error) {
      errors.push(`${session.title || session.id}: ${error.message}`);
    }

    const pct = Math.round((completed + errors.length) / total * 100);
    progressBar.style.width = `${pct}%`;
    progressStats.textContent = `${completed} succeeded, ${errors.length} failed of ${total}`;

    // Small delay to avoid hammering the API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  progressModal.style.display = 'none';
  button.disabled = false;

  if (cancelled) {
    showToast('Export cancelled', true);
    return;
  }

  progressText.textContent = 'Creating ZIP...';
  const now = new Date();
  const datetime = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deepseek-exports-${datetime}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (errors.length > 0) {
    showToast(`Exported ${completed}/${total}. Failed: ${errors.join(', ')}`, true);
  } else {
    showToast(`Successfully exported ${completed} chats!`);
  }
}

// ---- Toast / Error ----

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? '#d32f2f' : 'var(--toast-bg)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showError(message) {
  document.getElementById('tableContent').innerHTML = `<div class="error-msg">${escapeHtml(message)}</div>`;
  document.getElementById('stats').textContent = '';
}

// ---- Checkbox dependency logic (same as popup) ----

function setupExportOptions() {
  const formatSelect = document.getElementById('exportFormat');
  const includeChats = document.getElementById('includeChats');
  const includeThinking = document.getElementById('includeThinking');
  const includeMetadata = document.getElementById('includeMetadata');

  function updateStates() {
    const isJson = formatSelect.value === 'json';
    const chatsEnabled = !isJson && includeChats.checked;

    includeChats.disabled = isJson;
    includeThinking.disabled = isJson || !chatsEnabled;
    includeMetadata.disabled = isJson || !chatsEnabled;

    if (isJson) {
      includeChats.checked = true;
      includeThinking.checked = true;
      includeMetadata.checked = true;
    } else if (!chatsEnabled) {
      includeThinking.checked = false;
      includeMetadata.checked = false;
    }
  }

  formatSelect.addEventListener('change', updateStates);
  includeChats.addEventListener('change', updateStates);
  updateStates();
}

// ---- Init ----

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupExportOptions();
  document.getElementById('header-version').textContent = 'v' + chrome.runtime.getManifest().version;

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    document.getElementById('searchBox').classList.toggle('has-text', !!searchInput.value);
    applyFiltersAndSort();
  });
  document.getElementById('clearSearch').addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('searchBox').classList.remove('has-text');
    applyFiltersAndSort();
  });

  document.getElementById('exportAllBtn').addEventListener('click', exportMultiple);

  loadConversations();
});
