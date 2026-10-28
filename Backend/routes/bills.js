const { authenticateToken, requireRole } = require('../middleware/auth');
const express = require('express');
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Consumer = require('../models/Consumer');
const router = express.Router();
// Only authenticated admins can manage bills.
router.use(authenticateToken, requireRole('admin'));

const TARIFF_PER_UNIT = 5;

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (['Pending', 'Paid'].includes(req.query.status)) filter.status = req.query.status;
    const bills = await Bill.find(filter).populate('consumer').sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { consumerId, unitsConsumed, billingMonth } = req.body;
    if (!mongoose.isValidObjectId(consumerId)) return res.status(400).json({ message: 'Select a valid consumer.' });
    const units = Number(unitsConsumed);
    if (!Number.isFinite(units) || units < 0) return res.status(400).json({ message: 'Units consumed must be zero or more.' });
    if (typeof billingMonth !== 'string' || !billingMonth.trim()) return res.status(400).json({ message: 'Billing month is required.' });
    const consumer = await Consumer.findById(consumerId);
    if (!consumer) return res.status(404).json({ message: 'Consumer not found.' });
    const amount = Number((units * TARIFF_PER_UNIT).toFixed(2));
    const bill = await Bill.create({ consumer: consumer._id, unitsConsumed: units, tariffPerUnit: TARIFF_PER_UNIT, amount, billingMonth: billingMonth.trim() });
    res.status(201).json(await bill.populate('consumer'));
  } catch (error) { next(error); }
});

router.patch('/:id/pay', async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status: 'Paid', paidAt: new Date() },
      { new: true, runValidators: true }
    ).populate('consumer');
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    res.json(bill);
  } catch (error) { next(error); }
});

module.exports = router;
