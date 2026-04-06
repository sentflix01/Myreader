'use strict';

const PAGE_MARKER_REGEX = /(?:^|\n)--\s*(\d+)\s+of\s+(\d+)\s*--\s*(?:\n|$)/g;
const CONNECTOR_WORDS = new Set([
  'and',
  'or',
  'of',
  'the',
  'for',
  'to',
  'in',
  'on',
  'with',
  'by',
  'at',
  'from',
  'a',
  'an',
  'vs',
  'via',
]);
const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'into',
  'about',
  'page',
  'section',
  'chapter',
  'shall',
  'must',
  'will',
  'have',
  'been',
  'were',
  'their',
  'they',
  'them',
  'what',
  'when',
  'where',
  'which',
  'would',
  'could',
  'should',
  'there',
  'here',
  'more',
  'than',
  'your',
  'ours',
  'ourselves',
  'agreement',
  'document',
  'contents',
  'table',
]);

function cleanLabel(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\-\u2022•·\s]+/, '')
    .replace(/[\s.]+\d{1,4}\s*$/, '')
    .trim();
}

function splitLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function addUnique(list, seen, label, level = 1, extra = {}) {
  const cleaned = cleanLabel(label);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 120) return;
  const words = cleaned.split(/\s+/);
  if (words.length > 14) return;
  const key = cleaned.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  list.push({
    id: `toc-${list.length + 1}`,
    label: cleaned,
    level,
    ...extra,
  });
}

function looksLikeHeading(line = '') {
  const cleaned = cleanLabel(line);
  if (!cleaned || cleaned.length < 3 || cleaned.length > 95) return false;
  if (/[.!?]$/.test(cleaned)) return false;
  if (cleaned.includes('  ')) return false;

  const words = cleaned.split(/\s+/);
  if (words.length > 12) return false;

  const informativeWords = words.filter((word) => !CONNECTOR_WORDS.has(word.toLowerCase()));
  if (informativeWords.length === 0) return false;

  const structuredHeading =
    /^(section|chapter|appendix|schedule|article)\b/i.test(cleaned) ||
    /^\d+(?:\.\d+){0,4}\.?\s+/.test(cleaned);
  if (structuredHeading) return true;

  let titleishWords = 0;
  informativeWords.forEach((word) => {
    if (/^[A-Z0-9]/.test(word) || /^[IVXLCM]+$/i.test(word)) {
      titleishWords += 1;
    }
  });

  return titleishWords / informativeWords.length >= 0.6;
}

function extractPages(text, filename = 'Document') {
  const source = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const pages = [];
  let lastIndex = 0;
  let currentPage = 1;
  let matched = false;
  let match;

  PAGE_MARKER_REGEX.lastIndex = 0;

  while ((match = PAGE_MARKER_REGEX.exec(source)) !== null) {
    matched = true;
    const content = source.slice(lastIndex, match.index).trim();
    if (content) {
      pages.push({
        page: currentPage,
        text: content,
        filename,
      });
    }
    currentPage = Number(match[1]) + 1;
    lastIndex = PAGE_MARKER_REGEX.lastIndex;
  }

  if (matched) {
    const tail = source.slice(lastIndex).trim();
    if (tail) {
      pages.push({
        page: currentPage,
        text: tail,
        filename,
      });
    }
    return pages;
  }

  const formFeedPages = source
    .split(/\f+/)
    .map((pageText) => pageText.trim())
    .filter(Boolean);
  if (formFeedPages.length > 1) {
    return formFeedPages.map((pageText, index) => ({
      page: index + 1,
      text: pageText,
      filename,
    }));
  }

  const fallbackPages = [];
  const chunks = source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  let buffer = '';
  let page = 1;
  chunks.forEach((chunk) => {
    const next = buffer ? `${buffer}\n\n${chunk}` : chunk;
    if (next.length > 1600 && buffer) {
      fallbackPages.push({ page, text: buffer, filename });
      page += 1;
      buffer = chunk;
      return;
    }
    buffer = next;
  });
  if (buffer) fallbackPages.push({ page, text: buffer, filename });

  return fallbackPages.length
    ? fallbackPages
    : [{ page: 1, text: source.trim(), filename }];
}

