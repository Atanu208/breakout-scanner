function tick() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();

  document.getElementById('clockTime').textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

  const open = (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
  const statusEl = document.getElementById('mktStatus');
  const dotEl    = document.getElementById('mktDot');

  statusEl.textContent   = open ? 'NSE OPEN' : 'NSE CLOSED';
  statusEl.style.color   = open ? 'var(--lime)' : 'var(--red)';
  dotEl.style.background = open ? 'var(--lime)' : 'var(--red)';
}

setInterval(tick, 1000);
tick();
