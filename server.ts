import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('shopping.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    total_items INTEGER,
    total_price REAL,
    items TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Routes
  app.post('/api/auth/signup', (req, res) => {
    const { email, password } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
      const info = stmt.run(email, password);
      res.json({ id: info.lastInsertRowid, email });
    } catch (e) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (user) {
      res.json({ id: user.id, email: user.email });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // History Routes
  app.get('/api/history/:userId', (req, res) => {
    const history = db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY date DESC').all(req.params.userId);
    res.json(history.map(h => ({ ...h, items: JSON.parse(h.items as string) })));
  });

  app.post('/api/history', (req, res) => {
    const { userId, date, totalItems, totalPrice, items } = req.body;
    const stmt = db.prepare('INSERT INTO history (user_id, date, total_items, total_price, items) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, date, totalItems, totalPrice, JSON.stringify(items));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
