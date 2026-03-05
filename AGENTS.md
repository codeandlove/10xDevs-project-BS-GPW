# AGENTS.md

AI agent guide for Black Swan Grid (GPW) - a desktop-focused Astro + React application for analyzing historical stock market anomalies on the Warsaw Stock Exchange.

## Project Architecture

**Hybrid SSR with Islands**: Astro 5 (SSR mode) with React 19 islands for interactivity. Static `.astro` files for layouts/pages, React components only when client-side state/interactivity is needed.

**Three-tier data flow**:

1. **NocoDB** (external API) → Historical events, AI summaries, ticker symbols
2. **Supabase** → Auth (users, sessions), subscription management (trials, Stripe status)
3. **Stripe** → Payment processing, webhooks for subscription lifecycle

**Key directories**:

- `src/pages/` - Astro routes (`.astro` files) and API endpoints (`api/**/*.ts`)
- `src/components/` - React components organized by feature (`grid/`, `auth/`, `checkout/`, `event/`)
- `src/services/` - Business logic layer (user, subscription, nocodb, webhook, audit)
- `src/lib/` - Pure utilities (api-client, cache, validation, error handling)
- `src/middleware/index.ts` - Auth/subscription middleware for protected routes
- `src/types/` - Shared TypeScript types (DTOs, entities, API contracts)
- `e2e/` - Playwright tests with fixture-based auth

## Critical Patterns

### Authentication & Access Control

**Two-level auth**: All API endpoints check both Supabase auth AND subscription status (trial or paid).

```typescript
// Pattern used in src/pages/api/nocodb/*.ts
const authUid = await getAuthUid(request, supabase);
const { data: user } = await supabase
  .from("app_users")
  .select("subscription_status, trial_expires_at")
  .eq("auth_uid", authUid)
  .single();

// Access granted if: subscription_status = 'active' OR (status = 'trial' AND trial_expires_at > now)
```

**Never** use `@supabase/supabase-js` types directly - always import `SupabaseClient` from `src/db/supabase.client.ts`.

**In Astro pages/API routes**: Access Supabase via `context.locals.supabase` (set by middleware), not direct import.

### Client-Side Caching

**Stale-while-revalidate strategy** via `useClientCache` hook (see `src/hooks/useClientCache.ts`):

- In-memory cache (React state) + localStorage persistence
- LRU eviction (max 200 entries)
- TTL: 5 minutes default
- Returns stale data immediately, revalidates in background

**Cache keys** for grid data use hashed symbols (`src/lib/cache.ts`):

- ≤5 symbols: comma-separated string (`"PKN,PKO"`)
- \>5 symbols: 8-char FNV-1a hash to avoid localStorage quota errors

**API client** (`src/lib/api-client.ts`) automatically injects auth tokens from localStorage to avoid `getSession()` deadlocks during React renders.

### Virtualization

**Grid rendering** (`src/components/grid/VirtualizedGrid.tsx`):

- Uses `@tanstack/react-virtual` for both rows (tickers) and columns (dates)
- Responsive sizing: `{ mobile: 100px, tablet: 120px, desktop: 140px }` column width
- Initial scroll: Always positions at rightmost (newest) dates — see Grid Scroll Architecture below
- Keyboard navigation: Arrow keys, Enter (open sidebar), Escape (close)

**Ticker filter** (`src/components/grid/TickerList.tsx`): Also virtualized with 460+ symbols.

### Grid Scroll Architecture

Three rules that must be followed when modifying scroll behavior in `VirtualizedGrid.tsx`:

**1. `useLayoutEffect` for all `scrollLeft` mutations — never `useEffect`**
`useEffect` runs after the browser paints, causing a visible jump. `useLayoutEffect` runs synchronously after React commits to the DOM but before paint. Any write to `scrollLeft` (initial positioning, infinite scroll compensation) must use `useLayoutEffect`.

**2. `initialOffset` in TanStack Virtual for flash-free initial render**
When the grid must start at a non-zero scroll position (rightmost dates), set `initialOffset` in `useVirtualizer` so the virtualizer renders the correct columns on the very first render — before `useLayoutEffect` has a chance to run. Compute it once at mount via `useState` lazy initializer:

