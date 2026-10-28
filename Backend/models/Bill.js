const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
  unitsConsumed: { type: Number, required: true, min: 0 },
  tariffPerUnit: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  billingMonth: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
