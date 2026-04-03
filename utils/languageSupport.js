'use strict';

const LANGUAGE_META = {
  en: {
    code: 'en',
    nativeName: 'English',
    promptInstruction: 'Respond in clear English.',
  },
  am: {
    code: 'am',
    nativeName: 'አማርኛ',
    promptInstruction:
      'Respond in natural Amharic using Ethiopic script. Keep product names, plan names, file names, and technical terms like RAG, PDF, Chat, Dashboard, SentReader as-is when that is clearer.',
  },
};

const LOCALIZED_COPY = {
  en: {
    'rag.noDocuments': 'I couldn\'t find any uploaded document content to answer "{{question}}".',
    'rag.noSupportedAnswer': 'I couldn\'t find a supported answer to "{{question}}" in the uploaded document(s).',
    'rag.answerIntro': 'Answer based only on the uploaded document(s) for "{{question}}":',
    'rag.sourcePrefix': 'Source {{index}}',
    'chat.ragFailure': 'RAG search failed. Please try again or re-upload your document.',
  },
  am: {
    'rag.noDocuments': '"{{question}}" ለሚለው ጥያቄ የሚያገለግል የተሰቀለ ሰነድ ይዘት አላገኘሁም።',
    'rag.noSupportedAnswer': 'በተሰቀሉት ሰነዶች ውስጥ "{{question}}" የሚደግፍ መልስ አላገኘሁም።',
    'rag.answerIntro': '"{{question}}" ለሚለው ጥያቄ ከተሰቀሉት ሰነዶች ብቻ የተመሠረተ መልስ፦',
    'rag.sourcePrefix': 'ምንጭ {{index}}',
    'chat.ragFailure': 'የ RAG ፍለጋ አልተሳካም። እባክዎ እንደገና ይሞክሩ ወይም ሰነዱን እንደገና ይስቀሉ።',
  },
};

function normalizeLanguage(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('am')) return 'am';
  return 'en';
}

function interpolate(template, replacements = {}) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    String(template || ''),
  );
}

function getLocalizedCopy(language, key, replacements = {}) {
  const normalized = normalizeLanguage(language);
  const template = LOCALIZED_COPY[normalized]?.[key] || LOCALIZED_COPY.en[key] || key;
  return interpolate(template, replacements);
}

function getRequestLanguage(req) {
  return normalizeLanguage(
    req?.headers?.['x-app-language'] ||
      req?.body?.responseLanguage ||
      req?.body?.language ||
      req?.query?.lang,
  );
}

function getAnswerLanguageInstruction(language) {
  const meta = LANGUAGE_META[normalizeLanguage(language)] || LANGUAGE_META.en;
  return meta.promptInstruction;
}

module.exports = {
  getAnswerLanguageInstruction,
  getLocalizedCopy,
  getRequestLanguage,
  normalizeLanguage,
};
