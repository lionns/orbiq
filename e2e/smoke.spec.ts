import { expect, test } from "@playwright/test";

/**
 * D-006: la rebanada es la prueba. Esta es la mínima que puede existir — que la aplicación cargue
 * en un celular. Cada rebanada siguiente añade la suya, y esta se sigue corriendo.
 */
test("la aplicación carga en un celular", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
