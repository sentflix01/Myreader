/* eslint-disable */
let maps = { en: {}, am: {} };

export function initClientI18nFromDom() {
  const el = document.getElementById('myreader-i18n-data');
  if (!el) return;
  try {
    maps = JSON.parse(el.textContent || '{}');
  } catch (_) {
    maps = { en: {}, am: {} };
  }
}

if (typeof document !== 'undefined') {
  initClientI18nFromDom();
}

function clientLangPack() {
  const raw = (
    document.documentElement.getAttribute('data-language') || 'en'
  ).toLowerCase();
  if (raw.startsWith('am')) return 'am';
  return 'en';
}

export function ct(key, replacements, fallback) {
  const packKey = clientLangPack();
  const pack = maps[packKey] || maps.en || {};
  const base = maps.en || {};
  let template = pack[key] || base[key] || fallback || key;
  if (replacements && typeof replacements === 'object') {
    template = Object.entries(replacements).reduce(
      (result, [k, value]) =>
        result.replace(new RegExp(`{{${k}}}`, 'g'), String(value)),
      String(template),
    );
  }
  return template;
}

export function onLanguageChange(cb) {
  window.addEventListener('myreader:language-change', cb);
}

export function onPreferencesRefresh(cb) {
  window.addEventListener('myreader:preferences-refresh', cb);
}
