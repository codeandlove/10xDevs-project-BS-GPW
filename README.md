# Black Swan Grid (GPW)

## Project description

Black Swan Grid is a desktop-focused web application MVP that helps retail investors and short-term traders on the Warsaw Stock Exchange (GPW) quickly identify and inspect historical price-anomaly events (e.g., large intraday moves, volatility spikes). The app shows an interactive grid (dates × tickers), lets users open AI-generated summaries for events, and provides deep links to full event pages and source articles. Data is sourced from NocoDB, authentication and subscriptions are handled by Supabase and Stripe.

## Table of contents

- Tech stack
- Getting started locally
- Available scripts
- Project scope
- Project status
- License

## Tech stack

- Frontend: Astro 5 with React 19 for interactive components
- Language: TypeScript 5
- Styling: Tailwind CSS 4
- UI components: shadcn/ui (React)
- Backend / Auth: Supabase (Postgres + Auth)
- AI access: Openrouter.ai (models via external provider)
- CI/CD: GitHub Actions
- Hosting: DigitalOcean (Docker image)

## Getting started locally

Prerequisites

- Node.js (use nvm) — recommended version from .nvmrc: 22.14.0
- npm (comes with Node.js) or your preferred package manager

Quick start

1. Use Node version from .nvmrc

```bash
nvm install
nvm use
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

Create a `.env` (or `.env.local`) in project root with required variables. Example variables (names are suggestions—match your app config):

- NOCODB_BASE_URL=\"https://your-nocodb-instance/api/v1\"
- NOCODB_API_KEY=\"your_nocodb_api_key\" (if needed)
- SUPABASE_URL=\"https://your-supabase-url\"
- SUPABASE_ANON_KEY=\"your-supabase-anon-key\"
- SUPABASE_SERVICE_ROLE_KEY=\"your-supabase-service-role-key\" (server-side only)
- STRIPE*PUBLIC_KEY=\"pk*...\"
- STRIPE*SECRET_KEY=\"sk*...\"
- OPENROUTER_API_KEY=\"your_openrouter_api_key\"

Note: Do not commit secrets. Keep server-side keys (service role) out of client bundles.

4. Run in development mode

```bash
npm run dev
```

Open http://localhost:3000 (or the port printed by Astro) in your browser.

5. Build and preview

```bash
npm run build
npm run preview
```

## Available scripts

Extracted from `package.json`:

- `npm run dev` — start development server (Astro)
- `npm run build` — build for production
- `npm run preview` — preview built site locally
- `npm run astro` — run astro CLI
- `npm run lint` — run ESLint checks
- `npm run lint:fix` — run ESLint with auto-fix
- `npm run format` — run Prettier to format files


## Project scope (MVP)

Includes

- Interactive virtualized grid displaying events per ticker and date (default: last week)
- Cell-level event display with percent change and event type coloring
- Sidebar (33% width) with first AI summary and article links
- Full event page with list of AI summaries and articles
- Deep links/permalinks per event (protected by auth)
- Supabase-based authentication and 7-day trial logic
- Client-side cache (in-memory + LocalStorage) with stale-while-revalidate
- Virtualization using react-window; default visible rows 10–25
- Basic accessibility (keyboard navigation, aria attributes)

Out of scope for MVP

- Editing data or adding user notes
- Personalized alerts (email/push)
- Real-time market API integration (only historical data from NocoDB)
- Advanced visualizations (correlations, trend charts)
- Mobile/PWA-specific UI
- Admin dashboard
- Production monitoring (Sentry) and server-side Redis cache (can be added post-MVP)

## Project status

- Current stage: MVP planning and initial implementation (core components prioritized)
- High priority tasks: middleware auth, client cache hook, grid + virtualization, sidebar + full view, auth/trial flows
- Medium priority: optional API proxy for NocoDB, Playwright E2E tests
- Low priority: monitoring, server cache, admin UI

If you want a concise task list for the first sprint (PRs), ask and a prioritized backlog will be generated.

## Contributing

- Follow existing code style (ESLint + Prettier).
- Run lint and format before committing: `npm run lint` and `npm run format`.

## Testing

- End-to-end tests: Playwright (recommended)
- Create mocks in `scripts/test-data/` if needed for stable E2E runs.

## Security notes

- Keep Supabase service role keys and Stripe secret keys server-side only
- If you implement a server proxy for NocoDB, store service keys server-side and protect endpoints with rate limiting
- Do not commit `.env` files with secrets

## License

No license specified. Please add a LICENSE file (for example: MIT) if you want to open-source this repository.

---

If you'd like, I can now:

- generate a short executive summary for README top (1-2 paragraphs),
- add a `.env.example` template with recommended keys,
- create a CONTRIBUTING.md or an initial Playwright test scaffold.
