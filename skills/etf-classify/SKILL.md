---
name: etf-classify
description: Classifica il driver macro di uno o più ETF cercando le top 10 holdings sul web e produce JSON pronto per watchlist.json. Usa questa skill ogni volta che l'utente chiede di classificare, aggiungere o reclassificare ETF nella watchlist di FinancePalmirioBot, anche se non usa la parola "classifica" (es. "aggiungi questo ETF", "che driver ha SWDA", "aggiorna la watchlist").
compatibility: Requires internet access (WebSearch). Designed for FinancePalmirioBot project.
metadata:
  author: roby222
  version: "1.0"
---

## Procedura

Per ogni ETF ricevuto in input (ticker, ISIN o nome):

1. **Cerca le holdings** — query efficaci:
   - `"[TICKER] ETF top holdings site:justetf.com"`
   - `"[nome fondo] fund composition top 10"`
   - Per ETF Borsa Italiana: `"[TICKER].MI holdings"`

2. **Determina il driver** dalla composizione reale (non dal nome del fondo):

   | Driver | Assegnalo quando |
   |--------|-----------------|
   | `EQUITY` | Indici azionari broad, nessun focus settoriale specifico |
   | `TECH` | >40% semiconduttori, software, cloud, AI |
   | `ENERGIA` | Petrolio, gas, rinnovabili, utilities energy |
   | `METALLI` | Gold/silver mining, rame, litio, terre rare estrattive |
   | `INFRA` | Smart grid, trasporti, utilities infrastrutturali |
   | `GEO` | >30% concentrazione in paesi ad alto rischio geopolitico (Cina, EM critici) |
   | `FOOD` | Agricoltura, soft commodities, food processing |
   | `PAURA` | VIX, oro fisico puro, bond governativi safe haven |
   | `CICLO` | Industriali, materiali ciclici, costruzioni (non estrattivi) |

3. **Determina il regime**:
   - `risk-on` — sale quando gli investitori comprano rischio
   - `risk-off` — sale quando fuggono verso sicurezza
   - `neutro` — non correlato chiaramente al risk sentiment

4. **Trova il ticker Yahoo Finance** con suffisso `.MI` (Borsa Italiana). Cerca la classe in EUR quotata a Milano.

5. **Output** — JSON pronto per `watchlist.json`:

```json
[
  {
    "id": "SWDA",
    "name": "iShares Core MSCI World",
    "yf": "SWDA.MI",
    "driver": "EQUITY",
    "dEmoji": "📈",
    "regime": "risk-on"
  }
]
```

### Emoji per driver

`EQUITY` → 📈 · `TECH` → 💻 · `ENERGIA` → ⚡ · `METALLI` → 🥈 · `INFRA` → 🏗️ · `GEO` → 🌍 · `FOOD` → 🌾 · `PAURA` → 🛡️ · `CICLO` → 🔄

## Gotchas

- **Il nome del fondo inganna**: "VanEck Global Mining" suona ciclico, ma le holdings sono gold miner al 40% → `METALLI`. Guarda sempre le holdings, non il nome.
- **Terre rare ≠ METALLI**: ETF come REMX hanno >40% aziende cinesi → `GEO`, non `METALLI`, perché il rischio dominante è geopolitico non estrattivo.
- **Litio**: I fondi litio (BATT) partono da mining di litio → `METALLI`, regime `risk-on`.
- **Ticker .MI diverso dall'ISIN**: Il ticker Yahoo Finance per Borsa Italiana spesso differisce dal codice Bloomberg o ISIN. Verificare su Yahoo Finance direttamente se incerto.
- **Due copie sincronizzate**: dopo la classificazione, aggiornare sia `static/watchlist.json` sia `WATCHLIST_DEFAULT` in `static/index.html`.

## Classificazioni di riferimento

| ID | Nome | Driver | Regime | Ragione |
|----|------|--------|--------|---------|
| GDIG | VanEck Global Mining | METALLI | neutro | ~40% Newmont, Barrick, Agnico (gold miners) |
| REMX | VanEck Rare Earth | GEO | neutro | ~40% aziende cinesi terre rare |
| BATT | Amundi Battery | METALLI | risk-on | Albemarle, SQM, Livent (litio mining) |
| COPM | WisdomTree Copper | METALLI | neutro | Basket rame con componenti gold mining |
| GRIDG | First Trust Smart Grid | INFRA | neutro | Grid elettrica, utilities, smart energy |
| GLUG | Global Listed Infrastructure | INFRA | neutro | Infrastrutture quotate globali |
| SEME | iShares Agribusiness | FOOD | neutro | Agricoltura, fertilizzanti, food processing |
