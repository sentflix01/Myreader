const {
  InMemoryVectorStore,
} = require('./core/vector-stores/InMemoryVectorStore');
let PineconeVectorStore;
const EmbeddingModel = require('./core/embeddings/EmbeddingModel');
const { cosineSimilarity } = require('./core/embeddings/similarity');
const DocumentProcessorService = require('./services/document/processorService');
const {
  getAnswerLanguageInstruction,
  normalizeLanguage,
} = require('../../utils/languageSupport');

const fetch = global.fetch || require('node-fetch');

class RAGService {
  constructor({ dimension = 384, topK = 5 } = {}) {
    this.dimension = dimension;
    this.topK = topK;

    const usePinecone =
      process.env.PINECONE_ENABLED === 'true' &&
      process.env.PINECONE_API_KEY &&
      process.env.PINECONE_INDEX;

    if (usePinecone) {
      try {
        PineconeVectorStore = require('./core/vector-stores/PineconeVectorStore');
        this.vectorStore = new PineconeVectorStore({
          apiKey: process.env.PINECONE_API_KEY,
          environment: process.env.PINECONE_ENV,
          indexName: process.env.PINECONE_INDEX,
          dimension,
        });
      } catch (err) {
        console.warn('[RAG] Pinecone failed, using InMemory:', err.message);
        this.vectorStore = new InMemoryVectorStore({ dimension });
      }
    } else {
      this.vectorStore = new InMemoryVectorStore({ dimension });
    }

    this.processor = new DocumentProcessorService({
      chunkingConfig: { chunkSize: 750, chunkOverlap: 150 },
      embeddingConfig: { dimension },
      vectorStore: this.vectorStore,
    });

    this.embeddingModel = new EmbeddingModel({ dimension });
  }

  async processDocument({ userId, docId, text, sourceDoc }) {
    return this.processor.processDocument({
      text: String(text || '').trim(),
      metadata: { userId, docId, sourceDoc },
      maxChunks: 500,
    });
  }

  async query({ userId, question, docIds = [], responseLanguage = 'en' } = {}) {
    const language = normalizeLanguage(responseLanguage);

    const queryEmbedding = await this.embeddingModel.embed(question);

    let nearest = await this.vectorStore.similaritySearch(
      queryEmbedding,
      {
        userId,
        docIds: Array.isArray(docIds) ? docIds.map(String) : [],
      },
      this.topK,
    );

    const context = nearest
      .map((item, idx) => {
        const fileName =
          item.metadata?.sourceDoc?.fileName ||
          item.metadata?.fileName ||
          'Document';
        return `Source ${idx + 1} (${fileName}):\n${item.text.slice(0, 600)} [score: ${item.score.toFixed(4)}]`;
      })
      .join('\n\n');

    const prompt = [
      'You are SentReader RAG assistant.',
      getAnswerLanguageInstruction(language),
      'Answer ONLY from the SOURCES below.',
      `Question: ${question}`,
      `Sources:\n${context}`,
    ].join('\n\n');

    const answer = await this.callLLM(prompt, language);

    return {
      answer,
      sources: nearest.map((item, idx) => ({
        id: idx + 1,
        score: item.score.toFixed(3),
        fileName: item.metadata?.sourceDoc?.fileName || 'Document',
        excerpt: item.text.trim().slice(0, 200),
      })),
    };
  }

  async callLLM(prompt, language) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const apiUrl = process.env.GEMINI_API_URL || process.env.API_URL;

    if (!apiKey || !apiUrl) {
      return 'LLM API not configured. Check config.env.';
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No response from LLM.'
      );
    } catch (err) {
      return `LLM error: ${err.message}`;
    }
  }
}

const ragService = new RAGService();
module.exports = { RAGService, ragService };
