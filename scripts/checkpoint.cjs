#!/usr/bin/env node
// checkpoint.cjs — Creates an annotated Git checkpoint tag.
// Usage: npm run checkpoint -- <description>
// Example: npm run checkpoint -- auth-login-stable
const { execSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const desc = process.argv[2];
if (!desc) {
  console.error('Usage: npm run checkpoint -- <description>');
  console.error('Example: npm run checkpoint -- auth-login-stable');
  process.exit(1);
}

// Check working tree is clean
const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
if (status) {
  console.error('❌ Working tree is dirty. Commit or stash changes first.');
  console.error(status);
  process.exit(1);
}

// Check .env is not tracked
try {
  execSync('git ls-files .env .env.local .env.production', { encoding: 'utf-8' }).trim();
  const tracked = execSync('git ls-files .env .env.local .env.production', { encoding: 'utf-8' }).trim();
  if (tracked) {
    console.error('❌ .env files are tracked by git. Remove them first.');
    console.error(tracked);
    process.exit(1);
  }
} catch {}

// Run lint
console.log('\n> npm run lint');
try {
  execSync('npm run lint', { stdio: 'inherit' });
} catch {
  console.error('❌ Lint failed. Fix lint errors before creating a checkpoint.');
  process.exit(1);
}

// Run build
console.log('\n> npm run build');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch {
  console.error('❌ Build failed. Fix build errors before creating a checkpoint.');
  process.exit(1);
}

// Create tag
const date = new Date().toISOString().slice(0, 10);
const tag = `checkpoint-${date}-${desc}`;
const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

const message = [
  `Stable checkpoint: ${desc}`,
  '',
  `Commit: ${sha}`,
  `Version: ${pkg.version}`,
  `Date: ${date}`,
  '',
  'Restore:',
  `  git show ${tag}`,
  `  git switch -c recovery/${desc} ${tag}`,
  `  git restore --source ${tag} -- path/to/file`,
].join('\n');

console.log(`\nCreating tag: ${tag}`);
execSync(`git tag -a "${tag}" -m "${message}"`, { stdio: 'inherit' });
console.log(`\n✅ Checkpoint created: ${tag}`);

console.log(`\nTo push the tag:`);
console.log(`  git push origin ${tag}`);
