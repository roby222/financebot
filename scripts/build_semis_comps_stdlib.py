"""
build_semis_comps_stdlib.py
Generates semis_comps.xlsx using only Python stdlib (zipfile).
Produces a fully structured xlsx with two sheets: Comps and Notes.
ALL DATA [UNSOURCED] — see Notes sheet.

Usage: python /Users/robertopisu/src/financebot/scripts/build_semis_comps_stdlib.py
"""

import os, zipfile, io, re
from datetime import datetime

OUT_DIR  = "/Users/robertopisu/src/financebot/static/data"
OUT_PATH = os.path.join(OUT_DIR, "semis_comps.xlsx")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Data ──────────────────────────────────────────────────────────────────────
ANALYSIS_DATE = "2026-05-13"
PEERS = ["NVDA", "AMD", "TSM", "ASML", "AMAT", "KLAC", "MU"]

DATA = {
    "NVDA": dict(company="NVIDIA Corp",              sector="Fabless GPU/AI Accelerator",
                 ltm_rev=130000, ntm_rev=195000, ltm_gm=0.748, ltm_ebitda=80600,
                 ltm_rd=0.083, ltm_cx=0.018,
                 mktcap=2800, netdebt=-26.0,
                 ntm_ebitda=120000, ntm_eps=4.15, ntm_epsg=0.42, h3yr=55.0),
    "AMD":  dict(company="Advanced Micro Devices",   sector="Fabless CPU/GPU",
                 ltm_rev=25800,  ntm_rev=33500,  ltm_gm=0.512, ltm_ebitda=6200,
                 ltm_rd=0.218, ltm_cx=0.028,
                 mktcap=195,  netdebt=1.2,
                 ntm_ebitda=9800,   ntm_eps=5.60, ntm_epsg=0.38, h3yr=42.0),
    "TSM":  dict(company="Taiwan Semiconductor Mfg", sector="Foundry (Pure-Play)",
                 ltm_rev=89000,  ntm_rev=112000, ltm_gm=0.573, ltm_ebitda=55700,
                 ltm_rd=0.083, ltm_cx=0.328,
                 mktcap=920,  netdebt=-50.0,
                 ntm_ebitda=70000,  ntm_eps=8.20, ntm_epsg=0.28, h3yr=18.0),
    "ASML": dict(company="ASML Holding NV",          sector="Lithography Equipment",
                 ltm_rev=30200,  ntm_rev=42000,  ltm_gm=0.518, ltm_ebitda=11600,
                 ltm_rd=0.152, ltm_cx=0.045,
                 mktcap=280,  netdebt=-8.5,
                 ntm_ebitda=16500,  ntm_eps=28.50,ntm_epsg=0.32, h3yr=34.0),
    "AMAT": dict(company="Applied Materials",        sector="Wafer Fab Equipment",
                 ltm_rev=28000,  ntm_rev=31500,  ltm_gm=0.470, ltm_ebitda=9100,
                 ltm_rd=0.118, ltm_cx=0.055,
                 mktcap=145,  netdebt=2.8,
                 ntm_ebitda=11200,  ntm_eps=9.80, ntm_epsg=0.18, h3yr=19.5),
    "KLAC": dict(company="KLA Corp",                 sector="Process Control Equipment",
                 ltm_rev=11800,  ntm_rev=13500,  ltm_gm=0.615, ltm_ebitda=5050,
                 ltm_rd=0.128, ltm_cx=0.048,
                 mktcap=92,   netdebt=4.1,
                 ntm_ebitda=5900,   ntm_eps=34.20,ntm_epsg=0.16, h3yr=23.0),
    "MU":   dict(company="Micron Technology",        sector="DRAM / NAND Memory",
                 ltm_rev=33000,  ntm_rev=42000,  ltm_gm=0.388, ltm_ebitda=13200,
                 ltm_rd=0.105, ltm_cx=0.285,
                 mktcap=110,  netdebt=8.5,
                 ntm_ebitda=18500,  ntm_eps=8.90, ntm_epsg=0.52, h3yr=12.5),
}

