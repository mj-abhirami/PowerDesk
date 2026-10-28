const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema({
  consumerId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  meterNumber: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Consumer', consumerSchema);
