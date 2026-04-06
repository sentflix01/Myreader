const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Document = require('../models/documentsModel');
const Chat = require('../models/chatsModel');
const catchAsync = require('../utils/catchAsync');

const buildPublicServiceReviews = (reviews = []) =>
  reviews.map((review, index) => {
    const plainReview = review?.toObject ? review.toObject() : review;
    return {
      ...plainReview,
      user: {
        name: `Verified reader ${index + 1}`,
        photo: 'default.jpg',
      },
    };
  });

exports.getOverview = (req, res) => {
  res.status(200).render('overview', {
    title: 'Overview',
  });
};

exports.getHero = (req, res) => {
  res.status(200).render('overview', {
    title: 'Product',
  });
};

exports.getDashboard = async (req, res, next) => {
  try {
    const user = res.locals.user; // from isLoggedIn middleware
    let reviews = [];
    let totalDocuments, documentsByType, usersByTier, publicStats;
    let myDocumentsCount, myChatsCount, myReviewsCount;
    let recentDocuments, recentChats;

    // If user is logged in, get their per-user stats and recent activity
    if (user) {
      reviews = await Review.find({ user: user.id })
        .populate('user', 'name')
        .populate('document', 'originalFileName')
        .populate('chat', 'title')
        .sort('-createdAt')
        .limit(10);

      myDocumentsCount = await Document.countDocuments({ user: user.id });
      myChatsCount = await Chat.countDocuments({ user: user.id });
      myReviewsCount = await Review.countDocuments({ user: user.id });

      recentDocuments = await Document.find({ user: user.id })
        .sort('-createdAt')
        .limit(5);
      recentChats = await Chat.find({ user: user.id }).sort('-createdAt').limit(5);
    }

    // Aggregated stats (always needed for public and admin)
    totalDocuments = await Document.countDocuments();
    documentsByType = await Document.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
    ]);

    // User counts by subscription tier – adjust field names as per your schema
    const freeCount = await User.countDocuments({ subscriptionTier: 'free' });
    const premiumCount = await User.countDocuments({
      subscriptionTier: 'premium',
    });
    const enterpriseCount = await User.countDocuments({
      subscriptionTier: 'enterprise',
    });
    usersByTier = {
      free: freeCount,
      premium: premiumCount,
      enterprise: enterpriseCount,
    };

    publicStats = {
      totalUsers: await User.countDocuments(),
      totalDocuments,
      totalReviews: await Review.countDocuments(),
    };

    res.status(200).render('dashboard', {
      title: 'Dashboard',
      user, // already in res.locals, but explicit pass
      reviews,
      myDocumentsCount,
      myChatsCount,
      myReviewsCount,
      recentDocuments,
      recentChats,
      totalDocuments,
      documentsByType,
      usersByTier,
      publicStats,
    });
  } catch (err) {
    next(err);
  }
};

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
    .populate('chat', 'title') // Get chat title
    .populate('document', 'originalFileName') // Get document filename
    .sort('-createdAt')
    .limit(4);

  res.status(200).render('services', {
    title: 'Our Services – User Reviews',
    reviews: buildPublicServiceReviews(reviews),
  });
});

exports.getFeatures = (req, res) => {
  res.status(200).render('features', {
    title: 'Features',
  });
};

exports.getContacts = (req, res) => {
  res.status(200).render('overview', {
    title: 'Contacts',
  });
};

exports.getLogin = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
    next: req.query.next || '',
  });
};

exports.getSignup = (req, res) => {
  res.status(200).render('signup', {
    title: 'Signup',
    next: req.query.next || '',
  });
};

exports.getEditProfile = catchAsync(async (req, res, next) => {
  const user = res.locals.user;

  if (!user) {
    return res.redirect('/login');
  }

  const accountReviews = await Review.find({ user: user.id })
    .populate('document', 'originalFileName')
    .populate('chat', 'title')
    .sort('-createdAt')
    .limit(5);

  res.status(200).render('account', {
    title: 'Account settings',
    user,
    accountReviews,
  });
});

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

exports.__testables = {
  buildPublicServiceReviews,
};
