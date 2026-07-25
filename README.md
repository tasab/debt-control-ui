# debt-control-ui

Frontend for the P2P lending platform: React 19 + Vite + Tailwind v4 + shadcn/ui +
TanStack Query + React Router + Zod + Recharts.
Plans live in `docs/` (`PLATFORM_PLAN.md` — concept, `CLIENT_PLAN.md` — this stack).

## Run

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to :3001
```

Needs the backend (`debt-control-server`) running on port 3001. To work without
it, start against mocks:

```bash
VITE_USE_MOCKS=1 npm run dev
```

MSW handlers in `src/mocks/` are written against the API contract
(`docs/SERVER_PLAN.md` §2 in the server repo) and cover the error codes the UI
handles — `INSUFFICIENT_FUNDS`, `QUOTE_EXPIRED`, `BELOW_MIN_TICKET`,
`OVERFUNDED` — so error states are built against something real.

## Test

```bash
npm test
```

## The one rule

**The client does not compute money.** Balances, fees, interest, conversions and
progress percentages all arrive from the server already calculated. The only
arithmetic here is in `src/lib/money.js`: formatting a string of minor units into
text and parsing typed input back — with `BigInt`, never `Number`.

Consequences worth keeping:
- amounts cross the wire as strings (`"100050"`), never numbers;
- `<Amount>` is the only way an amount reaches the screen;
- `<AmountInput>` is the only way one is typed in.

## Shape

```
src/
  lib/money.js        format/parse minor units (tested)
  lib/api/            fetch wrapper (cookies, Idempotency-Key, error shape) + endpoints
  lib/hooks/          TanStack Query hooks, one place for cache keys
  lib/auth.jsx        session context
  components/money/   Amount · AmountInput · CurrencySelect · StatusBadge · RequestCard
  components/layout/  AppShell (nav from capabilities) · empty/error/skeleton states
  pages/              auth · wallet · market · invest · business · profile
  mocks/              MSW handlers + fixtures
```
