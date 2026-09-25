// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { diaDelNegocio } from "../src/domain/zona";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-004 · US-005. La venta recorrida entera contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;
const MARCA = `t4-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("venta");
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

/** Productos sembrados por la base: la pantalla del catálogo ya tiene sus propias pruebas. */
async function sembrar(items: { nombre: string; precio: number; existencias: number }[]) {
  const creados = [];
  for (const item of items) {
    const [p] = await db
      .insert(schema.product)
      .values({ name: `${item.nombre} ${MARCA}`, price: item.precio, stock: 0 })
      .returning({ id: schema.product.id, nombre: schema.product.name });
    if (item.existencias !== 0) {
      await db.insert(schema.stockMovement).values({
        productId: p!.id,
        quantity: item.existencias,
        type: "initial",
        userId: dueno.id,
      });
      await db
        .update(schema.product)
        .set({ stock: item.existencias })
        .where(eq(schema.product.id, p!.id));
    }
    creados.push({ ...p!, precio: item.precio });
  }
  return creados;
}

const existenciasDe = async (id: string) => {
  const [p] = await db
    .select({ stock: schema.product.stock })
    .from(schema.product)
    .where(eq(schema.product.id, id));
  return p!.stock;
};

const movimientosDe = (ids: string[]) =>
  db.select().from(schema.stockMovement).where(inArray(schema.stockMovement.productId, ids));

/**
 * Añade un producto como lo haría el dueño: tocando su casilla si está entre los frecuentes y, si
 * no, buscándolo por nombre. La cuadrícula enseña los 24 más vendidos de **toda** la base, y las
 * pruebas de este archivo venden decenas de unidades en paralelo: depender de entrar en ella hacía
 * que pasaran o fallaran según el orden (`T-018` lo arregló para una; esto, para todas).
 */
const nombres = new Map<string, string>();
async function tocar(page: Page, id: string, veces = 1) {
  for (let i = 0; i < veces; i++) {
    const casilla = page.getByTestId(`casilla-${id}`);
    if (!(await casilla.isVisible())) {
      if (!nombres.has(id)) {
        const [p] = await db
          .select({ nombre: schema.product.name })
          .from(schema.product)
          .where(eq(schema.product.id, id));
        nombres.set(id, p!.nombre);
      }
      await page.getByTestId("codigo-tecleado").fill(nombres.get(id)!);
      await page.getByTestId("codigo-tecleado").press("Enter");
    }
    await casilla.click();
  }
}

/**
 * En el celular la venta está recogida en una línea (`T-029`, punto 3): las cantidades y el total
 * grande están dentro, a un toque. En computador siempre está desplegada y no hay nada que abrir.
 */
async function ventaNueva(page: Page) {
  // La venta en curso sobrevive a recargar (`T-029`, punto 1). Una prueba que recorre varios
  // anchos en la misma sesión empieza cada vuelta sin la de la vuelta anterior.
  await page.evaluate(() => localStorage.removeItem("orbiq.venta"));
  await page.reload();
}

async function abrirVenta(page: Page) {
  const ver = page.getByTestId("ver-venta");
  if (await ver.isVisible()) await ver.click();
}

test("una venta de tres artículos baja las existencias y escribe un movimiento por cada uno", async ({
  page,
}) => {
  const [arroz, pan, leche] = await sembrar([
    { nombre: "Arroz", precio: 3500, existencias: 10 },
    { nombre: "Pan", precio: 500, existencias: 20 },
    { nombre: "Leche", precio: 4200, existencias: 5 },
  ]);

  await entrarComo(page, dueno);
  await tocar(page, arroz!.id, 2);
  await tocar(page, pan!.id);
  await tocar(page, leche!.id);

  // El total se ve mientras se arma, no al final (AC-X01).
  await expect(page.getByTestId("total")).toContainText("11.700");
  await page.getByTestId("confirmar").click();

  // Sin diálogo que cerrar: la pantalla queda lista para la siguiente.
  await expect(page.getByTestId("venta-anterior")).toContainText("11.700");
  await expect(page.getByTestId("total")).toContainText("0");

  expect(await existenciasDe(arroz!.id)).toBe(8);
  expect(await existenciasDe(pan!.id)).toBe(19);
  expect(await existenciasDe(leche!.id)).toBe(4);

  const ids = [arroz!.id, pan!.id, leche!.id];
  const deVenta = (await movimientosDe(ids)).filter((m) => m.type === "sale");
  expect(deVenta).toHaveLength(3);
  expect(deVenta.every((m) => m.saleId !== null)).toBe(true);
  expect(deVenta.map((m) => m.quantity).sort((a, b) => a - b)).toEqual([-2, -1, -1]);
});

test("la misma venta enviada dos veces se registra una sola vez", async () => {
  // AC-010. Se llama al dominio directamente: es donde vive la garantía, y una prueba por la
  // pantalla no podría provocar el segundo envío con el mismo identificador.
  const [galleta] = await sembrar([{ nombre: "Galletas", precio: 1200, existencias: 7 }]);
  const ventaId = nuevoId();
  const lineas = [{ productoId: galleta!.id, cantidad: 3 }];

  const primera = await registrarVenta(ventaId, lineas, dueno.id);
  const segunda = await registrarVenta(ventaId, lineas, dueno.id);

  expect(primera.yaEstaba).toBe(false);
  expect(segunda.yaEstaba).toBe(true);
  expect(segunda.total).toBe(primera.total);

  // Lo que importa no es el valor devuelto sino que no se descontó dos veces.
  expect(await existenciasDe(galleta!.id)).toBe(4);
  const ventas = await db.select().from(schema.sale).where(eq(schema.sale.id, ventaId));
  expect(ventas).toHaveLength(1);
  const lineasEnBase = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.saleId, ventaId));
  expect(lineasEnBase).toHaveLength(1);
});

test("subir el precio después no reescribe lo que ya se cobró", async () => {
  // AC-009: la línea copia el precio vigente al vender.
  const [aceite] = await sembrar([{ nombre: "Aceite", precio: 9000, existencias: 4 }]);
  const ventaId = nuevoId();
  const venta = await registrarVenta(ventaId, [{ productoId: aceite!.id, cantidad: 1 }], dueno.id);
  expect(venta.total).toBe(9000);

  await db
    .update(schema.product)
    .set({ price: 15000 })
    .where(eq(schema.product.id, aceite!.id));

  const [linea] = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.saleId, ventaId));
  expect(linea!.unitPrice).toBe(9000);
  const [guardada] = await db.select().from(schema.sale).where(eq(schema.sale.id, ventaId));
  expect(guardada!.total).toBe(9000);
});

test("si la red falla, lo dice sin rodeos, no descuenta, y reintentar cobra una sola vez", async ({
  page,
}) => {
  const [atun] = await sembrar([{ nombre: "Atún", precio: 6000, existencias: 6 }]);
  await entrarComo(page, dueno);
  await tocar(page, atun!.id, 2);

  // La acción de servidor viaja por POST a la misma ruta. Cortarla es el fallo de red real.
  await page.route("**/vender", (ruta) =>
    ruta.request().method() === "POST" ? ruta.abort("failed") : ruta.continue(),
  );
  await page.getByTestId("confirmar").click();

  // AC-015: decir que NO se guardó. Un «algo salió mal» deja al dueño sin saber si cobrar de nuevo.
  await expect(page.getByTestId("fallo-de-red")).toContainText("No se guardó");
  await expect(page.getByTestId("confirmar")).toHaveText("Reintentar");
  expect(await existenciasDe(atun!.id)).toBe(6);
  // Y la venta sigue armada: no hay que volver a tocarla.
  await expect(page.getByTestId("total")).toContainText("12.000");

  await page.unroute("**/vender");
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toContainText("12.000");
  expect(await existenciasDe(atun!.id)).toBe(4);

  const ventas = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.productId, atun!.id));
  expect(ventas).toHaveLength(1);
});

test("vender más de lo que hay se permite y el saldo queda negativo", async ({ page }) => {
  // Decidido con el estudio: la aplicación registra lo que pasó, no decide lo que se puede vender.
  /**
   * Se llega a la única unidad **vendiendo**, no sembrándola. La cuadrícula ordena por lo más
   * vendido y corta en 24 casillas, así que un producto recién sembrado y sin ventas se cae de
   * ella en cuanto la base tiene datos de las otras pruebas — y esta fallaba solo con la suite
   * completa, que es la peor forma de fallar. Es el mismo obstáculo que ya sorteó la prueba de los
   * colores de alerta, y se sortea igual: como se llega en la vida real.
   */
  const [huevos] = await sembrar([{ nombre: "Huevos", precio: 800, existencias: 31 }]);
  await registrarVenta(nuevoId(), [{ productoId: huevos!.id, cantidad: 30 }], dueno.id);
  expect(await existenciasDe(huevos!.id)).toBe(1);

  await entrarComo(page, dueno);
  // Antes de tocarla: si no estuviera, el fallo dice que falta la casilla y no que expiró un clic.
  await expect(page.getByTestId(`casilla-${huevos!.id}`)).toHaveCount(1);
  await tocar(page, huevos!.id, 3);
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();

  expect(await existenciasDe(huevos!.id)).toBe(-2);
});

test("en la cuadrícula, el cero y el negativo se ven en rojo", async ({ page }) => {
  // Ninguna prueba miraba esto y las dos pantallas no coincidían: el catálogo alerta solo en
  // negativo y la venta también en cero. Ahora la diferencia está fijada, no heredada.
  /**
   * Las cantidades son grandes a propósito. Desde `T-014` la cuadrícula ordena de verdad por lo más
   * vendido y muestra 24 casillas; un producto sin ventas se queda fuera cuando la base tiene datos.
   * Se llega al cero y al negativo **vendiendo**, que además es como se llega en la vida real.
   */
  const [agotado, negativo, normal] = await sembrar([
    { nombre: "Agotado", precio: 1000, existencias: 30 },
    { nombre: "Debe", precio: 1000, existencias: 30 },
    { nombre: "Normal", precio: 1000, existencias: 100 },
  ]);
  await registrarVenta(nuevoId(), [{ productoId: agotado!.id, cantidad: 30 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: negativo!.id, cantidad: 34 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: normal!.id, cantidad: 30 }], dueno.id);

  await entrarComo(page, dueno);
  // Si alguna casilla no estuviera, el fallo sería el mismo que el de la alerta: se comprueba antes.
  for (const p of [agotado, negativo, normal]) {
    await expect(page.getByTestId(`casilla-${p!.id}`)).toHaveCount(1);
  }
  await expect(page.getByTestId(`casilla-${agotado!.id}`).locator("[data-alerta]")).toHaveCount(1);
  await expect(page.getByTestId(`casilla-${negativo!.id}`).locator("[data-alerta]")).toHaveCount(1);
  await expect(page.getByTestId(`casilla-${normal!.id}`).locator("[data-alerta]")).toHaveCount(0);
});

test("tocar dos veces suma, y se puede corregir la cantidad sin rehacer la venta", async ({
  page,
}) => {
  const [cafe] = await sembrar([{ nombre: "Café", precio: 11000, existencias: 9 }]);
  await entrarComo(page, dueno);
  await tocar(page, cafe!.id, 3);
  await expect(page.getByTestId(`cantidad-${cafe!.id}`)).toHaveText("3");

  await abrirVenta(page);
  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await expect(page.getByTestId(`cantidad-${cafe!.id}`)).toHaveText("2");
  await expect(page.getByTestId("total")).toContainText("22.000");

  // Bajar de uno saca la línea; una línea en cero no es una venta.
  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await expect(page.getByTestId("venta-en-curso")).toBeEmpty();
  await expect(page.getByTestId("confirmar")).toBeDisabled();
});

/**
 * Reportado por el estudio: «cuando selecciono muchos productos no puedo bajar del todo en la lista,
 * queda por detrás». La cuadrícula reservaba un hueco fijo para la barra del total, pero la barra
 * crece con el carrito: con ocho artículos medía 379 px contra 304 reservados, y esos 75 px de
 * diferencia tapaban el final de la cuadrícula sin que se pudiera desplazar más.
 */
test("con el carrito lleno se sigue llegando al final de la cuadrícula", async ({ page }) => {
  // Ocho productos **vendidos**, para que entren en la cuadrícula por donde ella ordena (`T-018`).
  const suyos = await sembrar(
    Array.from({ length: 8 }, (_, i) => ({ nombre: `Carga${i}`, precio: 1000 + i, existencias: 40 })),
  );
  for (const p of suyos) {
    await registrarVenta(nuevoId(), [{ productoId: p!.id, cantidad: 30 - suyos.indexOf(p) }], dueno.id);
  }

  // 560 de alto: un teléfono corto con la barra del navegador desplegada, que es donde la barra de
  // la venta llegaba a comerse más de la mitad de la pantalla.
  await page.setViewportSize({ width: 360, height: 560 });
  await entrarComo(page, dueno);
  for (const p of suyos) await tocar(page, p!.id);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Recogida, el total va dentro de Cobrar (`T-029`, punto 8): es lo que tiene que verse.
  await expect(page.getByTestId("confirmar")).toBeVisible();

  const medido = await page.evaluate(() => {
    const todas = [...document.querySelectorAll('[data-testid^="casilla-"]')];
    const ultima = todas[todas.length - 1]!.getBoundingClientRect();
    const barra = document.querySelector('[aria-label="Venta en curso"]')!.getBoundingClientRect();
    return { fondoUltima: ultima.bottom, techoBarra: barra.top, altoBarra: barra.height,
             pantalla: window.innerHeight };
  });
  // Con holgura, no al ras. Reservar exactamente lo que mide la barra daba cero píxeles de margen:
  // en el navegador de prueba cuadraba y en un teléfono real —donde la barra del navegador encoge
  // lo visible— la última fila quedaba debajo. El estudio lo reportó dos veces.
  expect(medido.techoBarra - medido.fondoUltima).toBeGreaterThanOrEqual(16);
  // Y la barra no puede quedarse con media pantalla: la cuadrícula es la razón de estar aquí.
  expect(medido.altoBarra).toBeLessThan(medido.pantalla / 2);
});

test("a 360 px el total se ve siempre y nada del flujo de venta vive arriba", async ({ page }) => {
  // Se llega a la cuadrícula vendiendo, no sembrando: ordena por lo más vendido y corta en 24, así
  // que un producto sin ventas se cae de ella en cuanto la base tiene datos. Mismo remedio que
  // `T-018` aplicó a su vecina, y lo destapó la prueba del carrito lleno de aquí arriba.
  const [galleta] = await sembrar([{ nombre: "Galleta ancha", precio: 2500, existencias: 42 }]);
  await registrarVenta(nuevoId(), [{ productoId: galleta!.id, cantidad: 30 }], dueno.id);
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await tocar(page, galleta!.id);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  // AC-X01: el total está a la vista sin desplazarse. Con la venta recogida va dentro de Cobrar
  // (`T-029`, punto 8), así que es Cobrar lo que tiene que verse entero y con el importe.
  const confirmar = await page.getByTestId("confirmar").boundingBox();
  await expect(page.getByTestId("confirmar")).toContainText("2.500");
  expect(confirmar!.y + confirmar!.height).toBeLessThanOrEqual(740);

  // NFR-003: cobrar, escanear y las cantidades viven fuera del tercio superior, donde llega el pulgar.
  expect(confirmar!.y).toBeGreaterThan(740 / 3);
  expect(confirmar!.height).toBeGreaterThanOrEqual(48);
  const escanear = await page.getByTestId("escanear").boundingBox();
  expect(escanear!.y).toBeGreaterThan(740 / 3);
  // Desplegada, el total grande también se ve entero.
  await abrirVenta(page);
  const total = await page.getByTestId("total").boundingBox();
  expect(total!.y + total!.height).toBeLessThanOrEqual(740);
  const menos = await page.getByRole("button", { name: /^Quitar uno de/ }).boundingBox();
  expect(menos!.y).toBeGreaterThan(740 / 3);
  expect(menos!.height).toBeGreaterThanOrEqual(48);
});

test("la cuadrícula ordena por lo más vendido, no por cualquier cosa", async ({ page }) => {
  /**
   * Esto no funcionó nunca hasta `T-014`. Drizzle no cualifica los nombres de columna dentro de una
   * plantilla `sql` en un `select`, así que la subconsulta comparaba `sale_line.product_id` con
   * `sale_line.id` —nunca acertaba— y la cuadrícula ordenaba todo por cero y luego por nombre.
   * Con datos sembrados en orden alfabético el resultado parecía razonable, que es lo que hizo que
   * pasara desapercibido.
   */
  const [zeta, alfa] = await sembrar([
    { nombre: "Zzz poco vendido", precio: 1000, existencias: 200 },
    { nombre: "Aaa muy vendido", precio: 1000, existencias: 200 },
  ]);
  // El de nombre alfabéticamente posterior se vende más: si el orden fuera por nombre, perdería.
  // Por encima de lo que venden las pruebas vecinas (hasta 50 en la de computador): con 9 y 1, las
  // que corren en paralelo los echaban de los 24 que enseña la cuadrícula — lo mismo que `T-018`.
  await registrarVenta(nuevoId(), [{ productoId: zeta!.id, cantidad: 90 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: alfa!.id, cantidad: 60 }], dueno.id);

  await entrarComo(page, dueno);
  const casillas = await page.getByTestId(/^casilla-/).all();
  const nombres = await Promise.all(casillas.map((c) => c.innerText()));
  const posicion = (parte: string) => nombres.findIndex((n) => n.includes(parte));

  expect(posicion("Zzz poco vendido")).toBeGreaterThanOrEqual(0);
  expect(posicion("Zzz poco vendido")).toBeLessThan(posicion("Aaa muy vendido"));
});

/**
 * Reportado por el estudio con captura: «tenemos problemas con este botón al agregar muchos
 * productos en la versión de PC». El total y el botón compartían línea, y el número no se encoge ni
 * se parte: en cuanto llegaba a seis cifras empujaba al botón fuera de la barra —29 px fuera de la
 * columna de computador, y de paso una barra de desplazamiento horizontal en toda la página—.
 *
 * Pasó porque la suite entera corre a 412 px, el ancho del Pixel 7, y ahí cabía por 16. Los dos
 * anchos que fallaban son los dos extremos de `AC-X01`: 360 px y computador. Por eso esta prueba
 * fija su propio tamaño en vez de confiar en el del proyecto.
 */
test("el botón de confirmar se queda dentro de la barra con un total de seis cifras", async ({
  page,
}) => {
  const [caro] = await sembrar([{ nombre: "Canasta", precio: 58_010, existencias: 40 }]);
  await registrarVenta(nuevoId(), [{ productoId: caro!.id, cantidad: 30 }], dueno.id);

  // 360 es el ancho más estrecho que el producto promete; de 1024 para arriba la barra deja de ser
  // una franja y pasa a ser una columna de 352 px — más estrecha que casi cualquier teléfono, que
  // es lo que hace del computador el caso difícil y no el fácil.
  for (const [ancho, alto] of [
    [360, 740],
    [1024, 900],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: ancho, height: alto });
    await entrarComo(page, dueno);
    await ventaNueva(page);
    await tocar(page, caro!.id, 3);
    await expect(page.getByTestId("total")).toContainText("174.030");
    // En el celular el total grande está dentro de la venta desplegada: se mide ahí, que es donde
    // conviven el total y el botón. Recogida, el importe va dentro del propio botón.
    await abrirVenta(page);

    const medido = await page.evaluate(() => {
      const barra = document.querySelector('[aria-label="Venta en curso"]')!.getBoundingClientRect();
      const boton = document.querySelector('[data-testid="confirmar"]')!.getBoundingClientRect();
      const total = document.querySelector('[data-testid="total"]')!.getBoundingClientRect();
      return {
        desborde: Math.round(Math.max(boton.right - barra.right, barra.left - boton.left)),
        solapan: boton.top < total.bottom && boton.left < total.right && total.left < boton.right,
        anchoBoton: Math.round(boton.width),
        altoBoton: Math.round(boton.height),
        scrollWidth: document.documentElement.scrollWidth,
        ancho: window.innerWidth,
      };
    });

    // Dentro de la barra, no al ras: el borde redondeado de la columna es el que se veía cortado.
    expect(medido.desborde, `a ${ancho} px el botón se sale ${medido.desborde} px`).toBeLessThan(0);
    // Y dentro sin pisar el total: encogerlo hasta que quepa sería la otra forma de «caber».
    expect(medido.solapan, `a ${ancho} px el botón pisa el total`).toBe(false);
    // La página no se ensancha por culpa de la barra.
    expect(medido.scrollWidth, `a ${ancho} px la página se desplaza en horizontal`).toBeLessThanOrEqual(
      medido.ancho,
    );
    // Sigue siendo el objetivo táctil de `NFR-003`, no un botón encogido para que entre.
    expect(medido.altoBoton).toBeGreaterThanOrEqual(48);
    expect(medido.anchoBoton).toBeGreaterThan(150);
  }
});

/**
 * Preguntado por el estudio: «¿el total y el botón no deberían estar siempre visibles?». Lo estaban
 * en celular —la barra va fija abajo, con tope desde `T-025`— y no en computador: la columna no
 * tenía tope, así que crecía con el carrito hasta 1447 px y el total caía en y=1344 sobre una
 * pantalla de 900. `sticky` no lo alcanza cuando la tarjeta es más alta que la ventana.
 */
test("en computador el total sigue a la vista con el carrito más largo que la pantalla", async ({
  page,
}) => {
  const suyos = await sembrar(
    Array.from({ length: 20 }, (_, i) => ({
      nombre: `Columna${i}`,
      precio: 1000 + i * 137,
      existencias: 60,
    })),
  );
  // Vendidos, para que entren en la cuadrícula por donde ella ordena (`T-018`).
  for (const [i, p] of suyos.entries()) {
    await registrarVenta(nuevoId(), [{ productoId: p!.id, cantidad: 50 - i }], dueno.id);
  }

  // 900 de alto es una pantalla de escritorio holgada; 768, el portátil corriente. El defecto
  // aparecía en las dos, porque no dependía de la pantalla sino de que la columna no tuviera tope.
  for (const [ancho, alto] of [
    [1280, 900],
    [1366, 768],
  ] as const) {
    await page.setViewportSize({ width: ancho, height: alto });
    await entrarComo(page, dueno);
    await ventaNueva(page);
    for (const p of suyos) await tocar(page, p!.id);
    await expect(page.getByTestId("total")).toBeVisible();

    const medido = await page.evaluate(() => {
      const barra = document.querySelector('[aria-label="Venta en curso"]')!.getBoundingClientRect();
      const boton = document.querySelector('[data-testid="confirmar"]')!.getBoundingClientRect();
      const total = document.querySelector('[data-testid="total"]')!.getBoundingClientRect();
      const lista = document.querySelector('[data-testid="venta-en-curso"]')!;
      return {
        altoBarra: Math.round(barra.height),
        pantalla: window.innerHeight,
        totalDentro: total.top >= 0 && total.bottom <= window.innerHeight,
        botonDentro: boton.top >= 0 && boton.bottom <= window.innerHeight,
        fueraPorAbajo: Math.round(boton.bottom - window.innerHeight),
        listaSeDesplaza: lista.scrollHeight > lista.clientHeight,
      };
    });

    // Enteros dentro de la ventana, sin desplazar la página: es lo que se mira mientras se cobra.
    expect(
      medido.totalDentro,
      `a ${ancho}×${alto} el total no cabe en la ventana`,
    ).toBe(true);
    expect(
      medido.botonDentro,
      `a ${ancho}×${alto} el botón se sale ${medido.fueraPorAbajo} px por abajo`,
    ).toBe(true);
    // Y lo que cede es la lista, que se desplaza por dentro — no el total, que se queda.
    expect(medido.altoBarra).toBeLessThanOrEqual(medido.pantalla);
    expect(medido.listaSeDesplaza, "la lista no está desplazándose por dentro").toBe(true);
  }
});

// ——— T-029: lo que Cobalto añadió a la venta (`.diseno/cobalto`, puntos 1, 5, 11, 13 y 14) ———

/**
 * Añade por búsqueda y no por la cuadrícula. La cuadrícula enseña los 24 más vendidos, y registrar
 * ventas para entrar en ella echa fuera a los productos de las pruebas vecinas que corren en
 * paralelo: el mismo defecto que ya corrigió `T-018`. Buscar por nombre no compite con nadie.
 */
async function anadir(page: Page, p: { id: string; nombre: string }, veces = 1) {
  for (let i = 0; i < veces; i++) {
    await page.getByTestId("codigo-tecleado").fill(p.nombre);
    await page.getByTestId("codigo-tecleado").press("Enter");
    await page.getByTestId(`casilla-${p.id}`).click();
  }
}

test("la venta en curso sobrevive a ir a Productos y a recargar; cobrarla la vacía", async ({
  page,
}) => {
  const [a, b] = await sembrar([
    { nombre: "Persiste A", precio: 1200, existencias: 30 },
    { nombre: "Persiste B", precio: 800, existencias: 30 },
  ]);
  await entrarComo(page, dueno);
  await anadir(page, a!, 2);
  await anadir(page, b!);

  // Irse a mirar un precio ya no la pierde, y la insignia de Vender dice cuántos esperan.
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: /Productos/ }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByTestId("barra-de-pestanas").getByTestId("insignia-venta")).toContainText("3");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: /Vender/ }).click();
  await expect(page.getByTestId(`cantidad-${a!.id}`)).toHaveText("2");

  await page.reload();
  await expect(page.getByTestId(`cantidad-${a!.id}`)).toHaveText("2");
  await expect(page.getByTestId("total")).toContainText("3.200");

  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toContainText("3.200");
  await page.reload();
  await expect(page.getByTestId("venta-en-curso").locator("li")).toHaveCount(0);
  await expect(page.getByTestId("barra-de-pestanas").getByTestId("insignia-venta")).toHaveCount(0);
});

test("deshacer un cobro anula esa venta, devuelve las existencias y la trae de vuelta al carrito", async ({
  page,
}) => {
  const [p] = await sembrar([{ nombre: "Deshacible", precio: 2500, existencias: 10 }]);
  await entrarComo(page, dueno);
  await anadir(page, p!, 3);
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toContainText("7.500");
  expect(await existenciasDe(p!.id)).toBe(7);

  await page.getByTestId("deshacer").click();
  await expect(page.getByTestId("cobro-deshecho")).toBeVisible();
  // Vuelve para corregirla: las tres unidades, listas para cobrar otra vez.
  await expect(page.getByTestId(`cantidad-${p!.id}`)).toHaveText("3");
  expect(await existenciasDe(p!.id)).toBe(10);
  const anulaciones = (await movimientosDe([p!.id])).filter((m) => m.type === "sale_void");
  expect(anulaciones.map((m) => m.quantity)).toEqual([3]);

  // T-028: en la siguiente carga la venta deshecha sigue a la vista pero anulada, en Ventas y en
  // las últimas de Inicio, y no suma. Se comprueba la marca y no el total: otras pruebas venden
  // hoy en paralelo contra la misma base.
  const deshecha = anulaciones[0]!.saleId!;
  await page.goto(`/ventas?desde=${diaDelNegocio(new Date())}&hasta=${diaDelNegocio(new Date())}`);
  await expect(page.getByTestId(`venta-${deshecha}`)).toContainText("Anulada");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator(`a[href="/ventas/${deshecha}"]`)).toContainText("Anulada");
  await page.goto("/vender");
  await expect(page.getByTestId(`cantidad-${p!.id}`)).toHaveText("3");

  // Y cobrarla de nuevo es otra venta, no un reintento de la anulada (`AC-010`).
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toContainText("7.500");
  expect(await existenciasDe(p!.id)).toBe(7);
});

test("vaciar no pregunta, no llama al servidor, y deshacer devuelve los nueve artículos", async ({
  page,
}) => {
  const [a, b] = await sembrar([
    { nombre: "Vaciable A", precio: 500, existencias: 50 },
    { nombre: "Vaciable B", precio: 900, existencias: 50 },
  ]);
  await entrarComo(page, dueno);
  await anadir(page, a!, 6);
  await anadir(page, b!, 3);
  await abrirVenta(page);

  const alServidor: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") alServidor.push(r.url());
  });
  page.on("dialog", () => {
    throw new Error("Vaciar no puede abrir un diálogo");
  });
  await page.getByTestId("vaciar").click();
  await expect(page.getByTestId("venta-vaciada")).toContainText("9 artículos");
  await expect(page.getByTestId("venta-en-curso").locator("li")).toHaveCount(0);
  expect(alServidor, "vaciar no es una operación del servidor").toEqual([]);

  await page.getByTestId("deshacer").click();
  await expect(page.getByTestId(`cantidad-${a!.id}`)).toHaveText("6");
  await expect(page.getByTestId(`cantidad-${b!.id}`)).toHaveText("3");
});

test("la cantidad se escribe: seis huevos son un toque y un número", async ({ page }) => {
  const [h] = await sembrar([{ nombre: "Huevo", precio: 800, existencias: 90 }]);
  await entrarComo(page, dueno);
  await anadir(page, h!);
  await abrirVenta(page);

  await page.getByTestId(`cantidad-${h!.id}`).click();
  await page.getByTestId(`editar-cantidad-${h!.id}`).fill("6");
  await page.getByTestId(`editar-cantidad-${h!.id}`).press("Enter");
  await expect(page.getByTestId(`cantidad-${h!.id}`)).toHaveText("6");
  await expect(page.getByTestId("total")).toContainText("4.800");
});

test("en computador el lector escribe en la búsqueda sin tocar nada, y F2 cobra", async ({ page }) => {
  const codigo = `77${Date.now()}`.slice(0, 13);
  const [p] = await sembrar([{ nombre: "Leído", precio: 3100, existencias: 20 }]);
  await db.update(schema.product).set({ barcode: codigo }).where(eq(schema.product.id, p!.id));
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrarComo(page, dueno);

  // El cursor ya está en la búsqueda: un lector USB es un teclado que escribe y pulsa Enter.
  await expect(page.getByTestId("codigo-tecleado")).toBeFocused();
  await page.keyboard.type(codigo);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId(`cantidad-${p!.id}`)).toHaveText("1");
  // Y el campo queda vacío para el siguiente, que si no caería pegado a este.
  await expect(page.getByTestId("codigo-tecleado")).toHaveValue("");
  await page.keyboard.type(codigo);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId(`cantidad-${p!.id}`)).toHaveText("2");

  await page.keyboard.press("F2");
  await expect(page.getByTestId("venta-anterior")).toContainText("6.200");
  expect(await existenciasDe(p!.id)).toBe(18);
});
