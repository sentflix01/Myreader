const User = require('../model/userModel');
const Review = require('../model/reviewModel');
const Document = require('../model/documentsModel');
const Chat = require('../model/chatsModel');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = (req, res) => {
  res.status(200).render('overview', {
    title: 'Overview',
  });
};

exports.getHero = (req, res) => {
  res.status(200).render('hero', {
    title: 'Product',
  });
};

exports.getDashbord = catchAsync(async (req, res, next) => {
  // Fetch latest reviews plus platform-wide stats
  const [reviews, documentsByType, usersByTier, engagementByModel, dashboardUsers] =
    await Promise.all([
      Review.find()
        .populate('user', 'name photo')
        .populate('chat', 'title')
        .populate('document', 'originalFileName')
        .sort('-createdAt')
        .limit(10),
      Document.aggregate([
        {
          $group: {
            _id: '$fileType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$subscriptionTier',
            count: { $sum: 1 },
          },
        },
      ]),
      Chat.aggregate([
        {
          $group: {
            _id: '$aiModel',
            users: { $addToSet: '$user' },
          },
        },
      ]),
      User.find()
        .select(
          'name email photo subscriptionTier subscriptionStatus documentsUploadedCount totalChatMessages lastActiveAt',
        )
        .sort('-createdAt')
        .limit(50),
    ]);

  const totalDocuments = documentsByType.reduce(
    (sum, doc) => sum + (doc.count || 0),
    0,
  );

  const usersByTierMap = usersByTier.reduce((acc, tier) => {
    acc[tier._id || 'unknown'] = tier.count;
    return acc;
  }, {});

  const engagementModels = engagementByModel.map((m) => ({
    model: m._id || 'unknown',
    userCount: Array.isArray(m.users) ? m.users.length : 0,
  }));

  const findModelCount = (key) =>
    engagementModels.find((m) => m.model === key)?.userCount || 0;

  const engagementSummary = {
    chatpdfUsers: findModelCount('chatpdf'),
    sentbotUsers: findModelCount('sentbot'),
    aiGenerationUsers: engagementModels.reduce((sum, m) => {
      if (m.model === 'chatpdf' || m.model === 'sentbot') return sum;
      return sum + m.userCount;
    }, 0),
  };

  res.status(200).render('dashboard', {
    title: 'Your Dashboard',
    reviews,
    totalDocuments,
    documentsByType,
    usersByTier: usersByTierMap,
    engagementSummary,
    dashboardUsers,
  });
});

exports.getChat = (req, res) => {
  res.status(200).render('chat', {
    title: 'Chat',
  });
};

exports.getPricing = (req, res) => {
  res.status(200).render('pricing', {
    title: 'Price',
  });
};

exports.getServices = catchAsync(async (req, res, next) => {
  // Fetch latest 6 reviews with user, chat, document populated
  const reviews = await Review.find()
    .populate('user', 'name photo')
    .populate('chat', 'title') // Get chat title
    .populate('document', 'originalFileName') // Get document filename
    .sort('-createdAt')
    .limit(4);

  res.status(200).render('services', {
    title: 'Our Services – User Reviews',
    reviews,
  });
});

exports.getFeaures = (req, res) => {
  res.status(200).render('feaures', {
    title: 'Feaures',
  });
};

exports.getContacts = (req, res) => {
  res.status(200).render('contacts', {
    title: 'Contacts',
  });
};

exports.getLogin = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getSignup = (req, res) => {
  res.status(200).render('signup', {
    title: 'Signup',
  });
};

exports.getEditProfile = (req, res) => {
  res.status(200).render('account', {
    title: 'EditProfile',
  });
};

exports.getSuccess = (req, res) => {
  res.status(200).render('success', {
    title: 'Success',
  });
};
exports.getSentbot = (req, res) => {
  res.status(200).render('sentbot', {
    title: 'Sentbot',
  });
};

// exports.getAccount = (req, res) => {
//   res.status(200).render('account', {
//     title: 'Your account',
//   });
// };

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
