const express = require('express');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every consumer-management route requires an admin login.
router.use(authenticateToken, requireRole('admin'));

// GET /api/consumers?search=...
router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    const filter = search ? {
      $or: [
        { consumerId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ],
    } : {};
    res.json(await Consumer.find(filter).sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer) return res.status(404).json({ message: 'Consumer not found.' });
    res.json(consumer);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { consumerId, name, address, meterNumber } = req.body;
    if (![consumerId, name, address, meterNumber].every(v => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ message: 'Consumer ID, name, address, and meter number are required.' });
    }
    const consumer = await Consumer.create({ consumerId, name, address, meterNumber });
    res.status(201).json(consumer);
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { consumerId, name, address, meterNumber } = req.body;
    if (![consumerId, name, address, meterNumber].every(v => typeof v === 'string' && v.trim())) {
      return res.status(400).json({ message: 'All consumer fields are required.' });
    }
    const consumer = await Consumer.findByIdAndUpdate(
      req.params.id,
      { consumerId, name, address, meterNumber },
      { new: true, runValidators: true }
    );
    if (!consumer) return res.status(404).json({ message: 'Consumer not found.' });
    res.json(consumer);
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const hasBills = await Bill.exists({ consumer: req.params.id });
    if (hasBills) return res.status(409).json({ message: 'This consumer has bills. Keep the record to preserve billing history.' });
    const consumer = await Consumer.findByIdAndDelete(req.params.id);
    if (!consumer) return res.status(404).json({ message: 'Consumer not found.' });
    res.json({ message: 'Consumer deleted successfully.' });
  } catch (error) { next(error); }
});

module.exports = router;
