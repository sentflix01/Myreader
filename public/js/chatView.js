/* eslint-disable */
import { ct } from './i18n';

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
    sidebarQuestionsBtn: document.getElementById('sidebarQuestionsBtn'),
    sidebarFolderBtn: document.getElementById('sidebarFolderBtn'),
    sidebarDocTitle: document.querySelector('.sidebar-doc-title'),
    tocView: document.getElementById('tocView'),
    questionsView: document.getElementById('questionsView'),
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

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatMetricValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  if (value === 'unlimited') return 'Unlimited';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function formatStatusLabel(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderStatRows(rows = []) {
  return rows
    .map(
      (row) => `
        <div class="rag-stat-row">
          <span class="rag-stat-label">${row.label}</span>
          <span class="rag-stat-value">${row.value}</span>
        </div>
      `,
    )
    .join('');
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
          <p>${ct('chat.processedFileIntro', {
            fileName: file.name,
          }, `I've processed your file "${file.name}". What would you like to know about it?`)}</p>
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

/** Main chat area while PDF/DOCX is being ingested */
export function renderIngestProgress(dom, file) {
  if (!dom.chatContent) return;
  const name = file?.name || 'Document';
  dom.chatContent.innerHTML = `
    <div class="rag-ingest-progress">
      <div class="rag-ingest-progress__spinner toc-spinner" aria-hidden="true"></div>
      <h3 class="rag-ingest-progress__title">${ct('chat.processingDocumentTitle', {}, 'Preparing your document')}</h3>
      <p class="rag-ingest-progress__file"><i class="fas fa-file-alt"></i> ${escapeHtml(name)}</p>
      <p class="rag-ingest-progress__hint">${ct(
        'chat.processingDocumentHint',
        {},
        'Extracting text, building the table of contents, and indexing for questions. This usually takes a few seconds.',
      )}</p>
    </div>
  `;
}

/**
 * After ingest: prompt user to read TOC before first RAG message.
 */
export function renderTocLoadingCard(dom, chat) {
  if (!dom.chatContent) return;
  const title = escapeHtml(chat?.name || 'Document');
  dom.chatContent.innerHTML = `
    <div class="rag-toc-gate rag-toc-gate--loading">
      <div class="toc-spinner" aria-hidden="true"></div>
      <p class="rag-toc-gate__lead">${ct(
        'chat.loadingOutline',
        { title: `<strong>${title}</strong>` },
        `Loading outline for <strong>${title}</strong>...`,
      )}</p>
    </div>
  `;
}

export function renderPostIngestGate(dom, chat, tocCount) {
  if (!dom.chatContent) return;
  const n = typeof tocCount === 'number' ? tocCount : 0;
  const title = escapeHtml(chat?.name || 'Document');
  const lead = ct(
    'chat.tocGateLead',
    {
      count: n,
      plural: n === 1 ? '' : 's',
      title: `<strong>${title}</strong>`,
      extra: n ? ct('chat.tocGateLeadExtra', {}, ', or tap a section to draft a question') : '',
    },
    `We found ${n} section${n === 1 ? '' : 's'} in <strong>${title}</strong>. Open the left panel to skim the outline${n ? ', or tap a section to draft a question' : ''}.`,
  );
  dom.chatContent.innerHTML = `
    <div class="rag-toc-gate">
      <div class="rag-toc-gate__icon"><i class="fas fa-list-ul"></i></div>
      <h3 class="rag-toc-gate__title">${ct('chat.tocGateTitle', {}, 'Table of contents is ready')}</h3>
      <p class="rag-toc-gate__lead">${lead}</p>
      <ul class="rag-toc-gate__steps">
        <li><span class="rag-toc-gate__step-num">1</span> ${ct('chat.tocGateStep1', {}, 'Review sections in the sidebar')}</li>
        <li><span class="rag-toc-gate__step-num">2</span> ${ct('chat.tocGateStep2', {}, 'Tap Start chatting when you are ready to ask questions')}</li>
      </ul>
      <button type="button" class="btn btn--green rag-toc-gate__cta" id="startRagChatBtn">
        <i class="fas fa-comments"></i> ${ct('chat.startChatting', {}, 'Start chatting')}
      </button>
      <p class="rag-toc-gate__note">${ct(
        'chat.tocGateNote',
        {},
        'RAG answers use only this document until you upload another file.',
      )}</p>
    </div>
  `;
}

/** First assistant bubble after the gate */
export function renderRagWelcomeMessage(dom, chat) {
  if (!dom.chatContent) return;
  const name = escapeHtml(chat?.name || 'your document');
  const sizeLabel = chat?.fileSize ? escapeHtml(chat.fileSize) : '';
  dom.chatContent.innerHTML = `
    <div class="chat-messages">
      <div class="message received">
        <div class="message-content">
          <div class="message-header">
            <strong>SentReader</strong>
            <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p>${ct(
            'chat.readyIntro',
            { name: `<strong>${name}</strong>` },
            `I'm ready to answer questions about <strong>${name}</strong>. What would you like to know?`,
          )}</p>
          ${
            sizeLabel
              ? `<div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
            <i class="fas fa-file" style="margin-right: 8px;"></i>${name}${sizeLabel ? ` (${sizeLabel})` : ''}
          </div>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
  dom.messageInput?.focus();
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
          <strong>${msg.type === 'sent' ? ct('chat.you', {}, 'You') : 'SentReader'}</strong>
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
          <p>${ct(
            'chat.previousUploadIntro',
            { fileName: `<strong>${escapeHtml(chat.name || ct('chat.chatFallback', {}, 'Chat'))}</strong>` },
            `You previously uploaded a file named "<strong>${escapeHtml(chat.name || 'Chat')}</strong>".`,
          )}</p>
          <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
            <i class="fas fa-file" style="margin-right: 8px;"></i>
            ${(chat.name || ct('chat.chatFallback', {}, 'Chat'))}${chat.fileSize ? ` (${chat.fileSize})` : ''}
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
            <strong>${msg.type === 'sent' ? ct('chat.you', {}, 'You') : 'SentReader'}</strong>
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
      <h3>${ct('chat.welcomeTitle', {}, 'No Chats Available')}</h3>
      <p>${ct(
        'chat.welcomeText',
        {},
        'Please upload a file to start a new chat. SentReader can process documents, images, and other files to help you analyze and discuss content.',
      )}</p>
    </div>
    <div class="chat-upload">
      <div class="chat-upload-area" id="chatUploadArea">
        <div class="chat-upload-icon">
          <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h4>${ct('chat.uploadTitle', {}, 'Upload a file to start chatting')}</h4>
        <p>${ct('chat.uploadHint', {}, 'Drag and drop your file here or click to browse')}</p>
        <button class="upload-file-btn" id="uploadFileBtn">
          <i class="fas fa-upload"></i> ${ct('chat.chooseFile', {}, 'Choose File')}
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
    dom.chatList.innerHTML = `<li class="chat-history-item"><i class="fas fa-comment"></i><div><div class="chat-history-name">${ct('chat.noChats', {}, 'No chats available')}</div></div></li>`;
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
        <div class="chat-history-name">${displayName || ct('chat.chatFallback', {}, 'Chat')}</div>
        <div class="chat-history-time">${chat.timestamp || ''}</div>
      </div>
      <button class="chat-inline-btn chat-clear-btn" type="button" title="${ct('chat.clear', {}, 'Clear')}">
        ${ct('chat.clear', {}, 'Clear')}
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
    dom.uploadHistoryList.innerHTML = `<li class="chat-history-item"><i class="fas fa-file-upload"></i><div><div class="chat-history-name">${ct('chat.noUploads', {}, 'No uploads yet')}</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.innerHTML = `
      <i class="fas fa-file-alt"></i>
      <div>
        <div class="chat-history-name">${chat.name || ct('chat.chatFallback', {}, 'Chat')}</div>
        <div class="chat-history-time">${chat.fileSize || ''}${chat.fileType ? ` • ${chat.fileType}` : ''}</div>
      </div>
      <button class="chat-inline-btn chat-delete-btn" type="button" title="${ct('chat.delete', {}, 'Delete')}">
        ${ct('chat.delete', {}, 'Delete')}
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
export function renderTocView(dom, ragData, options = {}) {
  const { onSectionClick } = options;
  if (!dom.tocView) return;
  if (!ragData || ragData.length === 0) {
    dom.tocView.innerHTML = `<p style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)">${ct('chat.noTocAvailable', {}, 'No table of contents available')}</p>`;
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'toc-view-list';

  ragData.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'toc-view__item';
    li.dataset.sectionId = item.id;
    li.dataset.level = String(item.level || 1);
    const indent = Math.max(0, (item.level || 1) - 1) * 12;
    li.style.paddingLeft = `${1.6 + indent / 10}rem`;

    const marker = item.level === 1 ? '▸' : item.level === 2 ? '–' : '·';
    li.innerHTML = `<span class="toc-view__marker">${marker}</span><span class="toc-view__label">${escapeHtml(item.label)}</span>`;

    const activate = () => {
      ul.querySelectorAll('.toc-view__item').forEach((el) => el.classList.remove('toc-view__item--active'));
      li.classList.add('toc-view__item--active');
    };

    const handler = (e) => {
      e.preventDefault();
      activate();
      if (typeof onSectionClick === 'function') onSectionClick(item);
    };
    li.addEventListener('click', handler);

    ul.appendChild(li);
  });

  dom.tocView.innerHTML = '';
  dom.tocView.appendChild(ul);
}

