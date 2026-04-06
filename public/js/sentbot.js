function getActiveTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

function getCurrentUserId() {
  return document.querySelector('meta[name="user-id"]')?.content || '';
}

export function initSentBot() {
  const popup = document.querySelector('.chatbot-popup');
  const toggler = document.querySelector('#chatbot-toggler');
  const closeButton = document.querySelector('#close-chatbot');

  if (!popup || !toggler) return;

  const chatBody = popup.querySelector('.chat-body');
  const chatForm = popup.querySelector('.chat-form');
  const messageInput = popup.querySelector('.message-input');
  const sendMessageButton = popup.querySelector('#send-message');
  const fileInput = popup.querySelector('#file-input');
  const fileuploadWrapper = popup.querySelector('.file-upload-wrapper');
  const fileCancelButton = popup.querySelector('#file-cancel');
  const fileUploadButton = popup.querySelector('#file-upload');
  const emojiBtn = popup.querySelector('#emoji-picker');

  if (!chatBody || !chatForm || !messageInput) return;

  const userData = {
    message: null,
    file: {
      data: null,
      mime_type: null,
    },
  };

  let chatHistory = [];
  let historyOwnerId = getCurrentUserId();
  const initialInputHeight = messageInput.scrollHeight;
  let picker = null;

  const syncTheme = () => {
    const theme = getActiveTheme();
    popup.dataset.theme = theme;
    if (picker) {
      picker.setAttribute('theme', theme);
      picker.theme = theme;
    }
  };

  const resetAttachment = () => {
    userData.file = { data: null, mime_type: null };
    fileuploadWrapper?.classList.remove('file-uploaded');
    const image = fileuploadWrapper?.querySelector('img');
    if (image) image.removeAttribute('src');
    if (fileInput) fileInput.value = '';
  };

  const ensureUserScopedHistory = () => {
    const currentUserId = getCurrentUserId();
    if (currentUserId !== historyOwnerId) {
      chatHistory = [];
      historyOwnerId = currentUserId;
    }
  };

  const createMessageElement = (content, ...classes) => {
    const div = document.createElement('div');
    div.classList.add('message', ...classes);
    div.innerHTML = content;
    return div;
  };

  const scrollChatToBottom = () => {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
  };

  const streamText = (el, text, delay = 15) => {
    if (!el) return;
    el.textContent = '';
    let idx = 0;
    const intervalId = window.setInterval(() => {
      el.textContent += text.charAt(idx);
      idx += 1;
      if (idx >= text.length) window.clearInterval(intervalId);
      el.scrollIntoView({ block: 'nearest' });
    }, delay);
  };

  const appendBotMessage = (text, options = {}) => {
    const content = `
      <svg class="bot-avatar" width="50" height="50" viewBox="0 0 1024 1024">
        <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
      </svg>
      <div class="message-text${options.error ? ' sentbot-error' : ''}"></div>
    `;
    const message = createMessageElement(content, 'bot-message');
    const textEl = message.querySelector('.message-text');
    if (textEl) {
      if (options.stream === false) textEl.textContent = text;
      else streamText(textEl, text);
    }
    chatBody.appendChild(message);
    scrollChatToBottom();
    return message;
  };

  const promptLoginMessage = () =>
    'Sign in to use Sentbot for your account history, subscription help, and personal document support.';

  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector('.message-text');

    ensureUserScopedHistory();

    if (!historyOwnerId) {
      if (messageElement) {
        messageElement.textContent = promptLoginMessage();
      }
      resetAttachment();
      incomingMessageDiv.classList.remove('thinking');
      scrollChatToBottom();
      return;
    }

    chatHistory.push({
      role: 'user',
      parts: [
        { text: userData.message },
        ...(userData.file.data ? [{ inline_data: userData.file }] : []),
      ],
    });

    try {
      const response = await fetch('/api/v1/sentbot/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userData.message,
          history: chatHistory,
          file: userData.file?.data ? userData.file : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error(promptLoginMessage());
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error?.message || 'Sentbot request failed');
      }

      const apiResponseText = String(data?.data?.text || '').trim();
      if (!apiResponseText) throw new Error('Sentbot returned an empty response.');

      streamText(messageElement, apiResponseText);

      chatHistory.push({
        role: 'model',
        parts: [{ text: apiResponseText }],
      });
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = error.message;
        messageElement.classList.add('sentbot-error');
      }
    } finally {
      resetAttachment();
      incomingMessageDiv.classList.remove('thinking');
      scrollChatToBottom();
    }
  };

  const handleOutgoingMessage = (e) => {
    e.preventDefault();
    ensureUserScopedHistory();

    userData.message = messageInput.value.trim();
    if (!userData.message) return;

    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));

    const messageContent = `<div class="message-text"></div>${
      userData.file.data
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachement" alt="Sent attachment" />`
        : ''
    }`;

    const outgoingMessageDiv = createMessageElement(
      messageContent,
      'user-message',
      'thinking',
    );
    outgoingMessageDiv.querySelector('.message-text').textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    scrollChatToBottom();

    window.setTimeout(() => {
      const incomingMessageDiv = appendBotMessage('', { stream: false });
      incomingMessageDiv.classList.add('thinking');
      incomingMessageDiv.querySelector('.message-text').innerHTML = `
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      `;
      generateBotResponse(incomingMessageDiv);
    }, 450);
  };

  const initEmojiPicker = () => {
    const EmojiMart = window.EmojiMart;
    if (!EmojiMart?.Picker || !emojiBtn || picker) return;

    picker = new EmojiMart.Picker({
      theme: getActiveTheme(),
      skinTonePosition: 'none',
      previewPosition: 'none',
      onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, 'end');
        messageInput.focus();
        document.body.classList.remove('show-sentbot-emoji-picker');
      },
      onClickOutside: (event) => {
        if (event.target === emojiBtn || emojiBtn.contains(event.target)) return;
        document.body.classList.remove('show-sentbot-emoji-picker');
      },
    });

    picker.classList.add('sentbot-emoji-picker');
    chatForm.appendChild(picker);
    syncTheme();

    emojiBtn.addEventListener('click', () => {
      document.body.classList.toggle('show-sentbot-emoji-picker');
    });
  };

  messageInput.addEventListener('keydown', (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === 'Enter' && userMessage && !e.shiftKey && window.innerWidth > 768) {
      handleOutgoingMessage(e);
    }
  });

  messageInput.addEventListener('input', () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    chatForm.style.borderRadius =
      messageInput.scrollHeight > initialInputHeight ? '1.8rem' : '3.2rem';
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const image = fileuploadWrapper?.querySelector('img');
      if (image) image.src = event.target.result;
      fileuploadWrapper?.classList.add('file-uploaded');
      const base64string = String(event.target.result).split(',')[1];
      userData.file = { data: base64string, mime_type: file.type };
      if (fileInput) fileInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  fileCancelButton?.addEventListener('click', resetAttachment);
  sendMessageButton?.addEventListener('click', (e) => handleOutgoingMessage(e));
  fileUploadButton?.addEventListener('click', () => fileInput?.click());
  toggler.addEventListener('click', () => {
    document.body.classList.toggle('show-chatbot');
    document.body.classList.remove('show-sentbot-emoji-picker');
  });
  closeButton?.addEventListener('click', () => {
    document.body.classList.remove('show-chatbot');
    document.body.classList.remove('show-sentbot-emoji-picker');
  });

  window.addEventListener('myreader:theme-change', syncTheme);

  document.addEventListener('click', (event) => {
    if (
      !document.body.classList.contains('show-sentbot-emoji-picker') ||
      !picker ||
      picker.contains(event.target) ||
      event.target === emojiBtn
    ) {
      return;
    }

    document.body.classList.remove('show-sentbot-emoji-picker');
  });

  initEmojiPicker();
  syncTheme();
}
