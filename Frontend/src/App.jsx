
import React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from './api';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';

// Initial consumer form values
const emptyConsumer = {
  consumerId: '',
  name: '',
  address: '',
  meterNumber: '',
};

// Format numbers as Indian Rupees
const money = value =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

// Get the current month in YYYY-MM format
const todayMonth = () => new Date().toISOString().slice(0, 7);


// Alert message component
function AlertMessage({
  message,
  type = 'danger',
  clear,
}) {
  if (!message) return null;

  return (
    <div
      className={`alert alert-${type} alert-dismissible`}
      role="alert"
    >
      {message}

      <button
        className="btn-close"
        aria-label="Close"
        onClick={clear}
      />
    </div>
  );
}


// Main application component
export default function App() {
  const [page, setPage] = useState('dashboard');

  // Restore the admin session from sessionStorage
  const [user, setUser] = useState(() => {
    try {
      const token = sessionStorage.getItem('powerdesk_token');
      const savedUser = sessionStorage.getItem('powerdesk_user');

      if (!token || !savedUser) return null;

      const parsedUser = JSON.parse(savedUser);

      return parsedUser.role === 'admin'
        ? parsedUser
        : null;
    } catch {
      return null;
    }
  });

  const [mobileNav, setMobileNav] = useState(false);

  const [dashboard, setDashboard] = useState({
    totalConsumers: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    pendingAmount: 0,
  });

  const [consumers, setConsumers] = useState([]);
  const [bills, setBills] = useState([]);

  const [search, setSearch] = useState('');

  const [consumerForm, setConsumerForm] = useState(
    emptyConsumer
  );

  const [editingId, setEditingId] = useState(null);

  const [billForm, setBillForm] = useState({
    consumerId: '',
    unitsConsumed: '',
    billingMonth: todayMonth(),
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('danger');
  const [loading, setLoading] = useState(false);


  // Display success or error messages
  const showMessage = (text, type = 'danger') => {
    setMessage(text);
    setMessageType(type);
  };


  // Load dashboard statistics
  const loadDashboard = useCallback(async () => {
    setDashboard(await api.dashboard());
  }, []);


  // Load consumers
  const loadConsumers = useCallback(async () => {
    setConsumers(await api.consumers(search));
  }, [search]);


  // Load electricity bills
  const loadBills = useCallback(async () => {
    setBills(await api.bills());
  }, []);


  // Refresh all application data
  const refreshAll = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      await Promise.all([
        loadDashboard(),
        loadConsumers(),
        loadBills(),
      ]);
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    loadDashboard,
    loadConsumers,
    loadBills,
  ]);


  // Load data when the application opens or dependencies change
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Clear notifications whenever the user changes pages.
  useEffect(() => {
    setMessage('');
  }, [page]);

  // Separate pending and paid bills
  const pendingBills = useMemo(
    () => bills.filter(bill => bill.status === 'Pending'),
    [bills]
  );

  const paidBills = useMemo(
    () => bills.filter(bill => bill.status === 'Paid'),
    [bills]
  );


  // Add a new consumer or update an existing consumer
  async function submitConsumer(event) {
    event.preventDefault();

    try {
      if (editingId) {
        await api.updateConsumer(editingId, consumerForm);
      } else {
        await api.createConsumer(consumerForm);
      }

      setConsumerForm(emptyConsumer);
      setEditingId(null);

      showMessage(
        editingId
          ? 'Consumer details updated.'
          : 'Consumer added successfully.',
        'success'
      );

      await refreshAll();
    } catch (error) {
      showMessage(error.message);
    }
  }


  // Load consumer information into the edit form
  function editConsumer(consumer) {
    setConsumerForm({
      consumerId: consumer.consumerId,
      name: consumer.name,
      address: consumer.address,
      meterNumber: consumer.meterNumber,
    });

    setEditingId(consumer._id);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }


  // Delete a consumer
  async function deleteConsumer(consumer) {
    const confirmed = window.confirm(
      `Delete consumer ${consumer.name}? ` +
      'This is only allowed when the consumer has no bills.'
    );

    if (!confirmed) return;

    try {
      await api.deleteConsumer(consumer._id);

      showMessage('Consumer deleted.', 'success');

      await refreshAll();
    } catch (error) {
      showMessage(error.message);
    }
  }


  // Generate an electricity bill
  async function submitBill(event) {
    event.preventDefault();

    try {
      await api.createBill({
        ...billForm,
        unitsConsumed: Number(billForm.unitsConsumed),
      });

      setBillForm({
        consumerId: '',
        unitsConsumed: '',
        billingMonth: todayMonth(),
      });

      showMessage(
        'Electricity bill generated successfully.',
        'success'
      );

      await refreshAll();

      setPage('bills');
    } catch (error) {
      showMessage(error.message);
    }
  }


  // Record payment for a bill
  async function recordPayment(bill) {
    const confirmed = window.confirm(
      `Record payment of ${money(bill.amount)} for ` +
      `${bill.consumer?.name || 'this consumer'}?`
    );

    if (!confirmed) return;

    try {
      await api.payBill(bill._id);

      showMessage(
        'Payment recorded. Bill status is now Paid.',
        'success'
      );

      await refreshAll();
    } catch (error) {
      showMessage(error.message);
    }
  }


  // Admin login
  async function handleLogin(email, password) {
    const loggedInUser = await api.login(email, password);

    if (loggedInUser.role !== 'admin') {
      api.logout();

      throw new Error(
        'The consumer portal will be available in the next step.'
      );
    }

    setUser(loggedInUser);
    setPage('dashboard');
  }


  // Admin logout
  function handleLogout() {
    api.logout();

    setUser(null);
    setPage('dashboard');
    setMobileNav(false);
    setMessage('');
  }


  // Current page title
  const pageTitle = {
    dashboard: 'Dashboard',
    consumers: 'Consumer Management',
    bills: 'Electricity Bills',
    pending: 'Pending Bills',
  }[page];


  // Show login screen when no admin is logged in
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }


  // Main dashboard layout
  return (
    <div className="app-shell">

      <Sidebar
        page={page}
        setPage={setPage}
        open={mobileNav}
        close={() => setMobileNav(false)}
      />

      <main className="main-area">

        {/* Top navigation bar */}
        <header className="topbar">
          <div className="d-flex align-items-center gap-3">

            <button
              className="mobile-menu btn btn-light d-lg-none"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <i className="bi bi-list" />
            </button>

            <div>
              <div className="eyebrow">
                ELECTRICITY BILL MANAGEMENT
              </div>

              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <span className="status-indicator" />

            <span>{user.name || 'Admin'}</span>

            <div className="avatar">
              {(user.name || 'A').charAt(0).toUpperCase()}
            </div>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1" />
              Logout
            </button>
          </div>
        </header>


        {/* Main page content */}
        <div className="page-content">

          <AlertMessage
            message={message}
            type={messageType}
            clear={() => setMessage('')}
          />

          {loading && (
            <div className="small text-secondary mb-3">
              <span className="spinner-border spinner-border-sm me-2" />
              Loading application data…
            </div>
          )}


          {/* DASHBOARD PAGE */}
          {page === 'dashboard' && (
            <>
              <div className="welcome-panel">
                <div>
                  <div className="welcome-kicker">
                    OVERVIEW
                  </div>

                  <h2>Welcome to PowerDesk</h2>

                  <p>
                    Manage consumers, electricity bills, and payments
                    in one place.
                  </p>
                </div>

                <div className="welcome-art">
                  <i className="bi bi-lightning-charge-fill" />
                </div>
              </div>


              {/* Dashboard statistics */}
              <div className="row g-3 mt-1 mb-4">

                <div className="col-12 col-sm-6 col-xl-3">
                  <StatCard
                    title="Total consumers"
                    value={dashboard.totalConsumers}
                    icon="bi-people"
                    tone="blue"
                    note="Registered consumer records"
                  />
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <StatCard
                    title="Bills generated"
                    value={dashboard.totalBills}
                    icon="bi-receipt"
                    tone="purple"
                    note="All billing records"
                  />
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <StatCard
                    title="Paid bills"
                    value={dashboard.paidBills}
                    icon="bi-check2-circle"
                    tone="green"
                    note="Payments recorded"
                  />
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <StatCard
                    title="Pending amount"
                    value={money(dashboard.pendingAmount)}
                    icon="bi-clock-history"
                    tone="orange"
                    note={`${dashboard.pendingBills} unpaid bill(s)`}
                  />
                </div>

              </div>


              {/* Recent bills and quick actions */}
              <div className="row g-3">

                <div className="col-12 col-xl-7">
                  <section className="content-card h-100">

                    <div className="section-heading">
                      <div>
                        <h3>Recent electricity bills</h3>
                        <p>Latest bills created in the system</p>
                      </div>

                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setPage('bills')}
                      >
                        View all
                        <i className="bi bi-arrow-right ms-1" />
                      </button>
                    </div>

                    <BillTable
                      bills={bills.slice(0, 5)}
                      onPay={recordPayment}
                      compact
                    />

                  </section>
                </div>


                <div className="col-12 col-xl-5">
                  <section className="content-card h-100">

                    <div className="section-heading">
                      <div>
                        <h3>Quick actions</h3>
                        <p>Common tasks</p>
                      </div>
                    </div>

                    <div className="quick-actions">

                      <button
                        onClick={() => {
                          setPage('consumers');
                          setEditingId(null);
                          setConsumerForm(emptyConsumer);
                        }}
                      >
                        <span className="quick-icon blue">
                          <i className="bi bi-person-plus" />
                        </span>

                        <span>
                          <strong>Add a consumer</strong>
                          <small>
                            Register a new electricity connection
                          </small>
                        </span>

                        <i className="bi bi-chevron-right ms-auto" />
                      </button>


                      <button onClick={() => setPage('bills')}>
                        <span className="quick-icon purple">
                          <i className="bi bi-file-earmark-plus" />
                        </span>

                        <span>
                          <strong>Generate a bill</strong>
                          <small>
                            Calculate charges from units consumed
                          </small>
                        </span>

                        <i className="bi bi-chevron-right ms-auto" />
                      </button>


                      <button onClick={() => setPage('pending')}>
                        <span className="quick-icon orange">
                          <i className="bi bi-hourglass-split" />
                        </span>

                        <span>
                          <strong>Track pending bills</strong>
                          <small>
                            Review unpaid balances
                          </small>
                        </span>

                        <i className="bi bi-chevron-right ms-auto" />
                      </button>

                    </div>
                  </section>
                </div>

              </div>
            </>
          )}


          {/* CONSUMER MANAGEMENT PAGE */}
          {page === 'consumers' && (
            <>
              <section className="content-card mb-4">

                <div className="section-heading">
                  <div>
                    <h3>
                      {editingId
                        ? 'Edit consumer details'
                        : 'Add new consumer'}
                    </h3>

                    <p>
                      Enter the consumer's registration and meter
                      information.
                    </p>
                  </div>

                  <span className="pill-label">
                    <i className="bi bi-person-vcard me-1" />
                    Consumer record
                  </span>
                </div>


                <form onSubmit={submitConsumer}>
                  <div className="row g-3">

                    <div className="col-12 col-md-6 col-xl-3">
                      <label className="form-label">
                        Consumer ID *
                      </label>

                      <input
                        className="form-control"
                        value={consumerForm.consumerId}
                        onChange={event =>
                          setConsumerForm({
                            ...consumerForm,
                            consumerId: event.target.value,
                          })
                        }
                        placeholder="e.g. CON1001"
                        required
                      />
                    </div>


                    <div className="col-12 col-md-6 col-xl-3">
                      <label className="form-label">
                        Consumer name *
                      </label>

                      <input
                        className="form-control"
                        value={consumerForm.name}
                        onChange={event =>
                          setConsumerForm({
                            ...consumerForm,
                            name: event.target.value,
                          })
                        }
                        placeholder="Full name"
                        required
                      />
                    </div>


                    <div className="col-12 col-md-6 col-xl-3">
                      <label className="form-label">
                        Meter number *
                      </label>

                      <input
                        className="form-control"
                        value={consumerForm.meterNumber}
                        onChange={event =>
                          setConsumerForm({
                            ...consumerForm,
                            meterNumber: event.target.value,
                          })
                        }
                        placeholder="e.g. MTR5001"
                        required
                      />
                    </div>


                    <div className="col-12 col-md-6 col-xl-3">
                      <label className="form-label">
                        Address *
                      </label>

                      <input
                        className="form-control"
                        value={consumerForm.address}
                        onChange={event =>
                          setConsumerForm({
                            ...consumerForm,
                            address: event.target.value,
                          })
                        }
                        placeholder="Consumer address"
                        required
                      />
                    </div>

                  </div>


                  <div className="d-flex gap-2 mt-4">
                    <button
                      className="btn btn-primary"
                      type="submit"
                    >
                      <i
                        className={`bi ${editingId ? 'bi-check2' : 'bi-plus-lg'
                          } me-2`}
                      />

                      {editingId
                        ? 'Save changes'
                        : 'Add consumer'}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => {
                          setEditingId(null);
                          setConsumerForm(emptyConsumer);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

              </section>


              {/* Registered consumers table */}
              <section className="content-card">

                <div className="section-heading flex-wrap">
                  <div>
                    <h3>Registered consumers</h3>
                    <p>
                      {consumers.length} consumer record(s) shown
                    </p>
                  </div>

                  <div className="search-box">
                    <i className="bi bi-search" />

                    <input
                      aria-label="Search consumers"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search ID or name…"
                    />

                    <button
                      className="btn btn-sm btn-light"
                      onClick={() => setSearch('')}
                    >
                      Clear
                    </button>
                  </div>
                </div>


                <div className="table-responsive">
                  <table className="table align-middle app-table">
                    <thead>
                      <tr>
                        <th>Consumer</th>
                        <th>Consumer ID</th>
                        <th>Meter number</th>
                        <th>Address</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {consumers.map(consumer => (
                        <tr key={consumer._id}>
                          <td>
                            <div className="consumer-cell">
                              <div className="consumer-avatar">
                                {consumer.name?.charAt(0)?.toUpperCase()}
                              </div>

                              <strong>{consumer.name}</strong>
                            </div>
                          </td>

                          <td>
                            <span className="id-text">
                              {consumer.consumerId}
                            </span>
                          </td>

                          <td>{consumer.meterNumber}</td>

                          <td className="address-cell">
                            {consumer.address}
                          </td>

                          <td>
                            <div className="d-flex justify-content-end gap-1">

                              <button
                                className="icon-btn"
                                title="Edit consumer"
                                onClick={() => editConsumer(consumer)}
                              >
                                <i className="bi bi-pencil-square" />
                              </button>

                              <button
                                className="icon-btn danger"
                                title="Delete consumer"
                                onClick={() => deleteConsumer(consumer)}
                              >
                                <i className="bi bi-trash3" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))}

                      {consumers.length === 0 && (
                        <EmptyRow
                          colSpan={5}
                          text="No consumers found. Add a consumer using the form above."
                        />
                      )}
                    </tbody>
                  </table>
                </div>

              </section>
            </>
          )}


          {/* ELECTRICITY BILLS PAGE */}
          {page === 'bills' && (
            <>
              <section className="content-card mb-4">

                <div className="section-heading">
                  <div>
                    <h3>Generate electricity bill</h3>
                    <p>
                      Select a consumer and enter the units used for
                      the billing month.
                    </p>
                  </div>

                  <span className="pill-label">
                    <i className="bi bi-calculator me-1" />
                    Demo tariff: ₹5/unit
                  </span>
                </div>


                <form onSubmit={submitBill}>
                  <div className="row g-3 align-items-end">

                    <div className="col-12 col-md-5">
                      <label className="form-label">
                        Consumer *
                      </label>

                      <select
                        className="form-select"
                        value={billForm.consumerId}
                        onChange={event =>
                          setBillForm({
                            ...billForm,
                            consumerId: event.target.value,
                          })
                        }
                        required
                      >
                        <option value="">
                          Choose a consumer
                        </option>

                        {consumers.map(consumer => (
                          <option
                            key={consumer._id}
                            value={consumer._id}
                          >
                            {consumer.consumerId} — {consumer.name}
                          </option>
                        ))}
                      </select>
                    </div>


                    <div className="col-12 col-md-3">
                      <label className="form-label">
                        Billing month *
                      </label>

                      <input
                        className="form-control"
                        type="month"
                        value={billForm.billingMonth}
                        onChange={event =>
                          setBillForm({
                            ...billForm,
                            billingMonth: event.target.value,
                          })
                        }
                        required
                      />
                    </div>


                    <div className="col-12 col-md-2">
                      <label className="form-label">
                        Units consumed *
                      </label>

                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={billForm.unitsConsumed}
                        onChange={event =>
                          setBillForm({
                            ...billForm,
                            unitsConsumed: event.target.value,
                          })
                        }
                        placeholder="e.g. 150"
                        required
                      />
                    </div>


                    <div className="col-12 col-md-2">
                      <button
                        className="btn btn-primary w-100"
                        type="submit"
                        disabled={!consumers.length}
                      >
                        <i className="bi bi-file-earmark-plus me-1" />
                        Generate
                      </button>
                    </div>

                  </div>


                  {/* Estimated bill preview */}
                  <div className="bill-preview mt-3">
                    <i className="bi bi-lightning-charge-fill" />

                    <span>Estimated bill amount</span>

                    <strong>
                      {money(
                        (Number(billForm.unitsConsumed) || 0) * 5
                      )}
                    </strong>

                    <small>
                      Units × ₹5 per unit. Demonstration tariff only.
                    </small>
                  </div>
                </form>

              </section>


              {/* All electricity bills */}
              <section className="content-card">

                <div className="section-heading">
                  <div>
                    <h3>All electricity bills</h3>
                    <p>
                      View bill amounts and record payments.
                    </p>
                  </div>

                  <span className="pill-label">
                    {bills.length} bill(s)
                  </span>
                </div>

                <BillTable
                  bills={bills}
                  onPay={recordPayment}
                />

              </section>
            </>
          )}

          {/* PENDING BILLS PAGE */}
          {page === 'pending' && (
            <>
              <div className="pending-banner">
                <div className="pending-banner-icon">
                  <i className="bi bi-hourglass-split" />
                </div>

                <div>
                  <span>OUTSTANDING BALANCE</span>

                  <h2>{money(dashboard.pendingAmount)}</h2>

                  <p>
                    {pendingBills.length} bill(s) currently awaiting payment
                  </p>
                </div>
              </div>

              <section className="content-card mt-4">

                <div className="section-heading">
                  <div>
                    <h3>Pending electricity bills</h3>
                    <p>
                      Record payment when the consumer has paid the amount.
                    </p>
                  </div>

                  <span className="status-badge pending">
                    Pending
                  </span>
                </div>

                <BillTable
                  bills={pendingBills}
                  onPay={recordPayment}
                />

              </section>
            </>
          )}

          {/* Footer */}
          <footer className="app-footer">
            <span>Electricity Bill Management System</span>
            <span>Built with React · Express · MongoDB</span>
          </footer>

        </div>
      </main>
    </div>
  );
}

