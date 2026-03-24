#!/usr/bin/env python3
"""
ETF Trading Decision Support
Algoritmi: RSI(14), MACD(12/26/9), Bollinger Bands(20/2σ), SMA 20/50/200, Pivot Points

Usage:
    python3 trading_signals.py               # analizza watchlist completa
    python3 trading_signals.py --snapshot    # usa solo i dati snapshot (no API)
    python3 trading_signals.py SWDA SEME     # analizza solo i ticker specificati
"""

import argparse
import sys
from datetime import datetime

import numpy as np
import pandas as pd
import yfinance as yf
from rich import box
from rich.console import Console
from rich.table import Table
from rich.text import Text

console = Console()

# ---------------------------------------------------------------------------
# Watchlist: (ticker_short, nome, yahoo_ticker)
# ---------------------------------------------------------------------------
WATCHLIST = [
    ("EXUS",  "Xtrackers MSCI World ex USA",           "EXUS.L"),
    ("XMME",  "Xtrackers MSCI Emerging Markets",       "XMME.L"),
    ("WEAT",  "WisdomTree Wheat",                      "WEAT.L"),
    ("PHAG",  "WisdomTree Physical Silver",            "PHAG.L"),
    ("COPA",  "WisdomTree Copper",                     "COPA.L"),
    ("NUCL",  "VanEck Uranium & Nuclear",              "NUCL.L"),
    ("GDIG",  "VanEck S&P Global Mining",              "GDIG.L"),
    ("REMX",  "VanEck Rare Earth & Metals",            "REMX.L"),
    ("QNTM",  "VanEck Quantum Computing",              "QNTM.L"),
    ("GLUG",  "L&G Clean Water",                       "GLUG.L"),
    ("RENW",  "L&G Clean Energy",                      "RENW.L"),
    ("BATT",  "L&G Battery Value-Chain",               "BATT.L"),
    ("SEME",  "iShares MSCI Global Semiconductors",    "SEME.L"),
    ("IWQU",  "iShares MSCI World Quality Factor",     "IWQU.L"),
    ("SWDA",  "iShares Core MSCI World",               "SWDA.L"),
    ("COPM",  "iShares Copper Miners",                 "COPM.L"),
    ("SGLE",  "Invesco Gold ETC EUR Hedged",           "SGLE.MI"),
    ("UKRN",  "Ukraine Reconstruction",                "UKRN.L"),
    ("GRIDG", "First Trust Smart Grid Infrastructure", "GRIDG.L"),
]

# Snapshot fornito manualmente (prezzi di chiusura odierni con H/L intraday)
# Formato: price=attuale, prev=apertura/ref, high=max giornaliero, low=min giornaliero
SNAPSHOT = {
    "EXUS":  {"price": 35.150, "prev": 34.340, "high": 35.750, "low": 34.170, "chg_pct":  0.69},
    "XMME":  {"price": 67.594, "prev": 65.472, "high": 68.574, "low": 65.292, "chg_pct":  0.93},
    "WEAT":  {"price": 16.778, "prev": 17.502, "high": 17.520, "low": 16.540, "chg_pct": -2.45},
    "PHAG":  {"price": 53.960, "prev": 50.760, "high": 55.500, "low": 50.100, "chg_pct": -2.10},
    "COPA":  {"price": 41.080, "prev": 39.820, "high": 41.930, "low": 39.760, "chg_pct":  1.36},
    "NUCL":  {"price": 49.370, "prev": 47.180, "high": 50.120, "low": 46.720, "chg_pct":  1.11},
    "GDIG":  {"price": 50.570, "prev": 46.880, "high": 51.290, "low": 46.810, "chg_pct":  2.85},
    "REMX":  {"price": 14.040, "prev": 13.280, "high": 14.330, "low": 13.190, "chg_pct":  2.86},
    "QNTM":  {"price": 20.030, "prev": 19.470, "high": 20.340, "low": 19.370, "chg_pct":  0.60},
    "GLUG":  {"price": 17.470, "prev": 16.910, "high": 17.610, "low": 16.870, "chg_pct":  1.69},
    "RENW":  {"price": 13.450, "prev": 13.170, "high": 13.750, "low": 13.070, "chg_pct": -0.52},
    "BATT":  {"price": 26.630, "prev": 25.400, "high": 26.980, "low": 25.380, "chg_pct":  2.50},
    "SEME":  {"price": 11.150, "prev": 10.750, "high": 11.380, "low": 10.750, "chg_pct":  1.73},
    "IWQU":  {"price": 67.680, "prev": 66.620, "high": 68.740, "low": 66.550, "chg_pct":  0.55},
    "SWDA":  {"price": 109.15, "prev": 107.31, "high": 111.34, "low": 107.23, "chg_pct":  0.38},
    "COPM":  {"price":  7.950, "prev":  7.440, "high":  8.110, "low":  7.380, "chg_pct":  2.85},
    "SGLE":  {"price": 99.470, "prev": 95.860, "high": 102.34, "low": 95.510, "chg_pct": -4.33},
    "UKRN":  {"price":  7.760, "prev":  7.610, "high":  7.920, "low":  7.480, "chg_pct":  1.04},
    "GRIDG": {"price": 48.850, "prev": 47.540, "high": 49.900, "low": 47.390, "chg_pct":  0.70},
}

