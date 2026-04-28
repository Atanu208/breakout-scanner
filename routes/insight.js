const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  const { topStocks = [], sectorBreakdown = {}, date = '' } = req.body;

  const prompt = `You are a senior Indian equity market analyst.
Write exactly 3 sentences as a market insight on the current Nifty 500 52-week breakout landscape.
- Sentence 1: which sectors are leading breakouts and why
- Sentence 2: the macro driver behind the momentum
- Sentence 3: one key risk to watch

Current data:
Top breakout stocks: ${JSON.stringify(topStocks.slice(0, 5))}
Active sectors: ${JSON.stringify(sectorBreakdown)}
Date: ${date}

Be precise, professional, and data-grounded. No preamble.`;

  try {
    const completion = await groq.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 280,
      messages:   [{ role: 'user', content: prompt }],
    });
    res.json({ ok: true, text: completion.choices[0].message.content });
  } catch (err) {
    console.warn('[insight] Groq API error:', err.message);
    res.json({ ok: false });
  }
});

module.exports = router;
