#!/usr/bin/env node
// release.cjs — Verify, commit, push, and confirm.
// Usage: npm run release
// Does NOT auto-commit untracked files. Shows status for review.
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function capture(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// Step 1: Verify
console.log('=== release: verify ===');
if (!run('npm run verify')) {
  console.error('❌ verify failed. Fix issues before releasing.');
  process.exit(1);
}

// Step 2: Show status
console.log('\n=== release: git status ===');
run('git status');

// Step 3: Check for uncommitted changes
const status = capture('git status --porcelain');
if (!status) {
  console.log('\n✅ No changes to commit. Nothing to release.');
  process.exit(0);
}

console.log('\n⚠️  The following files have changes:');
console.log(status);

// Step 4: Stage and commit
console.log('\n=== release: staging ===');
run('git add -A');

// Check for secrets before commit
const diffCached = capture('git diff --cached --name-only');
const secrets = diffCached.split('\n').filter(f =>
  /\.env$/i.test(f) ||
  /\.env\./i.test(f) ||
  /secret/i.test(f) ||
  /token/i.test(f) ||
  /password/i.test(f) ||
  /\.local-shower-proofs/i.test(f)
);

if (secrets.length > 0) {
  console.error('\n❌ Refusing to commit files that may contain secrets:');
  secrets.forEach(f => console.error(`  ${f}`));
  console.error('Run: git reset HEAD <file> to unstage them.');
  process.exit(1);
}

const sha = capture('git rev-parse --short HEAD');
const msg = `chore: release from ${sha}`;
console.log(`\n> git commit -m "${msg}"`);
execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

// Step 5: Push
console.log('\n=== release: push ===');
run('git push github main');

// Step 6: Confirm remote SHA
const remoteSha = capture('git rev-parse --short github/main');
const localSha = capture('git rev-parse --short HEAD');
console.log(`\nLocal HEAD:  ${localSha}`);
console.log(`Remote main: ${remoteSha}`);

if (remoteSha === localSha) {
  console.log('\n✅ Release pushed successfully.');
  console.log(`GitHub: https://github.com/jaylinjjjunious/route-manager/commit/${localSha}`);
} else {
  console.error('\n❌ Remote SHA does not match local. Push may have failed.');
  process.exit(1);
}

console.log('\nRailway should detect this commit if Autodeploy is enabled.');
console.log('If not, run: railway up');
