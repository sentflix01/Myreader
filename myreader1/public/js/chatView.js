/* eslint-disable */

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    chatInputArea: document.getElementById('chatInputContainer'),
    messageInput: document.getElementById('messageInput'),
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
    clearAllConversationsBtn: document.getElementById(
      'clearAllConversationsBtn',
    ),
    deleteAllUploadsBtn: document.getElementById('deleteAllUploadsBtn'),
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
            <strong>MyReader</strong>
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
  if (dom.chatInputArea) dom.chatInputArea.style.display = 'block';
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
          <strong>${msg.type === 'sent' ? 'You' : 'MyReader'}</strong>
          <span class="message-time">${escapeHtml(msg.time)}</span>
        </div>
        <p>${escapeHtml(msg.text)}</p>
        ${
          msg.sources
            ? `<div class="message-sources" style="margin-top:8px;font-size:12px;color:#555;"><strong>Sources</strong>${msg.sources
                .map(
                  (s) =>
                    ` <div class="source-item" style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(s.sourceLine)} — relevance ${s.score.toFixed(3)}</div>`,
                )
                .join('')}</div>`
            : ''
        }
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
            <strong>MyReader</strong>
            <span class="message-time">${chat.timestamp || ''}</span>
          </div>
          <p>You previously uploaded a file named "<strong>${chat.name || 'Chat'}</strong>".</p>
          <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
            <i class="fas fa-file" style="margin-right: 8px;"></i>
            ${chat.name || 'Chat'}${chat.fileSize ? ` (${chat.fileSize})` : ''}
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
            <strong>${msg.type === 'sent' ? 'You' : 'MyReader'}</strong>
            <span class="message-time">${escapeHtml(msg.time)}</span>
          </div>
          <p>${escapeHtml(msg.text)}</p>
          ${
            msg.sources
              ? `<div class="message-sources" style="margin-top:8px;font-size:12px;color:#555;"><strong>Sources</strong>${msg.sources
                  .map(
                    (s) =>
                      ` <div class="source-item" style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(s.sourceLine)} — relevance ${s.score.toFixed(3)}</div>`,
                  )
                  .join('')}</div>`
              : ''
          }
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
      <p>Please upload a file to start a new chat. MyReader can process documents, images, and other files to help you analyze and discuss content.</p>
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
          <span class="file-type-badge">DOC</span>
          <span class="file-type-badge">DOCX</span>
          <span class="file-type-badge">TXT</span>
          <span class="file-type-badge">HTML</span>
          <span class="file-type-badge">JSON</span>
          <span class="file-type-badge">CSV</span>
        </div>
      </div>
      <div class="hero-img-box">
        <!-- Form content -->
      </div>
    </div>
  `;
}

export function renderChatList(
  dom,
  { chats, currentChatId, onSelect, onClear },
) {
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

export function renderUploadHistory(
  dom,
  { chats, currentChatId, onSelect, onDelete },
) {
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

export function renderConversationTopics(
  dom,
  { chats, currentChatId, onSelect },
) {
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

