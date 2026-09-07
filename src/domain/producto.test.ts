import { describe, expect, it } from "vitest";
import { formatearPrecio, parsearPrecio } from "./moneda";
import { validarAlta } from "./producto";

const completo = {
  nombre: "Arroz 500 g",
  precio: "3500",
  existenciasIniciales: "10",
};

describe("parsearPrecio", () => {
  it("acepta los separadores de miles que salen solos al teclear", () => {
    expect(parsearPrecio("12500")).toBe(12500);
    expect(parsearPrecio("12.500")).toBe(12500);
    expect(parsearPrecio("12 500")).toBe(12500);
    expect(parsearPrecio("12,500")).toBe(12500);
  });

  it("no inventa un número cuando no lo hay", () => {
    expect(parsearPrecio("")).toBeNull();
    expect(parsearPrecio("  ")).toBeNull();
    expect(parsearPrecio("gratis")).toBeNull();
    expect(parsearPrecio("12x500")).toBeNull();
  });

  it("distingue el cero de la ausencia de precio", () => {
    expect(parsearPrecio("0")).toBe(0);
  });
});

describe("formatearPrecio", () => {
  it("agrupa los miles y no inventa un símbolo de moneda", () => {
    expect(formatearPrecio(12500)).toBe("12.500");
    expect(formatearPrecio(0)).toBe("0");
  });

  it("agrupa también los de cuatro cifras, que el español dejaría sueltos", () => {
    // Una lista donde 3500 va sin punto y 12.500 con él se lee peor de un vistazo.
    expect(formatearPrecio(3500)).toBe("3.500");
  });
});

describe("validarAlta", () => {
  it("acepta un producto completo", () => {
    const r = validarAlta({ ...completo, codigoDeBarras: "7701234567890" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.precio).toBe(3500);
      expect(r.valor.existenciasIniciales).toBe(10);
      expect(r.valor.codigoDeBarras).toBe("7701234567890");
    }
  });

  it("sin código de barras guarda nulo, no cadena vacía", () => {
    // Dos cadenas vacías chocarían contra el índice único; dos nulos conviven (`AC-005`).
    const r = validarAlta({ ...completo, codigoDeBarras: "   " });
    expect(r.ok && r.valor.codigoDeBarras).toBeNull();
  });

  it("sin existencias iniciales el producto entra en cero", () => {
    const r = validarAlta({ nombre: "Pan", precio: "500" });
    expect(r.ok && r.valor.existenciasIniciales).toBe(0);
  });

  it("rechaza el precio negativo", () => {
    const r = validarAlta({ ...completo, precio: "-1" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errores.precio).toBeTruthy();
  });

  it("rechaza el nombre vacío", () => {
    const r = validarAlta({ ...completo, nombre: "   " });
    expect(!r.ok && r.errores.nombre).toBeTruthy();
  });

  it("rechaza existencias negativas o fraccionadas", () => {
    expect(validarAlta({ ...completo, existenciasIniciales: "-5" }).ok).toBe(false);
    expect(validarAlta({ ...completo, existenciasIniciales: "1,5" }).ok).toBe(false);
  });

  it("junta todos los errores en vez de soltarlos de a uno", () => {
    const r = validarAlta({ nombre: "", precio: "no", existenciasIniciales: "-1" });
    expect(!r.ok && Object.keys(r.errores)).toHaveLength(3);
  });
});
