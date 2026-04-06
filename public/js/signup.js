// eslint-disable-next-line
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

export const signup = async (
  name,
  email,
  password,
  passwordConfirm,
  button,
  nextPath,
) => {
  const cleanName = typeof name === 'string' ? name.trim() : name;
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

  const originalText = button ? button.textContent : 'Sign Up';
  if (button) {
    button.textContent = 'Signing up...';
    button.disabled = true;
  }

  if (password !== passwordConfirm) {
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
    showAlert('error', 'Passwords do not match.');
    return;
  }

  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      withCredentials: true,
      data: {
        name: cleanName,
        email: cleanEmail,
        password,
        passwordConfirm,
      },
      timeout: 300000,
    });

    if (res.data.status === 'success') {
      const userId = res?.data?.data?.user?._id || res?.data?.data?.user?.id;
      clearOtherUsersChatCaches(userId);
      if (button) button.textContent = 'Success!';
      showAlert('success', 'Signup successful!');
      const target =
        nextPath && typeof nextPath === 'string' && nextPath.startsWith('/')
          ? nextPath
          : '/';
      setTimeout(() => window.location.assign(target), 2000);
    }
  } catch (err) {
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
    showAlert('error', err.response?.data?.message || 'Signup failed. Please try again!');
  }
};
