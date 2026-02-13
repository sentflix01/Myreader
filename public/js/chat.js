/* eslint-disable */
document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements - UPDATED with correct IDs from Pug template
  const newChatBtn = document.getElementById('newChatBtn');
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  const uploadArea = document.getElementById('chatUploadArea');
  const chatList = document.getElementById('chatHistoryList');
  const chatContent = document.getElementById('chatMessagesArea');
  const chatInputArea = document.getElementById('chatInputContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendMessageBtn'); // Updated ID
  const chatTitle = document.getElementById('chatTitle');
  const settingsBtn = document.getElementById('settingsBtn');
  const helpBtn = document.getElementById('helpBtn');

  // Sample chat data
  let chats = [];
  let currentChatId = null;

  // Initialize the upload area click event
  if (uploadArea) {
    uploadArea.addEventListener('click', function () {
      triggerFileUpload();
    });
  }

  // File upload simulation
  if (uploadFileBtn) {
    uploadFileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      triggerFileUpload();
    });
  }

  function triggerFileUpload() {
    // Simulate file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.csv';

    fileInput.onchange = function (e) {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        startNewChat(file);
      }
    };

    fileInput.click();
  }

  // Drag and drop functionality
  if (uploadArea) {
    uploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#667eea';
      uploadArea.style.backgroundColor = '#f0f4ff';
    });

    uploadArea.addEventListener('dragleave', function (e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#cbd5e0';
      uploadArea.style.backgroundColor = 'white';
    });

    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#cbd5e0';
      uploadArea.style.backgroundColor = 'white';

      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        startNewChat(file);
      }
    });
  }

  // New Chat Button
  if (newChatBtn) {
    newChatBtn.addEventListener('click', function () {
      resetToInitialState();
    });
  }

  // Start a new chat with uploaded file
  function startNewChat(file) {
    const chatId = Date.now();
    const chatName =
      file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
    const fileType = file.name.split('.').pop().toUpperCase();

    // Add to chats array
    chats.unshift({
      id: chatId,
      name: chatName,
      fileType: fileType,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      messages: [],
    });

    // Update UI
    chatTitle.textContent = `Chat about ${file.name}`;
    currentChatId = chatId;

    // Show chat interface
    displayChatInterface(file);

    // Update the chat list
    updateChatList();
  }

  function displayChatInterface(file) {
    if (!chatContent) return;
    
    chatContent.innerHTML = `
      <div class="chat-messages">
        <div class="message received">
          <div class="message-content">
            <div class="message-header">
              <strong>SentReader</strong>
              <span class="message-time">${new Date().toLocaleTimeString(
                [],
                { hour: '2-digit', minute: '2-digit' },
              )}</span>
            </div>
            <p>I've processed your file "<strong>${file.name}</strong>". What would you like to know about it?</p>
            <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
              <i class="fas fa-file" style="margin-right: 8px;"></i>
              ${file.name} (${(file.size / 1024).toFixed(1)} KB)
            </div>
          </div>
        </div>
      </div>
    `;

    if (chatInputArea) {
      chatInputArea.style.display = 'block';
    }
    
    if (messageInput) {
      messageInput.focus();
    }
  }

  // Send message
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  function sendMessage() {
    if (!messageInput || !currentChatId) return;
    
    const messageText = messageInput.value.trim();
    if (!messageText) return;

    // Find current chat
    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;

    // Add user message
    const userMessage = {
      type: 'sent',
      text: messageText,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    chat.messages.push(userMessage);

    // Clear input
    messageInput.value = '';

    // Update chat UI
    updateChatUI(chat);

    // Simulate AI response after a delay
    simulateAIResponse(chat);
  }

  function simulateAIResponse(chat) {
    setTimeout(() => {
      const responses = [
        'Based on the content of your document, I found that the main topics discussed are artificial intelligence and natural language processing.',
        'I can help you summarize the key points from your file. Would you like me to do that?',
        'The document contains 5 main sections. Which section would you like me to explain in more detail?',
        "I've analyzed the data in your file and identified some interesting trends. Would you like me to share them?",
      ];

      const aiResponse =
        responses[Math.floor(Math.random() * responses.length)];

      const aiMessage = {
        type: 'received',
        text: aiResponse,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      chat.messages.push(aiMessage);
      updateChatUI(chat);
    }, 1000);
  }

  // Update chat UI with messages
  function updateChatUI(chat) {
    if (!chatContent) return;
    
    let messagesContainer = document.querySelector('.chat-messages');
    
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.className = 'chat-messages';
      messagesContainer.style.width = '100%';
      chatContent.innerHTML = '';
      chatContent.appendChild(messagesContainer);
    }

    messagesContainer.innerHTML = '';

    // Add all messages
    chat.messages.forEach((msg) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${msg.type === 'sent' ? 'sent' : 'received'}`;

      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-header">
            <strong>${msg.type === 'sent' ? 'You' : 'SentReader'}</strong>
            <span class="message-time">${msg.time}</span>
          </div>
          <p>${msg.text}</p>
        </div>
      `;

      messagesContainer.appendChild(messageDiv);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Update chat list in sidebar
  function updateChatList() {
    if (!chatList) return;
    
    chatList.innerHTML = '';

    if (chats.length === 0) {
      chatList.innerHTML = `
        <li class="chat-history-item">
          <i class="fas fa-comment"></i>
          <div>
            <div class="chat-history-name">No chats available</div>
          </div>
        </li>
      `;
      return;
    }

    chats.forEach((chat) => {
      const chatItem = document.createElement('li');
      chatItem.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
      chatItem.innerHTML = `
        <i class="fas fa-file-alt"></i>
        <div>
          <div class="chat-history-name">${chat.name}</div>
          <div class="chat-history-time">${chat.timestamp} • ${chat.fileType}</div>
        </div>
      `;

      chatItem.addEventListener('click', () => {
        // Set as active chat
        currentChatId = chat.id;
        chatTitle.textContent = `Chat about ${chat.name}`;

        // Update chat UI
        displayExistingChat(chat);
        
        if (chatInputArea) {
          chatInputArea.style.display = 'block';
        }
        
        if (messageInput) {
          messageInput.focus();
        }

        // Update chat list active state
        updateActiveChatInList(chatItem);
      });

      chatList.appendChild(chatItem);
    });
  }

  function displayExistingChat(chat) {
    if (!chatContent) return;
    
    chatContent.innerHTML = `
      <div class="chat-messages">
        <div class="message received">
          <div class="message-content">
            <div class="message-header">
              <strong>SentReader</strong>
              <span class="message-time">${chat.timestamp}</span>
            </div>
            <p>You previously uploaded a file named "<strong>${chat.name}</strong>".</p>
          </div>
        </div>
      </div>
    `;

    // Add existing messages if any
    if (chat.messages.length > 0) {
      const messagesContainer = document.querySelector('.chat-messages');
      chat.messages.forEach((msg) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.type === 'sent' ? 'sent' : 'received'}`;

        messageDiv.innerHTML = `
          <div class="message-content">
            <div class="message-header">
              <strong>${msg.type === 'sent' ? 'You' : 'SentReader'}</strong>
              <span class="message-time">${msg.time}</span>
            </div>
            <p>${msg.text}</p>
          </div>
        `;

        messagesContainer.appendChild(messageDiv);
      });

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function updateActiveChatInList(activeItem) {
    document.querySelectorAll('.chat-history-item').forEach((item) => {
      item.classList.remove('active');
    });
    activeItem.classList.add('active');
  }

  function resetToInitialState() {
    // Reset to initial state
    if (!chatContent) return;
    
    chatContent.innerHTML = `
      <div class="chat-welcome-state">
        <div class="chat-welcome-icon">
          <i class="fas fa-comments"></i>
        </div>
        <h3>No Chats Available</h3>
        <p>Please upload a file to start a new chat. SentReader can process documents, images, and other files to help you analyze and discuss content.</p>
      </div>
      <div class="chat-upload">
        <div class="chat-upload-area" id="chatUploadArea">
          <div class="chat-upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
          </div>
          <h4>Upload a file to start chatting</h4>
          <p>Drag and drop your file here or click to browse</p>
          <button class="upload-file-btn" id="uploadFileBtn">
            <i class="fas fa-upload"></i> Choose File
          </button>
          <div class="supported-file-types">
            <span class="file-type-badge">PDF</span>
            <span class="file-type-badge">DOCX</span>
            <span class="file-type-badge">TXT</span>
            <span class="file-type-badge">JPG/PNG</span>
            <span class="file-type-badge">CSV</span>
          </div>
        </div>
        <div class="hero-img-box">
          <!-- Form content from original Pug -->
        </div>
      </div>
    `;

    // Re-attach event listeners to the new upload area
    const newUploadArea = document.getElementById('chatUploadArea');
    const newUploadBtn = document.getElementById('uploadFileBtn');
    
    if (newUploadArea) {
      newUploadArea.addEventListener('click', function () {
        triggerFileUpload();
      });
    }
    
    if (newUploadBtn) {
      newUploadBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerFileUpload();
      });
    }

    if (chatInputArea) {
      chatInputArea.style.display = 'none';
    }
    
    chatTitle.textContent = 'New Chat';
    currentChatId = null;

    // Update the chat list
    updateChatList();
  }

  // Settings button
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function () {
      alert('Settings dialog would open here. This is a demo interface.');
    });
  }

  // Help button
  if (helpBtn) {
    helpBtn.addEventListener('click', function () {
      alert(
        'SentReader Help:\n\n1. Upload a file to start a new chat\n2. Ask questions about your document\n3. SentReader will analyze and respond based on the content\n\nThis is a demo interface for the SentReader project.',
      );
    });
  }

  // Initialize the chat list
  updateChatList();
});