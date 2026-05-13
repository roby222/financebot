/**
 * FinancePalmirioBot — Cloudflare Worker CORS Proxy
 *
 * Deploy su https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Sostituisci tutto il codice con questo file, poi clicca Deploy.
 *
 * Una volta deployato, copia l'URL del worker (es. https://fpb-proxy.TUO-NOME.workers.dev)
 * e incollalo nella console del browser del sito:
 *   localStorage.setItem('fpb_proxy', 'https://fpb-proxy.TUO-NOME.workers.dev/?url=')
 * poi ricarica la pagina.
 *
 * Free tier Cloudflare Workers: 100.000 req/giorno — sufficiente per uso personale.
 */

const ALLOWED_HOSTS = [
  // Yahoo Finance — ETF dashboard + Semis Monitor proxy tickers
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'finance.yahoo.com',
  // Stooq — fallback price source
  'stooq.com',
  // Google News RSS — Semis Monitor headlines (indicators 03, 04, 06)
  'news.google.com',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export default {
  async fetch(request) {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS_HEADERS });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response('Invalid URL', { status: 400, headers: CORS_HEADERS });
    }

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      return new Response('Host not allowed', { status: 403, headers: CORS_HEADERS });
    }

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',  // CF decomprime automaticamente
        },
      });

      // Cloudflare decomprime automaticamente — .text() restituisce sempre il body leggibile
      const body = await upstream.text();
      const upstreamType = upstream.headers.get('content-type') || '';
      const contentType = upstreamType.includes('xml') || upstreamType.includes('rss')
        ? 'application/xml; charset=utf-8'
        : 'application/json; charset=utf-8';

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
