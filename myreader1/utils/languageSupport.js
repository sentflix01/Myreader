const LANGUAGE_META = {
  en: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.dashboard': 'Dashboard',
    'nav.pricing': 'Price',
    'nav.services': 'Services',
    'nav.features': 'Features',
    'nav.tour': 'Tour',
    'nav.accountSettings': 'Account Settings',
    'nav.support': 'Support',
    'nav.logout': 'Logout',
    'nav.login': 'Log in',
    'nav.signup': 'Sign up',

    code: 'en',
    nativeName: 'English',
    promptInstruction: 'Respond in clear English.',
  },
  am: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.dashboard': 'ዳሽቦርድ',
    'nav.pricing': 'ዋጋ',
    'nav.services': 'አገልግሎቶች',
    'nav.features': 'ባህሪያት',
    'nav.tour': 'ጉዞ',
    'nav.accountSettings': 'የመለያ ቅንብሮች',
    'nav.support': 'ድጋፍ',
    'nav.logout': 'ውጣ',
    'nav.login': 'ግባ',
    'nav.signup': 'ክፈዋይ',

    code: 'am',
    nativeName: 'አማርኛ',
    promptInstruction:
      'Respond in natural Amharic using Ethiopic script. Keep product names, plan names, file names, and technical terms like RAG, PDF, Chat, Dashboard, SentReader, and Sentbot as-is when that is clearer.',
  },
};

