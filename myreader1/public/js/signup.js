// eslint-disable-next-line
import axios from 'axios';
import { showAlert } from './alerts';

const t = (key, fallback) => window.__appI18n?.t?.(key, {}, fallback) || fallback;

export const signup = async (
  name,
  email,
  password,
  passwordConfirm,
  button,
  nextPath,
) => {
  const originalText = button ? button.textContent : t('auth.signupButton', 'Sign Up');
  if (button) {
    button.textContent = t('auth.signingUp', 'Signing up...');
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
      if (button) button.textContent = t('auth.signupDone', 'Success!');
      showAlert('success', t('auth.signupSuccess', 'Signup successful!'));
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
    showAlert(
      'error',
      err.response?.data?.message ||
        t('auth.signupError', 'Signup failed. Please try again!'),
    );
  }
};
