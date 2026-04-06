import { delegate } from '../../core/domDelegate';
import { t } from '../preferences/preferences.page';
import {
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
  streamMessageOnServer,
  uploadDocument,
  uploadFolder,
} from './chat.model';
import {
  getChatDom,
  isOnChatPage,
  formatFileSize,
  renderChatInterface,
  renderChatList,
  renderConversationTopics,
  renderExistingChat,
  renderMessages,
  renderScopeDocuments,
  renderUploadHistory,
  renderWelcome,
} from './chat.view';

export function initChatController() {
  if (!isOnChatPage()) return;

  const dom = getChatDom();
  let chats = loadChatsFromCache();
  let currentChatId = null;
  let isStreamingResponse = false;
  const defaultComposerPlaceholder = () =>
    t(
      'chat.composerPlaceholderDisabled',
      {},
      'Upload a file to start asking questions...',
    );
  const readyComposerPlaceholder = () =>
    t(
      'chat.composerPlaceholderReady',
      {},
      'Ask anything about the uploaded document...',
    );
  const folderComposerPlaceholder = () =>
    t(
      'chat.composerPlaceholderFolder',
      {},
      'Ask anything about the uploaded folder...',
    );
  const defaultComposerNote = () =>
    t(
      'chat.composerNote',
      {},
      'Answers will be grounded in your uploaded document.',
    );
  const folderComposerNote = () =>
    t(
      'chat.composerNoteFolder',
      {},
      'Answers will be grounded only in the selected folder documents.',
    );
  const isEnterpriseUser = () =>
    document.body?.dataset?.subscriptionTier === 'enterprise';

  const persist = () => saveChatsFromState(chats);
  function saveChatsFromState(nextChats) {
    saveChatsToCache(nextChats);
  }

  const getCurrentChat = () => chats.find((c) => c.id === currentChatId) || null;

  const refreshLists = () => {
    renderChatList(dom, { chats, currentChatId });
    renderUploadHistory(dom, { chats, currentChatId });
    renderConversationTopics(dom, { chats, currentChatId });
    renderScopeDocuments(dom, getCurrentChat());
  };

  const normalizeServerMessages = (serverMessages) =>
    (serverMessages || []).map((m) => ({
      type: m.role === 'user' ? 'sent' : 'received',
      text: m.text,
      sources: m.sources || null,
      time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

  const normalizeScopeDocuments = (documents = []) =>
    (documents || []).map((item) => ({
      id: item.id || item.document || item._id || null,
      name: item.name || item.originalFileName || '',
      relativePath:
        item.relativePath || item.name || item.originalFileName || '',
      fileType: item.fileType || '',
      fileSize: item.fileSize || 0,
      status: item.status || '',
    }));

  const hasAttachedDocuments = (chat) =>
    Boolean(chat?.docId) ||
    (Array.isArray(chat?.documentIds) && chat.documentIds.length > 0);

  const getApiErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;

  const updateSendButtonState = () => {
    if (!dom.sendBtn || !dom.messageInput) return;
    if (dom.messageInput.disabled || isStreamingResponse) {
      dom.sendBtn.disabled = true;
      return;
    }
    const hasText = Boolean(dom.messageInput.value.trim());
    dom.sendBtn.disabled = !hasText;
  };

  const syncComposerInput = () => {
    if (!dom.messageInput) return;
    dom.messageInput.style.height = '52px';
    dom.messageInput.style.height = `${Math.min(dom.messageInput.scrollHeight, 180)}px`;
    updateSendButtonState();
  };

  const setStreamingState = (streaming) => {
    isStreamingResponse = streaming;
    if (dom.messageInput) {
      dom.messageInput.disabled = streaming;
    }
    if (dom.chatEmojiBtn) dom.chatEmojiBtn.disabled = streaming;
    if (dom.composerUploadBtn) dom.composerUploadBtn.disabled = false;
    if (dom.sendBtn) {
      dom.sendBtn.disabled =
        streaming ||
        Boolean(dom.messageInput?.disabled) ||
        !Boolean(dom.messageInput?.value.trim());
      dom.sendBtn.setAttribute('aria-busy', streaming ? 'true' : 'false');
    }
  };

  const setComposerState = ({
    enabled,
    placeholder = defaultComposerPlaceholder(),
    scopeType = 'document',
  }) => {
    if (!dom.chatInputArea || !dom.messageInput) return;

    dom.chatInputArea.classList.toggle('is-disabled', !enabled);
    dom.messageInput.disabled = isStreamingResponse;
    dom.messageInput.placeholder = placeholder;
    if (dom.chatComposerNote) {
      dom.chatComposerNote.textContent =
        scopeType === 'folder' ? folderComposerNote() : defaultComposerNote();
    }

    if (dom.chatEmojiBtn) dom.chatEmojiBtn.disabled = isStreamingResponse;
    if (dom.composerUploadBtn) dom.composerUploadBtn.disabled = false;
    if (!enabled && dom.chatComposer) dom.chatComposer.classList.remove('is-emoji-open');

    syncComposerInput();
  };

  const insertEmoji = (emoji) => {
    if (!dom.messageInput) return;
    const { selectionStart: start, selectionEnd: end } = dom.messageInput;
    dom.messageInput.setRangeText(emoji, start, end, 'end');
    dom.messageInput.focus();
    dom.messageInput.dispatchEvent(new Event('input'));
  };

  const mountChatEmojiPicker = () => {
    const EmojiMart = window.EmojiMart;
    if (!EmojiMart?.Picker || !dom.chatComposer || !dom.chatEmojiPickerHost) return;
    const pickerTheme =
      document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const existingPicker = dom.chatEmojiPickerHost.querySelector('em-emoji-picker');
    if (existingPicker && existingPicker.getAttribute('data-theme') === pickerTheme)
      return;
    if (existingPicker) existingPicker.remove();

    const picker = new EmojiMart.Picker({
      theme: pickerTheme,
      skinTonePosition: 'none',
      previewPosition: 'none',
      onEmojiSelect: (emoji) => {
        insertEmoji(emoji.native);
        dom.chatComposer.classList.remove('is-emoji-open');
      },
      onClickOutside: () => {
        dom.chatComposer.classList.remove('is-emoji-open');
      },
    });

    picker.setAttribute('data-theme', pickerTheme);
    dom.chatEmojiPickerHost.appendChild(picker);
  };

  const ensureServerChat = async (chat) => {
    ensureClientId(chat);
    if (chat.serverId) return chat.serverId;
    if (!hasAttachedDocuments(chat)) {
      throw new Error(
        t(
          'chat.uploadBeforeSend',
          {},
          'Upload a file or folder first so MyReader can answer from your documents.',
        ),
      );
    }
    const created = await createChatOnServer({
      clientId: chat.clientId,
      title: chat.name || 'Chat',
      description: '',
      file: chat.docId || undefined,
      documentIds:
        Array.isArray(chat.documentIds) && chat.documentIds.length
          ? chat.documentIds
          : chat.docId
            ? [chat.docId]
            : [],
      scopeType: chat.scopeType || 'document',
      folderId: chat.folderId || undefined,
      folderName: chat.folderName || undefined,
    });
    chat.serverId = created?.id || chat.serverId;
    return chat.serverId;
  };

  const hydrateFromServer = async () => {
    try {
      const serverChats = await fetchMyChats();
      chats = mergeServerChatsIntoLocal(chats, serverChats);
      persist();
    } finally {
      refreshLists();
    }
  };

  // Initial render + background hydrate
  refreshLists();
  hydrateFromServer();
  mountChatEmojiPicker();
  setComposerState({
    enabled: false,
    placeholder: defaultComposerPlaceholder(),
    scopeType: 'document',
  });

  function bindUploadTriggers() {
    if (dom.uploadArea) {
      dom.uploadArea.onclick = () => triggerFileUpload();
    }
    if (dom.uploadFileBtn) {
      dom.uploadFileBtn.onclick = (e) => {
        e.stopPropagation();
        triggerFileUpload();
      };
    }
    if (dom.uploadFolderBtn) {
      dom.uploadFolderBtn.onclick = (e) => {
        e.stopPropagation();
        triggerFolderUpload();
      };
    }
  }

  function triggerFileUpload() {
    if (!dom.uploadFileInput) return;
    dom.uploadFileInput.value = '';
    dom.uploadFileInput.click();
  }

  function triggerFolderUpload() {
    if (!isEnterpriseUser()) {
      alert(
        t(
          'chat.folderEnterpriseOnly',
          {},
          'Folder upload is available on the Enterprise plan.',
        ),
      );
      return;
    }

    if (!dom.uploadFolderInput) return;
    dom.uploadFolderInput.value = '';
    dom.uploadFolderInput.click();
  }

  async function startNewFileChat(file) {
    const chatId = Date.now();
    const chatName =
      file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name;
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
      scopeType: 'document',
      documentIds: [],
      scopeDocuments: [
        {
          id: null,
          name: file.name,
          relativePath: file.name,
          fileType,
          fileSize: file.size,
          status: 'uploading',
        },
      ],
    };
    ensureClientId(newChat);

    chats.unshift(newChat);
    currentChatId = chatId;
    persist();
    setComposerState({
      enabled: false,
      placeholder: t('chat.processingFile', {}, 'Processing your file...'),
      scopeType: 'document',
    });
    renderChatInterface(dom, newChat);
    refreshLists();

    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }

    try {
      const uploadResult = await uploadDocument({ file });
      const uploadedDoc = uploadResult?.data?.document || null;
      const chunkCount = Number(uploadResult?.data?.chunkCount || 0);

      const isProcessedDocument =
        uploadedDoc &&
        uploadedDoc.status === 'completed' &&
        chunkCount > 0 &&
        uploadResult?.status === 'success';

      if (!isProcessedDocument) {
        newChat.status = 'failed';
        persist();
        alert(
          uploadResult?.message ||
            t(
              'chat.uploadWarning',
              {},
              'This file was uploaded, but RAG processing did not finish successfully. Please try another file or re-upload this one.',
            ),
        );
        return;
      }

      newChat.status = 'ready';
      newChat.docId = uploadedDoc._id;
      newChat.fileName = uploadedDoc.originalFileName;
      newChat.documentIds = [uploadedDoc._id];
      newChat.scopeDocuments = [
        {
          id: uploadedDoc._id,
          name: uploadedDoc.originalFileName,
          relativePath:
            uploadedDoc.relativePath || uploadedDoc.originalFileName,
          fileType: uploadedDoc.fileType || fileType,
          fileSize: uploadedDoc.fileSize || file.size,
          status: uploadedDoc.status,
        },
      ];

      persist();
      setComposerState({
        enabled: true,
        placeholder: readyComposerPlaceholder(),
        scopeType: 'document',
      });
      renderChatInterface(dom, newChat);
      refreshLists();
    } catch (e) {
      newChat.status = 'failed';
      persist();
      setComposerState({
        enabled: false,
        placeholder: defaultComposerPlaceholder(),
        scopeType: 'document',
      });
      alert(
        getApiErrorMessage(
          e,
          t('chat.uploadFailed', {}, 'File upload failed. Please try again.'),
        ),
      );
    }
  }

  async function startNewFolderChat(files) {
    const folderName =
      files[0]?.webkitRelativePath?.split('/')[0] || 'Uploaded Folder';
    const totalSize = files.reduce(
      (sum, file) => sum + Number(file?.size || 0),
      0,
    );
    const chatId = Date.now();
    const newChat = {
      id: chatId,
      clientId: null,
      serverId: null,
      name: folderName,
      folderName,
      fileType: 'FOLDER',
      fileSize: formatFileSize(totalSize),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      messages: [],
      firstUserMessage: null,
      status: 'uploading',
      scopeType: 'folder',
      documentIds: [],
      scopeDocuments: normalizeScopeDocuments(
        files.map((entry) => ({
          name: entry.name,
          relativePath: entry.webkitRelativePath || entry.name,
          fileType: entry.name.split('.').pop().toUpperCase(),
          fileSize: entry.size,
          status: 'uploading',
        })),
      ),
    };
    ensureClientId(newChat);

    chats.unshift(newChat);
    currentChatId = chatId;
    persist();
    setComposerState({
      enabled: false,
      placeholder: t('chat.processingFolder', {}, 'Processing your folder...'),
      scopeType: 'folder',
    });
    renderChatInterface(dom, newChat);
    refreshLists();

    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }

    try {
      const uploadResult = await uploadFolder({ files, folderName });
      const folder = uploadResult?.data?.folder || {};
      const uploadedDocuments = normalizeScopeDocuments(
        uploadResult?.data?.documents || [],
      );
      const readyDocumentIds = (uploadResult?.data?.chatDocumentIds || []).map(
        String,
      );

      newChat.status = readyDocumentIds.length ? 'ready' : 'failed';
      newChat.folderId = folder.id || newChat.folderId;
      newChat.folderName = folder.name || newChat.folderName;
      newChat.name = newChat.folderName || newChat.name;
      newChat.documentIds = readyDocumentIds;
      newChat.scopeDocuments = uploadedDocuments;

      if (!readyDocumentIds.length) {
        persist();
        renderExistingChat(dom, newChat);
        refreshLists();
        alert(
          uploadResult?.message ||
            t(
              'chat.folderUploadNoReady',
              {},
              'The folder upload finished, but none of the files are ready for chat yet.',
            ),
        );
        return;
      }

      persist();
      setComposerState({
        enabled: true,
        placeholder: folderComposerPlaceholder(),
        scopeType: 'folder',
      });
      renderExistingChat(dom, newChat);
      refreshLists();

      if (uploadResult?.status === 'warning' || uploadResult?.message) {
        alert(
          uploadResult?.message ||
            t(
              'chat.folderUploadPartial',
              {
                ready: readyDocumentIds.length,
                total: uploadedDocuments.length,
              },
              `Folder uploaded with ${readyDocumentIds.length} ready documents out of ${uploadedDocuments.length} files.`,
            ),
        );
      }
    } catch (error) {
      newChat.status = 'failed';
      persist();
      renderExistingChat(dom, newChat);
      refreshLists();
      setComposerState({
        enabled: false,
        placeholder: defaultComposerPlaceholder(),
        scopeType: 'folder',
      });
      alert(
        getApiErrorMessage(
          error,
          t(
            'chat.folderUploadFailed',
            {},
            'Folder upload failed. Please try again or upload fewer files at once.',
          ),
        ),
      );
    }
  }

  function setCurrentChatById(chatId) {
    const chat = chats.find((c) => String(c.id) === String(chatId));
    if (!chat) return;
    currentChatId = chat.id;
    updateSendButtonState();
    if (dom.chatTitle) {
      const titleKey =
        chat.scopeType === 'folder' ? 'chat.chatAboutFolder' : 'chat.chatAbout';
      dom.chatTitle.textContent = t(
        titleKey,
        { name: chat.name || t('chat.chatFallback', {}, 'Chat') },
        `Chat about ${chat.name || 'Chat'}`,
      );
    }
    renderExistingChat(dom, chat);
    setComposerState({
      enabled: chat.status === 'ready' || Boolean(chat.serverId),
      placeholder:
        chat.status === 'ready' || Boolean(chat.serverId)
          ? chat.scopeType === 'folder'
            ? folderComposerPlaceholder()
            : readyComposerPlaceholder()
          : defaultComposerPlaceholder(),
      scopeType: chat.scopeType || 'document',
    });
    dom.messageInput?.focus();
    refreshLists();
    if (window.innerWidth <= 1200) {
      dom.leftSidebar?.classList.remove('show-sidebar');
      dom.rightSidebar?.classList.remove('show-sidebar');
    }
  }

  function resetToInitialState() {
    renderWelcome(dom);
    dom.uploadArea = document.getElementById('chatUploadArea');
    dom.uploadFileBtn = document.getElementById('uploadFileBtn');
    dom.uploadFolderBtn = document.getElementById('uploadFolderBtn');
    bindUploadTriggers();

    currentChatId = null;
    updateSendButtonState();
    refreshLists();
    setComposerState({
      enabled: false,
      placeholder: defaultComposerPlaceholder(),
      scopeType: 'document',
    });
    if (dom.chatTitle) {
      dom.chatTitle.textContent = t('chat.pageTitleNew', {}, 'New Chat');
    }
  }

  async function clearConversationByChatId(chatId) {
    const chat = chats.find((c) => String(c.id) === String(chatId));
    if (!chat) return;

    chat.messages = [];
    chat.firstUserMessage = null;
    persist();
    renderMessages(dom, chat);
    refreshLists();

    try {
      if (chat.serverId) await clearChatOnServer({ serverId: chat.serverId });
    } catch (_) {}
  }

  async function deleteUploadByChatId(chatId) {
    const chat = chats.find((c) => String(c.id) === String(chatId));
    if (!chat) return;
    const wasCurrent = chat.id === currentChatId;
    chats = chats.filter((c) => c !== chat);
    persist();
    if (wasCurrent) resetToInitialState();
    else refreshLists();

    try {
      if (chat.serverId) await deleteChatOnServer({ serverId: chat.serverId });
    } catch (_) {}
  }

  function sendMessage() {
    if (!dom.messageInput || isStreamingResponse) return;
    const messageText = dom.messageInput.value.trim();
    if (!messageText) return;
    if (!currentChatId) {
      alert(
        t(
          'chat.uploadBeforeSend',
          {},
          'Upload a file or folder first so MyReader can answer from your documents.',
        ),
      );
      dom.messageInput.focus();
      return;
    }

    const chat = getCurrentChat();
    if (!chat) return;
    if (!hasAttachedDocuments(chat)) {
      alert(
        t(
          'chat.uploadBeforeSend',
          {},
          'Upload a file or folder first so MyReader can answer from your documents.',
        ),
      );
      return;
    }

    chat.messages.push({
      type: 'sent',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    if (!chat.firstUserMessage) chat.firstUserMessage = messageText;
    const assistantTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const assistantMessage = {
      type: 'received',
      text: t('chat.thinking', {}, 'Thinking...'),
      time: assistantTime,
      sources: [],
      streaming: true,
    };
    chat.messages.push(assistantMessage);

    dom.messageInput.value = '';
    dom.chatComposer?.classList.remove('is-emoji-open');
    setStreamingState(true);
    syncComposerInput();
    persist();
    renderMessages(dom, chat);
    refreshLists();

    (async () => {
      try {
        await ensureServerChat(chat);
        if (chat.serverId) {
          const streamed = await streamMessageOnServer({
            serverId: chat.serverId,
            text: messageText,
            onEvent: (event) => {
              if (event.type === 'delta') {
                assistantMessage.text = event.text || assistantMessage.text;
                assistantMessage.streaming = true;
                renderMessages(dom, chat);
              }

              if (event.type === 'done') {
                if (event.chat?.messages) {
                  chat.messages = normalizeServerMessages(event.chat.messages);
                } else {
                  assistantMessage.text = event.text || assistantMessage.text;
                  assistantMessage.sources = event.sources || [];
                  assistantMessage.streaming = false;
                }
                persist();
                renderMessages(dom, chat);
                refreshLists();
              }
            },
          });
          if (streamed?.chat?.messages) {
            chat.messages = normalizeServerMessages(streamed.chat.messages);
            persist();
            renderMessages(dom, chat);
            refreshLists();
          }
        }
      } catch (e) {
        assistantMessage.text =
          e?.message || t('chat.ragFailure', {}, 'I could not answer that right now.');
        assistantMessage.streaming = false;
        persist();
        renderMessages(dom, chat);
        refreshLists();
      } finally {
        setStreamingState(false);
        syncComposerInput();
      }
    })();
  }

  // Delegated interactions for lists and inline actions
  delegate(dom.chatList, 'click', '[data-chat-id]', (e, item) => {
    const actionBtn = e.target?.closest?.('[data-action]');
    const chatId = item.getAttribute('data-chat-id');
    if (!chatId) return;

    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action === 'clear-chat') {
        e.preventDefault();
        e.stopPropagation();
        clearConversationByChatId(chatId);
      }
      return;
    }

    setCurrentChatById(chatId);
  });

  delegate(dom.uploadHistoryList, 'click', '[data-chat-id]', (e, item) => {
    const actionBtn = e.target?.closest?.('[data-action]');
    const chatId = item.getAttribute('data-chat-id');
    if (!chatId) return;

    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action === 'delete-upload') {
        e.preventDefault();
        e.stopPropagation();
        deleteUploadByChatId(chatId);
      }
      return;
    }

    setCurrentChatById(chatId);
  });

  delegate(dom.conversationTopicsList, 'click', '[data-chat-id]', (_e, item) => {
    const chatId = item.getAttribute('data-chat-id');
    if (!chatId) return;
    setCurrentChatById(chatId);
  });

  // Page-level controls (few direct listeners are fine)
  bindUploadTriggers();
  dom.uploadFileInput?.addEventListener('change', (e) => {
    const files = e.target?.files;
    if (files && files.length > 0) startNewFileChat(files[0]);
  });
  dom.uploadFolderInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target?.files || []);
    if (files.length > 0) startNewFolderChat(files);
  });
  dom.newChatBtn?.addEventListener('click', resetToInitialState);
  dom.composerUploadBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerFileUpload();
  });
  dom.sendBtn?.addEventListener('click', sendMessage);
  dom.messageInput?.addEventListener('input', syncComposerInput);
  dom.messageInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  dom.chatEmojiBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dom.chatComposer?.classList.toggle('is-emoji-open');
  });

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
    if (dom.chatComposer && !dom.chatComposer.contains(e.target)) {
      dom.chatComposer.classList.remove('is-emoji-open');
    }

    if (window.innerWidth <= 1200) {
      const isInsideLeft = dom.leftSidebar && dom.leftSidebar.contains(e.target);
      const isInsideRight = dom.rightSidebar && dom.rightSidebar.contains(e.target);
      const isToggleLeft = dom.toggleLeftBtn && dom.toggleLeftBtn.contains(e.target);
      const isToggleRight = dom.toggleRightBtn && dom.toggleRightBtn.contains(e.target);

      if (!isInsideLeft && !isToggleLeft && dom.leftSidebar?.classList.contains('show-sidebar'))
        dom.leftSidebar.classList.remove('show-sidebar');

      if (!isInsideRight && !isToggleRight && dom.rightSidebar?.classList.contains('show-sidebar'))
        dom.rightSidebar.classList.remove('show-sidebar');
    }
  });

  dom.clearAllConversationsBtn?.addEventListener('click', async () => {
    chats.forEach((c) => {
      c.messages = [];
      c.firstUserMessage = null;
    });
    persist();
    refreshLists();

    const current = getCurrentChat();
    if (current) renderMessages(dom, current);

    try {
      await clearAllChatsOnServer();
    } catch (_) {}
  });

  dom.deleteAllUploadsBtn?.addEventListener('click', async () => {
    const hasAnyServer = chats.some((c) => Boolean(c.serverId));
    chats = [];
    currentChatId = null;
    resetToInitialState();
    persist();
    try {
      if (hasAnyServer) await deleteAllChatsOnServer();
    } catch (_) {}
  });

  dom.settingsBtn?.addEventListener('click', () => {
    alert(
      t(
        'chat.settingsAlert',
        {},
        'Use the header controls to switch theme or language. The guided tour can walk you through the rest of the workspace.',
      ),
    );
  });
  dom.helpBtn?.addEventListener('click', () => {
    const tourTrigger = document.getElementById('tourToggle');
    if (tourTrigger) {
      tourTrigger.click();
      return;
    }
    alert(
      t(
        'chat.helpAlert',
        {},
        'Use the tour for a step-by-step guide: upload a file, open a chat, ask questions, and review your history from the side panels.',
      ),
    );
  });

  window.addEventListener('app:preferences-changed', () => {
    refreshLists();
    if (currentChatId) setCurrentChatById(currentChatId);
    else resetToInitialState();
    mountChatEmojiPicker();
  });
}

