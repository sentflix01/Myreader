require('dotenv').config({ path: './config.env' });
const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const buf = fs.readFileSync('user-agreement-7-1.pdf');

// pdf-parse v2: PDFParse constructor takes options, then getText() is called
// OR it takes {data: buffer} in constructor
const p1 = new PDFParse({ data: buf });
console.log('Methods on instance:', Object.getOwnPropertyNames(Object.getPrototypeOf(p1)));

// Try getText
if (typeof p1.getText === 'function') {
  p1.getText().then(r => {
    console.log('getText() result type:', typeof r);
    console.log('getText() keys:', Object.keys(r || {}));
    if (r && r.text) {
      console.log('SUCCESS! pages:', r.numpages, 'len:', r.text.length);
      console.log('Sample:', r.text.slice(0, 200));
    }
    process.exit(0);
  }).catch(e => {
    console.error('getText() failed:', e.message);
    process.exit(1);
  });
} else {
  console.log('No getText method');
  process.exit(1);
}
