/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true;

const t = (key, fallback) => window.__appI18n?.t?.(key, {}, fallback) || fallback;

export const login = async (email, password, nextPath) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: { email, password },
    });

    if (res.data.status === 'success') {
      showAlert('success', t('auth.loginSuccess', 'Logged in successfully!'));
      const target =
        nextPath && typeof nextPath === 'string' && nextPath.startsWith('/')
          ? nextPath
          : '/';
      window.setTimeout(() => {
        location.assign(target);
      }, 1500);
    }

    return res.data;
  } catch (err) {
    const message =
      err.response?.data?.message || t('auth.loginError', 'Login failed.');
    showAlert(
      'error',
      message,
    );
    throw new Error(message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert(
      'error',
      err.response?.data?.message || 'Error logging out! Try again.',
    );
  }
};
