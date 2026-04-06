'use strict';

const fs = require('fs');
const path = require('path');

const bundle = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'appTranslations.json'), 'utf8'),
);

const EXTRA_EN = {
  'nav.price': 'Price',
  'nav.tour': 'Tour',
  'profile.accountSettings': 'Account Settings',
  'profile.plan.free': 'Free plan',
  'profile.plan.premium': 'Premium',
  'profile.plan.enterprise': 'Enterprise',
  'subscription.status.active': 'Active',
  'subscription.status.cancelled': 'Cancelled',
  'subscription.status.expired': 'Expired',
  'subscription.status.pending': 'Pending',
  'footer.copyright':
    'Copyright © {{year}} by SentReader, Inc. All rights reserved.',
  'footer.contact': 'Contact us',
  'footer.addressLine': 'Addis Ababa, Ethiopia',
  'footer.solutions': 'Solutions',
  'footer.company': 'Company',
  'footer.resources': 'Resources',
  'footer.financial': 'Financial Services',
  'footer.legal': 'Legal and insurance',
  'footer.researchers': 'Researchers',
  'footer.education': 'Education',
  'footer.documentation': 'Documentation',
  'footer.about': 'About Us',
  'footer.business': 'For Business',
  'footer.customers': 'Customers',
  'footer.careers': 'Careers',
  'footer.newsroom': 'Newsroom',
  'footer.reviewDir': 'Reviewing directory',
  'footer.aiGov': 'AI Governance',
  'footer.docs': 'Documentation',
  'footer.help': 'Help center',
  'footer.privacy': 'Privacy & terms',
  'meta.description':
    'MyReader AI is an AI-powered reading assistant that lets you upload documents like PDFs and books, then chat with them for summaries and answers.',
  'error.title': 'Something went wrong!',
  'error.generic': 'Something went wrong!',
  'billing.redirecting': 'Redirecting...',
  'billing.opening': 'Opening...',
  'billing.updating': 'Updating...',
  'billing.working': 'Working...',
  'billing.loginToUpgrade': 'Please log in to upgrade your plan.',
  'billing.checkoutFail': 'Unable to start checkout',
  'billing.portalFail': 'Unable to open billing portal',
  'billing.cancelNow': 'Cancel the subscription immediately?',
  'billing.cancelEnd': 'Cancel the subscription at the end of the current billing period?',
  'billing.subUpdated': 'Subscription updated successfully.',
  'billing.subUpdateFail': 'Unable to update subscription',
  'billing.noCheckoutUrl': 'No checkout URL returned',
  'billing.noPortalUrl': 'No billing portal URL returned',
  'tour.close': 'Close tour',
  'chat.tabChat': 'CHAT',
  'chat.tabError': 'ERROR',
  'chat.tabToken': 'TOKEN USED',
  'chat.tabModel': 'MODEL USED',
  'chat.tabRag': 'RAG INFO',
  'chat.tabUsage': 'USAGE LIMIT',
  'chat.tabSubscription': 'SUBSCRIPTION',
  'chat.closePanel': 'Close panel',
  'chat.tocTitle': 'Table of Contents',
  'chat.docsTitle': 'Documents',
  'chat.questionsTitle': 'Question Suggestions',
  'chat.ragLangTitle': 'Response language',
  'chat.sidebarNoDoc': 'No Document',
  'chat.tocEmpty': 'Upload a document to see its table of contents',
  'chat.questionsEmpty': 'Question suggestions will appear after your document is processed.',
  'chat.docsEmpty': 'No documents in this group yet',
  'chat.toggleLeft': 'Toggle left panel',
  'chat.toggleRight': 'Toggle right panel',
  'chat.toggleBottom': 'Toggle bottom panel',
  'chat.tokenEmpty':
    'Tokens used will appear here after your first RAG query.',
  'chat.modelEmpty':
    'Model information will appear here after your first RAG query.',
  'chat.ragTabEmpty':
    'RAG retrieval details will appear here after your first query.',
  'chat.usageEmpty': 'Usage information will appear here.',
  'chat.subEmpty': 'Subscription details will appear here.',
  'chat.viewPlans': 'View plans',
  'chat.errorTabOk': 'No errors',
  'chat.processingTimeout': 'Document processing took too long. Please try again.',
  'chat.ragSessionLoadFailed':
    'Could not finish loading this document. Please upload it again.',
  'chat.processingDocumentTitle': 'Preparing your document',
  'chat.processingDocumentHint':
    'Extracting text, building the table of contents, and indexing for questions. This usually takes a few seconds.',
  'chat.loadingOutline': 'Loading outline for {{title}}...',
  'chat.tocGateTitle': 'Table of contents is ready',
  'chat.tocGateLead':
    'We found {{count}} section{{plural}} in {{title}}. Open the left panel to skim the outline{{extra}}.',
  'chat.tocGateLeadExtra': ', or tap a section to draft a question',
  'chat.tocGateStep1': 'Review sections in the sidebar',
  'chat.tocGateStep2': 'Tap Start chatting when you are ready to ask questions',
  'chat.startChatting': 'Start chatting',
  'chat.tocGateNote': 'RAG answers use only this document until you upload another file.',
  'chat.readyIntro': `I'm ready to answer questions about {{name}}. What would you like to know?`,
  'chat.noTocAvailable': 'No table of contents available',
  'chat.processingShort': 'Processing',
  'chat.reviewOutline': 'Review the outline in the left panel, then tap Start chatting below.',
  'chat.extractingOutline': 'Extracting text and table of contents...',
  'chat.pageLabel': 'Page {{page}}',
  'chat.questionListHint': 'Tap any suggestion to draft it into the composer.',
  'common.unlimited': 'Unlimited',
  'common.yes': 'Yes',
  'common.no': 'No',
  'account.choosePhoto': 'Choose new photo',
  'account.editProfile': 'Edit Profile',
  'account.admin': 'Admin',
  'account.manageUsers': 'Manage users',
  'account.manageReviews': 'Manage reviews',
  'account.openWorkspace': 'Open Workspace',
  'account.reviewColumn': 'Review',
  'account.manageBilling': 'Manage billing',
  'account.upgradePremium': 'Upgrade to Premium',
  'account.upgradeEnterprise': 'Upgrade to Enterprise',
  'account.loginToViewSubscription': 'Please log in to view your subscription.',
  'account.cancelAtPeriodEnd': 'Cancel at period end',
  'account.cancellationScheduled':
    'Cancellation is scheduled for the end of your current billing period.',
  'account.openBillingPortal': 'Open billing portal',
  'account.loginToViewBilling': 'Please log in to view your billing information.',
  'pricing.openWorkspace': 'Open Workspace',
  'auth.placeholderName': 'Enter your name',
  'auth.placeholderEmail': 'Enter your email',
  'auth.placeholderPassword': 'Enter your password',
  'auth.placeholderEmailShort': 'you@example.com',
  'auth.resetTitle': 'Set a new password',
  'auth.resetHint': 'Choose a password at least 8 characters long.',
  'auth.updatePassword': 'Update password',
  'auth.resetErrorExpired': 'Could not reset password. The link may have expired.',
  'auth.resetErrorGeneric': 'Something went wrong. Please try again.',
  'overview.delivered': 'Files addressed last year!',
  'overview.testimonial1.quote':
    'SentReader is a total game-changer for my research! I upload long PDFs and reports, and it summarizes everything clearly while letting me ask specific questions. It saves me hours every week.',
  'overview.testimonial2.quote':
    'As a busy professional, I love how easy SentReader makes document review. The AI chat is intuitive, the answers are grounded in the file, and the summaries are spot-on.',
  'overview.testimonial3.quote':
    'This tool has boosted my productivity. Chatting with multiple files and getting quick insights from complex reports is exactly what I needed.',
  'overview.testimonial4.quote':
    'I was skeptical at first, but SentReader exceeded my expectations. Quick uploads, precise summaries, and useful answers have made it part of my daily workflow.',
  'overview.form.optionFriends': 'Friends and family',
  'overview.form.optionYoutube': 'YouTube video',
  'overview.form.optionPodcast': 'Podcast',
  'overview.form.optionAd': 'Facebook ad',
  'overview.form.optionOthers': 'Others',
  'overview.tasks': 'Tasks',
  'overview.testimonials': 'Testimonials',
  'overview.seeAllFeatures': 'See all Features',
  'services.ratingLabel': 'rating',
  'services.galleryAlt': 'MyReader document gallery preview',
  'dashboard.showingLatestReviews': 'Showing {{count}} latest reviews',
  'dashboard.showingLatestChats': 'Showing {{count}} latest chats',
  'dashboard.documentsByType': 'Documents by type',
  'dashboard.usersByTier': 'Users by tier',
  'dashboard.noDocumentsUploaded': 'No documents uploaded yet.',
  'sentbot.open': 'Open Sentbot',
  'sentbot.close': 'Close Sentbot',
};

