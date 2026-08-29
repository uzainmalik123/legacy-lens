import { defineConfig } from "vitest/config";
import path from "path";

const rootAlias = { "@": path.resolve(__dirname) };

export default defineConfig({
  test: {
    projects: [
      {
        // lib/** tests run in node environment (existing Feature 1 & 2 tests)
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/__tests__/**/*.test.ts"],
        },
        resolve: {
          alias: rootAlias,
        },
      },
      {
        // app/** component tests run in happy-dom environment
        test: {
          name: "app",
          environment: "happy-dom",
          include: ["app/**/__tests__/**/*.test.tsx", "app/**/__tests__/**/*.test.ts"],
          setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
        },
        resolve: {
          alias: rootAlias,
        },
      },
    ],
  },
});
