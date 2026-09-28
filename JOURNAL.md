# Journal

> Append-only, newest last. Exactly one line per closed task, seven pipe-separated fields:
> `date | task-id | state | outcome | N files | checks result | decisions`. Shape in `docs/sdd/TEMPLATES.md`.

2026-09-06 | T-001 | done | andamiaje y esquema de nueve tablas aplicado contra Neon | 30 files | test 7/7, e2e 2/2, db:verify 5/5 | D-001,D-002,D-003,D-006,D-008
2026-09-06 | T-002 | done | sesión de dueño con correo y contraseña, guardia donde se leen los datos | 14 files | test 11/11, e2e 10/10 | D-001,D-008
2026-09-06 | T-003 | done | catálogo con alta que escribe el libro y saldo recomputado | 11 files | test 24/24, e2e 18/18 | D-002,D-003
2026-09-08 | T-016 | done | objetivo de escaneo con cámara, lector y tecleado, y alta desde código desconocido | 23 files | test 65/65, e2e 80/80 | D-009
2026-09-08 | T-015 | done | instalable en pantalla de inicio, con iconos generados de los tokens | 10 files | test 65/65, e2e 80/80 | D-009
2026-09-08 | T-004 | done | registro de venta desde la cuadrícula de frecuentes | 18 files | test 30/30, e2e 25/25, db:verify 5/5 | D-001,D-002,D-005,D-006
2026-09-08 | T-005 | done | filtros y recorrido por partes del catálogo | 16 files | test 42/42, e2e 34/34, db:verify 5/5 | D-001,D-003,D-007
2026-09-08 | T-006 | done | componentes compartidos de interfaz | 17 files | test 42/42, e2e 35/35 | D-003,D-007
2026-09-08 | T-007 | done | tema claro, oscuro o el del sistema | 14 files | test 48/48, e2e 42/42 | D-007
2026-09-08 | T-008 | done | tailwind sin css a mano donde no hace falta | 19 files | test 48/48, e2e 44/44 | D-003,D-007
2026-09-08 | T-010 | done | superficies y bordes que de verdad se distingan | 11 files | test 48/48, e2e 47/47 | D-007
2026-09-08 | T-011 | done | historial de movimientos por producto y ajuste de existencias | 14 files | test 48/48, e2e 53/53, db:verify 5/5 | D-002,D-001
2026-09-08 | T-012 | done | editar y desactivar productos, con rastro de lo que cambió | 20 files | test 49/49, e2e 58/58, db:verify 5/5 | D-002,D-003
2026-09-08 | T-013 | done | la ficha del producto informa antes de dejar editar | 7 files | test 49/49, e2e 61/61 | D-007
2026-09-08 | T-014 | done | historial de ventas, con detalle y anulación | 17 files | test 49/49, e2e 70/70, db:verify 5/5 | D-002,D-001
2026-09-13 | T-017 | done | buscar un producto por nombre o código durante la venta | 9 files | test 65/65, e2e 87/87 tras T-018 y T-019 | D-001,D-009
2026-09-13 | T-018 | done | la prueba del saldo negativo deja de depender de la cuadrícula | 4 files | test 65/65, e2e 86/86 en dos pasadas | D-006
2026-09-13 | T-019 | done | el día de una venta lo decide el negocio, no el servidor | 11 files | test 69/69, e2e 87/87, también con TZ=Asia/Tokyo y TZ=UTC | D-005
2026-09-13 | T-020 | done | la paleta se declara una vez y los temas solo eligen cuál rige | 4 files | test 69/69, e2e 87/87 | D-005,D-007
2026-09-13 | T-021 | done | jerarquía por tamaño en la cuadrícula y suelo tipográfico con prueba | 8 files | test 69/69, e2e 89/89 | D-007
2026-09-14 | T-022 | done | iconos que acompañan a la palabra, con el peso del paquete medido | 11 files | test 69/69, e2e 92/92 | D-003,D-007
2026-09-14 | T-023 | done | identidad, paleta invertida y jerarquía en la venta, con la barra acotada | 14 files | test 69/69, e2e 92/92 | D-007,D-009
2026-09-24 | T-025 | done | la barra de la venta deja holgura a la cuadrícula, medida y no supuesta | 3 files | test 69/69, e2e 92/92 | D-007
2026-09-24 | T-026 | done | total y botón apilados: ninguno empuja al otro fuera de la barra | 2 files | test 69/69, e2e 93/93 | D-007
2026-09-24 | T-027 | done | la columna de computador tiene tope y el total queda a la vista | 2 files | test 69/69, e2e 94/94 | D-007
2026-09-25 | T-028 | done | resumen del día y del rango desde ventasPorDia, por reponer y deshacerVenta compartida con la anulación | 13 files | test 71/71, e2e 95/95 | D-001,D-002,D-006
2026-09-25 | T-029 | done | Cobalto, Inicio como portada, venta recogida con Deshacer y Vaciar, formularios sin select | 73 files | test 71/71, e2e 106/106 | D-001,D-003,D-009
2026-09-25 | T-030 | done | la prueba del decodificador no depende de la red | 5 files | test 69/69, e2e 94/94 | D-005,D-006
2026-09-25 | T-031 | done | un Worker por negocio en Cloudflare, con pg por petición sobre Hyperdrive; Tienda Miriam desplegada | 18 files | test 71/71, e2e 106/106 Node, 105/106 Workers | D-001,D-005,D-009
2026-09-27 | T-032 | done | varios códigos por producto con su cantidad; código desconocido: añadirlo a uno existente o darlo de alta; migración 0004 probada sobre datos del esquema anterior | 76 files, junto a T-033 y T-034 | test 96/96, e2e 115/115 (Postgres local) | D-002,D-010
2026-09-27 | T-033 | done | Vender abre vacía y enseña solo la venta; Vaciar en rojo con Deshacer | en el commit de T-032 | test 96/96, e2e 115/115 (Postgres local) | D-009
2026-09-27 | T-034 | done | la cámara en un visor al centro; Escanear en computador y en la ficha; enfoque continuo, 2× y tocar para enfocar según la cámara | en el commit de T-032 | test 96/96, e2e 115/115 (Postgres local) | D-009,D-010
2026-09-27 | T-035 | done | anular en palabras de tienda; el negocio se ve como Lumy Bella | 9 files | test 96/96, e2e ventas y venta 26/26 | D-005
2026-09-27 | T-036 | done | «volver» vuelve a donde se estaba; la sesión se lee una vez por petición; sin refrescos de más en Vender | 17 files | test 103/103, e2e 123/123 (Postgres local) | D-011
2026-09-27 | T-037 | done | ventas y anulaciones simultáneas sin pisarse; Ventas abre en hoy y va de 7 en 7 días; cabeceras de seguridad; límite de intentos en la base | 16 files | test 103/103, e2e 130/130 Node y 130/130 Workers | D-002,D-008,D-011
