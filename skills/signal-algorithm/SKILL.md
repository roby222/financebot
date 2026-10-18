---
name: signal-algorithm
description: Documenta e guida la modifica dell'algoritmo di segnale composito di FinancePalmirioBot (compositeSignal, SCENARIO_WEIGHTS, calcRegimeBoost). Usa questa skill ogni volta che l'utente vuole modificare soglie, aggiungere indicatori, ricalibrare pesi scenari/regime, o capire perché un ETF mostra un certo segnale.
compatibility: Requires Read access to static/js/features/etf/signals.js and static/js/data/market-config.js
metadata:
  author: roby222
  version: "1.0"
---

## Architettura del segnale

Il segnale finale è la somma di tre contributi indipendenti:

```
finalScore = techScore + clamp(scenAdj + regimeAdj + macroDriverBoost, -0.20, +0.20)
```

| Componente | Range tipico | Fonte |
|------------|-------------|-------|
| `techScore` | −2 … +2 (media voti) | 5 indicatori tecnici |
| `scenAdj` | −0.50 … +0.50 | SCENARIO_WEIGHTS[scenario][driver] |
| `regimeAdj` | −0.20 … +0.20 | calcRegimeBoost(itemRegime) |

Soglie di output (`static/js/features/etf/signals.js` → `compositeSignal()`):

| finalScore | Segnale |
|-----------|---------|
| ≥ 0.70 | ★ COMPRA |
| ≥ 0.25 | ↑ ACCUM. |
| −0.25 … +0.25 | ◆ HOLD |
| ≤ −0.25 | ↓ RIDUCI |
| ≤ −0.70 | ✖ VENDI |

---

## 1 · Indicatori tecnici (`techScore`)

Ogni indicatore emette un voto; il MACD usa mezzi punti. `techScore = media(voti)`.

### RSI(14)
```
rsi < 30   → +2  (ipervenduto forte)
rsi < 45   → +1  (debolezza)
rsi > 70   → −2  (ipercomprato forte)
rsi > 55   → −1  (forza, attenzione)
altrimenti →  0  (neutro)
```

### MACD istogramma (12/26/9)
```
hist > 0  → +0.5  (momentum positivo)
hist ≤ 0  → −0.5  (momentum negativo)
```
Unico voto binario: peso leggero di default.

### Bollinger Bands (20 candele, 2σ)
```
price ≤ lower  → +2  (anomalia ribassista, rimbalzo probabile)
price ≥ upper  → −2  (anomalia rialzista, correzione probabile)
price < mid    → +1
price > mid    → −1
```

### SMA50
```
price > sma50  → +1  (sopra media, trend positivo)
price ≤ sma50  → −1  (sotto media, trend negativo)
```

### Pivot Point (PP del giorno precedente)
```
price < PP → +1  (prezzo sotto pivot, possibile supporto)
price ≥ PP → −1  (prezzo sopra pivot, resistenza vicina)
```
Calcolato su H/L/C del giorno precedente: `PP = (H+L+C)/3`.

---

## 2 · Aggiustamento scenario (`scenAdj`)

`SCENARIO_WEIGHTS[scenario][driver]` in `static/js/data/market-config.js`.

Calibrato sul contesto **Iran-USA** (driver chiave: ENERGIA via Stretto di Hormuz).

| Driver | neutro | volatile | escalation | tregua |
|--------|--------|----------|-----------|--------|
| ENERGIA | 0 | +0.20 | **+0.50** | −0.30 |
| PAURA | 0 | +0.15 | +0.45 | −0.35 |
| METALLI | 0 | +0.10 | +0.25 | −0.15 |
| EQUITY | 0 | −0.15 | −0.40 | +0.40 |
| TECH | 0 | −0.20 | −0.40 | +0.30 |
| CICLO | 0 | −0.15 | −0.25 | +0.30 |
| INFRA | 0 | 0 | −0.10 | +0.15 |
| GEO | 0 | +0.05 | +0.20 | +0.15 |
| FOOD | 0 | +0.05 | +0.10 | −0.10 |

---

## 3 · Aggiustamento regime (`regimeAdj`)

`calcRegimeBoost(itemRegime)` in `static/js/features/etf/signals.js`. Il macro-regime viene rilevato automaticamente da VIX, Gold, S&P500.

