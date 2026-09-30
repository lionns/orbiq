import { describe, expect, it } from "vitest";
import { enHojas } from "./etiquetas";
import { hojaEnPdf } from "./hoja-pdf";

const texto = (b: Uint8Array) => String.fromCharCode(...b);
const etiqueta = { id: "pan", nombre: "Pan francés — “rico”", precio: 500, codigo: "2000000000008" };

describe("la hoja de etiquetas en PDF", () => {
  const pdf = texto(hojaEnPdf(enHojas([etiqueta], [{ id: "pan", copias: 32 }])));

  it("es un PDF con una página carta por hoja: 32 etiquetas, dos páginas", () => {
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("/Count 2");
    expect(pdf.match(/\/MediaBox \[0 0 612 792\]/g)).toHaveLength(2);
  });

  it("la tabla xref apunta a cada objeto: un lector de PDF lo abre sin repararlo", () => {
    const inicio = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(inicio, inicio + 4)).toBe("xref");
    const entradas = [...pdf.slice(inicio).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    entradas.forEach((desplazamiento, i) => {
      expect(pdf.slice(desplazamiento, desplazamiento + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`));
    });
  });

  it("escribe tildes, rayas y comillas en WinAnsi, no como «?»", () => {
    expect(pdf).toContain("(Pan franc\xe9s \x97 \x93rico\x94)");
  });

  it("cada texto reinicia el espaciado de letras: el de los dígitos no se pega al nombre", () => {
    const bloques = pdf.match(/BT \/F2 8 Tf [^T]*Tc/g) ?? [];
    expect(bloques.length).toBeGreaterThan(0);
    for (const b of bloques) expect(b).toContain(" 0 Tc");
  });

  it("un nombre que no cabe se recorta con «…»", () => {
    const largo = texto(
      hojaEnPdf(enHojas([{ ...etiqueta, nombre: "Queso campesino de la finca con un nombre larguísimo" }], [{ id: "pan", copias: 1 }])),
    );
    expect(largo).toMatch(/\(Queso campesino[^)]*\x85\)/);
  });
});
