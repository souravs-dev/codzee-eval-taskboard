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

const json = { 'content-type': 'application/json' };

test('GET /tasks paginates and filters by status', async () => {
  await withServer(async (base) => {
    for (const title of ['a', 'b', 'c']) {
      await fetch(`${base}/tasks`, { method: 'POST', headers: json, body: JSON.stringify({ title }) });
    }
    await fetch(`${base}/tasks/2`, { method: 'PATCH', headers: json, body: JSON.stringify({ status: 'done' }) });

    const page = await (await fetch(`${base}/tasks?limit=2&offset=1`)).json();
    assert.equal(page.total, 3);
    assert.deepEqual(page.items.map((t) => t.title), ['b', 'c']);

    const done = await (await fetch(`${base}/tasks?status=done`)).json();
    assert.equal(done.total, 1);
    assert.equal(done.items[0].title, 'b');

    const bad = await fetch(`${base}/tasks?status=nope`);
    assert.equal(bad.status, 400);
  });
});