# ---------------------------------------------------------------------------
# Indicatori tecnici
# ---------------------------------------------------------------------------

def rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff().dropna()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return float(100 - (100 / (1 + rs)).iloc[-1])


def macd(series: pd.Series) -> tuple[float, float, float]:
    """Ritorna (MACD line, Signal line, Histogram)."""
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal = macd_line.ewm(span=9, adjust=False).mean()
    hist = macd_line - signal
    return float(macd_line.iloc[-1]), float(signal.iloc[-1]), float(hist.iloc[-1])


def bollinger(series: pd.Series, period: int = 20) -> tuple[float, float, float]:
    """Ritorna (upper, mid, lower)."""
    mid = series.rolling(period).mean()
    std = series.rolling(period).std()
    return float((mid + 2 * std).iloc[-1]), float(mid.iloc[-1]), float((mid - 2 * std).iloc[-1])


def sma(series: pd.Series, period: int) -> float | None:
    if len(series) < period:
        return None
    return float(series.rolling(period).mean().iloc[-1])


def pivot_points(high: float, low: float, close: float) -> dict:
    """Pivot Points classici (Floor Trading Pivots)."""
    pp  = (high + low + close) / 3
    r1  = 2 * pp - low
    r2  = pp + (high - low)
    r3  = high + 2 * (pp - low)
    s1  = 2 * pp - high
    s2  = pp - (high - low)
    s3  = low - 2 * (high - pp)
    return {"PP": pp, "R1": r1, "R2": r2, "R3": r3, "S1": s1, "S2": s2, "S3": s3}


# ---------------------------------------------------------------------------
# Segnale composito
# ---------------------------------------------------------------------------

def composite_signal(rsi_val: float | None,
                     macd_hist: float | None,
                     price: float,
                     bb_upper: float | None,
                     bb_lower: float | None,
                     sma50: float | None,
                     sma200: float | None,
                     pp: float | None) -> tuple[str, str]:
    """
    Ritorna (etichetta_segnale, colore_rich).
    Logica: ogni indicatore disponibile vota +1 (bull) o -1 (bear).
    """
    votes = []

    if rsi_val is not None:
        if rsi_val < 30:
            votes += [1, 1]          # fortemente ipervenduto
        elif rsi_val < 45:
            votes += [1]
        elif rsi_val > 70:
            votes += [-1, -1]        # fortemente ipercomprato
        elif rsi_val > 55:
            votes += [-1]

    if macd_hist is not None:
        votes += [1 if macd_hist > 0 else -1]

    if bb_upper is not None and bb_lower is not None:
        if price <= bb_lower:
            votes += [1, 1]
        elif price >= bb_upper:
            votes += [-1, -1]
        elif price < (bb_lower + bb_upper) / 2:
            votes += [1]
        else:
            votes += [-1]

    if sma50 is not None:
        votes += [1 if price > sma50 else -1]

    if sma200 is not None:
        votes += [1 if price > sma200 else -1]

    if pp is not None:
        votes += [1 if price < pp else -1]

    if not votes:
        return "—", "dim"

    score = sum(votes) / len(votes)

    if score >= 0.5:
        return "★ COMPRA", "bold green"
    elif score >= 0.2:
        return "↑ ACCUM.", "green"
    elif score <= -0.5:
        return "✖ VENDI", "bold red"
    elif score <= -0.2:
        return "↓ RIDUCI", "red"
    else:
        return "◆ HOLD", "yellow"


