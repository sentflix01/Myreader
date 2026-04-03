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
  renderRagInfo,
  renderTokenInfo,
  renderModelInfo,
  logRagError,
  renderRagDocsView,
  renderTocView,
  showTocSpinner,
  setInputLocked,
} from './chatView';

import { setBottomPanelOpen } from './sidebarToggle';

export function initChat() {
  if (!isOnChatPage()) return;

  // ── Clear any other users' cached data from this browser ───
  // Reads the current user ID from the meta tag injected by base.pug
  const metaUserId = document.querySelector('meta[name="user-id"]')?.content;
  if (metaUserId) {
    import('./chatModel').then(({ clearOtherUsersCaches }) => {
      clearOtherUsersCaches(metaUserId);
    }).catch(() => {});
  }

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
  // Clear any stale ragGroupIds from sessions where the server was restarted
  // (vectors are gone, re-upload is required)
  chats = chats.map(c => {
    if (c.ragGroupId) {
      // Keep ragGroupId but mark it as needing verification
      return c;
    }
    return c;
  });
  refreshLists();
  hydrateFromServer();

  // RAG state — tracks the active group for the current session
  let ragGroupId = null;

  function triggerFileUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.xlsx,.txt,.html';
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) startNewChat(e.target.files[0]);
    };
    fileInput.click();
  }

  async function startNewChat(file) {
    const chatId   = Date.now();
    const chatName = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
    const fileType = file.name.split('.').pop().toUpperCase();
    const fileSize = formatFileSize(file.size);

    const newChat = {
      id: chatId, clientId: null, serverId: null,
      name: chatName, fileType, fileSize,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [], firstUserMessage: null,
    };
    ensureClientId(newChat);
    chats.unshift(newChat);
    currentChatId = chatId;
    persist();

    renderChatInterface(dom, file);
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(newChat.name);

    // ── Show processing state ───────────────────────────────
    // 1. Show spinner in TOC view
    showTocSpinner(dom, file.name);

    // 2. Disable input + send button while processing
    setInputLocked(dom, true);

    // 3. Open bottom panel but keep input locked
    setBottomPanelOpen(true);
    initChatEmoji();
    refreshLists();

    // ── RAG ingest ──────────────────────────────────────────
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('groupName', chatName);

      const res  = await fetch('/api/v1/rag/ingest', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Ingest failed');

      // Check if the doc actually succeeded (not just HTTP 201)
      const docs = data.data.docs || [];
      const failedDoc = docs.find(d => d.status === 'failed');
      if (failedDoc) throw new Error(failedDoc.error || 'Document processing failed');
      if (!docs.length || !docs[0].docId) throw new Error('No documents were processed');

      ragGroupId = data.data.groupId;
      newChat.ragGroupId = ragGroupId;

      // Cache TOC on the chat object so it survives page reloads
      const firstDoc = docs[0];
      const toc = firstDoc?.toc || [];
      newChat.toc = toc;
      persist();

      // Populate left sidebar Docs view
      renderRagDocsView(dom, { docs });

      // Populate TOC from real extracted headings
      if (toc.length > 0) {
        renderTocView(dom, toc);
      } else {
        renderTocView(dom, [{ id: 'toc-1', label: chatName, level: 1 }]);
      }

      // Switch left sidebar to TOC view to confirm upload
      if (dom.tocView) dom.tocView.style.display = 'block';
      if (dom.docsView) dom.docsView.style.display = 'none';
      if (dom.sidebarFileBtn) dom.sidebarFileBtn.classList.add('sidebar-head-btn-active');
      if (dom.sidebarFolderBtn) dom.sidebarFolderBtn.classList.remove('sidebar-head-btn-active');

      // Update model info tab
      renderModelInfo(dom, {});

      console.log(`[RAG] Ingested into group: ${ragGroupId}, TOC items: ${toc.length}`);

    } catch (err) {
      console.error('[RAG] Ingest error:', err.message);
      logRagError(dom, `Ingest failed: ${err.message}`);
      // Show error in TOC
      if (dom.tocView) {
        dom.tocView.innerHTML = `<p style="padding:1.2rem 1.6rem;font-size:1.3rem;color:#e53e3e"><i class="fas fa-exclamation-circle" style="margin-right:.6rem"></i>Processing failed: ${err.message}</p>`;
      }
    } finally {
      // Always unlock input when done (success or failure)
      setInputLocked(dom, false);
      dom.messageInput?.focus();
    }

    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  function setCurrentChat(chat) {
    currentChatId = chat.id;
    ragGroupId = chat.ragGroupId || null;
    if (dom.chatTitle) dom.chatTitle.textContent = `Chat about ${chat.name || 'Chat'}`;
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(chat.name);
    renderExistingChat(dom, chat);
    setBottomPanelOpen(true);
    // Always unlock input when switching chats — it may have been left locked
    setInputLocked(dom, false);
    initChatEmoji();
    dom.messageInput?.focus();

    // Restore TOC from cached data if available
    if (chat.toc && chat.toc.length > 0) {
      renderTocView(dom, chat.toc);
      if (dom.tocView) dom.tocView.style.display = 'block';
      if (dom.docsView) dom.docsView.style.display = 'none';
      if (dom.sidebarFileBtn) dom.sidebarFileBtn.classList.add('sidebar-head-btn-active');
      if (dom.sidebarFolderBtn) dom.sidebarFolderBtn.classList.remove('sidebar-head-btn-active');
    }

    // If ragGroupId exists but vectors may be gone (server restart), re-ingest silently
    if (ragGroupId) {
      fetch(`/api/v1/rag/groups/${ragGroupId}/docs`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            renderRagDocsView(dom, { docs: data.data.docs || [] });
          }
        })
        .catch(() => {});
    }

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

    if (dom.chatTitle) dom.chatTitle.textContent = 'New Chat';
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = 'No Document';
    setBottomPanelOpen(false);
    ragGroupId = null;
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
    if (!dom.messageInput || dom.messageInput.disabled || !currentChatId) return;
    const messageText = dom.messageInput.value.trim();
    if (!messageText) return;

    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;

    chat.messages.push({
      type: 'sent', text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    if (!chat.firstUserMessage) chat.firstUserMessage = messageText;

    dom.messageInput.value = '';
    renderMessages(dom, chat);
    persist();
    refreshLists();

    // ── RAG path: use RAG service when a group is active ───
    if (ragGroupId) {
      const language = dom.ragLangSelect?.value || 'auto';

      // Pass last 8 messages as conversation history for context
      const history = (chat.messages || [])
        .slice(-8)
        .map(m => ({ role: m.type, text: m.text }));

      fetch('/api/v1/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question: messageText,
          groupId: ragGroupId,
          language,
          history,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.data) {
            // If group not found (server restart wiped vectors), clear ragGroupId
            // and tell user to re-upload
            if (data.message && data.message.includes('not found')) {
              ragGroupId = null;
              const currentChat = chats.find((c) => c.id === currentChatId);
              if (currentChat) { currentChat.ragGroupId = null; persist(); }
              throw new Error('Document session expired. Please upload the file again to continue using RAG.');
            }
            throw new Error(data.message || 'RAG chat failed');
          }
          const { answer, sources, meta } = data.data;

          chat.messages.push({
            type: 'received', text: answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          renderMessages(dom, chat);
          persist();
          refreshLists();

          renderRagInfo(dom, { sources, chunkCount: meta.chunkCount, timeTakenMs: meta.timeTakenMs, groupId: ragGroupId, processedQuery: data.data.processedQuery || '' });
          renderTokenInfo(dom, { tokenCount: meta.tokenCount, timeTakenMs: meta.timeTakenMs });
          renderModelInfo(dom, {});
        })
        .catch((err) => {
          logRagError(dom, err.message);
          chat.messages.push({ type: 'received', text: `⚠ ${err.message}`, time: '' });
          renderMessages(dom, chat);
        });
      return;
    }

    // ── Fallback: original server chat path ────────────────
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
              serverId: chat.serverId, clientId: chat.clientId, title: chat.name,
              description: '',
              messages: chat.messages.map((m) => ({
                role: m.type === 'sent' ? 'user' : 'assistant',
                text: m.text, createdAt: new Date().toISOString(),
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
  dom.messageInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !dom.messageInput.disabled) {
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

  // Emoji picker for chat input — mounted on body to avoid overflow/clipping
  let chatEmojiReady = false;
  let chatPickerEl = null;
  let chatPickerVisible = false;

  const initChatEmoji = () => {
    if (chatEmojiReady) return;
    const emojiPickerBtn = document.getElementById('emoji-picker-btn');
    const chatMessageInput = document.querySelector('#bottomPanel .message-input');
    const EmojiMart = window.EmojiMart;
    if (!emojiPickerBtn || !chatMessageInput || !EmojiMart?.Picker) return;
    chatEmojiReady = true;

    // Create a wrapper div mounted directly on body — no clipping
    const wrapper = document.createElement('div');
    wrapper.id = 'chat-emoji-wrapper';
    wrapper.style.cssText = [
      'position:fixed',
      'z-index:99999',
      'display:none',
    ].join(';');
    document.body.appendChild(wrapper);

    const picker = new EmojiMart.Picker({
      theme: 'light',
      skinTonePosition: 'none',
      previewPosition: 'none',
      onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = chatMessageInput;
        chatMessageInput.setRangeText(emoji.native, start, end, 'end');
        chatMessageInput.focus();
        hidePicker();
      },
      onClickOutside: (e) => {
        if (e.target === emojiPickerBtn || emojiPickerBtn.contains(e.target)) return;
        hidePicker();
      },
    });
    wrapper.appendChild(picker);
    chatPickerEl = wrapper;

    function showPicker() {
      wrapper.style.display = 'block';

      const btnRect = emojiPickerBtn.getBoundingClientRect();
      const pickerRect = wrapper.getBoundingClientRect();
      const pickerW = pickerRect.width || 352;
      const pickerH = pickerRect.height || 400;
      const margin = 8;

      // Constrain right edge to the main chat area (not over right sidebar)
      const chatArea = document.querySelector('.main-chat-area');
      const chatAreaRect = chatArea
        ? chatArea.getBoundingClientRect()
        : { left: margin, right: window.innerWidth - margin };
      const maxRight = chatAreaRect.right - margin;
      const minLeft  = chatAreaRect.left  + margin;

      // Vertical: prefer above the button, fall back to below
      let top = btnRect.top - pickerH - margin;
      if (top < margin) top = btnRect.bottom + margin;

      // Horizontal: align to button left, clamp inside chat area
      let left = btnRect.left;
      if (left + pickerW > maxRight) left = maxRight - pickerW;
      if (left < minLeft) left = minLeft;

      wrapper.style.top  = top  + 'px';
      wrapper.style.left = left + 'px';
      chatPickerVisible = true;
    }

    function hidePicker() {
      wrapper.style.display = 'none';
      chatPickerVisible = false;
    }

    emojiPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chatPickerVisible ? hidePicker() : showPicker();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!chatPickerVisible) return;
      if (wrapper.contains(e.target) || e.target === emojiPickerBtn) return;
      hidePicker();
    });
  };

  document.getElementById('toggleBottomPanel')?.addEventListener('click', initChatEmoji);
  document.getElementById('closeBottomPanel')?.addEventListener('click', () => {
    chatPickerEl && (chatPickerEl.style.display = 'none');
    chatPickerVisible = false;
  });
}

