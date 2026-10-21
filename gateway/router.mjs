import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

// The parent knows URLs and build directories, never room implementation modules.
export function createGateway({ routeTarget, hallwayTarget, hallwayRoot, cleaningRoot, cleaningTarget }) {
  const targetFor = url => url.startsWith('/hallway/') ? hallwayTarget : url.startsWith('/cleaning/') ? cleaningTarget : routeTarget;
  const server = http.createServer(async (request, response) => {
    let url;
    try { url = new URL(request.url, 'http://gateway.local'); } catch { response.writeHead(400).end(); return; }
    if (url.pathname === '/sw.js') {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      const content = await readFile(new URL('./retire-worker.js', import.meta.url));
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : content); return;
    }
    if (url.pathname === '/route-manager') {
      response.writeHead(308, { Location: `/route-manager/${url.search}` }).end(); return;
    }
    if (url.pathname === '/cleaning') {
      response.writeHead(308, { Location: `/cleaning/${url.search}` }).end(); return;
    }
    const cleaning = url.pathname.startsWith('/cleaning/');
    if (cleaning && !cleaningRoot && !cleaningTarget) { response.writeHead(404).end('Not found'); return; }
    const hallway = ['/', '/index.html', '/hallway', '/hallway/'].includes(url.pathname) || url.pathname.startsWith('/hallway/');
    if ((hallway && !hallwayTarget) || (cleaning && !cleaningTarget)) {
      const assetRoot = cleaning ? cleaningRoot : hallwayRoot;
      const relative = cleaning ? (url.pathname === '/cleaning/' ? 'index.html' : url.pathname.slice('/cleaning/'.length)) : ['/', '/index.html', '/hallway', '/hallway/'].includes(url.pathname) ? 'index.html' : url.pathname.slice('/hallway/'.length);
      let filename;
      try { filename = path.resolve(assetRoot, decodeURIComponent(relative)); } catch { response.writeHead(400).end(); return; }
      if (!filename.startsWith(path.resolve(assetRoot) + path.sep)) { response.writeHead(403).end(); return; }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
      try {
        const content = await readFile(filename);
        response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': filename.endsWith('.html') ? 'no-cache' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
        response.end(request.method === 'HEAD' ? undefined : content);
      } catch { response.writeHead(404).end('Not found'); }
      return;
    }
    const target = new URL(cleaning ? cleaningTarget : hallway ? hallwayTarget : routeTarget);
    // APIs and old public assets keep their URLs and browser origin.
    const roomPath = request.url.replace(/^\/route-manager(?=\/|\?|$)/, '') || '/';
    const upstream = http.request({ hostname: target.hostname, port: target.port, method: request.method, path: hallway || cleaning ? request.url : roomPath, headers: request.headers }, incoming => {
      response.writeHead(incoming.statusCode || 502, incoming.headers);
      incoming.on('error', () => response.destroy());
      incoming.pipe(response);
    });
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Software is temporarily unavailable'); });
    request.on('aborted', () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on('upgrade', (request, socket, head) => {
    const target = new URL(targetFor(request.url) || routeTarget);
    const upstream = http.request({ hostname: target.hostname, port: target.port, path: request.url, headers: request.headers });
    upstream.on('upgrade', (incoming, connection, upstreamHead) => {
      socket.write(`HTTP/1.1 ${incoming.statusCode} Switching Protocols\r\n${Object.entries(incoming.headers).map(([key, value]) => `${key}: ${value}\r\n`).join('')}\r\n`);
      if (head.length) connection.write(head);
      if (upstreamHead.length) socket.write(upstreamHead);
      connection.pipe(socket).pipe(connection);
      socket.on('error', () => connection.destroy());
      connection.on('error', () => socket.destroy());
    });
    upstream.on('error', () => socket.destroy());
    upstream.on('response', () => socket.destroy());
    upstream.end();
  });
  return server;
}
