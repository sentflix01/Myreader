/**
 * ============================================================
 * FILE: services/loaderService.js
 * ============================================================
 * PURPOSE:
 *   Extracts raw UTF-8 text from multiple source types:
 *     - PDF       → pdf-parse
 *     - DOCX      → mammoth
 *     - XLSX      → xlsx (SheetJS)
 *     - TXT/HTML  → fs.readFile with UTF-8 encoding
 *     - URL       → node-fetch + cheerio (strips HTML tags)
 *
 * HOW TO INTEGRATE:
 *   Called by ragController.ingest(). No changes needed.
 *
 * MVC ROLE: Service — pure extraction logic, no DB access.
 *
 * AMHARIC NOTE:
 *   All file reads use 'utf8' encoding. pdf-parse and mammoth
 *   both preserve Unicode (Ge'ez script) correctly. If you see
 *   garbled Amharic from PDFs, the PDF was likely scanned (image-
 *   only). In that case, integrate Tesseract.js with the 'amh'
 *   language pack for OCR (marked as TODO below).
 *
 * SCALING NOTE:
 *   For very large PDFs (100+ pages), consider streaming page-by-
 *   page using pdfjs-dist instead of loading the whole buffer.
 *
 * PACKAGES REQUIRED:
 *   npm install pdf-parse mammoth xlsx node-fetch cheerio
 * ============================================================
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Extract plain text from a file on disk.
 *
 * @param {string} filePath  - Absolute path to the file
 * @param {string} mimeType  - MIME type string
 * @param {string} ext       - File extension without dot (pdf, docx, xlsx, txt, html)
 * @returns {Promise<string>} - Extracted UTF-8 text
 */
exports.extract = async function extract(filePath, mimeType, ext) {
  const normalExt = (ext || '').toLowerCase().replace('.', '');

  switch (normalExt) {
    case 'pdf':
      return extractPdf(filePath);
    case 'docx':
    case 'doc':
      return extractDocx(filePath);
    case 'xlsx':
    case 'xls':
      return extractXlsx(filePath);
    case 'txt':
      return extractText(filePath);
    case 'html':
    case 'htm':
      return extractHtml(filePath);
    default:
      // Fallback: try reading as plain text
      return extractText(filePath);
  }
};

/**
 * Extract text from a URL (website).
 * Used when sourceType === 'url'.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
exports.extractUrl = async function extractUrl(url) {
  const fetch   = require('node-fetch');
  const cheerio = require('cheerio');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'SentReader-RAG/1.0' },
    timeout: 15000,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL "${url}": HTTP ${response.status}`);
  }

  const html = await response.text();
  const $    = cheerio.load(html);

  // Remove noise elements
  $('script, style, nav, footer, header, aside, noscript').remove();

  // Extract visible text
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text;
};

// ── Private helpers ───────────────────────────────────────────

async function extractPdf(filePath) {
  const { PDFParse } = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text || '';
}

async function extractDocx(filePath) {
  const mammoth = require('mammoth');
  const result  = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
}

function extractXlsx(filePath) {
  const XLSX      = require('xlsx');
  const workbook  = XLSX.readFile(filePath, { codepage: 65001 }); // UTF-8
  const lines     = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv   = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ' });
    lines.push(`=== Sheet: ${sheetName} ===`);
    lines.push(csv);
  });

  return lines.join('\n');
}

function extractText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractHtml(filePath) {
  const cheerio = require('cheerio');
  const html    = fs.readFileSync(filePath, 'utf8');
  const $       = cheerio.load(html);
  $('script, style').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