```typescript
const [estimatedInitialOffset] = useState<number>(() => {
  if (typeof window === "undefined") return 0;
  const totalColumnWidth = dates.length * config.colWidth;
  return Math.max(0, totalColumnWidth - (window.innerWidth - config.symbolWidth));
});
```

**3. `hasScrolledToRight` ref guard for one-time mount effects**
Use `useRef(false)` as a guard inside `useLayoutEffect` with `[]` deps to run scroll-to-edge exactly once on mount, regardless of subsequent re-renders triggered by data changes:

```typescript
const hasScrolledToRight = useRef(false);
useLayoutEffect(() => {
  if (hasScrolledToRight.current) return;
  const el = parentRef.current;
  if (!el) return;
  el.scrollLeft = el.scrollWidth - el.clientWidth;
  hasScrolledToRight.current = true;
}, []);
```

**Decided against: `direction: rtl`** — `@tanstack/react-virtual` reads `scrollLeft` directly and does not support RTL. Cross-browser `scrollLeft` in RTL context is inconsistent (Chrome: negative values, Safari: 0+growing, Firefox: reversed). Do not attempt RTL as a scroll-position workaround.

### API Endpoints

**All API routes** use `export const prerender = false` (required for SSR).

**Handler format**: Uppercase HTTP methods (`GET`, `POST`, not `get`/`post`).

**Validation**: Zod schemas in `src/lib/nocodb-validation.ts` for all query params.

**Rate limiting**: `checkRateLimit(authUid)` in protected endpoints (60 req/min default).

**Example structure** (`src/pages/api/nocodb/grid.ts`):

```typescript
export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  // 1. Auth check (getAuthUid)
  // 2. Subscription check (app_users query)
  // 3. Rate limit (checkRateLimit)
  // 4. Validate query params (Zod)
  // 5. Call service layer (NocoDBService)
  // 6. Return JSON response
};
```

### Type System

**Central types file**: `src/types/types.ts` re-exports all DTOs from feature-specific type files (`subscription.types.ts`, `nocodb.types.ts`, `webhook.types.ts`, `ui.types.ts`).

**Database types**: Auto-generated `src/db/database.types.ts` from Supabase schema (do not edit manually).

**DTO naming**: `{Entity}{Purpose}DTO` (e.g., `InitializeUserDTO`, `GridResponse`, `SubscriptionStatusDTO`).

### Testing

**Unit tests** (Vitest):

- Run against services and utilities only (`src/lib/**`, `src/services/**`)
- Coverage excludes UI components (tested by Playwright)
- Config: `vitest.config.ts` with happy-dom environment
- Command: `npm run test:coverage`

**E2E tests** (Playwright):

- 3 fixture-based user contexts: `active-user`, `trial-user`, `guest-user`
- Test files in `e2e/` with `*.spec.ts` naming
- Page objects in `e2e/pages/` (e.g., `GridPage`, `AuthPage`)
- Fixtures in `e2e/fixtures.ts` - auto-authenticate based on project name
- Test setup: `npm run test:e2e:setup` creates test users in Supabase
- Command: `npm run test:e2e` (builds + runs), `npm run test:e2e:ui` (interactive)

**Key test pattern**: Tests are grouped by fixture/user role in `playwright.config.ts` using `testMatch` regex.

## Developer Workflows

### Local Development

```bash
nvm use                # Node 22.14.0 (from .nvmrc)
npm install
cp .env.example .env   # Configure all 3 services (Supabase, Stripe, NocoDB)
npm run dev            # Starts on :3000
```

**Required env vars**: 13 total (see `.env.example`) - 4 Supabase, 3 Stripe, 6 NocoDB.

### Build & Deploy

**Production build**: `npm run build` → outputs to `dist/` (Astro SSR bundle).

**Deployment** (DigitalOcean via PM2):

- Build runs in GitHub Actions (`.github/workflows/master-merge.yml`)
- Deployed via `ecosystem.config.cjs` (PM2 standalone mode)
- Entry point: `dist/server/entry.mjs`
- Environment: Production vars set in `.env` on server

**PM2 config**: Single instance, fork mode (not cluster - SSR app).

### CI/CD

**Two workflows**:

