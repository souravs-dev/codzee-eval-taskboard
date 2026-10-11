import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

async function withServer(fn) {
  const server = createApp(openDb()).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.close(); }
}

test('create and fetch a task', async () => {
  await withServer(async (base) => {
    const created = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'write docs' }),
    });
    assert.equal(created.status, 201);
    const { id } = await created.json();
    const got = await (await fetch(`${base}/tasks/${id}`)).json();
    assert.equal(got.title, 'write docs');
    assert.equal(got.status, 'todo');
  });
});

test('rejects invalid status', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/tasks/1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'bogus' }),
    });
    assert.equal(res.status, 400);
  });
});

test('PATCH and DELETE return 404 for a missing task', async () => {
  await withServer(async (base) => {
    const patch = await fetch(`${base}/tasks/999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    assert.equal(patch.status, 404);
    const del = await fetch(`${base}/tasks/999`, { method: 'DELETE' });
    assert.equal(del.status, 404);
  });
});

test('POST /tasks rejects an unknown assignee', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x', assignee_id: 42 }),
    });
    assert.equal(res.status, 400);
  });
});
