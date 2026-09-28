import { headers } from "next/headers";
import { cache } from "react";
import { sesionActual } from "@/domain/session";

/**
 * La sesión de esta petición, leída una sola vez (`T-036`). El marco protegido y la página la
 * piden los dos; sin `cache`, cada uno la buscaba en la base por su cuenta: dos viajes a Neon en
 * cada pantalla por la misma fila. Medido: Inicio y Ajustes hacían cuatro consultas de sesión.
 *
 * `cache` de React dura lo que dura la petición, así que no mezcla sesiones de dos personas ni
 * guarda una sesión cerrada. Las acciones de servidor siguen leyéndola con `sesionActual`: cada
 * una es su propia petición y la lee una vez.
 */
export const sesionDeLaPeticion = cache(async () => sesionActual(await headers()));
