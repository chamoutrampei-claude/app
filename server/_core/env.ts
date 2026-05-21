export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Senha mestra do dono pra entrar como admin enquanto OAuth real não
  // está configurado. Use /api/admin-login?secret=<ADMIN_LOGIN_SECRET>
  // (e troque esta variável quando configurar OAuth de verdade).
  adminLoginSecret: process.env.ADMIN_LOGIN_SECRET ?? "",
};
