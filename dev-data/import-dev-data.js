// const fs = require('fs');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const path = require('path');

// dotenv.config({ path: path.join(__dirname, '../config.env') });

// // MODELS (adjust filenames if yours differ)
// const User = require('../model/userModel');
// const Document = require('../model/documentsModel');
// const Subscription = require('../model/subscriptionsModel');
// const Chat = require('../model/chatsModel');
// const Message = require('../model/messageModel');

// // DB CONNECTION
// const DB = process.env.DATABASE.replace(
//   '<PASSWORD>',
//   process.env.DATABASE_PASSWORD
// );

// mongoose.connect(DB).then(() => console.log('DB connection successful'));

// // READ JSON

// // const users = JSON.parse(fs.readFileSync(`${__dirname}/data/users.json`, 'utf-8'));
// const documents = JSON.parse(
//   fs.readFileSync(`${__dirname}/data/documents.json`, 'utf-8')
// );

// // IMPORT
// const importData = async () => {
//   try {
//     // await User.create(users)
//     await Document.create(documents);
//     console.log('Data successfully imported');
//     process.exit();
//   } catch (err) {
//     console.error('Import error:', err);
//     process.exit(1);
//   }
// };

// // DELETE
// const deleteData = async () => {
//   try {
//     await User.deleteMany();
//     await Document.deleteMany();
//     console.log('Data successfully deleted');
//     process.exit();
//   } catch (err) {
//     console.error('Delete error:', err);
//     process.exit(1);
//   }
// };

// // CLI
// if (process.argv[2] === '--import') {
//   importData();
// } else if (process.argv[2] === '--delete') {
//   deleteData();
// }