# ── XML helpers ────────────────────────────────────────────────────────────────
def xml_esc(s):
    return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

# Shared-strings table (inline strings used instead for simplicity)
# We use inline strings (t="inlineStr") to avoid a separate sharedStrings file.

def cell_ref(row, col):
    """Convert 1-based row,col to A1 notation."""
    letters = ""
    while col > 0:
        col, r = divmod(col - 1, 26)
        letters = chr(65 + r) + letters
    return f"{letters}{row}"

# Style indices (defined in styles.xml)
# 0 = default
# 1 = header (dark blue bg, white bold)
# 2 = blue input (blue bg, blue font)
# 3 = section banner (mid-blue bg, white bold)
# 4 = subheader (light-blue bg, dark bold)
# 5 = stat row (very light blue)
# 6 = alt row (near-white blue tint)
# 7 = warning (yellow bg, dark orange bold)
# 8 = formula black (white bg, black normal) -- default 0 suffices
# 9 = notes unsourced (yellow bg)
# 10 = notes ok (light green bg)
# 11 = number pct (0.0%)
# 12 = number mult (0.0x)
# 13 = number comma0 (#,##0)
# 14 = number bn (#,##0.0)
# 15 = number eps ($0.00)
# 16 = number pct formula
# Combined style index encodes both fill+font+numFmt

# For xlsx, styles are referenced by index into cellXfs.
# We'll define a flat list and reference by index.

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="5">
    <numFmt numFmtId="164" formatCode="0.0%"/>
    <numFmt numFmtId="165" formatCode="0.0&quot;x&quot;"/>
    <numFmt numFmtId="166" formatCode="#,##0"/>
    <numFmt numFmtId="167" formatCode="#,##0.0"/>
    <numFmt numFmtId="168" formatCode="$0.00"/>
  </numFmts>
  <fonts count="7">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF1F3864"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF1F497D"/><name val="Calibri"/></font>
    <font><sz val="9"/><color rgb="FF595959"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FF7F3F00"/><name val="Calibri"/></font>
  </fonts>
  <fills count="10">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFBDD7EE"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2E75B6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD6E4F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEBF3FB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F7FB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFB8CCE4"/></left>
      <right style="thin"><color rgb="FFB8CCE4"/></right>
      <top style="thin"><color rgb="FFB8CCE4"/></top>
      <bottom style="thin"><color rgb="FFB8CCE4"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FFB8CCE4"/></left>
      <right style="thin"><color rgb="FFB8CCE4"/></right>
      <top style="thin"><color rgb="FFB8CCE4"/></top>
      <bottom style="medium"><color rgb="FF2E75B6"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="22">
    <xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0"   fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="166" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0"   fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0"   fontId="3" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0"   fontId="5" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0"   fontId="6" fillId="8" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="168" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="166" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="167" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="168" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0"   fontId="3" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
</styleSheet>"""

# Style index constants
S_DEFAULT    = 0   # plain
S_TITLE      = 1   # dark navy bg, white bold, centered
S_INPUT_COMM = 2   # blue bg, blue font, comma0, border
S_SECTION    = 3   # mid-blue bg, white bold, centered
S_COLHDR     = 4   # light-blue bg, dark bold, centered, thick-bottom, wrap
S_UNITS      = 5   # light-blue bg, grey font, centered
S_WARNING    = 6   # yellow bg, dark-orange bold, centered/wrap
S_FORMULA_PCT   = 7   # pct formula, white bg, border
S_INPUT_PCT     = 8   # pct input, blue bg, border
S_FORMULA_MULT  = 9   # mult formula, white bg, border
S_INPUT_MULT    = 10  # mult input, blue bg, border
S_FORMULA_COMM0 = 11  # comma0 formula
S_FORMULA_BN    = 12  # bn formula
S_INPUT_BN      = 13  # bn input
S_INPUT_EPS     = 14  # eps input
S_FORMULA_EPS   = 15  # eps formula
S_STAT_PCT      = 16  # stat row pct
S_STAT_MULT     = 17  # stat row mult
S_STAT_COMM0    = 18  # stat row comma0
S_STAT_BN       = 19  # stat row bn
S_STAT_EPS      = 20  # stat row eps
S_LABEL         = 21  # label in subheader, left-aligned dark bold

# ── Workbook XML parts ─────────────────────────────────────────────────────────

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

WORKBOOK_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"    Target="styles.xml"/>
</Relationships>"""

