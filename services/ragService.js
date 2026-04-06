'use strict';

/**
 * ragService.js — Upgraded RAG pipeline
 *
 * Implements best practices from pguso/rag-from-scratch:
 *   1. Query preprocessing  (clean → expand → normalize)
 *   2. Hybrid retrieval     (vector similarity + BM25 keyword scoring)
 *   3. Result re-ranking    (combined score with configurable weights)
 *   4. Conversational memory (last N turns injected into prompt)
 *   5. Structured prompt    (system + context + history + question)
 *   6. Inline citations     (source [1], [2] in the answer)
 *   7. Amharic support      (Ge'ez-aware preprocessing + prompt)
 */

const embeddingsService  = require('./embeddingsService');
const vectorService      = require('./vectorService');
const { preprocess, keywordScore } = require('./queryPreprocessor');
const RagDocument        = require('../model/ragModel');
const AppError           = require('../utils/appError');

// node-fetch fallback for Node < 18
const _fetch = global.fetch || require('node-fetch');

// ── Config ────────────────────────────────────────────────────
const TOP_K          = parseInt(process.env.RAG_TOP_K        || '8',   10); // fetch more, re-rank to 5
const FINAL_K        = parseInt(process.env.RAG_FINAL_K      || '5',   10); // top after re-ranking
const VECTOR_WEIGHT  = parseFloat(process.env.RAG_VEC_WEIGHT || '0.7');     // hybrid: vector weight
const KEYWORD_WEIGHT = 1 - VECTOR_WEIGHT;                                    // hybrid: keyword weight
const MAX_HISTORY    = parseInt(process.env.RAG_MAX_HISTORY  || '4',   10); // conversation turns

// Ge'ez Unicode range
const GE_EZ_REGEX = /[\u1200-\u137F]/;

// ── Public API ────────────────────────────────────────────────

/**
 * Generate a RAG answer using the full upgraded pipeline.
 *
 * @param {object} params
 *   @param {string}   params.question
 *   @param {string}   params.groupId
 *   @param {string[]} params.docIds       - Optional doc filter
 *   @param {string}   params.userId
 *   @param {string}   params.tier
 *   @param {string}   params.language     - 'am' | 'en' | 'auto'
 *   @param {Array}    params.history      - [{role,text}] conversation history
 * @returns {Promise<{ answer, sources, tokenCount, chunkCount, processedQuery }>}
 */
exports.answer = async function answer({
  question, groupId, docIds, userId, tier, language, history = [],
}) {
  const isAmharic = language === 'am' || (language === 'auto' && GE_EZ_REGEX.test(question));

  // ── Step 1: Query preprocessing ──────────────────────────────
  const processedQuery = preprocess(question, {
    expand: true,
    removeSpecial: !isAmharic,
    removeStops: false,
  });


  // ── Step 2: Embed the preprocessed query ─────────────────────
  const queryVector = await embeddingsService.embedQuery(processedQuery);

  // ── Step 3: Vector retrieval (fetch TOP_K candidates) ─────────
  const candidates = await vectorService.query(
    queryVector,
    { groupId, docIds },
    TOP_K,
  );

  if (!candidates || candidates.length === 0) {
    return {
      answer: isAmharic
        ? 'ይቅርታ፣ ከተሰጠው ሰነድ ጋር የሚዛመድ መረጃ አልተገኘም።'
        : 'I could not find relevant information in the uploaded document for your question.',
      sources: [], tokenCount: 0, chunkCount: 0, processedQuery,
    };
  }

  // ── Step 4: Hybrid re-ranking (vector + keyword) ──────────────
  const reranked = candidates
    .map((c) => {
      const text    = c.metadata?.text || '';
      const vecSc   = c.score || 0;                              // cosine similarity 0–1
      const kwSc    = keywordScore(processedQuery, text);        // BM25-style 0–1
      const hybrid  = vecSc * VECTOR_WEIGHT + kwSc * KEYWORD_WEIGHT;
      return { ...c, hybridScore: hybrid, keywordScore: kwSc };
    })
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, FINAL_K);



  // ── Step 5: Build numbered context block ─────────────────────
  const contextParts = reranked.map((m, i) => {
    const meta = m.metadata || {};
    return `[${i + 1}] Source: ${meta.filename || 'document'} (chunk ${meta.chunkIndex ?? i})\n${meta.text || ''}`;
  });
  const contextBlock = contextParts.join('\n\n---\n\n');

  // ── Step 6: Build conversation history snippet ────────────────
  const recentHistory = (history || [])
    .slice(-MAX_HISTORY * 2)  // last N turns (user + assistant pairs)
    .map(h => `${h.role === 'sent' ? 'User' : 'Assistant'}: ${h.text}`)
    .join('\n');

  // ── Step 7: Build structured prompt ──────────────────────────
  const systemPrompt = isAmharic
    ? buildAmharicPrompt()
    : buildEnglishPrompt();

  // ── Step 8: Call LLM ──────────────────────────────────────────

  const { text: rawAnswer, tokenCount } = await callLLM({
    systemPrompt,
    contextBlock,
    history: recentHistory,
    question,
    isAmharic,
  });

  // ── Step 9: Build source citations ───────────────────────────
  const sources = reranked.map((m, i) => ({
    index:      i + 1,
    docId:      m.metadata?.docId      || '',
    filename:   m.metadata?.filename   || '',
    chunkIndex: m.metadata?.chunkIndex ?? 0,
    score:      Math.round((m.hybridScore || 0) * 1000) / 1000,
    vectorScore: Math.round((m.score || 0) * 1000) / 1000,
    keywordScore: Math.round((m.keywordScore || 0) * 1000) / 1000,
  }));

  // ── Step 10: Update query stats (fire-and-forget) ─────────────
  const docIdsHit = [...new Set(sources.map(s => s.docId).filter(Boolean))];
  if (docIdsHit.length > 0) {
    RagDocument.updateMany(
      { docId: { $in: docIdsHit } },
      { $inc: { queryCount: 1 }, $set: { lastQueriedAt: new Date() } },
    ).catch(() => {});
  }

  // Clean up markdown bold from Gemini output
  const answer = rawAnswer
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();

  return { answer, sources, tokenCount, chunkCount: reranked.length, processedQuery };
};

