function renderTable() {
  let d = [...data];

  if (currentTab === 'strong') d = d.filter(x => x.signal === 'strong');
  if (currentTab === 'sector') d.sort((a, b) => a.sector.localeCompare(b.sector));

  const sect = document.getElementById('sectorSel').value;
  const sig  = document.getElementById('sigSel').value;
  const srch = document.getElementById('srch').value.toUpperCase();

  if (sect) d = d.filter(x => x.sector === sect);
  if (sig)  d = d.filter(x => x.signal === sig);
  if (srch) d = d.filter(x => x.symbol.includes(srch) || x.name.toUpperCase().includes(srch));

  if (sortKey) {
    d.sort((a, b) => sortAsc
      ? (a[sortKey] > b[sortKey] ? 1 : -1)
      : (a[sortKey] < b[sortKey] ? 1 : -1)
    );
  }

  document.getElementById('resBadge').textContent = d.length + ' stocks';
  document.getElementById('tbody').innerHTML = d.map((s, i) => {
    const p = s.pct;
    const pctClass = p >= -0.5 ? 'at-high' : p >= -3 ? 'near-high' : p >= -8 ? 'mid' : 'far';
    const pctStr   = p >= 0 ? `+${p}%` : `${p}%`;
    const volLabel = s.volLabel || '—';

    const bars = Array.from({ length: 8 }, (_, j) => {
      const h      = 4 + Math.random() * 16;
      const active = j >= 5;
      return `<div class="spark-bar" style="height:${h}px;background:${active ? 'var(--lime-dim)' : 'var(--rim2)'}"></div>`;
    }).join('');

    return `<tr class="${p >= -1 ? 'fresh-breakout' : ''}" style="animation-delay:${i * 0.03}s" onclick="selectStock('${s.symbol}')">
      <td style="color:var(--text-3);font-family:var(--font-mono);font-size:0.62rem">${i + 1}</td>
      <td>
        <div class="sym-cell">
          <div class="sym">${s.symbol}</div>
          <div class="sym-name">${s.name}</div>
        </div>
      </td>
      <td><div class="price">₹${fmt(s.price)}</div></td>
      <td><div class="high">₹${fmt(s.high52)}</div></td>
      <td><div class="pct ${pctClass}">${pctStr}</div></td>
      <td><div class="vol-num cool">${volLabel}</div></td>
      <td><div class="sparkline">${bars}</div></td>
      <td><div class="sector">${s.sector}</div></td>
      <td>
        <div class="signal ${s.signal}">
          <div class="sig-dot"></div>
          ${s.signal}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function applyFilters() {
  if (data.length) renderTable();
}

function setTab(tab, el) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function sort(key) {
  if (sortKey === key) sortAsc = !sortAsc;
  else { sortKey = key; sortAsc = true; }
  applyFilters();
}

function selectStock(sym) {
  const s = data.find(x => x.symbol === sym);
  if (!s) return;

  document.getElementById('detailEmpty').style.display = 'none';
  document.getElementById('detailCard').classList.add('active');
  document.getElementById('detailSym').textContent  = s.symbol;
  document.getElementById('dSym').textContent       = s.symbol;
  document.getElementById('dName').textContent      = s.name;
  document.getElementById('dPrice').textContent     = '₹' + fmt(s.price);

  const p   = s.pct;
  const pEl = document.getElementById('dPct');
  pEl.textContent  = (p >= 0 ? '+' : '') + p + '%';
  pEl.style.color  = p >= -3 ? 'var(--lime)' : p >= -8 ? 'var(--amber)' : 'var(--red)';

  document.getElementById('dHigh').textContent = '₹' + fmt(s.high52);
  document.getElementById('dVol').textContent  = s.volLabel || '—';
  document.getElementById('dSect').textContent = s.sector;

  const sigEl = document.getElementById('dSig');
  sigEl.textContent  = s.signal.charAt(0).toUpperCase() + s.signal.slice(1);
  sigEl.style.color  = s.signal === 'strong' ? 'var(--lime)' : s.signal === 'moderate' ? 'var(--amber)' : 'var(--text-3)';

  document.getElementById('dNote').textContent = s.notes;
}
