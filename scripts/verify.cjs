#!/usr/bin/env node
// verify.cjs — Runs lint + build. Exits non-zero on failure.
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname + '/..' });
    return true;
  } catch {
    return false;
  }
}

console.log('=== verify: running lint ===');
const lintOk = run('npm run lint');

console.log('\n=== verify: running build ===');
const buildOk = run('npm run build');

if (!lintOk || !buildOk) {
  console.error('\n❌ verify FAILED — do not commit or push.');
  process.exit(1);
}

console.log('\n✅ verify PASSED — lint and build are clean.');