1. `pull-request.yml` - Lint + unit tests only
2. `master-merge.yml` - Build + unit tests + E2E tests (on `integration` environment)

**E2E in CI**: Uses `npm run preview` webServer (port 3000), 2 workers, 2 retries.

**Node version**: Always uses `.nvmrc` (22.14.0) via `node-version-file` in setup-node action.

## Integration Points

### NocoDB Client

**Wrapper**: `src/lib/nocodb-client.ts` provides `NocoDBClient` class with query builder.

**Tables**: 4 tables accessed via env vars (`NOCODB_TABLE_BLACK_SWANS`, etc.).

**Pagination**: Returns `pageInfo` with `totalRecords`, `totalPages`, `currentPage`.

**Service layer**: `src/services/nocodb.service.ts` transforms raw NocoDB records to DTOs.

### Stripe Webhooks

**Endpoint**: `src/pages/api/webhooks/stripe.ts` (public, no auth).

**Idempotency**: Uses `stripe_webhook_events` table to prevent duplicate processing.

**Event handling**: `src/services/webhook.service.ts` maps Stripe events to subscription status updates.

**Audit trail**: All subscription changes logged to `app_user_audit_log` (via `audit.service.ts`).

### Supabase Auth

**Session management**: Handled by `@supabase/ssr` in middleware.

**User initialization**: First login triggers `POST /api/users/initialize` to create `app_users` record with 7-day trial.

**Auth pages**: `src/pages/auth/login.astro`, `src/pages/auth/register.astro` (static Astro pages with React forms).

## Common Pitfalls

1. **No `"use client"` directive** - This is Astro, not Next.js. React islands are client-side by default when imported in `.astro` files.

2. **Middleware routes** - `PROTECTED_ROUTES` (`/api/nocodb`) require subscription; `AUTH_ONLY_ROUTES` (`/api/users`, `/api/subscriptions`) only require auth.

3. **Cache invalidation** - Call `invalidateCache(key)` or `clearAllCache()` from `src/lib/cache-utils.ts` after mutations (e.g., subscription changes).

4. **Date formatting** - All dates from NocoDB are `YYYY-MM-DD` strings. Always parse with `new Date(dateStr)` for comparisons.

5. **Error handling** - Use custom errors from `src/lib/errors.ts` (`APIError`, `ValidationError`, etc.) for consistent error responses.

6. **Astro vs React state** - Astro components cannot use React hooks. Extract interactive parts to React components in `src/components/`.

7. **Do not add `viewport_date` to URL** — scroll position is ephemeral UI state, not navigation state. `replaceState` at scroll frequency requires ≥500ms debounce (Safari hard limit: 100 calls/30s), and restoring a position outside the initial 14-day window requires a prefetch round-trip. The grid already initializes to newest dates (rightmost), which covers the common case. If deep-link sharing of historical positions becomes a product requirement, implement as a separate explicit "share" action, not passive URL sync.

## Feature Implementation Checklist

When adding new features:

- [ ] API endpoint in `src/pages/api/` with `prerender = false`
- [ ] Service layer function in `src/services/`
- [ ] DTO types in `src/types/` (and re-export from `types.ts`)
- [ ] Zod validation schema in `src/lib/nocodb-validation.ts` (if API params)
- [ ] React component in `src/components/{feature}/`
- [ ] Unit tests for service/utils (`*.test.ts` files)
- [ ] E2E test in `e2e/{feature}.spec.ts` with appropriate fixture
- [ ] Update cache strategy if data fetching (use `useClientCache`)
- [ ] Add auth/subscription checks if protected resource

## Key Files Reference

- **Middleware**: `src/middleware/index.ts` - Auth & subscription enforcement
- **API client**: `src/lib/api-client.ts` - Fetch wrapper with retry & auth injection
- **Cache hook**: `src/hooks/useClientCache.ts` - Stale-while-revalidate pattern
- **Grid core**: `src/components/grid/VirtualizedGrid.tsx` - Main virtualized grid
- **Type definitions**: `src/types/types.ts` - Central DTO export
- **Test fixtures**: `e2e/fixtures.ts` - Auto-auth for Playwright
- **PM2 config**: `ecosystem.config.cjs` - Production deployment settings
