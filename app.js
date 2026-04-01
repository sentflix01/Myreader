const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { xss } = require('express-xss-sanitizer');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const billingController = require('./controllers/billingController');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const chatRouter = require('./routes/chatRoutes');
const billingRouter = require('./routes/billingRoutes');
const documentRouter = require('./routes/documentRoutes');
const reviewRouter = require('./routes/reviewRoutes');
// const assistantRouter = require('./routes/asistantRoutes');
const sentbotRouter = require('./routes/sentbotRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/.well-known', (req, res) => res.status(204).end());

// CORS (supports cross-origin cookies if configured)
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin or server-to-server
    if (corsOrigins.length === 0) return cb(null, true); // default allow
    return cb(null, corsOrigins.includes(origin));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Stripe webhooks must receive the raw request body
app.post(
  '/api/v1/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingController.stripeWebhook,
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against XSS
app.use(xss());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/views', viewRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/documents', documentRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/sentbot', sentbotRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
