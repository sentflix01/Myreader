const EmbeddingModel = require('../core/embeddings/EmbeddingModel');
const RecursiveCharacterTextSplitter = require('../core/text-splitters/RecursiveCharacterTextSplitter');

class DocumentProcessorService {
  constructor({ chunkingConfig, embeddingConfig, vectorStore }) {
    this.splitter = new RecursiveCharacterTextSplitter();
    this.embeddingModel = new EmbeddingModel(embeddingConfig);
    this.vectorStore = vectorStore;
    this.chunkingConfig = chunkingConfig;
  }

  async processDocument({ text, metadata, maxChunks = Infinity }) {
    // Split into chunks
    const chunks = await this.splitter.split(text, {
      ...this.chunkingConfig,
      ...metadata,
    });

    // Limit chunks
    const limitedChunks = chunks.slice(0, maxChunks);

    // Embed
    const embeddedChunks = await this.embeddingModel.embedChunks(limitedChunks);

    // Store
    await this.vectorStore.upsert(embeddedChunks);

    return {
      chunks: limitedChunks,
      embeddedChunks,
      totalChunks: limitedChunks.length,
    };
  }
}

module.exports = DocumentProcessorService;
