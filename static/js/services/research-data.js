import { sm_TIMEOUT } from "../core/network.js";
import { proxiedFetch } from "../core/network.js";

// ── fetch helpers ──
function sm_fetchTimeout(url, opts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), sm_TIMEOUT);
  return fetch(url, Object.assign({}, opts, { signal: c.signal })).finally(() =>
    clearTimeout(t),
  );
}

async function sm_fetchYahoo(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5d&interval=1d`;
  const r = await proxiedFetch(url, {}, sm_TIMEOUT);
  if (!r.ok) throw new Error("Yahoo " + r.status);
  const j = await r.json();
  const res = j.chart?.result?.[0];
  if (!res) throw new Error("Yahoo: no result");
  return {
    price: res.meta.regularMarketPrice,
    prev: res.meta.chartPreviousClose,
  };
}
async function sm_fetchSecConcept(cik, concept) {
  const padded = String(cik).padStart(10, "0");
  const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${padded}/us-gaap/${concept}.json`;
  const r = await proxiedFetch(url, {}, sm_TIMEOUT);
  if (!r.ok) throw new Error("SEC " + r.status);
  return r.json();
}
async function sm_fetchGithub(owner, repo) {
  const r = await sm_fetchTimeout(
    `https://api.github.com/repos/${owner}/${repo}`,
  );
  if (!r.ok) throw new Error("GitHub " + r.status);
  return r.json();
}
async function sm_fetchNews(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const r = await proxiedFetch(url, {}, sm_TIMEOUT);
  if (!r.ok) throw new Error("GNews " + r.status);
  const txt = await r.text();
  const xml = new DOMParser().parseFromString(txt, "text/xml");
  return Array.from(xml.querySelectorAll("item"))
    .slice(0, 4)
    .map((i) => ({
      title: i.querySelector("title")?.textContent || "",
      link: i.querySelector("link")?.textContent || "",
      pubDate: i.querySelector("pubDate")?.textContent || "",
    }));
}

export { sm_fetchGithub, sm_fetchNews, sm_fetchSecConcept, sm_fetchYahoo };
