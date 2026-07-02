# Scheda BTP Italia — Specifiche e documentazione tecnica

Monitor di portafoglio per titoli di Stato italiani (BTP, BTP Italia, BTP Valore) integrato
in `static/index.html` come nuova tab **🏛️ BTP**. Prezzi live da Borsa Italiana, calcolo di
rendimenti netti, spread, grafici d'andamento e P&L mark-to-market.

Tutto il codice vive nel file singolo `static/index.html` sotto il namespace `btp_*`, isolato
dalle altre schede (Live, Segnali, Semis, Macro, Bond/Equity) e dalle utility condivise `sm_*`.

---

## 1. Obiettivo funzionale

Replicare e superare una watchlist di BTP (originariamente presa da un elenco Investing.com),
mostrando per ciascun titolo:

- Prezzo di mercato live e variazione giornaliera (%)
- YTM lordo (rendimento a scadenza) e rendimento netto annuo (dopo imposta 12,5%)
- Spread di rendimento vs benchmark BTP 10Y
- Rendimento netto e P&L in base a un prezzo di acquisto opzionale inserito dall'utente
- Grafico dell'andamento storico dei prezzi

Più metriche di contesto (info-bar): rendimento BTP 10Y, spread BTP-Bund, CPI Italia,
riepilogo delle posizioni possedute.

---

## 2. Titoli monitorati (default)

13 strumenti in `btp_DEFAULTS.bonds`:

| # | ISIN | Nome | Cedola | Scadenza | Tipo |
|---|------|------|--------|----------|------|
| 1 | IT0005668238 | BTP 4.65% Ott55 | 4,65% | 2055-10-01 | fissa |
| 2 | IT0005648255 | BTP Italia Giu32 | — | 2032-06-04 | `idx` |
| 3 | IT0005647265 | BTP 3.25% Lug32 | 3,25% | 2032-07-15 | fissa |
| 4 | IT0005534141 | BTP 4.5% Ott53 | 4,50% | 2053-10-01 | fissa |
| 5 | IT0005611741 | BTP 4.3% Ott54 | 4,30% | 2054-10-01 | fissa |
| 6 | C3M | Amundi Cash 3M (ETF) | — | — | `etf` |
| 7 | IT0005497000 | BTP Italia Giu30 | — | 2030-06-28 | `idx` |
| 8 | IT0005672024 | BTP Valore Ott32 | — | 2032-10-28 | `step` |
| 9 | IT0005518128 | BTP 4.4% Mag33 | 4,40% | 2033-05-01 | fissa |
| 10 | IT0005696338 | BTP Valore Mar32 | — | 2032-03-10 | `step` |
| 11 | IT0003256820 | BTP 5.75% Feb33 | 5,75% | 2033-02-01 | fissa |
| 12 | IT0005560948 | BTP 4.2% Mar34 | 4,20% | 2034-03-01 | fissa |
| 13 | IT0005445306 | BTP 0.5% Lug28 | 0,50% | 2028-07-15 | fissa |

**Tipi speciali** (campo `special`):
- `idx` — BTP Italia, cedola indicizzata all'inflazione → YTM a formula fissa non applicabile
- `step` — BTP Valore, cedola step-up crescente → YTM a formula fissa non applicabile
- `etf` — Amundi Cash 3M, ETF monetario → nessuna scadenza/cedola, prezzo via Yahoo Finance

L'utente può aggiungere o rimuovere titoli; la lista salvata in localStorage diventa la fonte
di verità (vedi §7).

---

## 3. Formati ticker/chiave

Lo stesso strumento ha codici diversi a seconda della fonte:

| Fonte | Formato | Esempio | Uso |
|-------|---------|---------|-----|
| ISIN standard | `IT0005XXXXXX` (12 char) | `IT0005668238` | identificativo interno `id` |
| Investing.com | `IT000XXXXXX=MI` (drop check digit) | `IT000566823=MI` | fonte originale watchlist |
| Yahoo Finance | `IT0005XXXXXX.TI` | `IT0005668238.TI` | **NON usato** (Yahoo dà 404 sui BTP) |
| Borsa Italiana MOT | ISIN + `?mic=MOTX` | — | scraping prezzo live |
| Borsa Italiana chart | `ISIN.MOT` | `IT0005668238.MOT` | endpoint grafico ChartWService |