# ---------------------------------------------------------------------------
# Fetch dati storici
# ---------------------------------------------------------------------------

def fetch_history(yf_ticker: str, period: str = "6mo") -> pd.DataFrame | None:
    try:
        df = yf.download(yf_ticker, period=period, interval="1d",
                         auto_adjust=True, progress=False, threads=False)
        if df.empty or len(df) < 30:
            return None
        # Normalizza colonne se multi-level
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)
        return df
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Analisi singolo ETF
# ---------------------------------------------------------------------------

def analyze(short: str, name: str, yf_ticker: str,
            use_snapshot_only: bool = False) -> dict:
    snap = SNAPSHOT.get(short, {})
    result = {
        "ticker": short,
        "name": name,
        "price": snap.get("price"),
        "chg_pct": snap.get("chg_pct"),
        "signal": "—",
        "signal_color": "dim",
        "buy_at": None,
        "sell_at": None,
        "stop": None,
        "target": None,
        "rsi": None,
        "macd_hist": None,
        "sma50": None,
        "sma200": None,
        "bb_upper": None,
        "bb_lower": None,
        "pp": None,
        "source": "snapshot",
    }

    # Pivot Points intraday dallo snapshot (sempre disponibili)
    if snap:
        pv = pivot_points(snap["high"], snap["low"], snap["price"])
        result["pp"] = pv["PP"]
        result["buy_at"]  = pv["S1"]
        result["sell_at"] = pv["R1"]
        result["stop"]    = pv["S2"]
        result["target"]  = pv["R2"]

    if use_snapshot_only:
        # Segnale basato solo su posizione nel range e variazione %
        chg = snap.get("chg_pct", 0)
        high = snap.get("high", snap.get("price", 0))
        low  = snap.get("low",  snap.get("price", 0))
        price = snap.get("price", 0)
        rng  = high - low
        pos  = (price - low) / rng if rng > 0 else 0.5
        votes = []
        votes += [1 if chg < -1.5 else (-1 if chg > 1.5 else 0)]
        votes += [1 if pos < 0.35 else (-1 if pos > 0.65 else 0)]
        score = sum(votes) / len(votes) if votes else 0
        if score > 0.4:
            result["signal"], result["signal_color"] = "↑ ACCUM.", "green"
        elif score < -0.4:
            result["signal"], result["signal_color"] = "↓ RIDUCI", "red"
        else:
            result["signal"], result["signal_color"] = "◆ HOLD", "yellow"
        return result

    # Fetch dati storici
    df = fetch_history(yf_ticker)
    if df is None:
        console.print(f"  [dim yellow]⚠ {short} ({yf_ticker}): nessun dato storico, uso snapshot[/dim yellow]")
        return result

    result["source"] = "live"
    close = df["Close"].squeeze()
    price = float(close.iloc[-1])
    result["price"] = price

    # Pivot Points dal giorno precedente (più accurati per trading)
    if len(df) >= 2:
        prev_row = df.iloc[-2]
        pv2 = pivot_points(float(prev_row["High"]), float(prev_row["Low"]), float(prev_row["Close"]))
        result["pp"]      = pv2["PP"]
        result["buy_at"]  = pv2["S1"]
        result["sell_at"] = pv2["R1"]
        result["stop"]    = pv2["S2"]
        result["target"]  = pv2["R2"]

    # RSI
    if len(close) >= 15:
        result["rsi"] = rsi(close)

    # MACD
    if len(close) >= 35:
        _, _, hist = macd(close)
        result["macd_hist"] = hist

    # Bollinger Bands
    if len(close) >= 20:
        upper, _, lower = bollinger(close)
        result["bb_upper"] = upper
        result["bb_lower"] = lower

    # SMA
    result["sma50"]  = sma(close, 50)
    result["sma200"] = sma(close, 200)

    # Segnale composito
    result["signal"], result["signal_color"] = composite_signal(
        result["rsi"], result["macd_hist"], price,
        result["bb_upper"], result["bb_lower"],
        result["sma50"], result["sma200"], result["pp"]
    )

    return result


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def fmt(val, decimals=2, prefix="") -> str:
    if val is None:
        return "[dim]—[/dim]"
    return f"{prefix}{val:.{decimals}f}"


