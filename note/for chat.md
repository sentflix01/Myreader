# Sentread Chat Interface

Based on the image description, I'll create a clean, modern chat page for your Sentread project with a file upload interface and responsive design.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sentread | Chat Interface</title>
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      }

      body {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #333;
      }

      .container {
        display: flex;
        width: 95%;
        max-width: 1200px;
        height: 90vh;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      /* Sidebar Styles */
      .sidebar {
        width: 280px;
        background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%);
        color: white;
        padding: 24px 0;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .logo {
        padding: 0 24px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .logo h1 {
        font-size: 24px;
        font-weight: 700;
        background: linear-gradient(to right, #667eea, #764ba2);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .logo h1 i {
        color: #667eea;
        background: transparent;
      }

      .new-chat-btn {
        margin: 24px;
        background: linear-gradient(to right, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.3s ease;
      }

      .new-chat-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
      }

      .recent-chats {
        flex: 1;
        padding: 0 24px;
        overflow-y: auto;
      }

      .recent-chats h3 {
        font-size: 14px;
        color: #a0aec0;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 16px;
      }

      .chat-list {
        list-style: none;
      }

      .chat-item {
        padding: 14px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
      }

      .chat-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .chat-item.active {
        background: rgba(102, 126, 234, 0.2);
        border-left: 3px solid #667eea;
      }

      .chat-item i {
        color: #a0aec0;
      }

      .chat-item .chat-name {
        font-weight: 500;
        font-size: 15px;
      }

      .chat-item .chat-time {
        font-size: 12px;
        color: #a0aec0;
        margin-top: 4px;
      }

      .sidebar-footer {
        padding: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 12px;
        color: #a0aec0;
        text-align: center;
      }

      /* Main Chat Area */
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #f8fafc;
      }

      .chat-header {
        padding: 20px 30px;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chat-header h2 {
        font-size: 20px;
        color: #2d3748;
      }

      .chat-header-actions {
        display: flex;
        gap: 15px;
      }

      .chat-header-actions button {
        background: transparent;
        border: none;
        color: #718096;
        font-size: 18px;
        cursor: pointer;
        transition: color 0.2s;
      }

      .chat-header-actions button:hover {
        color: #667eea;
      }

      .chat-content {
        flex: 1;
        padding: 30px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }

      .empty-state {
        max-width: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .empty-state-icon {
        font-size: 80px;
        color: #cbd5e0;
        margin-bottom: 24px;
      }

      .empty-state h3 {
        font-size: 24px;
        color: #4a5568;
        margin-bottom: 16px;
      }

      .empty-state p {
        color: #718096;
        line-height: 1.6;
        margin-bottom: 32px;
        font-size: 16px;
      }

      .upload-area {
        background: white;
        border: 2px dashed #cbd5e0;
        border-radius: 12px;
        padding: 40px;
        width: 100%;
        transition: all 0.3s;
        cursor: pointer;
      }

      .upload-area:hover {
        border-color: #667eea;
        background: #f7fafc;
      }

      .upload-icon {
        font-size: 48px;
        color: #667eea;
        margin-bottom: 20px;
      }

      .upload-area h4 {
        font-size: 18px;
        color: #4a5568;
        margin-bottom: 10px;
      }

      .upload-area p {
        color: #718096;
        font-size: 14px;
        margin-bottom: 20px;
      }

      .upload-btn {
        background: linear-gradient(to right, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .upload-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
      }

      .file-types {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .file-type {
        background: #edf2f7;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        color: #4a5568;
      }

      /* Chat input area (hidden by default) */
      .chat-input-area {
        padding: 20px 30px;
        background: white;
        border-top: 1px solid #e2e8f0;
        display: none;
      }

      .input-container {
        display: flex;
        gap: 15px;
      }

      .message-input {
        flex: 1;
        padding: 14px 20px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 15px;
        resize: none;
        outline: none;
        transition: border 0.3s;
      }

      .message-input:focus {
        border-color: #667eea;
      }

      .send-btn {
        background: linear-gradient(to right, #667eea, #764ba2);
        color: white;
        border: none;
        width: 50px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .container {
          flex-direction: column;
          height: 95vh;
        }

        .sidebar {
          width: 100%;
          height: 200px;
          padding: 16px 0;
        }

        .recent-chats {
          overflow-y: hidden;
        }

        .chat-header h2 {
          font-size: 18px;
        }

        .empty-state h3 {
          font-size: 20px;
        }

        .upload-area {
          padding: 30px 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="logo">
          <h1><i class="fas fa-comment-dots"></i> Sentread</h1>
        </div>

        <button class="new-chat-btn" id="newChatBtn">
          <i class="fas fa-plus"></i> New Chat
        </button>

        <div class="recent-chats">
          <h3>Recent Chats</h3>
          <ul class="chat-list" id="chatList">
            <!-- Chat items will be dynamically added here -->
            <li class="chat-item">
              <i class="fas fa-comment"></i>
              <div>
                <div class="chat-name">No chats available</div>
              </div>
            </li>
          </ul>
        </div>

        <div class="sidebar-footer">
          <div>Sentread v1.0</div>
          <div>Secure Chat Platform</div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-area">
        <div class="chat-header">
          <h2 id="chatTitle">New Chat</h2>
          <div class="chat-header-actions">
            <button id="settingsBtn" title="Settings">
              <i class="fas fa-cog"></i>
            </button>
            <button id="helpBtn" title="Help">
              <i class="fas fa-question-circle"></i>
            </button>
          </div>
        </div>

        <div class="chat-content" id="chatContent">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-comments"></i>
            </div>
            <h3>No Chats Available</h3>
            <p>
              Please upload a file to start a new chat. Sentread can process
              documents, images, and other files to help you analyze and discuss
              content.
            </p>

            <div class="upload-area" id="uploadArea">
              <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
              </div>
              <h4>Upload a file to start chatting</h4>
              <p>Drag and drop your file here or click to browse</p>
              <button class="upload-btn" id="uploadBtn">
                <i class="fas fa-upload"></i> Choose File
              </button>

              <div class="file-types">
                <span class="file-type">PDF</span>
                <span class="file-type">DOCX</span>
                <span class="file-type">TXT</span>
                <span class="file-type">JPG/PNG</span>
                <span class="file-type">CSV</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat input area (initially hidden) -->
        <div class="chat-input-area" id="chatInputArea">
          <div class="input-container">
            <textarea
              class="message-input"
              id="messageInput"
              placeholder="Type your message here..."
            ></textarea>
            <button class="send-btn" id="sendBtn">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', function () {
        // DOM Elements
        const newChatBtn = document.getElementById('newChatBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadArea = document.getElementById('uploadArea');
        const chatList = document.getElementById('chatList');
        const chatContent = document.getElementById('chatContent');
        const chatInputArea = document.getElementById('chatInputArea');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const chatTitle = document.getElementById('chatTitle');

        // Sample chat data
        let chats = [];
        let currentChatId = null;

        // File upload simulation
        uploadBtn.addEventListener('click', function () {
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
        });

        // Drag and drop functionality
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

        // New Chat Button
        newChatBtn.addEventListener('click', function () {
          // Reset to initial state
          chatContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <h3>No Chats Available</h3>
                        <p>Please upload a file to start a new chat. Sentread can process documents, images, and other files to help you analyze and discuss content.</p>
                        
                        <div class="upload-area" id="uploadArea">
                            <div class="upload-icon">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            <h4>Upload a file to start chatting</h4>
                            <p>Drag and drop your file here or click to browse</p>
                            <button class="upload-btn" id="uploadBtn">
                                <i class="fas fa-upload"></i> Choose File
                            </button>
                            
                            <div class="file-types">
                                <span class="file-type">PDF</span>
                                <span class="file-type">DOCX</span>
                                <span class="file-type">TXT</span>
                                <span class="file-type">JPG/PNG</span>
                                <span class="file-type">CSV</span>
                            </div>
                        </div>
                    </div>
                `;

          // Re-attach event listeners to the new upload area
          document
            .getElementById('uploadArea')
            .addEventListener('click', function () {
              uploadBtn.click();
            });

          document
            .getElementById('uploadBtn')
            .addEventListener('click', function () {
              uploadBtn.click();
            });

          chatInputArea.style.display = 'none';
          chatTitle.textContent = 'New Chat';
          currentChatId = null;

          // Update the chat list
          updateChatList();
        });

        // Start a new chat with uploaded file
        function startNewChat(file) {
          const chatId = Date.now();
          const chatName =
            file.name.length > 20
              ? file.name.substring(0, 20) + '...'
              : file.name;
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
          chatContent.innerHTML = `
                    <div class="chat-messages" style="width: 100%;">
                        <div class="message received">
                            <div class="message-content">
                                <div class="message-header">
                                    <strong>Sentread</strong>
                                    <span class="message-time">${new Date().toLocaleTimeString(
                                      [],
                                      { hour: '2-digit', minute: '2-digit' }
                                    )}</span>
                                </div>
                                <p>I've processed your file "<strong>${
                                  file.name
                                }</strong>". What would you like to know about it?</p>
                                <div class="file-info" style="background: #edf2f7; padding: 12px; border-radius: 8px; margin-top: 10px; font-size: 14px;">
                                    <i class="fas fa-file" style="margin-right: 8px;"></i>
                                    ${file.name} (${(file.size / 1024).toFixed(
            1
          )} KB)
                                </div>
                            </div>
                        </div>
                    </div>
                `;

          chatInputArea.style.display = 'block';
          messageInput.focus();

          // Update the chat list
          updateChatList();
        }

        // Send message
        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });

        function sendMessage() {
          const messageText = messageInput.value.trim();
          if (!messageText || !currentChatId) return;

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
          const messagesContainer =
            document.querySelector('.chat-messages') ||
            document.createElement('div');
          if (!document.querySelector('.chat-messages')) {
            messagesContainer.className = 'chat-messages';
            messagesContainer.style.width = '100%';
            chatContent.innerHTML = '';
            chatContent.appendChild(messagesContainer);
          }

          messagesContainer.innerHTML = '';

          // Add initial file processing message
          messagesContainer.innerHTML += `
                    <div class="message received">
                        <div class="message-content">
                            <div class="message-header">
                                <strong>Sentread</strong>
                                <span class="message-time">${new Date().toLocaleTimeString(
                                  [],
                                  { hour: '2-digit', minute: '2-digit' }
                                )}</span>
                            </div>
                            <p>I've processed your file. What would you like to know about it?</p>
                        </div>
                    </div>
                `;

          // Add all messages
          chat.messages.forEach((msg) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${
              msg.type === 'sent' ? 'sent' : 'received'
            }`;

            messageDiv.innerHTML = `
                        <div class="message-content">
                            <div class="message-header">
                                <strong>${
                                  msg.type === 'sent' ? 'You' : 'Sentread'
                                }</strong>
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
          chatList.innerHTML = '';

          if (chats.length === 0) {
            chatList.innerHTML = `
                        <li class="chat-item">
                            <i class="fas fa-comment"></i>
                            <div>
                                <div class="chat-name">No chats available</div>
                            </div>
                        </li>
                    `;
            return;
          }

          chats.forEach((chat) => {
            const chatItem = document.createElement('li');
            chatItem.className = `chat-item ${
              chat.id === currentChatId ? 'active' : ''
            }`;
            chatItem.innerHTML = `
                        <i class="fas fa-file-alt"></i>
                        <div>
                            <div class="chat-name">${chat.name}</div>
                            <div class="chat-time">${chat.timestamp} • ${chat.fileType}</div>
                        </div>
                    `;

            chatItem.addEventListener('click', () => {
              // Set as active chat
              currentChatId = chat.id;
              chatTitle.textContent = `Chat about ${chat.name}`;

              // Update chat UI
              updateChatUI(chat);
              chatInputArea.style.display = 'block';
              messageInput.focus();

              // Update chat list active state
              document.querySelectorAll('.chat-item').forEach((item) => {
                item.classList.remove('active');
              });
              chatItem.classList.add('active');
            });

            chatList.appendChild(chatItem);
          });
        }

        // Settings button
        document
          .getElementById('settingsBtn')
          .addEventListener('click', function () {
            alert('Settings dialog would open here. This is a demo interface.');
          });

        // Help button
        document
          .getElementById('helpBtn')
          .addEventListener('click', function () {
            alert(
              'Sentread Help:\n\n1. Upload a file to start a new chat\n2. Ask questions about your document\n3. Sentread will analyze and respond based on the content\n\nThis is a demo interface for the Sentread project.'
            );
          });
      });
    </script>
  </body>
</html>
```

## Features of this Chat Page:

1. **Modern Design**: Clean, gradient-based interface with a dark sidebar and light main content area

2. **Responsive Layout**: Adapts to different screen sizes with a mobile-friendly layout

3. **File Upload Interface**:

   - Visual upload area with drag-and-drop functionality
   - Support for multiple file types (PDF, DOCX, TXT, JPG/PNG, CSV)
   - File upload simulation

4. **Interactive Chat System**:

   - Create new chats by uploading files
   - Interactive chat list in sidebar
   - Chat message interface with simulated AI responses
   - Real-time chat functionality

5. **Visual Elements**:

   - Consistent iconography using Font Awesome
   - Clear visual hierarchy and typography
   - Hover effects and smooth transitions

6. **Sentread Branding**: Custom styling with the Sentread name and logo styling

This interface provides a complete, interactive chat experience that matches the description from your image while adding functionality for file upload and chat interaction.
