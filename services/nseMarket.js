const https     = require('https');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 900 }); // 15-min

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let sessionCookies = '';
let cookieAge      = 0;

function httpGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent':      UA,
        'Accept':          '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection':      'keep-alive',
        ...extraHeaders,
      },
      timeout: 15000,
    }, res => {
      // Accumulate Set-Cookie into session
      const raw = res.headers['set-cookie'] || [];
      if (raw.length) {
        const map = {};
        sessionCookies.split('; ').filter(Boolean).forEach(c => {
          const idx = c.indexOf('=');
          map[c.slice(0, idx)] = c.slice(idx + 1);
        });
        raw.forEach(c => {
          const pair = c.split(';')[0];
          const idx  = pair.indexOf('=');
          map[pair.slice(0, idx)] = pair.slice(idx + 1);
        });
        sessionCookies = Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
        cookieAge = Date.now();
      }

      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return resolve(httpGet(res.headers.location, extraHeaders));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('NSE request timed out')); });
  });
}

async function ensureCookies() {
  if (sessionCookies && Date.now() - cookieAge < 5 * 60 * 1000) return;
  console.log('[nseMarket] Establishing NSE session...');
  await httpGet('https://www.nseindia.com/', {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });
  await new Promise(r => setTimeout(r, 700));
}

async function getNifty500MarketData() {
  const cached = cache.get('nse_mkt');
  if (cached) return cached;

  await ensureCookies();

  const { status, body } = await httpGet(
    'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500',
    {
      Referer:           'https://www.nseindia.com/market-data/live-equity-market?symbol=NIFTY%20500',
      Cookie:            sessionCookies,
      'sec-fetch-dest':  'empty',
      'sec-fetch-mode':  'cors',
      'sec-fetch-site':  'same-origin',
    }
  );

  if (status !== 200) throw new Error(`NSE market API returned HTTP ${status}`);

  let json;
  try { json = JSON.parse(body); }
  catch { throw new Error('NSE returned non-JSON response'); }

  if (!json.data || !Array.isArray(json.data)) throw new Error('Unexpected NSE response shape');

  // First element is the index row itself — skip rows without plain symbol
  const stocks = json.data.filter(d => d.symbol && !/\s/.test(d.symbol));
  console.log(`[nseMarket] Received ${stocks.length} stocks from NSE`);

  cache.set('nse_mkt', stocks);
  return stocks;
}

module.exports = { getNifty500MarketData };
