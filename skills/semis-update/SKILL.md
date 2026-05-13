---
name: semis-update
description: >
  Aggiorna automaticamente gli indicatori del Semis Monitor e la thesis SEMI dopo un evento
  catalizzatore (earnings, dati mensili, annunci). Lancia la skill di equity-research appropriata,
  estrae i segnali rilevanti e riscrive sm_DEFAULTS in static/index.html + theses/SEMI_thesis.md.
  Usare ogni volta che un evento del catalyst calendar del monitor è appena avvenuto:
  NVDA earnings, TSMC mensile/trimestrale, hyperscaler Q earnings, SK Hynix/Micron/Samsung,
  AMD Advancing AI, KLAC/AMAT earnings.
compatibility: Requires internet access. Designed for FinancePalmirioBot project.
metadata:
  author: roby222
  version: "1.0"
---

## Quando usarla

Lancia questa skill **entro 24 ore** da ciascuno di questi eventi (vedi calendario nel monitor):

| Evento | Indicatori impattati | Sub-skill da usare |
|---|---|---|
| NVDA earnings (Q trimestrale) | `nvda_inv` (inventory days) | `equity-research:earnings` |
| TSMC monthly revenue | `cowos` (CoWoS utilization) | `equity-research:earnings` |
| TSMC quarterly earnings | `cowos` + `hyperscaler` | `equity-research:earnings` |
| SK Hynix / Micron / Samsung earnings | `hbm3e` + `memory_capex` | `equity-research:earnings` |
| Hyperscaler Q earnings (MSFT/GOOGL/META/AMZN) | `hyperscaler` | `equity-research:earnings` |
| AMD Advancing AI / quarterly | `amd_rocm` | `equity-research:earnings` |
| KLAC / AMAT earnings | aggiorna thesis dashboard | `equity-research:earnings` |
| Computex / roadmap annunci | `amd_rocm` + nota thesis | `equity-research:earnings-preview` |

---

## Procedura

### Step 1 — Identifica l'evento

Ricevi in input il ticker o l'evento appena avvenuto. Se non specificato, chiedi:
> "Quale evento è appena avvenuto? (es. NVDA earnings, TSMC monthly, SK Hynix Q2)"

### Step 2 — Lancia la sub-skill di analisi appropriata

Usa la skill `equity-research:earnings` passando il ticker e il focus sulle metriche
rilevanti per il monitor. Istruzioni specifiche per ogni caso:

**NVDA earnings:**
```
equity-research:earnings — NVDA
Focus su: data center revenue QoQ, gross margin, inventory days (Inventories/COGS×90),
channel commentary ("digestion"/"push-out"/"pull-in"), CoWoS supply, guidance language.
Estrai: inventory_days (numero), status (green <65 / yellow 65-90 / red >90),
signal (stringa descrittiva 1-2 frasi).
```

**TSMC monthly revenue o quarterly:**
```
equity-research:earnings — TSM
Focus su: revenue MoM/QoQ, CoWoS capacity (wafers/month), CoWoS utilization %,
N2/N3 utilization, packaging lead times, guidance linguaggio.
Estrai: cowos_utilization (%), cowos_capacity_k_wpm, status (green >90% / yellow 75-90% / red <75%),
signal (stringa descrittiva).
```

**SK Hynix / Micron / Samsung:**
```
equity-research:earnings — [ticker]
Focus su: HBM3E ASP ($/GB blended), HBM pricing trend QoQ/HoH, capex guidance,
SK Hynix NVDA allocation %, Samsung HBM qualification status.
Estrai: hbm_price ($/GB), hbm_trend_hoh_pct (%), status (green flat/+ / yellow -5/-15% / red <-15%),
memory_capex_aggregate_bn ($ bn), signal.
```