const LOCALIZED_COPY = {
  en: {
    'sentbot.documentRedirect':
      'I do not answer questions about document contents. Please use the Chat page for RAG questions so the answer comes only from your uploaded file. I can still help with your usage, dashboard numbers, subscription, billing, and general product support.',
    'sentbot.genericReply':
      'I can help with account support, usage counts, subscription plans, billing guidance, dashboard totals, and product features. For questions about what an uploaded document says, please use the Chat page because Sentbot does not answer document-content questions.',
    'sentbot.fallback.queries':
      'You have asked {{todayQueries}} queries today and {{totalQueries}} queries in total. Your current daily message count is {{todayMessages}}.',
    'sentbot.fallback.uploads':
      'You have {{totalDocuments}} active documents in your account, {{totalUploads}} uploads recorded in total, and {{todayUploads}} uploads in the current usage window.',
    'sentbot.fallback.messages':
      'You currently have {{totalChats}} chats, {{todayMessages}} messages in today\'s usage window, and {{totalMessages}} chat messages recorded in total.',
    'sentbot.fallback.subscription':
      'Your current plan is {{tier}} with {{interval}} billing and status {{status}}. You can upgrade from the pricing or account page. Direct checkout is {{directCheckout}} and Stripe checkout is {{stripeCheckout}}. Available plans are Free, Premium, and Enterprise.',
    'sentbot.fallback.dashboard':
      'Public dashboard totals currently show {{totalUsers}} users, {{totalDocuments}} documents, and {{totalReviews}} reviews. Across the platform, recorded totals include {{totalUploads}} uploads, {{totalQueries}} queries, and {{totalMessages}} chat messages. Users by tier: {{usersByTier}}. Documents by type: {{documentsByType}}. Main product features include: {{features}}.',
    'rag.noDocuments':
      'I couldn\'t find any uploaded document content to answer "{{question}}".',
    'rag.noSupportedAnswer':
      'I couldn\'t find a supported answer to "{{question}}" in the uploaded document(s). Please ask about a passage that appears in the file.',
    'rag.answerIntro':
      'Answer based only on the uploaded document(s) for "{{question}}":',
    'rag.sourcePrefix': 'Source {{index}}',
    'chat.canned.noAnswer1':
      'I could not locate an answer in your document. Please provide more detail or upload a different file.',
    'chat.canned.noAnswer2':
      'No relevant document content was found. Try rephrasing your question or confirm the right file is selected.',
    'chat.canned.noAnswer3':
      'I do not have enough context to answer that yet. Please ask about what is in your uploaded document.',
    'chat.ragFailure': 'RAG search failed. Please try again or re-upload your document.',
  },
  am: {
    'sentbot.documentRedirect':
      'ስለ ሰነድ ውስጥ ያለ ይዘት መልስ አልሰጥም። ለ RAG ጥያቄዎች ወደ Chat ገጽ ይሂዱ እና መልሱ ከእርስዎ ከሰቀሉት ፋይል ብቻ እንዲመጣ ያድርጉ። እኔ ግን ስለ አጠቃቀምዎ፣ የዳሽቦርድ ቁጥሮች፣ ምዝገባ፣ ክፍያ እና አጠቃላይ ድጋፍ ልረዳዎ እችላለሁ።',
    'sentbot.genericReply':
      'ስለ መለያ ድጋፍ፣ የአጠቃቀም ቁጥሮች፣ የምዝገባ ፕላኖች፣ የክፍያ መመሪያ፣ የዳሽቦርድ አጠቃላይ ቁጥሮች እና የምርት ባህሪያት ልረዳዎ እችላለሁ። ስለ ተሰቀለ ሰነድ ይዘት ለመጠየቅ ወደ Chat ገጽ ይሂዱ፣ ምክንያቱም Sentbot የሰነድ ይዘት ጥያቄዎችን አይመልስም።',
    'sentbot.fallback.queries':
      'ዛሬ {{todayQueries}} ጥያቄዎችን ጠይቀዋል፣ በአጠቃላይ ደግሞ {{totalQueries}} ጥያቄዎች አሉዎት። የዛሬ የመልዕክት ቆጠራዎ {{todayMessages}} ነው።',
    'sentbot.fallback.uploads':
      'በመለያዎ ውስጥ {{totalDocuments}} ንቁ ሰነዶች አሉ፣ በአጠቃላይ {{totalUploads}} ሰቀላዎች ተመዝግበዋል፣ በአሁኑ የአጠቃቀም ጊዜ መስኮት ውስጥ ደግሞ {{todayUploads}} ሰቀላዎች አሉ።',
    'sentbot.fallback.messages':
      'አሁን {{totalChats}} ቻቶች አሉዎት፣ በዛሬ የአጠቃቀም ጊዜ መስኮት {{todayMessages}} መልዕክቶች አሉ፣ በአጠቃላይ ደግሞ {{totalMessages}} የቻት መልዕክቶች ተመዝግበዋል።',
    'sentbot.fallback.subscription':
      'የአሁኑ ፕላንዎ {{tier}} ነው፣ የክፍያ ዑደቱ {{interval}} ሲሆን ሁኔታው {{status}} ነው። ከ pricing ወይም account ገጽ ማሻሻል ይችላሉ። Direct checkout {{directCheckout}} ነው እና Stripe checkout {{stripeCheckout}} ነው። የሚገኙ ፕላኖች Free፣ Premium እና Enterprise ናቸው።',
    'sentbot.fallback.dashboard':
      'የህዝብ ዳሽቦርድ አጠቃላይ ቁጥሮች {{totalUsers}} ተጠቃሚዎች፣ {{totalDocuments}} ሰነዶች እና {{totalReviews}} ግምገማዎችን ያሳያሉ። በመድረኩ አጠቃላይ {{totalUploads}} ሰቀላዎች፣ {{totalQueries}} ጥያቄዎች እና {{totalMessages}} የቻት መልዕክቶች ተመዝግበዋል። ተጠቃሚዎች በፕላን: {{usersByTier}}። ሰነዶች በአይነት: {{documentsByType}}። ዋና ባህሪያት: {{features}}።',
    'rag.noDocuments':
      '"{{question}}" ለሚለው ጥያቄ የሚያገለግል የተሰቀለ ሰነድ ይዘት አላገኘሁም።',
    'rag.noSupportedAnswer':
      'በተሰቀሉት ሰነዶች ውስጥ "{{question}}" የሚደግፍ መልስ አላገኘሁም። እባክዎ በፋይሉ ውስጥ የሚታይ ክፍል ላይ ያተኮረ ጥያቄ ይጠይቁ።',
    'rag.answerIntro':
      '"{{question}}" ለሚለው ጥያቄ ከተሰቀሉት ሰነዶች ብቻ የተመሠረተ መልስ፦',
    'rag.sourcePrefix': 'ምንጭ {{index}}',
    'chat.canned.noAnswer1':
      'በሰነድዎ ውስጥ ግልጽ መልስ አላገኘሁም። እባክዎ ተጨማሪ ዝርዝር ይስጡ ወይም ሌላ ፋይል ይስቀሉ።',
    'chat.canned.noAnswer2':
      'ተገቢ የሰነድ ይዘት አልተገኘም። ጥያቄዎን እንደገና ይቀይሩ ወይም ትክክለኛው ፋይል መመረጡን ያረጋግጡ።',
    'chat.canned.noAnswer3':
      'እስካሁን ድረስ በቂ የአውድ መረጃ የለኝም። እባክዎ በተሰቀለው ሰነድ ውስጥ ያለውን ነገር ብቻ ይጠይቁ።',
    'chat.ragFailure': 'የ RAG ፍለጋ አልተሳካም። እባክዎ እንደገና ይሞክሩ ወይም ሰነዱን እንደገና ይስቀሉ።',
  },
};

function normalizeLanguage(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('am')) return 'am';
  return 'en';
}

function getLanguageMeta(value = 'en') {
  return LANGUAGE_META[normalizeLanguage(value)] || LANGUAGE_META.en;
}

function interpolate(template, replacements = {}) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    String(template || ''),
  );
}

function getLocalizedCopy(language, key, replacements = {}) {
  const normalized = normalizeLanguage(language);
  const template =
    LOCALIZED_COPY[normalized]?.[key] || LOCALIZED_COPY.en[key] || key;
  return interpolate(template, replacements);
}

function getRequestLanguage(req) {
  return normalizeLanguage(
    req?.headers?.['x-app-language'] ||
      req?.body?.responseLanguage ||
      req?.body?.language ||
      req?.query?.lang,
  );
}

function getAnswerLanguageInstruction(language) {
  return getLanguageMeta(language).promptInstruction;
}

module.exports = {
  getAnswerLanguageInstruction,
  getLanguageMeta,
  getLocalizedCopy,
  getRequestLanguage,
  normalizeLanguage,
};
