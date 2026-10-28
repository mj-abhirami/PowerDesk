# Electricity Bill Management System

A beginner-friendly MERN stack project using React + Bootstrap, Node.js, Express, MongoDB, and Mongoose.

## Features
- Add, view, search, edit, and delete consumers
- Generate bills from units consumed
- Record payments by marking bills as paid
- Track pending bills and outstanding amounts
- Dashboard summaries

## Requirements
- Node.js LTS
- MongoDB Community Server running locally OR a MongoDB Atlas connection string

## 1. Start the backend
Open a terminal in `backend`:

```bash
npm install
```

Copy `.env.example` to `.env` and set `MONGODB_URI`. For local MongoDB, the default is:
`mongodb://127.0.0.1:27017/electricity_bill_management`

Then run:

```bash
npm run dev
```

The API runs at `http://localhost:5000`.

## 2. Start the frontend
Open a second terminal in `frontend`:

```bash
npm install
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`.

## Sample tariff
The app uses a simple demonstration tariff of ₹5 per unit. This is an academic example, not an official electricity tariff. You can change `TARIFF_PER_UNIT` in `backend/routes/bills.js`.

## API routes
- `GET /api/consumers` — list/search consumers (`?search=`)
- `POST /api/consumers` — create consumer
- `GET /api/consumers/:id` — get one consumer
- `PUT /api/consumers/:id` — update consumer
- `DELETE /api/consumers/:id` — delete consumer (only if no bills exist)
- `GET /api/bills` — list bills (`?status=Pending` or `?status=Paid`)
- `POST /api/bills` — generate a bill
- `PATCH /api/bills/:id/pay` — record payment / mark paid
- `GET /api/dashboard` — summary figures

## Notes
This is a learning project. It does not integrate a real payment gateway, authenticate users, or apply official state-specific tariff slabs. Add authentication and stronger security before any real-world use.
