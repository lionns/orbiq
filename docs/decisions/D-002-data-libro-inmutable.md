# D-002 — Base relacional gestionada, existencias como libro inmutable

- Status: accepted
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: data

## Context

El modelo de datos es lo que decide hasta dónde puede crecer Orbiq sin migrar lo ya escrito. Un
inventario que guarda un número mutable no admite después devoluciones, traslados ni compras a
proveedor sin reescribir su historia; uno que guarda movimientos las admite como filas nuevas. Y
son datos de un negocio real: perderlos mata el producto, así que los respaldos no pueden depender
de que alguien se acuerde.

## Decision

Base de datos relacional gestionada, con respaldos automáticos a cargo del proveedor. Existencias
como libro inmutable de movimientos más saldo materializado recomputable. Identificadores generados
en la aplicación, ordenados en el tiempo y no secuenciales. Migraciones de esquema versionadas y
aplicadas por el proyecto desde la tarea uno.

## Consequences

- Toda capacidad futura de existencias — devoluciones, traslados, multi-bodega, consignación — se
  añade como un tipo de movimiento, sin tocar lo ya registrado.
- Si el saldo se corrompe, se reconstruye desde el libro. Las correcciones son movimientos nuevos.
- Identificadores no secuenciales permiten fusionar o repartir bases más adelante sin renumerar, y
  no filtran el volumen del negocio. Ordenados en el tiempo, no degradan los índices.
- El motor concreto y la librería de acceso quedan **sin decidir** aquí; se documentan en
  `docs/project/architecture.md` § Stack y § Data.

## References

- `docs/project/brief.md` § Objective
- Patrón de libro de inventario: https://usersolutions.com/blog/what-is-an-inventory-ledger
