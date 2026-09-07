# Componentes de interfaz

Lo que se ve, sin reglas de negocio dentro. Ninguno lleva `"use client"`: sin estado ni efectos,
sirven igual desde una pantalla de servidor y desde una de cliente. Añadir `"use client"` a uno los
arrastraría a todos al paquete del navegador.

Aquí viven las decisiones de `design-handoff.md` que, repetidas, acaban contradiciéndose: el área
táctil mínima de 48 px, el borde con contraste suficiente para un control, y el rojo del saldo
negativo.

## Por qué existe cada uno

`D-003` pide tres usos reales antes de abstraer. Los que no llegan a tres están abajo con su razón,
que no puede ser «por si acaso».

| Componente | Usos | Por qué |
| --- | --- | --- |
| `Campo` | 11 | Muy por encima del umbral |
| `Boton` | 7 | Muy por encima del umbral |
| `BotonEnlace` | 3 | En el umbral |
| `Precio` | 3 | En el umbral |
| `BarraInferior` | 2 | **Hay un tercer caso que no la puede usar:** la venta en curso deja de estar fija a partir de 1024 px y pasa a ser una columna. El patrón tiene tres sitios; el componente solo sirve en dos |
| `Existencias` | 2 | **Decidimos permitir el saldo negativo, así que mostrarlo es la única salvaguarda que queda.** En dos archivos, un día uno se queda sin el rojo y nadie se entera |
| `Aviso` | 2 | **Emparejar `role="alert"` con `aria-live` es fácil de escribir mal**, y cuando se escribe mal no falla: simplemente nadie oye el mensaje |

`Boton` y `BotonEnlace` son dos y no uno con un parámetro: lo que navega tiene que ser un enlace de
verdad para funcionar sin JavaScript y para poder compartirse — es lo que hace que «Ver más» siga
sirviendo con la red a medias (`AC-018`).
