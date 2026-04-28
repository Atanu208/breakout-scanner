const https      = require('https');
const NodeCache  = require('node-cache');

// Cache the stock list for 24 hours — NSE rebalances quarterly, not daily
const listCache = new NodeCache({ stdTTL: 86400 });

// Official NSE public CSV — no login, no API key, no cost
const NSE_CSV_URL = 'https://archives.nseindia.com/content/indices/ind_nifty500list.csv';

// ── Industry → Sector mapping ─────────────────────────────────────────────
// Exact NSE industry names as they appear in ind_nifty500list.csv.
// "Financial Services" is sub-categorised further using company name.
const INDUSTRY_MAP = {
  'financial services':                'Finance',        // sub-split by company name below
  'capital goods':                     'Capital Goods',
  'healthcare':                        'Healthcare',     // includes pharma + hospitals
  'automobile and auto components':    'Auto',
  'consumer services':                 'Consumer Services',
  'fast moving consumer goods':        'FMCG',
  'information technology':            'IT',
  'chemicals':                         'Chemicals',
  'metals & mining':                   'Metals',
  'oil gas & consumable fuels':        'Energy',
  'power':                             'Energy',
  'consumer durables':                 'Consumer Durables',
  'services':                          'Specialty',
  'construction':                      'Capital Goods',
  'construction materials':            'Cement',
  'realty':                            'Realty',
  'telecommunication':                 'Telecom',
  'textiles':                          'Textile',
  'media entertainment & publication': 'Media',
  'diversified':                       'Specialty',
};

function industryToSector(industry, companyName) {
  const key    = (industry    || '').toLowerCase().trim();
  const sector = INDUSTRY_MAP[key] || 'Specialty';

  // "Financial Services" spans banking, insurance, and NBFCs — split by name
  if (sector === 'Finance') {
    const n = (companyName || '').toUpperCase();
    if (n.includes('BANK') || n.includes('BANKING'))       return 'Banking';
    if (n.includes('INSURANCE') || n.includes('ASSURANCE') ||
        n.includes('LIFE ') || n.includes(' LIFE'))        return 'Insurance';
    return 'Finance';
  }

  return sector;
}

// ── Raw CSV fetch via built-in https (no extra npm package) ───────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml,text/csv,*/*',
      },
      timeout: 12000,
    }, res => {
      // Follow one redirect (NSE sometimes 301s to www)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return resolve(httpsGet(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from NSE CSV`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => resolve(data));
    });
    req.on('error',   reject);
    req.on('timeout', ()   => { req.destroy(); reject(new Error('NSE CSV request timed out')); });
  });
}

