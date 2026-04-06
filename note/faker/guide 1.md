Here's the complete corrected generator script for copy-paste:

```javascript
// dev-data/generate-sample-data.js

const { faker } = require('@faker-js/faker');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  numberOfUsers: 20,
  maxDocumentsPerUser: 15,
  maxChatSessionsPerUser: 8,
  maxMessagesPerChat: 25,
  outputDirectory: './dev-data/data',
  models: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'llama-3', 'gemini-pro'],
  // Safe file types that should be in your Document model enum
  fileTypes: [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',        // Document formats
    'xls', 'xlsx', 'csv', 'ods',                      // Spreadsheets
    'ppt', 'pptx', 'odp',                             // Presentations
    'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp' // Images
    // Removed: 'html', 'xml', 'json' (unless they're in your model)
  ],
  subscriptionTiers: ['free', 'premium', 'enterprise'],
};

// Initialize data storage
const sampleData = {
  users: [],
  subscriptions: [],
  documents: [],
  chatSessions: [],
  chatMessages: [],
};

// Helper functions
function generateObjectId() {
  return new ObjectId().toString();
}

function generateDateWithinRange(startDaysAgo = 365, endDaysAgo = 0) {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  
  return faker.date.between({ from: start, to: end });
}

function generateSubscriptionTier() {
  const weights = { free: 0.5, premium: 0.4, enterprise: 0.1 };
  const rand = Math.random();
  if (rand < weights.free) return 'free';
  if (rand < weights.free + weights.premium) return 'premium';
  return 'enterprise';
}

function getSubscriptionLimits(tier) {
  const limits = {
    free: {
      maxDocuments: 5,
      maxFileSize: 1,
      maxDailyRequests: 10,
      maxChatSessions: 5,
      maxDocumentsPerChat: 2,
      pricePerMonth: 0,
    },
    premium: {
      maxDocuments: 30,
      maxFileSize: 20,
      maxDailyRequests: 100,
      maxChatSessions: 20,
      maxDocumentsPerChat: 10,
      pricePerMonth: 4.99,
    },
    enterprise: {
      maxDocuments: 100,
      maxFileSize: 100,
      maxDailyRequests: 500,
      maxChatSessions: 40,
      maxDocumentsPerChat: 30,
      pricePerMonth: 49.99,
    },
  };
  return limits[tier];
}

function generateFeaturesForTier(tier) {
  const allFeatures = [
    { name: 'advancedAi', enabled: false, limit: 0 },
    { name: 'prioritySupport', enabled: false, limit: 0 },
    { name: 'teamCollaboration', enabled: false, limit: 0 },
    { name: 'apiAccess', enabled: false, limit: 0 },
    { name: 'customBranding', enabled: false, limit: 0 },
    { name: 'advancedAnalytics', enabled: false, limit: 0 },
  ];
  
  if (tier === 'premium') {
    allFeatures[0].enabled = true;
    allFeatures[1].enabled = true;
    allFeatures[2].enabled = true;
    allFeatures[0].limit = 100;
  } else if (tier === 'enterprise') {
    allFeatures.forEach(feature => {
      feature.enabled = true;
      feature.limit = 500;
    });
  }
  
  return allFeatures;
}

function getFileTypeAndMime(extension) {
  const fileTypeMap = {
    'pdf': { fileType: 'pdf', mimeType: 'application/pdf' },
    'doc': { fileType: 'doc', mimeType: 'application/msword' },
    'docx': { fileType: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    'txt': { fileType: 'txt', mimeType: 'text/plain' },
    'rtf': { fileType: 'rtf', mimeType: 'application/rtf' },
    'odt': { fileType: 'odt', mimeType: 'application/vnd.oasis.opendocument.text' },
    'xls': { fileType: 'xls', mimeType: 'application/vnd.ms-excel' },
    'xlsx': { fileType: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    'csv': { fileType: 'csv', mimeType: 'text/csv' },
    'ods': { fileType: 'ods', mimeType: 'application/vnd.oasis.opendocument.spreadsheet' },
    'ppt': { fileType: 'ppt', mimeType: 'application/vnd.ms-powerpoint' },
    'pptx': { fileType: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    'odp': { fileType: 'odp', mimeType: 'application/vnd.oasis.opendocument.presentation' },
    'jpeg': { fileType: 'jpeg', mimeType: 'image/jpeg' },
    'png': { fileType: 'png', mimeType: 'image/png' },
    'gif': { fileType: 'gif', mimeType: 'image/gif' },
    'bmp': { fileType: 'bmp', mimeType: 'image/bmp' },
    'tiff': { fileType: 'tiff', mimeType: 'image/tiff' },
    'svg': { fileType: 'svg', mimeType: 'image/svg+xml' },
    'webp': { fileType: 'webp', mimeType: 'image/webp' },
  };
  
  return fileTypeMap[extension] || { fileType: 'txt', mimeType: 'text/plain' };
}

function generateDocumentContent() {
  const paragraphs = faker.lorem.paragraphs(faker.number.int({ min: 3, max: 20 }));
  const sentences = paragraphs.split('. ');
  const pages = [];
  
  const pageCount = faker.number.int({ min: 1, max: 50 });
  for (let i = 0; i < pageCount; i++) {
    const pageText = sentences
      .slice(i * 5, (i + 1) * 5)
      .join('. ');
    
    pages.push({
      pageNumber: i + 1,
      text: pageText + '.',
      wordCount: pageText.split(' ').length,
      hasImages: faker.datatype.boolean(0.3),
      dimensions: {
        width: faker.number.int({ min: 800, max: 1200 }),
        height: faker.number.int({ min: 1000, max: 1600 }),
      },
    });
  }
  
  return {
    fullText: paragraphs,
    pages,
    wordCount: paragraphs.split(' ').length,
  };
}

function generateEmbeddings() {
  const vector = Array.from({ length: 1536 }, () => 
    faker.number.float({ min: -1, max: 1, precision: 0.0001 })
  );
  
  return {
    provider: faker.helpers.arrayElement(['openai', 'cohere', 'local']),
    model: 'text-embedding-ada-002',
    vector: vector,
    chunkVectors: [],
  };
}

function generateChatTitle(userMessage) {
  const firstSentence = userMessage.split('.')[0];
  if (firstSentence.length > 50) {
    return firstSentence.substring(0, 47) + '...';
  }
  return firstSentence;
}

// Generate Users
console.log('Generating users...');
for (let i = 0; i < CONFIG.numberOfUsers; i++) {
  const createdAt = generateDateWithinRange(365, 30);
  const subscriptionTier = generateSubscriptionTier();
  
  const user = {
    _id: generateObjectId(),
    username: faker.internet.username(),
    email: faker.internet.email(),
    passwordHash: faker.internet.password(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    avatarUrl: faker.image.avatar(),
    preferredLanguage: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'ja']),
    timezone: faker.location.timeZone(),
    emailVerified: faker.datatype.boolean(0.8),
    verificationToken: faker.string.alphanumeric(32),
    subscriptionTier: subscriptionTier,
    subscriptionStatus: faker.helpers.arrayElement(['active', 'active', 'active', 'cancelled']),
    documentsUploadedCount: 0,
    totalChatMessages: 0,
    totalTokensUsed: 0,
    lastActiveAt: generateDateWithinRange(7, 0),
    stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
    settings: {
      emailNotifications: faker.datatype.boolean(),
      autoSummarize: faker.datatype.boolean(),
      defaultModel: faker.helpers.arrayElement(CONFIG.models),
      maxFileSize: getSubscriptionLimits(subscriptionTier).maxFileSize,
    },
    createdAt: createdAt,
    updatedAt: generateDateWithinRange(30, 0),
  };
  
  sampleData.users.push(user);
}

// Generate Subscriptions for each user
console.log('Generating subscriptions...');
sampleData.users.forEach(user => {
  const limits = getSubscriptionLimits(user.subscriptionTier);
  
  const subscription = {
    _id: generateObjectId(),
    userId: user._id,
    planName: user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1),
    tier: user.subscriptionTier,
    maxDocuments: limits.maxDocuments,
    maxFileSize: limits.maxFileSize,
    maxDailyRequests: limits.maxDailyRequests,
    maxChatSessions: limits.maxChatSessions,
    maxDocumentsPerChat: limits.maxDocumentsPerChat,
    features: generateFeaturesForTier(user.subscriptionTier),
    pricePerMonth: limits.pricePerMonth,
    currency: 'USD',
    billingCycle: faker.helpers.arrayElement(['monthly', 'yearly']),
    status: user.subscriptionStatus,
    currentPeriodStart: generateDateWithinRange(30, 0),
    currentPeriodEnd: faker.date.future({ years: 1 }),
    trialStart: user.subscriptionTier === 'free' ? null : generateDateWithinRange(60, 31),
    trialEnd: user.subscriptionTier === 'free' ? null : generateDateWithinRange(30, 0),
    cancelledAt: user.subscriptionStatus === 'cancelled' ? generateDateWithinRange(15, 0) : null,
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    stripePriceId: `price_${faker.string.alphanumeric(14)}`,
    currentPeriodUsage: {
      documentsUploaded: faker.number.int({ min: 0, max: Math.floor(limits.maxDocuments * 0.3) }),
      requestsMade: faker.number.int({ min: 0, max: Math.floor(limits.maxDailyRequests * 0.5) }),
      chatMessagesSent: faker.number.int({ min: 0, max: 200 }),
      tokensUsed: faker.number.int({ min: 0, max: 100000 }),
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  
  user.subscriptionId = subscription._id;
  sampleData.subscriptions.push(subscription);
});

// Generate Documents for each user
console.log('Generating documents...');
sampleData.users.forEach(user => {
  const userSubscription = sampleData.subscriptions.find(sub => sub.userId === user._id);
  const limits = getSubscriptionLimits(user.subscriptionTier);
  
  const numDocuments = faker.number.int({ 
    min: 1, 
    max: Math.min(CONFIG.maxDocumentsPerUser, limits.maxDocuments)
  });
  
  user.documentsUploadedCount = numDocuments;
  
  for (let j = 0; j < numDocuments; j++) {
    const extension = faker.helpers.arrayElement(CONFIG.fileTypes);
    const { fileType, mimeType } = getFileTypeAndMime(extension);
    const content = generateDocumentContent();
    const createdAt = generateDateWithinRange(180, 1);
    
    const document = {
      _id: generateObjectId(),
      userId: user._id,
      uploaderId: user._id,
      originalFilename: `${faker.system.fileName()}.${extension}`,
      fileType: fileType,
      fileExtension: extension,
      mimeType: mimeType,
      fileSize: faker.number.int({ min: 1024, max: limits.maxFileSize * 1024 * 1024 }),
      encoding: 'binary',
      storagePath: `uploads/${user._id}/${Date.now()}_${j}.${extension}`,
      storageBucket: 'sentreader-prod',
      storageKey: `${user._id}/${Date.now()}_${j}.${extension}`,
      storageProvider: 's3',
      status: faker.helpers.arrayElement(['completed', 'completed', 'completed', 'processing', 'failed']),
      progress: faker.number.int({ min: 0, max: 100 }),
      errorMessage: Math.random() > 0.9 ? faker.lorem.sentence() : null,
      processingStartedAt: createdAt,
      processingCompletedAt: faker.date.soon({ days: 10, refDate: createdAt }),
      processingDuration: faker.number.int({ min: 100, max: 10000 }),
      extractedText: content.fullText,
      textLength: content.fullText.length,
      wordCount: content.wordCount,
      pages: content.pages,
      metadata: {
        author: faker.person.fullName(),
        title: faker.lorem.words(faker.number.int({ min: 2, max: 8 })),
        subject: faker.lorem.words(3),
        keywords: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => 
          faker.lorem.word()
        ),
        language: 'en',
        createdDate: generateDateWithinRange(1000, 365),
        modifiedDate: generateDateWithinRange(365, 0),
        pageCount: content.pages.length,
        wordCount: content.wordCount,
        characterCount: content.fullText.length,
        dimensions: {
          width: faker.number.int({ min: 800, max: 1200 }),
          height: faker.number.int({ min: 1000, max: 1600 }),
        },
        dpi: faker.number.int({ min: 72, max: 300 }),
        colorSpace: 'RGB',
      },
      ocrData: ['jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp', 'pdf'].includes(fileType) ? {
        engine: faker.helpers.arrayElement(['tesseract', 'aws-textract', 'google-vision']),
        confidence: faker.number.float({ min: 0.7, max: 0.99, precision: 0.01 }),
        languagesDetected: ['eng'],
      } : null,
      embeddings: generateEmbeddings(),
      chunks: Array.from({ length: Math.ceil(content.wordCount / 500) }, (_, index) => ({
        chunkId: `${generateObjectId()}`,
        pageNumber: faker.number.int({ min: 1, max: content.pages.length }),
        text: content.pages[Math.min(index, content.pages.length - 1)].text,
        startIndex: index * 500,
        endIndex: Math.min((index + 1) * 500, content.wordCount),
        embeddingId: `emb_${faker.string.alphanumeric(10)}`,
      })),
      isPublic: faker.datatype.boolean(0.1),
      sharingToken: faker.datatype.boolean(0.1) ? faker.string.alphanumeric(32) : null,
      sharedWith: [],
      tags: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => 
        faker.lorem.word()
      ),
      folderId: null,
      viewCount: faker.number.int({ min: 0, max: 100 }),
      lastAccessedAt: faker.date.recent({ days: 30 }),
      createdAt: createdAt,
      updatedAt: faker.date.recent({ days: 15 }),
    };
    
    sampleData.documents.push(document);
  }
});

// Generate Chat Sessions for each user
console.log('Generating chat sessions...');
sampleData.users.forEach(user => {
  const userSubscription = sampleData.subscriptions.find(sub => sub.userId === user._id);
  const limits = getSubscriptionLimits(user.subscriptionTier);
  
  const numSessions = faker.number.int({ 
    min: 1, 
    max: Math.min(CONFIG.maxChatSessionsPerUser, limits.maxChatSessions)
  });
  
  const userDocuments = sampleData.documents.filter(doc => doc.userId === user._id);
  
  for (let j = 0; j < numSessions; j++) {
    const sessionDocCount = faker.number.int({ 
      min: 0, 
      max: Math.min(limits.maxDocumentsPerChat, userDocuments.length)
    });
    const sessionDocs = faker.helpers.arrayElements(userDocuments, sessionDocCount);
    
    const createdAt = generateDateWithinRange(60, 1);
    const lastActive = faker.date.between({ 
      from: createdAt, 
      to: new Date() 
    });
    
    const chatSession = {
      _id: generateObjectId(),
      userId: user._id,
      teamId: null,
      title: '', // Will be set after first message
      description: faker.lorem.sentence(),
      isActive: faker.datatype.boolean(0.7),
      isArchived: faker.datatype.boolean(0.2),
      isPublic: faker.datatype.boolean(0.05),
      documentIds: sessionDocs.map(doc => doc._id),
      activeDocumentId: sessionDocs.length > 0 ? sessionDocs[0]._id : null,
      aiModel: user.settings.defaultModel,
      temperature: faker.number.float({ min: 0.1, max: 0.9, precision: 0.1 }),
      maxTokens: faker.number.int({ min: 500, max: 4000 }),
      systemPrompt: faker.datatype.boolean(0.3) ? 
        `You are a helpful assistant analyzing documents about ${faker.lorem.words(2)}.` : 
        'You are a helpful AI assistant.',
      contextWindow: faker.number.int({ min: 1, max: 20 }),
      messageCount: 0,
      totalTokensUsed: 0,
      userMessageCount: 0,
      aiMessageCount: 0,
      lastMessageAt: lastActive,
      lastActivityAt: lastActive,
      metadata: {
        source: faker.helpers.arrayElement(['web', 'api', 'mobile']),
        userAgent: faker.internet.userAgent(),
        ipAddress: faker.internet.ip(),
        location: `${faker.location.city()}, ${faker.location.country()}`,
      },
      sharedWith: [],
      participants: [],
      createdAt: createdAt,
      updatedAt: lastActive,
      expiresAt: faker.date.future({ years: 1 }),
    };
    
    sampleData.chatSessions.push(chatSession);
  }
});

// Generate Chat Messages for each chat session
console.log('Generating chat messages...');
let totalTokensUsed = 0;

sampleData.chatSessions.forEach(session => {
  const numMessages = faker.number.int({ 
    min: 2, 
    max: CONFIG.maxMessagesPerChat 
  });
  
  const sessionDocs = sampleData.documents.filter(doc => 
    session.documentIds.includes(doc._id)
  );
  
  let sessionTitle = '';
  
  for (let j = 0; j < numMessages; j++) {
    const isUser = j % 2 === 0;
    const role = isUser ? 'user' : 'assistant';
    
    let content = '';
    if (isUser) {
      content = faker.lorem.sentences(faker.number.int({ min: 1, max: 3 }));
      if (j === 0) {
        sessionTitle = generateChatTitle(content);
      }
    } else {
      if (sessionDocs.length > 0 && Math.random() > 0.3) {
        const doc = faker.helpers.arrayElement(sessionDocs);
        const page = faker.helpers.arrayElement(doc.pages || []);
        content = `Based on the document "${doc.metadata.title}", ${faker.lorem.paragraph()}`;
      } else {
        content = faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 }));
      }
    }
    
    const promptTokens = faker.number.int({ min: 10, max: 500 });
    const completionTokens = isUser ? 0 : faker.number.int({ min: 50, max: 1000 });
    const totalTokens = promptTokens + completionTokens;
    totalTokensUsed += totalTokens;
    
    const documentReferences = [];
    if (!isUser && sessionDocs.length > 0 && Math.random() > 0.5) {
      const doc = faker.helpers.arrayElement(sessionDocs);
      const page = faker.helpers.arrayElement(doc.pages || []);
      
      documentReferences.push({
        documentId: doc._id,
        pageNumber: page ? page.pageNumber : 1,
        chunkId: doc.chunks && doc.chunks.length > 0 ? 
          faker.helpers.arrayElement(doc.chunks).chunkId : 
          `${generateObjectId()}`,
        confidence: faker.number.float({ min: 0.7, max: 0.99, precision: 0.01 }),
        textSnippet: page ? page.text.substring(0, 200) + '...' : '',
      });
    }
    
    const chatMessage = {
      _id: generateObjectId(),
      chatSessionId: session._id,
      role: role,
      content: content,
      contentType: 'text',
      aiModel: isUser ? null : session.aiModel,
      temperature: isUser ? null : session.temperature,
      promptTokens: promptTokens,
      completionTokens: completionTokens,
      totalTokens: totalTokens,
      estimatedCost: totalTokens * 0.000002,
      documentReferences: documentReferences,
      citations: [],
      functionCall: null,
      processingTime: faker.number.int({ min: 100, max: 3000 }),
      processingStartedAt: generateDateWithinRange(1, 0),
      processingCompletedAt: faker.date.soon({ days: 0.001 }),
      status: 'completed',
      error: null,
      userId: session.userId,
      parentMessageId: j > 0 && sampleData.chatMessages.length > 0 ? 
        sampleData.chatMessages[sampleData.chatMessages.length - 1]._id : null,
      threadId: null,
      userFeedback: Math.random() > 0.8 ? {
        rating: faker.number.int({ min: 1, max: 5 }),
        feedbackText: faker.lorem.sentence(),
        helpful: faker.datatype.boolean(),
        reported: false,
      } : null,
      metadata: {
        language: 'en',
        sentiment: faker.helpers.arrayElement(['positive', 'neutral', 'negative']),
        entities: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => 
          faker.lorem.word()
        ),
      },
      createdAt: new Date(session.createdAt.getTime() + (j * 60000)),
      updatedAt: new Date(session.createdAt.getTime() + (j * 60000)),
    };
    
    session.messageCount++;
    session.totalTokensUsed += totalTokens;
    if (isUser) {
      session.userMessageCount++;
    } else {
      session.aiMessageCount++;
    }
    
    sampleData.chatMessages.push(chatMessage);
  }
  
  if (sessionTitle) {
    session.title = sessionTitle;
  } else {
    session.title = `Chat about ${faker.lorem.words(2)}`;
  }
  
  const user = sampleData.users.find(u => u._id === session.userId);
  if (user) {
    user.totalChatMessages += session.messageCount;
    user.totalTokensUsed += session.totalTokensUsed;
  }
});

// Update user document counts
sampleData.documents.forEach(doc => {
  const user = sampleData.users.find(u => u._id === doc.userId);
  if (user) {
    user.documentsUploadedCount = sampleData.documents.filter(d => d.userId === user._id).length;
  }
});

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.outputDirectory)) {
  fs.mkdirSync(CONFIG.outputDirectory, { recursive: true });
}

// Export data to JSON files
console.log('Exporting data to JSON files...');
Object.keys(sampleData).forEach(modelName => {
  const filePath = path.join(CONFIG.outputDirectory, `${modelName}.json`);
  fs.writeFileSync(
    filePath, 
    JSON.stringify(sampleData[modelName], null, 2)
  );
  console.log(`Generated ${sampleData[modelName].length} ${modelName} records`);
});

// Generate a summary report
const summary = {
  totalUsers: sampleData.users.length,
  totalSubscriptions: sampleData.subscriptions.length,
  totalDocuments: sampleData.documents.length,
  totalChatSessions: sampleData.chatSessions.length,
  totalChatMessages: sampleData.chatMessages.length,
  totalTokensUsed: totalTokensUsed,
  subscriptionDistribution: sampleData.subscriptions.reduce((acc, sub) => {
    acc[sub.tier] = (acc[sub.tier] || 0) + 1;
    return acc;
  }, {}),
  averageDocumentsPerUser: sampleData.documents.length / sampleData.users.length,
  averageMessagesPerChat: sampleData.chatMessages.length / sampleData.chatSessions.length,
  generationDate: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(CONFIG.outputDirectory, 'summary.json'),
  JSON.stringify(summary, null, 2)
);

console.log('\n=== Data Generation Complete ===');
console.log('Summary:');
console.log(`- Users: ${summary.totalUsers}`);
console.log(`- Subscriptions: ${summary.totalSubscriptions}`);
console.log(`- Documents: ${summary.totalDocuments}`);
console.log(`- Chat Sessions: ${summary.totalChatSessions}`);
console.log(`- Chat Messages: ${summary.totalChatMessages}`);
console.log(`- Total Tokens: ${summary.totalTokensUsed.toLocaleString()}`);
console.log('\nSubscription Distribution:');
Object.entries(summary.subscriptionDistribution).forEach(([tier, count]) => {
  console.log(`  ${tier}: ${count} (${((count / summary.totalUsers) * 100).toFixed(1)}%)`);
});
console.log(`\nFiles saved in: ${path.resolve(CONFIG.outputDirectory)}`);
```

## **Key Changes Made:**

1. **Removed problematic file types**: Removed `'html', 'xml', 'json'` from the `fileTypes` array since they were causing validation errors.

2. **Corrected field names**: Using camelCase consistently (e.g., `fileType`, `userId`, `subscriptionTier`).

3. **Added proper file type mapping**: The `getFileTypeAndMime()` function correctly maps extensions to proper file types and MIME types.

4. **Fixed enterprise tier**: Corrected `maxChatSessions: ,40` to `maxChatSessions: 40`.

5. **Safe file generation**: Only generates file types that should be in your Document model's enum.

## **How to use:**

1. **Save** this as `dev-data/generate-sample-data.js`
2. **Run the generator:**
   ```bash
   node dev-data/generate-sample-data.js
   ```
3. **Import the data:**
   ```bash
   node dev-data/import-dev-data.js --import
   ```

The data will be generated in the `./dev-data/data/` directory as JSON files.