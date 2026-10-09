import { readFileSync, writeFileSync } from 'node:fs';

// Capacitor sync on Windows emits backslashes, which are invalid Swift paths.
const file = 'ios/App/CapApp-SPM/Package.swift';
const source = readFileSync(file, 'utf8');
const normalized = source.replace(/(path: ")([^"]+)(")/g, (_match, prefix, path, suffix) => `${prefix}${path.replace(/\\/g, '/')}${suffix}`);
if (normalized !== source) writeFileSync(file, normalized);
