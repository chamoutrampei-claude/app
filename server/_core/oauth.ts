import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OWNER_ADMIN_OPEN_ID = "owner-admin";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Login do dono (admin master): /api/admin-login?secret=<ADMIN_LOGIN_SECRET>
  //
  // Cria/atualiza um usuário admin com openId "owner-admin", assina um cookie
  // de sessão e redireciona pra "/admin". Substitui o OAuth do Manus enquanto
  // a integração real (Google/Microsoft) não estiver pronta.
  //
  // SEGURANÇA:
  //  - Só funciona se ADMIN_LOGIN_SECRET estiver setado no .env do servidor.
  //  - O segredo precisa bater 100%. Em produção, mantém esse segredo só com
  //    o dono — qualquer pessoa com ele entra como admin.
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/admin-login", async (req: Request, res: Response) => {
    const provided = getQueryParam(req, "secret");

    if (!ENV.adminLoginSecret) {
      res.status(503).send(
        "ADMIN_LOGIN_SECRET não configurado no servidor. Configure a env var pra usar esta rota."
      );
      return;
    }

    if (!provided || provided !== ENV.adminLoginSecret) {
      res.status(401).send("Segredo inválido.");
      return;
    }

    try {
      const now = new Date();
      await db.upsertUser({
        openId: OWNER_ADMIN_OPEN_ID,
        name: "Owner",
        email: null,
        loginMethod: "owner-secret",
        role: "admin",
        lastSignedIn: now,
      });

      const sessionToken = await sdk.createSessionToken(OWNER_ADMIN_OPEN_ID, {
        name: "Owner",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/admin");
    } catch (error) {
      console.error("[AdminLogin] Failed", error);
      res.status(500).send("Falha ao criar sessão admin.");
    }
  });
}
