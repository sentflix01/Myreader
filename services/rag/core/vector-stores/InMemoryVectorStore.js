class InMemoryVectorStore {
  constructor({ dimension = 384 } = {}) {
    this.dimension = dimension;
    this.byUser = new Map(); // userId → docId → chunks[]
  }

  async upsert(chunks) {
    for (const chunk of chunks) {
      const userId = chunk.metadata?.userId;
      const docId = chunk.metadata?.docId;
      if (!userId || !docId) continue;

      if (!this.byUser.has(userId)) this.byUser.set(userId, new Map());
      if (!this.byUser.get(userId).has(docId))
        this.byUser.get(userId).set(docId, []);

      this.byUser.get(userId).get(docId).push(chunk);
    }
  }

  async similaritySearch(queryVector, filter = {}, k = 5) {
    const userId = filter.userId;
    if (!userId || !this.byUser.has(userId)) return [];

    const allChunks = [];
    for (const [docId, chunks] of this.byUser.get(userId)) {
      if (filter.docIds && !filter.docIds.includes(docId)) continue;
      allChunks.push(...chunks);
    }

    const scored = allChunks
      .map((chunk) => ({
        text: chunk.text,
        metadata: chunk.metadata,
        score: cosineSimilarity(queryVector, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, k);
  }

  async deleteByDocId(docId) {
    for (const [userId, docs] of this.byUser) {
      docs.delete(docId);
      if (docs.size === 0) this.byUser.delete(userId);
    }
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB) || 0;
}

module.exports = { InMemoryVectorStore, cosineSimilarity };
