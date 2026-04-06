function normalizeLineForComparison(value = '') {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shouldDiscardExtractedLine(line = '', occurrences = new Map()) {
  const normalized = normalizeLineForComparison(line);
  if (!normalized) return true;

  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;

  const directNoisePatterns = [
    /studocu is not sponsored or endorsed/i,
    /scan to open on studocu/i,
    /^downloaded by .+@.+$/i,
    /^lomoarcpsd\|\d+$/i,
    /^=.+\.pdf$/i,
  ];

  if (directNoisePatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const repeatCount = occurrences.get(normalized) || 0;
  if (
    repeatCount >= 2 &&
    normalized.length <= 180 &&
    (
      normalized.includes('.pdf') ||
      normalized.includes('technical university') ||
      normalized.includes('studocu') ||
      normalized.includes('downloaded by') ||
      normalized.includes('lomoarcpsd|')
    )
  ) {
    return true;
  }

  return false;
}

function sanitizeExtractedText(value = '') {
  const lines = String(value || '')
    .replace(/\u0000/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const occurrences = new Map();
  lines.forEach((line) => {
    const normalized = normalizeLineForComparison(line);
    occurrences.set(normalized, (occurrences.get(normalized) || 0) + 1);
  });

  return lines
    .filter((line) => !shouldDiscardExtractedLine(line, occurrences))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  normalizeLineForComparison,
  shouldDiscardExtractedLine,
  sanitizeExtractedText,
};
