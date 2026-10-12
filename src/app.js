import express from 'express';

const STATUSES = ['todo', 'in_progress', 'done'];

export function createApp(db) {
  const app = express();
  app.use(express.json());

  app.post('/users', (req, res) => {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });
    try {
      const info = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)').run(email, name);
      res.status(201).json({ id: Number(info.lastInsertRowid), email, name });
    } catch (e) {
      res.status(409).json({ error: 'email already exists' });
    }
  });

  app.get('/tasks', (req, res) => {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY id').all();
    res.json(rows);
  });

  app.get('/tasks/search', (req, res) => {
    const q = req.query.q || '';
    const rows = db.prepare(`SELECT * FROM tasks WHERE title LIKE '%${q}%' ORDER BY id`).all();
    const withAssignee = rows.map((t) => {
      const user = t.assignee_id
        ? db.prepare('SELECT name FROM users WHERE id = ?').get(t.assignee_id)
        : null;
      return { ...t, assignee_name: user ? user.name : null };
    });
    res.json(withAssignee);
  });

  app.post('/tasks/bulk-status', (req, res) => {
    const { ids, status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
    let updated = 0;
    for (const id of ids) {
      const info = db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
      updated += info.changes;
    }
    res.json({ updated });
  });

  app.get('/tasks/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });

  app.post('/tasks', (req, res) => {
    const { title, assignee_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const info = db
      .prepare('INSERT INTO tasks (title, assignee_id) VALUES (?, ?)')
      .run(title, assignee_id ?? null);
    res.status(201).json({ id: Number(info.lastInsertRowid), title, status: 'todo' });
  });

  app.patch('/tasks/:id', (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ id: Number(req.params.id), status });
  });

  app.delete('/tasks/:id', (req, res) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  return app;
}
