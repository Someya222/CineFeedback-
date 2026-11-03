const mongoose = require('mongoose');
const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  genre: { type: String, required: true, trim: true },
  language: { type: String, default: 'Hindi', trim: true },
  year: { type: Number },
  director: { type: String, trim: true },
  cast: [String],
  poster: { type: String, default: '' },
  synopsis: { type: String, default: '', maxlength: 1500 },
}, { timestamps: true });
module.exports = mongoose.model('Movie', movieSchema);
