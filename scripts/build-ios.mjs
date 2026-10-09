import { loadEnv } from 'vite';
import { spawnSync } from 'node:child_process';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (!env[name]) throw new Error(`Missing ${name}: configure the public Supabase client settings before building iOS.`);
}
// Native releases always require real authentication.
env.VITE_LOCAL_AUTH_BYPASS = 'false';
env.VITE_PUBLIC_WORKSPACE_BYPASS = 'false';
env.VITE_API_ORIGIN ||= 'https://route-manager-phtj.onrender.com';
const origin = new URL(env.VITE_API_ORIGIN);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('VITE_API_ORIGIN must be an HTTPS origin without credentials or a path.');
}
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.standalone.ts', '--outDir', 'dist-native'], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
