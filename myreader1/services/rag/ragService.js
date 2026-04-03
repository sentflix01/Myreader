const InMemoryVectorStore = require('./core/vector-stores/InMemoryVectorStore');
let PineconeVectorStore;
const EmbeddingModel = require('./core/embeddings/EmbeddingModel');
const { cosineSimilarity } = require('./core/embeddings/similarity');
const DocumentProcessorService = require('./services/document/processorService');
const Document = require('../../models/documentsModel');
const {
  getAnswerLanguageInstruction,
  getLocalizedCopy,
  normalizeLanguage,
} = require('../../utils/languageSupport');

const fetch = global.fetch || require('node-fetch');
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'show',
  'tell',
  'that',
  'the',
  'their',
  'this',
  'to',
  'let',
  'lets',
  'can',
  'could',
  'would',
  'uploaded',
  'use',
  'user',
  'was',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'you',
  'your',
]);
const SUMMARY_QUERY_PATTERN =
  /\b(summary|summarize|summarise|summerize|sumarize|sumarise|summery|overview|gist|core point|main point|key point|central idea|overall idea|overall point|big picture|what is this (document|file) about|what does this (document|file) say)\b|ማጠቃለያ|አጠቃላይ|ምን ይላል|ምን ይመለከታል/i;
const SUMMARY_PRIORITY_PATTERNS = [
  { pattern: /\babstract\b/i, bonus: 28 },
  { pattern: /\bexecutive summary\b/i, bonus: 24 },
  { pattern: /\bintroduction\b/i, bonus: 18 },
  { pattern: /\boverview\b|\bproject overview\b/i, bonus: 16 },
  { pattern: /\bobjective\b|\bpurpose\b|\bproblem statement\b/i, bonus: 14 },
  { pattern: /\bconclusion\b|\bsummary\b/i, bonus: 10 },
];
const SUMMARY_PENALTY_PATTERNS = [
  {
    pattern:
      /downloaded by|scan to open on studocu|studocu is not sponsored|lomoarcpsd\|/i,
    penalty: 80,
  },
  {
    pattern:
      /\bcertificate\b|\bdeclaration\b|\backnowledg(?:e)?ment\b|\btable of contents\b|\bbibliography\b|\breferences\b/i,
    penalty: 26,
  },
  {
    pattern:
      /\bsubmitted by\b|\broll no\b|\bpartial fulfillment\b|\bdepartment of\b/i,
    penalty: 20,
  },
  {
    pattern: /\bhardware requirements?\b|\bsoftware requirements?\b/i,
    penalty: 12,
  },
  {
    pattern: /\btechnologies used\b/i,
    penalty: 8,
  },
];

class RAGService {
  constructor({ dimension = 384, topK = 5 } = {}) {
    this.dimension = dimension;
    this.topK = topK;

    const shouldUsePinecone =
      process.env.PINECONE_ENABLED === 'true' &&
      process.env.PINECONE_API_KEY &&
      process.env.PINECONE_INDEX;

    if (shouldUsePinecone) {
      try {
        PineconeVectorStore = require('./core/vector-stores/PineconeVectorStore');
        this.vectorStore = new PineconeVectorStore({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENV,
          indexName: process.env.PINECONE_INDEX,
          dimension: this.dimension,
        });
      } catch (err) {
        this.vectorStore = new InMemoryVectorStore({
          dimension: this.dimension,
        });
      }
    } else {
      this.vectorStore = new InMemoryVectorStore({ dimension: this.dimension });
    }

    this.processor = new DocumentProcessorService({
      chunkingConfig: { chunkSize: 750, chunkOverlap: 150 },
      embeddingConfig: { dimension: this.dimension },
      vectorStore: this.vectorStore,
    });
    this.embeddingModel = new EmbeddingModel({ dimension: this.dimension });
  }

