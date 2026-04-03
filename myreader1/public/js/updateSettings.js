import axios from 'axios';
import { showAlert } from './alerts';

// type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const config = {
      method: 'PATCH',
      url,
      data,
    };

    if (type === 'data' && data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    const res = await axios(config);
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response?.data?.message || 'Update failed.');
  }
};
