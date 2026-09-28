import { describe, expect, it } from "vitest";
import { conDesde, esRutaPropia, nombreDe, volverA } from "./volver";

const FICHA = "/catalogo/01a0e5a0-553f-7743-8fce-fa2f9ebe61f4";
const VENTAS = { href: "/ventas", texto: "Ventas" };

describe("volver a donde se estaba (T-036)", () => {
  it("vuelve al origen y lo nombra", () => {
    expect(volverA(FICHA, VENTAS)).toEqual({ href: FICHA, texto: "Producto" });
    expect(volverA("/", VENTAS)).toEqual({ href: "/", texto: "Inicio" });
    expect(volverA("/ventas?desde=2026-09-01&hasta=2026-09-27", VENTAS).texto).toBe("Ventas");
    expect(volverA("/catalogo?existencias=negativos", VENTAS).texto).toBe("Productos");
    expect(volverA(`/catalogo?ficha=${FICHA.slice(10)}`, VENTAS).texto).toBe("Producto");
  });

  it("sin origen, a su sitio de siempre", () => {
    expect(volverA(undefined, VENTAS)).toEqual(VENTAS);
    expect(volverA(["/", "/ventas"], VENTAS)).toEqual(VENTAS);
  });

  it("nunca a otro sitio: el origen lo puede escribir cualquiera", () => {
    for (const ajeno of [
      "https://otro.sitio",
      "//otro.sitio",
      "/\\otro.sitio",
      "javascript:alert(1)",
      "otro.sitio",
      "/\u0000x",
    ]) {
      expect(esRutaPropia(ajeno), ajeno).toBe(false);
      expect(volverA(ajeno, VENTAS)).toEqual(VENTAS);
    }
  });

  it("una ruta propia que no se reconoce se nombra con «Volver»", () => {
    expect(nombreDe("/ajustes")).toBe("Volver");
  });
});

describe("enlaces que recuerdan de dónde salen", () => {
  it("añade el origen codificado, con ? o con &", () => {
    expect(conDesde("/ventas/abc", FICHA)).toBe(`/ventas/abc?desde=${encodeURIComponent(FICHA)}`);
    expect(conDesde("/ventas/abc?x=1", "/")).toBe("/ventas/abc?x=1&desde=%2F");
  });

  it("un origen que ya trae el suyo se anida entero: volver dos veces llega al principio", () => {
    const ficha = conDesde(FICHA, "/");
    const venta = conDesde("/ventas/abc", ficha);
    const leido = new URLSearchParams(venta.split("?")[1]).get("desde");
    expect(leido).toBe(ficha);
    expect(new URLSearchParams(leido!.split("?")[1]).get("desde")).toBe("/");
  });

  it("sin origen, o con uno ajeno, deja el enlace como estaba", () => {
    expect(conDesde("/ventas/abc", null)).toBe("/ventas/abc");
    expect(conDesde("/ventas/abc", "https://otro.sitio")).toBe("/ventas/abc");
  });
});
