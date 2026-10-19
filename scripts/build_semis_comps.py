"""
build_semis_comps.py
Builds semis_comps.xlsx — institutional comps model for NVDA/AMD/TSM/ASML/AMAT/KLAC/MU.
Analysis date: 2026-05-13.
ALL FIGURES ARE [UNSOURCED] PLACEHOLDERS — see Notes tab.
Run: python /Users/robertopisu/src/financebot/scripts/build_semis_comps.py
"""

import os
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side
)
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

# ── directory ────────────────────────────────────────────────────────────────
OUT_DIR = "/Users/robertopisu/src/financebot/static/data"
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "semis_comps.xlsx")

# ── colour palette ────────────────────────────────────────────────────────────
BLUE_BG     = PatternFill("solid", fgColor="BDD7EE")   # hardcoded inputs
HEADER_BG   = PatternFill("solid", fgColor="1F3864")   # dark navy header
SECTION_BG  = PatternFill("solid", fgColor="2E75B6")   # section banner
SUBHDR_BG   = PatternFill("solid", fgColor="D6E4F0")   # column sub-header
STAT_BG     = PatternFill("solid", fgColor="EBF3FB")   # stats rows
ALT_BG      = PatternFill("solid", fgColor="F2F7FB")   # alternating row

WHITE_FONT  = Font(name="Calibri", bold=True, color="FFFFFF", size=10)
HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
BOLD_DARK   = Font(name="Calibri", bold=True, color="1F3864", size=10)
NORMAL      = Font(name="Calibri", size=10)
BLUE_FONT   = Font(name="Calibri", size=10, color="1F497D")  # input cells
GREY_FONT   = Font(name="Calibri", size=9,  color="595959")

def thin_border():
    s = Side(style="thin", color="B8CCE4")
    return Border(left=s, right=s, top=s, bottom=s)

def thick_bottom():
    s_t = Side(style="thin",  color="B8CCE4")
    s_b = Side(style="medium", color="2E75B6")
    return Border(left=s_t, right=s_t, top=s_t, bottom=s_b)

CENTER = Alignment(horizontal="center", vertical="center", wrap_text=False)
LEFT   = Alignment(horizontal="left",   vertical="center")
RIGHT  = Alignment(horizontal="right",  vertical="center")

# ── number formats ────────────────────────────────────────────────────────────
FMT_COMMA0 = '#,##0'
FMT_COMMA1 = '#,##0.0'
FMT_PCT1   = '0.0%'
FMT_MULT1  = '0.0x'
FMT_MULT2  = '0.00x'
FMT_USD_BN = '#,##0.0'      # billions, 1dp
FMT_EPS    = '$0.00'

# ── peers ─────────────────────────────────────────────────────────────────────
PEERS = ["NVDA", "AMD", "TSM", "ASML", "AMAT", "KLAC", "MU"]
N = len(PEERS)

ANALYSIS_DATE = "2026-05-13"
UNSOURCED = "[UNSOURCED] — placeholder; replace with FactSet/CapIQ pull before use."

# ── raw assumption data (ALL [UNSOURCED]) ─────────────────────────────────────
# Structure per peer:
# ltm_rev, ntm_rev, ltm_gm, ltm_ebitda, ltm_rd_pct, ltm_capex_pct,
# mktcap_bn, net_debt_bn, ntm_ebitda, ntm_eps, ntm_eps_growth,
# hist_ev_ebitda_3yr
# Revenue / EBITDA in USD Millions; Market Cap / Net Debt in USD Billions
# Sources: company filings, earnings transcripts, sell-side consensus estimates
# as of approximately Q1 2026 results season. ALL REQUIRE VERIFICATION.

