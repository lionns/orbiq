# Project Brief

## Objective

Orbiq es la plataforma sobre la que un negocio administra su operación y la sirve a donde la
necesite: un panel donde gestiona lo suyo, y desde el que esa información alimenta las superficies
que use — su sitio, su tienda, su punto de venta o el sistema de un tercero. Un mismo motor sirve a
negocios distintos, y cada uno activa solo la parte que le sirve.

El MVP es la primera capacidad, **inventario y ventas**, y el primer cliente es un negocio de
barrio: cada venta queda registrada como un cambio en el historial del inventario. Se opera desde
computador, tablet o celular, el que el negocio tenga a mano. Cuando funciona, el dueño sabe qué
tiene, a qué precio y qué se está acabando, sin llevarlo en un cuaderno.

Ni la capacidad ni el cliente definen el producto. Inventario y ventas es por dónde se empieza; un
negocio de barrio es quién lo estrena. Ni el tamaño, ni el rubro, ni el dispositivo de ese primer
cliente son propiedades de Orbiq.

Lo que permite que llegue el resto no es tenerlo esbozado hoy — es que nada de lo de hoy obligue a
migrar para admitirlo.

### Puertas que quedan abiertas

Crecer tiene que ser aditivo. Estos compromisos son de producto, no de implementación: cada uno dice
qué NO puede costar una capacidad futura. El mecanismo que los cumple vive en la decisión que se
cita, y el stack concreto en `docs/project/architecture.md`.

- **Sumar una capacidad no rehace las que ya están.** La segunda y la tercera se montan al lado de
  la primera, y la forma común se extrae cuando ya se conoce (`D-003`).
- **Sumar una superficie no reescribe la lógica.** Una API pública, una app nativa o una tienda se
  montan sobre lo que ya existe (`D-001`).
- **Sumar una persona al negocio no rehace el esquema.** Empleados y permisos entran como datos
  (`D-008`).
- **Sumar un negocio no obliga a renumerar lo que hay.** Las bases pueden convivir después
  (`D-002`, `D-005`).
- **El historial de lo que pasó nunca se reescribe.** Hoy son las existencias; devoluciones,
  traslados y compras a proveedor se añaden encima sin tocarlo (`D-002`).
- **Cambiar el modelo es rutina, no un evento.** La evolución del esquema es parte del trabajo
  normal desde la tarea uno (`D-002`).


## Users

Los del MVP. Cada capacidad nueva puede traer los suyos.

- **Primary — El dueño del negocio:** registra ventas, consulta precios, ajusta existencias y da de
  alta productos, desde el dispositivo que tenga a mano. Con frecuencia será de pie y con una mano
  mientras atiende, que es la situación más exigente y por eso la que manda en el diseño. La
  aplicación compite contra no usarla.
- **Secondary — El empleado:** atiende por el dueño. Vende, busca y ve las ventas; no anula, no
  edita productos ni corrige el conteo. Lo da de alta y de baja el dueño (`D-013`).
- **Secondary — El operador del estudio (cosmiq):** da de alta el negocio y entra a la misma
  aplicación para revisar y acompañar. No tiene una interfaz propia.

## Scope

### In Scope (MVP)

- Catálogo de productos: nombre, precio, categoría plana, existencias y código de barras opcional.
  Cada cosa escaneable es un producto; no hay variantes.
- Lectura de código de barras como entrada de primera clase, venga de cámara, de un lector o
  tecleada: consultar un producto, darlo de alta cuando el código es desconocido, y añadirlo a una
  venta (`D-007`).
- Códigos de la tienda para lo que no trae código, con su hoja de etiquetas carta para imprimir
  (`D-012`).
- Registro de venta: escanear o tocar desde una cuadrícula de frecuentes en la misma pantalla,
  total siempre visible, confirmar. Descuenta existencias en una sola operación.
- Anulación de una venta registrada por error.
- Ajuste manual de existencias con motivo obligatorio.
- Historial de movimientos por producto.
- Una sesión de dueño protegida por contraseña, y empleados que el dueño da de alta y de baja: venden
  y consultan, pero no anulan, no editan productos ni corrigen el conteo (`D-013`).
- Interfaz web responsive: una sola aplicación operable en computador, tablet y celular.

### Out of Scope

Fuera del MVP, no fuera del producto. Ninguna tarea puede expandirse a esto sin una decisión nueva;
cada línea nombra lo que la traería de vuelta.

- **Multi-tenancy** — un despliegue por negocio hasta el quinto cliente (`D-005`).
- **Variantes, ubicaciones, bodegas y jerarquía de categorías** — entran cuando un negocio real
  venda algo que las necesite. Cada cosa escaneable es hoy un producto.
- **API pública y SDK** — entran como envoltorio de las funciones de dominio cuando exista un
  segundo consumidor (`D-001`).
- **CMS, sitio público y canales de venta** — es la dirección declarada del producto, y no compite
  con que el inventario funcione primero.
- **Funcionamiento sin conexión y sincronización diferida** — la venta ya se registra de forma
  idempotente, que es la mitad cara del problema (`D-005`).
- **Factura fiscal, impuestos y medios de pago** — dependen del país y del régimen del negocio.
- **Pistola lectora** — el objetivo de escaneo la admite sin código adicional el día que aparezca,
  pero no se diseña para ella (`D-007`).

## Constraints

Las del MVP y su primer cliente.

- La aplicación se opera desde computador, tablet o celular. Es una sola interfaz que se ensancha,
  no dos construidas por separado. Se diseña primero para el caso más restrictivo — pantalla
  pequeña, una mano, de pie — porque ensanchar sale más barato que reducir.
- Una parte de lo que vende un negocio puede no tener código de barras — granel, pan, huevos. El
  flujo de venta no puede depender del escaneo.
- La conexión puede ser por datos móviles. Una venta no puede quedar a medias ni descontar
  existencias dos veces si el dueño reintenta.
- Registrar una venta tiene que ser más rápido que sumar de cabeza. Si no lo es, el dueño deja de
  abrir la aplicación y el inventario queda obsoleto en una semana.

## Success Measures

- El dueño registra ventas por su cuenta durante dos semanas seguidas sin que nadie se lo recuerde.
- Escanear un producto conocido y verlo en pantalla toma menos de tres segundos.
- Una venta de tres artículos, uno de ellos sin código, se registra en menos de veinte segundos.
- El conteo físico de una categoría coincide con lo que dice la aplicación, o la diferencia queda
  explicada por un movimiento registrado.

## Open Questions

- ¿Cuántos productos tiene el negocio hoy, y cuántos traen código de fábrica? Define si el alta
  inicial es una tarde o una semana, y si hace falta una carga masiva que hoy está fuera de alcance.
- ¿Android o iPhone? Con Android hay escaneo nativo del navegador y la aplicación puede instalarse
  de verdad. Hasta saberlo se construye para ambos (`D-007`).
- ~~¿Alguien más atiende el negocio?~~ **Sí, cerrada el 2026-09-29:** empleados con rol propio
  (`D-013`).
- ¿El dueño quiere saber cuánto vendió, o solo qué le queda? Decide si existe una pantalla de
  reportes, que hoy no está en alcance.
