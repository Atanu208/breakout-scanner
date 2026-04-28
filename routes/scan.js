const express       = require('express');
const router        = express.Router();
const { runScan }   = require('../services/scanner');

router.get('/', async (req, res) => {
  try {
    const data = await runScan();
    res.json({ ok: true, data, scannedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[scan]', err.message);
    res.status(500).json({ ok: false, error: 'Market data fetch failed. Please retry.' });
  }
});

module.exports = router;
