export const WAKE_EVENT = 'joineazy:wake_state_change';

let activeRequests = 0;
let wakeTimer = null;

function setWakeBannerState(isWaking) {
  window.dispatchEvent(new CustomEvent(WAKE_EVENT, { detail: { isWaking } }));
}

function requestStarted() {
  activeRequests++;
  if (activeRequests === 1 && !wakeTimer) {
    wakeTimer = setTimeout(() => {
      if (activeRequests > 0) {
        setWakeBannerState(true);
      }
    }, 3000); // Trigger after 3 seconds
  }
}

function requestEnded() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    if (wakeTimer) {
      clearTimeout(wakeTimer);
      wakeTimer = null;
    }
    setWakeBannerState(false);
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function apiClient(endpoint, options = {}) {
  const token = localStorage.getItem('joineazy_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  requestStarted();
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized (session expired or invalid)
    if (res.status === 401) {
      localStorage.removeItem('joineazy_token');
      localStorage.removeItem('joineazy_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    let data = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const errorMessage = data && typeof data === 'object' && data.error
        ? data.error
        : `Request failed with status ${res.status}`;
      const err = new Error(errorMessage);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    requestEnded();
  }
}

export const api = {
  get: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    apiClient(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options = {}) =>
    apiClient(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' }),
};
