export function initChatInput() {
  const messageInput = document.querySelector('.chat-input-container .message-input');
  if (!messageInput) return;

  const initialHeight = messageInput.scrollHeight;

  messageInput.addEventListener('input', () => {
    messageInput.style.height = `${initialHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    const form = messageInput.closest('.chat-form');
    if (form) {
      form.style.borderRadius =
        messageInput.scrollHeight > initialHeight ? '15px' : '32px';
    }
  });
}
