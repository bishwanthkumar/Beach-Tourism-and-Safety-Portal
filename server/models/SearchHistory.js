import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  query: { type: String, required: true, trim: true, index: true },
  beachId: { type: String, default: null, index: true },
  beachName: { type: String, required: true, trim: true },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  coordinates: {
    lat: Number,
    lng: Number
  },
  image: { type: String, default: null },
  searchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

searchHistorySchema.index({ query: 1, beachId: 1 }, { unique: true });

export default mongoose.model('SearchHistory', searchHistorySchema);
