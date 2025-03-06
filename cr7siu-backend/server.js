const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Allow the server to understand JSON data
app.use(express.json());

// Connect to a database file called "cr7siu.db"
const db = new sqlite3.Database('./cr7siu.db', (err) => {
  if (err) console.error('Database error:', err.message);
  console.log('Connected to SQLite database.');
});

// Create a table to store player data
db.run(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    score INTEGER,
    progress TEXT
  )
`);

// Save or update player data
app.post('/save', (req, res) => {
  const { username, score, progress } = req.body;
  db.run(
    `INSERT INTO players (username, score, progress) 
     VALUES (?, ?, ?) 
     ON CONFLICT(username) DO UPDATE SET score = ?, progress = ?`,
    [username, score, progress, score, progress],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Data saved successfully' });
    }
  );
});

// Get all players' data
app.get('/scores', (req, res) => {
  db.all('SELECT * FROM players', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get a specific player's data
app.get('/player/:username', (req, res) => {
  const { username } = req.params;
  db.get('SELECT * FROM players WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { error: 'Player not found' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});