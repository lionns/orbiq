import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth atiende sus propias rutas bajo /api/auth. No escribimos ninguna a mano (D-008).
export const { GET, POST } = toNextJsHandler(auth);
