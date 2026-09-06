# Agent Model Configuration

This file defines which AI model fills each SDD role. Copy this template into your project and fill in the model assignments.

Model assignment is project-specific configuration. Role definitions live in `docs/sdd/ROLES.md`.

---

## Active Configuration: Testing

Hoy un solo agente ocupa los siete roles. Registrarlo así no es una aspiración: es lo que de hecho
ocurre, y lo que hace visible el riesgo de más abajo.

| Role | Agent | Model | Notes |
|---|---|---|---|
| Planner | Claude Code | claude-opus-5 | |
| Frontend Implementer | Claude Code | claude-opus-5 | |
| Backend Implementer | Claude Code | claude-opus-5 | |
| Tester | Claude Code | claude-opus-5 | Escribe las pruebas de `D-006` |
| Reviewer | Claude Code | claude-opus-5 | **Revisa su propio código.** Ver Known Risks |
| Release Engineer | Claude Code | claude-opus-5 | Corre los comandos de `quality-gates.md` |
| UX/Motion Designer | Claude Code | claude-opus-5 | Trabaja contra `design-handoff.md` |

Validación humana (perfil `team`): Juan Sebastián León Velásquez. No es un rol de agente y no se
delega — es la única firma que cierra una tarea (`quality-gates.md` § Manual Validation).

---

## Target Configuration: Production

**Sin decidir.** Falta evidencia: no hay todavía una sola tarea cerrada de la que sacar dónde falla
este reparto.

El criterio para decidirlo, cuando haya: separar los roles que exigen juicio y contexto — Planner,
Reviewer, UX — de los mecánicos, que ejecutan comandos ya escritos — Tester, Release Engineer. Lo
que decide el reparto no es el costo por token: es si el Reviewer puede ser el mismo que implementó.

| Role | Agent | Model | Notes |
|---|---|---|---|
| Planner | <!-- agent --> | <!-- model --> | |
| Frontend Implementer | <!-- agent --> | <!-- model --> | |
| Backend Implementer | <!-- agent --> | <!-- model --> | |
| Tester | <!-- agent --> | <!-- model --> | |
| Reviewer | <!-- agent --> | <!-- model --> | |
| Release Engineer | <!-- agent --> | <!-- model --> | |
| UX/Motion Designer | <!-- agent --> | <!-- model --> | |

---

## Rationale for Assignments

- **Un solo modelo hoy** porque el proyecto arranca de cero y el costo de coordinar familias de
  agentes distintas supera lo que aporta, con cero tareas cerradas.
- **La validación no se delega.** El perfil `team` exige un validador humano nombrado, y el criterio
  de éxito del brief se mide con el pulgar en un celular, no leyendo un diff
  (`brief.md` § Success Measures).

---

## Known Risks

- **El Reviewer es el Implementer.** Un agente que revisa su propio código no encuentra lo que no vio
  al escribirlo. Es el riesgo dominante de esta configuración, y hoy lo compensan tres cosas fuera
  del modelo: el gate de aceptación final, la prueba de extremo a extremo de `D-006` — que un
  hallazgo omitido no puede hacer pasar — y la validación humana.
- **El mismo modelo escribe la prueba y el código que la pasa.** Una prueba puede nacer estrechada a
  la implementación. Por eso `quality-gates.md` exige además una comprobación que ejercite el cambio
  *junto a lo que ya existe*, que no se puede aprobar estrechándola.
- **Un solo proveedor.** Si el modelo no está disponible, no hay reparto alternativo escrito.

---

## References

- `docs/sdd/ROLES.md` — role definitions
- `docs/project/quality-gates.md` — commands used by Tester and Release Engineer
- `docs/project/design-handoff.md` — primary source for UX/Motion Designer
- `docs/decisions/` — record model assignment decisions as their own file
