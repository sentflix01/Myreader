const mongoose = require('mongoose');

const stripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String },
    payload: { type: Object },
  },
  { timestamps: true },
);

module.exports = mongoose.model('StripeEvent', stripeEventSchema);
