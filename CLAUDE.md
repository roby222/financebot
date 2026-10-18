# FinancePalmirioBot — Istruzioni per Claude

## Classificazione driver ETF

Per classificare ETF nella watchlist, leggi ed esegui:
[`skills/etf-classify/SKILL.md`](skills/etf-classify/SKILL.md)

Trigger: ogni volta che l'utente chiede di aggiungere, classificare o reclassificare un ETF.

## Aggiornamento Semis Monitor post-evento

Per aggiornare gli indicatori del Semis Monitor dopo un catalizzatore (earnings, dati mensili, annunci), leggi ed esegui:
[`skills/semis-update/SKILL.md`](skills/semis-update/SKILL.md)

Trigger: ogni volta che l'utente dice "aggiorna il monitor", "è uscito NVDA", "TSMC ha riportato", o menziona un evento del catalyst calendar del Semis Monitor.

## Struttura del frontend

Il sito usa moduli ES nativi. `static/index.html` contiene il documento, non la logica.
Vedi la mappa aggiornata in `README.md`: indicatori in `static/js/core/indicators.js`,
segnali in `static/js/features/etf/signals.js`, configurazione macro/scenari in
`static/js/data/market-config.js`, default Semis in `static/js/features/semis/defaults.js`.
Prima di un push esegui `npm run check`, `npm test` e `npm run test:browser`.
Il deploy GitHub Pages attende i controlli CI; il Worker Cloudflare si pubblica separatamente.
