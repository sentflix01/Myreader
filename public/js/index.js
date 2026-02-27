import { login, logout } from './login';
// import './toggleProfile';
import { updateSettings } from './updateSettings';
// import { initSupportAssistant } from './sentbot';

// DOM ELEMENTS
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.getElementById('logout');
// const ditProfile = document.getElementById('ditProfile');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const chatBody = document.querySelector('.chat-body');
const messageInput = document.querySelector('.message-input');
const sendMessageButton = document.querySelector('#send-message');
const fileInput = document.querySelector('#file-input');
const fileuploadWrapper = document.querySelector('.file-upload-wrapper');
const fileCancelButton = document.querySelector('#file-cancel');
const chatbotToggler = document.querySelector('#chatbot-toggler');
const closeChatbot = document.querySelector('#close-chatbot');
const yearEl = document.querySelector('.year');
const currentYear = new Date().getFullYear();
const btnNavEl = document.querySelector('.btn-mobile-nav');
const headerEl = document.querySelector('.header');
const allLinks = document.querySelectorAll('a:link');
const API_KEY = process.env.API_KEY
const API_URL = process.env.API_URL

   const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null,
    },
    };
    
    const chatHistory = [];
    const initialInputHeight = messageInput.scrollHeight;

    
yearEl.textContent = currentYear;
btnNavEl.addEventListener('click', function () {
  headerEl.classList.toggle('nav-open');
});
allLinks.forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const href = link.getAttribute('href');

    // Scroll back to top
    if (href === '#')
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

    // Scroll to other links
    if (href !== '#' && href.startsWith('#')) {
      const sectionEl = document.querySelector(href);
      sectionEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Close mobile naviagtion
    if (link.classList.contains('main-nav-link'))
      headerEl.classList.toggle('nav-open');
  });
});
function checkFlexGap() {
  var flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';

  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));

  document.body.appendChild(flex);
  var isSupported = flex.scrollHeight === 1;
  flex.parentNode.removeChild(flex);
  // console.log(isSupported);

  if (!isSupported) document.body.classList.add('no-flexbox-gap');
}
checkFlexGap();



// DELEGATION
if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

if (logOutBtn) {
  logOutBtn.addEventListener('click', (e) => {
    e.preventDefault(); // 🛑 Stop the browser from navigating to "/logout"
    logout();
  });
}

if (userDataForm)
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    updateSettings({ name, email }, 'data');
  });
import { initSupportAssistant } from './supportAssistant';

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
// initSupportAssistant();
// console.log('hello from parcel')

    // create message element with dynamic classes and returen it
    const createMessageElement = (content, ...classes) => {
    const div = document.createElement('div');
    div.classList.add('message', ...classes);
    div.innerHTML = content;
    return div;
    };
    // Generate bot response using API
    const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector('.message-text');

    // Add user message to chat history
    chatHistory.push({
        role: 'user',
        parts: [
        {
            text: userData.message,
        },
        ...(userData.file.data ? [{ inline_data: userData.file }] : []),
        ],
    });

    // API request option
    const requestOptions = {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY, // ✅ REQUIRED FOR GEMINI-3
        },

        body: JSON.stringify({
        contents: chatHistory,
        }),
    };
    try {
        // Fetch bot response form
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        // Extract and display bot's responsse text
        const apiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text.replace(/\*\*(.*?)\*\*/g, '$1').trim();
        messageElement.innerText = apiResponseText;

        // Add bot response to chat history
        chatHistory.push({
        role: 'model',
        parts: [{ text: apiResponseText }],
        });
    } catch (error) {
        console.log(error);
        messageElement.innerText = error.message;
        messageElement.style.color = '#ff0000';
    } finally {
        // Reset user's file data, removing thinking indicator and scroll chat to bottom
        userData.file = {};
        incomingMessageDiv.classList.remove('thinking');
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }
    };
    // handle outgoing user message
    const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = '';
    fileuploadWrapper.classList.remove('file-uploaded');
    messageInput.dispatchEvent(new Event('input'));

    // create and display user message
    const messageContent = `<div class="message-text"></div>${userData.file.data ? `<img src='data:${userData.file.mime_type};base64,${userData.file.data}' class= 'attachement' />` : ''}`;

    const outgoingMessageDiv = createMessageElement(messageContent, 'user-message', 'thinking');
    outgoingMessageDiv.querySelector('.message-text').textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

    // Simulate bot response with thinking indicator after a delay
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

        const incomingMessageDiv = createMessageElement(messageContent, 'bot-message');
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
        generateBotResponse(incomingMessageDiv);
    }, 600);
    };

    // Handle Enter key press for sending messages
    messageInput.addEventListener('keydown', (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === 'Enter' && userMessage && !e.shiftKey && window.innerWidth > 768) {
        handleOutgoingMessage(e);
    }
    });

    // Adjust input field height dynamically
    messageInput.addEventListener('input', () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector('.chat-form').style.borderRadius =
        messageInput.scrollHeight > initialInputHeight ? '15px' : '32px';
    });
    // Handle file input change and preview the selected file
    fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileuploadWrapper.querySelector('img').src = e.target.result;
        fileuploadWrapper.classList.add('file-uploaded');
        const base64string = e.target.result.split(',')[1];

        // store file data in userData
        userData.file = {
        data: base64string,
        mime_type: file.type,
        };
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
    });
    // cancel file upload
    fileCancelButton.addEventListener('click', () => {
    userData.file = {};
    fileuploadWrapper.classList.remove('file-uploaded');
    });

    // Initialize emoji picker and handke emoji selection
    const picker = new EmojiMart.Picker({
    theme: 'light',
    skinTonePosition: 'none',
    previewPosition: 'none',
    onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, 'end');
        messageInput.focus();
    },
    onClickOutside: (e) => {
        if (e.target.id === 'emoji-picker') {
        document.body.classList.toggle('show-emoji-picker');
        } else {
        document.body.classList.remove('show-emoji-picker');
        }
    },
    });

    document.querySelector('.chat-form').appendChild(picker);

    sendMessageButton.addEventListener('click', (e) => handleOutgoingMessage(e));
    document.querySelector('#file-upload').addEventListener('click', () => fileInput.click());
    chatbotToggler.addEventListener('click', () => document.body.classList.toggle('show-chatbot'));
    closeChatbot.addEventListener('click', () => document.body.classList.remove('show-chatbot'));

    console.log(API_URL);
   console.log(API_KEY);

