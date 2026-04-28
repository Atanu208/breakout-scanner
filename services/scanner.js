const NodeCache                = require('node-cache');
const { getNifty500 }          = require('./nifty500');
const { getNifty500MarketData } = require('./nseMarket');

const cache = new NodeCache({ stdTTL: 900 }); // 15-min

// Signal based on price proximity to 52W high
// NSE index API doesn't expose average volume so we classify on price only
function classifySignal(dist) {
  if (dist <= 2)  return 'strong';
  if (dist <= 5)  return 'moderate';
  if (dist <= 15) return 'weak';
  return null;
}

function fmtVol(v) {
  if (!v) return '—';
  if (v >= 10000000) return (v / 10000000).toFixed(1) + ' Cr';
  if (v >= 100000)   return (v / 100000).toFixed(1)   + ' L';
  return v.toString();
}

async function runScan() {
  const cached = cache.get('scan_results');
  if (cached) return cached;

  const [stockList, marketData] = await Promise.all([
    getNifty500(),
    getNifty500MarketData(),
  ]);

  const sectorMap = {};
  stockList.forEach(s => { sectorMap[s.symbol] = s; });

  const results = marketData
    .map(d => {
      const meta   = sectorMap[d.symbol];
      if (!meta || !d.lastPrice || !d.yearHigh || d.yearHigh === 0) return null;

      const price  = d.lastPrice;
      const high52 = d.yearHigh;
      const low52  = d.yearLow  || 0;
      const pct    = parseFloat(((price - high52) / high52 * 100).toFixed(2));
      const dist   = Math.abs(pct);
      const signal = classifySignal(dist);
      if (!signal) return null;

      const vol  = d.totalTradedVolume || 0;
      const volS = fmtVol(vol);

      return {
        symbol:   meta.symbol,
        name:     meta.name,
        sector:   meta.sector,
        price,
        high52,
        low52,
        volRatio: null,
        volLabel: volS,
        pct,
        signal,
        notes: `${dist.toFixed(1)}% from 52W high · Vol ${volS}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { strong: 0, moderate: 1, weak: 2 };
      if (rank[a.signal] !== rank[b.signal]) return rank[a.signal] - rank[b.signal];
      return b.pct - a.pct; // closer to 0 = closer to 52W high = higher priority
    });

  cache.set('scan_results', results);
  return results;
}

module.exports = { runScan };
