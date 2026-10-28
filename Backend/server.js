require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Consumer = require('./models/Consumer');
const Bill = require('./models/Bill');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Electricity Bill API is running.' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/consumers', require('./routes/consumers'));
app.use('/api/bills', require('./routes/bills'));

app.get('/api/dashboard', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const [totalConsumers, totalBills, paidBills, pendingBills, pendingAmount] = await Promise.all([
      Consumer.countDocuments(),
      Bill.countDocuments(),
      Bill.countDocuments({ status: 'Paid' }),
      Bill.countDocuments({ status: 'Pending' }),
      Bill.aggregate([{ $match: { status: 'Pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({ totalConsumers, totalBills, paidBills, pendingBills, pendingAmount: pendingAmount[0]?.total || 0 });
  } catch (error) { next(error); }
});

// Central error handler: returns readable messages for the frontend.
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ message: 'Consumer ID or meter number already exists.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid record ID.' });
  res.status(500).json({ message: 'Server error. Check the backend terminal and database connection.' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/electricity_bill_management')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
