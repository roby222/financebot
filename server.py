#!/usr/bin/env python3
"""
FinanceBot – FastAPI backend.
Endpoints:
  GET  /api/symbols          → list saved symbols
  POST /api/symbols          → add a symbol { "symbol": "AAPL" }
  DELETE /api/symbols/{sym}  → remove a symbol
  GET  /api/quotes           → fetch live quotes for all saved symbols
  GET  /api/rates            → current FX rates (EURUSD, GBPUSD, …)
"""

import json
import os
from pathlib import Path

import requests
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

DATA_FILE = Path(__file__).parent / "data" / "symbols.json"
STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="FinanceBot")

# ── persistence ────────────────────────────────────────────────────────────────

def load_symbols() -> list[str]:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    return []

def save_symbols(symbols: list[str]):
    DATA_FILE.parent.mkdir(exist_ok=True)
    DATA_FILE.write_text(json.dumps(symbols, indent=2))

# ── ISIN resolution ────────────────────────────────────────────────────────────

_isin_cache: dict[str, str] = {}

def looks_like_isin(s: str) -> bool:
    s = s.strip().upper()
    return len(s) == 12 and s[:2].isalpha() and s[2:].isalnum()

def resolve_isin(isin: str) -> str | None:
    if isin in _isin_cache:
        return _isin_cache[isin]
    try:
        r = requests.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": isin, "quotesCount": 5, "newsCount": 0},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        r.raise_for_status()
        quotes = r.json().get("quotes", [])
        if quotes:
            ticker = quotes[0]["symbol"]
            _isin_cache[isin] = ticker
            return ticker
    except Exception:
        pass
    return None

def resolve(symbol: str) -> tuple[str, str]:
    """Return (yahoo_ticker, display_label)."""
    upper = symbol.strip().upper()
    if looks_like_isin(upper):
        ticker = resolve_isin(upper)
        if ticker:
            return ticker, f"{upper} ({ticker})"
        return upper, upper
    return upper, upper

# ── quote fetching ─────────────────────────────────────────────────────────────

def _r(v, decimals=4):
    return round(v, decimals) if v is not None else None

def fetch_quote(symbol: str) -> dict:
    ticker_sym, label = resolve(symbol)
    try:
        t  = yf.Ticker(ticker_sym)
        fi = t.fast_info

        price = fi.last_price
        prev  = fi.previous_close
        if price is None:
            return {"symbol": symbol, "label": label, "error": "Nessun dato"}

        # full info for name, market state, extra fields
        try:
            info = t.get_info()
        except Exception:
            info = {}

        change = price - (prev or price)
        pct    = (change / prev * 100) if prev else 0.0

        # market state: REGULAR | PRE | POST | CLOSED
        market_state = info.get("marketState", "UNKNOWN")

        # 52-week range via fast_info (fallback to info)
        w52_high = getattr(fi, "fifty_two_week_high", None) or info.get("fiftyTwoWeekHigh")
        w52_low  = getattr(fi, "fifty_two_week_low",  None) or info.get("fiftyTwoWeekLow")

        # day range
        day_high = getattr(fi, "day_high", None) or info.get("dayHigh")
        day_low  = getattr(fi, "day_low",  None) or info.get("dayLow")
        open_p   = getattr(fi, "open",     None) or info.get("open")

        # volume
        volume     = getattr(fi, "last_volume", None) or info.get("volume")
        avg_volume = info.get("averageVolume") or info.get("averageDailyVolume10Day")

        # cap & pe
        market_cap = getattr(fi, "market_cap", None) or info.get("marketCap")
        pe_ratio   = info.get("trailingPE") or info.get("forwardPE")
        div_yield  = info.get("dividendYield")  # decimal, e.g. 0.013
        beta       = info.get("beta")

        name = info.get("longName") or info.get("shortName") or info.get("displayName")
        isin = symbol.strip().upper() if looks_like_isin(symbol.strip().upper()) else info.get("isin", None)

        return {
            "symbol":       symbol,
            "label":        label,
            "ticker":       ticker_sym,
            "isin":         isin,
            "name":         name,
            "price":        _r(price),
            "prev_close":   _r(prev),
            "change":       _r(change),
            "pct":          _r(pct, 2),
            "currency":     getattr(fi, "currency", None) or info.get("currency", "—"),
            "market_state": market_state,
            "open":         _r(open_p),
            "day_high":     _r(day_high),
            "day_low":      _r(day_low),
            "week52_high":  _r(w52_high),
            "week52_low":   _r(w52_low),
            "volume":       volume,
            "avg_volume":   avg_volume,
            "market_cap":   market_cap,
            "pe_ratio":     _r(pe_ratio, 2),
            "div_yield":    _r(div_yield, 4),
            "beta":         _r(beta, 2),
            "error":        None,
        }
    except Exception as e:
        return {"symbol": symbol, "label": label, "error": str(e)}

# ── FX rates ───────────────────────────────────────────────────────────────────

# pairs we care about: key = "BASEQUOTE", value = rate (1 BASE = ? QUOTE)
FX_PAIRS = ["EURUSD=X", "GBPUSD=X", "CHFUSD=X", "JPYUSD=X"]

def fetch_rates() -> dict[str, float]:
    """Return rates as { 'EUR': <EUR/USD rate>, 'GBP': …, 'USD': 1.0 }"""
    rates: dict[str, float] = {"USD": 1.0}
    for pair in FX_PAIRS:
        try:
            fi = yf.Ticker(pair).fast_info
            price = fi.last_price
            if price:
                base = pair[:3]          # e.g. "EUR"
                rates[base] = price      # 1 EUR = price USD
        except Exception:
            pass
    return rates

# ── API routes ─────────────────────────────────────────────────────────────────

class SymbolIn(BaseModel):
    symbol: str

@app.get("/api/symbols")
def get_symbols():
    return load_symbols()

@app.post("/api/symbols", status_code=201)
def add_symbol(body: SymbolIn):
    sym = body.symbol.strip().upper()
    if not sym:
        raise HTTPException(400, "Symbol vuoto")
    symbols = load_symbols()
    if sym not in symbols:
        symbols.append(sym)
        save_symbols(symbols)
    return {"symbols": symbols}

@app.delete("/api/symbols/{symbol}")
def delete_symbol(symbol: str):
    sym = symbol.strip().upper()
    symbols = load_symbols()
    if sym not in symbols:
        raise HTTPException(404, "Symbol non trovato")
    symbols.remove(sym)
    save_symbols(symbols)
    return {"symbols": symbols}

@app.get("/api/search")
def search_symbols(q: str = ""):
    if not q or len(q) < 1:
        return []
    try:
        r = requests.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": q, "quotesCount": 8, "newsCount": 0, "listsCount": 0},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=8,
        )
        r.raise_for_status()
        results = []
        for item in r.json().get("quotes", []):
            results.append({
                "symbol":   item.get("symbol", ""),
                "name":     item.get("longname") or item.get("shortname") or "",
                "type":     item.get("quoteType", ""),
                "exchange": item.get("exchDisp") or item.get("exchange", ""),
            })
        return results
    except Exception:
        return []

@app.get("/api/rates")
def get_rates():
    return fetch_rates()

@app.get("/api/quotes")
def get_quotes():
    symbols = load_symbols()
    if not symbols:
        return []
    return [fetch_quote(s) for s in symbols]

# ── serve frontend ─────────────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
def root():
    return FileResponse(str(STATIC_DIR / "index.html"))
