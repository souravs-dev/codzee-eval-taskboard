import express from 'express';
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js';

const STATUSES = ['todo', 'in_progress', 'done'];

export function createApp(db, { authSecret = process.env.AUTH_SECRET } = {}) {
  if (!authSecret) throw new Error('AUTH_SECRET is required');
  const auth = requireAuth(authSecret);
  const app = express();
  app.use(express.json());

  app.post('/users', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name and password required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'password too short' });
    try {
      const info = db
        .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
        .run(email, name, hashPassword(password));
      res.status(201).json({ id: Number(info.lastInsertRowid), email, name });
    } catch (e) {
      res.status(409).json({ error: 'email already exists' });
    }
  });

  app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    res.json({ token: signToken({ sub: user.id }, authSecret) });
  });

  app.get('/tasks', (req, res) => {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY id').all();
    res.json(rows);
  });

  app.get('/tasks/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  app.post('/tasks', auth, (req, res) => {
    const { title, assignee_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const info = db
      .prepare('INSERT INTO tasks (title, assignee_id) VALUES (?, ?)')
      .run(title, assignee_id ?? null);
    res.status(201).json({ id: Number(info.lastInsertRowid), title, status: 'todo' });
  });

  app.patch('/tasks/:id', auth, (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ id: Number(req.params.id), status });
  });

  app.delete('/tasks/:id', auth, (req, res) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  return app;
}
