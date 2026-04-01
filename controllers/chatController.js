const Chat = require('../model/chatsModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const canAccessChat = (chat, userId) => {
  if (!chat) return false;
  if (chat.user && chat.user.toString() === userId.toString()) return true;
  if (
    Array.isArray(chat.sharedWith) &&
    chat.sharedWith.some((s) => s.user && s.user.toString() === userId.toString())
  ) {
    return true;
  }
  return false;
};

const toClientChat = (chat) => {
  const doc = chat.toObject ? chat.toObject() : chat;
  return {
    id: doc._id,
    clientId: doc.clientId || null,
    title: doc.title || '',
    description: doc.description || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastActivityAt: doc.lastActivityAt || doc.updatedAt,
    messageCount: doc.messageCount || (doc.messages ? doc.messages.length : 0),
    messages: (doc.messages || []).map((m) => ({
      role: m.role,
      text: m.text,
      createdAt: m.createdAt,
    })),
  };
};

const cannedAssistantResponse = () => {
  const responses = [
    'Based on your document, the key topics include AI and natural language processing.',
    'I can summarize the key points. Which section should I focus on?',
    'The file appears to have multiple sections. Tell me which part you want to explore.',
    'I found a few interesting patterns in your content. Want the highlights?',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
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
    return next(new AppError('You do not have permission to access this chat', 403));

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.createChat = catchAsync(async (req, res) => {
  const { clientId, title, description } = req.body || {};

  const chat = await Chat.create({
    user: req.user.id,
    clientId: clientId || undefined,
    title: title || 'New Chat',
    description: description || '',
    lastActivityAt: new Date(),
  });

  res.status(201).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
    },
  });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(new AppError('You do not have permission to update this chat', 403));

  const { text } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) return next(new AppError('Message text is required', 400));

  chat.messages.push({ role: 'user', text: cleanText });
  chat.userMessageCount = (chat.userMessageCount || 0) + 1;
  chat.messageCount = (chat.messageCount || 0) + 1;
  chat.lastMessageAt = new Date();
  chat.lastActivityAt = new Date();

  // Demo parity: generate a placeholder assistant reply server-side.
  const assistantText = cannedAssistantResponse();
  chat.messages.push({ role: 'assistant', text: assistantText });
  chat.aiMessageCount = (chat.aiMessageCount || 0) + 1;
  chat.messageCount = (chat.messageCount || 0) + 1;
  chat.lastMessageAt = new Date();
  chat.lastActivityAt = new Date();

  await chat.save();

  res.status(200).json({
    status: 'success',
    data: {
      chat: toClientChat(chat),
      appended: [
        { role: 'user', text: cleanText },
        { role: 'assistant', text: assistantText },
      ],
    },
  });
});

// Hybrid sync: client sends its cached chat; server upserts/merges by clientId.
exports.syncChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return next(new AppError('No chat found with that ID', 404));
  if (!canAccessChat(chat, req.user.id))
    return next(new AppError('You do not have permission to sync this chat', 403));

  const { clientId, title, description, messages, lastActivityAt } = req.body || {};

  if (clientId && !chat.clientId) chat.clientId = clientId;
  if (typeof title === 'string' && title.trim()) chat.title = title.trim();
  if (typeof description === 'string') chat.description = description;

  // Naive merge: if client has more messages, accept them (keeps offline usage working).
  if (Array.isArray(messages) && messages.length > (chat.messages?.length || 0)) {
    chat.messages = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
      .map((m) => ({
        role: m.role,
        text: m.text.trim(),
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      }));
    chat.messageCount = chat.messages.length;
    chat.userMessageCount = chat.messages.filter((m) => m.role === 'user').length;
    chat.aiMessageCount = chat.messages.filter((m) => m.role === 'assistant').length;
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
    return next(new AppError('You do not have permission to update this chat', 403));

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
    return next(new AppError('You do not have permission to delete this chat', 403));

  await Chat.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

exports.deleteAllMyChats = catchAsync(async (req, res) => {
  await Chat.deleteMany({ user: req.user.id });
  res.status(204).json({ status: 'success', data: null });
});
