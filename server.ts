import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DIST_DIR = path.resolve(__dirname, 'dist');

// Health check endpoints for Cloud Run & container orchestration
app.get(['/healthz', '/_healthz', '/health'], (_req, res) => {
  res.status(200).send('OK');
});

// Serve static assets from dist with caching
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  etag: true,
}));

// Fallback all navigation requests to index.html for React SPA client routing
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send(
    '<!doctype html><html><head><title>SBSC Public School</title></head><body><div id="root">Building...</div></body></html>'
  );
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err: any) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

const shutdown = (signal: string) => {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
