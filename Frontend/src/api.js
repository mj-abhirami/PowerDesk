
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = sessionStorage.getItem('powerdesk_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem('powerdesk_token');
      sessionStorage.removeItem('powerdesk_user');
    }

    throw new Error(data.message || 'Request failed. Please try again.');
  }

  return data;
}

async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  sessionStorage.setItem('powerdesk_token', data.token);
  sessionStorage.setItem('powerdesk_user', JSON.stringify(data.user));

  return data.user;
}

function logout() {
  sessionStorage.removeItem('powerdesk_token');
  sessionStorage.removeItem('powerdesk_user');
}

export const api = {
  login,
  logout,

  dashboard: () => request('/dashboard'),

  consumers: (search = '') =>
    request(`/consumers${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  createConsumer: data =>
    request('/consumers', { method: 'POST', body: JSON.stringify(data) }),

  updateConsumer: (id, data) =>
    request(`/consumers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteConsumer: id =>
    request(`/consumers/${id}`, { method: 'DELETE' }),

  bills: (status = '') =>
    request(`/bills${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  createBill: data =>
    request('/bills', { method: 'POST', body: JSON.stringify(data) }),

  payBill: id =>
    request(`/bills/${id}/pay`, { method: 'PATCH' }),
};