// ── Parse the NSE CSV ─────────────────────────────────────────────────────
// Header: "Company Name,Industry,Symbol,Series,ISIN Code"
function parseNSECsv(csvText) {
  const lines = csvText
    .replace(/\r/g, '')   // strip Windows CR
    .trim()
    .split('\n');

  if (lines.length < 2) throw new Error('NSE CSV is empty or malformed');

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const nameIdx     = headers.indexOf('Company Name');
  const industryIdx = headers.indexOf('Industry');
  const symbolIdx   = headers.indexOf('Symbol');

  if (nameIdx < 0 || symbolIdx < 0) throw new Error('Unexpected NSE CSV format');

  return lines
    .slice(1)
    .map(line => {
      // Basic CSV split — NSE company names rarely contain commas
      const cols    = line.split(',').map(c => c.trim().replace(/"/g, ''));
      const symbol  = cols[symbolIdx];
      const name    = cols[nameIdx];
      const industry = industryIdx >= 0 ? (cols[industryIdx] || '') : '';
      if (!symbol || !name) return null;
      return { symbol, name, sector: industryToSector(industry, name) };
    })
    .filter(Boolean);
}

// ── Public API ────────────────────────────────────────────────────────────
async function getNifty500() {
  const cached = listCache.get('nifty500_list');
  if (cached) return cached;

  try {
    console.log('[nifty500] Fetching official list from NSE archives...');
    const csvText = await httpsGet(NSE_CSV_URL);
    const list    = parseNSECsv(csvText);

    if (list.length < 100) throw new Error(`Only ${list.length} stocks parsed — suspiciously low`);

    console.log(`[nifty500] Loaded ${list.length} stocks from NSE`);
    listCache.set('nifty500_list', list);
    return list;

  } catch (err) {
    console.warn('[nifty500] NSE fetch failed — using fallback list:', err.message);
    return FALLBACK;
  }
}

module.exports = { getNifty500 };

// ── Fallback (used only when NSE archives is unreachable) ─────────────────
// Covers all major Nifty 500 constituents across every sector so the app
// never returns an empty result even when offline.
const FALLBACK = [
  { symbol:"HDFCBANK",   name:"HDFC Bank Ltd",                sector:"Banking" },
  { symbol:"ICICIBANK",  name:"ICICI Bank Ltd",               sector:"Banking" },
  { symbol:"SBIN",       name:"State Bank of India",          sector:"Banking" },
  { symbol:"AXISBANK",   name:"Axis Bank Ltd",                sector:"Banking" },
  { symbol:"KOTAKBANK",  name:"Kotak Mahindra Bank",          sector:"Banking" },
  { symbol:"INDUSINDBK", name:"IndusInd Bank Ltd",            sector:"Banking" },
  { symbol:"FEDERALBNK", name:"Federal Bank Ltd",             sector:"Banking" },
  { symbol:"IDFCFIRSTB", name:"IDFC First Bank Ltd",          sector:"Banking" },
  { symbol:"PNB",        name:"Punjab National Bank",         sector:"Banking" },
  { symbol:"BANKBARODA", name:"Bank of Baroda",               sector:"Banking" },
  { symbol:"CANBK",      name:"Canara Bank",                  sector:"Banking" },
  { symbol:"UNIONBANK",  name:"Union Bank of India",          sector:"Banking" },
  { symbol:"AUBANK",     name:"AU Small Finance Bank",        sector:"Banking" },
  { symbol:"TCS",        name:"Tata Consultancy Services",    sector:"IT" },
  { symbol:"INFY",       name:"Infosys Ltd",                  sector:"IT" },
  { symbol:"WIPRO",      name:"Wipro Ltd",                    sector:"IT" },
  { symbol:"HCLTECH",    name:"HCL Technologies Ltd",         sector:"IT" },
  { symbol:"TECHM",      name:"Tech Mahindra Ltd",            sector:"IT" },
  { symbol:"LTIM",       name:"LTIMindtree Ltd",              sector:"IT" },
  { symbol:"PERSISTENT", name:"Persistent Systems Ltd",       sector:"IT" },
  { symbol:"COFORGE",    name:"Coforge Ltd",                  sector:"IT" },
  { symbol:"SUNPHARMA",  name:"Sun Pharmaceutical",           sector:"Pharma" },
  { symbol:"DRREDDY",    name:"Dr. Reddy's Laboratories",     sector:"Pharma" },
  { symbol:"DIVISLAB",   name:"Divi's Laboratories",          sector:"Pharma" },
  { symbol:"CIPLA",      name:"Cipla Ltd",                    sector:"Pharma" },
  { symbol:"LUPIN",      name:"Lupin Ltd",                    sector:"Pharma" },
  { symbol:"MARUTI",     name:"Maruti Suzuki India",          sector:"Auto" },
  { symbol:"TATAMOTORS", name:"Tata Motors Ltd",              sector:"Auto" },
  { symbol:"M&M",        name:"Mahindra & Mahindra",          sector:"Auto" },
  { symbol:"BAJAJ-AUTO", name:"Bajaj Auto Ltd",               sector:"Auto" },
  { symbol:"EICHERMOT",  name:"Eicher Motors Ltd",            sector:"Auto" },
  { symbol:"HEROMOTOCO", name:"Hero MotoCorp Ltd",            sector:"Auto" },
  { symbol:"HINDUNILVR", name:"Hindustan Unilever Ltd",       sector:"FMCG" },
  { symbol:"ITC",        name:"ITC Ltd",                      sector:"FMCG" },
  { symbol:"NESTLEIND",  name:"Nestle India Ltd",             sector:"FMCG" },
  { symbol:"BRITANNIA",  name:"Britannia Industries",         sector:"FMCG" },
  { symbol:"DABUR",      name:"Dabur India Ltd",              sector:"FMCG" },
  { symbol:"RELIANCE",   name:"Reliance Industries Ltd",      sector:"Energy" },
  { symbol:"ONGC",       name:"Oil & Natural Gas Corp",       sector:"Energy" },
  { symbol:"COALINDIA",  name:"Coal India Ltd",               sector:"Energy" },
  { symbol:"NTPC",       name:"NTPC Ltd",                     sector:"Energy" },
  { symbol:"POWERGRID",  name:"Power Grid Corp of India",     sector:"Energy" },
  { symbol:"LT",         name:"Larsen & Toubro Ltd",          sector:"Capital Goods" },
  { symbol:"SIEMENS",    name:"Siemens Ltd",                  sector:"Capital Goods" },
  { symbol:"ABB",        name:"ABB India Ltd",                sector:"Capital Goods" },
  { symbol:"BEL",        name:"Bharat Electronics Ltd",       sector:"Capital Goods" },
  { symbol:"HAL",        name:"Hindustan Aeronautics Ltd",    sector:"Capital Goods" },
  { symbol:"TATASTEEL",  name:"Tata Steel Ltd",               sector:"Metals" },
  { symbol:"JSWSTEEL",   name:"JSW Steel Ltd",                sector:"Metals" },
  { symbol:"HINDALCO",   name:"Hindalco Industries",          sector:"Metals" },
  { symbol:"BAJFINANCE", name:"Bajaj Finance Ltd",            sector:"Finance" },
  { symbol:"BAJAJFINSV", name:"Bajaj Finserv Ltd",            sector:"Finance" },
  { symbol:"RECLTD",     name:"REC Ltd",                      sector:"Finance" },
  { symbol:"PFC",        name:"Power Finance Corp",           sector:"Finance" },
  { symbol:"IRFC",       name:"Indian Railway Finance Corp",  sector:"Finance" },
  { symbol:"DLF",        name:"DLF Ltd",                      sector:"Realty" },
  { symbol:"GODREJPROP", name:"Godrej Properties Ltd",        sector:"Realty" },
  { symbol:"PRESTIGE",   name:"Prestige Estates Projects",    sector:"Realty" },
  { symbol:"ADANIPORTS", name:"Adani Ports & SEZ",            sector:"Infrastructure" },
  { symbol:"IRCTC",      name:"Indian Railway Catering",      sector:"Infrastructure" },
  { symbol:"ASIANPAINT", name:"Asian Paints Ltd",             sector:"Chemicals" },
  { symbol:"PIDILITIND", name:"Pidilite Industries",          sector:"Chemicals" },
  { symbol:"TITAN",      name:"Titan Company Ltd",            sector:"Consumer Durables" },
  { symbol:"APOLLOHOSP", name:"Apollo Hospitals Enterprise",  sector:"Healthcare" },
  { symbol:"BHARTIARTL", name:"Bharti Airtel Ltd",            sector:"Telecom" },
  { symbol:"INDHOTEL",   name:"Indian Hotels Company",        sector:"Hotels" },
  { symbol:"ZOMATO",     name:"Zomato Ltd",                   sector:"New Age Tech" },
  { symbol:"ULTRACEMCO", name:"UltraTech Cement Ltd",         sector:"Cement" },
  { symbol:"LICI",       name:"Life Insurance Corp of India", sector:"Insurance" },
  { symbol:"SBILIFE",    name:"SBI Life Insurance",           sector:"Insurance" },
  { symbol:"UPL",        name:"UPL Ltd",                      sector:"Agri" },
];
