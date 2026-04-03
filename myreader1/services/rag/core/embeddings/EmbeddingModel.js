const crypto = require('crypto');

class EmbeddingModel {
  constructor({ dimension = 384 } = {}) {
    this.dimension = dimension;
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'the', 'this', 'but', 'they', 'have',
      'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their',
      'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
      'her', 'would', 'make', 'like', 'into', 'him', 'time', 'two', 'more',
      'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call',
      'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get',
      'come', 'made', 'may', 'part'
    ]);
  }

  preprocessText(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token))
      .slice(0, 4000);
  }

  async embed(text) {
    const tokens = this.preprocessText(text);
    if (tokens.length === 0) {
      return new Array(this.dimension).fill(0);
    }

    const vector = new Array(this.dimension).fill(0);
    const tokenWeights = new Map();
    
    // Calculate term frequency
    tokens.forEach(token => {
      tokenWeights.set(token, (tokenWeights.get(token) || 0) + 1);
    });
    
    // Create embedding using weighted token hashing
    tokenWeights.forEach((freq, token) => {
      const hash = crypto.createHash('sha256').update(token).digest();
      
      // Use multiple hash positions for better distribution
      for (let i = 0; i < Math.min(4, hash.length / 4); i++) {
        const idx = hash.readUInt32BE(i * 4) % this.dimension;
        const weight = Math.log(1 + freq); // Log frequency weighting
        vector[idx] += weight;
      }
    });

    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}

module.exports = EmbeddingModel;