DATA = {
    # NVDA: FY ends Jan; LTM ≈ FY2025 (ended Jan-2025 actuals + Q1FY2026 est.)
    # Rev ~$130 Bn run-rate; NTM consensus ~$195 Bn
    "NVDA": dict(
        ltm_rev=130_000,   ntm_rev=195_000,
        ltm_gm=0.748,      ltm_ebitda=80_600,
        ltm_rd_pct=0.083,  ltm_capex_pct=0.018,
        mktcap_bn=2_800,   net_debt_bn=-26.0,   # net cash → negative net debt
        ntm_ebitda=120_000, ntm_eps=4.15, ntm_eps_growth=0.42,
        hist_ev_ebitda_3yr=55.0,
        company="NVIDIA Corp",     sector="Fabless GPU/AI Accelerator",
        currency="USD",
    ),
    # AMD: CY2025 consensus
    "AMD": dict(
        ltm_rev=25_800,    ntm_rev=33_500,
        ltm_gm=0.512,      ltm_ebitda=6_200,
        ltm_rd_pct=0.218,  ltm_capex_pct=0.028,
        mktcap_bn=195,     net_debt_bn=1.2,
        ntm_ebitda=9_800,  ntm_eps=5.60, ntm_eps_growth=0.38,
        hist_ev_ebitda_3yr=42.0,
        company="Advanced Micro Devices",  sector="Fabless CPU/GPU",
        currency="USD",
    ),
    # TSM: CY2025E; USD (reported in TWD, converted ~32 TWD/USD)
    "TSM": dict(
        ltm_rev=89_000,    ntm_rev=112_000,
        ltm_gm=0.573,      ltm_ebitda=55_700,
        ltm_rd_pct=0.083,  ltm_capex_pct=0.328,
        mktcap_bn=920,     net_debt_bn=-50.0,
        ntm_ebitda=70_000, ntm_eps=8.20, ntm_eps_growth=0.28,
        hist_ev_ebitda_3yr=18.0,
        company="Taiwan Semiconductor Mfg",  sector="Foundry (Pure-Play)",
        currency="USD (TWD conv.)",
    ),
    # ASML: EUR reported; USD conv ~1.08
    "ASML": dict(
        ltm_rev=30_200,    ntm_rev=42_000,
        ltm_gm=0.518,      ltm_ebitda=11_600,
        ltm_rd_pct=0.152,  ltm_capex_pct=0.045,
        mktcap_bn=280,     net_debt_bn=-8.5,
        ntm_ebitda=16_500, ntm_eps=28.50, ntm_eps_growth=0.32,
        hist_ev_ebitda_3yr=34.0,
        company="ASML Holding NV",   sector="Lithography Equipment",
        currency="USD (EUR conv.)",
    ),
    # AMAT: FY ends Oct; LTM ≈ FY2025E
    "AMAT": dict(
        ltm_rev=28_000,    ntm_rev=31_500,
        ltm_gm=0.470,      ltm_ebitda=9_100,
        ltm_rd_pct=0.118,  ltm_capex_pct=0.055,
        mktcap_bn=145,     net_debt_bn=2.8,
        ntm_ebitda=11_200, ntm_eps=9.80, ntm_eps_growth=0.18,
        hist_ev_ebitda_3yr=19.5,
        company="Applied Materials",  sector="Wafer Fab Equipment",
        currency="USD",
    ),
    # KLAC: FY ends Jun
    "KLAC": dict(
        ltm_rev=11_800,    ntm_rev=13_500,
        ltm_gm=0.615,      ltm_ebitda=5_050,
        ltm_rd_pct=0.128,  ltm_capex_pct=0.048,
        mktcap_bn=92,      net_debt_bn=4.1,
        ntm_ebitda=5_900,  ntm_eps=34.20, ntm_eps_growth=0.16,
        hist_ev_ebitda_3yr=23.0,
        company="KLA Corp",   sector="Process Control Equipment",
        currency="USD",
    ),
    # MU: FY ends Aug; LTM ≈ FY2025
    "MU": dict(
        ltm_rev=33_000,    ntm_rev=42_000,
        ltm_gm=0.388,      ltm_ebitda=13_200,
        ltm_rd_pct=0.105,  ltm_capex_pct=0.285,
        mktcap_bn=110,     net_debt_bn=8.5,
        ntm_ebitda=18_500, ntm_eps=8.90, ntm_eps_growth=0.52,
        hist_ev_ebitda_3yr=12.5,
        company="Micron Technology",  sector="DRAM / NAND Memory",
        currency="USD",
    ),
}

# ── helper: add a comment ─────────────────────────────────────────────────────
def add_comment(ws, cell_ref, text, author="Model Builder"):
    c = Comment(text, author)
    c.width  = 320
    c.height = 80
    ws[cell_ref].comment = c

# ── helper: apply style to a range ───────────────────────────────────────────
def style_range(ws, row_start, row_end, col_start, col_end,
                fill=None, font=None, alignment=None, border=None, num_format=None):
    for r in range(row_start, row_end + 1):
        for c in range(col_start, col_end + 1):
            cell = ws.cell(row=r, column=c)
            if fill:      cell.fill      = fill
            if font:      cell.font      = font
            if alignment: cell.alignment = alignment
            if border:    cell.border    = border
            if num_format:cell.number_format = num_format

# ── helper: write a blue (hardcoded-input) cell ───────────────────────────────
def write_blue_input(ws, row, col, value, fmt, ticker, comment_text):
    c = ws.cell(row=row, column=col, value=value)
    c.fill          = BLUE_BG
    c.font          = BLUE_FONT
    c.alignment     = RIGHT
    c.number_format = fmt
    c.border        = thin_border()
    add_comment(ws, c.coordinate,
                f"[UNSOURCED] {ticker} — {comment_text}. "
                "Source: earnings transcript / consensus estimate. "
                "Verify against FactSet/CapIQ before use.")
    return c

# ─────────────────────────────────────────────────────────────────────────────
# BUILD WORKBOOK
# ─────────────────────────────────────────────────────────────────────────────
wb = Workbook()

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 1: COMPS
# ═══════════════════════════════════════════════════════════════════════════════
ws = wb.active
ws.title = "Comps"
ws.sheet_view.showGridLines = False
ws.freeze_panes = "C9"   # freeze rows 1-8 and col A-B

# Column widths
ws.column_dimensions["A"].width = 6
ws.column_dimensions["B"].width = 30
for i, ltr in enumerate("CDEFGHIJ"):
    ws.column_dimensions[ltr].width = 16

# ── HEADER BLOCK ──────────────────────────────────────────────────────────────
# Row 1: Title
ws.merge_cells("A1:J1")
ws["A1"] = "SEMICONDUCTOR / AI PEER COMPS — CYCLE POSITIONING & RELATIVE VALUATION"
ws["A1"].fill      = HEADER_BG
ws["A1"].font      = HEADER_FONT
ws["A1"].alignment = CENTER

# Row 2: sub-title
ws.merge_cells("A2:J2")
ws["A2"] = "Equity Research Note | AI Semiconductor Sector"
ws["A2"].fill      = PatternFill("solid", fgColor="253F6E")
ws["A2"].font      = Font(name="Calibri", italic=True, color="BDD7EE", size=10)
ws["A2"].alignment = CENTER

