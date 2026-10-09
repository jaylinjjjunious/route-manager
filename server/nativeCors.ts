import type { RequestHandler } from 'express';

/** Only the bundled Capacitor origin, with bearer auth enforced by each API. */
export const nativeCors: RequestHandler = (req, res, next) => {
  if (req.headers.origin !== 'capacitor://localhost') return next();
  res.vary('Origin');
  res.setHeader('Access-Control-Allow-Origin', 'capacitor://localhost');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
};
