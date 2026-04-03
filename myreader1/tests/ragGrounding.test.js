const { RAGService } = require('../services/rag/ragService');

describe('RAG grounding', () => {
  let ragService;
  let originalFetch;

  beforeEach(() => {
    ragService = new RAGService({ dimension: 64, topK: 3 });
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    process.env.API_KEY = 'configured';
    process.env.API_URL = 'https://example.com/llm';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.API_KEY;
    delete process.env.API_URL;
  });

  test('answers with grounded document passages only', async () => {
    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-1',
      text: [
        'Payment is due within thirty days of invoice.',
        'Late fees may apply after that deadline.',
        'Support requests should be sent by email.',
      ].join(' '),
      sourceDoc: { id: 'doc-1', fileName: 'contract.pdf' },
    });

    const result = await ragService.query({
      userId: 'user-1',
      question: 'When is payment due?',
      docIds: ['doc-1'],
    });

    expect(result.answer).toContain('Answer based only on the uploaded document');
    expect(result.answer).toContain('Payment is due within thirty days of invoice.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('refuses unsupported answers when the document does not contain them', async () => {
    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-1',
      text: 'This agreement covers payment timing and support contacts only.',
      sourceDoc: { id: 'doc-1', fileName: 'contract.pdf' },
    });

    const result = await ragService.query({
      userId: 'user-1',
      question: 'Who is the CEO?',
      docIds: ['doc-1'],
    });

    expect(result.answer).toContain("I couldn't find a supported answer");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('restricts answers to the selected document scope', async () => {
    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-1',
      text: 'Payment is due within thirty days of invoice.',
      sourceDoc: { id: 'doc-1', fileName: 'contract.pdf' },
    });

    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-2',
      text: 'Support requests should be sent to support@example.com.',
      sourceDoc: { id: 'doc-2', fileName: 'support.pdf' },
    });

    const result = await ragService.query({
      userId: 'user-1',
      question: 'When is payment due?',
      docIds: ['doc-2'],
    });

    expect(result.answer).toContain("I couldn't find a supported answer");
    expect(result.answer).not.toContain('Payment is due within thirty days');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('summary mode prefers abstract content over boilerplate chunks', async () => {
    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-1',
      text: [
        'Downloaded by reader@example.com. Scan to open on Studocu. Certificate. Submitted by the student for partial fulfillment of the degree. '.repeat(
          8,
        ),
        'ABSTRACT. This report describes NATOURS, a full-stack tour planning website. It uses HTML, CSS, and JavaScript on the front end and MongoDB, Express, and Node.js on the back end. It allows users to browse tours, plan trips, leave reviews, upload images, and make payments. '.repeat(
          4,
        ),
        'INTRODUCTION. Project NATOURS combines nature and tours and helps users organize travel around their interests. '.repeat(
          4,
        ),
        'TECHNOLOGIES USED. HTML is used for structure. CSS is used for styling. JavaScript adds interactivity. '.repeat(
          6,
        ),
      ].join(' '),
      sourceDoc: { id: 'doc-1', fileName: 'natours.pdf' },
    });

    const result = await ragService.query({
      userId: 'user-1',
      question: "Let's summarise the core point",
      docIds: ['doc-1'],
    });

    expect(result.answer).toContain('NATOURS');
    expect(result.answer.toLowerCase()).toContain(
      'full-stack tour planning website',
    );
    expect(result.answer).not.toContain('Downloaded by');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('detects misspelled summary questions like core point prompts', async () => {
    await ragService.processDocument({
      userId: 'user-1',
      docId: 'doc-1',
      text: [
        'Introduction to Programming Basics.',
        'This document explains the foundations of JavaScript and interactive webpages.',
        'It focuses on programming basics, conditional statements, and decision loops.',
      ].join(' '),
      sourceDoc: { id: 'doc-1', fileName: 'week1.pdf' },
    });

    const result = await ragService.query({
      userId: 'user-1',
      question: 'let summerize the core point?',
      docIds: ['doc-1'],
    });

    expect(result.answer.toLowerCase()).not.toContain(
      "i couldn't find a supported answer",
    );
    expect(result.answer).toContain('JavaScript');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
