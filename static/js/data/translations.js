const STRINGS = {
  it: {
    tab_signals: "📈 ETF",
    tab_semis: "🔬 Semis",
    tab_macro: "🌍 Macro",
    tab_bond: "💰 Bond/Equity",
    tab_btp: "🏛️ BTP",
    // macro monitor
    mc_title: "🌍 Macro Indicators",
    mc_subtitle: "Commodity e macro — contesto globale per le thesis",
    mc_desc:
      "Indicatori commodity indipendenti dalla tesi semis. Il rame è un proxy della domanda AI infra a livello fisico.",
    // semis monitor
    sm_subtitle: "Sei indicatori auto-aggiornati · checklist viva",
    sm_last_update: "Ultimo update:",
    sm_loading: "Carico prezzi…",
    sm_refresh_btn: "Aggiorna ora",
    sm_refreshing: "Aggiornamento…",
    sm_export_btn: "Esporta JSON",
    sm_reset_btn: "Reset default",
    sm_cal_title: "Calendario earnings & eventi chiave — prossimi 4 mesi",
    sm_cal_th_date: "Data",
    sm_cal_th_event: "Società / evento",
    sm_cal_th_why: "Perché conta",
    sm_cal_th_link: "Link",
    sm_footer_data:
      "Auto-fetch via SEC EDGAR, GitHub API, Yahoo Finance, Google News RSS (proxy: Cloudflare Worker). Errori di rete o rate-limit possono far fallire singole letture.",
    sm_footer_storage:
      "Stato salvato in localStorage — nessun dato sul server.",
    sm_st_green: "Calmo",
    sm_st_yellow: "Warning",
    sm_st_red: "Allerta",
    sm_indicator: "INDICATOR",
    sm_headlines_lbl: 'Ultime headline ({n}) · "{q}"',
    sm_fetch_err: "Fetch parziale:",
    sm_next_update: "Prossimo update:",
    sm_autofetch: "Auto-fetch:",
    sm_ef_value: "Valore corrente",
    sm_ef_status: "Status",
    sm_ef_green: "Green — Calmo",
    sm_ef_yellow: "Yellow — Warning",
    sm_ef_red: "Red — Allerta",
    sm_ef_append: "Aggiungi punto alla cronologia",
    sm_ef_append_ph: "Lascia vuoto per non modificare",
    sm_ef_label: "Etichetta nuovo punto",
    sm_ef_label_ph: "es. Q2 26",
    sm_ef_note: "Nota personale",
    sm_ef_cancel: "Annulla",
    sm_ef_save: "Salva",
    sm_comp_expansion: "EXPANSION",
    sm_comp_latecycle: "LATE CYCLE",
    sm_comp_digestion: "DIGESTION RISK",
    sm_narr_expansion: "Ciclo in fase espansiva. Pochi segnali di stress.",
    sm_narr_latecycle:
      "Indicatori misti. Attenzione a double-ordering e capacity adds sincronizzati.",
    sm_narr_digestion:
      "Pattern coerente con svolta nei prossimi 2-3 trimestri. Rivalutare esposizione memoria e merchant accelerator.",
    sm_th_oneliner:
      "Esposizione diversificata al ciclo semis AI — $350B+ capex hyperscaler in arrivo nell'hardware stack.",
    sm_th_verdict: "HOLD",
    sm_th_stop:
      "⚠️ Stop-loss thesis: (1) HBM3E pricing < −15% HoH · (2) Capex hyperscaler flat/down per 2027 · (3) SOX < SMA200 per 3+ settimane · (4) Export controls impattano TSMC / ASML",
    sm_col_green: "Green",
    sm_col_yellow: "Yellow",
    sm_col_red: "Red",
    sm_fetch_btn: "↻ Fetch",
    sm_ir_link: "IR →",
    search_placeholder: "Cerca per ticker, ISIN o nome (es. SWDA, IE00…)",
    add_btn: "+ Aggiungi",
    export_btn: "⬇ Esporta lista",
    export_title: "Scarica la tua lista personalizzata",
    import_btn: "⬆ Importa lista",
    import_title: "Ripristina lista da file",
    macro_lbl: "Macro",
    scen_lbl: "Scenario",
    scen_neutro: "⚖️ Neutro",
    scen_volatile: "😵 Volatile",
    scen_escalation: "🔥 Escalation",
    scen_tregua: "🕊️ De-escalation",
    signals_heading: "📈 Segnali di Trading",
    signals_refresh: "↺ Aggiorna",
    th_price: "Prezzo",
    th_var: "Var%",
    th_signal: "SEGNALE",
    th_e1_title: "E1 — ingresso 30% a S1",
    th_e2_title: "E2 — ingresso 30% a mid S1-S2",
    th_e3_title: "E3 — ingresso 40% a S2",
    th_r1_title: "Vendi ≥ R1 (prima resistenza)",
    th_r2_title: "Target R2 (seconda resistenza)",
    th_rsi_title: "RSI(14) — <30 ipervenduto · >70 ipercomprato",
    th_sma_title: "Distanza % dalla SMA50",
    th_macd_title: "MACD(12/26/9) — istogramma",
    th_vol_title: "Volume odierno ÷ media 20 sessioni",
    legend_signals: "Segnali:",
    legend_levels_label: "Livelli:",
    legend_levels_text:
      "S1=buy S2=stop R1=vendi R2=target (Pivot Points sessione precedente)",
    legend_rsi: "<30 ipervenduto · >70 ipercomprato",
    sig_buy_strong: "★ COMPRA",
    sig_buy: "↑ ACCUM.",
    sig_hold: "◆ HOLD",
    sig_hold_desc: "neutro",
    sig_sell: "↓ RIDUCI",
    sig_sell_strong: "✖ VENDI",
    help_title: "📖 Guida <span>FinancePalmirioBot</span>",
    help_close: "✕ Chiudi",
    nav_overview: "🏠 Panoramica",
    nav_macro: "📡 Barra Macro",
    nav_regime: "🎚️ Regime",
    nav_scenarios: "🎭 Scenari",
    nav_signal: "🎯 Segnale",
    nav_etf: "📋 ETF lista",
    // dynamic
    mkt_open: "Aperto",
    mkt_pre: "Pre-Mkt",
    mkt_post: "Post-Mkt",
    mkt_closed: "Chiuso",
    loading: "Caricamento…",
    chart_loading: "Caricamento grafico…",
    chart_error: "Errore caricamento dati",
    period_perf_in: "nel periodo",
    warn_below_supports:
      "Prezzo sotto tutti i supporti — livelli ora fungono da resistenza",
    vol_hi_tip: "Vol {r}× media — conferma il movimento",
    vol_lo_tip: "Vol {r}× media — segnale poco convinto",
    vol_norm_tip: "Vol {r}× media",
    toast_copied: "📋 {id} copiato",
    toast_copy_fail: "❌ Copia non riuscita",
    toast_refreshing: "Aggiornamento…",
    toast_already: "${id} già presente",
    toast_added: "{id} aggiunto, caricamento…",
    toast_removed: "{id} rimosso",
    toast_exported: "Lista esportata",
    toast_imported: "{n} titoli importati",
    toast_invalid: "File non valido",
    toast_wl_warn: "⚠️ watchlist.json non trovato — uso lista predefinita",
    detail_open: "Apri dettaglio {id}",
    stat_rsi: "RSI 14",
    stat_macd: "MACD H",
    stat_sma: "vs SMA50",
    stat_vol: "Vol ×avg",
    stat_pivot: "Pivot PP",
    stat_r1: "R1",
    stat_s1: "S1",
    regime_unknown: "Regime —",
    siglog_title: "Variazioni Segnale",
    siglog_empty: "Nessuna variazione registrata",
    siglog_clear: "Cancella",
    siglog_th_time: "Ora",
    siglog_th_change: "Variazione",
    // help sections html
    sec_overview: `<h3>🏠 Panoramica</h3>
<p><strong>FinancePalmirioBot</strong> è una dashboard web per monitorare ETF tematici legati ai macro-trend geopolitici (Iran-USA, Russia-Ucraina, ecc.). Aggrega prezzi live da Yahoo Finance, calcola indicatori tecnici su dati storici a 3 mesi, e combina tutto in un <strong>segnale di trading</strong> che si adatta allo scenario geopolitico corrente.</p>
<h4>Le tre viste principali</h4>
<table class="help-tbl"><tr><th>Tab</th><th>Cosa mostra</th></tr>
<tr><td>📊 Live</td><td>Card per ogni ETF con prezzo in tempo reale, variazione giornaliera, range di seduta e mini-segnale</td></tr>
<tr><td>📈 Segnali</td><td>Tabella completa con tutti gli indicatori tecnici, livelli di entrata/uscita e segnale composito — <strong>ordinabile cliccando le intestazioni</strong></td></tr></table>
<h4>Aggiornamento automatico</h4>
<p>I <strong>prezzi live</strong> si aggiornano ogni <strong>60 secondi</strong>. Gli <strong>indicatori tecnici</strong> vengono caricati all'apertura della tab Segnali e si possono aggiornare manualmente con <strong>↺ Aggiorna</strong>.</p>
<div class="help-callout"><strong>Nota valuta:</strong> Gli ETF su London Stock Exchange vengono quotati in pence (GBp). La dashboard normalizza automaticamente in sterline (GBP) dividendo per 100.</div>`,
    sec_macro: `<h3>📡 Barra Macro</h3>
<p>Sempre visibile in cima alla pagina. Mostra in tempo reale quattro benchmark globali per leggere il contesto di mercato.</p>
<table class="help-tbl"><tr><th>Simbolo</th><th>Cosa misura</th><th>Perché conta</th></tr>
<tr><td>🛢️ Brent</td><td>Prezzo petrolio greggio</td><td>Proxy tensioni geopolitiche. Sale forte se si teme blocco Stretto di Hormuz</td></tr>
<tr><td>🥇 Gold</td><td>Prezzo oro spot</td><td>Rifugio in fasi risk-off: sale quando c'è paura, scende in risk-on</td></tr>
<tr><td>📊 S&P500</td><td>Indice azionario USA</td><td>Termometro del risk appetite globale</td></tr>
<tr><td>😰 VIX</td><td>Volatilità implicita S&P500</td><td>"Fear index": sopra 25 il mercato è nervoso e incerto</td></tr></table>
<div class="help-callout">La barra si aggiorna ogni 60 secondi. Cliccando <strong>↺</strong> si forza l'aggiornamento immediato.</div>`,
    sec_regime: `<h3>🎚️ Regime di Mercato (auto-rilevato)</h3>
<p>Il sistema classifica automaticamente il contesto di mercato ogni minuto combinando i dati di Gold, S&P500 e VIX.</p>
<table class="help-tbl"><tr><th>Badge</th><th>Condizione</th><th>Significato</th></tr>
<tr><td><span class="help-pill green">📈 Risk-On</span></td><td>Gold↓ e S&P500 &gt; +0,5%</td><td>Investitori comprano rischio. Favorisce ETF equity, tech, ciclo</td></tr>
<tr><td><span class="help-pill red">🛡️ Risk-Off</span></td><td>Gold &gt; +0,5% e S&P500↓</td><td>Fuga verso sicurezza. Favorisce oro, argento, volatilità</td></tr>
<tr><td><span class="help-pill orange">😵 Volatile</span></td><td>VIX &gt; 25 oppure |S&P500| &gt; 1,5%</td><td>Alta incertezza, movimenti bruschi in entrambe le direzioni</td></tr></table>
<div class="help-callout"><strong>Differenza chiave:</strong> il regime viene <em>rilevato automaticamente</em> dai dati di mercato. Il regime corrente viene confrontato con il regime ideale di ogni ETF: se coincidono il segnale riceve un boost di <strong>+0,20</strong>, se sono opposti subisce una penalità di <strong>−0,20</strong>.</div>`,
    sec_scenarios: `<h3>🎭 Scenari Geopolitici (manuali)</h3>
<p>Permettono di "colorare" i segnali tecnici con la tua visione macro. Si selezionano manualmente nella barra macro.</p>
<table class="help-tbl"><tr><th>Scenario</th><th>Contesto</th><th>Favorisce</th><th>Penalizza</th></tr>
<tr><td>⚖️ Neutro</td><td>Nessun bias geopolitico, segnali puramente tecnici</td><td>—</td><td>—</td></tr>
<tr><td>😵 Volatile</td><td>Incertezza elevata, nessuna direzione chiara</td><td>PAURA, ENERGIA</td><td>EQUITY, TECH</td></tr>
<tr><td>🔥 Escalation</td><td>Tensione in aumento, rischio blocco Hormuz</td><td>ENERGIA ★, PAURA, METALLI</td><td>EQUITY, TECH, CICLO</td></tr>
<tr><td>🕊️ De-escalation</td><td>Trattative, accordi, distensione</td><td>EQUITY, TECH, CICLO, INFRA</td><td>PAURA, ENERGIA, METALLI</td></tr></table>
<div class="help-callout"><strong>Iran-USA vs Russia-Ucraina:</strong> In questo contesto il driver primario è <strong>ENERGIA</strong> (rischio blocco Stretto di Hormuz → shock petrolifero), non FOOD come nel conflitto ucraino.</div>`,
    sec_rsi: `<h3>📊 RSI(14) — Relative Strength Index</h3>
<p>Misura la forza del trend recente su <strong>14 giorni</strong>. Va da 0 a 100.</p>
<table class="help-tbl"><tr><th>Valore</th><th>Zona</th><th>Segnale</th></tr>
<tr><td><span class="help-pill green">&lt; 30</span></td><td>🟢 Ipervenduto forte</td><td>Possibile rimbalzo, zona acquisto</td></tr>
<tr><td><span class="help-pill green">30–45</span></td><td>🟢 Debolezza</td><td>Leggero bias bullish</td></tr>
<tr><td><span class="help-pill muted">45–55</span></td><td>⚪ Neutro</td><td>Nessun segnale direzionale chiaro</td></tr>
<tr><td><span class="help-pill red">55–70</span></td><td>🔴 Forza</td><td>Leggero bias bearish</td></tr>
<tr><td><span class="help-pill red">&gt; 70</span></td><td>🔴 Ipercomprato</td><td>Possibile correzione, zona vendita</td></tr></table>`,
    sec_macd: `<h3>〰️ MACD(12/26/9)</h3>
<p>Confronta due medie mobili esponenziali per misurare il <strong>momentum</strong> del trend.</p>
<table class="help-tbl"><tr><th>Componente</th><th>Formula</th></tr>
<tr><td>MACD Line</td><td>EMA(12) − EMA(26)</td></tr>
<tr><td>Signal Line</td><td>EMA(9) della MACD Line</td></tr>
<tr><td>Istogramma ★</td><td>MACD Line − Signal Line</td></tr></table>
<div class="help-callout">Il MACD è un <strong>indicatore lagging</strong>: conferma trend già in atto, non li anticipa.</div>`,
    sec_boll: `<h3>〽️ Bollinger Bands (20/2σ)</h3>
<p>Tre bande calcolate intorno alla media mobile a 20 giorni.</p>
<table class="help-tbl"><tr><th>Posizione prezzo</th><th>Segnale</th></tr>
<tr><td>Sotto la banda inferiore</td><td><span class="help-pill green">++ Bullish</span></td></tr>
<tr><td>Tra banda inf. e mid</td><td><span class="help-pill green">+ Lievemente bullish</span></td></tr>
<tr><td>Intorno alla mid</td><td><span class="help-pill muted">Neutro</span></td></tr>
<tr><td>Tra mid e banda sup.</td><td><span class="help-pill red">− Lievemente bearish</span></td></tr>
<tr><td>Sopra la banda superiore</td><td><span class="help-pill red">−− Bearish</span></td></tr></table>`,
    sec_sma: `<h3>📉 SMA50 — Media Mobile Semplice 50 giorni</h3>
<p>La media dei prezzi di chiusura degli ultimi <strong>50 giorni di trading</strong>. Rappresenta la direzione del trend di medio termine.</p>
<table class="help-tbl"><tr><th>Colonna "vs SMA50"</th><th>Significato</th></tr>
<tr><td><span class="help-pill green">+X.XX%</span></td><td>Prezzo sopra la media → trend rialzista</td></tr>
<tr><td><span class="help-pill red">−X.XX%</span></td><td>Prezzo sotto la media → trend ribassista</td></tr></table>`,
    sec_pivot: `<h3>📍 Pivot Points</h3>
<p>Livelli di supporto e resistenza calcolati dai dati della <strong>sessione precedente</strong>.</p>
<div class="help-code">PP = (High + Low + Close) / 3<br>R1 = 2×PP − Low &nbsp;&nbsp; R2 = PP + (High − Low)<br>S1 = 2×PP − High &nbsp; S2 = PP − (High − Low)</div>
<table class="help-tbl"><tr><th>Livello</th><th>Uso pratico</th></tr>
<tr><td>S1</td><td>Primo ingresso (E1)</td></tr>
<tr><td>S2</td><td>Supporto forte (E3)</td></tr>
<tr><td>R1</td><td>Prima resistenza — take profit parziale</td></tr>
<tr><td>R2</td><td>Obiettivo di prezzo</td></tr></table>`,
    sec_signal: `<h3>🎯 Segnale Composito</h3>
<p>Combina tutti gli indicatori in un <strong>punteggio unico</strong> e lo traduce in un badge colorato.</p>
<div class="help-code">Score = Score tecnico + Aggiustamento scenario + Aggiustamento regime</div>
<table class="help-tbl"><tr><th>Badge</th><th>Score</th><th>Significato</th></tr>
<tr><td><span class="sig-badge sig-buy-strong">★ COMPRA</span></td><td>≥ +0,70</td><td>Forte segnale rialzista</td></tr>
<tr><td><span class="sig-badge sig-buy">↑ ACCUM.</span></td><td>≥ +0,25</td><td>Accumulo progressivo consigliato</td></tr>
<tr><td><span class="sig-badge sig-hold">◆ HOLD</span></td><td>−0,25 / +0,25</td><td>Nessuna direzione chiara</td></tr>
<tr><td><span class="sig-badge sig-sell">↓ RIDUCI</span></td><td>≤ −0,25</td><td>Considera riduzione dell'esposizione</td></tr>
<tr><td><span class="sig-badge sig-sell-strong">✖ VENDI</span></td><td>≤ −0,70</td><td>Forte segnale ribassista, uscita consigliata</td></tr></table>`,
    sec_levels: `<h3>🪜 Ladder di Entrata E1 / E2 / E3</h3>
<p>Strategia di acquisto <strong>scaglionato</strong> per ridurre il rischio di timing sbagliato.</p>
<table class="help-tbl"><tr><th>Livello</th><th>Prezzo</th><th>Peso</th></tr>
<tr><td><span class="help-pill green">E1</span></td><td>S1</td><td>30%</td></tr>
<tr><td><span class="help-pill orange">E2</span></td><td>Midpoint S1–S2</td><td>30%</td></tr>
<tr><td><span class="help-pill red">E3</span></td><td>S2</td><td>40%</td></tr></table>
<div class="help-callout"><strong>Strategia:</strong> compra E1→E2→E3 con segnale ★ COMPRA o ↑ ACCUM., poi vendi a R1 o R2.</div>`,
    sec_etf: `<h3>📋 ETF in Watchlist</h3>
<p>ETF tematici selezionati per la loro sensibilità ai macro-trend geopolitici.</p>
<table class="help-tbl"><tr><th>Driver</th><th>Tema</th></tr>
<tr><td>😰 PAURA</td><td>Safe haven, oro fisico</td></tr>
<tr><td>🥈 METALLI</td><td>Metalli preziosi e critici</td></tr>
<tr><td>⚡ ENERGIA</td><td>Nucleare, rinnovabili</td></tr>
<tr><td>💻 TECH</td><td>Tecnologia, semiconduttori</td></tr>
<tr><td>📈 EQUITY</td><td>Azionario globale/qualità</td></tr>
<tr><td>🏗️ INFRA</td><td>Infrastrutture fisiche</td></tr>
<tr><td>🌍 GEO</td><td>Geopolitico diretto / minerali strategici</td></tr></table>`,
    sec_workflow: `<h3>✅ Workflow Quotidiano</h3>
<p>Come usare la dashboard in modo efficace ogni giorno:</p>
<div class="help-step"><div class="help-step-num">1</div><p><strong>Guarda la Barra Macro</strong> — qual è il regime? Questo ti dice subito il contesto di mercato.</p></div>
<div class="help-step"><div class="help-step-num">2</div><p><strong>Imposta lo Scenario</strong> — come leggi il contesto geopolitico oggi?</p></div>
<div class="help-step"><div class="help-step-num">3</div><p><strong>Apri la tab Segnali</strong> → ordina per SEGNALE decrescente. I migliori ETF salgono in cima.</p></div>
<div class="help-step"><div class="help-step-num">4</div><p><strong>Filtra per RSI</strong> — tra i migliori, cerca RSI sotto 45.</p></div>
<div class="help-step"><div class="help-step-num">5</div><p><strong>Pianifica gli ingressi</strong> con E1/E2/E3.</p></div>
<div class="help-callout"><strong>⚠️ Avvertenze:</strong> I dati vengono da Yahoo Finance tramite proxy — possibili ritardi fino a 15 minuti. I segnali sono <strong>puramente indicativi</strong> e non costituiscono consulenza finanziaria.</div>`,
  },
  en: {
    tab_signals: "📈 ETF",
    tab_semis: "🔬 Semis",
    tab_macro: "🌍 Macro",
    tab_bond: "💰 Bond/Equity",
    tab_btp: "🏛️ BTP",
    // macro monitor
    mc_title: "🌍 Macro Indicators",
    mc_subtitle: "Commodity & macro — global context for theses",
    mc_desc:
      "Commodity indicators independent from the semis thesis. Copper is a physical-layer proxy for AI infra demand.",
    // semis monitor
    sm_subtitle: "Six auto-updated indicators · living checklist",
    sm_last_update: "Last update:",
    sm_loading: "Loading prices…",
    sm_refresh_btn: "Refresh now",
    sm_refreshing: "Refreshing…",
    sm_export_btn: "Export JSON",
    sm_reset_btn: "Reset defaults",
    sm_cal_title: "Earnings & key events calendar — next 4 months",
    sm_cal_th_date: "Date",
    sm_cal_th_event: "Company / event",
    sm_cal_th_why: "Why it matters",
    sm_cal_th_link: "Link",
    sm_footer_data:
      "Auto-fetch via SEC EDGAR, GitHub API, Yahoo Finance, Google News RSS (proxy: Cloudflare Worker). Network errors or rate-limits may fail individual reads.",
    sm_footer_storage: "State saved in localStorage — no data on server.",
    sm_st_green: "Calm",
    sm_st_yellow: "Warning",
    sm_st_red: "Alert",
    sm_indicator: "INDICATOR",
    sm_headlines_lbl: 'Latest headlines ({n}) · "{q}"',
    sm_fetch_err: "Partial fetch:",
    sm_next_update: "Next update:",
    sm_autofetch: "Auto-fetch:",
    sm_ef_value: "Current value",
    sm_ef_status: "Status",
    sm_ef_green: "Green — Calm",
    sm_ef_yellow: "Yellow — Warning",
    sm_ef_red: "Red — Alert",
    sm_ef_append: "Add point to history",
    sm_ef_append_ph: "Leave empty to keep series unchanged",
    sm_ef_label: "New point label",
    sm_ef_label_ph: "e.g. Q2 26",
    sm_ef_note: "Personal note",
    sm_ef_cancel: "Cancel",
    sm_ef_save: "Save",
    sm_comp_expansion: "EXPANSION",
    sm_comp_latecycle: "LATE CYCLE",
    sm_comp_digestion: "DIGESTION RISK",
    sm_narr_expansion: "Cycle still in expansion phase. Few stress signals.",
    sm_narr_latecycle:
      "Mixed indicators. Watch for double-ordering and synchronised capacity adds.",
    sm_narr_digestion:
      "Pattern consistent with a turn in the next 2-3 quarters. Reassess memory and merchant accelerator exposure.",
    sm_th_oneliner:
      "Diversified exposure to the AI semis cycle — $350B+ hyperscaler capex landing in the hardware stack.",
    sm_th_verdict: "HOLD",
    sm_th_stop:
      "⚠️ Thesis stop-loss: (1) HBM3E pricing < −15% HoH · (2) Hyperscaler capex flat/down for 2027 · (3) SOX < SMA200 for 3+ weeks · (4) Export controls impairing TSMC / ASML",
    sm_col_green: "Green",
    sm_col_yellow: "Yellow",
    sm_col_red: "Red",
    sm_fetch_btn: "↻ Fetch",
    sm_ir_link: "IR →",
    cur_native: "Native",
    search_placeholder: "Search by ticker, ISIN or name (e.g. SWDA, IE00…)",
    add_btn: "+ Add",
    export_btn: "⬇ Export list",
    export_title: "Download your custom watchlist",
    import_btn: "⬆ Import list",
    import_title: "Restore list from file",
    macro_lbl: "Macro",
    scen_lbl: "Scenario",
    scen_neutro: "⚖️ Neutral",
    scen_volatile: "😵 Volatile",
    scen_escalation: "🔥 Escalation",
    scen_tregua: "🕊️ De-escalation",
    signals_heading: "📈 Trading Signals",
    signals_refresh: "↺ Refresh",
    th_price: "Price",
    th_var: "Chg%",
    th_signal: "SIGNAL",
    th_e1_title: "E1 — 30% entry at S1",
    th_e2_title: "E2 — 30% entry at mid S1-S2",
    th_e3_title: "E3 — 40% entry at S2",
    th_r1_title: "Sell ≥ R1 (first resistance)",
    th_r2_title: "Target R2 (second resistance)",
    th_rsi_title: "RSI(14) — <30 oversold · >70 overbought",
    th_sma_title: "% distance from SMA50",
    th_macd_title: "MACD(12/26/9) — histogram",
    th_vol_title: "Today's volume ÷ 20-session average",
    legend_signals: "Signals:",
    legend_levels_label: "Levels:",
    legend_levels_text:
      "S1=buy S2=stop R1=sell R2=target (previous session Pivot Points)",
    legend_rsi: "<30 oversold · >70 overbought",
    sig_buy_strong: "★ BUY",
    sig_buy: "↑ ACCUM.",
    sig_hold: "◆ HOLD",
    sig_hold_desc: "neutral",
    sig_sell: "↓ REDUCE",
    sig_sell_strong: "✖ SELL",
    help_title: "📖 Guide <span>FinancePalmirioBot</span>",
    help_close: "✕ Close",
    nav_overview: "🏠 Overview",
    nav_macro: "📡 Macro Bar",
    nav_regime: "🎚️ Regime",
    nav_scenarios: "🎭 Scenarios",
    nav_signal: "🎯 Signal",
    nav_etf: "📋 ETF list",
    // dynamic
    mkt_open: "Open",
    mkt_pre: "Pre-Mkt",
    mkt_post: "Post-Mkt",
    mkt_closed: "Closed",
    loading: "Loading…",
    chart_loading: "Loading chart…",
    chart_error: "Error loading data",
    period_perf_in: "in period",
    warn_below_supports:
      "Price below all supports — levels now act as resistance",
    vol_hi_tip: "Vol {r}× avg — confirms the move",
    vol_lo_tip: "Vol {r}× avg — weak conviction",
    vol_norm_tip: "Vol {r}× avg",
    toast_copied: "📋 {id} copied",
    toast_copy_fail: "❌ Copy failed",
    toast_refreshing: "Refreshing…",
    toast_already: "{id} already in list",
    toast_added: "{id} added, loading…",
    toast_removed: "{id} removed",
    toast_exported: "List exported",
    toast_imported: "{n} items imported",
    toast_invalid: "Invalid file",
    toast_wl_warn: "⚠️ watchlist.json not found — using default list",
    detail_open: "Open detail {id}",
    stat_rsi: "RSI 14",
    stat_macd: "MACD H",
    stat_sma: "vs SMA50",
    stat_vol: "Vol ×avg",
    stat_pivot: "Pivot PP",
    stat_r1: "R1",
    stat_s1: "S1",
    regime_unknown: "Regime —",
    siglog_title: "Signal Changes",
    siglog_empty: "No changes recorded yet",
    siglog_clear: "Clear",
    siglog_th_time: "Time",
    siglog_th_change: "Change",
    // help sections html
    sec_overview: `<h3>🏠 Overview</h3>
<p><strong>FinancePalmirioBot</strong> is a web dashboard for monitoring thematic ETFs tied to geopolitical macro trends (Iran-USA, Russia-Ukraine, etc.). It aggregates live prices from Yahoo Finance, computes technical indicators on 3-month historical data, and combines everything into a <strong>trading signal</strong> that adapts to the current geopolitical scenario.</p>
<h4>Main views</h4>
<table class="help-tbl"><tr><th>Tab</th><th>What it shows</th></tr>
<tr><td>📊 Live</td><td>Card for each ETF with real-time price, daily change, session range and mini-signal</td></tr>
<tr><td>📈 Signals</td><td>Full table with all technical indicators, entry/exit levels and composite signal — <strong>sortable by clicking headers</strong></td></tr></table>
<h4>Auto-refresh</h4>
<p><strong>Live prices</strong> refresh every <strong>60 seconds</strong>. <strong>Technical indicators</strong> are loaded when the Signals tab is opened and can be refreshed manually with <strong>↺ Refresh</strong>.</p>
<div class="help-callout"><strong>Currency note:</strong> ETFs on the London Stock Exchange are quoted in pence (GBp). The dashboard automatically normalises to pounds (GBP) by dividing by 100.</div>`,
    sec_macro: `<h3>📡 Macro Bar</h3>
<p>Always visible at the top of the page. Shows four global benchmarks in real time to read market context.</p>
<table class="help-tbl"><tr><th>Symbol</th><th>What it measures</th><th>Why it matters</th></tr>
<tr><td>🛢️ Brent</td><td>Crude oil price</td><td>Geopolitical tension proxy. Spikes on Strait of Hormuz risk</td></tr>
<tr><td>🥇 Gold</td><td>Spot gold price</td><td>Risk-off refuge: rises on fear, falls in risk-on</td></tr>
<tr><td>📊 S&P500</td><td>US equity index</td><td>Global risk appetite thermometer</td></tr>
<tr><td>😰 VIX</td><td>Implied S&P500 volatility</td><td>Fear index: above 25 means nervous, uncertain market</td></tr></table>
<div class="help-callout">The bar refreshes every 60 seconds. Click <strong>↺</strong> to force an immediate update.</div>`,
    sec_regime: `<h3>🎚️ Market Regime (auto-detected)</h3>
<p>The system automatically classifies the market context every minute by combining Gold, S&P500 and VIX data.</p>
<table class="help-tbl"><tr><th>Badge</th><th>Condition</th><th>Meaning</th></tr>
<tr><td><span class="help-pill green">📈 Risk-On</span></td><td>Gold↓ and S&P500 &gt; +0.5%</td><td>Investors buying risk. Favours equity, tech, cyclical ETFs</td></tr>
<tr><td><span class="help-pill red">🛡️ Risk-Off</span></td><td>Gold &gt; +0.5% and S&P500↓</td><td>Flight to safety. Favours gold, silver, volatility</td></tr>
<tr><td><span class="help-pill orange">😵 Volatile</span></td><td>VIX &gt; 25 or |S&P500| &gt; 1.5%</td><td>High uncertainty, sharp moves in both directions</td></tr></table>
<div class="help-callout"><strong>Key distinction:</strong> regime is <em>auto-detected</em> from market data. If it matches an ETF's ideal regime, the signal gets a <strong>+0.20</strong> boost; if opposite, a <strong>−0.20</strong> penalty.</div>`,
    sec_scenarios: `<h3>🎭 Geopolitical Scenarios (manual)</h3>
<p>Allow you to colour the technical signals with your macro view. Select manually in the macro bar.</p>
<table class="help-tbl"><tr><th>Scenario</th><th>Context</th><th>Favours</th><th>Penalises</th></tr>
<tr><td>⚖️ Neutral</td><td>No geopolitical bias, purely technical signals</td><td>—</td><td>—</td></tr>
<tr><td>😵 Volatile</td><td>High uncertainty, no clear direction</td><td>PAURA, ENERGIA</td><td>EQUITY, TECH</td></tr>
<tr><td>🔥 Escalation</td><td>Rising tension, Hormuz blockade risk</td><td>ENERGIA ★, PAURA, METALLI</td><td>EQUITY, TECH, CICLO</td></tr>
<tr><td>🕊️ De-escalation</td><td>Negotiations, agreements, détente</td><td>EQUITY, TECH, CICLO, INFRA</td><td>PAURA, ENERGIA, METALLI</td></tr></table>
<div class="help-callout"><strong>Iran-USA vs Russia-Ukraine:</strong> In this context the primary driver is <strong>ENERGIA</strong> (Strait of Hormuz blockade risk → oil shock), not FOOD as in the Ukraine conflict where wheat was the key factor.</div>`,
    sec_rsi: `<h3>📊 RSI(14) — Relative Strength Index</h3>
<p>Measures recent trend strength over <strong>14 days</strong>. Ranges from 0 to 100.</p>
<table class="help-tbl"><tr><th>Value</th><th>Zone</th><th>Signal</th></tr>
<tr><td><span class="help-pill green">&lt; 30</span></td><td>🟢 Strong oversold</td><td>Possible bounce — buying zone</td></tr>
<tr><td><span class="help-pill green">30–45</span></td><td>🟢 Weakness</td><td>Slight bullish bias, recovery likely</td></tr>
<tr><td><span class="help-pill muted">45–55</span></td><td>⚪ Neutral</td><td>No clear directional signal</td></tr>
<tr><td><span class="help-pill red">55–70</span></td><td>🔴 Strength</td><td>Slight bearish bias, caution on entry</td></tr>
<tr><td><span class="help-pill red">&gt; 70</span></td><td>🔴 Overbought</td><td>Possible correction — selling zone</td></tr></table>`,
    sec_macd: `<h3>〰️ MACD(12/26/9)</h3>
<p>Compares two exponential moving averages to measure trend <strong>momentum</strong>.</p>
<table class="help-tbl"><tr><th>Component</th><th>Formula</th></tr>
<tr><td>MACD Line</td><td>EMA(12) − EMA(26)</td></tr>
<tr><td>Signal Line</td><td>EMA(9) of MACD Line</td></tr>
<tr><td>Histogram ★</td><td>MACD Line − Signal Line</td></tr></table>
<div class="help-callout">MACD is a <strong>lagging indicator</strong>: it confirms trends already underway, it does not anticipate them.</div>`,
    sec_boll: `<h3>〽️ Bollinger Bands (20/2σ)</h3>
<p>Three bands calculated around the 20-day moving average. Width expands in volatile periods.</p>
<table class="help-tbl"><tr><th>Price position</th><th>Signal</th></tr>
<tr><td>Below lower band</td><td><span class="help-pill green">++ Bullish</span> — anomalously low price</td></tr>
<tr><td>Between lower and mid</td><td><span class="help-pill green">+ Slightly bullish</span></td></tr>
<tr><td>Around mid</td><td><span class="help-pill muted">Neutral</span></td></tr>
<tr><td>Between mid and upper</td><td><span class="help-pill red">− Slightly bearish</span></td></tr>
<tr><td>Above upper band</td><td><span class="help-pill red">−− Bearish</span> — anomalously high price</td></tr></table>`,
    sec_sma: `<h3>📉 SMA50 — 50-day Simple Moving Average</h3>
<p>The average of closing prices over the last <strong>50 trading days</strong>. Defines medium-term trend direction.</p>
<table class="help-tbl"><tr><th>Column "vs SMA50"</th><th>Meaning</th></tr>
<tr><td><span class="help-pill green">+X.XX%</span></td><td>Price above average → medium-term uptrend</td></tr>
<tr><td><span class="help-pill red">−X.XX%</span></td><td>Price below average → medium-term downtrend</td></tr></table>`,
    sec_pivot: `<h3>📍 Pivot Points</h3>
<p>Support and resistance levels automatically calculated from the <strong>previous session</strong> data (High, Low, Close).</p>
<div class="help-code">PP = (High + Low + Close) / 3<br>R1 = 2×PP − Low &nbsp;&nbsp; R2 = PP + (High − Low)<br>S1 = 2×PP − High &nbsp; S2 = PP − (High − Low)</div>
<table class="help-tbl"><tr><th>Level</th><th>Practical use</th></tr>
<tr><td>S1</td><td>First entry (E1) — price tends to bounce here</td></tr>
<tr><td>S2</td><td>Strong support (E3) — aggressive buying zone</td></tr>
<tr><td>R1</td><td>First resistance — partial take profit</td></tr>
<tr><td>R2</td><td>Realistic short-term price target</td></tr></table>`,
    sec_signal: `<h3>🎯 Composite Signal</h3>
<p>Combines all indicators into a <strong>single score</strong> and translates it into a coloured badge.</p>
<div class="help-code">Final score = Technical score + Scenario adjustment + Regime adjustment</div>
<table class="help-tbl"><tr><th>Badge</th><th>Score</th><th>Meaning</th></tr>
<tr><td><span class="sig-badge sig-buy-strong">★ BUY</span></td><td>≥ +0.70</td><td>Strong bullish signal: 3+ bullish indicators aligned</td></tr>
<tr><td><span class="sig-badge sig-buy">↑ ACCUM.</span></td><td>≥ +0.25</td><td>Progressive accumulation advised, favourable trend</td></tr>
<tr><td><span class="sig-badge sig-hold">◆ HOLD</span></td><td>−0.25 / +0.25</td><td>No clear direction, hold position</td></tr>
<tr><td><span class="sig-badge sig-sell">↓ REDUCE</span></td><td>≤ −0.25</td><td>Bearish signal, consider reducing exposure</td></tr>
<tr><td><span class="sig-badge sig-sell-strong">✖ SELL</span></td><td>≤ −0.70</td><td>Strong bearish signal: 3+ bearish indicators, exit advised</td></tr></table>`,
    sec_levels: `<h3>🪜 Entry Ladder E1 / E2 / E3</h3>
<p><strong>Scaled entry</strong> strategy to reduce timing risk. Split purchases across three support levels.</p>
<table class="help-tbl"><tr><th>Level</th><th>Price</th><th>Weight</th><th>Logic</th></tr>
<tr><td><span class="help-pill green">E1</span></td><td>S1 (Support 1)</td><td>30%</td><td>First entry if price touches first support</td></tr>
<tr><td><span class="help-pill orange">E2</span></td><td>Midpoint S1–S2</td><td>30%</td><td>Intermediate entry if it falls further</td></tr>
<tr><td><span class="help-pill red">E3</span></td><td>S2 (Support 2)</td><td>40%</td><td>Final entry at deepest support — larger weight as price is cheaper</td></tr></table>
<div class="help-callout"><strong>Full strategy:</strong> buy E1→E2→E3 when signal is ★ BUY or ↑ ACCUM., then sell at R1 or R2 depending on risk tolerance.</div>`,
    sec_etf: `<h3>📋 ETF Watchlist</h3>
<p>Thematic ETFs selected for their sensitivity to geopolitical macro trends.</p>
<table class="help-tbl"><tr><th>Driver</th><th>Theme</th></tr>
<tr><td>😰 PAURA</td><td>Safe haven, physical gold</td></tr>
<tr><td>🥈 METALLI</td><td>Precious and critical metals</td></tr>
<tr><td>⚡ ENERGIA</td><td>Nuclear, renewables</td></tr>
<tr><td>💻 TECH</td><td>Technology, semiconductors</td></tr>
<tr><td>📈 EQUITY</td><td>Global/quality equities</td></tr>
<tr><td>🏗️ INFRA</td><td>Physical infrastructure</td></tr>
<tr><td>🌍 GEO</td><td>Direct geopolitical / strategic minerals</td></tr></table>`,
    sec_workflow: `<h3>✅ Daily Workflow</h3>
<p>How to use the dashboard effectively in a few minutes each day:</p>
<div class="help-step"><div class="help-step-num">1</div><p><strong>Check the Macro Bar</strong> — what is the regime? <span class="help-pill green">Risk-On</span> <span class="help-pill red">Risk-Off</span> <span class="help-pill orange">Volatile</span>?</p></div>
<div class="help-step"><div class="help-step-num">2</div><p><strong>Set the Scenario</strong> — how do you read today's geopolitical context? Escalation? De-escalation? Uncertain?</p></div>
<div class="help-step"><div class="help-step-num">3</div><p><strong>Open the Signals tab</strong> → sort by SIGNAL descending. The best ETFs for the current context rise to the top.</p></div>
<div class="help-step"><div class="help-step-num">4</div><p><strong>Filter by RSI</strong> — among the best, look for RSI below 45. Low RSI + positive signal = best risk/reward.</p></div>
<div class="help-step"><div class="help-step-num">5</div><p><strong>Plan entries</strong> with E1/E2/E3. Don't buy all at once: 30% at E1, 30% at E2, 40% at E3.</p></div>
<div class="help-callout"><strong>⚠️ Disclaimer:</strong> Data comes from Yahoo Finance via public proxy — possible delays up to 15 minutes. Signals are <strong>purely indicative</strong> and do not constitute financial advice.</div>`,
  },
};

export { STRINGS };
