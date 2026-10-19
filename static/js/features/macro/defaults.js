const mc_DEFAULTS = {
  indicators: [
    {
      id: "copper_copm",
      title: "Copper / COPM — AI Infra Picks & Shovels",
      subtitle:
        "Un livello sotto i semi: datacenter AI usa 4–5× più rame di un DC cloud tradizionale. Supply strutturalmente rigida.",
      value: 10200,
      unit: "$/t (LME · COMEX HG=F)",
      history: [8800, 9400, 10200, 11500, 13000, 10200],
      labels: ["Q2 25", "Q3 25", "Q4 25", "Q1 26", "Apr 26", "live"],
      direction: "higher_is_signal",
      status: "green",
      signal:
        "Setup pluriennale bullish: <b>domanda AI + elettrificazione</b> +5–7%/anno vs storico +1–2%. Supply rigida: Cobre Panamá −350kt/anno, grade ore Cile in calo, permitting 10–15 anni. Goldman/Citi/JPM target $11k–13k/t 2026–27. <b>COPM ha beta ~2–3× al prezzo rame</b> — amplifica sia l'upside che il drawdown vs ETF puri. Soglie status: GREEN ≥$10k · YELLOW $8–10k · RED &lt;$8k.",
      next: "Guidance Freeport Q2: ~23 lug 2026 · Antofagasta Q2 prod: ~24 lug 2026",
      autoMode: "news+proxy",
      gaugeMin: 6000,
      gaugeMax: 16000,
      gaugeBreaks: [
        { value: 8000, label: "$8k" },
        { value: 10000, label: "$10k" },
      ],
      newsQuery: "copper LME price AI datacenter supply deficit mining",
      proxyTicker: "COPM.MI",
      proxyLabel: "COPM.MI",
      sources: [
        {
          name: "LME Copper",
          url: "https://www.lme.com/Metals/Non-ferrous/LME-Copper",
        },
        { name: "Freeport IR", url: "https://fcx.com/investor-relations/" },
        {
          name: "Antofagasta IR",
          url: "https://www.antofagasta.co.uk/investors/",
        },
      ],
      headlines: [],
      proxy: null,
      lastFetched: null,
      fetchError: null,
      note: "",
    },
  ],
};

export { mc_DEFAULTS };
