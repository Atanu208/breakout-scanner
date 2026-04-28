require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/scan',    require('./routes/scan'));
app.use('/api/insight', require('./routes/insight'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Breakout Scanner → http://localhost:${PORT}`);
});
