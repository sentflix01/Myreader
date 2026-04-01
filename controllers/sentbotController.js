const Document = require('../model/documentsModel');
const Chat = require('../model/chatsModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

function buildContextBlock({ documents, chats }) {
  const docLines = (documents || []).map((d, i) => {
    const text =
      d.extractedText ||
      (Array.isArray(d.chunks) && d.chunks.length ? d.chunks[0].text : '') ||
      '';
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 800);
    return `Document_${i + 1}: ${d.originalFileName}\nSnippet: ${snippet}`;
  });

  const chatLines = (chats || []).map((c, i) => {
    const lastMsgs = Array.isArray(c.messages) ? c.messages.slice(-6) : [];
    const transcript = lastMsgs
      .map((m) => `${m.role}: ${m.text}`)
      .join('\n')
      .slice(0, 1200);
    return `RecentChat_${i + 1}: ${c.title || c._id}\n${transcript}`;
  });

  const parts = [];
  if (docLines.length) parts.push(`## KnowledgeBase\n${docLines.join('\n\n')}`);
  if (chatLines.length) parts.push(`## RecentUserChats\n${chatLines.join('\n\n')}`);
  return parts.join('\n\n').trim();
}

async function callGemini({ contents }) {
  const apiKey = process.env.API_KEY;
  const apiUrl = process.env.API_URL;

  if (!apiKey || !apiUrl) {
    throw new AppError('AI provider is not configured on the server.', 500);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ contents }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || 'Sentbot request failed';
    throw new AppError(msg, 502);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new AppError('Empty AI response.', 502);

  return String(text);
}

exports.respond = catchAsync(async (req, res, next) => {
  const { message, history, scope, file } = req.body || {};

  if (!message || typeof message !== 'string') {
    return next(new AppError('Please provide a message.', 400));
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('You are not logged in!', 401));
  }

  // Basic retrieval (upgrade later to embeddings-based search).
  const [documents, chats] = await Promise.all([
    Document.find(
      scope === 'public'
        ? { isPublic: true }
        : { $or: [{ user: userId }, { isPublic: true }] },
    )
      .sort('-updatedAt')
      .limit(4)
      .select('originalFileName extractedText chunks isPublic updatedAt'),
    Chat.find({ user: userId })
      .sort('-updatedAt')
      .limit(2)
      .select('title messages updatedAt'),
  ]);

  const contextBlock = buildContextBlock({ documents, chats });

  const systemInstruction = [
    'You are Sentbot, a helpful customer service agent for Myreader.',
    'Answer using the provided context when relevant.',
    'If the answer is not in the context, ask a short clarifying question or say you do not know.',
    'Be concise and practical.',
  ].join(' ');

  const normalizedHistory = Array.isArray(history)
    ? history
        .slice(-12)
        .filter((h) => h && typeof h === 'object')
        .map((h) => {
          const role = h.role === 'model' || h.role === 'assistant' ? 'model' : 'user';
          const text = h?.parts?.[0]?.text ?? h?.text ?? '';
          return { role, parts: [{ text: String(text) }] };
        })
    : [];

  const inlineData =
    file &&
    typeof file === 'object' &&
    typeof file.data === 'string' &&
    typeof file.mime_type === 'string' &&
    file.data.length > 0
      ? { inline_data: { data: file.data, mime_type: file.mime_type } }
      : null;

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] },
    ...(contextBlock ? [{ role: 'user', parts: [{ text: contextBlock }] }] : []),
    ...normalizedHistory,
    {
      role: 'user',
      parts: [
        { text: message.trim() },
        ...(inlineData ? [inlineData] : []),
      ],
    },
  ];

  const rawText = await callGemini({ contents });
  const cleanedText = rawText.replace(/\*\*(.*?)\*\*/g, '$1').trim();

  res.status(200).json({
    status: 'success',
    data: {
      text: cleanedText,
    },
  });
});

