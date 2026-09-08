import { describe, expect, it } from "vitest";
import {
  acumular,
  equivalentes,
  LECTURA_VACIA,
  normalizarCodigo,
  UMBRAL_LECTOR_MS,
  type LecturaEnCurso,
} from "./escaneo";

describe("normalizarCodigo", () => {
  it("acepta los tres formatos de producto de tienda", () => {
    expect(normalizarCodigo("7702004003508")).toBe("7702004003508"); // EAN-13
    expect(normalizarCodigo("96385074")).toBe("96385074"); // EAN-8
    expect(normalizarCodigo("012345678905")).toBe("012345678905"); // UPC-A
  });

  it("quita los espacios que deja un lector mal configurado", () => {
    expect(normalizarCodigo(" 7702004003508\n")).toBe("7702004003508");
  });

  it("rechaza lo que no puede ser un código, en vez de ir a la base a preguntarlo", () => {
    expect(normalizarCodigo("770200")).toBeNull();
    expect(normalizarCodigo("ABC12345")).toBeNull();
    expect(normalizarCodigo("")).toBeNull();
  });
});

/**
 * Teclea una secuencia con un intervalo fijo entre teclas y devuelve lo que el objetivo emitió.
 * `teclas` va como lista porque "Enter" es una tecla, no cinco letras.
 */
function teclear(teclas: string[], intervalo: number) {
  let estado: LecturaEnCurso = LECTURA_VACIA;
  const emitidos: string[] = [];
  teclas.forEach((tecla, i) => {
    const paso = acumular(estado, { tecla, ahora: 1_000 + i * intervalo });
    estado = paso.estado;
    if (paso.codigo) emitidos.push(paso.codigo);
  });
  return { emitidos, estado };
}

const RAFAGA = [..."7702004003508", "Enter"];

describe("acumular", () => {
  it("una ráfaga de lector completa produce el código", () => {
    expect(teclear(RAFAGA, 10).emitidos).toEqual(["7702004003508"]);
  });

  it("una persona tecleando los mismos dígitos no dispara nada", () => {
    expect(teclear(RAFAGA, 150).emitidos).toEqual([]);
  });

  it("dos lecturas seguidas emiten dos códigos, sin arrastrar la primera", () => {
    expect(teclear([...RAFAGA, ...RAFAGA], 10).emitidos).toEqual([
      "7702004003508",
      "7702004003508",
    ]);
  });

  it("una tecla que no es dígito corta la ráfaga: es alguien usando la pantalla", () => {
    const { estado } = teclear([..."7702", "a", ..."004003508"], 10);
    expect(estado.teclas).toBe("004003508");
  });

  it("Enter suelto no emite nada: es un formulario enviándose", () => {
    expect(acumular(LECTURA_VACIA, { tecla: "Enter", ahora: 1_000 }).codigo).toBeNull();
  });

  it("una ráfaga rápida que no compone un código válido no emite", () => {
    expect(teclear([..."770200", "Enter"], 10).emitidos).toEqual([]);
  });

  it("justo en el umbral todavía cuenta como lector, y un milisegundo después no", () => {
    const base: LecturaEnCurso = { teclas: "770200400350", ultima: 1_000 };
    expect(acumular(base, { tecla: "8", ahora: 1_000 + UMBRAL_LECTOR_MS }).estado.teclas).toBe(
      "7702004003508",
    );
    expect(acumular(base, { tecla: "8", ahora: 1_000 + UMBRAL_LECTOR_MS + 1 }).estado.teclas).toBe(
      "8",
    );
  });
});

describe("equivalentes", () => {
  it("un UPC-A de doce dígitos también se busca como EAN-13 con cero delante", () => {
    expect(equivalentes("012345678905")).toEqual(["012345678905", "0012345678905"]);
  });

  it("un EAN-13 que empieza en cero también se busca sin él", () => {
    expect(equivalentes("0012345678905")).toEqual(["0012345678905", "012345678905"]);
  });

  it("un EAN-13 normal se busca tal cual: no hay ambigüedad que resolver", () => {
    expect(equivalentes("7702004003508")).toEqual(["7702004003508"]);
  });

  it("un EAN-8 se busca tal cual", () => {
    expect(equivalentes("96385074")).toEqual(["96385074"]);
  });
});
