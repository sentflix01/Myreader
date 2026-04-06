const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

// Let project config.env win over a pre-set shell/OS PORT (e.g. PORT=3000).
dotenv.config({ path: './config.env', override: true });

const app = require('./app');

const databaseUrl = process.env.DATABASE;
if (!databaseUrl) {
  logger.error('FATAL: DATABASE is not set in config.env');
  process.exit(1);
}

const DB = databaseUrl.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD || ''
);

mongoose.connect(DB).catch((e) => {
  logger.error('DB connection failed:', e.message);
  process.exit(1);
});
mongoose.connection.once('open', () => {
  logger.log('DB connection successful!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.log(`myreader running on ${port}...`);
});

