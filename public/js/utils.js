function fmt(n) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function animNum(id, target) {
  const el = document.getElementById(id);
  let cur = 0;
  const step = target / 30;
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.round(cur);
    if (cur >= target) clearInterval(iv);
  }, 30);
}