export function renderQuestionSuggestionsView(dom, suggestions = [], options = {}) {
  const { onQuestionClick } = options;
  if (!dom.questionsView) return;

  if (!suggestions.length) {
    dom.questionsView.innerHTML = `
      <p class="rag-empty-hint" style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)">
        <i class="fas fa-circle-question" style="margin-right:.6rem"></i>${ct(
          'chat.questionsEmpty',
          {},
          'Question suggestions will appear after your document is processed.',
        )}
      </p>
    `;
    return;
  }

  const hint = document.createElement('p');
  hint.className = 'questions-view-hint';
  hint.textContent = ct(
    'chat.questionListHint',
    {},
    'Tap any suggestion to draft it into the composer.',
  );

  const list = document.createElement('ul');
  list.className = 'question-suggestions-list';

  suggestions.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'question-suggestions-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'question-suggestion-btn';
    button.innerHTML = `
      <span class="question-suggestion-text">${escapeHtml(item.question)}</span>
      <span class="question-suggestion-meta">
        ${item.filename ? `<span>${escapeHtml(item.filename)}</span>` : ''}
        ${
          item.page
            ? `<span>${escapeHtml(ct('chat.pageLabel', { page: item.page }, `Page ${item.page}`))}</span>`
            : ''
        }
      </span>
    `;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof onQuestionClick === 'function') onQuestionClick(item);
    });

    li.appendChild(button);
    list.appendChild(li);
  });

  dom.questionsView.innerHTML = '';
  dom.questionsView.appendChild(hint);
  dom.questionsView.appendChild(list);
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
    dom.conversationTopicsList.innerHTML = `<li class="chat-history-item"><i class="fas fa-tag"></i><div><div class="chat-history-name">${ct('chat.noTopics', {}, 'No topics yet')}</div></div></li>`;
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
          ${chat.name ? `${chat.name} • ` : ''}${ct(
            messageCount === 1 ? 'chat.messageCountSingular' : 'chat.messageCountPlural',
            { count: messageCount },
            `${messageCount} message${messageCount !== 1 ? 's' : ''}`,
          )}
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
    dom.ragInfo.innerHTML = `<p class="rag-tab-empty">${ct('chat.ragTabEmpty', {}, 'No retrieval data yet.')}</p>`;
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

