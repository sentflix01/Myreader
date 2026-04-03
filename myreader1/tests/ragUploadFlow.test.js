const Document = require('../models/documentsModel');
const { RAGService } = require('../services/rag/ragService');

describe('RAG upload flow persistence', () => {
  let ragService;

  beforeEach(() => {
    ragService = new RAGService({ dimension: 64, topK: 3 });
  });

  test('stores string chunk ids without failing document validation', async () => {
    const docId = '507f1f77bcf86cd799439011';
    const userId = '507f191e810c19729de860ea';
    const processed = await ragService.processDocument({
      userId,
      docId,
      text: 'The quick brown fox jumps over the lazy dog. '.repeat(40),
      sourceDoc: { id: docId, fileName: 'sample.pdf' },
    });

    const document = new Document({
      user: userId,
      originalFileName: 'sample.pdf',
      fileType: 'pdf',
      status: 'completed',
      progress: 100,
      extractedText: 'The quick brown fox jumps over the lazy dog.',
      chunks: processed.chunks.map((chunk) => ({
        chunkId: chunk.metadata.chunkId,
        text: chunk.text,
        embeddingId: chunk.metadata.embeddingId,
      })),
      embeddings: {
        provider: 'local',
        model: 'local-embedding-engine',
        chunkVectors: processed.chunks.map((chunk) => ({
          chunkId: chunk.metadata.chunkId,
          embeddingId: chunk.metadata.embeddingId,
          vector: chunk.embedding,
        })),
      },
    });

    expect(document.validateSync()).toBeUndefined();
  });

  test('can retrieve stored chunks using string chunk ids when vector store is empty', async () => {
    const docId = '507f1f77bcf86cd799439011';
    const queryEmbedding = await ragService.embeddingModel.embed(
      'What does the contract say about payment terms?',
    );
    const storedVector = await ragService.embeddingModel.embed(
      'The payment terms require settlement within thirty days of invoice.',
    );

    const findSpy = jest.spyOn(Document, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: docId,
          originalFileName: 'contract.pdf',
          chunks: [
            {
              chunkId: `${docId}-1`,
              text: 'The payment terms require settlement within thirty days of invoice.',
            },
          ],
          embeddings: {
            chunkVectors: [
              {
                chunkId: `${docId}-1`,
                embeddingId: `${docId}-1`,
                vector: storedVector,
              },
            ],
          },
        },
      ]),
    });

    const results = await ragService.queryFromStoredDocuments({
      userId: '507f191e810c19729de860ea',
      queryEmbedding,
      docIds: [docId],
    });

    expect(results).toHaveLength(1);
    expect(results[0].metadata.docId).toBe(docId);
    expect(results[0].metadata.sourceDoc.fileName).toBe('contract.pdf');
    expect(results[0].text).toContain('payment terms');

    findSpy.mockRestore();
  });

  test('summary queries prefer the opening chunks from stored documents', async () => {
    const docId = '507f1f77bcf86cd799439011';
    const findSpy = jest.spyOn(Document, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: docId,
          originalFileName: 'intro-js.pdf',
          chunks: [
            {
              chunkId: `${docId}-1`,
              text: 'This document introduces JavaScript basics, HTML structure, and CSS styling before moving into programming concepts.',
            },
            {
              chunkId: `${docId}-2`,
              text: 'Later sections discuss machine language and assembly language details.',
            },
          ],
          embeddings: { chunkVectors: [] },
        },
      ]),
    });

    const result = await ragService.query({
      userId: '507f191e810c19729de860ea',
      question: 'Summarize this document.',
      docIds: [docId],
    });

    expect(result.answer).toContain('introduces JavaScript basics');

    findSpy.mockRestore();
  });
});
