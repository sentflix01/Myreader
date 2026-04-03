const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { htmlToText } = require('html-to-text');
const { ragService: RAGService } = require('../services/rag/ragService');
const subscriptionService = require('../services/subscriptionService');
const Document = require('../models/documentsModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { getRequestLanguage } = require('../utils/languageSupport');

const uploadStorage = multer.memoryStorage();
const uploader = multer({
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024, files: 100 },
});
const uploadSingle = uploader.single('file');
const uploadMany = uploader.array('files', 100);

function normalizeRelativePath(value = '') {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();
}

function getBaseFileName(value = '') {
  const normalized = normalizeRelativePath(value);
  return path.posix.basename(normalized || String(value || ''));
}

function inferFolderName(relativePath = '', fallback = '') {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized.includes('/')) return fallback || '';
  return normalized.split('/')[0] || fallback || '';
}

function inferType(filename, mimeType) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (
    lower.endsWith('.docx') ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (lower.endsWith('.doc') || mimeType === 'application/msword') return 'doc';
  if (lower.endsWith('.txt') || mimeType === 'text/plain') return 'txt';
  if (lower.endsWith('.html') || mimeType === 'text/html') return 'html';
  if (lower.endsWith('.json') || mimeType === 'application/json') return 'json';
  if (lower.endsWith('.csv') || mimeType === 'text/csv') return 'csv';
  return 'txt';
}

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
    .replace(/\f/g, '\n') // Form feed to newline
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const occurrences = new Map();
  lines.forEach((line) => {
    const normalized = normalizeLineForComparison(line);
    occurrences.set(normalized, (occurrences.get(normalized) || 0) + 1);
  });

  const cleanedLines = lines
    .filter((line) => !shouldDiscardExtractedLine(line, occurrences))
    .map(line => {
      // Clean up common PDF artifacts
      return line
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
        .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after sentence endings
        .trim();
    })
    .filter(line => line.length > 2); // Remove very short lines

  return cleanedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildNoExtractableTextMessage(originalFileName, fileType) {
  if (fileType === 'pdf') {
    return `Uploaded file '${originalFileName}' contains no extractable text. This usually means the PDF is scanned or image-based and needs OCR before SentReader can read it.`;
  }

  return `Uploaded file '${originalFileName}' contains no extractable text. Please use a text-based file or OCR the document.`;
}