export function renderUsageInfo(dom, subscription) {
  if (!dom.usageInfo) return;
  if (!subscription?.usage || !subscription?.limits) {
    dom.usageInfo.innerHTML =
      '<p class="rag-tab-empty">Usage information is unavailable right now.</p>';
    return;
  }

  const rows = [
    {
      label: 'Uploads today',
      value: `${formatMetricValue(subscription.usage.uploads)} / ${formatMetricValue(
        subscription.limits.maxDailyUploads,
      )}`,
    },
    {
      label: 'Queries today',
      value: `${formatMetricValue(subscription.usage.queries)} / ${formatMetricValue(
        subscription.limits.maxDailyQueries,
      )}`,
    },
    {
      label: 'Messages today',
      value: `${formatMetricValue(subscription.usage.messages)} / ${formatMetricValue(
        subscription.limits.maxDailyMessages,
      )}`,
    },
    {
      label: 'Chat sessions today',
      value: `${formatMetricValue(
        subscription.usage.chatSessions,
      )} / ${formatMetricValue(subscription.limits.maxChatSessions)}`,
    },
    {
      label: 'Tokens today',
      value: `${formatMetricValue(subscription.usage.tokensUsed)} / ${formatMetricValue(
        subscription.limits.maxDailyTokens,
      )}`,
    },
  ];

  const lifetimeRows = [
    {
      label: 'Lifetime uploads',
      value: formatMetricValue(subscription?.lifetime?.documentsUploadedCount),
    },
    {
      label: 'Lifetime queries',
      value: formatMetricValue(subscription?.lifetime?.totalQueriesAsked),
    },
    {
      label: 'Lifetime messages',
      value: formatMetricValue(subscription?.lifetime?.totalChatMessages),
    },
  ];

  dom.usageInfo.innerHTML = `
    <div style="margin-bottom:8px">${renderStatRows(rows)}</div>
    <div style="font-size:1.2rem;font-weight:600;color:hsl(210,40%,40%);margin:10px 0 4px">
      Lifetime activity
    </div>
    ${renderStatRows(lifetimeRows)}
    <p class="rag-tab-empty" style="margin-top:10px">
      Usage window started ${formatDateLabel(subscription.usage.windowStartedAt)}.
      ${
        subscription.enforcementEnabled
          ? 'Limits are currently enforced.'
          : 'Limits are visible now and enforced automatically in production.'
      }
    </p>
  `;
}

