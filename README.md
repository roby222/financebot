# FinancePalmirioBot

A single-file ETF dashboard with composite trading signals and geopolitical macro context.

## Features

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
- **GitHub Pages deployment** — fully static, no backend required

## Structure

```
static/
  index.html       ← entire dashboard (single file, no framework)
  watchlist.json   ← default ETF list (edit here to change defaults)
quotes.py          ← CLI utility: live quotes
trading_signals.py ← CLI utility: technical signals in terminal
skills/
  etf-classify/   ← skill for classifying ETF drivers
  signal-algorithm/← skill documenting the signal algorithm
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
