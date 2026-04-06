import { describe, expect, it } from 'vitest';
import documentInsightsService from '../documentInsightsService';

const { buildQuestionSuggestions, extractPages, extractToc } =
  documentInsightsService;

describe('documentInsightsService', () => {
  const sampleText = `
Table of Contents
1. Introduction 1
2. Payment Terms 2
3. Privacy Commitments 3

Introduction
This agreement explains the service scope and responsibilities.
-- 1 of 3 --
2. Payment Terms
Payment terms cover invoices, due dates, and refund handling.
-- 2 of 3 --
3. Privacy Commitments
Privacy commitments describe how personal information is stored and protected.
-- 3 of 3 --
  `.trim();

  it('extracts heading-style TOC items from mixed document text', () => {
    const toc = extractToc(sampleText, 'Agreement.pdf');

    expect(toc.slice(0, 3).map((item) => item.label)).toEqual([
      'Introduction',
      'Payment Terms',
      'Privacy Commitments',
    ]);
  });

  it('splits page-marked text into one page record per marker gap', () => {
    const pages = extractPages(sampleText, 'Agreement.pdf');

    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.page)).toEqual([1, 2, 3]);
  });

  it('creates at most one suggestion per page', () => {
    const toc = extractToc(sampleText, 'Agreement.pdf');
    const suggestions = buildQuestionSuggestions({
      text: sampleText,
      filename: 'Agreement.pdf',
      toc,
    });

    expect(suggestions).toHaveLength(3);
    expect(new Set(suggestions.map((item) => item.page)).size).toBe(3);
    expect(suggestions[1].question).toContain('Payment Terms');
  });
});
