/* eslint-disable */
import {
  addMessageOnServer,
  clearAllChatsOnServer,
  clearChatOnServer,
  createChatOnServer,
  deleteAllChatsOnServer,
  deleteChatOnServer,
  ensureClientId,
  fetchMyChats,
  loadChatsFromCache,
  mergeServerChatsIntoLocal,
  saveChatsToCache,
  syncChatOnServer,
} from './chatModel';

import {
  formatFileSize,
  getChatDom,
  isOnChatPage,
  renderChatInterface,
  renderChatList,
  renderConversationTopics,
  renderExistingChat,
  renderMessages,
  renderUploadHistory,
  renderWelcome,
  truncateToTwoWords,
} from './chatView';

export function initChat() {
  if (!isOnChatPage()) return;

  const dom = getChatDom();

  let chats = loadChatsFromCache();
  let currentChatId = null;

  const persist = () => saveChatsToCache(chats);

  const refreshLists = () => {
    renderChatList(dom, {
      chats,
      currentChatId,
      onSelect: setCurrentChat,
      onClear: clearConversation,
    });
    renderUploadHistory(dom, {
      chats,
      currentChatId,
      onSelect: setCurrentChat,
      onDelete: deleteUpload,
    });
    renderConversationTopics(dom, { chats, currentChatId, onSelect: setCurrentChat });
  };

  const normalizeServerMessages = (serverMessages) =>
    (serverMessages || []).map((m) => ({
      type: m.role === 'user' ? 'sent' : 'received',
      text: m.text,
      time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

  const ensureServerChat = async (chat) => {
    ensureClientId(chat);
    if (chat.serverId) return chat.serverId;
    const created = await createChatOnServer({
      clientId: chat.clientId,
      title: chat.name || 'Chat',
      description: '',
    });
    chat.serverId = created?.id || chat.serverId;
    return chat.serverId;
  };

  const hydrateFromServer = async () => {
    try {
      const serverChats = await fetchMyChats();
      chats = mergeServerChatsIntoLocal(chats, serverChats);
      persist();
      refreshLists();
    } catch (e) {
      refreshLists();
    }
  };

  // Initial render + background hydrate
  refreshLists();
  hydrateFromServer();

  function triggerFileUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.csv';
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) startNewChat(e.target.files[0]);
    };
    fileInput.click();
  }

  function startNewChat(file) {
    const chatId = Date.now();
    const chatName =
      file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
    const fileType = file.name.split('.').pop().toUpperCase();
    const fileSize = formatFileSize(file.size);

    const newChat = {
      id: chatId,
      clientId: null,
      serverId: null,
      name: chatName,
      fileType,
      fileSize,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [],
      firstUserMessage: null,
    };
    ensureClientId(newChat);

    chats.unshift(newChat);
    currentChatId = chatId;
    persist();

    renderChatInterface(dom, file);
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(newChat.name);
    refreshLists();

    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  function setCurrentChat(chat) {
    currentChatId = chat.id;
    if (dom.chatTitle) dom.chatTitle.textContent = `Chat about ${chat.name || 'Chat'}`;
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(chat.name);
    renderExistingChat(dom, chat);
    if (dom.chatInputArea) dom.chatInputArea.style.display = 'block';
    dom.messageInput?.focus();
    refreshLists();
    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  function resetToInitialState() {
    renderWelcome(dom);

    // Re-acquire replaced DOM nodes
    dom.uploadArea = document.getElementById('chatUploadArea');
    dom.uploadFileBtn = document.getElementById('uploadFileBtn');

    dom.uploadArea?.addEventListener('click', triggerFileUpload);
    dom.uploadFileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerFileUpload();
    });

    if (dom.chatInputArea) dom.chatInputArea.style.display = 'none';
    if (dom.chatTitle) dom.chatTitle.textContent = 'New Chat';
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = 'No Document';
    currentChatId = null;
    refreshLists();
    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  async function clearConversation(chat) {
    chat.messages = [];
    chat.firstUserMessage = null;
    renderMessages(dom, chat);
    persist();
    refreshLists();
    try {
      const serverId = await ensureServerChat(chat);
      if (serverId) await clearChatOnServer({ serverId });
    } catch (e) {}
  }

  async function deleteUpload(chat) {
    const wasCurrent = chat.id === currentChatId;
    chats = chats.filter((c) => c !== chat);
    persist();
    if (wasCurrent) resetToInitialState();
    else refreshLists();
    try {
      if (chat.serverId) await deleteChatOnServer({ serverId: chat.serverId });
    } catch (e) {}
  }

  function sendMessage() {
    if (!dom.messageInput || !currentChatId) return;
    const messageText = dom.messageInput.value.trim();
    if (!messageText) return;

    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;

    chat.messages.push({
      type: 'sent',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    if (!chat.firstUserMessage) chat.firstUserMessage = messageText;

    dom.messageInput.value = '';
    renderMessages(dom, chat);
    persist();
    refreshLists();

    (async () => {
      try {
        await ensureServerChat(chat);
        if (chat.serverId) {
          const updated = await addMessageOnServer({ serverId: chat.serverId, text: messageText });
          if (updated?.messages) {
            chat.messages = normalizeServerMessages(updated.messages);
            renderMessages(dom, chat);
            persist();
            refreshLists();
          }
        }
      } catch (e) {
        try {
          if (chat.serverId) {
            await syncChatOnServer({
              serverId: chat.serverId,
              clientId: chat.clientId,
              title: chat.name,
              description: '',
              messages: chat.messages.map((m) => ({
                role: m.type === 'sent' ? 'user' : 'assistant',
                text: m.text,
                createdAt: new Date().toISOString(),
              })),
              lastActivityAt: new Date().toISOString(),
            });
          }
        } catch (_) {}
      }
    })();
  }

  // Wire UI events
  dom.uploadArea?.addEventListener('click', triggerFileUpload);
  dom.uploadFileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerFileUpload();
  });

  dom.newChatBtn?.addEventListener('click', resetToInitialState);

  dom.sendBtn?.addEventListener('click', sendMessage);
  dom.messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  dom.clearAllConversationsBtn?.addEventListener('click', async () => {
    chats.forEach((c) => {
      c.messages = [];
      c.firstUserMessage = null;
    });
    if (currentChatId) {
      const current = chats.find((c) => c.id === currentChatId);
      if (current) renderMessages(dom, current);
    }
    persist();
    refreshLists();
    try {
      await clearAllChatsOnServer();
    } catch (e) {}
  });

  dom.deleteAllUploadsBtn?.addEventListener('click', async () => {
    const hasAnyServer = chats.some((c) => Boolean(c.serverId));
    chats = [];
    currentChatId = null;
    resetToInitialState();
    persist();
    try {
      if (hasAnyServer) await deleteAllChatsOnServer();
    } catch (e) {}
  });

  dom.settingsBtn?.addEventListener('click', () =>
    alert('Settings dialog would open here. This is a demo interface.'),
  );
  dom.helpBtn?.addEventListener('click', () =>
    alert(
      'SentReader Help:\n\n1. Upload a file to start a new chat\n2. Ask questions about your document\n3. SentReader will analyze and respond based on the content\n\nThis is a demo interface.',
    ),
  );

  // Task 7.2 — Wire sidebar view-switching
  if (dom.sidebarFileBtn && dom.sidebarFolderBtn && dom.tocView && dom.docsView) {
    dom.sidebarFileBtn.addEventListener('click', () => {
      dom.tocView.style.display = 'block';
      dom.docsView.style.display = 'none';
      dom.sidebarFileBtn.classList.add('sidebar-head-btn-active');
      dom.sidebarFolderBtn.classList.remove('sidebar-head-btn-active');
    });

    dom.sidebarFolderBtn.addEventListener('click', () => {
      dom.docsView.style.display = 'block';
      dom.tocView.style.display = 'none';
      dom.sidebarFolderBtn.classList.add('sidebar-head-btn-active');
      dom.sidebarFileBtn.classList.remove('sidebar-head-btn-active');
    });
  }

  // Emoji picker for chat input
  const emojiPickerBtn = document.getElementById('emoji-picker-btn');
  const chatMessageInput = document.querySelector('#bottomPanel .message-input');
  const EmojiMart = window.EmojiMart;
  if (emojiPickerBtn && chatMessageInput && EmojiMart?.Picker) {
    const picker = new EmojiMart.Picker({
      theme: 'light',
      skinTonePosition: 'none',
      previewPosition: 'none',
      onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = chatMessageInput;
        chatMessageInput.setRangeText(emoji.native, start, end, 'end');
        chatMessageInput.focus();
        document.body.classList.remove('show-chat-emoji-picker');
      },
      onClickOutside: (e) => {
        if (e.target === emojiPickerBtn || emojiPickerBtn.contains(e.target)) {
          document.body.classList.toggle('show-chat-emoji-picker');
        } else {
          document.body.classList.remove('show-chat-emoji-picker');
        }
      },
    });
    // Mount picker relative to the chat form
    const chatForm = document.querySelector('#bottomPanel .chat-form');
    if (chatForm) chatForm.appendChild(picker);
    emojiPickerBtn.addEventListener('click', () => {
      document.body.classList.toggle('show-chat-emoji-picker');
    });
  }
}

