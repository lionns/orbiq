import { defineConfig } from "vitest/config";

// El dominio, más la prueba del decodificador de códigos de barras: es una prueba de unidad —no
// levanta navegador— pero comparte generador con las de recorrido, así que vive junto a él (D-006).
export default defineConfig({
  test: {
    include: ["src/domain/**/*.test.ts", "e2e/apoyo/**/*.test.ts"],
    environment: "node",
  },
});
