import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Lista de origins autorizados a fazer chamadas cross-origin pra esta API.
// Inclui:
//   - capacitor://localhost / http://localhost  → WebView do app Android/iOS
//     (o Capacitor expõe o conteúdo nesses schemes por padrão).
//   - O domínio de produção pra quando o web SPA está num CDN separado.
//   - localhost:5173/3000 pra desenvolvimento.
// EXTRA_CORS_ORIGINS no env adiciona origins extras separados por vírgula
// (útil pra previews do Vercel, branches do Railway, etc.).
const STATIC_ALLOWED_ORIGINS = new Set<string>([
  "capacitor://localhost",
  "http://localhost",
  "ionic://localhost",
  "https://chamoutrampei.com.br",
  "https://www.chamoutrampei.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function isOriginAllowed(origin: string | undefined): origin is string {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  const extra = (process.env.EXTRA_CORS_ORIGINS ?? "").split(",").map((s) => s.trim());
  return extra.includes(origin);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS — habilitado pra origins conhecidos (apps Capacitor, dev local,
  // produção). Credentials=true exigido porque a sessão usa cookies httpOnly.
  // Mantemos um middleware manual em vez do pacote `cors` pra deixar a allowlist
  // explícita no código (auditável e zero dependência extra).
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Healthcheck for container orchestrators / load balancers. No auth, no DB
  // touch — just confirms Express is up and accepting connections.
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
