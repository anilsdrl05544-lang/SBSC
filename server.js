import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
const DIST_DIR = path.resolve(__dirname, "dist");
app.get(["/healthz", "/_healthz", "/health"], (_req, res) => {
  res.status(200).send("OK");
});
app.use(express.static(DIST_DIR, {
  maxAge: "1d",
  etag: true
}));
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }
  const indexPath = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send(
    '<!doctype html><html><head><title>SBSC Public School</title></head><body><div id="root">Building...</div></body></html>'
  );
});
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\u{1F680} Production server running on http://0.0.0.0:${PORT}`);
});
server.on("error", (err) => {
  console.error("\u274C Server startup error:", err);
  process.exit(1);
});
const shutdown = (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
