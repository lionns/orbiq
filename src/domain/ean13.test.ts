import { describe, expect, it } from "vitest";
import { codigoDeLaTienda, digitoDeControl, esDeLaTienda, esEan13, modulos } from "./ean13";

describe("EAN-13", () => {
  it("calcula el dígito de control de un código de fábrica conocido", () => {
    expect(digitoDeControl("770251100443")).toBe("2");
    expect(esEan13("7702511004432")).toBe(true);
    expect(esEan13("7702511004433")).toBe(false);
  });

  it("dibuja 95 módulos con sus guardas", () => {
    const m = modulos("7702511004432");
    expect(m).toHaveLength(95);
    expect(m.startsWith("101")).toBe(true);
    expect(m.slice(45, 50)).toBe("01010");
    expect(m.endsWith("101")).toBe(true);
  });
});

describe("código de la tienda (D-012)", () => {
  it("AC-029 · empieza por 2, trae trece dígitos y un dígito de control válido", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = codigoDeLaTienda();
      expect(codigo).toMatch(/^2\d{12}$/);
      expect(esEan13(codigo)).toBe(true);
      expect(esDeLaTienda(codigo)).toBe(true);
    }
  });

  it("un código de fábrica no es de la tienda", () => {
    expect(esDeLaTienda("7702511004432")).toBe(false);
    // Empieza por 2 pero el control no cuadra: no lo generó la tienda.
    expect(esDeLaTienda("2000000000000")).toBe(false);
    expect(esDeLaTienda("2000000000008")).toBe(true);
  });

  it("con el mismo azar da el mismo código: se puede probar sin suerte", () => {
    const siempreCinco = () => 0.5;
    expect(codigoDeLaTienda(siempreCinco)).toBe(`255555555555${digitoDeControl("255555555555")}`);
  });
});
