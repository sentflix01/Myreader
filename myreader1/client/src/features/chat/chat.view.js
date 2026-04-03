import { t } from '../preferences/preferences.page';

export function isOnChatPage() {
  return Boolean(document.getElementById('chatMessagesArea'));
}

export function getChatDom() {
  return {
    root: document,
    newChatBtn: document.getElementById('newChatBtn'),
    uploadFileBtn: document.getElementById('uploadFileBtn'),
    uploadFolderBtn: document.getElementById('uploadFolderBtn'),
    uploadFileInput: document.getElementById('chatFileInput'),
    uploadFolderInput: document.getElementById('chatFolderInput'),
    uploadArea: document.getElementById('chatUploadArea'),
    chatList: document.getElementById('chatHistoryList'),
    chatContent: document.getElementById('chatMessagesArea'),
    chatInputArea: document.getElementById('chatInputContainer'),
    chatComposer: document.getElementById('chatComposer'),
    chatComposerNote: document.getElementById('chatComposerNote'),
    messageInput: document.getElementById('messageInput'),
    composerUploadBtn: document.getElementById('chatComposerUploadBtn'),
    chatEmojiBtn: document.getElementById('chatEmojiBtn'),
    chatEmojiPickerHost: document.getElementById('chatEmojiPickerHost'),
    sendBtn: document.getElementById('sendMessageBtn'),
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
    scopeDocumentsLabel: document.getElementById('scopeDocumentsLabel'),
    scopeDocumentsList: document.getElementById('scopeDocumentsList'),
  };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMessageText(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function isEnterpriseUser() {
  return document.body?.dataset?.subscriptionTier === 'enterprise';
}

function normalizeScopeDocuments(chat = {}) {
  if (Array.isArray(chat.scopeDocuments) && chat.scopeDocuments.length) {
    return chat.scopeDocuments;
  }

  if (chat.docId || chat.name) {
    return [
      {
        id: chat.docId || null,
        name: chat.name || t('chat.chatFallback', {}, 'Chat'),
        relativePath: chat.name || t('chat.chatFallback', {}, 'Chat'),
        fileType: chat.fileType || '',
        fileSize: chat.fileSize || 0,
        status: chat.status || '',
      },
    ];
  }

  return [];
}

function getScopeSummaryMarkup(scopeDocuments = []) {
  const previewItems = scopeDocuments.slice(0, 4);
  if (!previewItems.length) return '';

  return `
    <ul class="chat-scope-preview">
      ${previewItems
        .map(
          (item) => `
            <li class="chat-scope-preview__item">
              <i class="fas ${item.relativePath && item.relativePath.includes('/') ? 'fa-folder-tree' : 'fa-file-alt'}"></i>
              <span>${escapeHtml(item.relativePath || item.name || '')}</span>
            </li>`,
        )
        .join('')}
    </ul>
  `;
}

function getHistoryIconClass(chat = {}) {
  return chat.scopeType === 'folder' ? 'fas fa-folder-open' : 'fas fa-comment';
}

function getUploadIconClass(chat = {}) {
  return chat.scopeType === 'folder' ? 'fas fa-folder' : 'fas fa-file-alt';
}

function messageCountLabel(count) {
  return count === 1
    ? t('chat.messageCountSingular', { count }, `${count} message`)
    : t('chat.messageCountPlural', { count }, `${count} messages`);
}

function sourcesMarkup(sources = []) {
  if (!sources.length) return '';
  return `<div class="message-sources"><strong>${t(
    'chat.sources',
    {},
    'Sources',
  )}:</strong> ${sources
    .map(
      (s) =>
        `#${s.id} (${Number(s.score || 0).toFixed(3)}): ${escapeHtml(s.excerpt)}`,
    )
    .join(' | ')}</div>`;
}

export function renderChatInterface(dom, scope) {
  if (!dom.chatContent) return;
  const scopeDocuments = normalizeScopeDocuments(scope);
  const isFolderScope =
    scope?.scopeType === 'folder' ||
    Boolean(scope?.folderName) ||
    scopeDocuments.length > 1;
  const timeLabel = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isFolderScope) {
    const folderName =
      scope?.folderName ||
      scope?.name ||
      t('chat.chatFallback', {}, 'Folder');
    const documentCount = scopeDocuments.length;
    dom.chatContent.innerHTML = `
      <div class="chat-messages">
        <div class="message received">
          <div class="message-content">
            <div class="message-header">
              <strong>${t('chat.assistantName', {}, 'MyReader')}</strong>
              <span class="message-time">${timeLabel}</span>
            </div>
            <p>${t(
              'chat.processedFolderIntro',
              { folderName: escapeHtml(folderName) },
              `Your folder "${escapeHtml(folderName)}" is ready. Ask me questions and I will answer only from the uploaded documents in this folder.`,
            )}</p>
            <div class="file-info file-info--folder">
              <i class="fas fa-folder-open"></i>
              <span>${escapeHtml(folderName)} • ${documentCount} ${documentCount === 1 ? 'document' : 'documents'}</span>
            </div>
            ${getScopeSummaryMarkup(scopeDocuments)}
          </div>
        </div>
      </div>
    `;
    dom.messageInput?.focus();
    return;
  }

  const fileName = scope?.name || '';
  const fileSize =
    typeof scope?.size === 'number'
      ? formatFileSize(scope.size)
      : escapeHtml(scope?.fileSize || '');

  dom.chatContent.innerHTML = `
    <div class="chat-messages">
      <div class="message received">
        <div class="message-content">
          <div class="message-header">
            <strong>${t('chat.assistantName', {}, 'MyReader')}</strong>
            <span class="message-time">${timeLabel}</span>
          </div>
          <p>${t(
            'chat.processedFileIntro',
            { fileName: escapeHtml(fileName) },
            `I've processed your file "${escapeHtml(fileName)}". What would you like to know about it?`,
          )}</p>
          <div class="file-info">
            <i class="fas fa-file"></i>
            <span>${escapeHtml(fileName)}${fileSize ? ` (${fileSize})` : ''}</span>
          </div>
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
          <strong>${msg.type === 'sent' ? t('chat.you', {}, 'You') : t('chat.assistantName', {}, 'MyReader')}</strong>
          <span class="message-time">${msg.time || ''}</span>
        </div>
        <p>${formatMessageText(msg.text || '')}</p>
        ${sourcesMarkup(msg.sources || [])}
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
  const scopeDocuments = normalizeScopeDocuments(chat);

  if (!chat.messages || chat.messages.length === 0) {
    if (chat.scopeType === 'folder' || scopeDocuments.length > 1) {
      messagesContainer.innerHTML = `
        <div class="message received">
          <div class="message-content">
            <div class="message-header">
              <strong>${t('chat.assistantName', {}, 'MyReader')}</strong>
              <span class="message-time">${chat.timestamp || ''}</span>
            </div>
            <p>${t(
              'chat.previousFolderIntro',
              {
                folderName: escapeHtml(
                  chat.folderName || chat.name || t('chat.chatFallback', {}, 'Folder'),
                ),
              },
              `You previously uploaded the folder "${escapeHtml(chat.folderName || chat.name || 'Folder')}". Open the document list on the right to review everything inside it.`,
            )}</p>
            <div class="file-info file-info--folder">
              <i class="fas fa-folder-open"></i>
              <span>${escapeHtml(chat.folderName || chat.name || t('chat.chatFallback', {}, 'Folder'))} • ${scopeDocuments.length} ${scopeDocuments.length === 1 ? 'document' : 'documents'}</span>
            </div>
            ${getScopeSummaryMarkup(scopeDocuments)}
          </div>
        </div>
      `;
    } else {
      messagesContainer.innerHTML = `
        <div class="message received">
          <div class="message-content">
            <div class="message-header">
              <strong>${t('chat.assistantName', {}, 'MyReader')}</strong>
              <span class="message-time">${chat.timestamp || ''}</span>
            </div>
            <p>${t(
              'chat.previousUploadIntro',
              {
                fileName: escapeHtml(
                  chat.name || t('chat.chatFallback', {}, 'Chat'),
                ),
              },
              `You previously uploaded a file named "${escapeHtml(chat.name || 'Chat')}".`,
            )}</p>
            <div class="file-info">
              <i class="fas fa-file"></i>
              <span>${escapeHtml(chat.name || t('chat.chatFallback', {}, 'Chat'))}${chat.fileSize ? ` (${escapeHtml(chat.fileSize)})` : ''}</span>
            </div>
          </div>
        </div>
      `;
    }
  } else {
    (chat.messages || []).forEach((msg) => {
      const div = document.createElement('div');
      div.className = `message ${msg.type === 'sent' ? 'sent' : 'received'}`;
      div.innerHTML = `
        <div class="message-content">
          <div class="message-header">
            <strong>${msg.type === 'sent' ? t('chat.you', {}, 'You') : t('chat.assistantName', {}, 'MyReader')}</strong>
            <span class="message-time">${msg.time || ''}</span>
          </div>
          <p>${formatMessageText(msg.text || '')}</p>
          ${sourcesMarkup(msg.sources || [])}
        </div>
      `;
      messagesContainer.appendChild(div);
    });
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function renderWelcome(dom) {
  if (!dom.chatContent) return;
  const showFolderUpload = isEnterpriseUser();
  dom.chatContent.innerHTML = `
    <div class="chat-welcome-state">
      <div class="chat-welcome-icon">
        <i class="fas fa-comments"></i>
      </div>
      <h3>${t('chat.welcomeTitle', {}, 'No Chats Available')}</h3>
      <p>${t(
        'chat.welcomeText',
        {},
        'Please upload a file to start a new chat. MyReader can process documents, images, and other files to help you analyze and discuss content.',
      )}</p>
    </div>
    <div class="chat-upload">
      <div class="chat-upload-area" id="chatUploadArea">
        <div class="chat-upload-icon">
          <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <h4>${t('chat.uploadTitle', {}, 'Upload a file to start chatting')}</h4>
        <p>${t(
          'chat.uploadHint',
          {},
          'Drag and drop your file here or click to browse',
        )}</p>
        <div class="chat-upload-actions">
          <button class="upload-file-btn" id="uploadFileBtn">
            <i class="fas fa-upload"></i> ${t('chat.chooseFile', {}, 'Choose File')}
          </button>
          ${
            showFolderUpload
              ? `<button class="upload-file-btn upload-file-btn--secondary" id="uploadFolderBtn" type="button">
                  <i class="fas fa-folder-plus"></i> ${t('chat.chooseFolder', {}, 'Choose Folder')}
                </button>`
              : ''
          }
        </div>
        <p class="chat-upload-note">${
          showFolderUpload
            ? t(
                'chat.folderUploadHint',
                {},
                'Enterprise users can upload a local folder and ask questions across all of its documents.',
              )
            : t(
                'chat.folderUpgradeHint',
                {},
                'Upgrade to Enterprise to upload entire folders and chat with grouped documents.',
              )
        }</p>
        <div class="supported-file-types">
          <span class="file-type-badge">PDF</span>
          <span class="file-type-badge">DOC</span>
          <span class="file-type-badge">DOCX</span>
          <span class="file-type-badge">TXT</span>
          <span class="file-type-badge">HTML</span>
          <span class="file-type-badge">JSON</span>
          <span class="file-type-badge">CSV</span>
        </div>
      </div>
      <div class="hero-img-box"></div>
    </div>
  `;
}

export function renderScopeDocuments(dom, chat) {
  if (!dom.scopeDocumentsList) return;
  const scopeDocuments = chat ? normalizeScopeDocuments(chat) : [];

  if (dom.scopeDocumentsLabel) {
    dom.scopeDocumentsLabel.textContent = chat
      ? chat.scopeType === 'folder'
        ? t('chat.currentScopeFolderLabel', {}, 'Folder documents')
        : t('chat.currentScopeFileLabel', {}, 'Selected document')
      : t('chat.currentScopeTitle', {}, 'Selected Documents');
  }

  if (!chat || !scopeDocuments.length) {
    dom.scopeDocumentsList.innerHTML = `
      <li class="scope-document-item scope-document-item--empty">
        <div class="scope-document-meta">
          <span class="scope-document-name">${t(
            'chat.currentScopeEmpty',
            {},
            'Open a chat to see the document or folder contents here.',
          )}</span>
        </div>
      </li>
    `;
    return;
  }

  dom.scopeDocumentsList.innerHTML = scopeDocuments
    .map((item) => {
      const statusLabel =
        item.status === 'completed'
          ? t('chat.scopeReady', {}, 'Ready for chat')
          : t('chat.scopeNotReady', {}, 'Needs re-upload');
      return `
        <li class="scope-document-item">
          <i class="fas ${
            item.relativePath && item.relativePath.includes('/')
              ? 'fa-folder-tree'
              : 'fa-file-lines'
          }"></i>
          <div class="scope-document-meta">
            <span class="scope-document-name">${escapeHtml(item.name || item.relativePath || '')}</span>
            <span class="scope-document-path">${escapeHtml(item.relativePath || item.name || '')}</span>
          </div>
          <span class="scope-document-status ${
            item.status === 'completed'
              ? 'scope-document-status--ready'
              : 'scope-document-status--warning'
          }">${statusLabel}</span>
        </li>
      `;
    })
    .join('');
}

export function renderChatList(dom, { chats, currentChatId }) {
  if (!dom.chatList) return;
  dom.chatList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.chatList.innerHTML = `<li class="chat-history-item"><i class="fas fa-comment"></i><div><div class="chat-history-name">${t(
      'chat.noChats',
      {},
      'No chats available',
    )}</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.dataset.chatId = String(chat.id);

    const displayName = chat.firstUserMessage
      ? chat.firstUserMessage.length > 30
        ? `${chat.firstUserMessage.substring(0, 30)}...`
        : chat.firstUserMessage
      : chat.name;

    item.innerHTML = `
      <i class="${getHistoryIconClass(chat)}"></i>
      <div>
        <div class="chat-history-name">${escapeHtml(displayName || t('chat.chatFallback', {}, 'Chat'))}</div>
        <div class="chat-history-time">${chat.timestamp || ''}</div>
      </div>
      <button class="chat-inline-btn" data-action="clear-chat" type="button" title="Clear conversation">
        ${t('chat.clear', {}, 'Clear')}
      </button>
    `;
    dom.chatList.appendChild(item);
  });
}

export function renderUploadHistory(dom, { chats, currentChatId }) {
  if (!dom.uploadHistoryList) return;
  dom.uploadHistoryList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.uploadHistoryList.innerHTML = `<li class="chat-history-item"><i class="fas fa-file-upload"></i><div><div class="chat-history-name">${t(
      'chat.noUploads',
      {},
      'No uploads yet',
    )}</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.dataset.chatId = String(chat.id);
    const scopeDocuments = normalizeScopeDocuments(chat);
    const secondaryLine =
      chat.scopeType === 'folder'
        ? `${scopeDocuments.length} ${scopeDocuments.length === 1 ? 'document' : 'documents'}`
        : `${escapeHtml(chat.fileSize || '')}${
            chat.fileType ? ` • ${escapeHtml(chat.fileType)}` : ''
          }`;
    item.innerHTML = `
      <i class="${getUploadIconClass(chat)}"></i>
      <div>
        <div class="chat-history-name">${escapeHtml(chat.name || t('chat.chatFallback', {}, 'Chat'))}</div>
        <div class="chat-history-time">${secondaryLine}</div>
      </div>
      <button class="chat-inline-btn" data-action="delete-upload" type="button" title="Delete upload">
        ${t('chat.delete', {}, 'Delete')}
      </button>
    `;
    dom.uploadHistoryList.appendChild(item);
  });
}

export function renderConversationTopics(dom, { chats, currentChatId }) {
  if (!dom.conversationTopicsList) return;
  dom.conversationTopicsList.innerHTML = '';
  if (!chats || chats.length === 0) {
    dom.conversationTopicsList.innerHTML = `<li class="chat-history-item"><i class="fas fa-tag"></i><div><div class="chat-history-name">${t(
      'chat.noTopics',
      {},
      'No topics yet',
    )}</div></div></li>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.dataset.chatId = String(chat.id);

    const topic = chat.firstUserMessage
      ? chat.firstUserMessage.length > 30
        ? `${chat.firstUserMessage.substring(0, 30)}...`
        : chat.firstUserMessage
      : chat.name;

    const messageCount = (chat.messages || []).length;
    item.innerHTML = `
      <i class="fas fa-comment-dots"></i>
      <div>
        <div class="chat-history-name">${escapeHtml(topic || t('chat.topicFallback', {}, 'Topic'))}</div>
        <div class="chat-history-time">
          ${chat.name ? `${escapeHtml(chat.name)} • ` : ''}${messageCountLabel(messageCount)}
        </div>
      </div>
    `;
    dom.conversationTopicsList.appendChild(item);
  });
}

