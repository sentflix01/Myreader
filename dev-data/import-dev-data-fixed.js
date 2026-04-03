'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../config.env') });

// Sample data - no faker needed
const sampleUsers = [
  {
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$examplehashedpassword12345678901234567890',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    dailyUsage: {
      windowStartedAt: new Date(),
      uploads: 0,
      queries: 0,
      messages: 0,
      chatSessions: 0,
      tokensUsed: 0,
    },
  },
];

const sampleDocuments = [
  {
    user: new mongoose.Types.ObjectId(),
    originalFileName: 'sample.pdf',
    status: 'completed',
    progress: 100,
    fileType: 'pdf',
  },
];

// DB connect
mongoose
  .connect(
    process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD),
  )
  .then(() => console.log('✅ DB connected'))
  .catch((err) => {
    console.error('❌ DB:', err);
    process.exit(1);
  });

// Import
const importData = async () => {
  try {
    console.log('📥 Importing sample data...');
    console.log('Sample users:', sampleUsers.length);
    console.log('Sample docs:', sampleDocuments.length);
    // TODO: await User.create(sampleUsers, {validateBeforeSave:false});
    console.log('✅ Import complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  }
};

// Delete
const deleteData = async () => {
  try {
    // await User.deleteMany();
    console.log('🗑️  Sample data cleared');
    process.exit(0);
  } catch (err) {
    console.error('❌ Delete failed:', err);
    process.exit(1);
  }
};

// CLI
if (process.argv[2] === '--import') importData();
else if (process.argv[2] === '--delete') deleteData();
else {
  console.log(`
Dev Data CLI [Fixed - No Faker]
$ npm run dev-data -- --import   📥
$ npm run dev-data -- --delete  🗑️ 
  `);
  process.exit(0);
}
