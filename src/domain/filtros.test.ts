import { describe, expect, it } from "vitest";
import {
  comoDireccion,
  hayFiltros,
  leerFiltros,
  siguienteTanda,
  TANDA,
  VER_MAXIMO,
} from "./filtros";

describe("leerFiltros", () => {
  it("sin parámetros no acota nada y muestra la primera tanda", () => {
    const f = leerFiltros({});
    expect(f).toEqual({
      busqueda: null,
      categoria: null,
      existencias: "todos",
      desde: null,
      hasta: null,
      incluirDesactivados: false,
      ver: TANDA,
    });
    expect(hayFiltros(f)).toBe(false);
  });

  it("lee los tres filtros a la vez", () => {
    const f = leerFiltros({ q: " arroz ", categoria: "Granos", existencias: "agotados", desde: "1000", hasta: "5000" });
    expect(f.busqueda).toBe("arroz");
    expect(f.categoria).toBe("Granos");
    expect(f.existencias).toBe("agotados");
    expect(f.desde).toBe(1000);
    expect(f.hasta).toBe(5000);
    expect(hayFiltros(f)).toBe(true);
  });

  it("acepta el precio con los separadores que salen al teclear", () => {
    expect(leerFiltros({ desde: "12.500" }).desde).toBe(12500);
  });

  it("los retirados solo salen si se piden a propósito", () => {
    expect(leerFiltros({}).incluirDesactivados).toBe(false);
    expect(leerFiltros({ desactivados: "1" }).incluirDesactivados).toBe(true);
    // Cualquier otra cosa no cuenta como pedirlos.
    expect(leerFiltros({ desactivados: "true" }).incluirDesactivados).toBe(false);
    expect(hayFiltros(leerFiltros({ desactivados: "1" }))).toBe(true);
  });

  it("un estado que no existe se ignora en vez de fallar", () => {
    // La dirección la puede escribir cualquiera.
    expect(leerFiltros({ existencias: "carísimos" }).existencias).toBe("todos");
  });

  it("por reponer sobrevive en la dirección y sigue siendo un filtro", () => {
    const f = leerFiltros({ existencias: "por-reponer" });
    expect(hayFiltros(f)).toBe(true);
    expect(comoDireccion(f)).toBe("/catalogo?existencias=por-reponer");
    const valor = new URL(comoDireccion(f), "http://local").searchParams.get("existencias")!;
    expect(leerFiltros({ existencias: valor }).existencias).toBe("por-reponer");
  });

  it("un precio que no es número se ignora", () => {
    const f = leerFiltros({ desde: "hola", hasta: "" });
    expect(f.desde).toBeNull();
    expect(f.hasta).toBeNull();
  });

  it("un rango al revés se endereza en vez de devolver nada", () => {
    const f = leerFiltros({ desde: "9000", hasta: "1000" });
    expect([f.desde, f.hasta]).toEqual([1000, 9000]);
  });

  it("nunca muestra menos de una tanda ni más del tope", () => {
    expect(leerFiltros({ ver: "1" }).ver).toBe(TANDA);
    expect(leerFiltros({ ver: "999999999" }).ver).toBe(VER_MAXIMO);
    expect(leerFiltros({ ver: "-5" }).ver).toBe(TANDA);
  });

  it("toma el primer valor cuando el parámetro llega repetido", () => {
    expect(leerFiltros({ q: ["pan", "arroz"] }).busqueda).toBe("pan");
  });
});

describe("comoDireccion", () => {
  it("sin nada que decir, la dirección queda limpia", () => {
    expect(comoDireccion(leerFiltros({}))).toBe("/catalogo");
  });

  it("ver más conserva los filtros porque los vuelve a escribir enteros", () => {
    const f = leerFiltros({ q: "pan", existencias: "agotados", desde: "500" });
    const url = comoDireccion(f, { ver: siguienteTanda(f) });
    expect(url).toContain("q=pan");
    expect(url).toContain("existencias=agotados");
    expect(url).toContain("desde=500");
    expect(url).toContain(`ver=${TANDA * 2}`);
  });

  it("lo que se escribe se vuelve a leer igual", () => {
    // Es la propiedad que hace que el enlace se pueda compartir (AC-018).
    const original = leerFiltros({ q: "café", categoria: "Bebidas", existencias: "negativos", desde: "1.000", hasta: "20.000", desactivados: "1", ver: "48" });
    const params = Object.fromEntries(
      new URLSearchParams(comoDireccion(original).split("?")[1] ?? ""),
    );
    expect(leerFiltros(params)).toEqual(original);
  });

  it("ver más nunca pasa del tope", () => {
    expect(siguienteTanda(leerFiltros({ ver: String(VER_MAXIMO) }))).toBe(VER_MAXIMO);
  });
});
