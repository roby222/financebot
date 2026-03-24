#!/usr/bin/env python3
"""
Live stock/ETF quote viewer.
Supports ticker symbols and ISINs (ISINs are resolved via Yahoo Finance search).

Usage:
    python3 quotes.py AAPL MSFT
    python3 quotes.py IE00063FT9K6 COPM
    python3 quotes.py --watch AAPL MSFT     # refresh every 30s
    python3 quotes.py --interval 60 AAPL    # refresh every 60s
"""

import argparse
import sys
import time
from datetime import datetime

import requests
import yfinance as yf
from rich.console import Console
from rich.table import Table
from rich import box

console = Console()

ISIN_CACHE: dict[str, str] = {}


def isin_to_ticker(isin: str) -> str | None:
    """Resolve an ISIN to a Yahoo Finance ticker via the YF search API."""
    if isin in ISIN_CACHE:
        return ISIN_CACHE[isin]
    try:
        url = "https://query2.finance.yahoo.com/v1/finance/search"
        params = {"q": isin, "quotesCount": 5, "newsCount": 0}
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, params=params, headers=headers, timeout=10)
        r.raise_for_status()
        quotes = r.json().get("quotes", [])
        if quotes:
            ticker = quotes[0].get("symbol")
            ISIN_CACHE[isin] = ticker
            return ticker
    except Exception as e:
        console.print(f"[yellow]Warning: ISIN lookup failed for {isin}: {e}[/yellow]")
    return None


def looks_like_isin(s: str) -> bool:
    """Basic ISIN heuristic: 2 letters + 10 alphanumeric chars."""
    s = s.strip().upper()
    return len(s) == 12 and s[:2].isalpha() and s[2:].isalnum()


def resolve(symbol: str) -> tuple[str, str]:
    """Return (resolved_ticker, original_label)."""
    if looks_like_isin(symbol):
        ticker = isin_to_ticker(symbol.upper())
        if ticker:
            return ticker, f"{symbol} → {ticker}"
        else:
            return symbol.upper(), f"{symbol} (ISIN not resolved)"
    return symbol.upper(), symbol.upper()


def fetch_quotes(symbols: list[str]) -> list[dict]:
    resolved = [resolve(s) for s in symbols]
    tickers = [t for t, _ in resolved]

    data = yf.download(
        tickers=tickers,
        period="2d",
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=True,
    )

    results = []
    for i, (ticker, label) in enumerate(resolved):
        try:
            info = yf.Ticker(ticker).fast_info
            price = info.last_price
            prev_close = info.previous_close
            currency = getattr(info, "currency", "—")

            if price is None or prev_close is None:
                results.append({"label": label, "error": "No data"})
                continue

            change = price - prev_close
            pct = (change / prev_close) * 100 if prev_close else 0

            results.append({
                "label": label,
                "price": price,
                "prev_close": prev_close,
                "change": change,
                "pct": pct,
                "currency": currency,
            })
        except Exception as e:
            results.append({"label": label, "error": str(e)})

    return results


def render_table(results: list[dict], timestamp: datetime) -> Table:
    table = Table(
        title=f"Live Quotes  –  {timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
        box=box.ROUNDED,
        show_lines=False,
        highlight=True,
    )
    table.add_column("Symbol / ISIN", style="bold cyan", no_wrap=True)
    table.add_column("Price", justify="right")
    table.add_column("Change", justify="right")
    table.add_column("Change %", justify="right")
    table.add_column("Prev Close", justify="right")
    table.add_column("Currency", justify="center")

    for r in results:
        if "error" in r:
            table.add_row(r["label"], "—", "—", "—", "—", "—",
                          style="dim red")
            continue

        change_color = "green" if r["change"] >= 0 else "red"
        arrow = "▲" if r["change"] >= 0 else "▼"

        table.add_row(
            r["label"],
            f"{r['price']:.4f}",
            f"[{change_color}]{arrow} {abs(r['change']):.4f}[/{change_color}]",
            f"[{change_color}]{r['pct']:+.2f}%[/{change_color}]",
            f"{r['prev_close']:.4f}",
            r["currency"],
        )

    return table


def main():
    parser = argparse.ArgumentParser(description="Live stock/ETF quotes")
    parser.add_argument("symbols", nargs="+", help="Ticker symbols or ISINs")
    parser.add_argument("--watch", "-w", action="store_true",
                        help="Refresh automatically (default every 30s)")
    parser.add_argument("--interval", "-i", type=int, default=30,
                        help="Refresh interval in seconds (default: 30)")
    args = parser.parse_args()

    def run_once():
        console.print("[dim]Fetching...[/dim]", end="\r")
        results = fetch_quotes(args.symbols)
        table = render_table(results, datetime.now())
        console.clear()
        console.print(table)

    if args.watch:
        console.print(f"[dim]Watch mode — refreshing every {args.interval}s. Ctrl+C to quit.[/dim]")
        try:
            while True:
                run_once()
                time.sleep(args.interval)
        except KeyboardInterrupt:
            console.print("\n[dim]Stopped.[/dim]")
    else:
        run_once()


if __name__ == "__main__":
    main()