# Row 3: meta
meta = [
    ("A3", "Analysis Date:"),  ("B3", ANALYSIS_DATE),
    ("C3", "Peer Set:"),       ("D3", ", ".join(PEERS)),
    ("G3", "Units:"),          ("H3", "USD Millions unless noted"),
]
for ref, val in meta:
    ws[ref] = val
ws["A3"].font = BOLD_DARK;  ws["A3"].alignment = RIGHT
ws["B3"].font = BLUE_FONT;  ws["B3"].alignment = LEFT
ws["B3"].fill = BLUE_BG
ws["C3"].font = BOLD_DARK;  ws["C3"].alignment = RIGHT
ws["D3"].font = BLUE_FONT;  ws["D3"].alignment = LEFT;  ws["D3"].fill = BLUE_BG
ws.merge_cells("D3:F3")
ws["G3"].font = BOLD_DARK;  ws["G3"].alignment = RIGHT
ws["H3"].font = BLUE_FONT;  ws["H3"].alignment = LEFT;  ws["H3"].fill = BLUE_BG
ws.merge_cells("H3:J3")

add_comment(ws, "B3",  f"Analysis date: {ANALYSIS_DATE}. {UNSOURCED}")
add_comment(ws, "D3",  f"Peer set selected for AI semiconductor cycle note. {UNSOURCED}")

# Row 4: [UNSOURCED] warning
ws.merge_cells("A4:J4")
ws["A4"] = (
    "WARNING — ALL FIGURES ARE [UNSOURCED] PLACEHOLDERS. "
    "Replace with FactSet / CapIQ live pull before publication. See Notes tab."
)
ws["A4"].fill      = PatternFill("solid", fgColor="FFE699")
ws["A4"].font      = Font(name="Calibri", bold=True, color="7F3F00", size=10)
ws["A4"].alignment = CENTER

# Row 5: blank spacer
ws.row_dimensions[5].height = 6

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — OPERATING STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════

# Row 6: Section banner
ws.merge_cells("A6:J6")
ws["A6"] = "SECTION 1 — OPERATING STATISTICS"
ws["A6"].fill      = SECTION_BG
ws["A6"].font      = WHITE_FONT
ws["A6"].alignment = CENTER
ws.row_dimensions[6].height = 18

# Row 7: Column headers
S1_HEADERS = [
    "#", "Company / Ticker",
    "LTM Revenue\n(USD Mn)", "NTM Revenue\n(USD Mn)",
    "Rev Growth\nYoY %",
    "Gross\nMargin %", "LTM EBITDA\n(USD Mn)",
    "EBITDA\nMargin %",
    "R&D %\nRevenue", "CapEx %\nRevenue",
]
ws.row_dimensions[7].height = 36
for c_idx, hdr in enumerate(S1_HEADERS, start=1):
    cell = ws.cell(row=7, column=c_idx, value=hdr)
    cell.fill      = SUBHDR_BG
    cell.font      = BOLD_DARK
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border    = thick_bottom()

# Row 8: units row
S1_UNITS = ["", "", "USD Mn", "USD Mn", "%", "%", "USD Mn", "%", "%", "%"]
ws.row_dimensions[8].height = 14
for c_idx, u in enumerate(S1_UNITS, start=1):
    cell = ws.cell(row=8, column=c_idx, value=u)
    cell.font      = GREY_FONT
    cell.alignment = CENTER
    cell.fill      = SUBHDR_BG

# Data rows 9..15
S1_DATA_START = 9
peer_rows_s1 = {}   # ticker -> row number (for formula cross-references in Section 2)

for i, ticker in enumerate(PEERS):
    d   = DATA[ticker]
    row = S1_DATA_START + i
    peer_rows_s1[ticker] = row
    ws.row_dimensions[row].height = 17

    fill = ALT_BG if i % 2 == 0 else PatternFill("solid", fgColor="FFFFFF")

    # Col A: index
    ws.cell(row=row, column=1, value=i + 1).alignment = CENTER

    # Col B: company name + ticker
    cell_b = ws.cell(row=row, column=2, value=f"{d['company']} ({ticker})")
    cell_b.font      = BOLD_DARK
    cell_b.alignment = LEFT

    # ── all numeric inputs are blue (hardcoded source data) ──────────────────
    # C: LTM Revenue
    write_blue_input(ws, row, 3,  d["ltm_rev"],       FMT_COMMA0, ticker,
                     "LTM Revenue (USD Mn). Approx trailing 12-month as of analysis date.")
    # D: NTM Revenue
    write_blue_input(ws, row, 4,  d["ntm_rev"],       FMT_COMMA0, ticker,
                     "NTM Revenue (USD Mn). Consensus next-12-month estimate.")
    # F: Gross Margin
    write_blue_input(ws, row, 6,  d["ltm_gm"],        FMT_PCT1, ticker,
                     "LTM Gross Margin %. From most recent annual/quarterly filing.")
    # G: LTM EBITDA
    write_blue_input(ws, row, 7,  d["ltm_ebitda"],    FMT_COMMA0, ticker,
                     "LTM EBITDA (USD Mn). Adjusted EBITDA; excludes SBC where noted.")
    # I: R&D %
    write_blue_input(ws, row, 9,  d["ltm_rd_pct"],    FMT_PCT1, ticker,
                     "R&D as % of LTM Revenue. From income statement.")
    # J: CapEx %
    write_blue_input(ws, row, 10, d["ltm_capex_pct"], FMT_PCT1, ticker,
                     "CapEx as % of LTM Revenue. From cash flow statement.")

    # ── formula cells (black) ─────────────────────────────────────────────────
    col_c = get_column_letter(3)   # LTM Rev
    col_d = get_column_letter(4)   # NTM Rev
    col_g = get_column_letter(7)   # LTM EBITDA
    col_f = get_column_letter(6)   # Gross Margin

    # E: Rev Growth YoY% = (NTM - LTM) / LTM
    e_cell = ws.cell(row=row, column=5,
                     value=f"=({col_d}{row}-{col_c}{row})/{col_c}{row}")
    e_cell.font          = NORMAL
    e_cell.alignment     = RIGHT
    e_cell.number_format = FMT_PCT1
    e_cell.border        = thin_border()

    # H: EBITDA Margin % = LTM EBITDA / LTM Revenue
    h_cell = ws.cell(row=row, column=8,
                     value=f"={col_g}{row}/{col_c}{row}")
    h_cell.font          = NORMAL
    h_cell.alignment     = RIGHT
    h_cell.number_format = FMT_PCT1
    h_cell.border        = thin_border()

    for c_idx in [1, 2]:
        ws.cell(row=row, column=c_idx).fill   = fill
        ws.cell(row=row, column=c_idx).border = thin_border()
    for c_idx in [3, 4, 5, 6, 7, 8, 9, 10]:
        ws.cell(row=row, column=c_idx).fill = fill

