const { Pinecone } = require('@pinecone-database/pinecone');

function ensureFloatArray(arr) {
  return Array.isArray(arr) ? arr.map((v) => Number(v)) : [];
}

class PineconeVectorStore {
  constructor({ apiKey, environment, indexName, dimension = 1536 } = {}) {
    if (!apiKey || !indexName)
      throw new Error('Pinecone API key and index name required');
    this.dimension = dimension;
    this.indexName = indexName;
    this.client = new Pinecone({ apiKey });
    this.initialized = false;
    this._init({ environment, indexName }).catch((err) => {
      console.error('Pinecone init error:', err.message);
    });
  }

  async _init({ environment }) {
    this.index = this.client.index(this.indexName);
    this.initialized = true;
  }

  // docs: [{ id, embedding, text, metadata }]
  async addDocuments(docs = []) {
    if (!this.initialized) await this._waitInit();
    const vectors = docs.map((d) => ({
      id:
        d.id ||
        d.metadata?.chunkId ||
        `${d.metadata?.docId || 'doc'}-${Math.random().toString(36).slice(2, 9)}`,
      values: ensureFloatArray(d.embedding),
      metadata: Object.assign({}, d.metadata || {}, { text: d.text }),
    }));

    // Upsert in batches of 100 and collect ids
    const batchSize = 100;
    const ids = [];
    for (let i = 0; i < vectors.length; i += batchSize) {
      const chunk = vectors.slice(i, i + batchSize);
      await this.index.upsert(chunk);
      ids.push(...chunk.map((v) => v.id));
    }

    return ids;
  }

  async similaritySearch(vector, k = 5, { filter } = {}) {
    if (!this.initialized) await this._waitInit();
    const topK = k;
    const queryOptions = {
      vector: ensureFloatArray(vector),
      topK,
      includeMetadata: true,
      includeValues: false,
    };

    if (filter && (filter.userId || filter.docIds?.length)) {
      queryOptions.filter = {};

      if (filter.userId) {
        queryOptions.filter.userId = { $eq: filter.userId };
      }

      if (Array.isArray(filter.docIds) && filter.docIds.length === 1) {
        queryOptions.filter.docId = { $eq: String(filter.docIds[0]) };
      }

      if (Array.isArray(filter.docIds) && filter.docIds.length > 1) {
        queryOptions.filter.docId = {
          $in: filter.docIds.map((docId) => String(docId)),
        };
      }
    }

    const res = await this.index.query(queryOptions);
    const matches = (res.matches || []).map((m) => ({
      text: m.metadata?.text || '',
      metadata: m.metadata || {},
      score: m.score || 0,
    }));
    return matches;
  }

  async deleteByDocId(docId) {
    if (!this.initialized) await this._waitInit();
    try {
      await this.index.deleteOne({ filter: { docId } });
    } catch (err) {
      // best-effort
    }
  }

  async _waitInit(timeout = 10000) {
    const start = Date.now();
    while (!this.initialized) {
      if (Date.now() - start > timeout)
        throw new Error('Pinecone init timeout');
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

module.exports = PineconeVectorStore;
