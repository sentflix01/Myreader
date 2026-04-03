class RecursiveCharacterTextSplitter {
  constructor({ chunkSize = 1000, chunkOverlap = 200 } = {}) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2));
    this.separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ': ', ', ', ' ', ''];
  }

  splitDocuments(docs = []) {
    const chunks = [];
    for (const doc of docs) {
      const texts = this.splitText(doc.text || '');
      texts.forEach((text, idx) => {
        chunks.push({
          text,
          metadata: { ...(doc.metadata || {}), chunk: idx },
        });
      });
    }
    return chunks;
  }

  splitText(text) {
    const cleaned = String(text).replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    if (cleaned.length <= this.chunkSize) return [cleaned];

    return this._splitTextRecursive(cleaned, this.separators);
  }

  _splitTextRecursive(text, separators) {
    const separator = separators[0];
    let splits;
    
    if (separator) {
      splits = text.split(separator);
    } else {
      splits = text.split('');
    }

    const goodSplits = [];
    const _separator = separators.length > 1 ? '' : separator;
    
    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length > 0) {
          const mergedSplits = this._mergeSplits(goodSplits, _separator);
          goodSplits.length = 0;
          goodSplits.push(...mergedSplits);
        }
        if (separators.length > 1) {
          const otherInfo = this._splitTextRecursive(s, separators.slice(1));
          goodSplits.push(...otherInfo);
        } else {
          goodSplits.push(s);
        }
      }
    }
    
    return this._mergeSplits(goodSplits, _separator);
  }

  _mergeSplits(splits, separator) {
    const docs = [];
    const currentDoc = [];
    let total = 0;
    
    for (const d of splits) {
      const _len = d.length;
      if (total + _len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
        if (total > this.chunkSize) {
          console.warn(`Created a chunk of size ${total}, which is longer than the specified ${this.chunkSize}`);
        }
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator).trim();
          if (doc) docs.push(doc);
          
          // Handle overlap
          while (total > this.chunkOverlap || (total + _len + separator.length > this.chunkSize && total > 0)) {
            total -= currentDoc[0].length + (currentDoc.length > 1 ? separator.length : 0);
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += _len + (currentDoc.length > 1 ? separator.length : 0);
    }
    
    const doc = currentDoc.join(separator).trim();
    if (doc) docs.push(doc);
    
    return docs;
  }
}

module.exports = RecursiveCharacterTextSplitter;
