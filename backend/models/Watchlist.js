const mongoose = require('mongoose');
const { Schema } = mongoose;
const watchlistSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
}, { timestamps: true });
watchlistSchema.index({ user: 1, movie: 1 }, { unique: true });
module.exports = mongoose.model('Watchlist', watchlistSchema);
