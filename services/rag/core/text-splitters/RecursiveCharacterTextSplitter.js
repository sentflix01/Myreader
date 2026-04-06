// Placeholder - use current splitterService.js
module.exports = class RecursiveCharacterTextSplitter {
  split(text, config) {
    const { splitterService } = require('../../../splitterService');
    return splitterService.splitText(text, config);
  }
};