  async processDocument({ userId, docId, text, sourceDoc }) {
    const incoming = String(text || '').trim();
    if (!incoming) {
      throw new Error('Empty document text');
    }

    return this.processor.processDocument({
      text: incoming,
      metadata: { userId, docId, sourceDoc },
      maxChunks: 500,
    });
  }

  async query({ userId, question, docIds = [], responseLanguage = 'en' } = {}) {
    if (!question || !String(question).trim()) {
      throw new Error('Question is required');
    }

    const language = normalizeLanguage(responseLanguage);
    const summaryMode = this.isSummaryQuestion(question);
    const normalizedDocIds = Array.isArray(docIds)
      ? docIds.map((docId) => String(docId))
      : [];

    console.log('RAG Query:', {
      userId,
      question,
      docIds: normalizedDocIds,
      summaryMode,
    });

    const queryEmbedding = await this.embeddingModel.embed(question);
    console.log('Query embedding generated, dimension:', queryEmbedding.length);

    let nearest = [];
    try {
      nearest = await this.vectorStore.similaritySearch(
        queryEmbedding,
        this.topK,
        {
          filter: { userId: userId || 'anonymous', docIds: normalizedDocIds },
        },
      );
      console.log('Vector store search results:', nearest.length);
    } catch (err) {
      console.warn(
        'Vector store search failed, falling back to document search:',
        err.message,
      );
      nearest = [];
    }

    if (!nearest.length) {
      nearest = await this.queryFromStoredDocuments({
        userId,
        queryEmbedding,
        docIds: normalizedDocIds,
      });
      console.log('Document search results:', nearest.length);
    }

    if (summaryMode) {
      let summaryCandidates = await this.querySummaryCandidates({
        userId,
        docIds: normalizedDocIds,
      });
      if (!summaryCandidates.length) {
        summaryCandidates = await this.querySummaryCandidatesFromVectorStore({
          userId,
          docIds: normalizedDocIds,
        });
      }
      nearest = this.mergeCandidateSets(summaryCandidates, nearest);
      console.log('Summary mode - merged candidates:', nearest.length);
    }

    const lexicalMatches = await this.queryByLexicalSearch({
      userId,
      question,
      docIds: normalizedDocIds,
    });
    nearest = this.mergeCandidateSets(nearest, lexicalMatches);
    console.log('Final candidates after lexical search:', nearest.length);

    const contextText = nearest
      .map((item, idx) => {
        const fileName =
          item.metadata?.sourceDoc?.fileName || item.metadata?.fileName;
        const heading = fileName
          ? `Source ${idx + 1} (${fileName})`
          : `Source ${idx + 1}`;
        return `${heading}: ${item.text.trim().slice(0, 600)}\n[score:${item.score.toFixed(4)}]`;
      })
      .join('\n\n');

    const groundedPassages = this.selectGroundedPassages({ question, nearest });
    let answer = this.buildGroundedAnswer({
      question,
      nearest,
      groundedPassages,
      responseLanguage: language,
    });

    if (nearest.length && groundedPassages.length) {
      const llmPrompt = this.buildGroundedPrompt({
        question,
        groundedPassages,
        responseLanguage: language,
      });
      answer = await this.callLLM(llmPrompt, {
        question,
        nearest,
        groundedPassages,
        responseLanguage: language,
      });
    }

    return {
      answer,
      sources: (groundedPassages.length ? groundedPassages : nearest).map(
        (item, idx) => {
          const fileName =
            item.metadata?.sourceDoc?.fileName ||
            item.metadata?.fileName ||
            'Unknown Document';
          const score = parseFloat(item.score.toFixed(3));
          const excerpt = item.text.trim().replace(/\s+/g, ' ');
          const sourceLine = `Source ${idx + 1} (${fileName})`;
          return {
            id: idx + 1,
            score,
            fileName,
            excerpt,
            sourceLine,
          };
        },
      ),
      raw: {
        question,
        context: contextText,
        groundedPassages: groundedPassages.map((item) => item.text),
      },
    };
  }

