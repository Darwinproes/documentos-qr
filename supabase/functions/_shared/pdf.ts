import { PDFDocument, StandardFonts, rgb, type PDFFont } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.4";
import { fechaValida } from "./validacion.ts";

export interface DatosPdf {
  orgNombre: string;
  tipoNombre: string;
  folio: string;
  destinatario: string;
  campos: { clave: string; etiqueta: string; tipo: string }[];
  datos: Record<string, string>;
  emitidoEn: string;
  vigenteHasta: string | null;
  urlVerificacion: string;
  codigo: string;
  dominioOficial: string;
}

function seguro(text: string): string { return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?"); }
function fecha(value: string): string {
  const d = new Date(value);
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of seguro(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    else lines.push("");
  }
  return lines.length ? lines : [""];
}

export async function generarPdf(data: DatosPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(data.folio); pdf.setAuthor(data.orgNombre); pdf.setProducer("PROESA Documentos QR");
  pdf.setCreationDate(new Date(data.emitidoEn));
  let page = pdf.addPage([612, 792]);
  const margin = 56, bottom = 48, width = 612 - margin * 2;
  let y = 736;
  const addPage = () => { page = pdf.addPage([612, 792]); y = 736; };
  const line = (text: string, font = regular, size = 11, indent = 0) => {
    for (const row of wrap(text, font, size, width - indent)) {
      if (y < bottom) addPage();
      page.drawText(row, { x: margin + indent, y, size, font, color: rgb(0.12, 0.16, 0.22) }); y -= size + 6;
    }
  };
  line(data.orgNombre, bold, 14);
  page.drawLine({ start: { x: margin, y: y + 1 }, end: { x: 612 - margin, y: y + 1 }, thickness: 1, color: rgb(0.1, 0.3, 0.5) });
  y -= 20;
  const folioText = `Folio: ${data.folio}`;
  page.drawText(folioText, { x: 612 - margin - bold.widthOfTextAtSize(folioText, 10), y, size: 10, font: bold }); y -= 38;
  for (const row of wrap(data.tipoNombre, bold, 18, width)) {
    page.drawText(row, { x: margin + (width - bold.widthOfTextAtSize(row, 18)) / 2, y, size: 18, font: bold }); y -= 25;
  }
  y -= 14;
  line("Destinatario:", bold, 11); line(data.destinatario, regular, 12); y -= 8;
  for (const campo of data.campos) {
    const value = data.datos[campo.clave];
    if (value === undefined || value === null || value === "") continue;
    const display = campo.tipo === "fecha" && fechaValida(value) ? fecha(`${value}T12:00:00`) : String(value);
    line(`${campo.etiqueta}: ${display}`, regular, 11);
  }
  y -= 12;
  line(`Emitido el ${fecha(data.emitidoEn)}`, regular, 10);
  line(data.vigenteHasta ? `Vigente hasta ${fecha(`${data.vigenteHasta}T12:00:00`)}` : "Sin vencimiento", regular, 10);
  const qr = QRCode.create(data.urlVerificacion, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const qrSize = 110, moduleSize = qrSize / (moduleCount + quietZone * 2);
  const blockHeight = 150;
  if (y - blockHeight < bottom) addPage();
  const boxY = bottom;
  page.drawRectangle({ x: margin, y: boxY, width, height: blockHeight, borderWidth: 1, borderColor: rgb(0.5, 0.58, 0.66) });
  const qx = margin + 12, qy = boxY + 20;
  page.drawRectangle({ x: qx, y: qy, width: qrSize, height: qrSize, color: rgb(1, 1, 1) });
  for (let row = 0; row < moduleCount; row++) for (let col = 0; col < moduleCount; col++) {
    if (qr.modules.get(row, col)) page.drawRectangle({ x: qx + (col + quietZone) * moduleSize, y: qy + (moduleCount + quietZone - row - 1) * moduleSize, width: moduleSize + 0.1, height: moduleSize + 0.1, color: rgb(0, 0, 0) });
  }
  const tx = qx + qrSize + 14, tw = width - qrSize - 38;
  let ty = boxY + blockHeight - 22;
  const textLines: [string, PDFFont, number][] = [
    ["Verifique la autenticidad escaneando el código QR o entrando a:", regular, 8.5],
    [`${data.dominioOficial}/verificar`, regular, 8.5],
    [`Folio: ${data.folio}`, bold, 9],
    [`Código: ${data.codigo}`, bold, 9],
    [`Este documento solo es válido si se verifica en ${data.dominioOficial}.`, regular, 8.5],
  ];
  for (const [part, font, size] of textLines) for (const row of wrap(part, font, size, tw)) {
    page.drawText(row, { x: tx, y: ty, size, font }); ty -= size + 3;
  }
  return await pdf.save();
}