const EXTRA_AM = {
  'nav.price': 'ዋጋ',
  'nav.tour': 'መመሪያ',
  'profile.accountSettings': 'የመለያ ቅንብሮች',
  'profile.plan.free': 'ነጻ ፕላን',
  'profile.plan.premium': 'ፕሪሚየም',
  'profile.plan.enterprise': 'ኢንተርፕራይዝ',
  'subscription.status.active': 'ንቁ',
  'subscription.status.cancelled': 'ተሰርዟል',
  'subscription.status.expired': 'ጊዜው አልፏል',
  'subscription.status.pending': 'በመጠባበቅ ላይ',
  'footer.copyright':
    'የቅጂ መብት © {{year}} SentReader, Inc. ሁሉም መብቶች የተጠበቁ ናቸው።',
  'footer.contact': 'ያግኙን',
  'footer.addressLine': 'አዲስ አበባ፣ ኢትዮጵያ',
  'footer.solutions': 'መፍትሄዎች',
  'footer.company': 'ኩባንያ',
  'footer.resources': 'ግብዣዎች',
  'footer.financial': 'የፋይናንስ አገልግሎቶች',
  'footer.legal': 'ህጋዊ እና ኢንሹራንስ',
  'footer.researchers': 'ተመራማሪዎች',
  'footer.education': 'ትምህርት',
  'footer.documentation': 'ሰነዶች',
  'footer.about': 'ስለ እኛ',
  'footer.business': 'ለንግድ',
  'footer.customers': 'ደንበኞች',
  'footer.careers': 'የስራ ዕድሎች',
  'footer.newsroom': 'ዜና',
  'footer.reviewDir': 'የግምገማ ማውጫ',
  'footer.aiGov': 'የ AI አስተዳደር',
  'footer.docs': 'ሰነዶች',
  'footer.help': 'የእርዳታ ማዕከል',
  'footer.privacy': 'ግላዊነት እና ውሎች',
  'meta.description':
    'MyReader AI የፒዲኤፍ እና መጽሐፍትን ለመጫን እና ማጠቃለያ እና መልሶች ለማግኘት የሚረዳ የኤአይ ረዳት ነው።',
  'error.title': 'የሆነ ችግር ተፈጥሯል!',
  'error.generic': 'የሆነ ችግር ተፈጥሯል!',
  'billing.redirecting': 'በመምራት ላይ...',
  'billing.opening': 'በመክፈት ላይ...',
  'billing.updating': 'በመዘመን ላይ...',
  'billing.working': 'በመስራት ላይ...',
  'billing.loginToUpgrade': 'ፕላን ለማሻሻል እባክዎ ይግቡ።',
  'billing.checkoutFail': 'ቼክአውት ማስጀመር አልተሳካም',
  'billing.portalFail': 'የክፍያ ፖርታል መክፈት አልተሳካም',
  'billing.cancelNow': 'ምዝገባውን ወዲያውኑ ለማስቆም?',
  'billing.cancelEnd': 'ምዝገባውን በክፍያ ጊዜ መጨረሻ ላይ ለማስቆም?',
  'billing.subUpdated': 'ምዝገባው በተሳካ ሁኔታ ተዘምኗል።',
  'billing.subUpdateFail': 'ምዝገባውን ማዘመን አልተሳካም',
  'billing.noCheckoutUrl': 'የቼክአውት አድራሻ አልተመለሰም',
  'billing.noPortalUrl': 'የፖርታል አድራሻ አልተመለሰም',
  'tour.close': 'መመሪያን ዝጋ',
  'chat.tabChat': 'ቻት',
  'chat.tabError': 'ስህተት',
  'chat.tabToken': 'የተጠቀሙ ቶከኖች',
  'chat.tabModel': 'የተጠቀሙ ሞዴል',
  'chat.tabRag': 'የ RAG መረጃ',
  'chat.tabUsage': 'የአጠቃቀም ገደብ',
  'chat.tabSubscription': 'ምዝገባ',
  'chat.closePanel': 'ፓነል ዝጋ',
  'chat.tocTitle': 'የይዘት ሰንጠረዥ',
  'chat.docsTitle': 'ሰነዶች',
  'chat.questionsTitle': 'የጥያቄ ጥቆማዎች',
  'chat.ragLangTitle': 'የመልስ ቋንቋ',
  'chat.sidebarNoDoc': 'ሰነድ የለም',
  'chat.tocEmpty': 'የይዘት ሰንጠረዥ ለማየት ሰነድ ይጫኑ',
  'chat.questionsEmpty': 'ሰነዱ ከተቀናበረ በኋላ የጥያቄ ጥቆማዎች እዚህ ይታያሉ።',
  'chat.docsEmpty': 'በዚህ ቡድን ውስጥ እስካሁን ሰነድ የለም',
  'chat.toggleLeft': 'ግራ ፓነል ቀያይር',
  'chat.toggleRight': 'ቀኝ ፓነል ቀያይር',
  'chat.toggleBottom': 'የታች ፓነል ቀያይር',
  'chat.tokenEmpty': 'ከመጀመሪያው RAG ጥያቄ በኋላ ቶከኖች እዚህ ይታያሉ።',
  'chat.modelEmpty': 'የሞዴል መረጃ ከመጀመሪያው RAG ጥያቄ በኋላ እዚህ ይታያል።',
  'chat.ragTabEmpty': 'የ RAG ዝርዝሮች ከመጀመሪያው ጥያቄ በኋላ እዚህ ይታያሉ።',
  'chat.usageEmpty': 'የአጠቃቀም መረጃ እዚህ ይታያል።',
  'chat.subEmpty': 'የምዝገባ ዝርዝሮች እዚህ ይታያሉ።',
  'chat.viewPlans': 'ፕላኖችን ይመልከቱ',
  'chat.errorTabOk': 'ስህተት የለም',
  'chat.processingTimeout': 'የሰነድ ሂደት ብዙ ጊዜ ወሰደ። እባክዎ እንደገና ይሞክሩ።',
  'chat.ragSessionLoadFailed':
    'ይህን ሰነድ መጫን ማጠናቀቅ አልተቻለም። እባክዎ እንደገና ይጫኑት።',
  'chat.processingDocumentTitle': 'ሰነድዎ በመዘጋጀት ላይ ነው',
  'chat.processingDocumentHint':
    'ጽሑፍ በመውጣት፣ የይዘት ሰንጠረዥ በመገንባት እና ለጥያቄዎች በመጠቆም ላይ ነው። ይህ ብዙ ጊዜ ጥቂት ሰከንዶች ይወስዳል።',
  'chat.loadingOutline': 'ለ{{title}} የዝርዝር መዋቅር በመጫን ላይ...',
  'chat.tocGateTitle': 'የይዘት ሰንጠረዥ ዝግጁ ነው',
  'chat.tocGateLead':
    'በ{{title}} ውስጥ {{count}} ክፍል{{plural}} አግኝተናል። መዋቅሩን ለማየት ግራ ፓነሉን ይክፈቱ{{extra}}።',
  'chat.tocGateLeadExtra': '፣ ወይም ጥያቄ ለማዘጋጀት አንድ ክፍል ይንኩ',
  'chat.tocGateStep1': 'በጎን አሞሌው ውስጥ ያሉትን ክፍሎች ይመልከቱ',
  'chat.tocGateStep2': 'ጥያቄ ለመጠየቅ ሲዘጋጁ  Start chatting ይንኩ',
  'chat.startChatting': 'ቻት ይጀምሩ',
  'chat.tocGateNote': 'የ RAG መልሶች ሌላ ፋይል እስኪጫኑ ድረስ በዚህ ሰነድ ላይ ብቻ ይመሰረታሉ።',
  'chat.readyIntro': 'ስለ {{name}} ጥያቄዎችን ለመመለስ ዝግጁ ነኝ። ምን ማወቅ ይፈልጋሉ?',
  'chat.noTocAvailable': 'የይዘት ሰንጠረዥ አልተገኘም',
  'chat.processingShort': 'በመቀናበር ላይ',
  'chat.reviewOutline': 'መዋቅሩን በግራ ፓነል ይመልከቱ፣ ከዚያ Start chatting ይንኩ።',
  'chat.extractingOutline': 'ጽሑፍ እና የይዘት ሰንጠረዥ በመውጣት ላይ...',
  'chat.pageLabel': 'ገጽ {{page}}',
  'chat.questionListHint': 'ጥያቄውን ወደ መጻፊያ ለማምጣት ማንኛውንም ጥቆማ ይንኩ።',
  'common.unlimited': 'ያልተገደበ',
  'common.yes': 'አዎ',
  'common.no': 'አይ',
  'account.choosePhoto': 'አዲስ ፎቶ ይምረጡ',
  'account.editProfile': 'ፕሮፋይል አርትዕ',
  'account.admin': 'አስተዳዳሪ',
  'account.manageUsers': 'ተጠቃሚዎችን ያቀናብሩ',
  'account.manageReviews': 'ግምገማዎችን ያቀናብሩ',
  'account.openWorkspace': 'የስራ ቦታን ክፈት',
  'account.reviewColumn': 'ግምገማ',
  'account.manageBilling': 'ክፍያን ያቀናብሩ',
  'account.upgradePremium': 'ወደ ፕሪሚየም አሻሽል',
  'account.upgradeEnterprise': 'ወደ ኢንተርፕራይዝ አሻሽል',
  'account.loginToViewSubscription': 'ምዝገባዎን ለማየት እባክዎ ይግቡ።',
  'account.cancelAtPeriodEnd': 'በጊዜ መጨረሻ ላይ ሰርዝ',
  'account.cancellationScheduled':
    'ስረዛው በአሁኑ የክፍያ ጊዜዎ መጨረሻ ላይ ተያይዟል።',
  'account.openBillingPortal': 'የክፍያ ፖርታል ክፈት',
  'account.loginToViewBilling': 'የክፍያ መረጃዎን ለማየት እባክዎ ይግቡ።',
  'pricing.openWorkspace': 'የስራ ቦታን ክፈት',
  'auth.placeholderName': 'ስምዎን ያስገቡ',
  'auth.placeholderEmail': 'ኢሜይልዎን ያስገቡ',
  'auth.placeholderPassword': 'የይለፍ ቃልዎን ያስገቡ',
  'auth.placeholderEmailShort': 'you@example.com',
  'auth.resetTitle': 'አዲስ የይለፍ ቃል ያዘጋጁ',
  'auth.resetHint': 'ቢያንስ 8 ቁምፊዎች ያሉትን የይለፍ ቃል ይምረጡ።',
  'auth.updatePassword': 'የይለፍ ቃል አዘምን',
  'auth.resetErrorExpired': 'የይለፍ ቃሉን መቀየር አልተቻለም። አገናኙ ጊዜው አልፎ ሊሆን ይችላል።',
  'auth.resetErrorGeneric': 'የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
  'overview.delivered': 'ፋይሎች ባለፈው ዓመት ተቀናብረዋል!',
  'overview.testimonial1.quote':
    'SentReader ለምርምሬ ትልቅ ለውጥ አመጣ። ረጅም PDF እና ሪፖርቶችን እጭናለሁ፣ እሱም በግልጽ ሁኔታ ያጠቃልላቸዋል እና የተለዩ ጥያቄዎችን እንድጠይቅ ያደርገኛል። በየሳምንቱ ሰዓታትን ያድነኛል።',
  'overview.testimonial2.quote':
    'እንደ በጣም ተጠማሚ ባለሙያ፣ SentReader የሰነድ ግምገማን ቀላል ማድረጉን እወዳለሁ። የ AI ቻቱ ቀላል ነው፣ መልሶቹ ከፋይሉ ጋር የተያያዙ ናቸው፣ ማጠቃለያዎቹም ትክክለኛ ናቸው።',
  'overview.testimonial3.quote':
    'ይህ መሳሪያ ምርታማነቴን ጨምሯል። ከብዙ ፋይሎች ጋር በአንድ ጊዜ መወያየት እና ከውስብስብ ሪፖርቶች ፈጣን ግንዛቤ ማግኘት በጣም ይረዳል።',
  'overview.testimonial4.quote':
    'መጀመሪያ ተጠራጣሪ ነበርሁ፣ ግን SentReader ከጠበቅሁት በላይ ሆኗል። ፈጣን ጭነት፣ ትክክለኛ ማጠቃለያዎች እና ጠቃሚ መልሶች በዕለታዊ ስራዬ አካል አድርገውታል።',
  'overview.form.optionFriends': 'ጓደኞች እና ቤተሰብ',
  'overview.form.optionYoutube': 'የYouTube ቪዲዮ',
  'overview.form.optionPodcast': 'ፖድካስት',
  'overview.form.optionAd': 'የFacebook ማስታወቂያ',
  'overview.form.optionOthers': 'ሌሎች',
  'overview.tasks': 'ተግባራት',
  'overview.testimonials': 'የምስክርነት ቃሎች',
  'overview.seeAllFeatures': 'ሁሉንም ባህሪያት ይመልከቱ',
  'services.ratingLabel': 'ደረጃ',
  'services.galleryAlt': 'የMyReader የሰነድ ጋለሪ ቅድመ እይታ',
  'dashboard.showingLatestReviews': 'የቅርብ ጊዜ {{count}} ግምገማዎችን በማሳየት ላይ',
  'dashboard.showingLatestChats': 'የቅርብ ጊዜ {{count}} ቻቶችን በማሳየት ላይ',
  'dashboard.documentsByType': 'ሰነዶች በአይነት',
  'dashboard.usersByTier': 'ተጠቃሚዎች በደረጃ',
  'dashboard.noDocumentsUploaded': 'እስካሁን ምንም ሰነድ አልተጫነም።',
  'sentbot.open': 'Sentbot ክፈት',
  'sentbot.close': 'Sentbot ዝጋ',
};

