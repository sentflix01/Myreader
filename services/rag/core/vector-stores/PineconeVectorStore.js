let Pinecone;
class PineconeVectorStore {
  constructor({ apiKey, environment, indexName, dimension }) {
    if (!process.env.PINECONE_ENABLED === 'true') {
      console.warn('[Pinecone] Disabled - using InMemory fallback');
      const { InMemoryVectorStore } = require('./InMemoryVectorStore');
      return new InMemoryVectorStore({ dimension });
    }

    Pinecone = require('@pinecone-database/pinecone');
    this.pc = new Pinecone({ apiKey, environment });
    this.index = this.pc.Index(indexName);
    this.dimension = dimension;
    this.namespace = 'default';
  }

  async upsert(chunks) {
    const vectors = chunks.map((chunk) => ({
      id:
        chunk.metadata.embeddingId ||
        `${chunk.metadata.docId}-${chunk.metadata.chunkId}`,
      values: chunk.embedding,
      metadata: chunk.metadata,
    }));

    await this.index.upsert({ vectors });
  }

  async similaritySearch(queryVector, filter, k) {
    const queryRequest = {
      vector: queryVector,
      topK: k,
      includeMetadata: true,
      includeValues: false,
    };

    if (filter.userId) {
      queryRequest.filter = { userId: filter.userId };
    }
    if (filter.docIds?.length) {
      queryRequest.filter = queryRequest.filter || {};
      queryRequest.filter.docIds = { $in: filter.docIds };
    }

    const results = await this.index.query(queryRequest);
    return (results.matches || []).map((match) => ({
      text: match.metadata.text,
      metadata: match.metadata,
      score: match.score,
    }));
  }

  async deleteByDocId(docId) {
    await this.index.delete({ filter: { docId } });
  }
}

module.exports = PineconeVectorStore;