> Nota storica: inizialmente si era tentato Yahoo Finance con suffisso `.TI`, ma i singoli BTP
> non sono quotati su Yahoo. Si è passati allo scraping di Borsa Italiana.

---

## 4. Fonti dati e endpoint

Tutte le chiamate cross-origin passano da un proxy CORS (browser statico su GitHub Pages).

### 4.1 Prezzo live + variazione — Borsa Italiana MOT
- **URL**: `https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/dati-completi.html?isin={ISIN}&mic=MOTX&lang=it&_={timestamp}`
- **Metodo**: GET, HTML (~59 KB) via proxy
- **Parsing**: regex su `Prezzo Ultimo Contratto` (prezzo) e `Var %` (variazione)
- **Cache-buster** `&_={Date.now()}` per evitare risposte stantie del proxy
- Funzione: `btp_fetchBI(isin)`

### 4.2 Prezzo ETF cash (C3M) — Yahoo Finance
- **URL**: `https://query1.finance.yahoo.com/v8/finance/chart/C3M.MI?interval=1d&range=1d`
- Prezzo da `chart.result[0].meta.regularMarketPrice`, var% da `chartPreviousClose`
- Funzione: `btp_fetchYF(ticker)`

### 4.3 Spread BTP-Bund 10Y — Teleborsa
- **URL**: `https://borsaitaliana.teleborsa.it/Pages/Spread/2021/Item.aspx?code=YIELD10_BTP&lang=en`
- **Parsing**: regex su `ctlHeader_lblPrice` → "`{N} points`" (es. "79 points" = 79 bps)
- Funzione: `btp_fetchSpread()`

### 4.4 Grafico storico — Borsa Italiana ChartWService
- **URL**: `https://charts.borsaitaliana.it/charts/services/ChartWService.asmx/GetPrices`
- **Metodo**: POST JSON
  ```json
  { "request": { "SampleTime": "1d", "TimeFrame": "1m|3m|6m|1y|3y",
                 "RequestedDataSetType": "ohlc", "ChartPriceType": "price",
                 "Key": "{ISIN}.MOT", "OffSet": 0, "FromDate": null, "ToDate": null,
                 "UseDelay": false, "KeyType": "Topic", "KeyType2": "Topic",
                 "Language": "it-IT" } }
  ```
- **Risposta**: `{ "d": [[timestamp_ms, open, close, high, low], ...] }`
  - **Close = colonna indice 2** (verificato confrontando con il prezzo di riferimento ufficiale)
- Solo `corsproxy` supporta POST → usato direttamente per questo endpoint
- Funzione: `btp_loadChart()`

> ⚠️ L'endpoint chart NON è adatto al prezzo live: l'ultimo bar giornaliero è il close
> della sessione precedente durante la giornata. Per il prezzo intraday si usa lo scraping HTML (§4.1).

### 4.5 Benchmark BTP 10Y — calcolato
Non scaricato: interpolato dalla curva dei rendimenti dei BTP a cedola fissa già in tabella
(vedi §5.3). Il vecchio ticker Yahoo `^IT10YT=RR` è delisted / l'endpoint quote dà 500.

---

## 5. Formule e algoritmi

### 5.1 YTM lordo (approssimazione lineare)
```
YTM = (cedola + (100 − prezzo) / anni) / ((100 + prezzo) / 2) × 100
```
`anni` = frazione di anni fino a scadenza. Funzione `btp_ytmAt(bond, price)`.
Restituisce `null` per `idx`/`step`/`etf` o titoli a < 0,5 anni dalla scadenza.

### 5.2 Rendimento netto
```
rendimento_netto = YTM × 0,875
```
Imposta sostitutiva del **12,5%** sui titoli di Stato italiani. Funzione `btp_netYield(bond, price)`.
- **"Rend. netto ora"**: calcolato sul prezzo di mercato corrente
- **"Rend. netto acq."**: calcolato sul prezzo di acquisto `ap` inserito dall'utente