export function renderSubscriptionInfo(dom, subscription) {
  if (!dom.subscriptionInfo) return;
  if (!subscription) {
    dom.subscriptionInfo.innerHTML =
      '<p class="rag-tab-empty">Subscription details will appear here.</p>';
    return;
  }

  const rows = [
    { label: 'Plan', value: formatStatusLabel(subscription.label || subscription.tier) },
    { label: 'Status', value: formatStatusLabel(subscription.status) },
    {
      label: 'Billing period ends',
      value: formatDateLabel(subscription.currentPeriodEnd),
    },
    { label: 'Trial ends', value: formatDateLabel(subscription.trialEndsAt) },
  ];

  const cancellationNote = subscription.cancelAtPeriodEnd
    ? '<p class="rag-tab-empty" style="margin-top:10px">Cancellation is scheduled for the end of the current billing period.</p>'
    : '';

  dom.subscriptionInfo.innerHTML = `
    <div style="margin-bottom:8px">${renderStatRows(rows)}</div>
    ${cancellationNote}
    <p class="rag-tab-empty" style="margin-top:10px">
      Manage plans and billing from <a href="/editProfile">Account settings</a>.
    </p>
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
    dom.docsView.innerHTML = `<p class="rag-empty-hint" style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)"><i class="fas fa-folder-open" style="margin-right:.6rem"></i>${ct('chat.docsEmpty', {}, 'No documents in this group yet')}</p>`;
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
        ${ct('chat.processingShort', {}, 'Processing')}<br>
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
/**
 * @param {'open'|'processing'|'gate'} state
 *   open — normal typing
 *   processing — ingest in progress
 *   gate — TOC shown; user must tap “Start chatting” first
 */
export function setChatInputState(dom, state) {
  const locked = state !== 'open';
  const placeholders = {
    open: ct('chat.composerPlaceholderReady', {}, 'Ask anything about the uploaded document...'),
    processing: `⏳ ${ct('chat.extractingOutline', {}, 'Extracting text and table of contents...')}`,
    gate: ct(
      'chat.reviewOutline',
      {},
      'Review the outline in the left panel, then tap Start chatting below.',
    ),
  };
  if (dom.messageInput) {
    dom.messageInput.disabled = locked;
    dom.messageInput.placeholder = placeholders[state] || placeholders.open;
    dom.messageInput.style.opacity = locked ? '0.55' : '1';
  }
  if (dom.sendBtn) {
    dom.sendBtn.disabled = locked;
    dom.sendBtn.style.opacity = locked ? '0.35' : '1';
  }
  if (dom.ragLangSelect) {
    dom.ragLangSelect.disabled = locked;
  }
}