// ── Prompt builders ───────────────────────────────────────────

function buildEnglishPrompt() {
  return [
    'You are a precise, helpful document assistant.',
    'Answer the user\'s question using ONLY the numbered context passages provided below.',
    'Rules:',
    '• Cite sources inline using [1], [2], etc. matching the context numbers.',
    '• If multiple sources support a claim, cite all of them: [1][3].',
    '• If the context does not contain enough information, say so clearly — do not guess.',
    '• Keep answers concise and well-structured.',
    '• Do not add information not present in the context.',
  ].join('\n');
}

function buildAmharicPrompt() {
  return [
    'ጥያቄውን በአማርኛ ብቻ መልስ። ምንም እንግሊዝኛ አትጠቀም።',
    'ከዚህ በታች ያሉትን ምንጮች ብቻ ተጠቀም።',
    'ምንጮቹን [1], [2] በሚለው ቁጥር ጠቅስ።',
    'ከሰነዱ ውጭ ምንም አትጨምር።',
    'መልሱ ትክክለኛ፣ ግልጽ እና አጭር ይሁን።',
  ].join('\n');
}

// ── LLM caller ────────────────────────────────────────────────

async function callLLM({ systemPrompt, contextBlock, history, question, isAmharic }) {
  const apiKey = process.env.API_KEY;
  const apiUrl = process.env.API_URL;

  if (!apiKey || !apiUrl) {
    throw new AppError('LLM API not configured (API_KEY / API_URL missing).', 500);
  }

  // Build Gemini contents array
  const contents = [];

  // System instruction
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Understood. I will answer using only the provided context and cite sources.' }],
  });

  // Context passages
  contents.push({
    role: 'user',
    parts: [{ text: `## Context Passages\n\n${contextBlock}` }],
  });

  // Conversation history (if any)
  if (history && history.trim()) {
    contents.push({
      role: 'user',
      parts: [{ text: `## Conversation History\n${history}` }],
    });
  }

  // The actual question
  const questionLabel = isAmharic ? '## ጥያቄ' : '## Question';
  contents.push({
    role: 'user',
    parts: [{ text: `${questionLabel}\n\n${question}` }],
  });

  const response = await _fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,      // low temp = more factual, less hallucination
        topP: 0.8,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || 'LLM request failed';
    throw new AppError(`LLM error: ${msg}`, 502);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AppError('LLM returned an empty response.', 502);

  const tokenCount =
    data?.usageMetadata?.totalTokenCount ||
    (data?.usageMetadata?.promptTokenCount || 0) +
    (data?.usageMetadata?.candidatesTokenCount || 0) || 0;

  return { text: String(text), tokenCount };
}
