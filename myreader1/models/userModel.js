const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    role: {
      type: String,
      enum: ['Admin', 'User'],
      default: 'User',
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending'],
      default: 'active',
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    verificationToken: String,
    // emailVerificationToken: String,
    // emailVerificationTokenExpires: Date,
    // emailVerified: {
    //   type: Boolean,
    //   default: false,
    // },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ar', 'am', 'fr'],
      default: 'en',
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    subscriptionId: mongoose.Schema.ObjectId,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePriceId: String,
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    billingProvider: {
      type: String,
      enum: ['direct', 'stripe', 'manual'],
      default: 'direct',
    },
    subscriptionUpdatedAt: Date,
    trialEndsAt: Date,
    currentPeriodEnd: Date,
    storageLimit: {
      type: Number,
      default: 1024 * 1024 * 1024, // 1GB
    },
    defaultModel: {
      type: String,
      enum: ['gpt-4', 'claude-3'],
      default: 'gpt-4',
    },
    documentsUploadedCount: {
      type: Number,
      default: 0,
    },
    totalQueriesAsked: {
      type: Number,
      default: 0,
    },
    totalChatMessages: {
      type: Number,
      default: 0,
    },
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    dailyUsage: {
      windowStartedAt: {
        type: Date,
        default: Date.now,
      },
      uploads: {
        type: Number,
        default: 0,
      },
      queries: {
        type: Number,
        default: 0,
      },
      messages: {
        type: Number,
        default: 0,
      },
      chatSessions: {
        type: Number,
        default: 0,
      },
      tokensUsed: {
        type: Number,
        default: 0,
      },
    },
    lastActiveAt: Date,
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return;

  try {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw error;
  }
});

userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;
  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return changedTimestamp > JWTTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// userSchema.methods.createEmailVerifyToken = function () {
//   const verificationToken = crypto.randomBytes(32).toString('hex');

//   this.emailVerificationToken = crypto
//     .createHash('sha256')
//     .update(verificationToken)
//     .digest('hex');
//   this.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

//   return verificationToken;
// };

module.exports = mongoose.model('User', userSchema);
