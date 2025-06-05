import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'image-poster.luminblaz.dev',
    ],
    watch: {
      ignored: (path) => {
        if (path.includes('.db') || path.includes('.db-wal') || path.includes('.db-shm')) {
          return true;
        }
        if (path.includes('/data/') || path.includes('\\data\\')) {
          return true;
        }
        if (path.includes('node_modules')) {
          return true;
        }
        return false;
      }
    }
  },
});