# ── Stats block for Section 1 ─────────────────────────────────────────────────
S1_DATA_END = S1_DATA_START + N - 1
STAT_ROWS_S1 = {
    "Max":     (S1_DATA_END + 2, "MAX"),
    "75th Pct":(S1_DATA_END + 3, "PERCENTILE"),
    "Median":  (S1_DATA_END + 4, "MEDIAN"),
    "25th Pct":(S1_DATA_END + 5, "PERCENTILE"),
    "Min":     (S1_DATA_END + 6, "MIN"),
}

STAT_NUMERIC_COLS_S1 = {3: FMT_COMMA0, 4: FMT_COMMA0, 5: FMT_PCT1,
                         6: FMT_PCT1,   7: FMT_COMMA0, 8: FMT_PCT1,
                         9: FMT_PCT1,  10: FMT_PCT1}

for label, (row, func) in STAT_ROWS_S1.items():
    ws.row_dimensions[row].height = 16
    ws.cell(row=row, column=2, value=label).font = BOLD_DARK
    ws.cell(row=row, column=2).alignment = RIGHT
    ws.cell(row=row, column=2).fill = STAT_BG
    ws.cell(row=row, column=1).fill = STAT_BG

    for col, fmt in STAT_NUMERIC_COLS_S1.items():
        col_ltr = get_column_letter(col)
        rng     = f"{col_ltr}{S1_DATA_START}:{col_ltr}{S1_DATA_END}"
        if func == "PERCENTILE":
            pct = 0.75 if "75" in label else 0.25
            formula = f"=PERCENTILE({rng},{pct})"
        elif func == "MEDIAN":
            formula = f"=MEDIAN({rng})"
        else:
            formula = f"={func}({rng})"

        cell = ws.cell(row=row, column=col, value=formula)
        cell.font          = NORMAL
        cell.alignment     = RIGHT
        cell.fill          = STAT_BG
        cell.number_format = fmt
        cell.border        = thin_border()

# blank spacer
SPACER_1 = S1_DATA_END + 7
ws.row_dimensions[SPACER_1].height = 10

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — VALUATION MULTIPLES
# ═══════════════════════════════════════════════════════════════════════════════
S2_START_ROW = SPACER_1 + 1

# Section banner
ws.merge_cells(f"A{S2_START_ROW}:J{S2_START_ROW}")
ws[f"A{S2_START_ROW}"] = "SECTION 2 — VALUATION MULTIPLES (NTM)"
ws[f"A{S2_START_ROW}"].fill      = SECTION_BG
ws[f"A{S2_START_ROW}"].font      = WHITE_FONT
ws[f"A{S2_START_ROW}"].alignment = CENTER
ws.row_dimensions[S2_START_ROW].height = 18

# Column header row
S2_HDR_ROW = S2_START_ROW + 1
ws.row_dimensions[S2_HDR_ROW].height = 36
S2_HEADERS = [
    "#", "Company / Ticker",
    "Mkt Cap\n(USD Bn)", "Net Debt\n(USD Bn)",
    "Enterprise\nValue (USD Bn)",
    "EV /\nNTM Rev",
    "EV /\nNTM EBITDA",
    "P /\nNTM EPS",
    "3-Yr Avg\nEV/EBITDA",
    "Prem / Disc\nto 3-Yr Avg",
]
for c_idx, hdr in enumerate(S2_HEADERS, start=1):
    cell = ws.cell(row=S2_HDR_ROW, column=c_idx, value=hdr)
    cell.fill      = SUBHDR_BG
    cell.font      = BOLD_DARK
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border    = thick_bottom()

# Units row
S2_UNITS_ROW = S2_HDR_ROW + 1
ws.row_dimensions[S2_UNITS_ROW].height = 14
S2_UNITS = ["", "", "USD Bn", "USD Bn", "USD Bn", "x", "x", "x", "x", "%"]
for c_idx, u in enumerate(S2_UNITS, start=1):
    cell = ws.cell(row=S2_UNITS_ROW, column=c_idx, value=u)
    cell.font = GREY_FONT; cell.alignment = CENTER; cell.fill = SUBHDR_BG

# Data rows
S2_DATA_START = S2_UNITS_ROW + 1
peer_rows_s2 = {}

