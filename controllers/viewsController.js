const User = require('../model/userModel');
const Review = require('../model/reviewModel');
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

exports.getDashbord = async (req, res, next) => {
  // 1) Fetch all reviews (or only those relevant to the logged-in user)

  // 2) Render the dashboard with reviews
  res.status(200).render('dashboard', {
    title: 'Your Dashboard',
    reviews,
  });
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
    title: 'Success',
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
