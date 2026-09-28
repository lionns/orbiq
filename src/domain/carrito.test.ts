import { describe, expect, it } from "vitest";
import { agregar, cambiarCantidad, carritoVacio, clave, estaVacio, total, unidades } from "./carrito";

const arroz = { productoId: "p1", nombre: "Arroz", precio: 3500 };
const pan = { productoId: "p2", nombre: "Pan", precio: 500 };

describe("carrito", () => {
  it("empieza vacío y sin total", () => {
    const c = carritoVacio("v1");
    expect(estaVacio(c)).toBe(true);
    expect(total(c)).toBe(0);
  });

  it("añadir el mismo producto suma uno en vez de duplicar la línea", () => {
    // Es lo que hace que escanear dos veces seguidas no ensucie la venta.
    const c = agregar(agregar(agregar(carritoVacio("v1"), arroz), arroz), pan);
    expect(c.articulos).toHaveLength(2);
    expect(c.articulos.find((a) => a.productoId === "p1")!.cantidad).toBe(2);
    expect(unidades(c)).toBe(3);
    expect(total(c)).toBe(3500 * 2 + 500);
  });

  it("bajar a cero saca el artículo, no deja una línea en cero", () => {
    const c = cambiarCantidad(agregar(carritoVacio("v1"), arroz), "p1", 0);
    expect(estaVacio(c)).toBe(true);
  });

  it("una cantidad negativa también lo saca", () => {
    const c = cambiarCantidad(agregar(carritoVacio("v1"), arroz), "p1", -3);
    expect(c.articulos).toHaveLength(0);
  });

  it("lo último añadido va arriba: es lo que se acaba de escanear (T-033)", () => {
    const c = agregar(agregar(carritoVacio("v1"), arroz), pan);
    expect(c.articulos.map((a) => a.productoId)).toEqual(["p2", "p1"]);
  });

  it("el mismo producto con dos códigos son dos líneas: descuentan de sitios distintos (D-010)", () => {
    const viejo = { ...arroz, codigoId: "c-viejo", codigo: "7702511000014" };
    const nuevo = { ...arroz, codigoId: "c-nuevo", codigo: "7702511004432" };
    let c = agregar(agregar(agregar(carritoVacio("v1"), viejo), nuevo), nuevo);
    expect(c.articulos).toHaveLength(2);
    expect(c.articulos.find((a) => a.codigoId === "c-nuevo")!.cantidad).toBe(2);
    c = cambiarCantidad(c, clave(nuevo), 0);
    expect(c.articulos.map((a) => a.codigoId)).toEqual(["c-viejo"]);
  });

  it("no muta el carrito que recibe", () => {
    // La pantalla compara referencias para decidir si repinta.
    const antes = agregar(carritoVacio("v1"), arroz);
    const despues = agregar(antes, pan);
    expect(antes.articulos).toHaveLength(1);
    expect(despues).not.toBe(antes);
  });

  it("conserva el identificador de la venta al cambiar los artículos", () => {
    // Si cambiara, reintentar tras un fallo de red cobraría dos veces (AC-010).
    const c = cambiarCantidad(agregar(carritoVacio("v-fijo"), arroz), "p1", 5);
    expect(c.id).toBe("v-fijo");
  });
});