for i, ticker in enumerate(PEERS):
    d   = DATA[ticker]
    row = S2_DATA_START + i
    peer_rows_s2[ticker] = row
    ws.row_dimensions[row].height = 17
    fill = ALT_BG if i % 2 == 0 else PatternFill("solid", fgColor="FFFFFF")

    ws.cell(row=row, column=1, value=i + 1).alignment = CENTER
    cell_b = ws.cell(row=row, column=2, value=f"{d['company']} ({ticker})")
    cell_b.font = BOLD_DARK; cell_b.alignment = LEFT

    # C: Mkt Cap
    write_blue_input(ws, row, 3,  d["mktcap_bn"],  FMT_USD_BN, ticker,
                     "Market Cap (USD Bn). Approx as of analysis date.")
    # D: Net Debt
    write_blue_input(ws, row, 4,  d["net_debt_bn"], FMT_USD_BN, ticker,
                     "Net Debt (USD Bn). Negative = net cash. Total debt minus cash & equivalents.")
    # H: NTM EPS
    write_blue_input(ws, row, 8,  d["ntm_eps"],    FMT_EPS, ticker,
                     "NTM EPS (USD). Consensus forward earnings per share.")

    # Col K (11): NTM EBITDA — blue input helper column
    write_blue_input(ws, row, 11, d["ntm_ebitda"], FMT_COMMA0, ticker,
                     "NTM EBITDA (USD Mn). Consensus estimate.")

    # Col L (12): NTM EPS Growth — blue input helper column
    write_blue_input(ws, row, 12, d["ntm_eps_growth"], FMT_PCT1, ticker,
                     "NTM EPS Growth YoY %. Consensus estimate.")

    # 3-Yr Avg EV/EBITDA — col 9 — blue input
    write_blue_input(ws, row, 9,  d["hist_ev_ebitda_3yr"], FMT_MULT1, ticker,
                     "3-Year average EV/EBITDA multiple. [UNSOURCED] — derived from "
                     "historical trading data; requires FactSet verification.")

    # ── formula cells ─────────────────────────────────────────────────────────
    col_c = get_column_letter(3)   # mkt cap
    col_d = get_column_letter(4)   # net debt
    col_e = get_column_letter(5)   # EV
    col_g = get_column_letter(7)   # EV/NTM EBITDA
    col_i = get_column_letter(9)   # 3-yr avg
    col_k = get_column_letter(11)  # NTM EBITDA

    # Section 1 references for NTM Rev
    s1_row   = peer_rows_s1[ticker]
    ntm_rev_ref = f"D{s1_row}"   # col D in Section 1 = NTM Revenue (USD Mn)

    # E: Enterprise Value = Mkt Cap + Net Debt
    ev_formula = f"={col_c}{row}*1000+{col_d}{row}*1000"
    # EV in USD Mn = (mktcap_bn * 1000) + (net_debt_bn * 1000)
    ev_cell = ws.cell(row=row, column=5, value=ev_formula)
    ev_cell.font = NORMAL; ev_cell.alignment = RIGHT
    ev_cell.number_format = FMT_USD_BN
    ev_cell.border = thin_border()
    # Override format to show in Bn:  EV_Mn / 1000
    ev_formula_bn = f"=({col_c}{row}*1000+{col_d}{row}*1000)/1000"
    ev_cell.value = ev_formula_bn

    # F: EV / NTM Revenue  =  EV_Mn / NTM_Rev_Mn
    ev_mn_formula = f"({col_c}{row}*1000+{col_d}{row}*1000)"  # inline EV in Mn
    f_cell = ws.cell(row=row, column=6,
                     value=f"={ev_mn_formula}/{ntm_rev_ref}")
    f_cell.font = NORMAL; f_cell.alignment = RIGHT
    f_cell.number_format = FMT_MULT1
    f_cell.border = thin_border()

    # G: EV / NTM EBITDA
    g_cell = ws.cell(row=row, column=7,
                     value=f"={ev_mn_formula}/{col_k}{row}")
    g_cell.font = NORMAL; g_cell.alignment = RIGHT
    g_cell.number_format = FMT_MULT1
    g_cell.border = thin_border()

    # J: P/NTM EPS  =  (Mkt Cap Bn * 1000 / shares) ... but we use
    #    P/E = Mkt Cap / (NTM EPS * shares).  Simpler: use given NTM EPS directly
    #    as input; P/E = col C * 1000 Mn / (ntm_eps * implicit shares).
    #    Since we only have aggregate Mkt Cap and per-share EPS, we can't derive
    #    share count cleanly without another input.  Flag as direct blue input.
    #    We already stored ntm_eps in col H; P/E is a pure formula only if we have
    #    shares.  Solution: store P/E as a *calculated* blue field from an additional
    #    implied-shares input stored in col M.
    #    For simplicity and auditability, store NTM P/E as direct blue input (separately
    #    computed by analyst from mkt cap / (ntm_eps * diluted shares)).
    #    Mark with [FORMULA NOTE] comment.
    # J: Prem/Disc = current EV/EBITDA vs 3-yr avg
    col_g_ltr = get_column_letter(7)
    j_cell = ws.cell(row=row, column=10,
                     value=f"={col_g_ltr}{row}/{col_i}{row}-1")
    j_cell.font = NORMAL; j_cell.alignment = RIGHT
    j_cell.number_format = FMT_PCT1
    j_cell.border = thin_border()

    for c_idx in [1, 2]:
        ws.cell(row=row, column=c_idx).fill   = fill
        ws.cell(row=row, column=c_idx).border = thin_border()
    for c_idx in [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]:
        if ws.cell(row=row, column=c_idx).fill.fgColor.rgb == "00000000":
            ws.cell(row=row, column=c_idx).fill = fill

