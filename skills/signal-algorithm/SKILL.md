---
name: signal-algorithm
description: Documenta e guida la modifica dell'algoritmo di segnale composito di FinancePalmirioBot (compositeSignal, SCENARIO_WEIGHTS, calcRegimeBoost). Usa questa skill ogni volta che l'utente vuole modificare soglie, aggiungere indicatori, ricalibrare pesi scenari/regime, o capire perché un ETF mostra un certo segnale.
compatibility: Requires Read access to static/index.html
metadata:
  author: roby222
  version: "1.0"
---

## Architettura del segnale

Il segnale finale è la somma di tre contributi indipendenti:

```
finalScore = techScore + scenAdj + regimeAdj
```

| Componente | Range tipico | Fonte |
|------------|-------------|-------|
| `techScore` | −2 … +2 (media voti) | 5 indicatori tecnici |
| `scenAdj` | −0.50 … +0.50 | SCENARIO_WEIGHTS[scenario][driver] |
| `regimeAdj` | −0.20 … +0.20 | calcRegimeBoost(itemRegime) |

Soglie di output (`static/index.html` → `compositeSignal()`):

| finalScore | Segnale |
|-----------|---------|
| ≥ 0.70 | ★ COMPRA |
| ≥ 0.25 | ↑ ACCUM. |
| −0.25 … +0.25 | ◆ HOLD |
| ≤ −0.25 | ↓ RIDUCI |
| ≤ −0.70 | ✖ VENDI |

---

## 1 · Indicatori tecnici (`techScore`)

Ogni indicatore emette un voto intero. `techScore = media(voti)`.

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
hist > 0  → +1  (momentum positivo)
hist ≤ 0  → −1  (momentum negativo)
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

`SCENARIO_WEIGHTS[scenario][driver]` in `static/index.html`.

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

`calcRegimeBoost(itemRegime)` in `static/index.html`. Il macro-regime viene rilevato automaticamente da VIX, Gold, S&P500.

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

Cerca in `static/index.html`:
```javascript
if (finalScore>=0.7)   return { label:'★ COMPRA', ...
if (finalScore>=0.25)  return { label:'↑ ACCUM.', ...
if (finalScore<=-0.7)  return { label:'✖ VENDI',  ...
if (finalScore<=-0.25) return { label:'↓ RIDUCI', ...
```
Range ragionevole: soglia COMPRA tra 0.5 e 1.0, soglia HOLD tra 0.15 e 0.35.

### Aggiungere un nuovo indicatore

1. Scrivi la funzione `calcXxx(closes)` nello stesso blocco degli altri indicatori
2. Chiama `fetchHistorical()` e aggiungi il valore a `signalCache[id]`
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
- **MACD pesa meno degli altri**: emette solo ±1, RSI e Bollinger arrivano a ±2. Se il MACD conta troppo, aumenta il suo range di voti.
- **Pivot Point usa dati T−1**: usa H/L/C del penultimo giorno nell'array storico, non di oggi. Se i dati storici sono scarsi (<2 candele) il pivot è null e non contribuisce.
- **scenAdj e regimeAdj si sommano**: in uno scenario escalation + regime risk-off, un ETF PAURA può ricevere +0.45+0.20 = +0.65 solo dagli aggiustamenti, indipendentemente dai tecnici.
- **Ordine fetch storico**: si tenta prima `3mo`, poi `6mo`, poi `1mo`. Con `3mo` si hanno ~63 candele, sufficiente per tutti gli indicatori (RSI 14+, MACD 35+, Bollinger 20+, SMA50 → 50 candele, per questo si prova `6mo` in fallback).
