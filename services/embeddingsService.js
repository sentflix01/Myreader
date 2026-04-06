/**
 * ============================================================
 * FILE: services/embeddingsService.js
 * ============================================================
 * PURPOSE:
 *   Generates vector embeddings for text chunks by calling the
 *   existing API_URL + API_KEY (Gemini embedding endpoint).
 *   Falls back to a simple TF-IDF-style hash vector if the API
 *   is unavailable (useful for local dev / testing).
 *
 * HOW TO INTEGRATE:
 *   Called by ragController.ingest() and ragService.answer().
 *   Reads process.env.API_KEY and process.env.EMBEDDING_URL
 *   (add EMBEDDING_URL to config.env — see note below).
 *
 * MVC ROLE: Service — pure API communication, no DB access.
 *
 * CONFIG.ENV ADDITIONS NEEDED:
 *   EMBEDDING_URL=https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
 *   EMBEDDING_DIM=768
 *   # If you prefer a different multilingual model, change the URL.
 *   # For Amharic, text-embedding-004 supports 100+ languages.
 *
 * AMHARIC NOTE:
 *   Google's text-embedding-004 model supports Amharic (Ge'ez
 *   script). No special preprocessing needed for embeddings.
 *   If switching to OpenAI text-embedding-3-small, Amharic is
 *   also supported. The fallback hash vector does NOT support
 *   semantic similarity for Amharic — use it only for testing.
 *
 * BATCHING:
 *   Gemini embedding API accepts one text per request. We batch
 *   with a configurable concurrency limit to avoid rate limits.
 *
 * SCALING NOTE:
 *   For 1000+ chunks, increase EMBED_CONCURRENCY or switch to
 *   a batch embedding endpoint (OpenAI supports up to 2048
 *   inputs per request).
 * ============================================================
 */

'use strict';

// How many embedding requests to run in parallel
const EMBED_CONCURRENCY = parseInt(process.env.EMBED_CONCURRENCY || '5', 10);
const EMBED_REQUEST_TIMEOUT_MS = parseInt(
  process.env.EMBED_TIMEOUT_MS || '4500',
  10,
);
const DEFAULT_EMBEDDING_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
let remoteEmbeddingsDisabled = false;

function disableRemoteEmbeddings(reason) {
  if (remoteEmbeddingsDisabled) return;
  remoteEmbeddingsDisabled = true;
  console.warn(`[Embeddings] Disabling remote embeddings for this session: ${reason}`);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Embedding request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate embeddings for an array of chunk objects.
 * Adds an `embedding` (number[]) field to each chunk.
 *
 * @param {Array<object>} chunks - From splitterService.split()
 * @returns {Promise<Array<object>>} chunks with .embedding added
 */
exports.embedChunks = async function embedChunks(chunks) {
  if (!chunks || chunks.length === 0) return [];

  const results = [];

  // Process in batches of EMBED_CONCURRENCY
  for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
    const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
    const embedded = await Promise.all(batch.map(embedOne));
    results.push(...embedded);
  }

  return results;
};

/**
 * Generate a single embedding for a query string (used at retrieval time).
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
exports.embedQuery = async function embedQuery(text) {
  const chunk = { id: 'query', text, metadata: {} };
  const result = await embedOne(chunk);
  return result.embedding;
};

// ── Private helpers ───────────────────────────────────────────

async function embedOne(chunk) {
  const apiKey = process.env.API_KEY;
  const embeddingUrl = process.env.EMBEDDING_URL || DEFAULT_EMBEDDING_URL;

  if (!apiKey) {
    console.warn('[Embeddings] API_KEY not set — using fallback hash vector.');
    return { ...chunk, embedding: hashVector(chunk.text) };
  }
  if (remoteEmbeddingsDisabled) {
    return { ...chunk, embedding: hashVector(chunk.text) };
  }

  try {
    const response = await fetchWithTimeout(embeddingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: chunk.text }] },
        taskType: chunk.id === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
      }),
    }, EMBED_REQUEST_TIMEOUT_MS);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.error?.message || 'Embedding API error';
      console.error(`[Embeddings] API error for chunk ${chunk.id}: ${msg}`);
      disableRemoteEmbeddings(msg);
      // Fallback on API error so ingestion doesn't fail completely
      return { ...chunk, embedding: hashVector(chunk.text) };
    }

    const vector =
      data?.embedding?.values ||
      data?.embeddings?.[0]?.values ||
      data?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
      console.warn(`[Embeddings] Empty vector for chunk ${chunk.id}, using fallback.`);
      disableRemoteEmbeddings('Embedding API returned an empty vector');
      return { ...chunk, embedding: hashVector(chunk.text) };
    }

    return { ...chunk, embedding: vector };

  } catch (err) {
    console.error(`[Embeddings] Network error: ${err.message} — using fallback.`);
    disableRemoteEmbeddings(err.message || 'Embedding request failed');
    return { ...chunk, embedding: hashVector(chunk.text) };
  }
}

/**
 * Fallback: deterministic hash-based pseudo-vector.
 * NOT semantically meaningful — for dev/testing only.
 * Dimension matches EMBEDDING_DIM env var (default 768).
 */
function hashVector(text) {
  const dim    = parseInt(process.env.EMBEDDING_DIM || '768', 10);
  const vector = new Array(dim).fill(0);
  const bytes  = Buffer.from(text || '', 'utf8');

  for (let i = 0; i < bytes.length; i++) {
    vector[i % dim] += bytes[i] / 255;
  }

  // L2-normalise
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}