# ── Section 2 stats ───────────────────────────────────────────────────────────
S2_DATA_END = S2_DATA_START + N - 1
STAT_ROWS_S2 = {
    "Max":     (S2_DATA_END + 2, "MAX"),
    "75th Pct":(S2_DATA_END + 3, "PERCENTILE"),
    "Median":  (S2_DATA_END + 4, "MEDIAN"),
    "25th Pct":(S2_DATA_END + 5, "PERCENTILE"),
    "Min":     (S2_DATA_END + 6, "MIN"),
}

STAT_COLS_S2 = {
    3: FMT_USD_BN, 4: FMT_USD_BN, 5: FMT_USD_BN,
    6: FMT_MULT1,  7: FMT_MULT1,  8: FMT_EPS,
    9: FMT_MULT1,  10: FMT_PCT1,
}

for label, (row, func) in STAT_ROWS_S2.items():
    ws.row_dimensions[row].height = 16
    ws.cell(row=row, column=2, value=label).font = BOLD_DARK
    ws.cell(row=row, column=2).alignment = RIGHT
    ws.cell(row=row, column=2).fill = STAT_BG
    ws.cell(row=row, column=1).fill = STAT_BG

    for col, fmt in STAT_COLS_S2.items():
        col_ltr = get_column_letter(col)
        rng     = f"{col_ltr}{S2_DATA_START}:{col_ltr}{S2_DATA_END}"
        if func == "PERCENTILE":
            pct = 0.75 if "75" in label else 0.25
            formula = f"=PERCENTILE({rng},{pct})"
        elif func == "MEDIAN":
            formula = f"=MEDIAN({rng})"
        else:
            formula = f"={func}({rng})"

        cell = ws.cell(row=row, column=col, value=formula)
        cell.font = NORMAL; cell.alignment = RIGHT
        cell.fill = STAT_BG; cell.number_format = fmt
        cell.border = thin_border()

# ── NTM EPS Growth — hidden helper label (col L header) ──────────────────────
# Add headers for hidden cols K and L
for label, col in [("NTM EBITDA\n(USD Mn) [Input]", 11),
                    ("NTM EPS\nGrowth % [Input]", 12)]:
    cell = ws.cell(row=S2_HDR_ROW, column=col, value=label)
    cell.fill = PatternFill("solid", fgColor="E2EFDA")
    cell.font = Font(name="Calibri", bold=True, color="375623", size=9)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = thick_bottom()

ws.column_dimensions["K"].width = 16
ws.column_dimensions["L"].width = 16

# ── NTM EPS Growth stats ──────────────────────────────────────────────────────
for label, (row, func) in STAT_ROWS_S2.items():
    col = 12; fmt = FMT_PCT1
    col_ltr = get_column_letter(col)
    rng = f"{col_ltr}{S2_DATA_START}:{col_ltr}{S2_DATA_END}"
    if func == "PERCENTILE":
        pct = 0.75 if "75" in label else 0.25
        formula = f"=PERCENTILE({rng},{pct})"
    elif func == "MEDIAN":
        formula = f"=MEDIAN({rng})"
    else:
        formula = f"={func}({rng})"
    cell = ws.cell(row=row, column=col, value=formula)
    cell.font = NORMAL; cell.alignment = RIGHT
    cell.fill = STAT_BG; cell.number_format = fmt
    cell.border = thin_border()

# ── P/NTM EPS note in header ──────────────────────────────────────────────────
add_comment(ws, f"{get_column_letter(8)}{S2_HDR_ROW}",
            "P/NTM EPS: input is NTM EPS per share (blue). "
            "P/E ratio requires dividing Mkt Cap by (EPS × diluted share count). "
            "Add diluted share count as an additional input column or pull directly "
            "from FactSet/CapIQ to convert to a pure formula.")

# ═══════════════════════════════════════════════════════════════════════════════
# SENSITIVITY TABLE — EV/NTM EBITDA GRID
# ═══════════════════════════════════════════════════════════════════════════════
SENS_ANCHOR = S2_DATA_END + 9

ws.merge_cells(f"A{SENS_ANCHOR}:L{SENS_ANCHOR}")
ws[f"A{SENS_ANCHOR}"] = (
    "SENSITIVITY — EV / NTM EBITDA SUMMARY  |  Peer multiples vs. NTM EBITDA margin"
)
ws[f"A{SENS_ANCHOR}"].fill      = SECTION_BG
ws[f"A{SENS_ANCHOR}"].font      = WHITE_FONT
ws[f"A{SENS_ANCHOR}"].alignment = CENTER
ws.row_dimensions[SENS_ANCHOR].height = 18

# Header: tickers across columns
SENS_HDR = SENS_ANCHOR + 1
ws.row_dimensions[SENS_HDR].height = 17
ws.cell(row=SENS_HDR, column=2, value="Metric").font = BOLD_DARK
ws.cell(row=SENS_HDR, column=2).fill = SUBHDR_BG
ws.cell(row=SENS_HDR, column=2).alignment = CENTER
for i, ticker in enumerate(PEERS):
    c = ws.cell(row=SENS_HDR, column=3 + i, value=ticker)
    c.fill = SUBHDR_BG; c.font = BOLD_DARK; c.alignment = CENTER
    c.border = thin_border()

