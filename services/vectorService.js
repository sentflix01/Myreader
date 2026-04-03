/**
 * ============================================================
 * FILE: services/vectorService.js
 * ============================================================
 * PURPOSE:
 *   Abstracts vector storage and similarity search behind a
 *   single interface. Automatically uses:
 *     - Pinecone (official @pinecone-database/pinecone SDK)
 *       when PINECONE_API_KEY + PINECONE_INDEX are set in env.
 *     - In-memory fallback (cosine similarity) otherwise.
 *
 * HOW TO INTEGRATE:
 *   Called by ragController (upsert, deleteByDocId) and
 *   ragService (query). No changes needed.
 *
 * MVC ROLE: Service — vector DB abstraction layer.
 *
 * DOCUMENT GROUP FEATURE:
 *   - upsert(): stores each chunk vector with metadata
 *     { docId, groupId, userId, filename, chunkIndex }
 *   - query(): accepts a filter object { groupId, docIds? }
 *     to restrict results to the relevant knowledge base.
 *
 * SWITCHING BETWEEN PINECONE AND FALLBACK:
 *   Set PINECONE_API_KEY and PINECONE_INDEX in config.env to
 *   enable Pinecone. Remove or leave blank to use in-memory.
 *   The interface is identical — no code changes needed.
 *
 * PINECONE INDEX SETUP:
 *   Create a Pinecone index with:
 *     - Dimensions: 768 (text-embedding-004) or 1536 (OpenAI)
 *     - Metric: cosine
 *     - Pod type: starter (free) or p1/s1 for production
 *
 * AMHARIC NOTE:
 *   No special handling needed. Vectors are language-agnostic.
 *
 * SCALING NOTE:
 *   The in-memory store is lost on server restart. For production
 *   without Pinecone, use a file-based store (write to JSON on
 *   disk) or switch to a self-hosted Qdrant/Weaviate instance.
 * ============================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Persistent in-memory fallback store ──────────────────────
// Backed by a JSON file so vectors survive server restarts.
const STORE_FILE = path.join(__dirname, '..', 'uploads', 'rag', '_vectors.json');

// Load existing vectors from disk on startup
let memoryStore = new Map();
try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    memoryStore = new Map(Object.entries(raw));
    console.log(`[VectorStore] Loaded ${memoryStore.size} vectors from disk`);
  }
} catch (_) {}

// Save to disk (debounced — max once per 2s)
let saveTimer = null;
function saveToDisk() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const obj = Object.fromEntries(memoryStore);
      fs.writeFileSync(STORE_FILE, JSON.stringify(obj));
    } catch (_) {}
  }, 2000);
}

// ── Pinecone client (lazy init) ───────────────────────────────
let pineconeIndex = null;

async function getPineconeIndex() {
  if (pineconeIndex) return pineconeIndex;

  const apiKey    = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (!apiKey || !indexName) return null;

  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey });
    pineconeIndex = pc.index(indexName);
    console.log(`[VectorStore] Connected to Pinecone index: ${indexName}`);
    return pineconeIndex;
  } catch (err) {
    console.error('[VectorStore] Pinecone init failed:', err.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Store an array of embedded chunks.
 *
 * @param {Array<{ id, text, embedding, metadata }>} chunks
 */
exports.upsert = async function upsert(chunks) {
  if (!chunks || chunks.length === 0) return;

  const index = await getPineconeIndex();

  if (index) {
    // Pinecone: upsert in batches of 100
    const BATCH = 100;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH).map((c) => ({
        id: c.id,
        values: c.embedding,
        metadata: { ...c.metadata, text: c.text },
      }));
      await index.upsert(batch);
    }
    console.log(`[VectorStore] Pinecone upserted ${chunks.length} vectors`);
  } else {
    // In-memory fallback
    for (const c of chunks) {
      memoryStore.set(c.id, {
        id: c.id,
        embedding: c.embedding,
        metadata: { ...c.metadata, text: c.text },
      });
    }
    saveToDisk();
    console.log(`[VectorStore] Memory upserted ${chunks.length} vectors (total: ${memoryStore.size})`);
  }
};

/**
 * Query for the top-K most similar chunks.
 *
 * @param {number[]} queryVector  - Embedding of the user's question
 * @param {object}  filter        - { groupId, docIds?: string[] }
 * @param {number}  topK          - Number of results (default 5)
 * @returns {Promise<Array<{ id, score, metadata }>>}
 */
exports.query = async function query(queryVector, filter = {}, topK = 5) {
  const index = await getPineconeIndex();

  if (index) {
    return pineconeQuery(index, queryVector, filter, topK);
  }
  return memoryQuery(queryVector, filter, topK);
};

/**
 * Delete all vectors belonging to a specific document.
 *
 * @param {string} docId
 */
exports.deleteByDocId = async function deleteByDocId(docId) {
  const index = await getPineconeIndex();

  if (index) {
    // Pinecone: delete by metadata filter (requires paid plan for filter-delete)
    // Fallback: fetch IDs first then delete
    try {
      await index.deleteMany({ filter: { docId } });
      console.log(`[VectorStore] Pinecone deleted vectors for docId: ${docId}`);
    } catch (err) {
      console.warn('[VectorStore] Pinecone filter-delete not available on free plan:', err.message);
    }
  } else {
    // In-memory: iterate and remove
    let count = 0;
    for (const [id, record] of memoryStore.entries()) {
      if (record.metadata?.docId === docId) {
        memoryStore.delete(id);
        count++;
      }
    }
    saveToDisk();
    console.log(`[VectorStore] Memory deleted ${count} vectors for docId: ${docId}`);
  }
};

// ── Private: Pinecone query ───────────────────────────────────

async function pineconeQuery(index, queryVector, filter, topK) {
  // Build Pinecone metadata filter
  const pineconeFilter = { groupId: { $eq: filter.groupId } };

  if (Array.isArray(filter.docIds) && filter.docIds.length > 0) {
    pineconeFilter.docId = { $in: filter.docIds };
  }

  const result = await index.query({
    vector: queryVector,
    topK,
    filter: pineconeFilter,
    includeMetadata: true,
  });

  return (result.matches || []).map((m) => ({
    id: m.id,
    score: m.score,
    metadata: m.metadata || {},
  }));
}

// ── Private: in-memory cosine similarity query ────────────────

function memoryQuery(queryVector, filter, topK) {
  const results = [];

  for (const record of memoryStore.values()) {
    const meta = record.metadata || {};

    // Apply group filter
    if (filter.groupId && meta.groupId !== filter.groupId) continue;

    // Apply docId filter (optional)
    if (Array.isArray(filter.docIds) && filter.docIds.length > 0) {
      if (!filter.docIds.includes(meta.docId)) continue;
    }

    const score = cosineSimilarity(queryVector, record.embedding);
    results.push({ id: record.id, score, metadata: meta });
  }

  // Sort descending by score, return top K
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