  async queryFromStoredDocuments({ userId, queryEmbedding, docIds = [] }) {
    const filter = { user: userId, status: 'completed' };
    const docIdSet = new Set((docIds || []).map((docId) => String(docId)));

    let documents = [];
    try {
      documents = await Document.find(filter).select(
        'originalFileName chunks embeddings.chunkVectors',
      );
    } catch (_err) {
      return [];
    }

    const candidates = [];

    documents.forEach((doc) => {
      if (docIdSet.size && !docIdSet.has(String(doc._id))) return;

      const vectorsByChunkId = new Map(
        (doc.embeddings?.chunkVectors || []).map((chunkVector) => [
          String(chunkVector.chunkId),
          chunkVector.vector || [],
        ]),
      );

      (doc.chunks || []).forEach((chunk) => {
        const vector = vectorsByChunkId.get(String(chunk.chunkId));
        if (!Array.isArray(vector) || !vector.length) return;

        candidates.push({
          text: chunk.text,
          metadata: {
            docId: String(doc._id),
            sourceDoc: {
              id: String(doc._id),
              fileName: doc.originalFileName,
            },
          },
          score: cosineSimilarity(queryEmbedding, vector),
        });
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, this.topK);
  }

  async querySummaryCandidates({ userId, docIds = [] }) {
    const filter = { user: userId, status: 'completed' };
    const docIdSet = new Set((docIds || []).map((docId) => String(docId)));

    let documents = [];
    try {
      documents = await Document.find(filter).select('originalFileName chunks');
    } catch (_err) {
      return [];
    }

    const candidates = [];

    documents.forEach((doc, docIndex) => {
      if (docIdSet.size && !docIdSet.has(String(doc._id))) return;

      (doc.chunks || []).forEach((chunk, chunkIndex) => {
        const normalizedText = this.extractSummaryFocusText(chunk?.text);
        if (!normalizedText || normalizedText.length < 80) return;

        const score = this.getSummaryChunkScore(normalizedText, chunkIndex);
        if (score <= 0) return;

        candidates.push({
          text: normalizedText,
          metadata: {
            docId: String(doc._id),
            sourceDoc: {
              id: String(doc._id),
              fileName: doc.originalFileName,
            },
          },
          score: score - docIndex * 0.2,
        });
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, this.topK);
  }

  async querySummaryCandidatesFromVectorStore({ userId, docIds = [] }) {
    if (!(this.vectorStore?.byUser instanceof Map)) {
      return [];
    }

    const docs = this.vectorStore.byUser.get(userId) || [];
    const docIdSet = new Set((docIds || []).map((docId) => String(docId)));
    const groupedByDoc = new Map();

    docs.forEach((item) => {
      const docId = String(item?.metadata?.docId || '');
      if (!docId) return;
      if (docIdSet.size && !docIdSet.has(docId)) return;
      if (!groupedByDoc.has(docId)) groupedByDoc.set(docId, []);
      groupedByDoc.get(docId).push(item);
    });

    const candidates = [];

    groupedByDoc.forEach((items, docId) => {
      items
        .slice()
        .sort(
          (left, right) =>
            this.getChunkOrder(left?.metadata) -
            this.getChunkOrder(right?.metadata),
        )
        .forEach((item, chunkIndex) => {
          const normalizedText = this.extractSummaryFocusText(item?.text);
          if (!normalizedText || normalizedText.length < 80) return;

          const score = this.getSummaryChunkScore(normalizedText, chunkIndex);
          if (score <= 0) return;

          candidates.push({
            text: normalizedText,
            metadata: item.metadata,
            score,
          });
        });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, this.topK);
  }

  async queryByLexicalSearch({ userId, question, docIds = [] }) {
    const queryTokens = this.tokenize(question);
    if (!queryTokens.length) return [];

    const filter = { user: userId, status: 'completed' };
    const docIdSet = new Set((docIds || []).map((docId) => String(docId)));

    let documents = [];
    try {
      documents = await Document.find(filter).select('originalFileName chunks');
    } catch (_err) {
      return [];
    }
    const candidates = [];

    documents.forEach((doc) => {
      if (docIdSet.size && !docIdSet.has(String(doc._id))) return;

      (doc.chunks || []).forEach((chunk) => {
        const score = this.lexicalMatchScore(chunk.text, queryTokens);
        if (score <= 0) return;

        candidates.push({
          text: chunk.text,
          metadata: {
            docId: String(doc._id),
            sourceDoc: {
              id: String(doc._id),
              fileName: doc.originalFileName,
            },
          },
          score,
        });
      });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, this.topK);
  }

  lexicalMatchScore(text = '', queryTokens = []) {
    const chunkTokens = this.tokenize(text);
    if (!chunkTokens.length || !queryTokens.length) return 0;

    const counts = new Map();
    chunkTokens.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });

    let overlapScore = 0;
    queryTokens.forEach((token) => {
      if (!counts.has(token)) return;
      overlapScore += 1 + Math.min(counts.get(token) - 1, 2) * 0.2;
    });

    return overlapScore / queryTokens.length;
  }

  mergeCandidateSets(primary = [], secondary = []) {
    const merged = [...primary];
    const seen = new Set(
      primary.map((item) => `${item.metadata?.docId || 'na'}::${item.text}`),
    );

    secondary.forEach((item) => {
      const key = `${item.metadata?.docId || 'na'}::${item.text}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, this.topK);
  }

  tokenize(text = '') {
    return String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((token) => token && token.length > 2 && !STOP_WORDS.has(token));
  }

  normalizeChunkText(text = '') {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractSummaryFocusText(text = '') {
    const normalizedText = this.normalizeChunkText(text);
    if (!normalizedText) return '';

    const headingPatterns = [
      /\babstract\b/i,
      /\bexecutive summary\b/i,
      /\bintroduction\b/i,
      /\boverview\b/i,
      /\bobjective\b/i,
      /\bpurpose\b/i,
      /\bproblem statement\b/i,
      /\bconclusion\b/i,
    ];

    let startIndex = -1;

    headingPatterns.forEach((pattern) => {
      const matchIndex = normalizedText.search(pattern);
      if (matchIndex === -1) return;
      if (startIndex === -1 || matchIndex < startIndex) {
        startIndex = matchIndex;
      }
    });

    if (startIndex === -1) return normalizedText;
    return normalizedText.slice(startIndex).trim();
  }

  getChunkOrder(metadata = {}) {
    const chunkId = String(metadata?.chunkId || '');
    const trailingNumber = chunkId.match(/-(\d+)$/);
    if (trailingNumber) return Number(trailingNumber[1]);
    return Number(metadata?.chunk || 0);
  }

  isSummaryQuestion(question = '') {
    const normalizedQuestion = String(question || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const queryTokens = this.tokenize(question);
    if (queryTokens.length === 0) return true;
    if (SUMMARY_QUERY_PATTERN.test(normalizedQuestion)) return true;

    const hasToken = (token) => queryTokens.includes(token);
    const tokenPairMatches = [
      hasToken('core') && hasToken('point'),
      hasToken('main') && hasToken('point'),
      hasToken('key') && hasToken('point'),
      hasToken('central') && hasToken('idea'),
      hasToken('overall') && (hasToken('idea') || hasToken('point')),
    ];

    return tokenPairMatches.some(Boolean);
  }

  splitIntoSentences(text = '') {
    return String(text)
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?።])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  sentenceOverlapScore(sentence, queryTokens = []) {
    if (!queryTokens.length) return 0;
    const sentenceTokens = new Set(this.tokenize(sentence));
    let overlap = 0;
    queryTokens.forEach((token) => {
      if (sentenceTokens.has(token)) overlap += 1;
    });
    return overlap;
  }

  hasSummaryPriority(text = '') {
    return SUMMARY_PRIORITY_PATTERNS.some(({ pattern }) => pattern.test(text));
  }

  isLikelyBoilerplate(text = '') {
    const normalizedText = this.normalizeChunkText(text).toLowerCase();
    if (!normalizedText) return true;
    if (/^\d+$/.test(normalizedText)) return true;
    return SUMMARY_PENALTY_PATTERNS.some(({ pattern, penalty }) => {
      if (penalty < 20) return false;
      return pattern.test(normalizedText);
    });
  }

  cleanPassageText(text = '') {
    return this.normalizeChunkText(text)
      .replace(
        /^.*?\b(abstract|executive summary|summary|introduction|overview|conclusion)\b\s*[:.\-]?\s*/i,
        '',
      )
      .replace(/\bDownloaded by .+$/i, '')
      .trim();
  }

  getSummaryChunkScore(text = '', chunkIndex = 0) {
    const normalizedText = this.normalizeChunkText(text);
    if (!normalizedText) return Number.NEGATIVE_INFINITY;

    const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;
    const sentenceCount = this.splitIntoSentences(normalizedText).length;
    let score = Math.max(0, 10 - chunkIndex * 0.45);

    score += Math.min(8, wordCount / 30);
    score += Math.min(6, sentenceCount * 1.5);

    SUMMARY_PRIORITY_PATTERNS.forEach(({ pattern, bonus }) => {
      if (pattern.test(normalizedText)) score += bonus;
    });

    SUMMARY_PENALTY_PATTERNS.forEach(({ pattern, penalty }) => {
      if (pattern.test(normalizedText)) score -= penalty;
    });

    if (!/[.!?።]/.test(normalizedText)) score -= 6;
    if (/^[A-Z0-9\s,'"().\-–—]+$/.test(normalizedText)) score -= 8;

    return score;
  }

  getPassageQualityScore(text = '', { summaryMode = false } = {}) {
    const cleanedText = this.cleanPassageText(text);
    if (!cleanedText) return Number.NEGATIVE_INFINITY;
    if (this.isLikelyBoilerplate(cleanedText)) return Number.NEGATIVE_INFINITY;

    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
    let score = Math.min(5, wordCount / 10);

    if (/[.!?።]$/.test(cleanedText)) score += 1;
    if (summaryMode && this.hasSummaryPriority(text)) score += 4;

    SUMMARY_PENALTY_PATTERNS.forEach(({ pattern, penalty }) => {
      if (pattern.test(cleanedText)) score -= penalty / 10;
    });

    return score;
  }

  selectGroundedPassages({ question, nearest = [] }) {
    if (!nearest.length) return [];

    const queryTokens = this.tokenize(question);
    const summaryMode = this.isSummaryQuestion(question);
    const candidates = [];

    nearest.forEach((item) => {
      const sentences = this.splitIntoSentences(item.text);
      sentences.forEach((sentence, sentenceIdx) => {
        const normalizedSentence = this.cleanPassageText(sentence);
        if (summaryMode && normalizedSentence.length < 40) return;
        if (!summaryMode && normalizedSentence.length < 10) return;
        const qualityScore = this.getPassageQualityScore(normalizedSentence, {
          summaryMode,
        });
        if (!Number.isFinite(qualityScore)) return;
        const overlap = this.sentenceOverlapScore(sentence, queryTokens);
        if (!summaryMode && overlap === 0) return;
        const positionBoost = summaryMode
          ? Math.max(0, 3 - sentenceIdx) * 1.5
          : 0;
        const openingBoost =
          summaryMode &&
          /^(this (is|report|document)|project\b)/i.test(normalizedSentence)
            ? 2
            : 0;

        candidates.push({
          text: normalizedSentence,
          score:
            Number(item.score || 0) +
            overlap +
            qualityScore +
            positionBoost +
            openingBoost,
          metadata: item.metadata,
          sentenceIdx,
          chunkOrder: this.getChunkOrder(item.metadata),
        });
      });
    });

    const seen = new Set();
    candidates.sort((a, b) => b.score - a.score);

    const selected = candidates
      .filter((candidate) => {
        const normalized = candidate.text.toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 3);

    if (summaryMode) {
      const ordered = selected.sort(
        (left, right) =>
          left.chunkOrder - right.chunkOrder ||
          left.sentenceIdx - right.sentenceIdx,
      );

      const completeSentences = ordered.filter((candidate) =>
        /[.!?።]$/.test(candidate.text),
      );

      if (completeSentences.length >= 2) {
        return completeSentences.slice(0, 3);
      }

      return ordered;
    }

    return selected;
  }

  buildGroundedPrompt({
    question,
    groundedPassages = [],
    responseLanguage = 'en',
  }) {
    const sourceBlock = groundedPassages
      .map((item, idx) => {
        const fileName =
          item.metadata?.sourceDoc?.fileName || item.metadata?.fileName;
        const header = fileName
          ? `Source ${idx + 1} (${fileName})`
          : `Source ${idx + 1}`;
        return `${header}\n${item.text.trim()}`;
      })
      .join('\n\n');

    return [
      "You are SentReader's document-grounded assistant.",
      getAnswerLanguageInstruction(responseLanguage),
      'Answer only from the provided SOURCE PASSAGES.',
      'If the sources do not support the answer, clearly say you could not find it in the uploaded document.',
      'Do not invent facts, citations, or quotes.',
      'Keep the answer concise and useful.',
      `QUESTION:\n${question}`,
      `SOURCE PASSAGES:\n${sourceBlock}`,
    ].join('\n\n');
  }

  buildGroundedAnswer({
    question,
    nearest,
    groundedPassages = [],
    responseLanguage = 'en',
  }) {
    if (!nearest.length) {
      return getLocalizedCopy(responseLanguage, 'rag.noDocuments', {
        question,
      });
    }

    if (!groundedPassages.length) {
      return getLocalizedCopy(responseLanguage, 'rag.noSupportedAnswer', {
        question,
      });
    }

    if (this.isSummaryQuestion(question)) {
      const summary = groundedPassages
        .map((item) => this.cleanPassageText(item.text))
        .filter(Boolean)
        .join(' ');

      return [
        getLocalizedCopy(responseLanguage, 'rag.answerIntro', { question }),
        '',
        summary,
      ].join('\n');
    }

    const snippets = groundedPassages.map((item, idx) => {
      const fileName =
        item.metadata?.sourceDoc?.fileName || item.metadata?.fileName;
      const sourcePrefix = getLocalizedCopy(
        responseLanguage,
        'rag.sourcePrefix',
        { index: idx + 1 },
      );
      const prefix = fileName ? `${sourcePrefix} (${fileName})` : sourcePrefix;
      return `${prefix}: ${item.text.trim()}`;
    });

    return [
      getLocalizedCopy(responseLanguage, 'rag.answerIntro', { question }),
      '',
      ...snippets,
    ].join('\n');
  }

  async callLLM(
    prompt,
    { question, nearest, groundedPassages = [], responseLanguage = 'en' } = {},
  ) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const apiUrl = process.env.GEMINI_API_URL || process.env.API_URL;
    const fallback = () =>
      this.buildGroundedAnswer({
        question,
        nearest,
        groundedPassages: groundedPassages.length
          ? groundedPassages
          : this.selectGroundedPassages({ question, nearest }),
        responseLanguage,
      });

    if (!apiKey || !apiUrl) {
      return fallback();
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return fallback();
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return String(text).trim() || fallback();
    } catch (err) {
      return fallback();
    }
  }
}

const ragService = new RAGService();

module.exports = {
  RAGService,
  ragService,
};
