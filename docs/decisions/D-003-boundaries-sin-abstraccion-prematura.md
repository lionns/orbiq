# D-003 — Las abstracciones se extraen de casos, no se diseñan por adelantado

- Status: accepted
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: boundaries
- Trigger: el tercer caso real de un mismo patrón — un segundo motor de datos, o un tercer módulo
  de negocio con cliente que lo pague

## Context

Orbiq apunta a ser modular: catálogo, ventas, contenido, canales. Un sistema de módulos que aguante
eso se diseña bien cuando ya se conocen tres módulos reales y qué tienen en común. Diseñado con uno,
codifica las particularidades de ese uno y hay que rehacerlo cuando llega el segundo — que es el
momento en que además ya hay código que respeta la forma equivocada.

## Decision

Una sola aplicación sin capa de puertos, sin registro de módulos y sin adaptadores. Las funciones
de dominio consultan la base directamente. Una abstracción se introduce cuando aparece el tercer
caso real que la necesita, y se extrae del código que ya funciona.

## Consequences

- El sistema de módulos llega cuando haya evidencia de qué forma debe tener, en vez de una apuesta.
- Menos indirección mientras tanto: leer una pantalla y su consulta es un salto, no cuatro.
- Cambiar de motor de datos costaría reescribir consultas. Con una base es aceptable, y el
  `Trigger` dice cuándo deja de serlo.
- Es una regla de trabajo, no solo una elección técnica: una abstracción introducida antes de su
  tercer caso es un hallazgo de review.

## References

- `docs/project/brief.md` § Objective
