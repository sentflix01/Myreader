const Chat = require('../models/chatsModel');
const Document = require('../models/documentsModel');
const { ragService: RAGService } = require('../services/rag/ragService');
const subscriptionService = require('../services/subscriptionService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  getLocalizedCopy,
  getRequestLanguage,
} = require('../utils/languageSupport');

const canAccessChat = (chat, userId) =>
  Boolean(
    chat &&
      chat.user &&
      userId &&
      chat.user.toString() === userId.toString(),
  );

const uniqueValues = (values = []) => [
  ...new Set(
    values
      .map((value) => (value == null ? '' : String(value).trim()))
      .filter(Boolean),
  ),
];

const getChatDocumentIds = (chatDoc = {}) =>
  uniqueValues(
    Array.isArray(chatDoc.documentIds) && chatDoc.documentIds.length
      ? chatDoc.documentIds
      : chatDoc.file
        ? [chatDoc.file]
        : [],
  );

const summarizeScopeDocument = (document) => ({
  document: document._id,
  name: document.originalFileName,
  relativePath: document.relativePath || document.originalFileName,
  fileType: document.fileType,
  fileSize: document.fileSize,
  status: document.status,
});

const buildScopeFallback = (chatDoc = {}) => {
  const fallbackIds = getChatDocumentIds(chatDoc);
  const scopeDocuments = Array.isArray(chatDoc.scopeDocuments)
    ? chatDoc.scopeDocuments.map((item) => ({
        id: item.document ? String(item.document) : null,
        name: item.name || '',
        relativePath: item.relativePath || item.name || '',
        fileType: item.fileType || '',
        fileSize: item.fileSize || 0,
        status: item.status || '',
      }))
    : [];
  const scopeDocumentIds = scopeDocuments
    .map((item) => item.id)
    .filter(Boolean);

  return {
    documentIds: fallbackIds.length ? fallbackIds : scopeDocumentIds,
    scopeDocuments,
    scopeType:
      chatDoc.scopeType ||
      (chatDoc.folderId || fallbackIds.length > 1 ? 'folder' : 'document'),
    folderId: chatDoc.folderId || null,
    folderName: chatDoc.folderName || '',
  };
};

const resolveChatScope = async ({
  userId,
  file,
  documentIds = [],
  scopeType,
  folderId,
  folderName,
}) => {
  const requestedIds = uniqueValues([
    ...(Array.isArray(documentIds) ? documentIds : []),
    ...(file ? [file] : []),
  ]);

  if (!requestedIds.length) {
    return {
      file: undefined,
      documentIds: [],
      scopeType: 'document',
      folderId: undefined,
      folderName: '',
      scopeDocuments: [],
    };
  }

  const documents = await Document.find({
    user: userId,
    _id: { $in: requestedIds },
  }).select(
    '_id originalFileName relativePath fileType fileSize status folderId folderName',
  );

  if (documents.length !== requestedIds.length) {
    throw new AppError(
      'One or more selected documents could not be found in your account.',
      400,
    );
  }

  const documentsById = new Map(
    documents.map((document) => [String(document._id), document]),
  );
  const orderedDocuments = requestedIds
    .map((id) => documentsById.get(String(id)))
    .filter(Boolean);
  const resolvedFolderId =
    folderId || orderedDocuments.find((document) => document.folderId)?.folderId;
  const resolvedFolderName =
    folderName ||
    orderedDocuments.find((document) => document.folderName)?.folderName ||
    '';
  const resolvedScopeType =
    scopeType === 'folder' || resolvedFolderId || orderedDocuments.length > 1
      ? 'folder'
      : 'document';

  return {
    file: orderedDocuments[0]?._id,
    documentIds: orderedDocuments.map((document) => document._id),
    scopeType: resolvedScopeType,
    folderId: resolvedFolderId || undefined,
    folderName: resolvedFolderName,
    scopeDocuments: orderedDocuments.map(summarizeScopeDocument),
  };
};

const toClientChat = (chat) => {
  const doc = chat.toObject ? chat.toObject() : chat;
  const scope = buildScopeFallback(doc);
  return {
    id: doc._id,
    clientId: doc.clientId || null,
    title: doc.title || '',
    description: doc.description || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastActivityAt: doc.lastActivityAt || doc.updatedAt,
    messageCount: doc.messageCount || (doc.messages ? doc.messages.length : 0),
    file: doc.file || null,
    documentIds: scope.documentIds,
    scopeType: scope.scopeType,
    folderId: scope.folderId,
    folderName: scope.folderName,
    scopeDocuments: scope.scopeDocuments,
    messages: (doc.messages || []).map((m) => ({
      role: m.role,
      text: m.text,
      sources: m.sources || null,
      createdAt: m.createdAt,
    })),
  };
};

