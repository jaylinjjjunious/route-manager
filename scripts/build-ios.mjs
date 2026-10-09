import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Package only local startup/error assets; the live site supplies the entire app.
const output = resolve('dist-native');
await mkdir(output, { recursive: true });
// Clear only entries inside the fixed generated directory (old bundled assets).
for (const name of await readdir(output)) {
  await rm(resolve(output, name), { recursive: true, force: true });
}
for (const name of ['index.html', 'connection-error.html']) {
  await copyFile('ios-shell/connection-error.html', resolve(output, name));
}
await copyFile('ios-shell/native-navigation.js', resolve(output, 'native-navigation.js'));
console.log('Prepared live-site iOS shell, native navigation bridge and connection-error screen.');
