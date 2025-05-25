import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Auth routes
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),

  // OAuth routes
  route("client-metadata.json", "routes/client-metadata.json.tsx"),
  route("jwks.json", "routes/jwks.json.tsx"),

  // Main app routes (protected)
  route("dashboard", "routes/dashboard.tsx"),
  
  // Image routes -- TODO combine with dashboard
  route("images", "routes/images.tsx", [
    route("image-list", "api/image-list.tsx"),
    route("image/:storageKey", "api/image.tsx"),
  ]),

  // Settings routes
  route("settings", "routes/settings.tsx", [
    route("posting-schedule", "routes/settings.posting-schedule.tsx"),
  ]),

] satisfies RouteConfig;
