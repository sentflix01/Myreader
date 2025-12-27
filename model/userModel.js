const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');

// name, email photo password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
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
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please', 'Please confirm your password'],
    validate: {
      // this only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password; // abc === abc
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
