// Exercise the actual production bundle against disposable storage and a mock
// identity/database service. Never read or alter the user's live proof records.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const sharp = require('sharp');

const owners = { 'owner-a': '11111111-1111-4111-8111-111111111111', 'owner-b': '22222222-2222-4222-8222-222222222222' };
async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return server.address().port; }
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
async function photo() {
  const patterns = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const value = '075371003233';
  const left = value.slice(0, 6).split('').map(d => patterns[Number(d)]).join('');
  const right = value.slice(6).split('').map(d => patterns[Number(d)].split('').map(bit => bit === '1' ? '0' : '1').join('')).join('');
  const bits = `000000000000101${left}01010${right}101000000000000`;
  const width = bits.length * 4, height = 200;
  const pixels = Buffer.alloc(width * height, 255);
  for (let y = 20; y < 180; y++) for (let x = 0; x < width; x++) if (bits[Math.floor(x / 4)] === '1') pixels[y * width + x] = 0;
  return sharp(pixels, { raw: { width, height, channels: 1 } }).png().toBuffer();
}
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'route-server-security-'));
  const rows = [];
  let brokenAccounting = false;
  const database = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://mock');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/auth/v1/user') {
      const token = String(req.headers.authorization || '').replace('Bearer ', '');
      if (!owners[token]) { res.writeHead(401); return res.end(JSON.stringify({ message: 'Invalid token' })); }
      return res.end(JSON.stringify({ id: owners[token], email: `${token}@example.test`, app_metadata: {} }));
    }
    if (url.pathname.startsWith('/auth/v1/admin/users/')) {
      const id = url.pathname.split('/').pop();
      return res.end(JSON.stringify({ user: { id, app_metadata: {} } }));
    }
    if (url.pathname === '/rest/v1/activity_log') {
      if (brokenAccounting) { res.writeHead(503); return res.end(JSON.stringify({ message: 'Unavailable' })); }
      if (req.method === 'HEAD') {
        const matches = rows.filter(row => ['owner_id', 'feature', 'action'].every(key => !url.searchParams.has(key) || url.searchParams.get(key) === `eq.${row[key]}`));
        res.setHeader('Content-Range', `0-0/${matches.length}`); return res.end();
      }
      let body = ''; for await (const chunk of req) body += chunk;
      rows.push(JSON.parse(body)); res.writeHead(201); return res.end();
    }
    res.writeHead(404); res.end('{}');
  });
  let child;
  try {
    const dbPort = await listen(database);
    const reservation = http.createServer(); const port = await listen(reservation); await close(reservation);
    child = spawn(process.execPath, [path.resolve('dist/server.cjs')], {
      cwd: root, windowsHide: true,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(port), SUPABASE_URL: `http://127.0.0.1:${dbPort}`, SUPABASE_ANON_KEY: 'mock-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key', GEMINI_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let retry = 0; retry < 30; retry++) {
      try { ready = (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, `Production bundle did not start: ${output.slice(-1500)}`);
    const auth = owner => ({ Authorization: `Bearer ${owner}` });
    const deniedBody = JSON.stringify({ text: 'x'.repeat(256_000) });
    assert.equal((await fetch(`${base}/api/dispatcher/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: deniedBody })).status, 401, 'Authentication must precede oversized-body parsing');
    assert.equal((await fetch(`${base}/api/dispatcher/tts`, { method: 'POST', headers: { ...auth('owner-a'), 'Content-Type': 'application/json' }, body: deniedBody })).status, 413, 'Authenticated generic bodies remain bounded');
    const multipart = new FormData();
    multipart.append('proofImage', new Blob([await photo()], { type: 'image/png' }), 'proof.png');
    multipart.append('barcode', '075371003233'); multipart.append('cycleId', '2026-10-10');
    const saved = await fetch(`${base}/api/shower-proofs`, { method: 'POST', headers: auth('owner-a'), body: multipart });
    const payload = await saved.json(); assert.equal(saved.status, 200, JSON.stringify(payload));
    const image = payload.proof.imageUrl;
    assert.equal((await fetch(base + image)).status, 401, 'Proof URL must not grant public access');
    assert.equal((await fetch(base + image, { headers: auth('owner-b') })).status, 404, 'Other accounts must not access a proof image');
    const ownedImage = await fetch(base + image, { headers: auth('owner-a') });
    assert.equal(ownedImage.status, 200);
    assert.equal(ownedImage.headers.get('cache-control'), 'private, no-store');
    assert.equal(ownedImage.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await sharp(Buffer.from(await ownedImage.arrayBuffer())).metadata()).format, 'jpeg');
    const history = await (await fetch(`${base}/api/shower-proofs`, { headers: auth('owner-b') })).json();
    assert.equal(history.proofs.length, 0, 'History must also be owner-scoped');
    assert.equal((await fetch(`${base}/api/transit/cache/clear`, { method: 'POST', headers: auth('owner-b') })).status, 403, 'Cache reset must require admin');
    brokenAccounting = true;
    assert.equal((await fetch(`${base}/api/dispatcher/tts`, { method: 'POST', headers: { ...auth('owner-a'), 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Hello' }) })).status, 503, 'Accounting outages must fail closed before provider spend');
    assert.ok(rows.some(row => row.feature === 'security_budget' && row.owner_id === owners['owner-a']));
    console.log('Production security checks passed: pre-parser auth, body caps, verified upload, private images, owner isolation, admin cache reset, durable accounting/fail-closed admission.');
  } finally {
    if (child) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    await close(database);
    const target = path.resolve(root), expected = path.resolve(os.tmpdir()) + path.sep;
    if (!target.startsWith(expected) || !path.basename(target).startsWith('route-server-security-')) throw new Error('Unexpected temporary cleanup path.');
    await fs.rm(target, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
