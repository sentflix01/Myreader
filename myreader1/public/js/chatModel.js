/* eslint-disable */
import axios from 'axios';

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true;

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
  // Reasonably unique without adding a dependency
  chat.clientId = `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return chat.clientId;
}

export async function fetchMyChats() {
  const res = await axios.get('/api/v1/chats');
  return res.data?.data?.chats || [];
}

export async function createChatOnServer({
  clientId,
  title,
  description,
  file,
}) {
  const res = await axios.post('/api/v1/chats', {
    clientId,
    title,
    description,
    file,
  });
  return res.data?.data?.chat;
}

export async function addMessageOnServer({ serverId, text }) {
  const res = await axios.post(`/api/v1/chats/${serverId}/messages`, { text });
  return res.data?.data?.chat;
}

export async function syncChatOnServer({
  serverId,
  clientId,
  title,
  description,
  messages,
  lastActivityAt,
}) {
  const res = await axios.put(`/api/v1/chats/${serverId}/sync`, {
    clientId,
    title,
    description,
    messages,
    lastActivityAt,
  });
  return res.data?.data?.chat;
}

export async function clearChatOnServer({ serverId }) {
  const res = await axios.patch(`/api/v1/chats/${serverId}/clear`);
  return res.data?.data?.chat;
}

export async function clearAllChatsOnServer() {
  const res = await axios.patch('/api/v1/chats/clear-all');
  return res.data;
}

export async function deleteChatOnServer({ serverId }) {
  const res = await axios.delete(`/api/v1/chats/${serverId}`);
  return res.data;
}

export async function deleteAllChatsOnServer() {
  try {
    // Delete all chats
    await axios.delete('/api/v1/chats');
    // Also delete all documents associated with user
    await axios.delete('/api/v1/documents');
    return { status: 'success', message: 'All chats and documents deleted' };
  } catch (error) {
    console.error('Error deleting chats and documents:', error);
    throw error;
  }
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
      // Keep UI fields compatible with existing chat.js expectations
      name: existing?.name || s.title || 'Chat',
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
