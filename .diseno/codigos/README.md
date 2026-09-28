# Códigos

El prototipo de los pedidos del cliente, validado con el estudio el 2026-09-27 antes de escribir
código. Es el contrato de `T-032` (varios códigos por producto), de `T-033` (Vender sin la
cuadrícula) y de `T-034` (la cámara al centro). Usa los tokens de `../cobalto/`; si difieren,
manda la tabla de Cobalto.

Nada de `src/` importa estos archivos. Cada `.dc.html` es un artboard de 360 de ancho, salvo `Visor-PC`, de 1280.

## Qué hay

| Archivo | Qué es |
| --- | --- |
| `Main` | Se escanea un código que no está: «Ya lo vendo, cambió el código» o «Es un producto nuevo» |
| `Elegir` | Buscar por nombre el producto al que se le añade el código |
| `Confirmar` | Los códigos que ya tiene, el nuevo, y «¿Cuántas llegaron con este código?» |
| `Vendiendo` | De vuelta en la venta, con la línea diciendo de qué código salió |
| `Ficha` | La ficha con «Por código»: cada código con su cantidad, que suman el total |
| `Nuevo` | El alta de un producto nuevo con el código puesto y «¿Cuántas hay?» |
| `Vender` | Vender sin cuadrícula: vacía al abrir, solo la venta que se arma escaneando o buscando |
| `Visor`, `Visor-PC` | «Escanear» abre la cámara al centro, tapando la pantalla (`T-034`) |
| `Ficha-codigo` | «Añadir otro código» con su botón «Escanear» (`T-034`) |

## Lo que se decidió al validarlo

1. El precio es del producto: todos sus códigos se venden igual.
2. Lo vendido sin escanear —tocado en la búsqueda— se descuenta del código más antiguo con unidades.
3. «Corregir el conteo» pide el código cuando el producto tiene más de uno.
4. Lo que ya existe se conserva: el código de cada producto pasa a ser su primer código.
5. «Ya lo vendo, cambió el código» va primero, para no crear duplicados por costumbre.
6. Vender abre vacía: sin «Más vendidos». Lo que no trae código se busca por nombre.
7. «Vaciar» sigue en rojo, no pregunta, y deja «Deshacer» diez segundos, como hoy.