async function extractText(file) {
  const type = inferType(file.originalname, file.mimetype);

  if (type === 'pdf') {
    try {
      const data = await pdfParse(file.buffer);
      return data.text || '';
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  if (type === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value || '';
    } catch (err) {
      return file.buffer.toString('utf8');
    }
  }

  if (type === 'html') {
    return htmlToText(file.buffer.toString('utf8'), { wordwrap: false });
  }

  if (type === 'json') {
    try {
      const parsed = JSON.parse(file.buffer.toString('utf8'));
      return JSON.stringify(parsed, null, 2);
    } catch (err) {
      return file.buffer.toString('utf8');
    }
  }

  return file.buffer.toString('utf8');
}

function summarizeUploadResult({
  document,
  chunkCount = 0,
  readyForChat = false,
  message = '',
}) {
  return {
    _id: document._id,
    originalFileName: document.originalFileName,
    relativePath: document.relativePath || document.originalFileName,
    folderId: document.folderId || null,
    folderName: document.folderName || null,
    fileType: document.fileType,
    fileSize: document.fileSize,
    status: document.status,
    chunkCount,
    readyForChat,
    ...(message ? { message } : {}),
  };
}

async function processUploadedFile({
  userId,
  file,
  folderId,
  folderName,
  uploadKind = 'file',
}) {
  const relativePath = normalizeRelativePath(file.originalname || file.name);
  const originalFileName = getBaseFileName(relativePath || file.originalname);
  const resolvedFolderName =
    uploadKind === 'folder'
      ? folderName || inferFolderName(relativePath, 'Uploaded Folder')
      : undefined;
  const fileType = inferType(originalFileName || file.originalname, file.mimetype);

  const baseDocumentData = {
    user: userId,
    originalFileName,
    fileType,
    mimeType: file.mimetype,
    fileSize: file.size,
    relativePath: relativePath || originalFileName,
    folderId: uploadKind === 'folder' ? folderId : undefined,
    folderName: uploadKind === 'folder' ? resolvedFolderName : undefined,
    uploadKind,
    isPublic: false,
  };

  let rawText;
  try {
    rawText = await extractText(file);
  } catch (err) {
    console.error(
      'RAG upload failed during text extraction:',
      err.stack || err,
    );

    const document = await Document.create({
      ...baseDocumentData,
      status: 'failed',
      progress: 100,
      extractedText: '',
      textLength: 0,
      wordCount: 0,
      failedReason: `parse failed: ${err.message || 'Unknown extraction error'}`,
      chunks: [],
      embeddings: {
        provider: 'local',
        model: 'local-embedding-engine',
        vector: [],
        chunkVectors: [],
      },
    });

    return {
      document,
      chunkCount: 0,
      readyForChat: false,
      message: `Failed to parse uploaded file content: ${
        err.message || 'Unknown extraction error'
      }`,
    };
  }

  const extractedText = sanitizeExtractedText(rawText);

  if (!extractedText) {
    console.warn(
      'RAG upload warning: extracted text is empty for',
      file.originalname,
      'size',
      file.size,
    );

    const document = await Document.create({
      ...baseDocumentData,
      status: 'completed',
      progress: 100,
      extractedText: '',
      textLength: 0,
      wordCount: 0,
      chunks: [],
      embeddings: {
        provider: 'local',
        model: 'local-embedding-engine',
        vector: [],
        chunkVectors: [],
      },
    });

    return {
      document,
      chunkCount: 0,
      readyForChat: false,
      message: buildNoExtractableTextMessage(originalFileName, fileType),
    };
  }

  const document = await Document.create({
    ...baseDocumentData,
    status: 'processing',
    progress: 10,
    extractedText,
    textLength: extractedText.length,
    wordCount: extractedText.trim().split(/\s+/).filter(Boolean).length,
  });

  try {
    const chunksData = await RAGService.processDocument({
      userId,
      docId: document._id.toString(),
      text: extractedText,
      sourceDoc: {
        id: document._id.toString(),
        fileName: originalFileName,
      },
    });

    if (!chunksData || !Array.isArray(chunksData.chunks)) {
      throw new Error('Invalid embeddings/chunks result from RAGService');
    }

    const chunks = chunksData.chunks.map((chunk, idx) => ({
      chunkId: chunk.metadata?.chunkId || `${document._id}-${idx + 1}`,
      pageNumber: null,
      text: chunk.text,
      startIndex: null,
      endIndex: null,
      embeddingId:
        chunk.metadata?.embeddingId ||
        chunk.metadata?.chunkId ||
        `${document._id}-${idx + 1}`,
    }));

    document.status = 'completed';
    document.progress = 100;
    document.chunks = chunks;
    document.embeddings = {
      provider:
        process.env.PINECONE_ENABLED === 'true' &&
        process.env.PINECONE_API_KEY &&
        process.env.PINECONE_INDEX
          ? 'pinecone'
          : 'local',
      model: 'local-embedding-engine',
      vector: [],
      chunkVectors: chunks.map((chunk, idx) => ({
        chunkId: chunk.chunkId,
        vector: chunksData.chunks?.[idx]?.embedding || [],
        embeddingId:
          chunksData.chunks?.[idx]?.metadata?.embeddingId ||
          chunk.embeddingId,
      })),
    };

    await document.save();

    return {
      document,
      chunkCount: document.chunks.length,
      readyForChat: document.chunks.length > 0,
      message:
        document.chunks.length > 0
          ? ''
          : `Uploaded file '${originalFileName}' finished processing, but no searchable chunks were created.`,
    };
  } catch (err) {
    console.error('RAG upload processing error:', err);
    document.status = 'failed';
    document.progress = 100;
    document.failedReason =
      (err && err.message) || 'Failed to process document';
    await document.save({ validateBeforeSave: false });

    return {
      document,
      chunkCount: document.chunks ? document.chunks.length : 0,
      readyForChat: false,
      message:
        'Document was uploaded but processing failed. Some features may be unavailable.',
    };
  }
}

exports.uploadDocument = [
  uploadSingle,
  catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const file = req.file;
    if (!file) {
      return next(new AppError('No file uploaded', 400));
    }

    await subscriptionService.ensureCanUpload(req.user, {
      fileSizeBytes: file.size,
    });

    const result = await processUploadedFile({
      userId,
      file,
      uploadKind: 'file',
    });
    await subscriptionService.recordUpload(req.user);

    const isWarning = !result.readyForChat || Boolean(result.message);
    res.status(isWarning ? 207 : 201).json({
      status: isWarning ? 'warning' : 'success',
      ...(result.message ? { message: result.message } : {}),
      data: {
        document: result.document,
        chunkCount: result.chunkCount,
      },
    });
  }),
];

