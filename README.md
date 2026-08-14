# Rufescent Gaming

A mobile-first betting and gaming platform prototype — sports exchange, sportsbook, casino and daily
fantasy — built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and TypeScript.

> **Demonstration build.** No real money, wagering or payment processing is involved. All odds,
> balances, games and contests come from an in-repo mock API.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Design language

"Rufescent" means *becoming reddish*, and the identity follows: ember crimson and molten gold on an
obsidian ground, with glassmorphic surfaces and restrained micro-animation.

Tokens live in `src/app/globals.css` under Tailwind v4's `@theme`:

| Ramp | Use |
| --- | --- |
| `obsidian-950…500` | Surfaces, from page ground to raised borders |
| `ember-50…900` | Primary crimson — actions, active states, live accents |
| `gold-50…700` | Value, money, premium emphasis |
| `back-*` / `lay-*` | Exchange sides — blue for back, pink for lay (Betfair convention) |
| `win` `loss` `live` `info` | Status |

Custom utilities: `glass`, `glass-soft`, `text-gilt`, `text-ember`, `skeleton`, `scroll-x`,
`no-scrollbar`, `tnum` (tabular numerals — used on every price and money figure), `pb-safe`/`pt-safe`
for iOS insets, and `sr-focusable` for the skip link.

To use your own logo, replace `public/logo.svg` and swap the inline `<Mark>` in
`src/components/brand/Logo.tsx` for an `<img>`.

## Architecture

```
src/
├─ app/                      Routes (App Router)
│  ├─ page.tsx               Landing
│  ├─ login, signup          Auth with age gate on registration
│  ├─ sports/                Hub, /live in-play board, [sport], [sport]/[matchId]
│  ├─ casino/                Lobby and [slug] game detail
│  ├─ fantasy/               Contest lobby and [contestId] builder/leaderboard/prizes
│  ├─ wallet/                Balance, deposit, withdraw, history, KYC
│  ├─ profile/               Account settings
│  ├─ promotions/            Offers and loyalty ladder
│  └─ responsible-gambling/  Limits, reality checks, self-exclusion, self-assessment
│
├─ components/
│  ├─ betting/               OddsButton, MarketBoard, MatchRow, BetSlip, LiveTicker
│  ├─ casino/                GameCard and rails
│  ├─ fantasy/               ContestCard
│  ├─ promo/                 PromoCarousel
│  ├─ layout/                Shell, TopBar, BottomNav, Sidebar, Footer, AgeGate, Providers
│  ├─ ui/                    Primitives, Skeletons, Sheet
│  └─ brand/                 Logo
│
├─ lib/
│  ├─ types.ts               Domain model
│  ├─ format.ts              Odds conversion, money, seeded RNG, bet maths
│  ├─ hooks.ts               useAsync, focus trap, scroll lock, media queries
│  ├─ api.ts                 Mock API façade — the single swap point for a real backend
│  └─ mock/                  Seeded datasets: sports, casino, fantasy, wallet, promotions
│
└─ store/                    React context: session, bet-slip, odds-format, live-odds
```

### Odds model

Every market carries both representations of the same runner:

- **Exchange** — three rungs of back and lay prices with the liquidity available at each, snapped to
  a Betfair-style tick ladder (`snapToTick` / `stepTick` in `src/lib/mock/sports.ts`).
- **Fixed odds** — a single book price derived from the same fair probability with an over-round
  applied, rendered as decimal, fractional or American via `formatOdds`.

The display format is a user preference (`src/store/odds-format.tsx`), persisted to localStorage and
switchable from the top bar. The exchange/fixed board mode is per-page state so a punter can compare
without losing their place.

### Live prices

`src/store/live-odds.tsx` simulates the exchange feed. It holds a *drift overlay* — a signed tick
offset per runner — rather than mutating market data, so back, lay and fixed prices on a runner stay
coherent as they move. Components subscribe with `useRunnerPrice(runnerId, basePrice)`, which
registers the runner as on-screen and returns the current price plus the direction of the last move
for the flash animation. Swapping in a real WebSocket means keeping the overlay shape and pushing
server messages into it.

### Determinism

All mock data is generated from a seeded PRNG (`seeded`/`hashCode` in `src/lib/format.ts`) against a
fixed `SEED_NOW` constant. `Math.random()` and `Date.now()` are never called during render, so the
server-rendered HTML matches the first client render and hydration stays clean. Live movement is
layered on afterwards, client-side only.

### Loading states

`api.ts` keeps deliberate latency (180–780ms) so the skeleton loaders in `components/ui/Skeletons.tsx`
have something real to wait on. Each skeleton mirrors the geometry of the component it replaces, so
layout does not shift when data lands.

## Responsive strategy

Mobile-first throughout, with three structural breakpoints:

| Range | Layout |
| --- | --- |
| `<640px` | Single column. Bottom tab bar, bet slip as a sticky bar that opens a bottom sheet. Exchange boards show best back + best lay only. |
| `640–1279px` | Wider grids and rails; exchange boards expand to three rungs of depth per side. |
| `≥1280px (xl)` | Sidebar / content / bet-slip rail. Tab bar hidden, slip permanently docked. |

## Accessibility

- Skip link, landmark regions, and a heading hierarchy starting at `<h1>` on every page.
- Dialogs and sheets trap focus, lock scroll, close on Escape, and restore focus on dismiss.
- Icon-only controls carry `aria-label`; price buttons announce side, runner and price.
- Loading regions use `role="status"` with `aria-live="polite"` so screen readers hear "loading"
  rather than a wall of placeholder bars.
- `prefers-reduced-motion` is honoured globally in CSS and by the JS-driven ticker and carousel.
- Visible focus rings on every interactive element, and tap targets of at least 44px on mobile.

## Compliance surface

The age gate blocks the entire app until confirmed and persists the answer. A reality-check dialog
interrupts at the user's configured interval. Every page carries the responsible-gambling footer with
18+ marking, risk warning and helpline. Withdrawals are gated on KYC status. The
`/responsible-gambling` page provides working deposit, loss and session limits, self-exclusion, a
self-assessment and links to independent support organisations.