**Hyperscaler Q earnings (MSFT, GOOGL, META, AMZN — analizzali insieme):**
```
equity-research:earnings — [MSFT/GOOGL/META/AMZN]
Focus su: capex guidance update, linguaggio su AI infra 2027 ("continued"/"accelerating" vs
"moderating"/"efficiency"/"rationalize"), menzioni custom ASIC vs GPU, sovereign AI commentary.
Estrai: capex_language_score (green=bullish / yellow=neutral / red=decelerating),
capex_2027_signals (lista keyword rilevanti), signal.
```

**AMD quarterly / Advancing AI:**
```
equity-research:earnings — AMD
Focus su: MI-series revenue, ROCm deployment mention, design wins hyperscaler,
PyTorch/framework support annunci.
Estrai: amd_ai_revenue_bn ($), rocm_adoption (%), status (green/yellow/red),
signal.
```

### Step 3 — Leggi i valori correnti in sm_DEFAULTS

Leggi `static/index.html` e individua il blocco `const sm_DEFAULTS = {` — specificatamente
l'array `indicators` e il campo `calendar`. Localizza l'indicatore da aggiornare tramite il suo `id`.

I campi da aggiornare per ciascun indicatore sono:
- `value` — valore numerico corrente
- `status` — `"green"` / `"yellow"` / `"red"`
- `signal` — stringa HTML con il segnale aggiornato (può contenere `<b>` per enfasi)
- `history` — array dei valori storici: rimuovi il primo elemento, aggiungi il nuovo valore in fondo
- `labels` — array delle etichette: rimuovi la prima, aggiungi la label del nuovo periodo (es. `"Q2 26"`)
- `lastFetched` — imposta a `null` (verrà aggiornato dal browser al prossimo fetch)

### Step 4 — Aggiorna sm_DEFAULTS in static/index.html

Usa lo strumento Edit per aggiornare i campi dell'indicatore specifico.
**Non toccare altri indicatori o altri campi del file.**

Esempio di edit per `nvda_inv` dopo NVDA Q1 FY27:
```
old: value:55, unit:"giorni (Inv / COGS × 90)",
     history:[48,50,52,50,53,55], labels:["Q4 24","Q1 25","Q2 25","Q3 25","Q4 25","Q1 26"],
     status:"yellow",
     signal:"Threshold warning: <b>&gt;70 giorni</b>. Lieve uptick ultimi due trimestri.",

new: value:[NUOVO_VALORE], unit:"giorni (Inv / COGS × 90)",
     history:[50,52,50,53,55,[NUOVO_VALORE]], labels:["Q1 25","Q2 25","Q3 25","Q4 25","Q1 26","Q2 26"],
     status:"[NUOVO_STATUS]",
     signal:"[NUOVO_SIGNAL_HTML]",
```

### Step 5 — Aggiorna il catalyst calendar

Se l'evento era nel calendar di sm_DEFAULTS, aggiorna il campo `matters` dell'evento
con il takeaway chiave dell'analisi (max 80 caratteri). Questo serve come "memo" per
il prossimo refresh.

### Step 6 — Aggiorna theses/SEMI_thesis.md

Aggiungi una riga al **Version Log** della thesis:
```markdown
| v1.X | YYYY-MM-DD | [Evento]. [Indicatori aggiornati]. [Implicazione per il verdict]. |
```

Se il nuovo stato degli indicatori cambia il verdict della thesis (es. da ACCUMULA a HOLD),
aggiorna anche:
- `sm_THESIS.verdict` in `static/index.html` (campo `verdict:` in `const sm_THESIS`)
- Il badge nel file markdown (`**Status:** ACCUMULATE (with conditions)`)
- La sezione **§9 VERDICT** del file markdown con il razionale aggiornato

### Step 7 — Aggiorna CALENDAR.txt

Leggi `skills/semis-update/CALENDAR.txt` e:

