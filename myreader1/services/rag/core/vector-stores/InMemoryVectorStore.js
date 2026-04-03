const { cosineSimilarity } = require('../embeddings/similarity');

class InMemoryVectorStore {
  constructor({ dimension = 384 } = {}) {
    this.dimension = dimension;
    this.byUser = new Map();
  }

  async addDocuments(docs = []) {
    console.log('Adding documents to vector store:', docs.length);
    for (const doc of docs) {
      const userId = doc?.metadata?.userId || 'anonymous';
      if (!this.byUser.has(userId)) this.byUser.set(userId, []);
      
      // Validate embedding
      if (!Array.isArray(doc.embedding) || doc.embedding.length !== this.dimension) {
        console.warn('Invalid embedding dimension:', doc.embedding?.length, 'expected:', this.dimension);
        continue;
      }
      
      this.byUser.get(userId).push({
        embedding: doc.embedding,
        text: doc.text,
        metadata: doc.metadata || {},
      });
    }
    
    const totalDocs = Array.from(this.byUser.values()).reduce((sum, docs) => sum + docs.length, 0);
    console.log('Vector store now contains:', totalDocs, 'documents');
  }

  async addVectors(docs = []) {
    return this.addDocuments(docs);
  }

  async similaritySearch(vector, k = 5, { filter } = {}) {
    const results = [];
    const userId = filter?.userId || 'anonymous';
    const docIds = Array.isArray(filter?.docIds)
      ? filter.docIds.map(String)
      : [];
    const docs = this.byUser.get(userId) || [];
    
    console.log('Similarity search:', {
      userId,
      docIds,
      availableDocs: docs.length,
      vectorDimension: vector.length
    });

    for (const d of docs) {
      if (docIds.length && !docIds.includes(String(d.metadata?.docId || ''))) {
        continue;
      }
      
      try {
        const score = cosineSimilarity(vector, d.embedding);
        if (isNaN(score)) {
          console.warn('Invalid similarity score for document:', d.metadata?.docId);
          continue;
        }
        results.push({ text: d.text, metadata: d.metadata, score });
      } catch (error) {
        console.warn('Error calculating similarity:', error.message);
        continue;
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, k);
    
    console.log('Similarity search results:', {
      totalCandidates: results.length,
      topK: topResults.length,
      topScores: topResults.map(r => r.score.toFixed(4))
    });
    
    return topResults;
  }
}

module.exports = InMemoryVectorStore;