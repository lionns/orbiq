# Funciones de dominio

Toda regla de negocio vive aquí. Nada en esta carpeta importa de `next/*` (`D-001`, `AC-X03`).

Una función de dominio se invoca igual desde una pantalla, una ruta HTTP o un job. Escribir lógica
de negocio dentro de un handler es un hallazgo de review, no un atajo.

Consultan la base directamente por Drizzle: sin puertos, sin repositorios, sin adaptadores
(`D-003`). Una abstracción se introduce cuando aparece el tercer caso real que la necesita.
