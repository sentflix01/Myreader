const { RAGService } = require('../services/rag/ragService');

describe('RAGService', () => {
  let ragService;

  beforeEach(() => {
    ragService = new RAGService({ dimension: 384, topK: 5 });
  });

  test('should initialize with default values', () => {
    expect(ragService.dimension).toBe(384);
    expect(ragService.topK).toBe(5);
  });

  test('should throw error for empty document text', async () => {
    await expect(ragService.processDocument({ text: '' })).rejects.toThrow(
      'Empty document text',
    );
  });
});