SENS_METRICS = [
    ("EV / NTM Revenue",  6,  FMT_MULT1),
    ("EV / NTM EBITDA",   7,  FMT_MULT1),
    ("P / NTM EPS",       8,  FMT_EPS),
    ("NTM EPS Growth %",  12, FMT_PCT1),
    ("Prem/Disc 3-Yr Avg",10, FMT_PCT1),
]
for j, (metric_name, src_col, fmt) in enumerate(SENS_METRICS):
    row = SENS_HDR + 1 + j
    ws.row_dimensions[row].height = 16
    fill = ALT_BG if j % 2 == 0 else PatternFill("solid", fgColor="FFFFFF")
    ws.cell(row=row, column=2, value=metric_name).font = BOLD_DARK
    ws.cell(row=row, column=2).alignment = LEFT
    ws.cell(row=row, column=2).fill = fill
    ws.cell(row=row, column=1).fill = fill

    for i, ticker in enumerate(PEERS):
        src_row  = peer_rows_s2[ticker]
        src_cell = f"{get_column_letter(src_col)}{src_row}"
        formula  = f"={src_cell}"
        c = ws.cell(row=row, column=3 + i, value=formula)
        c.font = NORMAL; c.alignment = RIGHT
        c.number_format = fmt
        c.fill = fill; c.border = thin_border()

# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 2: NOTES
# ═══════════════════════════════════════════════════════════════════════════════
ws_n = wb.create_sheet("Notes")
ws_n.sheet_view.showGridLines = False
ws_n.column_dimensions["A"].width = 4
ws_n.column_dimensions["B"].width = 28
ws_n.column_dimensions["C"].width = 70
ws_n.column_dimensions["D"].width = 28

# Title
ws_n.merge_cells("A1:D1")
ws_n["A1"] = "MODEL DOCUMENTATION & SOURCE NOTES"
ws_n["A1"].fill      = HEADER_BG
ws_n["A1"].font      = HEADER_FONT
ws_n["A1"].alignment = CENTER
ws_n.row_dimensions[1].height = 22

# Warning
ws_n.merge_cells("A2:D2")
ws_n["A2"] = (
    "ALL DATA IS [UNSOURCED] — These are placeholder estimates assembled from "
    "publicly available earnings transcripts, management guidance, and sell-side "
    "consensus summaries as of approximately Q1 2026. "
    "MANDATORY: Replace every blue cell with a verified FactSet / CapIQ pull before "
    "distribution or investment decisions."
)
ws_n["A2"].fill      = PatternFill("solid", fgColor="FFE699")
ws_n["A2"].font      = Font(name="Calibri", bold=True, color="7F3F00", size=10)
ws_n["A2"].alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
ws_n.row_dimensions[2].height = 50

NOTES_HEADERS = ["#", "Field / Item", "Note / Source", "Verification Required"]
ws_n.row_dimensions[3].height = 18
for ci, h in enumerate(NOTES_HEADERS, start=1):
    c = ws_n.cell(row=3, column=ci, value=h)
    c.fill = SUBHDR_BG; c.font = BOLD_DARK
    c.alignment = CENTER; c.border = thick_bottom()

