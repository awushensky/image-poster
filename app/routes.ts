import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Auth routes
  route("auth/login", "pages/auth.login.tsx"),
  route("auth/logout", "pages/auth.logout.tsx"),

  // Main app routes (protected)
  route("dashboard", "pages/dashboard.tsx"),
  
  // Image routes -- TODO combine with dashboard
  route("images", "pages/images.tsx", [
    route("image-list", "api/image-list.tsx"),
    route("image/:storageKey", "api/image.tsx"),
  ]),

  // Settings routes
  route("settings", "pages/settings.tsx", [
    route("posting-schedule", "pages/settings.posting-schedule.tsx"),
  ]),

] satisfies RouteConfig;
