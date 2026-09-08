import { defineConfig, devices } from "@playwright/test";

// D-006: cada rebanada trae una prueba que recorre pantalla, servidor y base con datos reales.
// El proyecto por defecto es un celular, porque es el caso que manda (D-009, NFR-003).

export default defineConfig({
  testDir: "./e2e",
  // Solo los recorridos son suyos. En `e2e/apoyo/` vive además una prueba de unidad que corre
  // Vitest, y sin esto Playwright intentaría ejecutarla como si fuera un recorrido.
  testMatch: /\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
