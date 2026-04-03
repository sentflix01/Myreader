const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { xss } = require('express-xss-sanitizer');
const cookieParser = require('cookie-parser');
const performanceMonitor = require('./utils/performanceMonitor');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const billingController = require('./controllers/billingController');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoutes');
const chatRouter = require('./routes/chatRoutes');
const billingRouter = require('./routes/billingRoutes');
const documentRouter = require('./routes/documentRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const ragRouter = require('./routes/ragRoutes');
// const assistantRouter = require('./routes/asistantRoutes');
const sentbotRouter = require('./routes/sentbotRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  }),
);

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'img', 'logos', 'icon.ico'));
});

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

// Performance monitoring
app.use(performanceMonitor.middleware());

// Health check endpoint
app.get('/health', (req, res) => {
  const health = performanceMonitor.getHealthStatus();
  res.status(health.status === 'critical' ? 503 : 200).json(health);
});

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
const shouldEnforceApiRateLimit =
  process.env.NODE_ENV === 'production' ||
  String(process.env.ENFORCE_API_RATE_LIMIT || '').toLowerCase() === 'true';

if (shouldEnforceApiRateLimit) {
  app.use('/api', limiter);
}

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
app.use('/api/v1/rag', ragRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/sentbot', sentbotRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
