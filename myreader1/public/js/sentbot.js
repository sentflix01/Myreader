const HISTORY_STORAGE_KEY = 'myreader_sentbot_prompt_history';
const LEGACY_HISTORY_STORAGE_KEY = 'sentreader_sentbot_prompt_history';
const BASE_PROMPT_KEYS = [
  'sentbot.prompt.queries',
  'sentbot.prompt.uploads',
  'sentbot.prompt.chatCounts',
  'sentbot.prompt.plan',
  'sentbot.prompt.upgrade',
  'sentbot.prompt.publicTotals',
  'sentbot.prompt.usersByTier',
  'sentbot.prompt.features',
];

function translate(key, values = {}, fallback = '') {
  return window.__appI18n?.t?.(key, values, fallback) || fallback;
}

function getCurrentUserStorageId() {
  const userId = document.body?.dataset?.userId || '';
  return userId ? String(userId) : 'guest';
}

function getHistoryStorageKey(prefix = HISTORY_STORAGE_KEY) {
  return `${prefix}:${getCurrentUserStorageId()}`;
}

function getBasePromptSuggestions() {
  return BASE_PROMPT_KEYS.map((key) => translate(key)).filter(Boolean);
}

function getLanguageHeader() {
  const current = document.documentElement.dataset.language || 'en';
  return String(current).toLowerCase().startsWith('am') ? 'am' : 'en';
}

function getEmojiTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function loadPromptHistory() {
  try {
    const currentStorageKey = getHistoryStorageKey();
    let stored = localStorage.getItem(currentStorageKey);
    if (stored === null) {
      stored = localStorage.getItem(
        getHistoryStorageKey(LEGACY_HISTORY_STORAGE_KEY),
      );
      if (stored !== null) {
        localStorage.setItem(currentStorageKey, stored);
      }
    }
    const parsed = JSON.parse(stored || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (err) {
    return [];
  }
}

function savePromptHistory(history) {
  localStorage.setItem(
    getHistoryStorageKey(),
    JSON.stringify(history.slice(0, 8)),
  );
}

function uniquePrompts(prompts) {
  const seen = new Set();
  return prompts.filter((prompt) => {
    const normalized = String(prompt).trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function scorePrompt(prompt, query) {
  const normalizedPrompt = normalizeText(prompt);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;
  if (normalizedPrompt === normalizedQuery) return 100;
  if (normalizedPrompt.startsWith(normalizedQuery)) return 80;
  if (normalizedPrompt.includes(normalizedQuery)) return 60;

  const promptTokens = normalizedPrompt.split(/\s+/);
  const queryTokens = normalizedQuery.split(/\s+/);
  let score = 0;
  queryTokens.forEach((token) => {
    if (token.length > 1 && promptTokens.some((part) => part.includes(token))) {
      score += 10;
    }
  });
  return score;
}

export function initSentBot() {
  const chatBody = document.querySelector('.chat-body');
  const messageInput = document.querySelector('.message-input');
  const sendMessageButton = document.querySelector('#send-message');
  const emojiButton = document.querySelector('#emoji-picker');
  const chatbotToggler = document.querySelector('#chatbot-toggler');
  const closeChatbot = document.querySelector('#close-chatbot');
  const chatForm = document.querySelector('.chat-form');
  const quickSuggestionsEl = document.querySelector('#sentbotQuickSuggestions');
  const predictiveSuggestionsEl = document.querySelector(
    '#sentbotPredictiveSuggestions',
  );
  const sentbotUploadArea = document.getElementById('sentbotUploadArea');
  const sentbotUploadBtn = document.getElementById('sentbotUploadBtn');
  const sentbotUploadInput = document.getElementById('sentbotUploadInput');

  if (!chatBody || !messageInput || !chatForm) return;

  // ✅ STEP 3: Sentbot upload handler (similar to chat flow)
  const triggerSentbotUpload = () => {
    if (!sentbotUploadInput) return;
    sentbotUploadInput.value = '';
    sentbotUploadInput.click();
  };

  function handleSentbotUpload(file) {
    if (!file) return;

    const uploadingDiv = createMessageElement(
      '<div class="message-text">Uploading file...</div>',
      'user-message',
    );
    chatBody.appendChild(uploadingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/v1/rag/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' || data.status === 'warning') {
          // ✅ Enable controls after upload
          messageInput.disabled = false;
          messageInput.placeholder =
            'Ask about your account, billing, or uploaded file...';
          sendMessageButton.disabled = false;
          emojiButton.disabled = false;
          messageInput.focus();

          // Success feedback
          const successDiv = createMessageElement(
            `<div class="message-text">✅ File "${file.name}" uploaded successfully! Now you can ask questions.</div>`,
            'bot-message',
          );
          chatBody.appendChild(successDiv);
        } else {
          uploadingDiv.querySelector('.message-text').textContent =
            data.message || 'Upload failed. Try again.';
        }
        chatBody.scrollTop = chatBody.scrollHeight;
      })
      .catch((err) => {
        console.error('Sentbot upload error:', err);
        uploadingDiv.querySelector('.message-text').textContent =
          'Upload failed. Please try again.';
      });
  }

  // Wire upload triggers
  sentbotUploadArea?.addEventListener('click', triggerSentbotUpload);
  sentbotUploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerSentbotUpload();
  });
  sentbotUploadInput?.addEventListener('change', (e) => {
    handleSentbotUpload(e.target?.files?.[0]);
  });

  const userData = {
    message: null,
  };

  const chatHistory = [];
  const initialInputHeight = messageInput.scrollHeight;
  let promptHistory = loadPromptHistory();
  let emojiPickerTheme = getEmojiTheme();

  const createMessageElement = (content, ...classes) => {
    const div = document.createElement('div');
    div.classList.add('message', ...classes);
    div.innerHTML = content;
    return div;
  };

  const streamText = (el, text, delay = 15) => {
    if (!el) return;
    el.textContent = '';
    let idx = 0;
    const intervalId = setInterval(() => {
      el.textContent += text.charAt(idx);
      idx += 1;
      if (idx >= text.length) clearInterval(intervalId);
      el.scrollIntoView({ block: 'nearest' });
    }, delay);
  };

  const updateSendButtonState = () => {
    if (!sendMessageButton) return;
    sendMessageButton.disabled = !messageInput.value.trim();
  };

  const syncInputState = () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
    chatForm.style.borderRadius =
      messageInput.scrollHeight > initialInputHeight ? '15px' : '32px';
    updateSendButtonState();
  };

  const renderInitialMessage = () => {
    const initialMessageEl = chatBody.querySelector(
      '.bot-message .message-text',
    );
    if (!initialMessageEl) return;
    initialMessageEl.innerHTML = [
      `${translate('sentbot.intro.line1', {}, 'Hey there')} &#x1F590;&#xFE0F;`,
      translate(
        'sentbot.intro.line2',
        {},
        'I can help with support, usage, dashboard stats, subscriptions, and billing.',
      ),
      translate(
        'sentbot.intro.line3',
        {},
        'For document-content questions, please use the Chat page.',
      ),
    ].join('<br>');
  };

  const rememberPrompt = (prompt) => {
    promptHistory = uniquePrompts([prompt, ...promptHistory]).slice(0, 8);
    savePromptHistory(promptHistory);
  };

  const buildSuggestionPool = () =>
    uniquePrompts([...promptHistory, ...getBasePromptSuggestions()]);

  const renderPredictiveSuggestions = (query = '') => {
    if (!predictiveSuggestionsEl) return;
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      predictiveSuggestionsEl.dataset.open = 'false';
      predictiveSuggestionsEl.innerHTML = '';
      return;
    }

    const matches = buildSuggestionPool()
      .map((prompt) => ({
        prompt,
        score: scorePrompt(prompt, normalizedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    predictiveSuggestionsEl.dataset.open = matches.length ? 'true' : 'false';
    predictiveSuggestionsEl.innerHTML = matches
      .map(
        ({ prompt }) =>
          `<button class="chat-predictive-option" type="button" data-prompt="${prompt.replace(/"/g, '&quot;')}">${prompt}</button>`,
      )
      .join('');
  };

  const hidePredictiveSuggestions = () => {
    if (!predictiveSuggestionsEl) return;
    predictiveSuggestionsEl.dataset.open = 'false';
    predictiveSuggestionsEl.innerHTML = '';
  };

  const applyEmoji = (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji, start, end, 'end');
    messageInput.focus();
    messageInput.dispatchEvent(new Event('input'));
  };

  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector('.message-text');

    chatHistory.push({
      role: 'user',
      parts: [{ text: userData.message }],
    });

    try {
      const response = await fetch('/api/v1/sentbot/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-language': getLanguageHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userData.message,
          history: chatHistory,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message || data?.error?.message || 'Sentbot request failed',
        );
      }

      const apiResponseText = String(data?.data?.text || '').trim();
      streamText(messageElement, apiResponseText);
      rememberPrompt(userData.message);

      chatHistory.push({
        role: 'model',
        parts: [{ text: apiResponseText }],
      });
    } catch (error) {
      messageElement.innerText = error.message;
      messageElement.style.color = '#ff0000';
    } finally {
      incomingMessageDiv.classList.remove('thinking');
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }
  };

  const submitPrompt = (promptText = '') => {
    userData.message = String(promptText || messageInput.value || '').trim();
    if (!userData.message) return;

    messageInput.value = '';
    hidePredictiveSuggestions();
    chatForm.classList.remove('is-emoji-open');
    messageInput.dispatchEvent(new Event('input'));

    const outgoingMessageDiv = createMessageElement(
      '<div class="message-text"></div>',
      'user-message',
      'thinking',
    );
    outgoingMessageDiv.querySelector('.message-text').textContent =
      userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

    setTimeout(() => {
      const messageContent = `<svg class="bot-avatar" width="50" height="50" viewBox="0 0 1024 1024">
      <path
      d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
      ></path>
      </svg>
      <div class="message-text">
      <div class="thinking-indicator">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
      </div>
      </div>`;

      const incomingMessageDiv = createMessageElement(
        messageContent,
        'bot-message',
      );
      chatBody.appendChild(incomingMessageDiv);
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
      generateBotResponse(incomingMessageDiv);
    }, 450);
  };

  const EmojiMart = window.EmojiMart;
  const mountEmojiPicker = () => {
    const currentTheme = getEmojiTheme();
    if (!EmojiMart?.Picker) return;
    const existingPicker = chatForm.querySelector('em-emoji-picker');
    if (existingPicker && emojiPickerTheme === currentTheme) return;
    if (existingPicker) existingPicker.remove();
    emojiPickerTheme = currentTheme;

    const picker = new EmojiMart.Picker({
      theme: currentTheme,
      skinTonePosition: 'none',
      previewPosition: 'none',
      onEmojiSelect: (emoji) => {
        applyEmoji(emoji.native);
      },
      onClickOutside: () => {
        chatForm.classList.remove('is-emoji-open');
      },
    });
    chatForm.appendChild(picker);
  };

  messageInput.addEventListener('keydown', (e) => {
    const userMessage = e.target.value.trim();
    if (
      e.key === 'Enter' &&
      userMessage &&
      !e.shiftKey
    ) {
      e.preventDefault();
      submitPrompt();
    }
  });

  messageInput.addEventListener('input', () => {
    syncInputState();
    renderPredictiveSuggestions(messageInput.value);
  });

  mountEmojiPicker();

  emojiButton?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chatForm.classList.toggle('is-emoji-open');
    messageInput.focus();
  });

  sendMessageButton?.addEventListener('click', (e) => {
    e.preventDefault();
    submitPrompt();
  });

  predictiveSuggestionsEl?.addEventListener('click', (e) => {
    const button = e.target.closest('[data-prompt]');
    if (!button) return;
    submitPrompt(button.dataset.prompt);
  });

  document.addEventListener('click', (e) => {
    if (!chatForm.contains(e.target)) {
      chatForm.classList.remove('is-emoji-open');
      hidePredictiveSuggestions();
    }
  });

  chatbotToggler?.addEventListener('click', () =>
    document.body.classList.toggle('show-chatbot'),
  );
  closeChatbot?.addEventListener('click', () => {
    document.body.classList.remove('show-chatbot');
  });

  window.addEventListener('app:preferences-changed', () => {
    messageInput.placeholder = translate(
      'sentbot.placeholder',
      {},
      messageInput.placeholder,
    );
    renderInitialMessage();
    renderPredictiveSuggestions(messageInput.value);
    mountEmojiPicker();
  });

  messageInput.placeholder = translate(
    'sentbot.placeholder',
    {},
    messageInput.placeholder,
  );
  renderInitialMessage();
  syncInputState();
}
