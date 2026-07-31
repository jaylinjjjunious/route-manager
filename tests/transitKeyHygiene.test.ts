import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function sourceFiles(): string[] {
  const patterns = ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'vite.config*.ts', 'server.ts', 'index.html'];
  const files = new Set<string>();
  for (const pattern of patterns) {
    for (const file of globSync(pattern, { cwd: ROOT })) {
      if (file.includes('node_modules') || file.includes('dist')) continue;
      files.add(join(ROOT, file));
    }
  }
  return [...files];
}

function configuredApiKey(): string | null {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^TRANSIT_API_KEY=(.+)$/.exec(line.trim());
    if (match) return match[1].trim();
  }
  return null;
}

describe('Transit API key hygiene', () => {
  it('never references VITE_TRANSIT_API_KEY anywhere in source', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const content = readFileSync(file, 'utf8');
      if (/VITE_TRANSIT_API_KEY/.test(content)) offenders.push(file);
    }
    expect(offenders, 'VITE_TRANSIT_API_KEY must never be used: ' + offenders.join(', ')).toEqual([]);
  });

  it('does not contain the configured API key literal anywhere in source', () => {
    const apiKey = configuredApiKey();
    if (!apiKey) return;
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const content = readFileSync(file, 'utf8');
      if (content.includes(apiKey)) offenders.push(file);
    }
    expect(offenders, 'configured API key found in: ' + offenders.join(', ')).toEqual([]);
  });

  it('does not contain a long sk- secret literal in source', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const content = readFileSync(file, 'utf8');
      if (/sk-[A-Za-z0-9]{20,}/.test(content)) offenders.push(file);
    }
    expect(offenders, 'suspected API key literal found in: ' + offenders.join(', ')).toEqual([]);
  });

  it('does not reference the upstream host in frontend source (proxy-only)', () => {
    const offenders: string[] = [];
    for (const file of globSync('src/**/*.{ts,tsx}', { cwd: ROOT })) {
      if (file.includes('node_modules') || file.includes('dist')) continue;
      const content = readFileSync(join(ROOT, file), 'utf8');
      if (/external\.transitapp\.com/.test(content)) offenders.push(file);
    }
    expect(offenders, 'frontend must only talk to /api/transit/*: ' + offenders.join(', ')).toEqual([]);
  });
});
