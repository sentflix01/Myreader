// const fs = require('fs');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');

// // Load models
// const User = require('./../../model/userModel');
// const Chat = require('./../../model/chatsModel');
// const Document = require('./../../model/documentsModel');
// const Review = require('./../../model/reviewModel');

// dotenv.config({ path: './config.env' });

// const DB = process.env.DATABASE.replace(
//   '<PASSWORD>',
//   process.env.DATABASE_PASSWORD,
// );
// mongoose
//   .connect(DB)
//   .then(() => console.log('DB connected'))
//   .catch((err) => console.error('DB error:', err));

// // Read JSON files (must be in the same folder as this script)
// const chats = JSON.parse(fs.readFileSync(`${__dirname}/chats.json`, 'utf-8'));
// const documents = JSON.parse(
//   fs.readFileSync(`${__dirname}/documents.json`, 'utf-8'),
// );
// const reviewsData = JSON.parse(
//   fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
// );

// const importData = async () => {
//   try {
//     // 1) Clear old data (keep users)
//     await Chat.deleteMany();
//     await Document.deleteMany();
//     await Review.deleteMany();
//     console.log('🗑️ Chats, Documents, Reviews cleared (users kept)');

//     // 2) FETCH USERS FIRST
//     const users = await User.find();
//     if (users.length === 0) {
//       console.log('No users found. Please import users first.');
//       process.exit(1);
//     }
//     console.log(`👥 Using ${users.length} existing users`);

//     // 3) Pick first user as owner for chats & documents
//     const ownerId = users[0]._id;

//     // 4) Add `user` field to chats & documents
//     const chatsWithUser = chats.map((chat) => ({ ...chat, user: ownerId }));
//     const docsWithUser = documents.map((doc) => ({ ...doc, user: ownerId }));

//     // 5) Import chats and documents
//     const createdChats = await Chat.create(chatsWithUser);
//     const createdDocs = await Document.create(docsWithUser);
//     console.log(`${createdChats.length} chats imported`);
//     console.log(`${createdDocs.length} documents imported`);

//     // 6) Generate reviews – but insert ONE BY ONE, skipping duplicates
//     let importedCount = 0;
//     for (let i = 0; i < reviewsData.length; i++) {
//       const reviewData = {
//         ...reviewsData[i],
//         user: users[i % users.length]._id,
//         chat: createdChats[i % createdChats.length]._id,
//         document: createdDocs[i % createdDocs.length]._id,
//       };

//       try {
//         await Review.create(reviewData);
//         importedCount++;
//         console.log(`Review ${i + 1} imported`);
//       } catch (err) {
//         if (err.code === 11000) {
//           console.log(` Review ${i + 1} skipped (duplicate)`);
//         } else {
//           // Unexpected error – rethrow
//           throw err;
//         }
//       }
//     }

//     console.log(`${importedCount} / ${reviewsData.length} reviews imported`);
//     console.log('🎉 All sample data successfully loaded!');
//   } catch (err) {
//     console.error('Import error:', err);
//   }
//   process.exit();
// };

// const deleteData = async () => {
//   try {
//     await Chat.deleteMany();
//     await Document.deleteMany();
//     await Review.deleteMany();
//     // Optionally delete users – uncomment if needed
//     // await User.deleteMany();
//     console.log('🗑️ Chats, Documents, Reviews deleted (users kept)');
//   } catch (err) {
//     console.error('Delete error:', err);
//   }
//   process.exit();
// };

// if (process.argv[2] === '--import') importData();
// else if (process.argv[2] === '--delete') deleteData();