def render_table(results: list[dict]) -> Table:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    table = Table(
        title=f"[bold]ETF Trading Signals  –  {ts}[/bold]\n"
              "[dim]Algoritmi: RSI(14) · MACD(12/26/9) · Bollinger(20/2σ) · SMA50/200 · Pivot Points[/dim]",
        box=box.ROUNDED,
        show_lines=True,
        highlight=False,
        header_style="bold white on dark_blue",
    )

    table.add_column("Ticker",    style="bold cyan",   no_wrap=True, width=7)
    table.add_column("Nome",      style="white",       no_wrap=True, width=28)
    table.add_column("Prezzo",    justify="right",     width=9)
    table.add_column("Var%",      justify="right",     width=8)
    table.add_column("SEGNALE",   justify="center",    width=12, no_wrap=True)
    table.add_column("COMPRA ≤",  justify="right",     width=9)
    table.add_column("VENDI ≥",   justify="right",     width=9)
    table.add_column("Stop",      justify="right",     width=9)
    table.add_column("Target",    justify="right",     width=9)
    table.add_column("RSI",       justify="right",     width=6)
    table.add_column("vs SMA50",  justify="right",     width=8)
    table.add_column("vs SMA200", justify="right",     width=9)

    for r in results:
        price   = r.get("price")
        chg_pct = r.get("chg_pct")
        rsi_v   = r.get("rsi")
        sma50   = r.get("sma50")
        sma200  = r.get("sma200")
        signal  = r.get("signal", "—")
        color   = r.get("signal_color", "dim")

        # Prezzo
        price_str = fmt(price, 3) if price else "—"

        # Variazione %
        if chg_pct is not None:
            c = "green" if chg_pct >= 0 else "red"
            arrow = "▲" if chg_pct >= 0 else "▼"
            chg_str = f"[{c}]{arrow}{abs(chg_pct):.2f}%[/{c}]"
        else:
            chg_str = "—"

        # Segnale
        sig_str = f"[{color}]{signal}[/{color}]"

        # RSI colorato
        if rsi_v is not None:
            if rsi_v < 30:
                rsi_str = f"[bold green]{rsi_v:.0f}[/bold green]"
            elif rsi_v > 70:
                rsi_str = f"[bold red]{rsi_v:.0f}[/bold red]"
            elif rsi_v < 45:
                rsi_str = f"[green]{rsi_v:.0f}[/green]"
            elif rsi_v > 55:
                rsi_str = f"[red]{rsi_v:.0f}[/red]"
            else:
                rsi_str = f"{rsi_v:.0f}"
        else:
            rsi_str = "[dim]—[/dim]"

        # vs SMA50/200
        def vs_sma(s):
            if s is None or price is None:
                return "[dim]—[/dim]"
            pct = (price / s - 1) * 100
            c = "green" if pct >= 0 else "red"
            sign = "+" if pct >= 0 else ""
            return f"[{c}]{sign}{pct:.1f}%[/{c}]"

        table.add_row(
            r["ticker"],
            r["name"],
            price_str,
            chg_str,
            sig_str,
            fmt(r.get("buy_at"), 3),
            fmt(r.get("sell_at"), 3),
            fmt(r.get("stop"), 3),
            fmt(r.get("target"), 3),
            rsi_str,
            vs_sma(sma50),
            vs_sma(sma200),
        )

    return table


