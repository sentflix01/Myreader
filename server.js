const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');

// connect to database
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// connect to database using mongoose
mongoose.connect(DB).then(() => {
  console.log('DB connection successful!');
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`myreader running on ${port}...`);
});