function extractTocFromBlock(text, toc, seen) {
  const tocMatch = text.match(
    /(?:table\s+of\s+contents?|contents?)\s*[\r\n]+([\s\S]{40,6000}?)(?:[\r\n]{3,}|--\s*\d+\s+of\s+\d+\s*--|(?=\n(?:section|chapter|\d+\.)\s))/i,
  );

  if (!tocMatch) return;

  tocMatch[1]
    .split(/[\r\n]+/)
    .forEach((rawLine) => {
      const line = cleanLabel(rawLine);
      if (!line) return;

      const numbered = line.match(/^(\d+(?:\.\d+){0,4})\.?\s+(.+)$/);
      if (numbered) {
        addUnique(toc, seen, numbered[2], numbered[1].split('.').length);
        return;
      }

      const dotted = line.match(/^(.+?)(?:\.{2,}|\s{2,})\s*(\d{1,4})$/);
      if (dotted && looksLikeHeading(dotted[1])) {
        addUnique(toc, seen, dotted[1], 1, { page: Number(dotted[2]) });
        return;
      }

      if (looksLikeHeading(line)) addUnique(toc, seen, line, 1);
    });
}

function extractTocFromLines(text, toc, seen) {
  splitLines(text).some((line) => {
    const numberedHeading = line.match(
      /^(?:section|chapter|appendix)?\s*(\d+(?:\.\d+){0,4})\.?\s+(.+)$/i,
    );
    if (numberedHeading) {
      addUnique(toc, seen, numberedHeading[2], numberedHeading[1].split('.').length);
    } else if (looksLikeHeading(line)) {
      addUnique(toc, seen, line, 1);
    }

    return toc.length >= 80;
  });
}

function extractTocInline(text, toc, seen) {
  const inlineMatches =
    text.match(/\b(\d+(?:\.\d+){0,4})\.?\s+([A-Z][A-Za-z0-9/&'()\-:, ]{2,70})(?=(?:\s{2,}|--\s*\d+\s+of\s+\d+\s*--|\n|$))/g) ||
    [];

  inlineMatches.some((match) => {
    const parsed = match.match(/^(\d+(?:\.\d+){0,4})\.?\s+(.+)$/);
    if (parsed) addUnique(toc, seen, parsed[2], parsed[1].split('.').length);
    return toc.length >= 80;
  });
}

function pickTopicFromPage(pageText, toc = [], filename = 'Document') {
  const text = String(pageText || '');
  const lowered = text.toLowerCase();

  let bestMatch = null;
  toc.forEach((item) => {
    const label = cleanLabel(item?.label);
    if (!label) return;
    const index = lowered.indexOf(label.toLowerCase());
    if (index === -1) return;
    if (!bestMatch || index < bestMatch.index || label.length > bestMatch.label.length) {
      bestMatch = { index, label };
    }
  });
  if (bestMatch) return bestMatch.label;

  const lines = splitLines(text);
  const heading = lines.find((line) => looksLikeHeading(line) && !/table of contents/i.test(line));
  if (heading) return cleanLabel(heading);

  return cleanLabel(filename) || 'this page';
}

function keywordFallback(text) {
  const matches = String(text || '')
    .toLowerCase()
    .match(/[a-z][a-z'-]{2,}/g);
  if (!matches) return [];

  const counts = new Map();
  matches.forEach((word) => {
    if (STOPWORDS.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

function makeQuestion(topic, page, pageText) {
  const cleanedTopic = cleanLabel(topic);
  if (cleanedTopic && cleanedTopic.toLowerCase() !== 'this page') {
    return `What should I know about "${cleanedTopic}"?`;
  }

  const keywords = keywordFallback(pageText);
  if (keywords.length > 0) {
    return `What are the main points on page ${page} about ${keywords.join(', ')}?`;
  }

  return `What are the key ideas on page ${page}?`;
}

function buildQuestionSuggestions({ text, filename = 'Document', toc = [], maxSuggestions = 40 }) {
  const pages = extractPages(text, filename);
  const suggestions = [];
  const seenQuestions = new Set();

  pages.some((pageData) => {
    const pageText = String(pageData.text || '').trim();
    if (pageText.length < 40) return false;

    const topic = pickTopicFromPage(pageText, toc, filename);
    const question = makeQuestion(topic, pageData.page, pageText);
    const key = question.toLowerCase();

    if (!seenQuestions.has(key)) {
      seenQuestions.add(key);
      suggestions.push({
        id: `question-${suggestions.length + 1}`,
        page: pageData.page,
        topic,
        question,
      });
    }

    return suggestions.length >= maxSuggestions;
  });

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'question-1',
      page: 1,
      topic: cleanLabel(filename) || 'Document',
      question: `What are the main ideas in "${cleanLabel(filename) || 'this document'}"?`,
    });
  }

  return suggestions;
}

function extractToc(text, filename = 'Document') {
  const toc = [];
  const seen = new Set();

  extractTocFromBlock(text, toc, seen);
  if (toc.length < 12) extractTocFromLines(text, toc, seen);
  if (toc.length < 6) extractTocInline(text, toc, seen);

  if (toc.length === 0) {
    addUnique(toc, seen, filename, 1);
  }

  return toc.slice(0, 80);
}

module.exports = {
  buildQuestionSuggestions,
  extractPages,
  extractToc,
};