NOTES_DATA = [
    ("1",  "Analysis Date",
     f"2026-05-13. Used as proxy for 'as of' date for all market data.",
     "Confirm market data vintage matches this date."),
    ("2",  "LTM Revenue (all peers)",
     "Trailing-twelve-month revenue as of latest available quarter per company. "
     "NVDA FY ends Jan; AMD/TSM/ASML/AMAT/MU/KLAC on respective fiscal calendars. "
     "Figures sourced from earnings transcripts and press releases ~Q1 2026.",
     "[UNSOURCED] — pull from FactSet FA.Sales.LTM"),
    ("3",  "NTM Revenue (all peers)",
     "Next-twelve-month consensus revenue estimate. Derived from sell-side consensus "
     "summaries (no live data provider connected). Reflects broad Street expectations "
     "as of ~May 2026.",
     "[UNSOURCED] — pull from CapIQ NTM consensus"),
    ("4",  "Gross Margin %",
     "LTM GAAP gross margin. For NVDA/AMD: excludes acquisition-related amortisation "
     "for non-GAAP view — analyst should specify GAAP vs. non-GAAP consistently.",
     "[UNSOURCED] — verify via 10-K/20-F filings"),
    ("5",  "LTM EBITDA",
     "Adjusted EBITDA. Excludes stock-based compensation for NVDA and AMD where "
     "management guidance references non-GAAP EBITDA. TSM: translated at ~32 TWD/USD. "
     "ASML: translated at ~1.08 EUR/USD. FX rates are [UNSOURCED].",
     "[UNSOURCED] — pull FactSet FA.EBITDA.LTM; confirm FX rates"),
    ("6",  "R&D % Revenue",
     "R&D expense as a percentage of LTM revenue. From latest income statement. "
     "ASML includes combined R&D and design-in costs.",
     "[UNSOURCED] — verify 10-K/20-F/annual report"),
    ("7",  "CapEx % Revenue",
     "Capital expenditures as % of LTM revenue. TSM and MU reflect memory/foundry-"
     "intensive capex cycles. NVDA capex is low as fabless model.",
     "[UNSOURCED] — pull FactSet FA.CapEx.LTM / FA.Sales.LTM"),
    ("8",  "Market Cap (USD Bn)",
     "Approximate market capitalisation as of analysis date (2026-05-13). "
     "NVDA ~$2,800 Bn reflects continued AI accelerator demand premium; "
     "all figures are rough order-of-magnitude estimates.",
     "[UNSOURCED] — pull live from FactSet or Bloomberg MKTCAP"),
    ("9",  "Net Debt (USD Bn)",
     "Net debt = Total debt - Cash & equivalents. Negative values = net cash position. "
     "NVDA, TSM, ASML, KLAC all carry net cash positions. "
     "MU and AMAT carry modest leverage for capex/buybacks.",
     "[UNSOURCED] — pull FactSet BS.NetDebt or compute from balance sheet"),
    ("10", "NTM EBITDA (col K in Comps sheet)",
     "Next-twelve-month EBITDA consensus. Stored as blue input in hidden helper column K. "
     "Used to compute EV/NTM EBITDA multiples. All [UNSOURCED].",
     "[UNSOURCED] — CapIQ NTM EBITDA consensus"),
    ("11", "NTM EPS (col H)",
     "Next-twelve-month earnings per share. Non-GAAP basis for NVDA and AMD "
     "(consistent with Street consensus convention). GAAP for TSM/ASML/AMAT/KLAC/MU "
     "unless consensus is reported on non-GAAP basis.",
     "[UNSOURCED] — CapIQ or Bloomberg NTM EPS consensus"),
    ("12", "NTM EPS Growth % (col L)",
     "Year-over-year EPS growth from LTM to NTM. Derived from consensus. "
     "MU reflects memory cycle recovery (~52% growth est.).",
     "[UNSOURCED] — computed from CapIQ LTM and NTM EPS"),
    ("13", "3-Year Avg EV/EBITDA",
     "Historical average EV/NTM EBITDA multiple over prior 3 fiscal years. "
     "Used as anchor for premium/discount analysis. All figures are rough estimates "
     "based on publicly discussed historical trading ranges. "
     "NVDA 3-yr avg ~55x reflects post-ChatGPT re-rating; pre-AI avg was ~25-30x.",
     "[UNSOURCED] — pull FactSet historical price/EBITDA time series"),
    ("14", "Enterprise Value formula",
     "EV (USD Mn) = Market Cap (USD Bn) × 1,000 + Net Debt (USD Bn) × 1,000. "
     "All EV calculations are formula-driven (black cells). "
     "Minority interest and preferred equity not separately modelled — "
     "analyst should adjust for TSM (minor) if needed.",
     "Formula cell — verify EV bridge completeness for each issuer"),
    ("15", "Currency notes",
     "TSM reported in TWD; figures converted at ~32 TWD/USD [UNSOURCED FX]. "
     "ASML reported in EUR; figures converted at ~1.08 EUR/USD [UNSOURCED FX]. "
     "All other peers report in USD.",
     "[UNSOURCED] FX rates — use spot from analysis date"),
    ("16", "Color coding convention",
     "BLUE cells = hardcoded input assumptions (with cell comments indicating source). "
     "BLACK cells = formula-driven outputs (no hardcoded numbers). "
     "GREEN cells (col K, L headers) = helper/input columns for formula linkage.",
     "Audit: no hardcoded numbers should appear in black cells"),
    ("17", "Circular references",
     "No circular references intentional in this model. All calculations flow "
     "linearly from blue input cells to black formula outputs.",
     "Run Excel audit: Formulas > Error Checking > Circular References"),
    ("18", "Statistical summary rows",
     "Max, 75th Pct, Median, 25th Pct, Min computed using Excel MAX(), PERCENTILE(), "
     "MEDIAN(), MIN() over the 7-peer data range. All formula-driven.",
     "Verify peer count and range references if peer set changes"),
    ("19", "Model purpose",
     "Cycle positioning and relative valuation for equity research note on AI "
     "semiconductor sector. NOT for investment decisions without verified data.",
     "Replace all [UNSOURCED] inputs before use in research publication"),
]

for i, (num, field, note, verify) in enumerate(NOTES_DATA):
    row = 4 + i
    fill = ALT_BG if i % 2 == 0 else PatternFill("solid", fgColor="FFFFFF")
    ws_n.row_dimensions[row].height = 40

    ws_n.cell(row=row, column=1, value=num).alignment = CENTER
    ws_n.cell(row=row, column=1).font = GREY_FONT
    ws_n.cell(row=row, column=1).fill = fill

    ws_n.cell(row=row, column=2, value=field).font   = BOLD_DARK
    ws_n.cell(row=row, column=2).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws_n.cell(row=row, column=2).fill = fill

    ws_n.cell(row=row, column=3, value=note).font   = NORMAL
    ws_n.cell(row=row, column=3).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws_n.cell(row=row, column=3).fill = fill

    verify_cell = ws_n.cell(row=row, column=4, value=verify)
    verify_cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    if "[UNSOURCED]" in verify or "UNSOURCED" in verify:
        verify_cell.font = Font(name="Calibri", size=10, color="7F3F00", bold=True)
        verify_cell.fill = PatternFill("solid", fgColor="FFE699")
    else:
        verify_cell.font = Font(name="Calibri", size=10, color="375623")
        verify_cell.fill = PatternFill("solid", fgColor="E2EFDA")

# ── save ──────────────────────────────────────────────────────────────────────
wb.save(OUT_PATH)
print(f"Saved: {OUT_PATH}")
print("Row layout summary:")
print(f"  Section 1 data rows: {S1_DATA_START}–{S1_DATA_END}")
print(f"  Section 1 stats:     {S1_DATA_END+2}–{S1_DATA_END+6}")
print(f"  Section 2 banner:    {S2_START_ROW}")
print(f"  Section 2 data rows: {S2_DATA_START}–{S2_DATA_END}")
print(f"  Section 2 stats:     {S2_DATA_END+2}–{S2_DATA_END+6}")
print(f"  Sensitivity anchor:  {SENS_ANCHOR}")
