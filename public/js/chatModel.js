/* eslint-disable */
import axios from 'axios';

// ── User-scoped storage key ───────────────────────────────────
// Each user gets their own localStorage key so user A never sees user B's data.
// The userId is embedded in the key — derived from the JWT cookie via the /me endpoint.

const BASE_KEY = 'sentreader_chats';

function storageKey() {
  // Read userId from a non-httpOnly cookie set at login, or fall back to 'guest'
  const uid = getUserIdFromPage() || 'guest';
  return `${BASE_KEY}_${uid}`;
}

/**
 * Get the current user's ID from the page.
 * The server renders res.locals.user into a meta tag so we can read it client-side.
 * Falls back to a cookie value if the meta tag is absent.
 */
function getUserIdFromPage() {
  // Try meta tag first (set by base.pug)
  const meta = document.querySelector('meta[name="user-id"]');
  if (meta?.content) return meta.content;

  // Try data attribute on body
  const body = document.body;
  if (body?.dataset?.userId) return body.dataset.userId;

  return null;
}

/**
 * Clear ALL other users' cached chats from this browser.
 * Called on login so a newly logged-in user starts clean.
 */
export function clearOtherUsersCaches(currentUserId) {
  if (!currentUserId) return;
  const ownKey = `${BASE_KEY}_${currentUserId}`;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(BASE_KEY) && k !== ownKey) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

export function loadChatsFromCache() {
  const stored = localStorage.getItem(storageKey());
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveChatsToCache(chats) {
  localStorage.setItem(storageKey(), JSON.stringify(chats || []));
}

export function clearMyCache() {
  localStorage.removeItem(storageKey());
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

export async function createChatOnServer({ clientId, title, description }) {
  const res = await axios.post('/api/v1/chats', { clientId, title, description });
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
  const res = await axios.delete('/api/v1/chats');
  return res.data;
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
      localByServerId.get(serverId) || (clientId ? localByClientId.get(clientId) : null);

    const normalizedMessages = (s.messages || []).map((m) => ({
      type: m.role === 'user' ? 'sent' : 'received',
      text: m.text,
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

