import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { createGateway } from './router.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const roomRoot = path.join(root, 'apps/route-manager');
const development = process.argv.includes('--dev');
const port = Number(process.env.PORT || 3000);
const roomPort = Number(process.env.ROUTE_MANAGER_PORT || (port === 3001 ? 3002 : 3001));
const hallwayPort = Number(process.env.HALLWAY_PORT || 5173);
const cleaningPort = Number(process.env.CLEANING_PORT || 5174);
if (new Set([port, roomPort, ...(development ? [hallwayPort, cleaningPort] : [])]).size !== (development ? 4 : 2)) throw new Error('App ports must be distinct');
const children = [];
if (!development) {
  await access(path.join(root, 'apps/hallway/dist/index.html'));
  await access(path.join(roomRoot, 'dist/server.cjs'));
  await access(path.join(root, 'apps/cleaning/dist/index.html'));
}
let shuttingDown = false;
const gateway = createGateway({ routeTarget: `http://127.0.0.1:${roomPort}`, hallwayTarget: development ? `http://127.0.0.1:${hallwayPort}` : undefined, hallwayRoot: path.join(root, 'apps/hallway/dist'), cleaningRoot: path.join(root, 'apps/cleaning/dist'), cleaningTarget: development ? `http://127.0.0.1:${cleaningPort}` : undefined });

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  gateway.close();
  for (const child of children) child.kill();
  const timer = setTimeout(() => process.exit(code), 500);
  timer.unref();
}
function launch(args, options) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', ...options });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!shuttingDown) { console.error(`App process exited (${code})`); stop(code || 1); } });
}
launch(development ? ['--import', 'tsx', path.join(roomRoot, 'server.ts')] : [path.join(roomRoot, 'dist/server.cjs')], {
  cwd: root,
  env: { ...process.env, NODE_ENV: development ? 'development' : 'production', HOST: '127.0.0.1', PORT: String(roomPort), ROUTE_MANAGER_APP_ROOT: roomRoot },
});
if (development) launch([path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(hallwayPort), '--strictPort'], { cwd: path.join(root, 'apps/hallway'), env: process.env });
if (development) launch([path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(cleaningPort), '--strictPort'], { cwd: path.join(root, 'apps/cleaning'), env: process.env });

try {
  const deadline = Date.now() + 45000;
  while (true) {
    if (shuttingDown) break;
    try {
      const ready = await fetch(`http://127.0.0.1:${roomPort}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (ready.ok) break;
    } catch { /* wait for the room to start */ }
    if (Date.now() >= deadline) throw new Error('Route Manager did not become healthy');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!shuttingDown) gateway.listen(port, '0.0.0.0', () => console.log(`All in One: http://localhost:${port} · Route Manager: /route-manager/`));
} catch (error) { console.error(error.message); stop(1); }
gateway.on('error', error => { console.error(error.message); stop(1); });
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
