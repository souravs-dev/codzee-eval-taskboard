import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

async function authHeaders(base) {
  const creds = { email: 't@example.com', name: 'T', password: 'correct horse' };
  await fetch(`${base}/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds) });
  const { token } = await (await fetch(`${base}/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds) })).json();
  return { 'content-type': 'application/json', authorization: `Bearer ${token}` };
}

async function withServer(fn) {
  const server = createApp(openDb(), { authSecret: 'test-secret' }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base, await authHeaders(base)); } finally { server.close(); }
}

test('create and fetch a task', async () => {
  await withServer(async (base, headers) => {
    const created = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers,
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
  await withServer(async (base, headers) => {
    const res = await fetch(`${base}/tasks/1`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'bogus' }),
    });
    assert.equal(res.status, 400);
  });
});

test('write endpoints require a valid token', async () => {
  await withServer(async (base, headers) => {
    const body = JSON.stringify({ title: 'x' });
    const anon = await fetch(`${base}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    assert.equal(anon.status, 401);
    const tampered = await fetch(`${base}/tasks`, {
      method: 'POST',
      headers: { ...headers, authorization: headers.authorization.slice(0, -2) + 'xx' },
      body,
    });
    assert.equal(tampered.status, 401);
    const ok = await fetch(`${base}/tasks`, { method: 'POST', headers, body });
    assert.equal(ok.status, 201);
  });
});

test('login rejects a wrong password', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 't@example.com', password: 'wrong password' }),
    });
    assert.equal(res.status, 401);
  });
});
