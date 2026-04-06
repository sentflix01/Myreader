'use strict';

const fs = require('fs');
const path = require('path');

const src = path.join(
  __dirname,
  '..',
  'myreader1',
  'client',
  'src',
  'features',
  'preferences',
  'preferences.page.js',
);
const code = fs.readFileSync(src, 'utf8');
const marker = 'const TRANSLATIONS = ';
const start = code.indexOf(marker);
if (start === -1) throw new Error('TRANSLATIONS not found');
let i = start + marker.length;
let depth = 0;
let inStr = false;
let strQuote = '';
let escaped = false;
for (; i < code.length; i += 1) {
  const c = code[i];
  if (inStr) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      continue;
    }
    if (c === strQuote) inStr = false;
    continue;
  }
  if (c === '"' || c === "'" || c === '`') {
    inStr = true;
    strQuote = c;
    continue;
  }
  if (c === '{') depth += 1;
  if (c === '}') {
    depth -= 1;
    if (depth === 0) {
      i += 1;
      break;
    }
  }
}
const raw = code.slice(start + marker.length, i);
const noComments = raw.replace(/^\s*\/\/.*$/gm, '');
// eslint-disable-next-line no-eval
const TRANSLATIONS = eval(`(${noComments})`);

const rag = {
  en: {
    'rag.noDocuments':
      "I couldn't find any uploaded document content to answer \"{{question}}\".",
    'rag.noSupportedAnswer':
      'I couldn\'t find a supported answer to "{{question}}" in the uploaded document(s).',
    'rag.answerIntro':
      'Answer based only on the uploaded document(s) for "{{question}}":',
    'rag.sourcePrefix': 'Source {{index}}',
    'chat.ragFailure':
      'RAG search failed. Please try again or re-upload your document.',
  },
  am: {
    'rag.noDocuments':
      '"{{question}}" ለሚለው ጥያቄ የሚያገለግል የተሰቀለ ሰነድ ይዘት አላገኘሁም።',
    'rag.noSupportedAnswer':
      'በተሰቀሉት ሰነዶች ውስጥ "{{question}}" የሚደግፍ መልስ አላገኘሁም።',
    'rag.answerIntro':
      '"{{question}}" ለሚለው ጥያቄ ከተሰቀሉት ሰነዶች ብቻ የተመሠረተ መልስ፦',
    'rag.sourcePrefix': 'ምንጭ {{index}}',
    'chat.ragFailure':
      'የ RAG ፍለጋ አልተሳካም። እባክዎ እንደገና ይሞክሩ ወይም ሰነዱን እንደገና ይስቀሉ።',
  },
};

const out = {
  en: { ...TRANSLATIONS.en, ...rag.en },
  am: { ...TRANSLATIONS.am, ...rag.am },
};

const dest = path.join(__dirname, '..', 'utils', 'appTranslations.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 0));
console.log('Wrote', dest, 'keys en:', Object.keys(out.en).length, 'am:', Object.keys(out.am).length);
