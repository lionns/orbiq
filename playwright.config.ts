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
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] }, testIgnore: /camara\.spec\.ts$/ },
    {
      // La cámara necesita un navegador arrancado con dispositivo de vídeo falso, así que va en su
      // propio proyecto: dárselo a toda la suite cambiaría el navegador de las demás.
      //
      // Aquí **no** se comprueba que decodifique: el vídeo falso llega negro al lienzo en headless,
      // medido en `T-016`. Se comprueba que el flujo siga vivo, que es lo que se rompió.
      name: "camara",
      testMatch: /camara\.spec\.ts$/,
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
