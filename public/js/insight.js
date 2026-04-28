function typeText(id, txt) {
  const el = document.getElementById(id);
  el.textContent = '';
  let i = 0;
  const iv = setInterval(() => {
    el.textContent += txt[i++];
    if (i >= txt.length) clearInterval(iv);
  }, 14);
}

function fallbackInsight() {
  return "Indian equities are witnessing breakout momentum across Capital Goods, IT, and select PSU names, driven by government infrastructure capex, AI-led deal flows, and improving corporate earnings visibility. Sector breadth has expanded with multiple sectors contributing to new highs — a constructive sign of broad-based participation. Key risk to monitor: global rate trajectory and FII flows, which remain the swing factor for sustained breakout continuations.";
}

async function fetchInsight() {
  const topStocks = data
    .filter(s => s.signal === 'strong')
    .slice(0, 5)
    .map(s => ({ symbol: s.symbol, sector: s.sector, pct: s.pct, volRatio: s.volRatio }));

  const sectorBreakdown = {};
  data.forEach(s => { sectorBreakdown[s.sector] = (sectorBreakdown[s.sector] || 0) + 1; });

  try {
    const res = await fetch('/api/insight', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        topStocks,
        sectorBreakdown,
        date: new Date().toLocaleDateString('en-IN')
      })
    });
    const d   = await res.json();
    const txt = d.ok && d.text ? d.text : fallbackInsight();
    document.getElementById('insightLoading').style.display = 'none';
    typeText('insightText', txt);
  } catch {
    document.getElementById('insightLoading').style.display = 'none';
    typeText('insightText', fallbackInsight());
  }
}
