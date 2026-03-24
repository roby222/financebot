# FinancePalmirioBot

Dashboard ETF per macro-trend geopolitici — segnali compositi (RSI, MACD, Bollinger, SMA, Pivot) con scenari Iran-USA / Russia-Ucraina.

## Struttura

```
static/
  index.html       ← dashboard principale (tutto in un file)
  watchlist.json   ← lista ETF (modifica qui per aggiornare i ticker)
quotes.py          ← utility CLI: quotazioni live
trading_signals.py ← utility CLI: segnali tecnici da terminale
```

## Avvio

```bash
python3 -m http.server 8080 --directory static
```

Poi apri `http://localhost:8080`.

> La guida completa è integrata nel sito — clicca **?** in alto a destra.

## Watchlist

I ticker sono in `static/watchlist.json`. Formato:

```json
{ "id": "SWDA", "name": "iShares Core MSCI World", "yf": "SWDA.MI",
  "driver": "EQUITY", "dEmoji": "📈", "regime": "risk-on" }
```

Driver disponibili: `EQUITY` `TECH` `ENERGIA` `METALLI` `INFRA` `GEO` `FOOD` `PAURA` `CICLO`

## CLI

```bash
python3 quotes.py SWDA.MI SEME.MI
python3 trading_signals.py SWDA SEME
```
