// Placeholder - use current embeddingsService.js
module.exports = class EmbeddingModel {
  constructor({ dimension = 384 } = {}) {
    this.dimension = dimension;
  }

  async embed(text) {
    const { embeddingsService } = require('../../../embeddingsService');
    return await embeddingsService.embedQuery(text);
  }

  async embedChunks(chunks) {
    const { embeddingsService } = require('../../../embeddingsService');
    return await embeddingsService.embedChunks(chunks);
  }
};
