'use strict';

const crypto = require('crypto');

/**
 * Split text into overlapping chunks with metadata.
 *
 * @param {string} text       - Raw extracted text (UTF-8)
 * @param {object} options
 *   @param {number} options.chunkSize   - Target chars per chunk (default 800)
 *   @param {number} options.overlap     - Overlap chars between chunks (default 200)
 *   @param {string} options.docId
 *   @param {string} options.groupId
 *   @param {string} options.userId
 *   @param {string} options.filename
 *   @param {string} options.sourceType
 *   @param {string} options.language    - Language code (default "en")
 * @returns {Array<object>} chunks
 */
exports.split = function split(text, options = {}) {
  const {
    chunkSize = 800,
    overlap = 200,
    docId = '',
    groupId = '',
    userId = '',
    filename = '',
    sourceType = 'text',
    language = 'en',
  } = options;

  // 1. Preprocess
  let cleaned = preprocess(text);
  if (!cleaned) return [];

  // NEW: Paragraph-first split for better Amharic semantic chunking
  const paragraphs = cleaned.split(/\n\n+/);
  const paraChunks = [];

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paraSentences = splitSentences(paragraphs[pIdx]);
    let paraBuffer = '';
    for (const sentence of paraSentences) {
      if (paraBuffer.length + sentence.length > chunkSize / 2) {
        // Smaller chunks per para
        if (paraBuffer.trim()) {
          paraChunks.push(paraBuffer.trim());
        }
        paraBuffer = sentence;
      } else {
        paraBuffer += (paraBuffer ? ' ' : '') + sentence;
      }
    }
    if (paraBuffer.trim()) paraChunks.push(paraBuffer.trim());
  }

  cleaned = paraChunks.join('\n\n');

  // 2. Split into sentences
  let sentences = splitSentences(cleaned);
  if (!sentences.length) return [];

  // NEW: Prepend language tag for multilingual embeddings (Amharic)
  if (language === 'am') {
    sentences = sentences.map((s) => `[am] ${s}`);
  }

  // 3. Accumulate into chunks with overlap
  const chunks = [];
  let buffer = '';
  let bufStart = 0;
  let charOffset = 0;
  let sentIdx = 0;

  // Track sentences in current buffer for overlap carry-forward
  const bufferSentences = [];

  while (sentIdx < sentences.length) {
    const sentence = sentences[sentIdx];

    if (buffer.length + sentence.length > chunkSize && buffer.length > 0) {
      // Emit current chunk
      chunks.push(
        makeChunk({
          text: buffer.trim(),
          startChar: bufStart,
          endChar: bufStart + buffer.length,
          chunkIndex: chunks.length,
          docId,
          groupId,
          userId,
          filename,
          sourceType,
        }),
      );

      // Carry-forward overlap: keep last sentences that fit in `overlap` chars
      let overlapText = '';
      const overlapSents = [];
      for (let i = bufferSentences.length - 1; i >= 0; i--) {
        if (overlapText.length + bufferSentences[i].length <= overlap) {
          overlapText = bufferSentences[i] + ' ' + overlapText;
          overlapSents.unshift(bufferSentences[i]);
        } else {
          break;
        }
      }

      buffer = overlapText.trim();
      bufStart = charOffset - buffer.length;
      bufferSentences.length = 0;
      bufferSentences.push(...overlapSents);
    }

    buffer += (buffer ? ' ' : '') + sentence;
    bufferSentences.push(sentence);
    charOffset += sentence.length + 1;
    sentIdx++;
  }

  // Emit final chunk
  if (buffer.trim().length > 0) {
    chunks.push(
      makeChunk({
        text: buffer.trim(),
        startChar: bufStart,
        endChar: bufStart + buffer.length,
        chunkIndex: chunks.length,
        docId,
        groupId,
        userId,
        filename,
        sourceType,
      }),
    );
  }

  return chunks;
};

// ── Private helpers ───────────────────────────────────────────

/**
 * Normalise whitespace and handle Ge'ez script preprocessing.
 */
function preprocess(text) {
  if (!text) return '';

  return (
    text
      // Normalise line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Collapse multiple blank lines to one
      .replace(/\n{3,}/g, '\n\n')
      // Normalise spaces (but preserve newlines)
      .replace(/[^\S\n]+/g, ' ')
      // AMHARIC: normalise Ge'ez word separator ፡ (U+1361) to space
      // when used as a simple separator (not sentence end)
      // Keep ። (U+1362) as sentence terminator
      .replace(/፡(?!\s)/g, '፡ ')
      .trim()
  );
}

/**
 * Split text into sentences using Unicode-aware regex.
 * Handles: English (. ! ?), Amharic (። ፣), and paragraph breaks.
 */
function splitSentences(text) {
  // Split on:
  //   ።  Ge'ez full stop (U+1362)
  //   ፣  Ge'ez comma used as clause separator (U+1363)
  //   .  Latin full stop followed by space + capital or end
  //   !? Latin exclamation/question
  //   \n\n paragraph break
  const raw = text.split(/(?<=[።፣.!?])\s+|(?<=\n\n)/u);

  return raw
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0);
}

/**
 * Build a chunk object with a stable ID.
 */
function makeChunk({
  text,
  startChar,
  endChar,
  chunkIndex,
  docId,
  groupId,
  userId,
  filename,
  sourceType,
}) {
  // Stable ID: hash of docId + chunkIndex
  const id = crypto
    .createHash('sha256')
    .update(`${docId}::${chunkIndex}`)
    .digest('hex')
    .slice(0, 32);

  return {
    id,
    text,
    startChar,
    endChar,
    chunkIndex,
    // Metadata stored in Pinecone alongside the vector
    metadata: {
      docId,
      groupId,
      userId,
      filename,
      sourceType,
      chunkIndex,
    },
  };
}
