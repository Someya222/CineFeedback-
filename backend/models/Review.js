const mongoose = require('mongoose');
const { Schema } = mongoose;
const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  sentiment: {
    label: { type: String, enum: ['positive', 'neutral', 'negative'], required: true },
    score: { type: Number, required: true },
  },
  aspects: [String],
  mismatch: { type: Boolean, default: false },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  hidden: { type: Boolean, default: false },
  reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  ticket: {
    status: { type: String, enum: ['None', 'Open', 'In progress', 'Resolved'], default: 'None' },
    reply: { type: String, default: '' },
  },
}, { timestamps: true });
reviewSchema.index({ user: 1, movie: 1 }, { unique: true });
module.exports = mongoose.model('Review', reviewSchema);
