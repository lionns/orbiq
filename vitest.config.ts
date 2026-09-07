import { defineConfig } from "vitest/config";

// Solo el dominio. Las pruebas de recorrido viven en e2e/ y las corre Playwright (D-006).
export default defineConfig({
  test: {
    include: ["src/domain/**/*.test.ts"],
    environment: "node",
  },
});
