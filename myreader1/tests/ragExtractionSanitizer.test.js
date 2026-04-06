const { __testables } = require('../controllers/ragController');

describe('RAG extraction sanitization', () => {
  test('treats page-marker-only PDF output as empty text', () => {
    const raw = `
      -- 1 of 53 --

      -- 2 of 53 --

      -- 3 of 53 --
    `;

    expect(__testables.sanitizeExtractedText(raw)).toBe('');
  });

  test('keeps Amharic text while removing page markers', () => {
    const raw = `
      -- 1 of 2 --
      ይህ ሰነድ ስለ የበደል ካሳ ይናገራል።
      -- 2 of 2 --
    `;

    expect(__testables.sanitizeExtractedText(raw)).toBe(
      'ይህ ሰነድ ስለ የበደል ካሳ ይናገራል።',
    );
  });

  test('removes repeated PDF watermark and download boilerplate', () => {
    const raw = `
      =twinkle' (1).pdf
      Computer science engineering (I. K. Gujral Punjab Technical University)
      Scan to open on Studocu
      Studocu is not sponsored or endorsed by any college or university
      Downloaded by sintayehu mulugeta (sentaman20@gmail.com)
      lOMoARcPSD|60467436
      -- 1 of 14 --
      1
      ABSTRACT
      This is a full-stack Tour Planning website.
      Computer science engineering (I. K. Gujral Punjab Technical University)
      Downloaded by sintayehu mulugeta (sentaman20@gmail.com)
    `;

    expect(__testables.sanitizeExtractedText(raw)).toBe(
      'ABSTRACT\nThis is a full-stack Tour Planning website.',
    );
  });
});