// Empty table row component
function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-state">
        <i className="bi bi-inbox" />
        <span>{text}</span>
      </td>
    </tr>
  );
}

// Reusable electricity bill table
function BillTable({
  bills,
  onPay,
  compact = false,
}) {
  return (
    <div className="table-responsive">
      <table className="table align-middle app-table">

        <thead>
          <tr>
            <th>Consumer</th>
            <th>Billing month</th>
            <th>Units</th>
            <th>Amount</th>
            <th>Status</th>

            {!compact && (
              <th className="text-end">Action</th>
            )}
          </tr>
        </thead>

        <tbody>
          {bills.map(bill => (
            <tr key={bill._id}>
              <td>
                <div className="bill-consumer">
                  <strong>
                    {bill.consumer?.name || 'Consumer deleted'}
                  </strong>

                  <small>
                    {bill.consumer?.consumerId || '—'}
                  </small>
                </div>
              </td>

              <td>{bill.billingMonth}</td>

              <td>{bill.unitsConsumed}</td>

              <td className="amount-text">
                {money(bill.amount)}
              </td>

              <td>
                <span
                  className={`status-badge ${bill.status === 'Paid' ? 'paid' : 'pending'
                    }`}
                >
                  <span />
                  {bill.status}
                </span>
              </td>

              {!compact && (
                <td className="text-end">
                  {bill.status === 'Pending' ? (
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => onPay(bill)}
                    >
                      <i className="bi bi-check2-circle me-1" />
                      Record payment
                    </button>
                  ) : (
                    <span className="paid-date">
                      {bill.paidAt
                        ? new Date(bill.paidAt).toLocaleDateString('en-IN')
                        : 'Recorded'}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}

          {bills.length === 0 && (
            <EmptyRow
              colSpan={compact ? 5 : 6}
              text="No bills to display yet. Generate a bill to get started."
            />
          )}
        </tbody>

      </table>
    </div>
  );
}

// Admin login screen
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Submit login credentials
  async function submit(event) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Unable to log in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">

      <div
        className="card border-0 shadow-sm p-4 p-md-5 w-100"
        style={{ maxWidth: 440 }}
      >

        {/* Login branding */}
        <div className="text-center mb-4">
          <div className="display-5 text-primary mb-2">
            <i className="bi bi-lightning-charge-fill" />
          </div>

          <h1 className="h3 fw-bold">
            PowerDesk
          </h1>

          <p className="text-secondary mb-0">
            Electricity Bill Management System
          </p>
        </div>

        <h2 className="h5 mb-1">
          Admin login
        </h2>

        <p className="text-secondary small mb-4">
          Sign in to manage consumers, bills, and payments.
        </p>

        {/* Login error message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={submit}>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="login-email"
            >
              Email address
            </label>

            <input
              id="login-email"
              className="form-control"
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="form-label"
              htmlFor="login-password"
            >
              Password
            </label>

            <input
              id="login-password"
              className="form-control"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            className="btn btn-primary w-100 py-2"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

        </form>

        <p className="text-secondary small text-center mt-4 mb-0">
          Authorized administrators only
        </p>

      </div>
    </div>
  );
}
