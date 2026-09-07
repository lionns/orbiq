import { uuidv7 } from "uuidv7";

/**
 * Identificadores de negocio: ordenados en el tiempo y no secuenciales (`D-002`).
 *
 * Ordenados para no degradar los índices; no secuenciales para poder fusionar bases más adelante
 * sin renumerar, y para no filtrar el volumen del negocio.
 *
 * No sirve para identificar una sesión: eso necesita ser impredecible, y un UUIDv7 lleva su marca
 * de tiempo a la vista. Better Auth lo genera aparte (`data-model.md` § session).
 */
export function nuevoId(): string {
  return uuidv7();
}