| macroRegime | itemRegime ETF | boost |
|------------|---------------|-------|
| risk-on | risk-on | +0.20 |
| risk-on | risk-off | −0.20 |
| risk-on | neutro | 0 |
| risk-off | risk-off | +0.20 |
| risk-off | risk-on | −0.20 |
| risk-off | neutro | 0 |
| volatile | risk-off | +0.10 |
| volatile | neutro | +0.05 |
| volatile | risk-on | −0.10 |

---

## Come modificare l'algoritmo

### Ricalibrare le soglie COMPRA/VENDI

Cerca in `static/js/features/etf/signals.js`:
```javascript
const tHigh = isVol ? 0.85 : 0.70;
const tLow  = isVol ? 0.35 : 0.25;
// labelFrom() applica queste soglie al punteggio finale.
```
Range ragionevole: soglia COMPRA tra 0.5 e 1.0, soglia HOLD tra 0.15 e 0.35.

### Aggiungere un nuovo indicatore

1. Scrivi la funzione `calcXxx(closes)` in `static/js/core/indicators.js`
2. Aggiorna `fetchHistorical()` in `static/js/services/market-data.js` e aggiungi il valore a `state.signalCache[id]`
3. Dentro `compositeSignal()`, aggiungi il voto: `if (xxxVal !== null) votes.push(votoCalcolato)`
4. Aggiorna la sezione `signalCache` in `renderSignalsTable()` se vuoi mostrarlo in tabella

### Ricalibrare SCENARIO_WEIGHTS

Regole:
- Range valori: −0.50 … +0.50 (oltre si mangia tutta la banda tecnica)
- La somma per colonna (scenario) non deve essere troppo sbilanciata: scenari forti come `escalation` possono avere somma positiva, ma non tutti i driver > 0
- Cambia il contesto geopolitico? Aggiorna il commento che spiega la calibrazione

### Aggiungere un nuovo driver

1. Aggiungi il driver a `SCENARIO_WEIGHTS` in tutti e 4 gli scenari
2. Aggiungi la riga a `calcRegimeBoost` se il regime del driver è nuovo
3. Aggiungi emoji e CSS badge (cerca `.drv-EQUITY` come esempio)
4. Aggiorna `skills/etf-classify/SKILL.md` con il nuovo driver

### Aggiungere un nuovo scenario

1. Aggiungi una chiave a `SCENARIO_WEIGHTS` con pesi per tutti i driver
2. Aggiungi il pulsante HTML nella sezione `#scenario-bar`
3. Aggiungi la variante CSS `.scen-btn.nuovoscenario`
4. Aggiorna la validazione localStorage: `['escalation','tregua','neutro','volatile','nuovoscenario']`

---

## Gotchas

- **techScore non è normalizzato a [−1, +1]**: è la media dei voti, che vanno da −2 a +2. Un RSI ipervenduto + Bollinger sotto banda valgono +2+2 = media +2, non +1. Le soglie 0.25/0.70 tengono conto di questo range.
- **MACD pesa meno degli altri**: emette solo ±0.5, RSI e Bollinger arrivano a ±2. Se il MACD conta troppo, aumenta il suo range di voti.
- **Pivot Point usa dati T−1**: usa H/L/C del penultimo giorno nell'array storico, non di oggi. Se i dati storici sono scarsi (<2 candele) il pivot è null e non contribuisce.
- **Gli aggiustamenti sono limitati**: scenario, regime e boost macro si sommano, ma il contributo totale è limitato a ±0.20.
- **Ordine fetch storico**: si tenta prima `3mo`, poi `6mo`, poi `1mo`. Con `3mo` si hanno ~63 candele, sufficiente per tutti gli indicatori (RSI 14+, MACD 35+, Bollinger 20+, SMA50 → 50 candele, per questo si prova `6mo` in fallback).

## Vincoli conservati dal refactor

- In regime volatile, soglie COMPRA/VENDI ±0.85 e ACCUM./RIDUCI ±0.35.
- Isteresi 0.08: evita cambi di etichetta per oscillazioni minime.
- Prezzo oltre il 12% sotto SMA50: punteggio limitato al massimo a HOLD.
- Il boost macro deriva dal movimento dell'oro e viene incluso nel limite totale ±0.20.
- Stato condiviso in `static/js/core/state.js`; fetch in `static/js/services/market-data.js`; tabella in `static/js/features/etf/table.js`.
- Dopo modifiche eseguire `npm test`, `npm run check` e `npm run test:browser`.
