/* eslint-disable */
import axios from 'axios';
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

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true;

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
} from './chatView';

export function initChat() {
  if (!isOnChatPage()) return;

  try {
    const dom = getChatDom();

    // Debug: Check if upload elements exist
    console.log('Upload elements found:', {
      uploadArea: !!dom.uploadArea,
      uploadFileBtn: !!dom.uploadFileBtn,
      uploadAreaId: dom.uploadArea?.id,
      uploadBtnId: dom.uploadFileBtn?.id,
    });

    let chats = loadChatsFromCache();
    let currentChatId = null;

    const persist = () => {
      try {
        saveChatsToCache(chats);
      } catch (error) {
        console.error('Failed to save chats to cache:', error);
      }
    };

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
    renderConversationTopics(dom, {
      chats,
      currentChatId,
      onSelect: setCurrentChat,
    });
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
      file: chat.docId || undefined,
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
    console.log('triggerFileUpload called!');
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.doc,.docx,.txt,.html,.json,.csv';
      fileInput.onchange = (e) => {
        console.log('File input changed:', e.target.files.length, 'files');
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          
          // Validate file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
          }
          
          // Validate file type
          const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'html', 'json', 'csv'];
          const fileExtension = file.name.split('.').pop().toLowerCase();
          if (!allowedTypes.includes(fileExtension)) {
            alert('Please select a supported file type: ' + allowedTypes.join(', '));
            return;
          }
          
          startNewChat(file);
        }
      };
      fileInput.click();
    } catch (error) {
      console.error('Error triggering file upload:', error);
      alert('Failed to open file selector. Please try again.');
    }
  }

  async function uploadDocumentToServer(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/api/v1/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout
      });
      return response.data;
    } catch (err) {
      console.error(
        'uploadDocumentToServer failed',
        err?.response?.data || err,
      );
      
      let errorMessage = 'Network error during upload';
      if (err?.response?.status === 413) {
        errorMessage = 'File too large. Please select a smaller file.';
      } else if (err?.response?.status === 415) {
        errorMessage = 'Unsupported file type. Please select a different file.';
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.';
      }
      
      return {
        status: 'error',
        message: errorMessage,
      };
    }
  }

  async function startNewChat(file) {
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
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      messages: [],
      firstUserMessage: null,
      status: 'uploading',
    };
    ensureClientId(newChat);

    chats.unshift(newChat);
    currentChatId = chatId;
    persist();

    renderChatInterface(dom, file);
    refreshLists();

    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }

    try {
      const uploadResult = await uploadDocumentToServer(file);
      const uploadedDoc = uploadResult?.data?.document || null;
      console.log('Document upload result:', uploadResult);

      if (uploadResult && uploadResult.status === 'warning') {
        alert(
          'File processed with warnings: ' +
            (uploadResult.message || 'check logs'),
        );
      }

      const isUploadOK =
        uploadResult?.status === 'success' ||
        uploadResult?.status === 'warning';

      if (!uploadedDoc || !isUploadOK) {
        newChat.status = 'failed';
        persist();
        alert(
          'File upload failed: ' +
            (uploadResult?.message || 'Please check your file and try again.'),
        );
        return;
      }

      newChat.status = 'ready';
      newChat.docId = uploadedDoc._id;
      newChat.fileName = uploadedDoc.originalFileName;

      // Create server chat and link it to the uploaded document
      console.log('Creating chat with document ID:', uploadedDoc._id);
      const createdChat = await createChatOnServer({
        clientId: newChat.clientId,
        title: newChat.name || 'Chat',
        description: '',
        file: uploadedDoc._id,
      });

      console.log('Chat created:', createdChat);
      if (createdChat?.id) {
        newChat.serverId = createdChat.id;
      }

      // ✅ Enable chat input and controls after successful upload
      if (dom.messageInput) {
        dom.messageInput.disabled = false;
        dom.messageInput.removeAttribute('data-i18n-placeholder');
        dom.messageInput.placeholder = 'Ask questions about your document...';
      }
      if (dom.sendBtn) dom.sendBtn.disabled = false;
      if (document.getElementById('chatEmojiBtn'))
        document.getElementById('chatEmojiBtn').disabled = false;
      dom.messageInput?.focus();

      persist();
      renderChatInterface(dom, file);
      refreshLists();
    } catch (e) {
      console.error('Upload or chat creation failed:', e);
      newChat.status = 'failed';
      persist();
      alert('File upload failed. Please try again.');
    }
  }

  function setCurrentChat(chat) {
    currentChatId = chat.id;
    dom.chatTitle.textContent = 'Chat about ' + (chat.name || 'Chat');
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
    
    // Validate message length
    if (messageText.length > 1000) {
      alert('Message is too long. Please keep it under 1000 characters.');
      return;
    }

    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) {
      alert('Chat not found. Please try again.');
      return;
    }
    
    if (chat.status !== 'ready') {
      alert('Please wait for the document to finish processing before sending messages.');
      return;
    }

    try {
      chat.messages.push({
        type: 'sent',
        text: messageText,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      if (!chat.firstUserMessage) chat.firstUserMessage = messageText;

      dom.messageInput.value = '';
      renderMessages(dom, chat);
      persist();
      refreshLists();

      // Disable input while processing
      if (dom.messageInput) dom.messageInput.disabled = true;
      if (dom.sendBtn) dom.sendBtn.disabled = true;

      (async () => {
        try {
          await ensureServerChat(chat);
          if (chat.serverId) {
            const updated = await addMessageOnServer({
              serverId: chat.serverId,
              text: messageText,
            });
            if (updated?.messages) {
              chat.messages = normalizeServerMessages(updated.messages);
              renderMessages(dom, chat);
              persist();
              refreshLists();
            }
          }
        } catch (e) {
          console.error('Failed to send message:', e);
          // Add error message to chat
          chat.messages.push({
            type: 'received',
            text: 'Sorry, I encountered an error processing your message. Please try again.',
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
          renderMessages(dom, chat);
          persist();
          refreshLists();
        } finally {
          // Re-enable input
          if (dom.messageInput) dom.messageInput.disabled = false;
          if (dom.sendBtn) dom.sendBtn.disabled = false;
          dom.messageInput?.focus();
        }
      })();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  // Wire UI events with error handling
  try {
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
  } catch (error) {
    console.error('Error wiring UI events:', error);
  }

  // ✅ Wire chat emoji picker (copy from sentbot.js)
  const chatEmojiBtn = document.getElementById('chatEmojiBtn');
  const chatComposer = document.getElementById('chatComposer');
  if (chatEmojiBtn && chatComposer) {
    const EmojiMart = window.EmojiMart;
    if (EmojiMart?.Picker) {
      const picker = new EmojiMart.Picker({
        theme:
          document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
        skinTonePosition: 'none',
        previewPosition: 'none',
        onEmojiSelect: (emoji) => {
          const start = dom.messageInput.selectionStart;
          const end = dom.messageInput.selectionEnd;
          dom.messageInput.setRangeText(emoji.native, start, end, 'end');
          dom.messageInput.focus();
          dom.messageInput.dispatchEvent(new Event('input'));
        },
      });
      chatComposer.appendChild(picker);
      chatEmojiBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatComposer.classList.toggle('is-emoji-open');
      });
    }
  }

  dom.toggleLeftBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dom.rightSidebar?.classList.contains('show-sidebar'))
      dom.rightSidebar.classList.remove('show-sidebar');
    dom.leftSidebar?.classList.toggle('show-sidebar');
  });

  dom.toggleRightBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dom.leftSidebar?.classList.contains('show-sidebar'))
      dom.leftSidebar.classList.remove('show-sidebar');
    dom.rightSidebar?.classList.toggle('show-sidebar');
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1200) {
      const isInsideLeft =
        dom.leftSidebar && dom.leftSidebar.contains(e.target);
      const isInsideRight =
        dom.rightSidebar && dom.rightSidebar.contains(e.target);
      const isToggleLeft =
        dom.toggleLeftBtn && dom.toggleLeftBtn.contains(e.target);
      const isToggleRight =
        dom.toggleRightBtn && dom.toggleRightBtn.contains(e.target);

      if (
        !isInsideLeft &&
        !isToggleLeft &&
        dom.leftSidebar &&
        dom.leftSidebar.classList.contains('show-sidebar')
      )
        dom.leftSidebar.classList.remove('show-sidebar');

      if (
        !isInsideRight &&
        !isToggleRight &&
        dom.rightSidebar &&
        dom.rightSidebar.classList.contains('show-sidebar')
      )
        dom.rightSidebar.classList.remove('show-sidebar');
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

  if (dom.settingsBtn)
    dom.settingsBtn.addEventListener('click', () => {
      alert('Settings dialog would open here. This is a demo interface.');
    });
  if (dom.helpBtn)
    dom.helpBtn.addEventListener('click', () => {
      alert(
        'MyReader Help: Upload a file to start a new chat, ask questions about your document, MyReader will analyze and respond based on the content. This is a demo interface.',
      );
    });
  } catch (error) {
    console.error('Error initializing chat:', error);
    // Show user-friendly error message
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.innerHTML = `
        <div class="error-message">
          <h3>Chat initialization failed</h3>
          <p>Please refresh the page and try again.</p>
          <button onclick="location.reload()">Refresh Page</button>
        </div>
      `;
    }
  }
}

