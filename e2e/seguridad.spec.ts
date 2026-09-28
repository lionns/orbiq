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
