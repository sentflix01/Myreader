/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

function clearOtherUsersChatCaches(currentUserId) {
  if (!currentUserId) return;
  const prefix = 'sentreader_chats_';
  const ownKey = `${prefix}${currentUserId}`;
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key !== ownKey) keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export const login = async (email, password, nextPath) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      withCredentials: true,
      data: {
        email: typeof email === 'string' ? email.trim() : email,
        password,
      },
    });

    if (res.data.status === 'success') {
      const userId = res?.data?.data?.user?._id || res?.data?.data?.user?.id;
      clearOtherUsersChatCaches(userId);
      showAlert('success', 'Logged in successfully!');
      const target =
        nextPath && typeof nextPath === 'string' && nextPath.startsWith('/')
          ? nextPath
          : '/';
      window.setTimeout(() => {
        location.assign(target);
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Login failed.');
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
      withCredentials: true,
    });
    if (res.data.status === 'success') {
      const prefix = 'sentreader_chats_';
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Error logging out! Try again.');
  }
};