const cannedAssistantResponse = (language = 'en') => {
  const responses = [
    getLocalizedCopy(language, 'chat.canned.noAnswer1'),
    getLocalizedCopy(language, 'chat.canned.noAnswer2'),
    getLocalizedCopy(language, 'chat.canned.noAnswer3'),
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const chunkTextForStream = (text = '') => {
  const parts = String(text || '').match(/\S+\s*/g) || [];
  if (!parts.length) return [];

  const chunks = [];
  let buffer = '';

  parts.forEach((part, index) => {
    buffer += part;
    const compactLength = buffer.replace(/\s+/g, ' ').trim().length;
    const shouldFlush =
      compactLength >= 36 ||
      /[.!?።]\s*$/.test(buffer) ||
      index === parts.length - 1;

    if (shouldFlush && buffer.trim()) {
      chunks.push(buffer);
      buffer = '';
    }
  });

  return chunks.length ? chunks : [String(text || '')];
};

const writeStreamEvent = (res, payload) => {
  res.write(`${JSON.stringify(payload)}\n`);
};

const generateAssistantReply = async ({
  chat,
  user,
  cleanText,
  responseLanguage,
}) => {
  const { tokensEstimated } = await subscriptionService.ensureCanAsk(user, {
    text: cleanText,
    asMessage: true,
  });

  chat.messages.push({ role: 'user', text: cleanText });
  chat.userMessageCount = (chat.userMessageCount || 0) + 1;
  chat.messageCount = (chat.messageCount || 0) + 1;
  chat.lastMessageAt = new Date();
  chat.lastActivityAt = new Date();

  let assistantText = cannedAssistantResponse(responseLanguage);
  let assistantSources = [];
  const chatDocumentIds = uniqueValues(
    Array.isArray(chat.documentIds) && chat.documentIds.length
      ? chat.documentIds
      : chat.file
        ? [chat.file]
        : [],
  );

  try {
    const ragResponse = await RAGService.query({
      userId: user.id,
      question: cleanText,
      docIds: chatDocumentIds,
      responseLanguage,
    });

    if (
      ragResponse &&
      ragResponse.answer &&
      String(ragResponse.answer).trim()
    ) {
      assistantText = ragResponse.answer;
      assistantSources = Array.isArray(ragResponse?.sources)
        ? ragResponse.sources
        : [];
    } else {
      assistantText = cannedAssistantResponse(responseLanguage);
      assistantSources = [];
    }
  } catch (error) {
    console.error('RAG Service Error:', error);
    assistantText = getLocalizedCopy(responseLanguage, 'chat.ragFailure') || 
      'I apologize, but I encountered an error while processing your question. Please try again.';
    assistantSources = [];
  }

  chat.messages.push({
    role: 'assistant',
    text: assistantText,
    ...(assistantSources.length ? { sources: assistantSources } : {}),
  });

  chat.aiMessageCount = (chat.aiMessageCount || 0) + 1;
  chat.messageCount = (chat.messageCount || 0) + 1;
  chat.lastMessageAt = new Date();
  chat.lastActivityAt = new Date();

  await chat.save();
  await subscriptionService.recordQuery(user, {
    tokensEstimated,
    asMessage: true,
  });

  return {
    chat,
    cleanText,
    assistantText,
    assistantSources,
  };
};

exports.getMyChats = catchAsync(async (req, res) => {
  const chats = await Chat.find({ user: req.user.id }).sort('-updatedAt');
  res.status(200).json({
    status: 'success',
    results: chats.length,
    data: {
      chats: chats.map(toClientChat),
    },
  });
});

exports.getChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(
      new AppError('You do not have permission to access this chat', 403),
    );

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.createChat = catchAsync(async (req, res, next) => {
  await subscriptionService.ensureCanCreateChat(req.user);

  const {
    clientId,
    title,
    description,
    file,
    documentIds,
    scopeType,
    folderId,
    folderName,
  } = req.body || {};

  let scope;
  try {
    scope = await resolveChatScope({
      userId: req.user.id,
      file,
      documentIds,
      scopeType,
      folderId,
      folderName,
    });
  } catch (error) {
    return next(error);
  }

  if (!scope.documentIds.length) {
    return next(
      new AppError(
        'Upload a processed document before starting a chat.',
        400,
      ),
    );
  }

  const defaultTitle =
    scope.scopeType === 'folder'
      ? scope.folderName || 'Folder Chat'
      : scope.scopeDocuments[0]?.name || 'New Chat';

  const chat = await Chat.create({
    user: req.user.id,
    clientId: clientId || undefined,
    title: title || defaultTitle,
    description: description || '',
    file: scope.file || undefined,
    documentIds: scope.documentIds,
    scopeType: scope.scopeType,
    folderId: scope.folderId,
    folderName: scope.folderName,
    scopeDocuments: scope.scopeDocuments,
    lastActivityAt: new Date(),
  });

  await subscriptionService.recordChatCreated(req.user);

  res.status(201).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const responseLanguage = getRequestLanguage(req);
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(
      new AppError('You do not have permission to update this chat', 403),
    );

  const { text } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) return next(new AppError('Message text is required', 400));
  if (!getChatDocumentIds(chat).length) {
    return next(
      new AppError(
        'This chat has no ready documents attached. Please upload a processed document first.',
        400,
      ),
    );
  }
  const { assistantText, assistantSources } = await generateAssistantReply({
    chat,
    user: req.user,
    cleanText,
    responseLanguage,
  });

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
      appended: [
        { role: 'user', text: cleanText },
        { role: 'assistant', text: assistantText, sources: assistantSources },
      ],
    },
  });
});

