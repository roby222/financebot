# Scheda BTP Italia

La scheda **🏛️ BTP** monitora BTP a cedola fissa, BTP Italia, BTP Valore ed ETF monetari. Il refactor conserva i dati salvati, le formule e i controlli precedenti.

## Mappa del codice

| Responsabilità                                                       | File                                      |
| -------------------------------------------------------------------- | ----------------------------------------- |
| Struttura della scheda                                               | `static/index.html`, elemento `#view-btp` |
| Stili                                                                | `static/css/btp.css`                      |
| Titoli iniziali e versione dello stato                               | `static/js/features/btp/defaults.js`      |
| Stato, rendering, ordinamento, aggiunta/rimozione, prezzo d'acquisto | `static/js/features/btp/portfolio.js`     |
| Grafici BTP/ETF monetari                                             | `static/js/features/btp/chart.js`         |
| Prezzi, spread, fallback HTML                                        | `static/js/services/btp-data.js`          |
| YTM e rendimento netto                                               | `static/js/core/bonds.js`                 |
| Proxy e timeout                                                      | `static/js/core/network.js`               |
| Canvas condiviso con ETF                                             | `static/js/ui/price-chart.js`             |
| Eventi dei controlli                                                 | `static/js/ui/actions.js`                 |
| Parsing e cache lato server                                          | `proxy-worker/worker.js`                  |

Non aggiungere logica JavaScript in `index.html`. I controlli dichiarano `data-action` e gli argomenti `data-arg-0`, ecc.; i gestori sono importati esplicitamente nel registro delle azioni.

## Fonti e flusso delle richieste

1. `btp_fetchBI(isin)` prova `WORKER/?btp=ISIN`: JSON `{isin, price, pct}`, cache 45 secondi.
2. Se l'endpoint non risponde con un prezzo, scarica la pagina `dati-completi.html` di Borsa Italiana attraverso la catena proxy e interpreta l'HTML nel browser.
3. Lo spread usa `WORKER/?spread=1`, cache 120 secondi, poi Teleborsa come fallback.
4. Gli ETF monetari usano Yahoo Finance; i BTP individuali non usano il suffisso Yahoo `.TI`.
5. Il grafico BTP invia una POST JSON a `charts.borsaitaliana.it/charts/services/ChartWService.asmx/GetPrices`, chiave `ISIN.MOT`. Il close è la colonna 2; il timestamp è in millisecondi.

La catena condivisa è Worker configurato → `proxy.cors.sh` → `api.allorigins.win`. Per i grafici serve un proxy che inoltri il body POST. Il Worker è il percorso principale e supporta GET, POST e OPTIONS.

Il parsing riconosce numeri italiani (`1.234,56`) e variazioni con segno esplicito (`+0,54`, `-0,54`). Il prezzo usa, in ordine, ultimo contratto, riferimento e prezzo ufficiale. Il grafico giornaliero non viene usato come quotazione intraday.

## Calcoli conservati

Per un titolo a cedola fissa:

```text
anni = (scadenza - oggi) / 365,25 giorni
YTM lordo ≈ (cedola + (100 - prezzo) / anni) / ((100 + prezzo) / 2) × 100
rendimento netto ≈ YTM × 0,875
P&L prezzo = (prezzo corrente - prezzo acquisto) / prezzo acquisto × 100
```

Sono approssimazioni, senza un modello attuariale completo di flussi, rateo e trattamento fiscale. Il refactor non ne cambia la precisione. `idx`, `step`, `etf` e titoli a meno di 0,5 anni dalla scadenza non ricevono un YTM a cedola fissa.

Il benchmark BTP 10Y è interpolato dai titoli a cedola fissa disponibili in tabella, con estrapolazione piatta fuori dall'intervallo. Non è una quotazione ufficiale. Lo spread di ciascun titolo è `(YTM - benchmark) × 100` punti base. Il riepilogo delle posizioni usa la media semplice del P&L percentuale, senza pesi sulle quantità.

## Persistenza e interazioni

La chiave `btp_italia_v1`, versione `_v: 2`, conserva `bonds`, `sort`, `spreadBund` e `lastFetched`. Campi dei titoli: `id, name, coupon, mat, yf, price, pct, ap, special`. A parità di versione, la lista salvata è la fonte di verità per aggiunte, rimozioni e prezzi d'acquisto. Un aumento della versione ripristina i default: non aumentarla per un semplice refactor.

- Le intestazioni ordinano la tabella; i valori mancanti vanno in fondo.
- Il nome apre il grafico; la matita modifica il prezzo d'acquisto.
- Il prezzo d'acquisto è attualmente limitato a 50–150 dal controllo esistente.
- La rimozione richiede la conferma già presente nell'interfaccia.
- La barra di ricerca ETF viene nascosta nella scheda BTP.
- Il CPI viene dalla scheda Bond/Equity, quando caricata.

Il caricamento usa al massimo cinque richieste in parallelo e lavora su uno snapshot dei riferimenti ai titoli: un riordinamento durante le richieste non associa prezzi al titolo sbagliato. In caso di errore conserva gli ultimi prezzi noti. Un fallimento totale mostra il messaggio del proxy.

## Verifica e pubblicazione

```bash
npm test
npm run check
npm run test:browser
```

I test coprono parsing con segno, fallback dal JSON all'HTML, formule, modifica e persistenza del prezzo d'acquisto, ordinamento e grafici. Le prove browser usano risposte deterministiche: non certificano la disponibilità delle fonti esterne.

GitHub Pages pubblica il frontend dopo i controlli CI. Il Worker Cloudflare si pubblica separatamente nel progetto esistente; il push su GitHub non ne aggiorna il codice in produzione.
