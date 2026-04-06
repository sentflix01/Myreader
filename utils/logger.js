'use strict';

const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

const logger = process.env.NODE_ENV === 'production' ? {
  info: (msg) => fs.appendFileSync(logFile, `[INFO] ${new Date().toISOString()} ${msg}\n`),
  error: (msg, err = '') => fs.appendFileSync(logFile, `[ERROR] ${new Date().toISOString()} ${msg} ${err.stack || err}\n`),
  log: console.log,
} : console;

module.exports = logger;

