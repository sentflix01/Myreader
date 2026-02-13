/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
import { getApiUrl } from './config';

export const signup = async (
  name,
  email,
  role,
  password,
  passwordConfirm,
  button,
) => {
  // Store original button text
  const originalText = button ? button.textContent : 'Sign Up';

  // Update button text to show loading state
  if (button) {
    button.textContent = 'Signing up...';
    button.disabled = true;
  }

  try {
    const res = await axios({
      method: 'POST',
      url: getApiUrl('/api/v1/users/signup'),
      withCredentials: true,
      data: { name, email, role, password, passwordConfirm },
      timeout: 300000,
    });

    if (res.data.status === 'success') {
      if (button) {
        button.textContent = 'Success!';
      }
      // showAlert(
      //   'success',
      //   res.data.message ||
      //     'Signup successful! Please check your email to verify your account before logging in.',
      // );
      setTimeout(() => {
        window.location.assign('/login');
      }, 3000);
    }
  } catch (err) {
    // Restore original button text on error
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
    // showAlert(
    //   'error',
    //   err.response?.data?.message || 'Signup failed. Please try again!',
    // );
  }
};
