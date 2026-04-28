const SCAN_LOGS = [
  'Connecting to NSE data feed...',
  'Loading Nifty 500 universe...',
  'Fetching 52-week price history...',
  'Calculating momentum indicators...',
  'Running volume confirmation filter...',
  'Applying breakout criteria (price × volume)...',
  'AI scoring signal strength...',
  'Generating sector breadth analysis...',
  'Finalizing results...'
];

async function runScan() {
  const btn = document.getElementById('scanBtn');
  btn.disabled = true;
  document.getElementById('scanLabel').textContent = '...';
  document.getElementById('scanIcon').textContent  = '◌';
  document.getElementById('scanNote').textContent  = 'Scanning 500 stocks...';
  document.getElementById('emptyState').style.display    = 'none';
  document.getElementById('tableWrap').style.display     = 'none';
  document.getElementById('scanOverlay').classList.add('active');
  document.getElementById('insightText').textContent     = '';
  document.getElementById('insightLoading').style.display = 'flex';
  document.getElementById('sectorCard').style.display    = 'none';

  const fill  = document.getElementById('scanFill');
  const pctEl = document.getElementById('scanPct');
  const log   = document.getElementById('scanLog');

  // Kick off the real fetch immediately, in parallel with the animation
  const fetchPromise = fetch('/api/scan').then(r => r.json());

  // Cycle through log messages while fetch is pending
  let logIdx = 0;
  let fetchDone = false;
  fetchPromise.finally(() => { fetchDone = true; });

  while (!fetchDone) {
    const msg = SCAN_LOGS[logIdx % SCAN_LOGS.length];
    const p   = Math.min(92, Math.round(((logIdx % SCAN_LOGS.length) + 1) / SCAN_LOGS.length * 90));
    fill.style.width = p + '%';
    pctEl.textContent = p + '%';
    log.innerHTML = `<em>&gt;</em> ${msg}`;
    logIdx++;
    await sleep(480 + Math.random() * 280);
  }

  // Complete the bar
  fill.style.width  = '100%';
  pctEl.textContent = '100%';
  log.innerHTML     = '<em>&gt;</em> Complete.';
  await sleep(180);

  let apiResult;
  try {
    apiResult = await fetchPromise;
  } catch {
    apiResult = { ok: false, error: 'Network error' };
  }

  document.getElementById('scanOverlay').classList.remove('active');

  if (!apiResult.ok) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('emptyState').innerHTML = `
      <div class="empty-title" style="color:var(--red)">Scan Failed</div>
      <div class="empty-sub">${apiResult.error || 'Unknown error'} — retry in a moment</div>`;
    btn.disabled = false;
    document.getElementById('scanLabel').textContent = 'RETRY';
    document.getElementById('scanIcon').textContent  = '⚠';
    document.getElementById('scanNote').textContent  = 'Data fetch failed';
    document.getElementById('insightLoading').style.display = 'none';
    return;
  }

  data = apiResult.data;

  // Stats
  const bk    = data.filter(s => s.pct >= -3).length;
  const st    = data.filter(s => s.signal === 'strong').length;
  const sects = [...new Set(data.map(s => s.sector))].length;
  const now   = new Date();
  const ist   = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  animNum('s2', data.length);
  document.getElementById('s2sub').textContent = bk + ' within 3% of high';
  document.getElementById('s2sub').className   = 'stat-sub up';

  animNum('s3', st);
  document.getElementById('s3sub').textContent = st + ' high-conviction plays';
  document.getElementById('s3sub').className   = 'stat-sub up';

  animNum('s4', sects);

  document.getElementById('s5').textContent =
    String(ist.getHours()).padStart(2, '0') + ':' + String(ist.getMinutes()).padStart(2, '0');
  document.getElementById('s5sub').textContent = 'IST · Live Data';

  document.getElementById('tableWrap').style.display = 'block';
  renderTable();
  renderSectorChart();
  fetchInsight();

  btn.disabled = false;
  document.getElementById('scanLabel').textContent = 'RESCAN';
  document.getElementById('scanIcon').textContent  = '↺';
  document.getElementById('scanNote').textContent  =
    'Last scanned ' +
    String(ist.getHours()).padStart(2, '0') + ':' +
    String(ist.getMinutes()).padStart(2, '0');
}

function renderSectorChart() {
  const counts = {};
  data.forEach(s => { counts[s.sector] = (counts[s.sector] || 0) + 1; });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0][1];

  document.getElementById('sectorCard').style.display = 'block';
  document.getElementById('secTotal').textContent     = sorted.length + ' sectors';
  document.getElementById('sectorDist').innerHTML     = sorted.map(([sec, cnt]) =>
    `<div class="sector-bar-row">
      <div class="sector-label-sm">${sec}</div>
      <div class="sector-bar-track">
        <div class="sector-bar-fill" style="width:0%" data-w="${(cnt / max) * 100}"></div>
      </div>
      <div class="sector-count">${cnt}</div>
    </div>`
  ).join('');

  setTimeout(() => {
    document.querySelectorAll('.sector-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 100);
}
