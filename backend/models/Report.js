const mongoose = require('mongoose');

const SentenceSchema = new mongoose.Schema({
  text: { type: String, required: true },
  plagiarized: { type: Boolean, required: true },
  similarity: { type: Number, default: null },
  source: { type: String, default: null },
  source_text: { type: String, default: null }
});

const SourceSchema = new mongoose.Schema({
  source: { type: String, required: true },
  match_count: { type: Number, required: true },
  percentage: { type: Number, required: true }
});

const ReportSchema = new mongoose.Schema({
  result_id: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  similarity: { type: Number, required: true },
  unique_percentage: { type: Number, required: true },
  matched_file: { type: String, default: null },
  status: { type: String, required: true },
  word_count: { type: Number, required: true },
  char_count: { type: Number, required: true },
  sentences: [SentenceSchema],
  all_sources: [SourceSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
