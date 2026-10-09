import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';

if (process.platform !== 'darwin') throw new Error('This check requires a Mac with Xcode and an iOS Simulator runtime.');
const simctl = (...args) => execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8', timeout: 240_000 });
const devices = JSON.parse(simctl('list', 'devices', 'available', '--json')).devices;
const candidates = Object.entries(devices)
  .filter(([runtime]) => runtime.includes('.iOS-'))
  .flatMap(([runtime, list]) => list.filter(device => device.isAvailable && device.name.startsWith('iPhone')).map(device => ({ ...device, runtime })));
const device = candidates.find(device => device.state === 'Booted') || candidates[0];
if (!device) throw new Error('No available iPhone simulator runtime on this Mac runner.');
const output = 'build/ios-startup';
const bundle = 'com.allinone667.routeoptimizer';
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/device.json`, JSON.stringify({ name: device.name, runtime: device.runtime, bundle, commit: process.env.GITHUB_SHA }, null, 2));
try {
  if (device.state !== 'Booted') simctl('boot', device.udid);
  simctl('bootstatus', device.udid, '-b');
  simctl('install', device.udid, 'build/simulator/Build/Products/Debug-iphonesimulator/App.app');
  console.log(`Launching ${bundle} on ${device.name} (${device.runtime})`);
  simctl('launch', device.udid, bundle);
  await wait(15_000);
  simctl('io', device.udid, 'screenshot', `${output}/first-launch.png`);
  // Terminate/reopen the real native bundle without a development login bypass.
  simctl('terminate', device.udid, bundle);
  simctl('launch', device.udid, bundle);
  await wait(10_000);
  simctl('io', device.udid, 'screenshot', `${output}/reopened.png`);
  console.log('Captured first launch and reopening. Screenshots require visual review; authenticated/device flows are not covered.');
} finally {
  try { simctl('shutdown', device.udid); } catch { /* Preserve the original smoke-check error. */ }
}
