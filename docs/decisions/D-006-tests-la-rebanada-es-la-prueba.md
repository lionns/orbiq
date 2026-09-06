# D-006 — Cada rebanada llega con una prueba que la atraviesa

- Status: accepted
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: tests

## Context

Un producto que va a crecer durante años necesita poder cambiar sin romperse, y eso lo dan las
pruebas que ejercitan lo que una persona realmente hace. Una suite que solo prueba el servidor
puede estar entera en verde mientras la aplicación no funciona: comprueba que las piezas se
comportan, no que exista una pantalla que las use.

## Decision

Pruebas rápidas para las funciones de dominio — existencias, anulación, idempotencia de la venta —
y al menos una prueba por rebanada que recorra pantalla, servidor y base con datos reales. Ninguna
tarea llega a `done` sin esa prueba de extremo a extremo.

## Consequences

- Cada rebanada entregada queda protegida para siempre: al llegar la pantalla número cuarenta, las
  treinta y nueve anteriores siguen verificándose solas.
- Las funciones de dominio de `D-001` se prueban sin navegador ni servidor, así que la suite rápida
  cubre las reglas y la lenta cubre los recorridos.
- Una tarea no puede entregar solo servidor: sin pantalla no hay prueba, y sin prueba no hay cierre.
- Cuesta mantener un entorno con navegador y base, más lento que una prueba unitaria.
- Los ejecutores concretos y sus comandos viven en `docs/project/quality-gates.md`, que es lo que el
  harness invoca verbatim.

## References

- `docs/project/quality-gates.md`
- `docs/project/brief.md` § Success Measures
