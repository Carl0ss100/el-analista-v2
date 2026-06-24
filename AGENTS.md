<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Structure
```
app/
  layout.js           — metadata + Geist fonts + AuthProvider wrapper
  page.js             — main page with tabs, auth gate, localStorage + Supabase syncing
  globals.css         — full dark theme CSS
  auth/callback/route.js — email confirmation callback
  api/chat/route.js        — AI proxy with system prompt + context
  api/football/search/route.js — team search via API-Football
  api/football/odds/route.js   — odds by fixture ID
  api/football/result/route.js  — result search with FD fallback
  api/predictions/route.js      — CRUD with auto P/L
components/
  Auth.js             — login/register/reset password modal
  Chat.js             — chat with AI, prediction detection, command bar
  Dashboard.js        — metric cards, bankroll/weekly/monthly canvas charts, market bars
  History.js          — searchable/filterable table, editable cells, W/L/V, resolve all, CSV
  OddsSearch.js       — team search → fixtures → odds → send to chat
  Settings.js         — modal with proxyUrl, FD token, bankroll, bookmakers, backup, reset
lib/
  auth.js             — AuthProvider + useAuth hook (Supabase Auth)
  supabase.js         — lazy singleton for API routes (server-side, env vars)
  supabase-browser.js — browser client for client components (safe at build)
  supabase-server.js  — server client with cookie handling (for auth callback)
  teamTranslations.js — translate(), normalizeName(), matchTeam() + TEAM_ALIASES
  stats.js            — getStats, getStreak, getStatsByMarket, getRecentErrors, getWeeklyPL, getMonthlyHitRate
supabase/migrations/
  001_initial.sql     — 5 tables + RLS + proxy_url/x_auth_token in user_settings
.env.local            — all env vars (PROXY_URL, keys, Supabase)
next.config.mjs      — turbopack root
eslint.config.mjs     — ESLint v9 flat config (React + hooks)
```

## Scripts
- `npm.cmd run build` — production build (use npm.cmd, not npm, due to PS policy)
- `npx.cmd eslint . --config eslint.config.mjs` — lint (0 errors expected)

## Auth Flow
1. Not logged in → Auth modal (login/register/reset)
2. Logged in → user email shown in header, 🚪 logout button
3. No Supabase env vars → falls back to localStorage-only mode (no auth modal)
4. Email confirmation → /auth/callback route exchanges code for session

## Data Flow
- **Not logged in**: localStorage only (loads on mount, saves on every change)
- **Logged in**: Supabase as source of truth; predictions/settings synced to DB
- Settings upserts to `user_settings` table (includes proxy_url, x_auth_token)
- Predictions CRUD synced to `predictions` table
- Session auto-created on first login (sessions table)

## Important
- `supabase-browser.js` returns a mock client when env vars are empty (safe at build time)
- `supabase.js` is for API routes (lazy singleton, no SSR hydration issues)
- `supabase-server.js` is for auth callback (uses cookies from next/headers)
- API routes accept `proxyUrl` and `xAuthToken` from request params (not just env vars)
- `matchTeam()` scores: 3=exact normalize, 2=substring/alias, 1=word overlap ≥50%, 0=no match
- `TEAM_ALIASES` maps nicknames (Barça→Barcelona, Atléti→Atletico Madrid, etc.)
- `resolveAll` determines W/L based on market type + actual score (not just "finished=W")
- Chat uses refs (messagesRef, predictionsRef, settingsRef) to avoid stale closures
