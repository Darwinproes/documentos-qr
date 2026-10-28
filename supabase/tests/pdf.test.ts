import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { generarPdf } from "../functions/_shared/pdf.ts";
function assert(condition: unknown, message = "Aserción fallida"): asserts condition { if (!condition) throw new Error(message); }

const fixture = (long = false) => ({
  orgNombre: "PROESA Electrónica", tipoNombre: "Constancia de capacitación", folio: "CONST-2026-000001",
  destinatario: "José Muñoz Peña", campos: [{ clave: "concepto", etiqueta: "Concepto", tipo: "texto" }],
  datos: { concepto: long ? "áñ " + "texto largo ".repeat(300) : "Capacitación de soldadura" },
  emitidoEn: "2026-10-28T17:03:11.123Z", vigenteHasta: "2027-10-28",
  urlVerificacion: "https://documentos-qr.onrender.com/v/Abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG", codigo: "7KQ2M-XA9PD",
  dominioOficial: "documentos-qr.onrender.com",
});

Deno.test("genera un PDF con metadatos, QR y caracteres del español", async () => {
  const bytes = await generarPdf(fixture());
  const loaded = await PDFDocument.load(bytes);
  assert(loaded.getTitle() === "CONST-2026-000001");
  assert(loaded.getPageCount() === 1);
  await Deno.mkdir("supabase/tests/salida", { recursive: true });
  await Deno.writeFile("supabase/tests/salida/ejemplo.pdf", bytes);
});

Deno.test("divide contenido largo en varias páginas", async () => {
  const loaded = await PDFDocument.load(await generarPdf(fixture(true)));
  assert(loaded.getPageCount() > 1);
});
