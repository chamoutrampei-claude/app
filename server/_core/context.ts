import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse as parseCookie } from "cookie";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Mock users for the dev-mode auth bypass. ONLY active when
// NODE_ENV === "development" and the user has set a "dev-user-role" cookie
// via the in-app DevPanel. In production the entire branch is skipped.
const DEV_USERS: Record<string, User> = {
  user: {
    id: 9001,
    openId: "dev-user",
    name: "Novo Usuário",
    email: "user@trampei.local",
    loginMethod: "dev",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  worker: {
    id: 9002,
    openId: "dev-worker",
    name: "Trampista Demo",
    email: "trampista@trampei.local",
    loginMethod: "dev",
    role: "worker",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  client: {
    id: 9003,
    openId: "dev-client",
    name: "Padaria Pão Quente (Demo)",
    email: "logista@trampei.local",
    loginMethod: "dev",
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  admin: {
    id: 9004,
    openId: "dev-admin",
    name: "Admin Demo",
    email: "admin@trampei.local",
    loginMethod: "dev",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Dev-mode auth bypass: a "dev-user-role" cookie selects a mock user.
  if (process.env.NODE_ENV === "development") {
    const cookies = parseCookie(opts.req.headers.cookie ?? "");
    const devRole = cookies["dev-user-role"];
    if (devRole && DEV_USERS[devRole]) {
      user = DEV_USERS[devRole];
    }
  }

  // Real auth path (skipped if dev bypass already produced a user).
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
