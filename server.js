// server.js (CommonJS, debug-friendly)
const path = require('path');
const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// load .env explicitly from the script directory
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

console.log('dotenv result:', result && result.parsed ? 'loaded' : result.error ? String(result.error) : 'unknown');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('Contents of process.env.RAWG_API_KEY (masked):', process.env.RAWG_API_KEY ? ('***' + String(process.env.RAWG_API_KEY).slice(-4)) : null);

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// debug route to check key presence
app.get('/_debug_key', (req, res) => {
  res.json({ RAWG_API_KEY_loaded: !!process.env.RAWG_API_KEY, masked: process.env.RAWG_API_KEY ? ('***' + String(process.env.RAWG_API_KEY).slice(-4)) : null });
});

app.get('/api/games', async (req, res) => {
  try {
    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'The API key is not found' });

    const url = `https://api.rawg.io/api/games?key=${apiKey}&ordering=-rating&page_size=10`;
    const r = await fetch(url);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    console.error('Error fetching RAWG:', err);
    res.status(500).json({ error: 'Failed to fetch from RAWG', details: String(err) });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
