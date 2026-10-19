import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const roomRoot = path.join(root, 'apps/route-manager');
const development = process.argv.includes('--dev');
const child = spawn(process.execPath, development ? ['--import', 'tsx', path.join(roomRoot, 'server.ts')] : [path.join(roomRoot, 'dist/server.cjs')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, NODE_ENV: development ? 'development' : 'production', PORT: process.env.PORT || '3001', ROUTE_MANAGER_APP_ROOT: roomRoot },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
