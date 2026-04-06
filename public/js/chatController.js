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
  renderUsageInfo,
  renderSubscriptionInfo,
  logRagError,
  renderRagDocsView,
  renderQuestionSuggestionsView,
  renderTocView,
  showTocSpinner,
  setChatInputState,
  renderIngestProgress,
  renderPostIngestGate,
  renderRagWelcomeMessage,
  renderTocLoadingCard,
} from './chatView';

import { ct } from './i18n';
import { setBottomPanelOpen, openLeftSidebarWithOverlay } from './sidebarToggle';

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.ok ? 'Invalid response from server' : `Server error (${res.status})`,
    );
  }
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 15000) {
  const timerHost = typeof window !== 'undefined' ? window : globalThis;
  const controller = new AbortController();
  const timeoutId = timerHost.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    timerHost.clearTimeout(timeoutId);
  }
}

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
  const refreshSubscriptionPanels = async () => {
    if (!dom.subscriptionInfo && !dom.usageInfo) return;

    try {
      const res = await fetch('/api/v1/billing/my-subscription', {
        credentials: 'include',
      });
      const data = await res.json();
      const subscription = data?.data?.subscription || null;

      renderSubscriptionInfo(dom, subscription);
      renderUsageInfo(dom, subscription);
    } catch (e) {
      renderSubscriptionInfo(dom, null);
      renderUsageInfo(dom, null);
    }
  };

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
  refreshSubscriptionPanels();

  // RAG state — tracks the active group for the current session
  let ragGroupId = null;

  function showSidebarView(view) {
    const views = [
      ['toc', dom.tocView, dom.sidebarFileBtn],
      ['questions', dom.questionsView, dom.sidebarQuestionsBtn],
      ['docs', dom.docsView, dom.sidebarFolderBtn],
    ];

    views.forEach(([key, el, btn]) => {
      if (el) el.style.display = key === view ? 'block' : 'none';
      if (btn) btn.classList.toggle('sidebar-head-btn-active', key === view);
    });
  }

  function draftQuestion(chat, question) {
    if (!chat || !question) return;
    chat.pendingTocQuestion = question;
    persist();
    setBottomPanelOpen(true);

    if (!needsRagGate(chat) && dom.messageInput && !dom.messageInput.disabled) {
      dom.messageInput.value = question;
      dom.messageInput.focus();
    }
  }

  function tocPrompt(item) {
    return `Explain or summarize the section "${item.label}" based on the document.`;
  }

  function getQuestionSuggestions(chat, docs = []) {
    const docSuggestions = (docs || []).flatMap((doc) =>
      (doc.questionSuggestions || []).map((item) => ({
        ...item,
        filename: doc.originalFilename || chat?.name || '',
      })),
    );

    if (docSuggestions.length > 0) return docSuggestions;
    return (chat?.questionSuggestions || []).map((item) => ({
      ...item,
      filename: item.filename || chat?.name || '',
    }));
  }

  function renderSidebarData(chat, docs = []) {
    const tocList =
      chat?.toc && chat.toc.length > 0
        ? chat.toc
        : [{ id: 'toc-1', label: chat?.name || 'Document', level: 1 }];

    renderTocView(dom, tocList, {
      onSectionClick: (item) => draftQuestion(chat, tocPrompt(item)),
    });

    renderQuestionSuggestionsView(dom, getQuestionSuggestions(chat, docs), {
      onQuestionClick: (item) => draftQuestion(chat, item.question),
    });

    if (docs.length > 0) {
      renderRagDocsView(dom, { docs });
    }
  }

  function needsRagGate(chat) {
    if (!chat || !chat.ragGroupId) return false;
    if (chat.ragChatStarted === true) return false;
    if (chat.ragChatStarted === false) return true;
    return !(chat.messages && chat.messages.length > 0);
  }

  function beginRagChatting(chat) {
    if (!chat) return;
    chat.ragChatStarted = true;
    persist();
    renderRagWelcomeMessage(dom, chat);
    setChatInputState(dom, 'open');
    if (chat.pendingTocQuestion && dom.messageInput) {
      dom.messageInput.value = chat.pendingTocQuestion;
      chat.pendingTocQuestion = '';
      persist();
    }
    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
    initChatEmoji();
    dom.messageInput?.focus();
  }

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
      name: chatName, fileType, fileSize, fileSizeBytes: file.size,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [], firstUserMessage: null,
      ragChatStarted: false,
      pendingTocQuestion: '',
      questionSuggestions: [],
    };
    ensureClientId(newChat);
    chats.unshift(newChat);
    currentChatId = chatId;
    persist();

    renderIngestProgress(dom, file);
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(newChat.name);

    // ── Show processing state ───────────────────────────────
    // 1. Show spinner in TOC view
    showTocSpinner(dom, file.name);

    // 2. Disable input while processing
    setChatInputState(dom, 'processing');

    // 3. Open bottom panel but keep input locked
    setBottomPanelOpen(true);
    initChatEmoji();
    refreshLists();

    // ── RAG ingest ──────────────────────────────────────────
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('groupName', chatName);

      const res = await fetchWithTimeout('/api/v1/rag/ingest', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }, 45000);
      const data = await parseJsonResponse(res);

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
      const questionSuggestions = firstDoc?.questionSuggestions || [];
      newChat.toc = toc;
      newChat.questionSuggestions = questionSuggestions;
      persist();

      // Populate left sidebar Docs view
      renderRagDocsView(dom, { docs });

      // Populate sidebar insights from extracted headings and per-page suggestions
      const tocList = toc.length > 0 ? toc : [{ id: 'toc-1', label: chatName, level: 1 }];
      renderSidebarData(newChat, docs);

      // Switch left sidebar to TOC view to confirm upload
      showSidebarView('toc');

      // Main area: gate before first RAG message
      renderPostIngestGate(dom, newChat, tocList.length);
      setChatInputState(dom, 'gate');

      // Update model info tab
      renderModelInfo(dom, {});
      refreshSubscriptionPanels();

      console.log(`[RAG] Ingested into group: ${ragGroupId}, TOC items: ${toc.length}`);

      // Phones / tablets: open left panel so TOC is visible immediately
      openLeftSidebarWithOverlay();
    } catch (err) {
      const displayMessage = /timed out/i.test(err.message || '')
        ? ct(
            'chat.processingTimeout',
            {},
            'Document processing took too long. Please try again.',
          )
        : err.message;
      console.error('[RAG] Ingest error:', displayMessage);
      logRagError(dom, `Ingest failed: ${displayMessage}`);
      if (dom.tocView) {
        dom.tocView.innerHTML = `<p style="padding:1.2rem 1.6rem;font-size:1.3rem;color:#e53e3e"><i class="fas fa-exclamation-circle" style="margin-right:.6rem"></i>Processing failed: ${displayMessage}</p>`;
      }
      renderQuestionSuggestionsView(dom, []);
      setChatInputState(dom, 'open');
      dom.messageInput?.focus();
    }

    if (window.innerWidth <= 1200) {
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  function setCurrentChat(chat) {
    currentChatId = chat.id;
    ragGroupId = chat.ragGroupId || null;
    if (dom.chatTitle) {
      dom.chatTitle.textContent = ct(
        'chat.chatAbout',
        { name: chat.name || ct('chat.chatFallback', {}, 'Chat') },
        `Chat about ${chat.name || 'Chat'}`,
      );
    }
    if (dom.sidebarDocTitle) dom.sidebarDocTitle.textContent = truncateToTwoWords(chat.name);
    setBottomPanelOpen(true);
    initChatEmoji();

    const applyRagGateUi = (tocList) => {
      renderPostIngestGate(dom, chat, tocList.length);
      setChatInputState(dom, 'gate');
      renderSidebarData(chat);
      showSidebarView('toc');
    };

    if (needsRagGate(chat)) {
      const cached = chat.toc && chat.toc.length > 0 ? chat.toc : null;
      if (cached) {
        applyRagGateUi(cached);
      } else {
        renderTocLoadingCard(dom, chat);
        setChatInputState(dom, 'processing');
      }
    } else {
      renderExistingChat(dom, chat);
      setChatInputState(dom, 'open');
      dom.messageInput?.focus();
      if (chat.toc && chat.toc.length > 0) renderSidebarData(chat);
      showSidebarView(chat.toc && chat.toc.length > 0 ? 'toc' : 'questions');
    }

    if (ragGroupId) {
      fetchWithTimeout(`/api/v1/rag/groups/${ragGroupId}/docs`, { credentials: 'include' }, 15000)
        .then(async (r) => {
          const data = await parseJsonResponse(r);
          if (!r.ok || data.status !== 'success') {
            throw new Error(
              data.message ||
                ct(
                  'chat.ragSessionLoadFailed',
                  {},
                  'Could not finish loading this document. Please upload it again.',
                ),
            );
          }
          const docs = data.data.docs || [];
          const fromServer = docs[0]?.toc;
          const suggestionDocs = docs.some((doc) => Array.isArray(doc.questionSuggestions));
          if (fromServer && Array.isArray(fromServer) && fromServer.length > 0) {
            chat.toc = fromServer;
          }
          if (suggestionDocs) {
            chat.questionSuggestions = docs[0]?.questionSuggestions || chat.questionSuggestions || [];
          }
          persist();
          renderSidebarData(chat, docs);
          if (needsRagGate(chat)) {
            const tocList =
              chat.toc && chat.toc.length > 0
                ? chat.toc
                : [{ id: 'toc-1', label: chat.name || 'Document', level: 1 }];
            applyRagGateUi(tocList);
          }
        })
        .catch((err) => {
          const message = /timed out/i.test(err.message || '')
            ? ct(
                'chat.processingTimeout',
                {},
                'Document processing took too long. Please try again.',
              )
            : err.message ||
              ct(
                'chat.ragSessionLoadFailed',
                {},
                'Could not finish loading this document. Please upload it again.',
              );

          logRagError(dom, message);

          if (needsRagGate(chat)) {
            chat.ragGroupId = null;
            ragGroupId = null;
            persist();
            renderExistingChat(dom, chat);
            setChatInputState(dom, 'open');
          }
        });
    }

    refreshLists();
    if (window.innerWidth <= 1200) {
      if (!needsRagGate(chat)) {
        dom.leftSidebar?.classList.remove('show-sidebar');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
      }
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

    if (dom.chatTitle) dom.chatTitle.textContent = ct('chat.pageTitleNew', {}, 'New Chat');
    if (dom.sidebarDocTitle) {
      dom.sidebarDocTitle.textContent = ct('chat.sidebarNoDoc', {}, 'No Document');
    }
    if (dom.tocView) {
      dom.tocView.innerHTML = `<p class="rag-empty-hint" style="padding:1.2rem 1.6rem;font-size:1.3rem;color:hsl(210,40%,65%)"><i class="fas fa-list-ul" style="margin-right:.6rem"></i>${ct('chat.tocEmpty', {}, 'Upload a document to see its table of contents')}</p>`;
    }
    renderQuestionSuggestionsView(dom, []);
    renderRagDocsView(dom, { docs: [] });
    showSidebarView('toc');
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
    if (needsRagGate(chat)) return;

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
      const language =
        dom.ragLangSelect?.value ||
        document.documentElement.getAttribute('data-language') ||
        'en';

      // Pass last 8 messages as conversation history for context
      const history = (chat.messages || [])
        .slice(-8)
        .map(m => ({ role: m.type, text: m.text }));

      fetchWithTimeout('/api/v1/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question: messageText,
          groupId: ragGroupId,
          language,
          history,
        }),
      }, 45000)
        .then(async (r) => {
          const data = await parseJsonResponse(r);
          if (!r.ok) throw new Error(data.message || ct('chat.ragFailure', {}, 'RAG search failed. Please try again.'));
          return data;
        })
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
          refreshSubscriptionPanels();
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
            refreshSubscriptionPanels();
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
    alert(
      ct(
        'chat.settingsAlert',
        {},
        'Use the header controls to switch theme or language. The guided tour can walk you through the rest of the workspace.',
      ),
    ),
  );
  dom.helpBtn?.addEventListener('click', () =>
    alert(ct('chat.helpAlert', {}, 'Use the tour for a step-by-step guide: upload a file, open a chat, ask questions, and review your history from the side panels.')),
  );

  dom.chatContent?.addEventListener('click', (e) => {
    if (e.target.closest('#startRagChatBtn')) {
      e.preventDefault();
      const chat = chats.find((c) => c.id === currentChatId);
      beginRagChatting(chat);
    }
  });

  // Task 7.2 — Wire sidebar view-switching
  if (
    dom.sidebarFileBtn &&
    dom.sidebarQuestionsBtn &&
    dom.sidebarFolderBtn &&
    dom.tocView &&
    dom.questionsView &&
    dom.docsView
  ) {
    dom.sidebarFileBtn.addEventListener('click', () => showSidebarView('toc'));
    dom.sidebarQuestionsBtn.addEventListener('click', () => showSidebarView('questions'));
    dom.sidebarFolderBtn.addEventListener('click', () => showSidebarView('docs'));
  }

  // Emoji picker for chat input — mounted on body to avoid overflow/clipping
  let chatEmojiReady = false;
  let chatPickerEl = null;
  let chatPickerVisible = false;
  let chatEmojiPicker = null;

  const syncChatEmojiTheme = () => {
    if (!chatEmojiPicker) return;
    const theme =
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'dark'
        : 'light';
    chatEmojiPicker.setAttribute('theme', theme);
    chatEmojiPicker.theme = theme;
  };

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
      theme:
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? 'dark'
          : 'light',
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
    chatEmojiPicker = picker;

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
  window.addEventListener('myreader:theme-change', syncChatEmojiTheme);
}

