/* eslint-disable */
const QUICK_ACTIONS = [
  {
    label: 'Summarize this page',
    prompt:
      'Summarize the key things on this Sentreader page and tell me what I can do next.',
  },
  {
    label: 'Plan my trip',
    prompt:
      'Help me choose a Sentreader trip. Ask for my preferences if you need more info.',
  },
  {
    label: 'Booking help',
    prompt:
      'I need help booking or understanding prices. Guide me through the steps.',
  },
  {
    label: 'Ask anything',
    prompt: 'Hi Sentreader assistant!',
  },
];

const renderMessage = (container, role, content) => {
  const wrapper = document.createElement('div');
  wrapper.className = `assistant-message assistant-message--${
    role === 'assistant' ? 'bot' : 'user'
  }`;

  const bubble = document.createElement('div');
  bubble.className = 'assistant-message__bubble';
  bubble.textContent = content;

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
};

const buildUI = (root) => {
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'assistant-launcher';
  launcher.setAttribute('aria-label', 'Open Sentreader assistant');
  launcher.textContent = '🤖';

  const panel = document.createElement('div');
  panel.className = 'assistant-panel';
  panel.dataset.open = 'false';
  panel.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'assistant-panel__header';

  const heading = document.createElement('div');
  heading.innerHTML = `
    <p class="assistant-panel__title">Sentreader AI</p>
    <p class="assistant-panel__tagline">Need help? I can guide you.</p>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'assistant-panel__close';
  closeBtn.innerHTML = '&times;';

  header.appendChild(heading);
  header.appendChild(closeBtn);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'assistant-panel__input';
  input.placeholder = 'Ask anything about Sentreader...';
  input.required = true;

  const quickWrap = document.createElement('div');
  quickWrap.className = 'assistant-panel__quick-actions';
  QUICK_ACTIONS.forEach((action) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'assistant-chip';
    chip.textContent = action.label;
    chip.dataset.prompt = action.prompt;
    quickWrap.appendChild(chip);
  });

  const thread = document.createElement('div');
  thread.className = 'assistant-panel__thread';

  const composer = document.createElement('form');
  composer.className = 'assistant-panel__composer';

  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'assistant-panel__send';
  sendBtn.innerHTML = '&#10148;';

  const status = document.createElement('p');
  status.className = 'assistant-panel__status';

  composer.appendChild(input);
  composer.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(quickWrap);
  panel.appendChild(thread);
  panel.appendChild(composer);
  panel.appendChild(status);

  root.appendChild(launcher);
  root.appendChild(panel);

  return {
    launcher,
    panel,
    thread,
    quickWrap,
    composer,
    input,
    sendBtn,
    status,
    closeBtn,
  };
};

export const initSupportAssistant = () => {
  const root = document.querySelector('[data-assistant-root]');
  if (!root) return;

  const {
    launcher,
    panel,
    thread,
    quickWrap,
    composer,
    input,
    sendBtn,
    status,
    closeBtn,
  } = buildUI(root);

  const history = [];

  const pushHistory = (entry) => {
    history.push(entry);
    if (history.length > 12) {
      history.shift();
    }
  };

  const togglePanel = (nextState) => {
    const currentlyOpen = panel.dataset.open === 'true';
    const shouldOpen =
      typeof nextState === 'boolean' ? nextState : !currentlyOpen;
    panel.dataset.open = shouldOpen ? 'true' : 'false';
    panel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    launcher.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
      input.focus();
    }
  };

  const setStatus = (text) => {
    status.textContent = text || '';
  };

  const lockInput = (locked) => {
    input.disabled = locked;
    sendBtn.disabled = locked;
  };

  const sendPrompt = async (prompt) => {
    renderMessage(thread, 'user', prompt);
    pushHistory({ role: 'user', content: prompt });
    lockInput(true);
    setStatus('Thinking...');

    try {
      const response = await fetch('/api/v1/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          history,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to reach the assistant.');
      }

      const reply = payload?.data?.reply || "I couldn't find an answer.";
      renderMessage(thread, 'assistant', reply);
      pushHistory({ role: 'assistant', content: reply });
    } catch (error) {
      renderMessage(
        thread,
        'assistant',
        error.message || 'Something went wrong. Please try again later.',
      );
    } finally {
      lockInput(false);
      setStatus('');
    }
  };

  launcher.addEventListener('click', () => togglePanel());
  closeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    togglePanel(false);
  });

  quickWrap.querySelectorAll('.assistant-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.prompt || '';
      input.focus();
    });
  });

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';
    sendPrompt(prompt);
  });
};
