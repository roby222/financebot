# FinancePalmirioBot

A static investment dashboard for ETF signals, Italian government bonds, the semiconductor/AI cycle, macro indicators, and relative bond/equity valuations. The site runs directly on GitHub Pages with native JavaScript modules; no application server or frontend build is required.

## Run locally

```bash
python3 -m http.server 8080 --directory static
```

Open http://localhost:8080. Serve over HTTP: native modules cannot be loaded reliably from `file://`.

For development checks, use Node.js 20+ (CI uses Node.js 22):

```bash
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

To use an existing Chrome installation: `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`.

## Features

- **ETF:** live Yahoo Finance prices, RSI/MACD/Bollinger/SMA50/pivot signals, volumes, scenario and macro adjustments, signal-change history, sortable watchlist, autocomplete, JSON export/import.
- **BTP:** prices and spread from Borsa Italiana/Teleborsa, approximate gross and net yields, purchase-price tracking, sorting, editable holdings, and historical charts.
- **Semis:** six cycle indicators, SEC/GitHub/news inputs, reference-date performance, a thesis panel, catalyst calendar, editable notes and histories.
- **Macro:** copper and COPM context, thresholds, history and news.
- **Bond/Equity:** real yield and valuation comparisons, with editable country assumptions.
- Italian/English translations, a dark responsive interface, and interactive price/volume charts.

The refactor preserves the existing formulas and investment assumptions. Live quotes and proxy data do not automatically update every seeded thesis value or calendar event. BTP yields are approximations; indexed and step-up bonds do not use the fixed-coupon formula.

## Source map

```text
static/
  index.html                    Document shell, views, and help content
  watchlist.json                Default watchlist
  css/                          Base styles and per-feature stylesheets
  vendor/                       Pinned Chart.js 4.4.0 and MIT license
  js/
    app.js                      Startup and application coordination
    core/
      state.js                  Shared market, watchlist, and chart state
      storage.js                Safe persistence and session fallback
      network.js                Proxy chain, timeouts, API configuration
      indicators.js             Pure technical calculations
      bonds.js                  Existing BTP yield formulas
      format.js, i18n.js         Shared formatting and translations
      async.js                  Bounded parallel requests
    data/                       Translations and market/scenario configuration
    services/                   Yahoo, news, SEC, BTP and spread fetching
    features/
      etf/                      Watchlist store/actions, signals, table, refresh
      semis/                    Defaults, cycle monitor and ticker bar
      macro/                    Defaults and copper monitor
      bonds/                    Defaults and bond/equity valuations
      btp/                      Defaults, portfolio and historical charts
    ui/                         Actions, navigation, autocomplete, help and charts
proxy-worker/worker.js          Standalone Cloudflare proxy and BTP JSON API
quotes.py, trading_signals.py   Independent Python CLI utilities
theses/                        Investment thesis documents
skills/                        ETF classification and monitor update procedures
tests/                        Unit and browser regression checks
tools/check-source.js         Syntax, import graph and static asset checks
```

Modules import their dependencies explicitly and the import graph is checked for cycles. Core/services do not import feature views. Feature defaults are separate from renderers. `ui/actions.js` registers a bounded set of handlers for declarative `data-action` attributes, including controls generated after a refresh; application handlers are not attached to `window`.

The shared Chart.js library is served locally. No npm dependencies are loaded by the production application.

## Data and persistence

All existing browser storage keys are retained: `fpb_*`, `semis_ai_monitor_v2`, `macro_monitor_v1`, `bond_equity_v1`, and `btp_italia_v1`. Existing watchlists and purchase prices remain in the same browser/origin. Invalid JSON falls back to defaults; blocked storage uses memory for the current session. There is no account-based synchronization.

Market requests use the configured Cloudflare Worker first, followed by `proxy.cors.sh` and `api.allorigins.win`. Public proxies can be unavailable or rate-limited. To override the worker, set the following in the browser console and reload:

```js
localStorage.setItem("fpb_proxy", "https://YOUR-WORKER.workers.dev/?url=");
```

The existing default is `https://fpb-proxy.robe-pisu.workers.dev/?url=`. BTP requests first use the Worker's `?btp=ISIN` JSON route (45-second cache), and spread uses `?spread=1` (120-second cache). HTML scraping remains a fallback. See [BTP implementation notes](docs/BTP_TAB.md).

## Editing the dashboard

- Default ETF list: `static/watchlist.json`; keep the offline fallback in `static/js/features/etf/watchlist-store.js` aligned.
- Signal rules: `static/js/features/etf/signals.js`; scenario weights: `static/js/data/market-config.js`.
- Semis values, thesis verdict and calendar: `static/js/features/semis/defaults.js`.
- Copper defaults: `static/js/features/macro/defaults.js`.
- BTP defaults: `static/js/features/btp/defaults.js`; changes must respect the stored-list version contract.
- UI text: `static/js/data/translations.js` and the document shell. Some BTP/Bond labels remain Italian, as before.

The signal model retains a 0.08 hysteresis threshold, half-weight MACD, a ±0.20 cap on combined nontechnical adjustments, wider volatile-regime bands, and a cap at HOLD when price is more than 12% below SMA50. CLI signal calculations are independent and are not guaranteed to match the website.

## Verification and deployment

`npm test` exercises numerical contracts, storage recovery, concurrency, proxy failover, and BTP parsing. `npm run check` checks syntax, assets, duplicate document IDs, inline JavaScript, and circular imports. Browser checks run against deterministic fixtures under `/financebot/`, exercising tabs, charts, language, watchlist import/export, BTP persistence, mobile layout, and restricted/corrupt storage. Screenshots are written under ignored `output/playwright/`.

GitHub Actions runs the checks on main, refactor branches, and pull requests. Only a successful main-branch run deploys `static/` to GitHub Pages. The Cloudflare Worker has its own deployment: changing its file on GitHub does **not** publish it to Cloudflare. Deploy the standalone file through the existing Worker project when its runtime behavior changes.

Python CLI dependencies (`requests`, `yfinance`, `rich`, and additionally `numpy`/`pandas` for signals) are separate from the browser application.
