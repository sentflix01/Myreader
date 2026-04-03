require('dotenv').config({ path: './config.env' });

const path = require('path');
const loaderService = require('./services/loaderService');
const splitter = require('./services/splitterService');
const embeddings = require('./services/embeddingsService');
const vectorStore = require('./services/vectorService');
const ragService = require('./services/ragService');

const PDF_PATH = path.join(__dirname, 'user-agreement-7-1.pdf');
const TEST_DOCID = 'test-doc-001';
const TEST_GROUPID = 'test-group-001';
const TEST_USERID = 'test-user-001';

async function run() {
  console.log('\n=== STEP 1: Extract text from PDF ===');
  const rawText = await loaderService.extract(PDF_PATH, 'application/pdf', 'pdf');
  console.log(`✓ Extracted ${rawText.length} chars`);
  console.log('Sample:', rawText.slice(0, 150));

  console.log('\n=== STEP 2: Split into chunks ===');
  const chunks = splitter.split(rawText, {
    chunkSize: 800,
    overlap: 200,
    docId: TEST_DOCID,
    groupId: TEST_GROUPID,
    userId: TEST_USERID,
    filename: 'user-agreement-7-1.pdf',
    sourceType: 'pdf',
  });
  console.log(`✓ Created ${chunks.length} chunks`);
  console.log('First chunk preview:', chunks[0]?.text?.slice(0, 100));

  console.log('\n=== STEP 3: Generate embeddings ===');
  const embeddedChunks = await embeddings.embedChunks(chunks.slice(0, 3)); // test first 3
  console.log(`✓ Embedded ${embeddedChunks.length} chunks`);
  console.log('Embedding dim:', embeddedChunks[0]?.embedding?.length);

  console.log('\n=== STEP 4: Store vectors ===');
  const allEmbedded = await embeddings.embedChunks(chunks);
  await vectorStore.upsert(allEmbedded);
  console.log(`✓ Stored ${allEmbedded.length} vectors`);

  console.log('\n=== STEP 5: RAG query (English) ===');
  const { answer: answerEn, sources: sourcesEn, processedQuery } = await ragService.answer({
    question: 'What is this agreement about?',
    groupId: TEST_GROUPID,
    docIds: [TEST_DOCID],
    userId: TEST_USERID,
    tier: 'free',
    language: 'en',
    history: [],
  });
  console.log('✓ English answer received');
  console.log('Processed query:', processedQuery);
  console.log('Sources:', sourcesEn.length);
  console.log('Answer preview:', answerEn.slice(0, 300));

  console.log('\n=== STEP 6: RAG query (Amharic) ===');
  const { answer: answerAm } = await ragService.answer({
    question: 'ይህ ስምምነት ምን ይመለከታል?',
    groupId: TEST_GROUPID,
    docIds: [TEST_DOCID],
    userId: TEST_USERID,
    tier: 'free',
    language: 'am',
    history: [],
  });
  console.log('✓ Amharic answer received');
  console.log('Answer preview:', answerAm.slice(0, 200));

  console.log('\n=== ALL STEPS PASSED ✓ ===');
}

run().catch(err => {
  console.error('\n✗ PIPELINE FAILED:', err.message);
  console.error(err.stack?.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
});
