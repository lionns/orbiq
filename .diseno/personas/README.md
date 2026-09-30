# Personas

El prototipo del pedido del cliente: que el dueño dé acceso a un empleado la tienda por él.
Validado con el estudio el 2026-09-29. Es el contrato de `T-039`. Usa los
tokens de `../cobalto/`; si difieren, manda la tabla de Cobalto.

Nada de `src/` importa estos archivos. Cada `.dc.html` es un artboard de 360 de ancho.

Lo que el estudio respondió el 2026-09-29 y estas vistas ya siguen: un empleado entra con correo y
contraseña; lo da de alta y de baja el dueño desde la app; **no** puede anular ventas, cambiar
precios ni editar productos, ni corregir el conteo; **sí** vende, busca, escanea y ve Inicio y
Ventas con sus totales.

## Qué hay

| Archivo | Qué es |
| --- | --- |
| `Ajustes` | Ajustes con una fila «Personas» que lleva a la lista |
| `Personas` | La lista: el dueño, los empleados, y abajo los dados de baja |
| `Anadir` | Nombre, correo y contraseña inicial, con lo que puede y no puede hacer un empleado |
| `Persona` | Una persona: lo que cobró hoy, cambiar su contraseña, dar de baja |
| `Persona-baja` | La confirmación de dar de baja: qué pasa y qué se conserva |
| `Empleado-Ficha` | La ficha vista por un empleado: sin Acciones, con una línea que dice a quién pedir un cambio |
| `Empleado-Ventas` | Una venta vista por un empleado: dice quién la cobró, sin «Anular» |
| `Venta-quien` | La misma venta vista por el dueño: «Cobró María» y «Anular» |
| `Empleado-Desconocido` | Código que no está, visto por un empleado: buscar por nombre o seguir, sin dar de alta |

Un empleado tampoco ve «Nuevo producto», ni «Ya lo vendo, cambió el código» ni «Es un producto
nuevo» cuando escanea un código desconocido. En sus Ajustes solo aparecen Apariencia y Sesión.

## Lo que se decidió al validarlo

1. «Personas» es una fila en Ajustes que lleva a la lista (dirección A), no la lista a la vista:
   con muchas personas, Ajustes no crece.
2. La ficha de un empleado no tiene Acciones y dice a quién pedir un cambio (dirección B).
3. El rol se llama «Empleado» en pantalla (`staff` en la base).
4. Dar de alta productos y registrar lo que llegó («Llegaron») lo hace solo el dueño, por ahora.
