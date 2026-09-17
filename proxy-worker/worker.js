/**
 * FinancePalmirioBot — Cloudflare Worker CORS Proxy + BTP data API
 *
 * Deploy su https://dash.cloudflare.com → Workers & Pages → fpb-proxy → Edit code.
 * Incolla questo file e Deploy.
 *
 * URL worker (default nel sito, override con localStorage 'fpb_proxy'):
 *   https://fpb-proxy.robe-pisu.workers.dev/?url=
 *
 * ROUTE:
 *   ?url=<encoded>       proxy CORS generico (Yahoo ETF, grafici POST, teleborsa raw...) — invariato
 *   ?btp=<ISIN>          scraping + parsing lato server → JSON {isin,price,pct} (cache 45s)
 *   ?spread=1            spread BTP-Bund 10Y da Teleborsa → JSON {spread} (cache 120s)
 *
 * Il parsing HTML vive QUI, non nel browser: un solo punto da aggiornare se Borsa
 * Italiana cambia pagina, e la cache evita che N utenti facciano N*13 richieste.
 * Free tier: 100.000 req/giorno.
 */

const ALLOWED_HOSTS = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'finance.yahoo.com',
  'stooq.com',
  'news.google.com',
  'www.borsaitaliana.it',
  'charts.borsaitaliana.it',
  'borsaitaliana.teleborsa.it',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/json,text/plain,*/*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

const json = (obj, status = 200, extraTtl = 0) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': extraTtl > 0 ? `public, max-age=${extraTtl}` : 'no-store',
    },
  });

// numero italiano "1.234,56" -> 1234.56
function itNum(s) {
  if (s == null) return null;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// legge la cella valore accanto all'etichetta nella tabella "dati completi"
function biCell(flat, label) {
  const re = new RegExp(label + '<\\/strong>.{0,100}?<span class="t-text -right">\\s*(-?[\\d.]*\\d[,.]\\d+)\\s*<\\/span>');
  const m = flat.match(re);
  return m ? itNum(m[1]) : null;
}

async function handleBTP(isin) {
  if (!/^[A-Z0-9]{6,12}$/i.test(isin)) return json({ error: 'invalid isin' }, 400);
  const cache = caches.default;
  const cacheKey = new Request('https://fpb-cache/btp/' + isin);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const target = `https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/dati-completi.html?isin=${isin}&mic=MOTX&lang=it`;
  const r = await fetch(target, { headers: UPSTREAM_HEADERS });
  if (!r.ok) return json({ error: 'upstream ' + r.status, isin }, 502);
  const flat = (await r.text()).replace(/\s+/g, ' ');

  const price = biCell(flat, 'Prezzo Ultimo Contratto') ?? biCell(flat, 'Prezzo di riferimento') ?? biCell(flat, 'Prezzo ufficiale');
  if (price == null) return json({ error: 'price not found', isin }, 404);
  const pct = biCell(flat, 'Var %');

  const res = json({ isin, price, pct }, 200, 45);
  await cache.put(cacheKey, res.clone());
  return res;
}

async function handleSpread() {
  const cache = caches.default;
  const cacheKey = new Request('https://fpb-cache/spread');
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const target = 'https://borsaitaliana.teleborsa.it/Pages/Spread/2021/Item.aspx?code=YIELD10_BTP&lang=en';
  const r = await fetch(target, { headers: UPSTREAM_HEADERS });
  if (!r.ok) return json({ error: 'upstream ' + r.status }, 502);
  const txt = await r.text();
  const m = txt.match(/ctlHeader_lblPrice[^>]*>\s*([\d.,]+)\s*point/i);
  if (!m) return json({ error: 'spread not found' }, 404);

  const res = json({ spread: itNum(m[1]) }, 200, 120);
  await cache.put(cacheKey, res.clone());
  return res;
}

// proxy CORS generico — comportamento invariato (grafici POST, Yahoo, ecc.)
async function handleProxy(request, target) {
  let targetUrl;
  try { targetUrl = new URL(target); }
  catch { return new Response('Invalid URL', { status: 400, headers: CORS_HEADERS }); }
  if (!ALLOWED_HOSTS.includes(targetUrl.hostname))
    return new Response('Host not allowed', { status: 403, headers: CORS_HEADERS });

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      body: request.method === 'POST' ? await request.clone().arrayBuffer() : undefined,
      headers: {
        ...(request.headers.get('content-type') ? { 'Content-Type': request.headers.get('content-type') } : {}),
        ...UPSTREAM_HEADERS,
      },
    });
    const body = await upstream.text();
    const ut = upstream.headers.get('content-type') || '';
    const contentType = ut.includes('xml') || ut.includes('rss')
      ? 'application/xml; charset=utf-8'
      : ut.includes('html') ? 'text/html; charset=utf-8'
      : 'application/json; charset=utf-8';
    return new Response(body, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': contentType, 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    const { searchParams } = new URL(request.url);

    const btp = searchParams.get('btp');
    if (btp) return handleBTP(btp.trim());
    if (searchParams.get('spread')) return handleSpread();

    const target = searchParams.get('url');
    if (target) return handleProxy(request, target);

    return new Response('Missing ?url= / ?btp= / ?spread=', { status: 400, headers: CORS_HEADERS });
  },
};
