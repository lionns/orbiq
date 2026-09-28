import { expect, test } from "@playwright/test";

/**
 * T-037. Las cabeceras de seguridad llegan en toda respuesta, también en la de acceso, que es la
 * única pública. Medido antes: ninguna, y `X-Powered-By` anunciando Next.js.
 */
test("toda respuesta trae las cabeceras de seguridad y no anuncia con qué está hecha", async ({
  request,
}) => {
  for (const ruta of ["/acceso", "/vender"]) {
    const r = await request.get(ruta, { maxRedirects: 0 });
    const h = r.headers();
    expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"], ruta).toBe("DENY");
    expect(h["x-content-type-options"], ruta).toBe("nosniff");
    expect(h["referrer-policy"], ruta).toBe("strict-origin-when-cross-origin");
    // La cámara sí, para esta app: es el escaneo.
    expect(h["permissions-policy"], ruta).toContain("camera=(self)");
    expect(h["x-powered-by"], ruta).toBeUndefined();
  }
});

/**
 * T-038. El límite de intentos vale también para el formulario de Acceso, que es por donde entra el
 * dueño —y por donde probaría un atacante—, no solo para `/api/auth`. Medido antes: doce
 * contraseñas malas seguidas por el formulario, ninguna frenada.
 *
 * Cada prueba se presenta con su propia IP de documentación (RFC 5737) para no gastar el cupo de
 * las demás, que corren en paralelo.
 */
test("el formulario de Acceso frena la cuarta contraseña mala seguida desde la misma IP", async ({
  browser,
}) => {
  const ip = `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
  const contexto = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const page = await contexto.newPage();
  await page.goto("/acceso");
  const error = page.getByTestId("acceso-error");

  for (let i = 1; i <= 3; i++) {
    await page.getByLabel("Correo").fill("nadie@orbiq.test");
    await page.getByLabel("Contraseña").fill(`mala-${i}`);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(error).toHaveText("Correo o contraseña incorrectos.");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  }

  // React vacía el formulario tras cada envío: se vuelve a escribir todo.
  await page.getByLabel("Correo").fill("nadie@orbiq.test");
  await page.getByLabel("Contraseña").fill("mala-4");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(error).toContainText("Demasiados intentos");

  // Otra IP no hereda el bloqueo.
  const otro = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "192.0.2.77" } });
  const otra = await otro.newPage();
  await otra.goto("/acceso");
  await otra.getByLabel("Correo").fill("nadie@orbiq.test");
  await otra.getByLabel("Contraseña").fill("mala");
  await otra.getByRole("button", { name: "Entrar" }).click();
  await expect(otra.getByTestId("acceso-error")).toHaveText("Correo o contraseña incorrectos.");

  await contexto.close();
  await otro.close();
});
