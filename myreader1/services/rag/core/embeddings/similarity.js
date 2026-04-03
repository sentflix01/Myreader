function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    console.warn('Invalid vectors for similarity calculation:', {
      aLength: Array.isArray(a) ? a.length : 'not array',
      bLength: Array.isArray(b) ? b.length : 'not array'
    });
    return 0;
  }
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const valA = Number(a[i]) || 0;
    const valB = Number(b[i]) || 0;
    
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  
  const similarity = dot / denom;
  return isNaN(similarity) ? 0 : similarity;
}

module.exports = { cosineSimilarity };