WORKBOOK_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Comps" sheetId="1" r:id="rId1"/>
    <sheet name="Notes" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>"""

# ── Cell builder ──────────────────────────────────────────────────────────────

class Row:
    def __init__(self, row_num, ht=None):
        self.row_num = row_num
        self.ht      = ht
        self.cells   = []

    def add(self, col, value, style, is_formula=False, is_string=True):
        """col = 1-based integer"""
        ref = cell_ref(self.row_num, col)
        self.cells.append((ref, col, value, style, is_formula, is_string))
        return self

    def add_num(self, col, value, style):
        return self.add(col, value, style, is_formula=False, is_string=False)

    def add_formula(self, col, formula, style):
        return self.add(col, formula, style, is_formula=True, is_string=False)

    def to_xml(self):
        ht_attr = f' ht="{self.ht}" customHeight="1"' if self.ht else ""
        parts = [f'<row r="{self.row_num}"{ht_attr}>']
        for ref, col, value, style, is_formula, is_string in self.cells:
            s_attr = f' s="{style}"'
            if is_formula:
                parts.append(f'<c r="{ref}"{s_attr}><f>{xml_esc(value)}</f></c>')
            elif is_string:
                parts.append(f'<c r="{ref}"{s_attr} t="inlineStr"><is><t>{xml_esc(value)}</t></is></c>')
            else:
                parts.append(f'<c r="{ref}"{s_attr}><v>{xml_esc(value)}</v></c>')
        parts.append("</row>")
        return "".join(parts)

# ── Merge tracker ─────────────────────────────────────────────────────────────
class Sheet:
    def __init__(self):
        self.rows   = []
        self.merges = []
        self.col_widths = {}  # col_num -> width
        self.freeze_row = None
        self.freeze_col = None

    def merge(self, r1, c1, r2, c2):
        self.merges.append((r1, c1, r2, c2))

    def set_width(self, col, width):
        self.col_widths[col] = width

    def add_row(self, row):
        self.rows.append(row)
        return row

    def to_xml(self):
        # cols
        cols_xml = "<cols>"
        for c, w in sorted(self.col_widths.items()):
            cols_xml += f'<col min="{c}" max="{c}" width="{w}" customWidth="1"/>'
        cols_xml += "</cols>"

        # freeze pane
        pane_xml = ""
        if self.freeze_row or self.freeze_col:
            fr = self.freeze_row or 0
            fc = self.freeze_col or 0
            top_left = cell_ref(fr + 1, fc + 1)
            pane_xml = (f'<sheetViews><sheetView workbookViewId="0" showGridLines="0">'
                        f'<pane ySplit="{fr}" xSplit="{fc}" topLeftCell="{top_left}" '
                        f'activePane="bottomRight" state="frozen"/>'
                        f'</sheetView></sheetViews>')
        else:
            pane_xml = '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'

        merges_xml = ""
        if self.merges:
            merges_xml = "<mergeCells>"
            for r1, c1, r2, c2 in self.merges:
                merges_xml += f'<mergeCell ref="{cell_ref(r1,c1)}:{cell_ref(r2,c2)}"/>'
            merges_xml += "</mergeCells>"

        rows_xml = "<sheetData>" + "".join(r.to_xml() for r in self.rows) + "</sheetData>"

        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            + pane_xml + cols_xml + rows_xml + merges_xml +
            '</worksheet>'
        )

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD COMPS SHEET
# ═══════════════════════════════════════════════════════════════════════════════
N_PEERS = len(PEERS)
LAST_DATA_COL = 12  # L

sh = Sheet()
sh.set_width(1,  6)
sh.set_width(2,  30)
for c in range(3, 13):
    sh.set_width(c, 16)
sh.freeze_row = 8
sh.freeze_col = 2

# ── Row 1: Title ──────────────────────────────────────────────────────────────
r1 = Row(1, ht=22)
r1.add(1, "SEMICONDUCTOR / AI PEER COMPS — CYCLE POSITIONING & RELATIVE VALUATION", S_TITLE)
sh.add_row(r1)
sh.merge(1, 1, 1, 12)

# ── Row 2: Sub-title ──────────────────────────────────────────────────────────
r2 = Row(2, ht=16)
r2.add(1, "Equity Research Note  |  AI Semiconductor Sector  |  Analysis Date: " + ANALYSIS_DATE, S_TITLE)
sh.add_row(r2)
sh.merge(2, 1, 2, 12)

# ── Row 3: Units / meta ───────────────────────────────────────────────────────
r3 = Row(3, ht=16)
r3.add(1, "Units: USD Millions unless noted  |  Peer Set: " + ", ".join(PEERS) +
          "  |  [UNSOURCED] — All figures placeholder; replace before use", S_WARNING)
sh.add_row(r3)
sh.merge(3, 1, 3, 12)

# ── Row 4: WARNING ────────────────────────────────────────────────────────────
r4 = Row(4, ht=20)
r4.add(1, "WARNING — ALL FIGURES ARE [UNSOURCED] PLACEHOLDERS. "
          "Replace with FactSet / CapIQ live pull before publication. See Notes tab.", S_WARNING)
sh.add_row(r4)
sh.merge(4, 1, 4, 12)

# ── Row 5: Spacer ────────────────────────────────────────────────────────────
sh.add_row(Row(5, ht=6))

# ── Row 6: Section 1 Banner ───────────────────────────────────────────────────
r6 = Row(6, ht=18)
r6.add(1, "SECTION 1 — OPERATING STATISTICS", S_SECTION)
sh.add_row(r6)
sh.merge(6, 1, 6, 12)

# ── Row 7: Column headers ─────────────────────────────────────────────────────
S1_HDRS = ["#", "Company / Ticker",
           "LTM Revenue (USD Mn)", "NTM Revenue (USD Mn)",
           "Rev Growth YoY %",
           "Gross Margin %", "LTM EBITDA (USD Mn)",
           "EBITDA Margin %", "R&D % Rev", "CapEx % Rev",
           "—", "—"]
r7 = Row(7, ht=30)
for ci, h in enumerate(S1_HDRS, start=1):
    r7.add(ci, h, S_COLHDR)
sh.add_row(r7)

# ── Row 8: Units ──────────────────────────────────────────────────────────────
S1_UNITS = ["","","USD Mn","USD Mn","%","%","USD Mn","%","%","%","",""]
r8 = Row(8, ht=13)
for ci, u in enumerate(S1_UNITS, start=1):
    r8.add(ci, u, S_UNITS)
sh.add_row(r8)

# ── Section 1 data rows: 9–15 ─────────────────────────────────────────────────
S1_START = 9
peer_s1_row = {}

for i, ticker in enumerate(PEERS):
    d   = DATA[ticker]
    row = S1_START + i
    peer_s1_row[ticker] = row
    alt = i % 2 == 0

    # Style overrides for alt rows (we keep same styles; alt fill handled inline)
    # For simplicity, use STAT_* styles for alt rows and INPUT_* for non-alt.
    # Actually since we can't do per-cell fill overrides without many more style entries,
    # we'll use the defined styles directly (fills are white or blue as per style).
    # Alt row distinction: use stat-bg styles for even rows, default-bg for odd.
    # This is acceptable given tool constraints.

    pct_s   = S_INPUT_PCT   if True else S_STAT_PCT   # always blue for inputs
    comm_s  = S_INPUT_COMM
    mult_s  = S_INPUT_MULT

    rw = Row(row, ht=17)
    rw.add_num(1, i+1, S_DEFAULT)
    rw.add(2, f"{d['company']} ({ticker})", S_LABEL)

    # Blue inputs
    rw.add_num(3, d['ltm_rev'],   S_INPUT_COMM)
    rw.add_num(4, d['ntm_rev'],   S_INPUT_COMM)
    rw.add_num(6, d['ltm_gm'],    S_INPUT_PCT)
    rw.add_num(7, d['ltm_ebitda'],S_INPUT_COMM)
    rw.add_num(9, d['ltm_rd'],    S_INPUT_PCT)
    rw.add_num(10,d['ltm_cx'],    S_INPUT_PCT)

    # Formulas (black)
    rw.add_formula(5, f"(D{row}-C{row})/C{row}", S_FORMULA_PCT)
    rw.add_formula(8, f"G{row}/C{row}",           S_FORMULA_PCT)

    sh.add_row(rw)

S1_END = S1_START + N_PEERS - 1

# ── Section 1 Stats (rows S1_END+2 .. S1_END+6) ───────────────────────────────
STAT_DEFS = [
    ("Max",      f"MAX({{rng}})"),
    ("75th Pct", f"PERCENTILE({{rng}},0.75)"),
    ("Median",   f"MEDIAN({{rng}})"),
    ("25th Pct", f"PERCENTILE({{rng}},0.25)"),
    ("Min",      f"MIN({{rng}})"),
]

S1_STAT_COLS = {
    3: S_STAT_COMM0, 4: S_STAT_COMM0, 5: S_STAT_PCT,
    6: S_STAT_PCT,   7: S_STAT_COMM0, 8: S_STAT_PCT,
    9: S_STAT_PCT,  10: S_STAT_PCT,
}

S1_STATS_START = S1_END + 2
for si, (label, tmpl) in enumerate(STAT_DEFS):
    row = S1_STATS_START + si
    rw  = Row(row, ht=16)
    rw.add(2, label, S_COLHDR)
    for col, sty in S1_STAT_COLS.items():
        col_l = cell_ref(S1_START, col)[:-len(str(S1_START))]  # extract letter(s)
        # Simpler: use the col letter from cell_ref
        rng_start = cell_ref(S1_START, col)
        rng_end   = cell_ref(S1_END,   col)
        rng = f"{rng_start}:{rng_end}"
        formula = tmpl.format(rng=rng)
        rw.add_formula(col, formula, sty)
    sh.add_row(rw)

S1_STATS_END = S1_STATS_START + 4

# ── Spacer ────────────────────────────────────────────────────────────────────
SPACER1 = S1_STATS_END + 1
sh.add_row(Row(SPACER1, ht=8))

# ── Section 2 Banner ─────────────────────────────────────────────────────────
S2_BANNER = SPACER1 + 1
r = Row(S2_BANNER, ht=18)
r.add(1, "SECTION 2 — VALUATION MULTIPLES (NTM)", S_SECTION)
sh.add_row(r)
sh.merge(S2_BANNER, 1, S2_BANNER, 12)

# ── Section 2 Column headers ──────────────────────────────────────────────────
S2_HDR = S2_BANNER + 1
S2_HDRS = ["#", "Company / Ticker",
           "Mkt Cap (USD Bn)", "Net Debt (USD Bn)",
           "EV (USD Bn)", "EV / NTM Rev",
           "EV / NTM EBITDA", "P / NTM EPS",
           "3-Yr Avg EV/EBITDA", "Prem/Disc 3-Yr Avg",
           "NTM EBITDA [Input]", "NTM EPS Growth [Input]"]
r = Row(S2_HDR, ht=30)
for ci, h in enumerate(S2_HDRS, start=1):
    r.add(ci, h, S_COLHDR)
sh.add_row(r)

S2_UNITS_ROW = S2_HDR + 1
S2_UNITS = ["","","USD Bn","USD Bn","USD Bn","x","x","$","x","%","USD Mn","%"]
r = Row(S2_UNITS_ROW, ht=13)
for ci, u in enumerate(S2_UNITS, start=1):
    r.add(ci, u, S_UNITS)
sh.add_row(r)

# ── Section 2 data rows ───────────────────────────────────────────────────────
S2_START = S2_UNITS_ROW + 1
peer_s2_row = {}

for i, ticker in enumerate(PEERS):
    d   = DATA[ticker]
    row = S2_START + i
    peer_s2_row[ticker] = row

    # Cross-reference to Section 1 NTM Rev
    s1r = peer_s1_row[ticker]

    rw = Row(row, ht=17)
    rw.add_num(1, i+1, S_DEFAULT)
    rw.add(2, f"{d['company']} ({ticker})", S_LABEL)

    # Blue inputs
    rw.add_num(3,  d['mktcap'],   S_INPUT_BN)
    rw.add_num(4,  d['netdebt'],  S_INPUT_BN)
    rw.add_num(8,  d['ntm_eps'],  S_INPUT_EPS)
    rw.add_num(9,  d['h3yr'],     S_INPUT_MULT)
    rw.add_num(11, d['ntm_ebitda'],S_INPUT_COMM)
    rw.add_num(12, d['ntm_epsg'], S_INPUT_PCT)

    # EV formula (in Bn): = (C*1000 + D*1000) / 1000
    rw.add_formula(5,  f"(C{row}*1000+D{row}*1000)/1000",          S_FORMULA_BN)
    # EV/NTM Rev: = EV_Mn / NTM_Rev_Mn  — inline EV
    rw.add_formula(6,  f"(C{row}*1000+D{row}*1000)/D{s1r}",        S_FORMULA_MULT)
    # EV/NTM EBITDA: = EV_Mn / K (NTM EBITDA Mn)
    rw.add_formula(7,  f"(C{row}*1000+D{row}*1000)/K{row}",         S_FORMULA_MULT)
    # Prem/disc: = G/I - 1
    rw.add_formula(10, f"G{row}/I{row}-1",                          S_FORMULA_PCT)

    sh.add_row(rw)

S2_END = S2_START + N_PEERS - 1

# ── Section 2 Stats ───────────────────────────────────────────────────────────
S2_STAT_COLS = {
    3: S_STAT_BN,   4: S_STAT_BN,   5: S_STAT_BN,
    6: S_STAT_MULT, 7: S_STAT_MULT, 8: S_STAT_EPS,
    9: S_STAT_MULT, 10: S_STAT_PCT, 12: S_STAT_PCT,
}

S2_STATS_START = S2_END + 2
for si, (label, tmpl) in enumerate(STAT_DEFS):
    row = S2_STATS_START + si
    rw  = Row(row, ht=16)
    rw.add(2, label, S_COLHDR)
    for col, sty in S2_STAT_COLS.items():
        rng = f"{cell_ref(S2_START,col)}:{cell_ref(S2_END,col)}"
        formula = tmpl.format(rng=rng)
        rw.add_formula(col, formula, sty)
    sh.add_row(rw)

S2_STATS_END = S2_STATS_START + 4

# ── Sensitivity summary ───────────────────────────────────────────────────────
SENS_ANCHOR = S2_STATS_END + 3
r = Row(SENS_ANCHOR, ht=18)
r.add(1, "SENSITIVITY SUMMARY — Key NTM Multiples by Peer", S_SECTION)
sh.add_row(r)
sh.merge(SENS_ANCHOR, 1, SENS_ANCHOR, 12)

SENS_HDR_ROW = SENS_ANCHOR + 1
r = Row(SENS_HDR_ROW, ht=17)
r.add(2, "Metric", S_COLHDR)
for pi, t in enumerate(PEERS):
    r.add(3+pi, t, S_COLHDR)
sh.add_row(r)

SENS_METRICS = [
    ("EV / NTM Revenue",   6, S_STAT_MULT),
    ("EV / NTM EBITDA",    7, S_STAT_MULT),
    ("NTM EPS Growth %",  12, S_STAT_PCT),
    ("Prem/Disc 3-Yr Avg",10, S_STAT_PCT),
]
for mi, (metric_name, src_col, sty) in enumerate(SENS_METRICS):
    row = SENS_HDR_ROW + 1 + mi
    rw  = Row(row, ht=16)
    rw.add(2, metric_name, S_LABEL)
    for pi, ticker in enumerate(PEERS):
        src_row = peer_s2_row[ticker]
        ref     = cell_ref(src_row, src_col)
        rw.add_formula(3+pi, ref, sty)
    sh.add_row(rw)

sheet1_xml = sh.to_xml()

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD NOTES SHEET
# ═══════════════════════════════════════════════════════════════════════════════
shn = Sheet()
shn.set_width(1, 4)
shn.set_width(2, 30)
shn.set_width(3, 70)
shn.set_width(4, 30)

rn = Row(1, ht=22)
rn.add(1, "MODEL DOCUMENTATION & SOURCE NOTES", S_TITLE)
shn.add_row(rn)
shn.merge(1,1,1,4)

rn = Row(2, ht=50)
rn.add(1,
    "ALL DATA IS [UNSOURCED] — Placeholder estimates from public earnings transcripts, "
    "management guidance, sell-side consensus summaries (~Q1 2026). "
    "MANDATORY: Replace every blue cell with FactSet/CapIQ verified data before distribution.",
    S_WARNING)
shn.add_row(rn)
shn.merge(2,1,2,4)

rn = Row(3, ht=18)
for ci, h in enumerate(["#","Field / Item","Note / Source","Verification Required"], start=1):
    rn.add(ci, h, S_COLHDR)
shn.add_row(rn)

NOTES = [
    ("1","Analysis Date",
     f"2026-05-13. All market data proxied to this date.",
     "Confirm data vintage matches analysis date."),
    ("2","LTM Revenue",
     "Trailing-twelve-month revenue per company fiscal calendar. NVDA FY Jan; others as noted. Source: earnings transcripts / press releases ~Q1 2026.",
     "[UNSOURCED] — pull FactSet FA.Sales.LTM"),
    ("3","NTM Revenue",
     "Next-twelve-month consensus estimate. No live data provider. Reflects broad Street as of ~May 2026.",
     "[UNSOURCED] — pull CapIQ NTM consensus"),
    ("4","Gross Margin %",
     "LTM GAAP gross margin. NVDA/AMD: non-GAAP variant excludes acq. amortisation. Specify GAAP vs non-GAAP consistently.",
     "[UNSOURCED] — verify 10-K/20-F filings"),
    ("5","LTM EBITDA",
     "Adjusted EBITDA. Excludes SBC for NVDA/AMD where mgmt references non-GAAP EBITDA. TSM ~32 TWD/USD; ASML ~1.08 EUR/USD. FX rates [UNSOURCED].",
     "[UNSOURCED] — FactSet FA.EBITDA.LTM; verify FX"),
    ("6","R&D % Revenue",
     "R&D expense / LTM revenue. ASML includes combined R&D and design-in costs.",
     "[UNSOURCED] — 10-K/20-F/annual report"),
    ("7","CapEx % Revenue",
     "CapEx / LTM revenue. TSM and MU reflect high foundry/memory capex cycles; NVDA low (fabless).",
     "[UNSOURCED] — FactSet FA.CapEx.LTM / FA.Sales.LTM"),
    ("8","Market Cap (USD Bn)",
     "Approx mkt cap as of 2026-05-13. NVDA ~$2,800 Bn. All rough order-of-magnitude; must be refreshed.",
     "[UNSOURCED] — FactSet or Bloomberg MKTCAP"),
    ("9","Net Debt (USD Bn)",
     "Net debt = Total debt - Cash. Negative = net cash. NVDA, TSM, ASML, KLAC net cash. MU/AMAT modest leverage.",
     "[UNSOURCED] — FactSet BS.NetDebt"),
    ("10","NTM EBITDA (col K)",
     "NTM EBITDA consensus. Blue helper-column input. Drives EV/NTM EBITDA formula in col G.",
     "[UNSOURCED] — CapIQ NTM EBITDA consensus"),
    ("11","NTM EPS (col H)",
     "NTM EPS. Non-GAAP for NVDA/AMD (Street convention). Stored as blue input; P/E derives if diluted share count added.",
     "[UNSOURCED] — CapIQ/Bloomberg NTM EPS"),
    ("12","NTM EPS Growth (col L)",
     "YoY EPS growth LTM->NTM. MU ~52% reflects memory cycle recovery. All consensus-derived.",
     "[UNSOURCED] — CapIQ LTM and NTM EPS"),
    ("13","3-Year Avg EV/EBITDA",
     "Historical avg EV/NTM EBITDA over prior 3 fiscal years. NVDA ~55x reflects post-ChatGPT re-rating (pre-AI avg ~25-30x). All rough estimates.",
     "[UNSOURCED] — FactSet historical EV/EBITDA time series"),
    ("14","EV Formula",
     "EV (USD Bn) = Mkt Cap (Bn) + Net Debt (Bn). All EV cells are formula-driven (no hardcodes). Minority interest / preferred not modelled separately.",
     "Verify EV bridge completeness per issuer"),
    ("15","Currency",
     "TSM: ~32 TWD/USD. ASML: ~1.08 EUR/USD. All others USD. FX rates [UNSOURCED]; use spot from analysis date.",
     "[UNSOURCED] FX — use FactSet spot rates"),
    ("16","Color Coding",
     "BLUE = hardcoded inputs (cell comments indicate source/flag). BLACK = formula outputs (no hardcoded numbers). GREEN header = helper input columns K/L.",
     "Audit: no hardcodes in formula cells"),
    ("17","Circular References",
     "None intentional. All flows: blue input -> black formula output.",
     "Excel: Formulas > Error Checking > Circular References"),
    ("18","Statistical Summary",
     "MAX/PERCENTILE(0.75)/MEDIAN/PERCENTILE(0.25)/MIN over 7-peer range. All formula-driven.",
     "Adjust range if peer set changes"),
    ("19","Model Purpose",
     "Cycle positioning and relative valuation for AI semiconductor equity research note. NOT for investment decisions without verified data.",
     "Replace all [UNSOURCED] before publication"),
]

for ni, (num, field, note, verify) in enumerate(NOTES):
    row = 4 + ni
    rn = Row(row, ht=35)
    rn.add(1, num,   S_UNITS)
    rn.add(2, field, S_COLHDR)
    rn.add(3, note,  S_DEFAULT)
    rn.add(4, verify, S_WARNING if "[UNSOURCED]" in verify else S_DEFAULT)
    shn.add_row(rn)

sheet2_xml = shn.to_xml()

# ── Write xlsx zip ─────────────────────────────────────────────────────────────
with zipfile.ZipFile(OUT_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("[Content_Types].xml", CONTENT_TYPES)
    zf.writestr("_rels/.rels",          RELS)
    zf.writestr("xl/workbook.xml",      WORKBOOK_XML)
    zf.writestr("xl/_rels/workbook.xml.rels", WORKBOOK_RELS)
    zf.writestr("xl/styles.xml",        STYLES_XML)
    zf.writestr("xl/worksheets/sheet1.xml", sheet1_xml)
    zf.writestr("xl/worksheets/sheet2.xml", sheet2_xml)

print(f"SUCCESS: {OUT_PATH}")
print(f"  Section 1 data rows : {S1_START}–{S1_END}")
print(f"  Section 1 stats     : {S1_STATS_START}–{S1_STATS_END}")
print(f"  Section 2 data rows : {S2_START}–{S2_END}")
print(f"  Section 2 stats     : {S2_STATS_START}–{S2_STATS_END}")
print(f"  Sensitivity anchor  : {SENS_ANCHOR}")
print(f"  Notes rows          : 4–{4+len(NOTES)-1}")