exports.addMessageStream = async (req, res, next) => {
  const responseLanguage = getRequestLanguage(req);

  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new AppError('No chat found with that ID', 404));
    if (!canAccessChat(chat, req.user.id)) {
      return next(
        new AppError('You do not have permission to update this chat', 403),
      );
    }

    const { text } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) {
      return next(new AppError('Message text is required', 400));
    }
    if (!getChatDocumentIds(chat).length) {
      return next(
        new AppError(
          'This chat has no ready documents attached. Please upload a processed document first.',
          400,
        ),
      );
    }

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    writeStreamEvent(res, { type: 'status', phase: 'retrieving' });

    const { assistantText, assistantSources } = await generateAssistantReply({
      chat,
      user: req.user,
      cleanText,
      responseLanguage,
    });

    writeStreamEvent(res, { type: 'status', phase: 'streaming' });

    let streamedText = '';
    for (const chunk of chunkTextForStream(assistantText)) {
      streamedText += chunk;
      writeStreamEvent(res, {
        type: 'delta',
        delta: chunk,
        text: streamedText,
      });
      await wait(18);
    }

    writeStreamEvent(res, {
      type: 'done',
      text: assistantText,
      sources: assistantSources,
      chat: toClientChat(chat),
      appended: [
        { role: 'user', text: cleanText },
        { role: 'assistant', text: assistantText, sources: assistantSources },
      ],
    });
    res.end();
  } catch (error) {
    if (!res.headersSent) return next(error);
    writeStreamEvent(res, {
      type: 'error',
      message: error.message || 'Failed to stream response.',
    });
    res.end();
  }
};

// Hybrid sync: client sends its cached chat; server upserts/merges by clientId.
exports.syncChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(
      new AppError('You do not have permission to sync this chat', 403),
    );

  const {
    clientId,
    title,
    description,
    messages,
    lastActivityAt,
    file,
    documentIds,
    scopeType,
    folderId,
    folderName,
  } = req.body || {};

  if (clientId && !chat.clientId) chat.clientId = clientId;
  if (typeof title === 'string' && title.trim()) chat.title = title.trim();
  if (typeof description === 'string') chat.description = description;
  if (
    file ||
    (Array.isArray(documentIds) && documentIds.length) ||
    scopeType ||
    folderId ||
    folderName
  ) {
    const scope = await resolveChatScope({
      userId: req.user.id,
      file,
      documentIds,
      scopeType,
      folderId,
      folderName,
    });
    chat.file = scope.file || undefined;
    chat.documentIds = scope.documentIds;
    chat.scopeType = scope.scopeType;
    chat.folderId = scope.folderId;
    chat.folderName = scope.folderName;
    chat.scopeDocuments = scope.scopeDocuments;
  }

  // Naive merge: if client has more messages, accept them (keeps offline usage working).
  if (
    Array.isArray(messages) &&
    messages.length > (chat.messages?.length || 0)
  ) {
    chat.messages = messages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.text === 'string',
      )
      .map((m) => ({
        role: m.role,
        text: m.text.trim(),
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));
    chat.messageCount = chat.messages.length;
    chat.userMessageCount = chat.messages.filter(
      (m) => m.role === 'user',
    ).length;
    chat.aiMessageCount = chat.messages.filter(
      (m) => m.role === 'assistant',
    ).length;
  }

  if (lastActivityAt) chat.lastActivityAt = new Date(lastActivityAt);
  await chat.save();

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.clearChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(
      new AppError('You do not have permission to update this chat', 403),
    );

  chat.messages = [];
  chat.messageCount = 0;
  chat.userMessageCount = 0;
  chat.aiMessageCount = 0;
  chat.lastMessageAt = undefined;
  chat.lastActivityAt = new Date();
  await chat.save();

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.clearAllMyChats = catchAsync(async (req, res) => {
  await Chat.updateMany(
    { user: req.user.id },
    {
      $set: {
        messages: [],
        messageCount: 0,
        userMessageCount: 0,
        aiMessageCount: 0,
        lastMessageAt: null,
        lastActivityAt: new Date(),
      },
    },
  );

  res.status(200).json({ status: 'success' });
});

exports.deleteChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(
      new AppError('You do not have permission to delete this chat', 403),
    );

  await Chat.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.deleteAllMyChats = catchAsync(async (req, res) => {
  await Chat.deleteMany({ user: req.user.id });
  res.status(204).json({ status: 'success', data: null });
});
