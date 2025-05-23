import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("/images", "pages/images.tsx", [
    route("image-list", "api/image-list.tsx"),
    route("image/:storageKey", "api/image.tsx"),
  ]),
] satisfies RouteConfig;