### 5.3 Benchmark BTP 10Y (interpolazione)
`btp_benchmark10Y()` raccoglie i punti `(anni_a_scadenza, YTM)` di tutti i BTP a cedola fissa
con prezzo disponibile, li ordina e interpola linearmente il rendimento al punto **T = 10 anni**.
Se 10Y è fuori dal range dei titoli, usa il punto più vicino (estrapolazione piatta).

### 5.4 Spread vs 10Y
```
spread_bps = (YTM_titolo − benchmark10Y) × 100
```
Colorato rosso se positivo (rende più del benchmark), verde se negativo.

### 5.5 P&L mark-to-market (posizione posseduta)
```
P&L% = (prezzo_corrente − prezzo_acquisto) / prezzo_acquisto × 100
```
Mostrato in colonna "Rend. netto acq." e mediato nel riepilogo posizioni della info-bar.

---

## 6. Interfaccia utente

Struttura DOM in `#view-btp`, render in `btp_render()` → `btp_renderInfoBar()` + `btp_renderTable()`.

### Info-bar (4 riquadri)
1. **BTP 10Y yield** — benchmark interpolato (§5.3)
2. **Spread BTP-Bund** — bps da Teleborsa; colore per soglie (>200 rosso, <130 verde)
3. **CPI Italia** — letto da `bvState` (scheda Bond/Equity) se disponibile
4. **Le mie posizioni** — n° titoli con prezzo di acquisto + P&L medio mark-to-market

### Tabella (colonne)
`Nome (+ISIN) · Cedola · Scadenza · Prezzo · Var% · YTM · Spread vs 10Y · Rend. netto ora · Rend. netto acq. · [✕]`

- **ISIN** in monospazio grigio sotto il nome
- **Colonne ordinabili**: click sull'intestazione ordina asc/desc (freccia ▲/▼); valori
  mancanti sempre in fondo. Stato ordinamento in `btpSort` e persistito.
- **Righe evidenziate** (accento blu a sinistra) per i titoli con posizione (`ap` impostato)
- **Nome cliccabile** → apre il grafico d'andamento (§8)
- **✎** → pannello inline per impostare/rimuovere il **prezzo di acquisto**
- **✕** → rimuove il titolo dalla lista (con conferma)
- **＋ Aggiungi BTP** → form (ISIN, nome, cedola, scadenza, tipo) con fetch automatico del prezzo

---

## 7. Stato e persistenza

- **Chiave localStorage**: `btp_italia_v1`, versione `_v: 2`
- `btp_loadState()`: se lo stato salvato ha `_v ≥` quello dei default ed è un array valido, i
  **titoli salvati sono la fonte di verità** (aggiunte/rimozioni/ordinamento/prezzi persistono).
  Su bump di `_v` si torna ai default.
- `btp_saveState()`: serializza `btpState` (bonds + `sort` + `spreadBund` + `lastFetched`)
- Campi per titolo: `id, name, coupon, mat, yf, price, pct, ap, special`
- Nessun dato lascia il browser (solo localStorage).

---

## 8. Grafico d'andamento

Cliccando il nome del titolo, `btp_openChart(idx)` riusa il **modal detail e la funzione
`drawPriceChart` già esistenti per gli ETF**, cambiando solo la fonte dati:
- **BTP**: Borsa Italiana ChartWService (§4.4), close = colonna 2
- **ETF**: Yahoo Finance chart API
- Periodi: 1M / 3M / 6M / 1A / 3A; performance nel periodo; crosshair al passaggio mouse
- Statistiche nel modal: cedola, scadenza, YTM lordo, rendimento netto annuo
- **Fix layout**: `drawReady()` attende che il canvas del fixed-overlay abbia larghezza > 40px
  prima di disegnare (evita chart vuoto per width 0 al primo apri, senza dipendere da `requestAnimationFrame`
  che nel rendering in background non è affidabile).

---

## 9. Performance del fetch

`btp_fetchAll()` — ottimizzato da **~25-35s a ~1,4s** per 13 titoli + spread:

