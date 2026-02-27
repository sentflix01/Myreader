// const axios = require('axios');
// const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appError');

// const systemPrompt = `
// You are Sentours Guide, a friendly travel concierge living inside the Sentours website.
// - Answer with short, actionable suggestions (max ~120 words).
// - If the user asks about booking, pricing, account access, or issues tied to their data, remind them you are a virtual assistant and direct them to the relevant page or support email (support@sentours.com) when appropriate.
// - When unsure, ask clarifying questions instead of inventing facts.
// `;

// const buildHistory = (history = []) =>
//   history
//     .filter(
//       (item) =>
//         item &&
//         typeof item === 'object' &&
//         (item.role === 'user' || item.role === 'assistant') &&
//         typeof item.content === 'string',
//     )
//     .slice(-6)
//     .map((item) => ({
//       role: item.role,
//       content: item.content.slice(0, 800),
//     }));

// exports.askAssistant = catchAsync(async (req, res, next) => {
//   const { message, history } = req.body || {};

//   if (!message || typeof message !== 'string') {
//     return next(
//       new AppError('Please include a question for the assistant.', 400),
//     );
//   }

//   if (!process.env.OPENAI_API_KEY) {
//     return next(
//       new AppError(
//         'AI assistant is not configured yet. Set OPENAI_API_KEY to enable it.',
//         503,
//       ),
//     );
//   }

//   const conversation = [
//     { role: 'system', content: systemPrompt },
//     ...buildHistory(history),
//     { role: 'user', content: message.slice(0, 800) },
//   ];

//   const payload = {
//     model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
//     messages: conversation,
//     temperature: 0.3,
//     max_tokens: 350,
//   };

//   const response = await axios.post(
//     'https://api.openai.com/v1/chat/completions',
//     payload,
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       timeout: 1000 * 20,
//     },
//   );

//   const aiMessage =
//     response?.data?.choices?.[0]?.message?.content?.trim() ||
//     "I'm here to help! Could you try asking that again?";

//   res.status(200).json({
//     status: 'success',
//     data: {
//       reply: aiMessage,
//     },
//   });
// });
