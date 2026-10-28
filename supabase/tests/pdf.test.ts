import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { generarPdf, textoPiePagina, type DatosPdf } from "../functions/_shared/pdf.ts";
function assert(condition: unknown, message = "Aserción fallida"): asserts condition { if (!condition) throw new Error(message); }

function fixture(long = false): DatosPdf {
  const campos: DatosPdf["campos"] = long
    ? [
      { clave: "concepto", etiqueta: "Concepto", tipo: "texto_largo" },
      { clave: "actividad", etiqueta: "Actividad", tipo: "texto_largo" },
      { clave: "observaciones", etiqueta: "Observaciones", tipo: "texto_largo" },
    ]
    : [{ clave: "concepto", etiqueta: "Concepto", tipo: "texto" }];
  const datos: Record<string, string> = {};
  if (long) {
    datos.concepto = "áñ " + "texto largo ".repeat(130);
    datos.actividad = "actividad extensa ".repeat(75);
    datos.observaciones = "observación extensa ".repeat(70);
  } else datos.concepto = "Capacitación de soldadura";
  return {
    orgNombre: "PROESA Electrónica", tipoNombre: "Constancia de capacitación", folio: "CONST-2026-000001",
    destinatario: "José Muñoz Peña", areaEmisora: "Recursos Humanos", campos, datos,
    emitidoEn: "2026-10-28T17:03:11.123Z", vigenteHasta: "2027-10-28",
    urlVerificacion: "https://documentos-qr.onrender.com/v/Abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", codigo: "7KQ2M-XA9PD",
    dominioOficial: "documentos-qr.onrender.com",
  };
}

Deno.test("genera un PDF con metadatos, área emisora, acentos y sin logo", async () => {
  const bytes = await generarPdf(fixture());
  const loaded = await PDFDocument.load(bytes);
  assert(loaded.getTitle() === "CONST-2026-000001");
  assert(loaded.getPageCount() === 1);
  await Deno.mkdir("supabase/tests/salida", { recursive: true });
  await Deno.writeFile("supabase/tests/salida/ejemplo.pdf", bytes);
});

Deno.test("divide contenido largo en varias páginas", async () => {
  const loaded = await PDFDocument.load(await generarPdf(fixture(true)));
  assert(loaded.getPageCount() === 3, `Se esperaban 3 páginas y se generaron ${loaded.getPageCount()}`);
  assert(textoPiePagina("CONST-2026-000001", 3, 3, "documentos-qr.onrender.com") ===
    "Folio CONST-2026-000001 · Página 3 de 3 · Verificable en documentos-qr.onrender.com");
  await Deno.writeFile("supabase/tests/salida/ejemplo-largo.pdf", await generarPdf(fixture(true)));
});
