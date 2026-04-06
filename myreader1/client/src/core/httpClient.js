import axios from 'axios';

// Central place to enforce cross-cutting HTTP defaults.
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const documentLanguage =
    typeof document !== 'undefined'
      ? document.documentElement?.dataset?.language
      : '';
  const storedLanguage =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('myreader_language') ||
        localStorage.getItem('sentreader_language')
      : '';
  const language = documentLanguage || storedLanguage || 'en';

  nextConfig.headers = nextConfig.headers || {};
  nextConfig.headers['x-app-language'] =
    String(language).toLowerCase().startsWith('am') ? 'am' : 'en';

  return nextConfig;
});

export const http = axios;