1. Marca l'evento appena processato: sostituisci `[ ]` con `[✓]` sulla riga corrispondente
2. Se esiste un evento `[!]` precedente, rimuovi il `[!]` (era il precedente "prossimo")
3. Individua il prossimo evento ancora `[ ]` in ordine cronologico e marcalo con `[!]`
4. Aggiorna la riga `Aggiornato:` in testa al file con la data odierna (formato YYYY-MM-DD)
5. Se l'evento ha prodotto un segnale importante (es. RED su un indicatore), aggiungi
   una nota indentata sotto la riga `[✓]`:
   ```
   [✓] 28 mag  NVDA FY27 Q1 earnings
               → inv_days: 62 (GREEN) · nessun digestion signal
   ```

### Step 8 — Commit

```bash
git add static/index.html theses/SEMI_thesis.md skills/semis-update/CALENDAR.txt
git commit -m "update: semis monitor post-[TICKER] [PERIOD] — [headline 1 frase]"
git push origin main
```

---

## Regole di aggiornamento status

| Indicatore | GREEN | YELLOW | RED |
|---|---|---|---|
| `hbm3e` — HBM3E pricing | Flat / +5% HoH | −5% / −15% HoH | < −15% HoH |
| `cowos` — CoWoS utilization | > 90% | 75–90% | < 75% |
| `hyperscaler` — Capex language | "Accelerating" / "constrained" | "Moderating" / "optimizing" | "Pause" / flat/down 2027 |
| `nvda_inv` — NVDA inventory days | < 65 giorni | 65–90 giorni | > 90 giorni |
| `memory_capex` — Memory capex aggregate | In crescita YoY | Flat / guidance cauta | Pausa coordinata (tutti e 3) |
| `amd_rocm` — AMD/ROCm adoption | ROCm growth < 30% CUDA rate | 30–70% CUDA rate | > 70% CUDA rate YoY |

---

## Regole di aggiornamento verdict SEMI thesis

| Condizione | Verdict |
|---|---|
| 0 indicatori RED, ≤ 2 YELLOW | **ACCUMULATE** |
| 1 indicatore RED oppure ≥ 3 YELLOW | **HOLD** |
| 2+ indicatori RED oppure stop-loss thesis scattato | **REDUCE** |
| Tutti e 4 gli stop-loss scattati | **AVOID** |

---

## Esempio completo — NVDA FY27 Q1 (28 mag 2026)

**Input:** "NVDA ha appena riportato FY27 Q1"

**Step 2:** Lancia `equity-research:earnings` su NVDA con focus inventory days,
gross margin, data center revenue, guidance language.

**Step 3:** Dai risultati dell'analisi estrai:
- inventory_days = [valore dal 10-Q]
- status = green/yellow/red secondo soglie
- signal = frase con il takeaway

**Step 4:** Edita `static/index.html`, blocco `nvda_inv`:
- aggiorna `value`, `status`, `signal`, `history`, `labels`

**Step 5:** Aggiorna nel calendar il campo `matters` dell'entry NVDA FY27 Q1
con il takeaway (es. "Inv days: 62 — GREEN. Guida Q2 solida, no digestion signal").

**Step 6:** In `theses/SEMI_thesis.md` aggiungi:
```
| v1.1 | 2026-05-29 | Post NVDA FY27 Q1. nvda_inv aggiornato a 62 giorni (GREEN). Nessun segnale digestion. Verdict confermato ACCUMULATE. |
```

**Step 7:** Commit + push.

---

## Note

- **Non cercare di aggiornare indicatori senza un dato reale**: se l'earnings call non menziona
  esplicitamente il valore (es. NVDA non riporta mai "CoWoS utilization"), usa la sub-skill
  `equity-research:earnings` per estrarre il proxy più vicino e indicalo nel signal.
- **Il valore numerico è sempre quello comunicato dall'azienda o calcolabile da bilancio**
  (es. inventory days = Inventories / COGS × numero giorni del periodo).
- **Non aggiornare mai `sm_THESIS.date` senza aggiornare anche il Version Log** nel markdown.
- Se l'evento è un **pre-earnings** (es. Computex), usa `equity-research:earnings-preview`
  invece di `equity-research:earnings`, e aggiorna solo il campo `next` e `signal` dell'indicatore
  (non il valore numerico).
