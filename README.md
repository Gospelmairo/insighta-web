# Insighta Labs+ — Web Portal

Server-side rendered web portal for the Insighta Labs+ demographic intelligence platform.

**Live URL**: https://insighta-web-lake.vercel.app

---

## Pages

| Route | Description |
|---|---|
| `/` | Redirects to dashboard or login |
| `/login` | GitHub OAuth login |
| `/dashboard` | Total profiles, user role, account status |
| `/profiles` | Browse, filter, sort, paginate profiles |
| `/profiles/:id` | Single profile detail |
| `/search` | Natural language search |
| `/account` | Current user info |

---

## Authentication

- Login via GitHub OAuth — click "Continue with GitHub"
- Backend handles OAuth and redirects to `/auth/callback` with tokens
- Web portal sets HTTP-only cookies for `access_token` and `refresh_token`
- All pages except `/login` require authentication

---

## Tech Stack

- **Node.js + Express** — server-side rendering
- **EJS** — templating engine
- **cookie-parser** — HTTP-only cookie handling
- **axios** — proxies API calls to the backend

---

## Backend Integration

All API calls are proxied through the Express server to the backend at `https://insighta-backend-ten.vercel.app`. Cookies are forwarded on every request.

---

## Environment Variables

| Variable | Description |
|---|---|
| `BACKEND_URL` | Backend API base URL |
| `PORT` | Port to listen on (default 3001) |

---

## CI/CD

GitHub Actions workflow runs on every push to `main`:
- Installs dependencies
- Runs lint check
- Verifies required files exist (`index.js`, `views/login.ejs`, `views/dashboard.ejs`)
