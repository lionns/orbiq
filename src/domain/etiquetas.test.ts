import { describe, expect, it } from "vitest";
import {
  alternar,
  comoPedido,
  COPIAS_MAXIMO,
  copiasSugeridas,
  enHojas,
  leerMarcados,
  leerPedido,
  MARCADOS_MAXIMO,
  pedidoDeFormulario,
  POR_HOJA,
} from "./etiquetas";

describe("lo marcado vive en la dirección", () => {
  it("lee `m`, sin repetidos y en el orden en que se marcó", () => {
    expect(leerMarcados("b,a,b, c")).toEqual(["b", "a", "c"]);
    expect(leerMarcados(undefined)).toEqual([]);
    expect(leerMarcados(["a", "b"])).toEqual(["a", "b"]);
  });

  it("ignora lo que no es un identificador: la dirección la escribe cualquiera", () => {
    expect(leerMarcados("a,<script>,,b")).toEqual(["a", "b"]);
  });

  it("no deja pedir el catálogo entero", () => {
    const muchos = Array.from({ length: 500 }, (_, i) => `p${i}`).join(",");
    expect(leerMarcados(muchos)).toHaveLength(MARCADOS_MAXIMO);
  });

  it("marcar y desmarcar no toca a los demás: sobrevive a otra búsqueda", () => {
    expect(alternar(["a", "b"], "c")).toEqual(["a", "b", "c"]);
    expect(alternar(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
});

describe("lo pedido", () => {
  it("lee `id:copias` y acota las copias entre una y el máximo", () => {
    expect(leerPedido("a:12,b:0,c:9999,d:hola")).toEqual([
      { id: "a", copias: 12 },
      { id: "b", copias: 1 },
      { id: "c", copias: COPIAS_MAXIMO },
      { id: "d", copias: 1 },
    ]);
  });

  it("lee el formulario de «Cuántas de cada uno», un `id` y un `n` por producto", () => {
    expect(pedidoDeFormulario(["a", "b"], ["3", "15"])).toEqual([
      { id: "a", copias: 3 },
      { id: "b", copias: 15 },
    ]);
    expect(pedidoDeFormulario("a", "4")).toEqual([{ id: "a", copias: 4 }]);
  });

  it("se escribe de vuelta igual que se lee", () => {
    const pedido = [{ id: "a", copias: 12 }, { id: "b", copias: 3 }];
    expect(leerPedido(comoPedido(pedido))).toEqual(pedido);
  });

  it("propone una etiqueta por unidad que hay, y al menos una", () => {
    expect(copiasSugeridas(12)).toBe(12);
    expect(copiasSugeridas(0)).toBe(1);
    expect(copiasSugeridas(-3)).toBe(1);
  });
});

describe("en hojas carta de 30", () => {
  const productos = [
    { id: "pan", nombre: "Pan", precio: 500, codigo: "2000000000001" },
    { id: "queso", nombre: "Queso", precio: 9800, codigo: "2000000000002" },
  ];

  it("repite cada producto tantas veces como se pidió, en el orden del pedido", () => {
    const [hoja] = enHojas(productos, [{ id: "queso", copias: 2 }, { id: "pan", copias: 1 }]);
    expect(hoja!.map((e) => e.nombre)).toEqual(["Queso", "Queso", "Pan"]);
  });

  it("con más de 30 sale otra hoja", () => {
    const hojas = enHojas(productos, [{ id: "pan", copias: 25 }, { id: "queso", copias: 10 }]);
    expect(hojas.map((h) => h.length)).toEqual([POR_HOJA, 5]);
  });

  it("lo pedido de un producto que no está se cae, no rompe la hoja", () => {
    expect(enHojas(productos, [{ id: "otro", copias: 3 }])).toEqual([]);
  });
});
