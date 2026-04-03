/**
 * ============================================================
 * FILE: services/splitterService.js
 * ============================================================
 * PURPOSE:
 *   Splits raw extracted text into overlapping chunks suitable
 *   for embedding and retrieval. Pure JavaScript — no external
 *   dependencies.
 *
 * HOW TO INTEGRATE:
 *   Called by ragController.ingest() after loaderService.extract().
 *
 * MVC ROLE: Service — stateless text processing utility.
 *
 * ALGORITHM:
 *   1. Preprocess: normalise whitespace, handle Ge'ez punctuation
 *   2. Split into sentences using a Unicode-aware regex
 *   3. Accumulate sentences into chunks of ~chunkSize characters
 *   4. Each chunk overlaps the previous by ~overlap characters
 *      (achieved by carrying the last N sentences forward)
 *
 * AMHARIC / GE'EZ NOTES:
 *   - Ge'ez sentence terminators: ። (U+1362), ፡ (U+1361), ፣ (U+1363)
 *   - The sentence splitter regex includes these alongside Latin
 *     punctuation so Amharic text is chunked at natural boundaries.
 *   - TODO: For better semantic chunking of Amharic, consider a
 *     paragraph-first split (split on \n\n) before sentence split.
 *   - TODO: If using a multilingual embedding model, prepend a
 *     language tag to each chunk: "[am] " + chunkText
 *
 * CHUNK METADATA:
 *   Each returned chunk object contains:
 *     { id, text, docId, groupId, userId, filename, sourceType,
 *       chunkIndex, startChar, endChar }
 *   This metadata is stored alongside the vector in Pinecone so
 *   retrieval can return source citations.
 *
 * SCALING NOTE:
 *   This is CPU-bound. For very large documents (>500KB text),
 *   offload to a worker thread using Node's worker_threads module.
 * ============================================================
 */

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
 * @returns {Array<object>} chunks
 */
exports.split = function split(text, options = {}) {
  const {
    chunkSize  = 800,
    overlap    = 200,
    docId      = '',
    groupId    = '',
    userId     = '',
    filename   = '',
    sourceType = 'text',
  } = options;

  // 1. Preprocess
  const cleaned = preprocess(text);
  if (!cleaned) return [];

  // 2. Split into sentences
  const sentences = splitSentences(cleaned);
  if (!sentences.length) return [];

  // 3. Accumulate into chunks with overlap
  const chunks   = [];
  let buffer     = '';
  let bufStart   = 0;
  let charOffset = 0;
  let sentIdx    = 0;

  // Track sentences in current buffer for overlap carry-forward
  const bufferSentences = [];

  while (sentIdx < sentences.length) {
    const sentence = sentences[sentIdx];

    if (buffer.length + sentence.length > chunkSize && buffer.length > 0) {
      // Emit current chunk
      chunks.push(makeChunk({
        text: buffer.trim(),
        startChar: bufStart,
        endChar: bufStart + buffer.length,
        chunkIndex: chunks.length,
        docId, groupId, userId, filename, sourceType,
      }));

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
    chunks.push(makeChunk({
      text: buffer.trim(),
      startChar: bufStart,
      endChar: bufStart + buffer.length,
      chunkIndex: chunks.length,
      docId, groupId, userId, filename, sourceType,
    }));
  }

  return chunks;
};

// ── Private helpers ───────────────────────────────────────────

/**
 * Normalise whitespace and handle Ge'ez script preprocessing.
 */
function preprocess(text) {
  if (!text) return '';

  return text
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
    .trim();
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
function makeChunk({ text, startChar, endChar, chunkIndex, docId, groupId, userId, filename, sourceType }) {
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
