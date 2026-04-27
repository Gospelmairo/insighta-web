'use strict';

const express      = require('express');
const cookieParser = require('cookie-parser');
const axios        = require('axios');
const { v7: uuidv4 } = require('uuid');
const path         = require('path');

const app      = express();
const API      = process.env.BACKEND_URL || 'https://insighta-backend-ten.vercel.app';
const PORT     = process.env.PORT || 3001;
const CSRF_KEY = 'csrf_token';

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── CSRF helpers ──────────────────────────────────────────────────────────────
function setCSRF(res) {
  const token = uuidv4();
  res.cookie(CSRF_KEY, token, { httpOnly: false, sameSite: 'lax' });
  return token;
}
function checkCSRF(req, res) {
  const fromBody   = req.body._csrf || req.headers['x-csrf-token'];
  const fromCookie = req.cookies[CSRF_KEY];
  return fromBody && fromCookie && fromBody === fromCookie;
}

// ── Auth check middleware ─────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (!req.cookies.access_token && !req.cookies.refresh_token) {
    return res.redirect('/login');
  }
  next();
}

async function apiCall(req, method, url, params = {}, body = null) {
  const config = {
    method,
    url: `${API}${url}`,
    headers: {
      'X-API-Version': '1',
      Cookie: `access_token=${req.cookies.access_token || ''}; refresh_token=${req.cookies.refresh_token || ''}`,
    },
    params,
    withCredentials: true,
  };
  if (body) config.data = body;
  return axios(config);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Login
app.get('/login', (req, res) => {
  const csrf = setCSRF(res);
  res.render('login', { csrf, error: req.query.error });
});

// GitHub OAuth redirect
app.get('/auth/github', (req, res) => {
  res.redirect(`${API}/auth/github`);
});

// OAuth callback — backend redirects here with tokens in query params
app.get('/auth/callback', (req, res) => {
  const { at, rt } = req.query;
  if (!at || !rt) return res.redirect('/login?error=auth_failed');
  const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' };
  res.cookie('access_token',  at, { ...cookieOpts, maxAge: 3 * 60 * 1000 });
  res.cookie('refresh_token', rt, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
  res.redirect('/dashboard');
});

// OAuth callback — backend sets cookies then redirects here
app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const [profilesRes] = await Promise.all([
      apiCall(req, 'get', '/api/profiles', { limit: 1 }),
    ]);
    const total = profilesRes.data.total;
    res.render('dashboard', { total, user: req.cookies });
  } catch {
    res.render('dashboard', { total: 0, user: req.cookies });
  }
});

// Profiles list
app.get('/profiles', requireLogin, async (req, res) => {
  const { gender, country_id, age_group, page = 1, limit = 10, sort_by, order, q } = req.query;
  try {
    const params = { page, limit };
    if (gender)     params.gender     = gender;
    if (country_id) params.country_id = country_id;
    if (age_group)  params.age_group  = age_group;
    if (sort_by)    params.sort_by    = sort_by;
    if (order)      params.order      = order;

    const { data } = await apiCall(req, 'get', '/api/profiles', params);
    res.render('profiles', { data, query: req.query, error: null });
  } catch (e) {
    res.render('profiles', { data: { data: [], total: 0, page: 1, total_pages: 1 }, query: req.query, error: e.message });
  }
});

// Profile detail
app.get('/profiles/:id', requireLogin, async (req, res) => {
  try {
    const { data } = await apiCall(req, 'get', `/api/profiles/${req.params.id}`);
    res.render('profile-detail', { profile: data.data, error: null });
  } catch {
    res.render('profile-detail', { profile: null, error: 'Profile not found' });
  }
});

// Search
app.get('/search', requireLogin, async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  let results = null, error = null;
  if (q) {
    try {
      const { data } = await apiCall(req, 'get', '/api/profiles/search', { q, page, limit });
      results = data;
    } catch (e) {
      error = e.response?.data?.message || e.message;
    }
  }
  res.render('search', { q, results, error });
});

// Account
app.get('/account', requireLogin, async (req, res) => {
  try {
    const { data } = await axios.get(`${API}/auth/me`, {
      headers: { Cookie: `access_token=${req.cookies.access_token || ''}` },
    });
    res.render('account', { user: data.data, error: null });
  } catch {
    res.render('account', { user: null, error: 'Could not load account info' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  axios.post(`${API}/auth/logout`, { refresh_token: req.cookies.refresh_token }).catch(() => {});
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.redirect('/login');
});

// Root redirect
app.get('/', (req, res) => {
  if (req.cookies.access_token || req.cookies.refresh_token) return res.redirect('/dashboard');
  res.redirect('/login');
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Web portal on http://localhost:${PORT}`));
}

module.exports = app;
