# FinancePalmirioBot — Istruzioni per Claude

## Classificazione driver ETF (`/etf-classify`)

Quando l'utente chiede di classificare uno o più ETF (per ticker, ISIN o nome), o di aggiornare la watchlist, segui questo processo:

### Processo

1. **Ricerca holdings**: Per ogni ETF, cerca sul web le top 10 holdings e la composizione settoriale.
   - Query efficaci: `"[TICKER] ETF top holdings"`, `"[nome fondo] fund composition"`, `"[TICKER].MI holdings"`
   - Fonti affidabili: justetf.com, etfdb.com, ishares.com, vaneck.com, xtrackers.com, schroders.com

2. **Classifica il driver dominante** guardando le holdings:

   | Driver | Quando assegnarlo |
   |--------|-------------------|
   | `EQUITY` | Indici azionari globali/regionali senza focus settoriale specifico |
   | `TECH` | >40% in tech (semiconduttori, software, cloud, AI) |
   | `ENERGIA` | Petrolio, gas, rinnovabili, utilities energy |
   | `METALLI` | Oro fisico, argento, mining oro/argento, rame, litio, terre rare estrattive |
   | `INFRA` | Infrastrutture fisiche, smart grid, trasporti, utilities infrastrutturali |
   | `GEO` | Esposizione concentrata a paesi/regioni con forte rischio geopolitico (Cina, emergenti critici, terre rare cinesi) |
   | `FOOD` | Agricoltura, soft commodities, food sector |
   | `PAURA` | Volatilità (VIX), oro fisico puro, bond governativi safe haven |
   | `CICLO` | Industriali, materiali ciclici, costruzioni (non estrattivi) |

   **Regola del pollice**: se il fondo ha >40% in un settore chiaro, quel settore determina il driver. Se è misto, prevale il componente dominante per contesto macro (es. se mining oro+argento, anche al 30%, è METALLI non CICLO).

3. **Determina il regime**:
   - `risk-on`: il fondo sale quando gli investitori comprano rischio (equity, tech, ciclo industriale)
   - `risk-off`: il fondo sale quando gli investitori fuggono verso sicurezza (oro, volatilità, bond)
   - `neutro`: non correlato chiaramente con il risk sentiment (infra, food, alcuni metalli industriali)

4. **Trova il ticker Yahoo Finance** con suffisso `.MI` (Borsa Italiana). Se non trovi il .MI, cerca la classe di azione denominata in EUR quotata a Milano.

5. **Output finale**: JSON pronto per `watchlist.json`:

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

| Driver | Emoji |
|--------|-------|
| EQUITY | 📈 |
| TECH | 💻 |
| ENERGIA | ⚡ |
| METALLI | 🥈 |
| INFRA | 🏗️ |
| GEO | 🌍 |
| FOOD | 🌾 |
| PAURA | 🛡️ |
| CICLO | 🔄 |

### Esempi di classificazioni già fatte (da usare come riferimento)

- **GDIG** (VanEck Global Mining) → `METALLI` / neutro — top holdings: Newmont, Barrick, Agnico (gold miners ~40%)
- **REMX** (VanEck Rare Earth) → `GEO` / neutro — top holdings: ~40% aziende cinesi terre rare
- **BATT** (Amundi Battery) → `METALLI` / risk-on — top holdings: Albemarle, SQM, Livent (litio mining)
- **COPM** (WisdomTree Copper) → `METALLI` / neutro — basket rame con componenti gold mining
- **GRIDG** (First Trust Smart Grid) → `INFRA` / neutro — grid elettrica, utilities, smart energy
- **GLUG** (Global Listed Infrastructure) → `INFRA` / neutro — infrastrutture quotate globali
- **SEME** (iShares Agribusiness) → `FOOD` / neutro — agricoltura, fertilizzanti, food processing

### Note operative

- Se il ticker .MI non funziona su Yahoo Finance, comunicalo all'utente specificando cosa hai trovato
- Per ETF iShares, Xtrackers, VanEck, Amundi: le pagine del provider sono le più affidabili per le holdings
- Attenzione ai fondi "tematici": spesso il nome suggerisce un driver diverso da quello reale (es. un ETF "quantum computing" potrebbe avere holdings in semiconduttori generici → TECH, non GEO)
- Aggiorna sempre sia `watchlist.json` che `WATCHLIST_DEFAULT` in `static/index.html` (sono due copie sincronizzate)
