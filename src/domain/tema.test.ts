import { describe, expect, it } from "vitest";
import { atributosDeTema, leerTema, TEMAS } from "./tema";

describe("leerTema", () => {
  it("acepta los tres temas", () => {
    for (const t of TEMAS) expect(leerTema(t)).toBe(t);
  });

  it("sin cookie, manda el sistema", () => {
    // No elegir es una elección válida, y es la de fábrica.
    expect(leerTema(undefined)).toBe("sistema");
    expect(leerTema(null)).toBe("sistema");
    expect(leerTema("")).toBe("sistema");
  });

  it("una cookie con basura no tumba la aplicación", () => {
    expect(leerTema("neón")).toBe("sistema");
    expect(leerTema("<script>")).toBe("sistema");
  });

  it("tolera espacios alrededor", () => {
    expect(leerTema("  oscuro ")).toBe("oscuro");
  });
});

describe("atributosDeTema", () => {
  it("con el del sistema no pone atributo, para que mande prefers-color-scheme", () => {
    const a = atributosDeTema("sistema");
    expect(a["data-theme"]).toBeUndefined();
    expect(a.style.colorScheme).toBe("light dark");
  });

  it("fija el tema elegido y acompaña con color-scheme", () => {
    // Sin `color-scheme`, la barra de desplazamiento se queda en claro dentro de una pantalla
    // oscura y se nota.
    expect(atributosDeTema("oscuro")).toEqual({
      "data-theme": "dark",
      style: { colorScheme: "dark" },
    });
    expect(atributosDeTema("claro")).toEqual({
      "data-theme": "light",
      style: { colorScheme: "light" },
    });
  });
});
