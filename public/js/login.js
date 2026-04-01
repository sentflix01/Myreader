/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password, nextPath) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: { email, password },
    });

    if (res.data.status === 'success') {
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
    });
    if (res.data.status === 'success') location.reload(true);
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Error logging out! Try again.');
  }
};
