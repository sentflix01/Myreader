// eslint-disable-next-line
import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (
  name,
  email,
  password,
  passwordConfirm,
  button,
  nextPath,
) => {
  const originalText = button ? button.textContent : 'Sign Up';
  if (button) {
    button.textContent = 'Signing up...';
    button.disabled = true;
  }

  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      withCredentials: true,
      data: { name, email, password, passwordConfirm },
      timeout: 300000,
    });

    if (res.data.status === 'success') {
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
