const RecursiveCharacterTextSplitter = require('../../core/text-splitters/RecursiveCharacterTextSplitter');
const EmbeddingModel = require('../../core/embeddings/EmbeddingModel');

class DocumentProcessorService {
  constructor({ chunkingConfig = {}, embeddingConfig = {}, vectorStore } = {}) {
    this.textSplitter = new RecursiveCharacterTextSplitter(chunkingConfig);
    this.embeddingModel = new EmbeddingModel(embeddingConfig);
    this.vectorStore = vectorStore;
  }

  async processDocument({ text, metadata = {}, maxChunks = 200 } = {}) {
    if (!this.vectorStore) throw new Error('vectorStore is required');

    const docs = [{ text, metadata }];
    let chunks = this.textSplitter.splitDocuments(docs);

    if (Number.isFinite(maxChunks) && maxChunks > 0) {
      chunks = chunks.slice(0, maxChunks);
    }

    const embeddedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.embeddingModel.embed(chunk.text);
      const chunkId = `${metadata.docId}-${i + 1}`;
      embeddedChunks.push({
        embedding,
        text: chunk.text,
        metadata: {
          ...chunk.metadata,
          userId: metadata.userId,
          docId: metadata.docId,
          chunkId,
          embeddingId: chunkId,
        },
      });
    }

    try {
      if (typeof this.vectorStore.addDocuments === 'function') {
        await this.vectorStore.addDocuments(embeddedChunks);
      } else if (typeof this.vectorStore.addVectors === 'function') {
        await this.vectorStore.addVectors(embeddedChunks);
      }
    } catch (err) {
      // The document database remains the durable source of truth.
    }

    return { chunks: embeddedChunks };
  }
}

module.exports = DocumentProcessorService;
