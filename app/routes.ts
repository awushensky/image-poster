import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/dashboard.tsx"),

  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),

  route("api/image-queue", "api/api.image-queue.ts"),
  route("api/image/:storageKey?", "api/api.image.ts"),
  route("api/posting-schedules", "api/api.posting-schedules.ts"),
  route("api/user", "api/api.user.ts"),

  route("client-metadata.json", "routes/client-metadata.json.tsx"),
  route("jwks.json", "routes/jwks.json.tsx"),

] satisfies RouteConfig;
