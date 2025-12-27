const path = require('path');
const express = require('express');
const crypto = require('crypto'); // for generating unique _id
const morgan = require('morgan');

const userRouter = require('./routes/userRoute');
const fileRouter = require('./routes/fileRoute');

const app = express();

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// 1) MIDELWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
// request time
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES

app.use('/api/v1/files', fileRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