def render_detail(r: dict) -> None:
    """Stampa dettaglio pivot points per un ETF."""
    pp    = r.get("pp")
    s1    = r.get("buy_at")
    s2    = r.get("stop")
    r1    = r.get("sell_at")
    r2    = r.get("target")
    price = r.get("price")

    if pp is None:
        return

    console.print(f"\n[bold cyan]{r['ticker']}[/bold cyan] – {r['name']}")
    console.print(f"  Prezzo attuale : [bold]{price:.3f}[/bold]")
    console.print(f"  Pivot (PP)     : {pp:.3f}")
    console.print(f"  [green]S1 (compra)    : {s1:.3f}[/green]  ←  buy zone principale")
    console.print(f"  [green]S2 (stop loss) : {s2:.3f}[/green]  ←  chiudi se scende qui")
    console.print(f"  [red]R1 (vendi)     : {r1:.3f}[/red]  ←  sell zone principale")
    console.print(f"  [red]R2 (target)    : {r2:.3f}[/red]  ←  take profit esteso")
    if r.get("rsi"):
        console.print(f"  RSI(14)        : {r['rsi']:.1f}")
    if r.get("sma50"):
        console.print(f"  SMA 50         : {r['sma50']:.3f}")
    if r.get("sma200"):
        console.print(f"  SMA 200        : {r['sma200']:.3f}")


# ---------------------------------------------------------------------------
# Legenda
# ---------------------------------------------------------------------------

LEGENDA = """
[bold]Legenda segnali[/bold]
  [bold green]★ COMPRA[/bold green]  Score fortemente rialzista (≥3/4 indicatori bullish)
  [green]↑ ACCUM.[/green]  Accumulare gradualmente (2/4 bullish)
  [yellow]◆ HOLD[/yellow]    Neutro / attendere conferma
  [red]↓ RIDUCI[/red]   Ridurre posizione (2/4 bearish)
  [bold red]✖ VENDI[/bold red]   Score fortemente ribassista (≥3/4 bearish)

[bold]Livelli[/bold]
  COMPRA ≤  S1 pivot  – zona di supporto principale (buy limit)
  VENDI ≥   R1 pivot  – zona di resistenza principale (sell limit)
  Stop      S2 pivot  – stop loss se rompe il supporto
  Target    R2 pivot  – take profit esteso

[bold]Indicatori[/bold]
  RSI < 30 [bold green]ipervenduto[/bold green] → potenziale rimbalzo
  RSI > 70 [bold red]ipercomprato[/bold red]   → attenzione inversione
  vs SMA50/200: distanza % dal prezzo – positivo sopra la media, negativo sotto
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ETF Trading Signals")
    parser.add_argument("tickers", nargs="*",
                        help="Filtra per ticker (es: SWDA SEME). Default: tutti")
    parser.add_argument("--snapshot", "-s", action="store_true",
                        help="Usa solo dati snapshot (no fetch API)")
    parser.add_argument("--detail", "-d", action="store_true",
                        help="Mostra dettaglio pivot per ogni ETF")
    parser.add_argument("--legenda", "-l", action="store_true",
                        help="Mostra legenda e guida")
    args = parser.parse_args()

    if args.legenda:
        console.print(LEGENDA)
        return

    # Filtra watchlist
    watchlist = WATCHLIST
    if args.tickers:
        upper = [t.upper() for t in args.tickers]
        watchlist = [(s, n, y) for s, n, y in WATCHLIST if s in upper]
        if not watchlist:
            console.print("[red]Nessun ticker trovato nella watchlist.[/red]")
            sys.exit(1)

    if not args.snapshot:
        console.print("[dim]Recupero dati storici da Yahoo Finance...[/dim]")

    results = []
    for short, name, yf_ticker in watchlist:
        results.append(analyze(short, name, yf_ticker, use_snapshot_only=args.snapshot))

    console.print()
    console.print(render_table(results))

    if args.detail:
        console.print("\n[bold]── Dettaglio Pivot Points ──[/bold]")
        for r in results:
            render_detail(r)

    console.print()
    console.print(LEGENDA)


if __name__ == "__main__":
    main()