exports.uploadFolder = [
  uploadMany,
  catchAsync(async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const files = Array.isArray(req.files) ? req.files.filter(Boolean) : [];
    if (!files.length) {
      return next(new AppError('No files uploaded', 400));
    }

    await subscriptionService.ensureCanUploadFolder(req.user, { files });

    const requestedFolderName = String(req.body?.folderName || '').trim();
    const folderName =
      requestedFolderName ||
      inferFolderName(files[0]?.originalname, 'Uploaded Folder');
    const folderId = `folder_${crypto.randomUUID()}`;

    const results = [];
    for (const file of files) {
      // Multer keeps the client-provided multipart filename in `originalname`.
      const result = await processUploadedFile({
        userId,
        file,
        folderId,
        folderName,
        uploadKind: 'folder',
      });
      results.push(result);
    }

    await subscriptionService.recordUploads(req.user, results.length);

    const readyResults = results.filter((item) => item.readyForChat);
    const warningCount = results.length - readyResults.length;
    const status = warningCount > 0 ? 'warning' : 'success';
    const statusCode = warningCount > 0 ? 207 : 201;
    let message = '';

    if (!readyResults.length) {
      message =
        'The folder upload finished, but none of the files are ready for chat yet.';
    } else if (warningCount > 0) {
      message = `Folder uploaded with ${readyResults.length} ready documents out of ${results.length} files.`;
    }

    res.status(statusCode).json({
      status,
      ...(message ? { message } : {}),
      data: {
        folder: {
          id: folderId,
          name: folderName,
          documentCount: results.length,
          readyDocumentCount: readyResults.length,
        },
        documents: results.map((item) =>
          summarizeUploadResult({
            document: item.document,
            chunkCount: item.chunkCount,
            readyForChat: item.readyForChat,
            message: item.message,
          }),
        ),
        chatDocumentIds: readyResults.map((item) => item.document._id),
      },
    });
  }),
];

exports.ragQuery = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  const responseLanguage = getRequestLanguage(req);
  if (!userId) return next(new AppError('Unauthorized', 401));

  const { question, sourceDocumentIds } = req.body || {};
  if (!question || !String(question).trim()) {
    return next(new AppError('Question is required', 400));
  }

  const { tokensEstimated } = await subscriptionService.ensureCanAsk(req.user, {
    text: question,
  });

  let answer;

  try {
    answer = await RAGService.query({
      userId,
      question,
      docIds: Array.isArray(sourceDocumentIds) ? sourceDocumentIds : [],
      responseLanguage,
    });
  } catch (err) {
    return next(new AppError(err.message || 'Failed to run RAG query', 500));
  }

  await subscriptionService.recordQuery(req.user, { tokensEstimated });

  res.status(200).json({
    status: 'success',
    data: {
      question,
      answer: answer.answer,
      sources: answer.sources,
      raw: answer.raw,
    },
  });
});

exports.__testables = {
  sanitizeExtractedText,
  normalizeLineForComparison,
  shouldDiscardExtractedLine,
};
