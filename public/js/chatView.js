/* eslint-disable */

export function isOnChatPage() {
  return Boolean(document.getElementById('chatMessagesArea'));
}

export function getChatDom() {
  return {
    newChatBtn: document.getElementById('newChatBtn'),
    uploadFileBtn: document.getElementById('uploadFileBtn'),
    uploadArea: document.getElementById('chatUploadArea'),
    chatList: document.getElementById('chatHistoryList'),
    chatContent: document.getElementById('chatMessagesArea'),
    chatInputArea: document.getElementById('bottomPanel'),
    messageInput: document.querySelector('#bottomPanel .message-input'),
    sendBtn: document.getElementById('send-message-btn'),
    chatTitle: document.getElementById('chatTitle'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    uploadHistoryList: document.getElementById('uploadHistoryList'),
    conversationTopicsList: document.getElementById('conversationTopicsList'),
    toggleLeftBtn: document.getElementById('toggleLeftSidebar'),
    toggleRightBtn: document.getElementById('toggleRightSidebar'),
    leftSidebar: document.getElementById('leftSidebar'),
    rightSidebar: document.getElementById('rightSidebar'),
    clearAllConversationsBtn: document.getElementById('clearAllConversationsBtn'),
    deleteAllUploadsBtn: document.getElementById('deleteAllUploadsBtn'),
    sidebarFileBtn: document.getElementById('sidebarFileBtn'),
    sidebarFolderBtn: document.getElementById('sidebarFolderBtn'),
    sidebarDocTitle: document.querySelector('.sidebar-doc-title'),
    tocView: document.getElementById('tocView'),
    docsView: document.getElementById('docsView'),
    // RAG bottom panel tab content areas
    ragLangSelect: document.getElementById('ragLangSelect'),
    errorLog: document.getElementById('errorLog'),
    tokenInfo: document.getElementById('tokenInfo'),
    modelInfo: document.getElementById('modelInfo'),
    ragInfo: document.getElementById('ragInfo'),
    usageInfo: document.getElementById('usageInfo'),
    subscriptionInfo: document.getElementById('subscriptionInfo'),
  };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

export function renderChatInterface(dom, file) {
  if (!dom.chatContent) return;
  dom.chatContent.innerHTML = `
    <div class="chat-messages">
      <div class="message received">
        <div class="message-content">
          <div class="message-header">
            <strong>SentReader</strong>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p>I've processed your file "<strong>${file.name}</strong>". What would you like to know about it?</p>
          <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
            <i class="fas fa-file" style="margin-right: 8px;"></i>
            ${file.name} (${formatFileSize(file.size)})
          </div>
        </div>
      </div>
    </div>
  `;
  if (dom.messageInput) dom.messageInput.focus();
}

export function renderMessages(dom, chat) {
  if (!dom.chatContent) return;
  let messagesContainer = document.querySelector('.chat-messages');
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-messages';
    dom.chatContent.innerHTML = '';
    dom.chatContent.appendChild(messagesContainer);
  }
  messagesContainer.innerHTML = '';
  (chat.messages || []).forEach((msg) => {
    const div = document.createElement('div');
    div.className = `message ${msg.type === 'sent' ? 'sent' : 'received'}`;
    div.innerHTML = `
      <div class="message-content">
        <div class="message-header">
          <strong>${msg.type === 'sent' ? 'You' : 'SentReader'}</strong>
          <span class="message-time">${msg.time || ''}</span>
        </div>
        <p>${msg.text || ''}</p>
      </div>
    `;
    messagesContainer.appendChild(div);
  });
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function renderExistingChat(dom, chat) {
  if (!dom.chatContent) return;
  dom.chatContent.innerHTML = `<div class="chat-messages"></div>`;
  const messagesContainer = document.querySelector('.chat-messages');
  if (!messagesContainer) return;

  if (!chat.messages || chat.messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="message received">
        <div class="message-content">
          <div class="message-header">
            <strong>SentReader</strong>
            <span class="message-time">${chat.timestamp || ''}</span>
          </div>
          <p>You previously uploaded a file named "<strong>${chat.name || 'Chat'}</strong>".</p>
          <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
            <i class="fas fa-file" style="margin-right: 8px;"></i>
            ${(chat.name || 'Chat')}${chat.fileSize ? ` (${chat.fileSize})` : ''}
          </div>
        </div>
      </div>
    `;
  } else {
    (chat.messages || []).forEach((msg) => {
      const div = document.createElement('div');
      div.className = `message ${msg.type === 'sent' ? 'sent' : 'received'}`;
      div.innerHTML = `
        <div class="message-content">
          <div class="message-header">
            <strong>${msg.type === 'sent' ? 'You' : 'SentReader'}</strong>
            <span class="message-time">${msg.time || ''}</span>
          </div>
          <p>${msg.text || ''}</p>
        </div>
      `;
      messagesContainer.appendChild(div);
    });
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function renderWelcome(dom) {
  if (!dom.chatContent) return;
  dom.chatContent.innerHTML = `
    <div class="chat-welcome-state">
      <div class="chat-welcome-icon">
        <i class="fas fa-comments"></i>
      </div>
      <h3>No Chats Available</h3>
      <p>Please upload a file to start a new chat. SentReader can process documents, images, and other files to help you analyze and discuss content.</p>
    </div>
    <div class="chat-upload">
      <div class="chat-upload-area" id="chatUploadArea">
        <div class="chat-upload-icon">
          <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h4>Upload a file to start chatting</h4>
        <p>Drag and drop your file here or click to browse</p>
        <button class="upload-file-btn" id="uploadFileBtn">
          <i class="fas fa-upload"></i> Choose File
        </button>
        <div class="supported-file-types">
          <span class="file-type-badge">PDF</span>
          <span class="file-type-badge">DOCX</span>
          <span class="file-type-badge">TXT</span>
          <span class="file-type-badge">JPG/PNG</span>
          <span class="file-type-badge">CSV</span>
        </div>
      </div>
      <div class="hero-img-box">
        <!-- Form content -->
      </div>
    </div>
  `;
}

export function renderChatList(dom, { chats, currentChatId, onSelect, onClear }) {
  if (!dom.chatList) return;
  dom.chatList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.chatList.innerHTML = `<li class="chat-history-item"><i class="fas fa-comment"></i><div><div class="chat-history-name">No chats available</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;

    const displayName = chat.firstUserMessage
      ? chat.firstUserMessage.length > 30
        ? chat.firstUserMessage.substring(0, 30) + '…'
        : chat.firstUserMessage
      : chat.name;

    item.innerHTML = `
      <i class="fas fa-comment"></i>
      <div>
        <div class="chat-history-name">${displayName || 'Chat'}</div>
        <div class="chat-history-time">${chat.timestamp || ''}</div>
      </div>
      <button class="chat-inline-btn chat-clear-btn" type="button" title="Clear conversation">
        Clear
      </button>
    `;

    item.addEventListener('click', () => onSelect(chat));
    const clearBtn = item.querySelector('.chat-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClear(chat);
      });
    }
    dom.chatList.appendChild(item);
  });
}

