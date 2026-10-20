import { defineConfig } from "vitest/config";
import path from "path";

// Deliberately independent of vite.config.ts, which sets root: "client" for
// the SPA dev server — inheriting that would make Vitest look for tests
// inside client/ instead of the project-root tests/ directory.
export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
