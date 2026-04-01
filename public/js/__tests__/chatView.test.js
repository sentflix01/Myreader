// Feature: chat-ui-redesign, Property 3: document title truncated to at most two words
// Feature: chat-ui-redesign, Property 7: TOC list item count matches RAG data input
// Feature: chat-ui-redesign, Property 5: enterprise gate controls documents view content

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import {
  truncateToTwoWords,
  renderTocView,
  renderDocsView,
} from '../chatView.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal document with a single container element. */
function makeContainer(id = 'container') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const el = dom.window.document.createElement('div');
  el.id = id;
  dom.window.document.body.appendChild(el);
  return { document: dom.window.document, el };
}

/**
 * Patch global.document so DOM-creating helpers inside chatView.js
 * (document.createElement) operate on the test document.
 */
function withDocument(doc, fn) {
  const orig = global.document;
  global.document = doc;
  try {
    return fn();
  } finally {
    global.document = orig;
  }
}

// ---------------------------------------------------------------------------
// Task 6.2 — Property 3: document title truncated to at most two words
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------

describe('truncateToTwoWords', () => {
  it('returns "No Document" for falsy input', () => {
    expect(truncateToTwoWords(null)).toBe('No Document');
    expect(truncateToTwoWords(undefined)).toBe('No Document');
    expect(truncateToTwoWords('')).toBe('No Document');
    expect(truncateToTwoWords('   ')).toBe('No Document');
  });

  it('returns the single word for a one-word title', () => {
    expect(truncateToTwoWords('Hello')).toBe('Hello');
  });

  it('returns exactly two words for a two-word title', () => {
    expect(truncateToTwoWords('Hello World')).toBe('Hello World');
  });

  it('truncates a longer title to two words', () => {
    expect(truncateToTwoWords('Hello World Extra')).toBe('Hello World');
  });

  // Validates: Requirements 2.2
  it('Property 3: result contains at most 2 whitespace-separated words for any input', () => {
    // Arbitrarily generate strings composed of 0–20 words
    const wordArb = fc.stringMatching(/^[a-zA-Z0-9]+$/);
    const sentenceArb = fc.array(wordArb, { minLength: 0, maxLength: 20 }).map(
      (words) => words.join(' ')
    );

    fc.assert(
      fc.property(sentenceArb, (input) => {
        const result = truncateToTwoWords(input);
        const wordCount = result.trim() === '' ? 0 : result.trim().split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(2);
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 6.4 — Property 7: TOC list item count matches RAG data input
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('renderTocView', () => {
  it('renders "No table of contents available" for null ragData', () => {
    const { document: doc, el } = makeContainer('tocView');
    withDocument(doc, () => {
      renderTocView({ tocView: el }, null);
    });
    expect(el.querySelector('p').textContent).toBe('No table of contents available');
  });

  it('renders "No table of contents available" for empty ragData', () => {
    const { document: doc, el } = makeContainer('tocView');
    withDocument(doc, () => {
      renderTocView({ tocView: el }, []);
    });
    expect(el.querySelector('p').textContent).toBe('No table of contents available');
  });

  it('renders correct li count and data-section-id for a known array', () => {
    const { document: doc, el } = makeContainer('tocView');
    const items = [
      { id: 'sec-1', label: 'Introduction', level: 1 },
      { id: 'sec-2', label: 'Chapter 1', level: 2 },
    ];
    withDocument(doc, () => {
      renderTocView({ tocView: el }, items);
    });
    const lis = el.querySelectorAll('li');
    expect(lis).toHaveLength(2);
    expect(lis[0].dataset.sectionId).toBe('sec-1');
    expect(lis[1].dataset.sectionId).toBe('sec-2');
  });

  // Validates: Requirements 3.3
  it('Property 7: TOC list item count matches RAG data input', () => {
    const tocItemArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      label: fc.string({ minLength: 1, maxLength: 50 }),
      level: fc.integer({ min: 1, max: 6 }),
    });

    fc.assert(
      fc.property(
        fc.array(tocItemArb, { minLength: 0, maxLength: 50 }),
        (items) => {
          const { document: doc, el } = makeContainer('tocView');
          withDocument(doc, () => {
            renderTocView({ tocView: el }, items);
          });

          if (items.length === 0) {
            expect(el.querySelector('p')).not.toBeNull();
            expect(el.querySelectorAll('li')).toHaveLength(0);
          } else {
            const lis = el.querySelectorAll('li');
            expect(lis).toHaveLength(items.length);
            items.forEach((item, i) => {
              expect(lis[i].dataset.sectionId).toBe(item.id);
            });
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 6.6 — Property 5: enterprise gate controls documents view content
// Validates: Requirements 4.2, 4.3
// ---------------------------------------------------------------------------

describe('renderDocsView', () => {
  it('renders a document list for enterprise users', () => {
    const { document: doc, el } = makeContainer('docsView');
    const documents = [
      { id: '1', name: 'Report.pdf', fileType: 'PDF', fileSize: '1.2 MB' },
    ];
    withDocument(doc, () => {
      renderDocsView({ docsView: el }, { isEnterprise: true, documents });
    });
    expect(el.querySelector('ul')).not.toBeNull();
    expect(el.querySelector('.docs-upgrade-prompt')).toBeNull();
  });

  it('renders upgrade prompt for non-enterprise users', () => {
    const { document: doc, el } = makeContainer('docsView');
    withDocument(doc, () => {
      renderDocsView({ docsView: el }, { isEnterprise: false, documents: [] });
    });
    expect(el.querySelector('.docs-upgrade-prompt')).not.toBeNull();
    expect(el.querySelector('ul')).toBeNull();
  });

  // Validates: Requirements 4.2, 4.3
  it('Property 5: enterprise gate controls documents view content', () => {
    const documentArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      fileType: fc.constantFrom('PDF', 'DOCX', 'TXT'),
      fileSize: fc.string({ minLength: 1, maxLength: 10 }),
    });

    fc.assert(
      fc.property(
        fc.boolean(),
        fc.array(documentArb, { minLength: 0, maxLength: 20 }),
        (isEnterprise, documents) => {
          const { document: doc, el } = makeContainer('docsView');
          withDocument(doc, () => {
            renderDocsView({ docsView: el }, { isEnterprise, documents });
          });

          if (isEnterprise) {
            expect(el.querySelector('ul')).not.toBeNull();
            expect(el.querySelector('.docs-upgrade-prompt')).toBeNull();
          } else {
            expect(el.querySelector('.docs-upgrade-prompt')).not.toBeNull();
            expect(el.querySelector('ul')).toBeNull();
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
