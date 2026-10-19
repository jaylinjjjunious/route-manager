import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGateway } from './router.mjs';

let room, gateway, root, origin, lastRequest;
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'all-in-one-gateway-'));
  await writeFile(path.join(root, 'index.html'), '<h1>Independent hallway</h1>');
  await mkdir(path.join(root, 'hallway-assets'));
  await writeFile(path.join(root, 'hallway-assets/main.js'), '/* hallway only */');
  room = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    lastRequest = { url: request.url, method: request.method, auth: request.headers.authorization, body: Buffer.concat(chunks).toString() };
    response.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'room-session=preserved; HttpOnly; Path=/' });
    response.end(JSON.stringify(lastRequest));
  });
  await listen(room);
  gateway = createGateway({ routeTarget: `http://127.0.0.1:${room.address().port}`, hallwayRoot: root });
  await listen(gateway);
  origin = `http://127.0.0.1:${gateway.address().port}`;
});
after(async () => {
  await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => room.close(resolve))]);
  await rm(root, { recursive: true, force: true });
});

test('serves a hallway build without sending it through Route Manager', async () => {
  lastRequest = undefined;
  assert.match(await (await fetch(`${origin}/`)).text(), /Independent hallway/);
  assert.equal(lastRequest, undefined);
  const asset = await fetch(`${origin}/hallway/hallway-assets/main.js`);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.match(await asset.text(), /hallway only/);
  assert.equal(lastRequest, undefined);
  assert.equal((await fetch(`${origin}/hallway/missing.js`)).status, 404);
});
test('proxies room entry, old assets and authenticated writes without changing body or cookies', async () => {
  assert.equal((await (await fetch(`${origin}/route-manager/?source=test`)).json()).url, '/?source=test');
  assert.equal((await (await fetch(`${origin}/assets/route.js`)).json()).url, '/assets/route.js');
  const response = await fetch(`${origin}/api/inventory/custody-ledger`, { method: 'POST', headers: { Authorization: 'Bearer disposable-test', 'Content-Type': 'application/json' }, body: '{"unchanged":true}' });
  assert.deepEqual(await response.json(), { url: '/api/inventory/custody-ledger', method: 'POST', auth: 'Bearer disposable-test', body: '{"unchanged":true}' });
  assert.match(response.headers.get('set-cookie'), /room-session=preserved/);
});
test('supports room deep links and legacy password reset endpoints', async () => {
  assert.equal((await (await fetch(`${origin}/route-manager/reset-password`)).json()).url, '/reset-password');
  assert.equal((await (await fetch(`${origin}/reset-password`)).json()).url, '/reset-password');
  const response = await fetch(`${origin}/route-manager?from=menu`, { redirect: 'manual' });
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), '/route-manager/?from=menu');
});
test('retires the old root worker while retaining the room worker endpoint', async () => {
  const response = await fetch(`${origin}/sw.js`);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.match(await response.text(), /registration.unregister/);
  assert.equal((await (await fetch(`${origin}/route-manager/sw.js`)).json()).url, '/sw.js');
});
test('rejects writes and encoded path escapes in hallway static serving', async () => {
  assert.equal((await fetch(`${origin}/`, { method: 'POST', body: 'no writes' })).status, 405);
  assert.equal((await fetch(`${origin}/hallway/..%2foutside-secret`)).status, 403);
});
test('workspace packages and hallway source never import the route application', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../apps/hallway/package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.dependencies['@all-in-one/route-manager'], undefined);
  for (const filename of ['Hallway.tsx', 'main.tsx', 'rooms.ts']) {
    const source = await readFile(new URL(`../apps/hallway/src/${filename}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /(?:from\s+|import\()['"][^'"]*(?:route-manager|AuthProvider|\/App)['"]/);
  }
});
