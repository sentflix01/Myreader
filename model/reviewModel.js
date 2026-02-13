// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Chat = require('./chatsModel');
const Document = require('./documentsModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Rating is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    chat: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat',
      required: [true, 'Review must belong to a chat.'],
    },
    document: {
      type: mongoose.Schema.ObjectId,
      ref: 'Document',
      required: [true, 'Review must belong to a document.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Prevent duplicate review for same (chat + document + user)
reviewSchema.index({ chat: 1, document: 1, user: 1 }, { unique: true });

// ✅ Populate user info automatically on find queries
reviewSchema.pre(/^find/, function () {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  // next();
});

// ---------- STATICS: Rating aggregation ----------
reviewSchema.statics.calcChatAverageRatings = async function (chatId) {
  const stats = await this.aggregate([
    { $match: { chat: chatId } },
    {
      $group: {
        _id: '$chat',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Chat.findByIdAndUpdate(chatId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Chat.findByIdAndUpdate(chatId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5, // default when no reviews
    });
  }
};

reviewSchema.statics.calcDocumentAverageRatings = async function (documentId) {
  const stats = await this.aggregate([
    { $match: { document: documentId } },
    {
      $group: {
        _id: '$document',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Document.findByIdAndUpdate(documentId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Document.findByIdAndUpdate(documentId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// ---------- DOCUMENT MIDDLEWARE: after save ----------
reviewSchema.post('save', function () {
  // `this` = current review document
  this.constructor.calcChatAverageRatings(this.chat);
  this.constructor.calcDocumentAverageRatings(this.document);
});

// ---------- QUERY MIDDLEWARE: findOneAndUpdate / findOneAndDelete ----------
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Store the document that will be updated/deleted
  this.reviewDoc = await this.findOne().clone();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // `this.reviewDoc` contains the old review document
  if (this.reviewDoc) {
    await this.reviewDoc.constructor.calcChatAverageRatings(
      this.reviewDoc.chat,
    );
    await this.reviewDoc.constructor.calcDocumentAverageRatings(
      this.reviewDoc.document,
    );
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
