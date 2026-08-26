const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = process.cwd();
loadLocalEnv();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function loadLocalEnv() {
  [".env.local", ".env"].forEach((fileName) => {
    const file = path.join(root, fileName);
    if (!fs.existsSync(file)) return;
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    });
  });
}
const apiHandlers = {
  "/api/auth": require("../api/auth"),
  "/api/users": require("../api/users"),
  "/api/status": require("../api/status"),
  "/api/staff": require("../api/staff"),
  "/api/master": require("../api/master"),
  "/api/departments": require("../api/departments"),
  "/api/activities": require("../api/activities"),
  "/api/reference": require("../api/reference")
};

function createResponse(res) {
  return {
    statusCode: 200,
    setHeader: (...args) => res.setHeader(...args),
    end(chunk) {
      res.statusCode = this.statusCode;
      res.end(chunk);
    }
  };
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${host}:${port}`);
  if (apiHandlers[parsed.pathname]) {
    req.query = Object.fromEntries(parsed.searchParams.entries());
    apiHandlers[parsed.pathname](req, createResponse(res));
    return;
  }

  const requested = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const file = path.normalize(path.join(root, requested));
  if (!file.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(port, host, () => {
  console.log(`Local dev server: http://${host}:${port}`);
  if (host === "0.0.0.0" || host === "::") {
    getLanUrls(port).forEach((url) => console.log(`LAN URL: ${url}`));
  }
});

function getLanUrls(portNumber) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${portNumber}`);
}
