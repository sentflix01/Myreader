import { http } from '../../core/httpClient';

const STORAGE_KEY = 'myreader_chats';
const LEGACY_STORAGE_KEY = 'sentreader_chats';

function getCurrentUserStorageId() {
  const userId =
    typeof document !== 'undefined' ? document.body?.dataset?.userId : '';
  return userId ? String(userId) : 'guest';
}

function getScopedStorageKey(prefix = STORAGE_KEY) {
  return `${prefix}:${getCurrentUserStorageId()}`;
}

function getLanguageHeader() {
  const documentLanguage =
    typeof document !== 'undefined'
      ? document.documentElement?.dataset?.language
      : '';
  const storedLanguage =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('myreader_language') ||
        localStorage.getItem('sentreader_language')
      : '';
  const language = documentLanguage || storedLanguage || 'en';
  return String(language).toLowerCase().startsWith('am') ? 'am' : 'en';
}

export function loadChatsFromCache() {
  const scopedStorageKey = getScopedStorageKey();
  let stored = localStorage.getItem(scopedStorageKey);
  if (stored === null) {
    stored = localStorage.getItem(getScopedStorageKey(LEGACY_STORAGE_KEY));
    if (stored !== null) {
      localStorage.setItem(scopedStorageKey, stored);
    }
  }
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveChatsToCache(chats) {
  localStorage.setItem(getScopedStorageKey(), JSON.stringify(chats || []));
}

export function ensureClientId(chat) {
  if (chat.clientId) return chat.clientId;
  chat.clientId = `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return chat.clientId;
}

export async function uploadDocument({ file }) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await http.post('/api/v1/rag/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function uploadFolder({ files, folderName }) {
  const formData = new FormData();
  (files || []).forEach((file) => {
    const relativePath = file.webkitRelativePath || file.name;
    formData.append('files', file, relativePath);
  });
  if (folderName) formData.append('folderName', folderName);

  const res = await http.post('/api/v1/rag/upload-folder', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function fetchMyChats() {
  const res = await http.get('/api/v1/chats');
  return res.data?.data?.chats || [];
}

export async function createChatOnServer({
  clientId,
  title,
  description,
  file,
  documentIds,
  scopeType,
  folderId,
  folderName,
}) {
  const res = await http.post('/api/v1/chats', {
    clientId,
    title,
    description,
    file,
    documentIds,
    scopeType,
    folderId,
    folderName,
  });
  return res.data?.data?.chat;
}

export async function addMessageOnServer({ serverId, text }) {
  const res = await http.post(`/api/v1/chats/${serverId}/messages`, { text });
  return res.data?.data?.chat;
}

export async function streamMessageOnServer({ serverId, text, onEvent }) {
  const response = await fetch(`/api/v1/chats/${serverId}/messages/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-app-language': getLanguageHeader(),
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to send chat message.');
  }

  if (!response.body) {
    const fallbackData = await response.json().catch(() => ({}));
    const fallbackChat = fallbackData?.data?.chat || null;
    const doneEvent = {
      type: 'done',
      chat: fallbackChat,
      text:
        fallbackChat?.messages?.[fallbackChat.messages.length - 1]?.text || '',
      sources:
        fallbackChat?.messages?.[fallbackChat.messages.length - 1]?.sources ||
        [],
    };
    onEvent?.(doneEvent);
    return doneEvent;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        const event = JSON.parse(line);
        lastEvent = event;
        onEvent?.(event);
      }
      newlineIndex = buffer.indexOf('\n');
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer.trim());
    lastEvent = event;
    onEvent?.(event);
  }

  if (lastEvent?.type === 'error') {
    throw new Error(lastEvent.message || 'Failed to stream chat response.');
  }

  return lastEvent;
}

export async function syncChatOnServer({
  serverId,
  clientId,
  title,
  description,
  file,
  documentIds,
  scopeType,
  folderId,
  folderName,
  messages,
  lastActivityAt,
}) {
  const res = await http.put(`/api/v1/chats/${serverId}/sync`, {
    clientId,
    title,
    description,
    file,
    documentIds,
    scopeType,
    folderId,
    folderName,
    messages,
    lastActivityAt,
  });
  return res.data?.data?.chat;
}

export async function clearChatOnServer({ serverId }) {
  const res = await http.patch(`/api/v1/chats/${serverId}/clear`);
  return res.data?.data?.chat;
}

export async function clearAllChatsOnServer() {
  const res = await http.patch('/api/v1/chats/clear-all');
  return res.data;
}

export async function deleteChatOnServer({ serverId }) {
  const res = await http.delete(`/api/v1/chats/${serverId}`);
  return res.data;
}

export async function deleteAllChatsOnServer() {
  await http.delete('/api/v1/chats');
  await http.delete('/api/v1/documents');
  return { status: 'success', message: 'All chats and documents deleted' };
}

export function mergeServerChatsIntoLocal(localChats, serverChats) {
  const localByServerId = new Map(
    (localChats || [])
      .filter((c) => c && c.serverId)
      .map((c) => [String(c.serverId), c]),
  );
  const localByClientId = new Map(
    (localChats || [])
      .filter((c) => c && c.clientId)
      .map((c) => [String(c.clientId), c]),
  );

  const merged = [...(localChats || [])];

  (serverChats || []).forEach((s) => {
    const serverId = String(s.id);
    const clientId = s.clientId ? String(s.clientId) : null;
    const existing =
      localByServerId.get(serverId) ||
      (clientId ? localByClientId.get(clientId) : null);

    const normalizedMessages = (s.messages || []).map((m) => ({
      type: m.role === 'user' ? 'sent' : 'received',
      text: m.text,
      sources: m.sources || null,
      time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    const updatedChat = {
      ...(existing || {}),
      serverId,
      clientId: clientId || existing?.clientId || null,
      name: existing?.name || s.title || 'Chat',
      docId: s.file || existing?.docId || null,
      documentIds: s.documentIds || existing?.documentIds || [],
      scopeType: s.scopeType || existing?.scopeType || 'document',
      folderId: s.folderId || existing?.folderId || null,
      folderName: s.folderName || existing?.folderName || '',
      scopeDocuments: s.scopeDocuments || existing?.scopeDocuments || [],
      firstUserMessage: existing?.firstUserMessage || null,
      timestamp:
        existing?.timestamp ||
        new Date(s.createdAt || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      messages: normalizedMessages,
      lastSyncedAt: new Date().toISOString(),
      serverUpdatedAt: s.updatedAt || null,
    };

    if (existing) {
      const idx = merged.findIndex((c) => c === existing);
      if (idx !== -1) merged[idx] = updatedChat;
    } else {
      merged.unshift(updatedChat);
    }
  });

  return merged;
}