const LOCALIZED_COPY = {
  en: { ...bundle.en, ...EXTRA_EN },
  am: { ...bundle.am, ...EXTRA_AM },
};

const LANGUAGE_META = {
  en: {
    code: 'en',
    nativeName: 'English',
    promptInstruction: 'Respond in clear English.',
  },
  am: {
    code: 'am',
    nativeName: 'አማርኛ',
    promptInstruction:
      'Respond in natural Amharic using Ethiopic script. Keep product names, plan names, file names, and technical terms like RAG, PDF, Chat, Dashboard, SentReader as-is when that is clearer.',
  },
};

function normalizeLanguage(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('am')) return 'am';
  return 'en';
}

function packForLanguage(language) {
  const lang = normalizeLanguage(language);
  if (lang === 'am') return LOCALIZED_COPY.am;
  return LOCALIZED_COPY.en;
}

function interpolate(template, replacements = {}) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    String(template || ''),
  );
}

function getLocalizedCopy(language, key, replacements = {}) {
  const pack = packForLanguage(language);
  const template = pack[key] || LOCALIZED_COPY.en[key] || key;
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
  const lang = normalizeLanguage(language);
  const meta = LANGUAGE_META[lang] || LANGUAGE_META.en;
  return meta.promptInstruction;
}

function getClientI18nMaps() {
  return {
    en: LOCALIZED_COPY.en,
    am: LOCALIZED_COPY.am,
  };
}

module.exports = {
  getAnswerLanguageInstruction,
  getClientI18nMaps,
  getLocalizedCopy,
  getRequestLanguage,
  normalizeLanguage,
  LANGUAGE_META,
  LOCALIZED_COPY,
};
