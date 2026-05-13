# FinancePalmirioBot

A single-file ETF dashboard with composite trading signals, geopolitical macro context, and a semiconductor / AI cycle monitor.

## Features

### ETF Dashboard
- **Live prices** via Yahoo Finance (auto-refresh every 60 s, cache-busted)
- **Composite signal** — RSI, MACD, Bollinger Bands, SMA50, Pivot Points combined into a single ACCUMULATE / HOLD / REDUCE / SELL rating
  - Hysteresis (score must shift >0.08 to flip signal)
  - Volatile regime: wider thresholds to reduce noise
  - Downtrend cap: SMA50 < −15% forces signal to max HOLD
  - Macro boost: Gold movement adjusts METALLI/PAURA drivers
- **Volume column** — current session vs 20-day average (0.7×/1.5× thresholds)
- **Scenario engine** — Neutro / Volatile / Escalation / De-escalation with auto-sync to detected macro regime
- **Macro bar** — Brent (dynamic front-month), Gold, S&P 500, VIX with live prices and regime detection
- **Detail modal** — click any ticker to open a full chart view:
  - Period selector: 1D · 1W · 1M · 3M · 6M · 1Y · 3Y · 5Y · MAX
  - Interactive crosshair: hover to see price, date/time and volume at any point
  - Volume bar chart below the price chart (green/red per session direction)
  - Period return displayed above the chart (e.g. ▲ +32.5% nel periodo)
  - Stats bar: RSI 14, MACD H, vs SMA50, Vol×avg, Pivot PP, R1, S1
- **Custom watchlist** — add any Yahoo Finance ticker via search autocomplete
- **Export / Import** — save and restore your watchlist as JSON

### Semis / AI Cycle Monitor (`🔬 Semis` tab)
- **6 semiconductor cycle indicators** with auto-fetch and manual edit:
  1. HBM3E contract pricing — $/GB blended (TrendForce proxy)
  2. TSMC CoWoS shipments — k WPM capacity (Yahoo Finance proxy + news)
  3. Hyperscaler 2027 capex language — "shift to opex" mention count (news basket)
  4. Nvidia data center inventory days — auto-computed from SEC EDGAR 10-Q
  5. AMD MI-series & ROCm adoption — GitHub star delta + news
  6. Memory capex aggregate — Samsung / SK Hynix / Micron guidance (news basket)
- **Composite cycle-health score** with GREEN / YELLOW / RED regime label and breakdown pills
- **Investment thesis panel** — SEMI ETF verdict (ACCUMULATE / HOLD / REDUCE) with live dashboard dots linked to indicator status
- **Catalyst calendar** — upcoming earnings and events with IR links; imminently-due events highlighted
- **Per-indicator cards** — current value, trend sparkline, auto-fetch badge, editable history and notes
- **Export / Reset** — export state as JSON or restore defaults
- **Lazy-loaded**: indicators fetch on first tab open, then refresh every 2 hours

### Macro Indicators (`🌍 Macro` tab)
- **Commodity and macro indicators** independent from the semis thesis:
  1. Copper / COPM — LME copper $/t + COPM.MI ETF proxy (AI infra physical demand)
- **Same card UI** as Semis Monitor (shared `.sm-*` CSS), distinct amber accent color
- Expandable: add more macro indicators to `mc_DEFAULTS` in `static/index.html`

### General
- **i18n** — full Italian / English toggle (all UI strings, including Semis and Macro monitors)
- **Dark theme** — GitHub-style, CSS variable sets scoped per tab (`#view-semis`, `#view-macro`)
- **GitHub Pages deployment** — fully static, no backend required

## Structure

```
static/
  index.html         ← entire dashboard (single file, no framework)
  watchlist.json     ← default ETF list (edit here to change defaults)
proxy-worker/        ← Cloudflare Worker CORS proxy (Yahoo Finance + Google News)
quotes.py            ← CLI utility: live quotes
trading_signals.py   ← CLI utility: technical signals in terminal
theses/
  SEMI_thesis.md     ← investment thesis for iShares MSCI Global Semiconductors (SEMI)
skills/
  etf-classify/      ← skill for classifying ETF drivers
  signal-algorithm/  ← skill documenting the signal algorithm
  semis-update/      ← skill for post-event Semis Monitor updates (earnings, monthly data)
    SKILL.md         ← 9-step update procedure
    CALENDAR.txt     ← catalyst calendar with completion tracking
```

## Running locally

```bash
python3 -m http.server 8080 --directory static
```

Then open `http://localhost:8080`.

## Watchlist format

```json
{ "id": "SWDA", "name": "iShares Core MSCI World", "yf": "SWDA.MI",
  "driver": "EQUITY", "dEmoji": "📈", "regime": "risk-on" }
```

Available drivers: `EQUITY` `TECH` `ENERGIA` `METALLI` `INFRA` `GEO` `FOOD` `PAURA` `CICLO`

Available regimes: `risk-on` `risk-off` `neutro`

## CLI

```bash
python3 quotes.py SWDA.MI SEME.MI
python3 trading_signals.py SWDA SEME
```

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`. The `static/` directory is served as-is.
