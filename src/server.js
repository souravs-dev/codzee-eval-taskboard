import { createApp } from './app.js';
import { openDb } from './db.js';

const db = openDb(process.env.DB_PATH || 'taskboard.db');
const port = Number(process.env.PORT) || 3000;
createApp(db, { authSecret: process.env.AUTH_SECRET }).listen(port, () => console.log(`taskboard listening on :${port}`));
