import { PROXY_CUSTOM, proxiedFetch } from "../core/network.js";

async function btp_proxiedText(target) {
  return (await proxiedFetch(target, {}, 8000)).text();
}

// Base del worker (PROXY_CUSTOM = 'https://.../?url=' -> 'https://.../'); null se non configurato
function btp_workerBase() {
  if (!PROXY_CUSTOM) return null;
  const m = PROXY_CUSTOM.match(/^(https?:\/\/[^?]*\/)\?url=$/);
  return m ? m[1] : null;
}

// Prezzo BTP: prima l'endpoint JSON del worker (parsing lato server + cache 45s),
// poi fallback allo scraping HTML via catena proxy (robustezza se il worker è vecchio/giù)
async function btp_fetchBI(isin) {
  const wb = btp_workerBase();
  if (wb) {
    try {
      const r = await fetch(wb + "?btp=" + encodeURIComponent(isin), {
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.price != null) return { price: j.price, pct: j.pct };
      }
    } catch (e) {
      /* fallback sotto */
    }
  }
  // fallback: scraping HTML lato client (come prima)
  const target = `https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/dati-completi.html?isin=${isin}&mic=MOTX&lang=it&_=${Date.now()}`;
  const flat = (await btp_proxiedText(target)).replace(/\s+/g, " ");
  const cell = (lab) => {
    const m = flat.match(
      new RegExp(
        lab +
          '<\\/strong>.{0,100}?<span class="t-text -right">\\s*([+-]?[\\d.]*\\d[,.]\\d+)\\s*<\\/span>',
      ),
    );
    return m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : null;
  };
  const price =
    cell("Prezzo Ultimo Contratto") ??
    cell("Prezzo di riferimento") ??
    cell("Prezzo ufficiale");
  if (price == null) throw new Error("price not found: " + isin);
  return { price, pct: cell("Var %") };
}

// Spread BTP-Bund 10Y (bps): endpoint JSON del worker, poi fallback scraping Teleborsa
async function btp_fetchSpread() {
  const wb = btp_workerBase();
  if (wb) {
    try {
      const r = await fetch(wb + "?spread=1", {
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.spread != null) return j.spread;
      }
    } catch (e) {
      /* fallback sotto */
    }
  }
  const target =
    "https://borsaitaliana.teleborsa.it/Pages/Spread/2021/Item.aspx?code=YIELD10_BTP&lang=en";
  const txt = await btp_proxiedText(target);
  const m = txt.match(/ctlHeader_lblPrice[^>]*>\s*([\d.,]+)\s*point/i);
  if (!m) throw new Error("spread not found");
  return parseFloat(m[1].replace(/\./g, "").replace(",", "."));
}

// Yahoo Finance chart API — per C3M.MI (ETF, non BTP)
async function btp_fetchYF(ticker) {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const txt = await btp_proxiedText(target);
  const j = JSON.parse(txt);
  const meta = j?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (price == null) throw new Error("no price");
  const prev = meta?.chartPreviousClose;
  return { price, pct: prev && price ? ((price - prev) / prev) * 100 : null };
}

export { btp_fetchBI, btp_fetchSpread, btp_fetchYF };
