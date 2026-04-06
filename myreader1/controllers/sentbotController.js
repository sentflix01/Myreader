const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  buildDocumentRedirectReply,
  buildFallbackSupportAnswer,
  buildSupportContext,
  getSupportSnapshot,
  isDocumentQuestion,
} = require('../services/sentbot/supportContextService');
const {
  getAnswerLanguageInstruction,
  getRequestLanguage,
} = require('../utils/languageSupport');

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
  const { message, history } = req.body || {};
  const responseLanguage = getRequestLanguage(req);

  if (!message || typeof message !== 'string') {
    return next(new AppError('Please provide a message.', 400));
  }

  const userId = req.user?.id;
  if (!userId) {
    return next(new AppError('You are not logged in!', 401));
  }

  if (isDocumentQuestion(message)) {
    return res.status(200).json({
      status: 'success',
      data: {
        text: buildDocumentRedirectReply(responseLanguage),
      },
    });
  }

  let snapshot;
  try {
    snapshot = await getSupportSnapshot({ userId });
  } catch (err) {
    return next(new AppError(err.message || 'Unable to load support data.', 500));
  }

  const contextBlock = buildSupportContext(snapshot);

  const systemInstruction = [
    'You are Sentbot, a helpful customer service agent for Myreader.',
    'You only answer support, billing, subscription, dashboard, and usage questions.',
    'Never answer questions about uploaded document contents, file summaries, clauses, or PDF passages.',
    'If a user asks about document contents, tell them to use the Chat page.',
    'Use only SUPPORT_CONTEXT. Do not invent product details or user statistics.',
    'If the answer is not in SUPPORT_CONTEXT, say you do not know.',
    'Be concise, practical, and support-focused.',
    getAnswerLanguageInstruction(responseLanguage),
  ].join(' ');

  const normalizedHistory = Array.isArray(history)
    ? history
        .slice(-12)
        .filter((h) => h && typeof h === 'object')
        .map((h) => {
          const role =
            h.role === 'model' || h.role === 'assistant' ? 'model' : 'user';
          const text = h?.parts?.[0]?.text ?? h?.text ?? '';
          return { role, parts: [{ text: String(text) }] };
        })
    : [];

  const contents = [
    { role: 'user', parts: [{ text: systemInstruction }] },
    ...(contextBlock
      ? [{ role: 'user', parts: [{ text: `SUPPORT_CONTEXT:\n${contextBlock}` }] }]
      : []),
    ...normalizedHistory,
    {
      role: 'user',
      parts: [{ text: message.trim() }],
    },
  ];

  let cleanedText;
  try {
    const rawText = await callGemini({ contents });
    cleanedText = rawText.replace(/\*\*(.*?)\*\*/g, '$1').trim();
  } catch (err) {
    cleanedText = buildFallbackSupportAnswer({
      message,
      snapshot,
      language: responseLanguage,
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      text: cleanedText,
    },
  });
});