| Leva | Prima | Dopo |
|------|-------|------|
| Proxy primario | allorigins (~5s/pagina) | **corsproxy** (~200ms/pagina) |
| Timeout per tentativo | 15s fissi (`sm_fetchTimeout` ignorava l'arg) | **8s reali** via `AbortSignal.timeout` |
| Concorrenza | 2 | **5** |
| Cache | risposte stantie possibili | **cache-buster** `&_={Date.now()}` |

Fallback proxy: `corsproxy → allorigins → codetabs` (`btp_PROXIES`, usato da `btp_proxiedText`).

**Robustezza race condition**: il fetch lavora su uno **snapshot** dell'array e assegna i prezzi
**per riferimento all'oggetto** bond (non per indice), così un ordinamento/aggiunta/rimozione
durante il fetch non scombina più i prezzi tra i titoli. Render progressivo ogni 3 titoli.

---

## 10. Funzioni principali (indice)

| Funzione | Ruolo |
|----------|-------|
| `btp_onTabOpen()` | init tab: carica stato, render, primo fetch |
| `btp_loadState()` / `btp_saveState()` | persistenza localStorage |
| `btp_render()` / `btp_renderInfoBar()` / `btp_renderTable()` | rendering |
| `btp_ytmAt(bond, price)` / `btp_ytm(bond)` | YTM lordo |
| `btp_netYield(bond, price)` | rendimento netto (×0,875) |
| `btp_benchmark10Y()` | benchmark 10Y interpolato |
| `btp_setSort(col)` | ordinamento colonne |
| `btp_openEdit / saveAp / clearAp / closeEdit` | prezzo di acquisto |
| `btp_toggleAddForm / addBond / removeBond` | gestione titoli |
| `btp_openChart / loadChart / setChartPeriod` | grafico d'andamento |
| `btp_proxiedText(target)` | fetch con fallback proxy |
| `btp_fetchBI / fetchYF / fetchSpread` | fetch prezzo / ETF / spread |
| `btp_fetchAll()` | orchestrazione fetch completo |

---

## 11. Limiti noti

- **YTM approssimato** (formula lineare, senza rateo/tassazione cedole): scostamento di pochi bps
  rispetto al calcolo attuariale esatto. Sufficiente per confronto relativo tra titoli.
- **BTP Italia / BTP Valore** (`idx`/`step`): rendimento a scadenza non calcolabile con formula
  fissa → mostrato "variabile". Prezzo, var% e P&L restano validi.
- **Benchmark 10Y interpolato**: la lista non contiene un BTP esattamente a 10 anni; il valore
  è interpolato tra i titoli più vicini (buona stima, non quotazione ufficiale).
- **Dipendenza da proxy pubblici** (corsproxy/allorigins): possibili rallentamenti o 429
  occasionali → mitigati da fallback multi-proxy e timeout 8s.
- **CPI Italia**: mostrato solo se la scheda Bond/Equity ha popolato `bvState`.

---

## 12. Cronologia commit principali

| Commit | Descrizione |
|--------|-------------|
| feat: BTP Italia tab | Tab iniziale, 13 titoli, YTM, spread, fetch |
| refactor: gain netto → rendimento netto | Metrica chiara in %/anno invece di "pp" |
| feat: fetch robusto multi-proxy + rend. netto da prezzo acquisto | Fallback proxy, benchmark interpolato, spread Teleborsa |
| feat: colonne ordinabili, aggiungi/rimuovi titoli | Sort persistito, gestione lista, fix race prezzi |
| feat: ISIN sotto il nome | ISIN in monospazio |
| feat: grafico andamento su click nome | Riuso `drawPriceChart`, dati ChartWService |
| refactor: rimossa modalità prezzo manuale | Solo prezzo di acquisto |
| feat: P&L mark-to-market, righe evidenziate, riepilogo posizioni | Monitor di portafoglio |
| perf: fetch da ~30s a ~1,4s | corsproxy primario, timeout 8s, concorrenza 5, cache-buster |

---

_Documento tecnico della scheda BTP di FinancePalmirioBot. Tutto il codice è in `static/index.html`,
namespace `btp_*`. Non costituisce consulenza finanziaria._