export function renderUploadHistory(dom, { chats, currentChatId, onSelect, onDelete }) {
  if (!dom.uploadHistoryList) return;
  dom.uploadHistoryList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.uploadHistoryList.innerHTML = `<li class="chat-history-item"><i class="fas fa-file-upload"></i><div><div class="chat-history-name">No uploads yet</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.innerHTML = `
      <i class="fas fa-file-alt"></i>
      <div>
        <div class="chat-history-name">${chat.name || 'Chat'}</div>
        <div class="chat-history-time">${chat.fileSize || ''}${chat.fileType ? ` • ${chat.fileType}` : ''}</div>
      </div>
      <button class="chat-inline-btn chat-delete-btn" type="button" title="Delete upload">
        Delete
      </button>
    `;
    item.addEventListener('click', () => onSelect(chat));
    const deleteBtn = item.querySelector('.chat-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(chat);
      });
    }
    dom.uploadHistoryList.appendChild(item);
  });
}

// ---------------------------------------------------------------------------
// Task 6.1 — truncateToTwoWords
// ---------------------------------------------------------------------------

/**
 * Truncate a document title to at most two whitespace-separated words.
 * Returns "No Document" if the input is falsy or blank.
 *
 * @param {string} title
 * @returns {string}
 */
export function truncateToTwoWords(title) {
  if (!title || !title.trim()) return 'No Document';
  const words = title.trim().split(/\s+/);
  return words.slice(0, 2).join(' ');
}

// ---------------------------------------------------------------------------
// Task 6.3 — renderTocView
// ---------------------------------------------------------------------------

/**
 * Render the Table of Contents into dom.tocView.
 *
 * @param {{ tocView: Element }} dom
 * @param {Array<{ id: string, label: string, level: number }>|null} ragData
 */
export function renderTocView(dom, ragData) {
  if (!dom.tocView) return;
  if (!ragData || ragData.length === 0) {
    dom.tocView.innerHTML = '<p style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)">No table of contents available</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.style.cssText = 'list-style:none;padding:0;margin:0';

  ragData.forEach((item) => {
    const li = document.createElement('li');
    const indent = (item.level - 1) * 12;
    const fontSize = item.level === 1 ? '1.35rem' : item.level === 2 ? '1.25rem' : '1.15rem';
    const fontWeight = item.level === 1 ? '600' : '400';
    const opacity = item.level === 1 ? '1' : item.level === 2 ? '0.9' : '0.75';

    li.dataset.sectionId = item.id;
    li.style.cssText = [
      `padding: .6rem 1.6rem .6rem ${1.6 + indent / 10}rem`,
      `font-size: ${fontSize}`,
      `font-weight: ${fontWeight}`,
      `opacity: ${opacity}`,
      'cursor: pointer',
      'color: hsl(210,40%,78%)',
      'border-left: 2px solid transparent',
      'transition: all .15s',
      'line-height: 1.4',
      'display: flex',
      'align-items: flex-start',
      'gap: .5rem',
    ].join(';');

    // Level indicator dot/dash
    const marker = item.level === 1 ? '▸' : item.level === 2 ? '–' : '·';
    li.innerHTML = `<span style="opacity:.5;flex-shrink:0;margin-top:.1rem">${marker}</span><span>${item.label}</span>`;

    li.addEventListener('mouseenter', () => {
      li.style.color = 'white';
      li.style.borderLeftColor = 'hsl(210,66%,60%)';
      li.style.background = 'rgba(255,255,255,.06)';
    });
    li.addEventListener('mouseleave', () => {
      li.style.color = `hsl(210,40%,${item.level === 1 ? 78 : 70}%)`;
      li.style.borderLeftColor = 'transparent';
      li.style.background = '';
    });

    ul.appendChild(li);
  });

  dom.tocView.innerHTML = '';
  dom.tocView.appendChild(ul);
}

// ---------------------------------------------------------------------------
// Task 6.5 — renderDocsView
// ---------------------------------------------------------------------------

/**
 * Render the Documents view into dom.docsView.
 *
 * @param {{ docsView: Element }} dom
 * @param {{ isEnterprise: boolean, documents: Array<{ id: string, name: string, fileType: string, fileSize: string }> }} options
 */
export function renderDocsView(dom, { isEnterprise, documents }) {
  if (!dom.docsView) return;
  if (isEnterprise) {
    const ul = document.createElement('ul');
    (documents || []).forEach((doc) => {
      const li = document.createElement('li');
      li.textContent = `${doc.name} — ${doc.fileType} — ${doc.fileSize}`;
      ul.appendChild(li);
    });
    dom.docsView.innerHTML = '';
    dom.docsView.appendChild(ul);
  } else {
    dom.docsView.innerHTML = `
      <div class="docs-upgrade-prompt">
        <p>The Documents view is an enterprise feature.</p>
        <a href="/upgrade" class="upgrade-cta">Upgrade to Enterprise</a>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------

export function renderConversationTopics(dom, { chats, currentChatId, onSelect }) {
  if (!dom.conversationTopicsList) return;
  dom.conversationTopicsList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.conversationTopicsList.innerHTML = `<li class="chat-history-item"><i class="fas fa-tag"></i><div><div class="chat-history-name">No topics yet</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;

    let topic = '';
    if (chat.firstUserMessage) {
      topic =
        chat.firstUserMessage.length > 30
          ? chat.firstUserMessage.substring(0, 30) + '…'
          : chat.firstUserMessage;
    } else {
      topic = chat.name;
    }

    const messageCount = (chat.messages || []).length;
    item.innerHTML = `
      <i class="fas fa-comment-dots"></i>
      <div>
        <div class="chat-history-name">${topic || 'Topic'}</div>
        <div class="chat-history-time">
          ${chat.name ? `${chat.name} • ` : ''}${messageCount} message${messageCount !== 1 ? 's' : ''}
        </div>
      </div>
    `;

    item.addEventListener('click', () => onSelect(chat));
    dom.conversationTopicsList.appendChild(item);
  });
}


// ── RAG bottom panel tab renderers ───────────────────────────

/**
 * Render RAG retrieval info into the RAG INFO tab.
 * Called after each successful RAG chat response.
 */
export function renderRagInfo(dom, { sources = [], chunkCount = 0, timeTakenMs = 0, groupId = '', processedQuery = '' }) {
  if (!dom.ragInfo) return;
  if (!sources.length) {
    dom.ragInfo.innerHTML = '<p class="rag-tab-empty">No retrieval data yet.</p>';
    return;
  }
  const rows = [
    { label: 'Group ID',       value: groupId || '—' },
    { label: 'Processed query', value: processedQuery || '—' },
    { label: 'Chunks used',    value: chunkCount },
    { label: 'Response time',  value: `${timeTakenMs}ms` },
  ];
  const statsHtml = rows.map(r =>
    `<div class="rag-stat-row"><span class="rag-stat-label">${r.label}</span><span class="rag-stat-value">${r.value}</span></div>`
  ).join('');

  const sourcesHtml = sources.map(s =>
    `<div class="rag-source-item">
      <i class="fas fa-file-alt"></i>
      <span>[${s.index}] ${s.filename || s.docId}</span>
      <span style="margin-left:auto;color:hsl(210,20%,60%);font-size:1.1rem">
        hybrid ${s.score} · vec ${s.vectorScore} · kw ${s.keywordScore}
      </span>
    </div>`
  ).join('');

  dom.ragInfo.innerHTML = `
    <div style="margin-bottom:8px">${statsHtml}</div>
    <div style="font-size:1.2rem;font-weight:600;color:hsl(210,40%,40%);margin:8px 0 4px">Sources (re-ranked)</div>
    ${sourcesHtml}
  `;
}

/**
 * Render token usage into the TOKEN USED tab.
 */
export function renderTokenInfo(dom, { tokenCount = 0, timeTakenMs = 0 }) {
  if (!dom.tokenInfo) return;
  dom.tokenInfo.innerHTML = `
    <div class="rag-stat-row"><span class="rag-stat-label">Tokens used</span><span class="rag-stat-value">${tokenCount.toLocaleString()}</span></div>
    <div class="rag-stat-row"><span class="rag-stat-label">Response time</span><span class="rag-stat-value">${timeTakenMs}ms</span></div>
  `;
}

/**
 * Render model info into the MODEL USED tab.
 */
export function renderModelInfo(dom, { model = 'Gemini (text-embedding-004)', apiUrl = '' }) {
  if (!dom.modelInfo) return;
  dom.modelInfo.innerHTML = `
    <div class="rag-stat-row"><span class="rag-stat-label">LLM</span><span class="rag-stat-value">${model}</span></div>
    <div class="rag-stat-row"><span class="rag-stat-label">Embedding</span><span class="rag-stat-value">text-embedding-004</span></div>
    <div class="rag-stat-row"><span class="rag-stat-label">Vector store</span><span class="rag-stat-value">Pinecone / in-memory</span></div>
  `;
}

/**
 * Log an error into the ERROR tab.
 */
export function logRagError(dom, message) {
  if (!dom.errorLog) return;
  const existing = dom.errorLog.querySelector('.rag-tab-empty');
  if (existing) existing.remove();
  const item = document.createElement('div');
  item.className = 'rag-error-item';
  item.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  dom.errorLog.prepend(item);
}

/**
 * Render RAG group docs into the left sidebar Docs view.
 * Replaces the generic renderDocsView for RAG-aware content.
 */
export function renderRagDocsView(dom, { docs = [], onSelect }) {
  if (!dom.docsView) return;
  if (!docs.length) {
    dom.docsView.innerHTML = '<p class="rag-empty-hint" style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)"><i class="fas fa-folder-open" style="margin-right:.6rem"></i>No documents in this group yet</p>';
    return;
  }
  const ul = document.createElement('ul');
  ul.style.cssText = 'list-style:none;padding:0;margin:0';
  docs.forEach((doc) => {
    const li = document.createElement('li');
    li.style.cssText = 'padding:.8rem 1.6rem;cursor:pointer;font-size:1.3rem;color:hsl(210,40%,75%);border-left:2px solid transparent;transition:all .15s';
    li.innerHTML = `<i class="fas fa-file-alt" style="margin-right:.6rem;color:hsl(210,66%,60%)"></i>${doc.originalFilename}`;
    li.title = `${doc.chunkCount} chunks · ${doc.sourceType}`;
    li.addEventListener('mouseenter', () => { li.style.background = 'rgba(255,255,255,.08)'; li.style.color = 'white'; li.style.borderLeftColor = 'hsl(210,66%,60%)'; });
    li.addEventListener('mouseleave', () => { li.style.background = ''; li.style.color = 'hsl(210,40%,75%)'; li.style.borderLeftColor = 'transparent'; });
    if (onSelect) li.addEventListener('click', () => onSelect(doc));
    ul.appendChild(li);
  });
  dom.docsView.innerHTML = '';
  dom.docsView.appendChild(ul);
}

// ── Ingest loading helpers ────────────────────────────────────

/**
 * Show a spinner in the TOC view while the file is being processed.
 */
export function showTocSpinner(dom, filename) {
  if (!dom.tocView) return;
  dom.tocView.innerHTML = `
    <div style="padding:2rem 1.6rem;display:flex;flex-direction:column;align-items:center;gap:1.2rem">
      <div class="toc-spinner"></div>
      <p style="font-size:1.3rem;color:hsl(210,40%,70%);text-align:center;line-height:1.5">
        Processing<br>
        <span style="font-size:1.1rem;opacity:.8">${filename}</span>
      </p>
    </div>
  `;
  // Switch to TOC view so the spinner is visible
  if (dom.tocView) dom.tocView.style.display = 'block';
  if (dom.docsView) dom.docsView.style.display = 'none';
  if (dom.sidebarFileBtn) dom.sidebarFileBtn.classList.add('sidebar-head-btn-active');
  if (dom.sidebarFolderBtn) dom.sidebarFolderBtn.classList.remove('sidebar-head-btn-active');
}

/**
 * Lock or unlock the chat input area during file processing.
 * When locked: textarea is disabled, send button is disabled,
 * and a "Processing document..." placeholder is shown.
 */
export function setInputLocked(dom, locked) {
  if (dom.messageInput) {
    dom.messageInput.disabled = locked;
    dom.messageInput.placeholder = locked
      ? '⏳ Processing document, please wait...'
      : 'Type your message... / ጥያቄዎን ይጻፉ...';
    dom.messageInput.style.opacity = locked ? '0.5' : '1';
  }
  if (dom.sendBtn) {
    dom.sendBtn.disabled = locked;
    dom.sendBtn.style.opacity = locked ? '0.4' : '1';
  }
  // Also disable the lang select
  if (dom.ragLangSelect) {
    dom.ragLangSelect.disabled = locked;
  }
}
