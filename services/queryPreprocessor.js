'use strict';

/**
 * Query Preprocessor — based on pguso/rag-from-scratch best practices.
 *
 * Pipeline (order matters):
 *   1. Lowercase + trim
 *   2. Normalize whitespace
 *   3. Expand abbreviations  ← BEFORE removing special chars
 *   4. Remove special characters
 *   5. (Optional) Remove stopwords
 */

// Common English stopwords — kept minimal so we don't strip meaning
const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from',
  'has','he','in','is','it','its','of','on','that','the',
  'to','was','will','with','this','these','those',
]);

// Domain-specific abbreviation expansions
const EXPANSIONS = {
  'ml':   'machine learning',
  'ai':   'artificial intelligence',
  'nlp':  'natural language processing',
  'rag':  'retrieval augmented generation',
  'llm':  'large language model',
  'js':   'javascript',
  'py':   'python',
  'db':   'database',
  'api':  'application programming interface',
  'ui':   'user interface',
  'ux':   'user experience',
  'abt':  'about',
  'plz':  'please',
  'pls':  'please',
  'thx':  'thanks',
  'diff': 'difference',
  'btw':  'between',
  'info': 'information',
  'docs': 'documentation',
  'repo': 'repository',
  'vs':   'versus',
  'w/':   'with',
  'w/o':  'without',
};

// Ge'ez Unicode range
const GE_EZ_REGEX = /[\u1200-\u137F]/;

/**
 * Full preprocessing pipeline.
 * Skips special-char removal for Amharic text to preserve Ge'ez script.
 *
 * @param {string} query
 * @param {object} opts
 * @returns {string} cleaned query
 */
exports.preprocess = function preprocess(query, opts = {}) {
  if (!query || typeof query !== 'string') return '';

  const isAmharic = GE_EZ_REGEX.test(query);
  const {
    expand       = true,
    removeStops  = false,
    removeSpecial = !isAmharic,  // preserve Ge'ez script
  } = opts;

  let q = query;

  // 1. Lowercase + trim
  q = q.toLowerCase().trim();

  // 2. Normalize whitespace
  q = q.replace(/\s+/g, ' ').trim();

  // 3. Expand abbreviations BEFORE removing special chars
  if (expand) {
    for (const [abbr, full] of Object.entries(EXPANSIONS)) {
      const re = new RegExp(`\\b${abbr.replace('/', '\\/')}\\b`, 'gi');
      q = q.replace(re, full);
    }
  }

  // 4. Remove special characters (keep letters, numbers, spaces, Ge'ez)
  if (removeSpecial) {
    q = q.replace(/[^a-z0-9\s\u1200-\u137F]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Optional stopword removal (off by default — modern embeddings handle them)
  if (removeStops) {
    q = q.split(' ').filter(w => w && !STOPWORDS.has(w)).join(' ');
  }

  return q || query.toLowerCase().trim(); // fallback to basic clean
};

/**
 * BM25-style keyword scoring for hybrid search.
 * Returns a score 0–1 based on term overlap between query and text.
 *
 * @param {string} query     - preprocessed query
 * @param {string} text      - chunk text
 * @returns {number}         - keyword score 0–1
 */
exports.keywordScore = function keywordScore(query, text) {
  if (!query || !text) return 0;

  const queryTerms = new Set(
    query.toLowerCase().split(/\s+/).filter(t => t.length > 2 && !STOPWORDS.has(t))
  );
  if (queryTerms.size === 0) return 0;

  const textLower = text.toLowerCase();
  let hits = 0;
  let weightedHits = 0;

  for (const term of queryTerms) {
    // Count occurrences (TF component)
    const count = (textLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    if (count > 0) {
      hits++;
      // Log-dampened TF (BM25-inspired)
      weightedHits += 1 + Math.log(count);
    }
  }

  if (hits === 0) return 0;

  // Normalize: coverage * weighted frequency
  const coverage = hits / queryTerms.size;
  const maxPossible = queryTerms.size * (1 + Math.log(10)); // assume max 10 occurrences
  const freqScore = Math.min(weightedHits / maxPossible, 1);

  return (coverage * 0.6 + freqScore * 0.4);
};
