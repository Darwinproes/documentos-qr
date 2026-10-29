import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.4";
import { fechaValida } from "./validacion.ts";
import { agregarEspacioFirma, firmarPdf, type CredencialFirma } from "./firma.ts";

export interface DatosPdf {
  orgNombre: string;
  tipoNombre: string;
  folio: string;
  destinatario: string;
  areaEmisora: string | null;
  campos: { clave: string; etiqueta: string; tipo: string }[];
  datos: Record<string, string>;
  emitidoEn: string;
  vigenteHasta: string | null;
  urlVerificacion: string;
  codigo: string;
  dominioOficial: string;
}

const TINTA = rgb(31 / 255, 42 / 255, 68 / 255);
const TEXTO = TINTA;
const TINTA_TENUE = rgb(86 / 255, 96 / 255, 107 / 255);
const TRAMA = rgb(157 / 255, 179 / 255, 168 / 255);
const SELLO_VERDE = rgb(23 / 255, 102 / 255, 58 / 255);
const BORDE = rgb(157 / 255, 179 / 255, 168 / 255);

function seguro(text: string): string {
  return text.replace(/[^\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

function fecha(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of seguro(text).split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let remaining = word;
      if (font.widthOfTextAtSize(remaining, size) > width) {
        if (line) { lines.push(line); line = ""; }
        let fragment = "";
        for (const character of remaining) {
          if (fragment && font.widthOfTextAtSize(fragment + character, size) > width) {
            lines.push(fragment);
            fragment = character;
          } else fragment += character;
        }
        remaining = fragment;
      }
      const candidate = line ? `${line} ${remaining}` : remaining;
      if (line && font.widthOfTextAtSize(candidate, size) > width) {
        lines.push(line);
        line = remaining;
      } else line = candidate;
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

function drawHeader(page: PDFPage, orgNombre: string, folio: string, bold: PDFFont) {
  const margin = 56;
  const folioLabel = `Folio: ${seguro(folio)}`;
  let orgY = 752;
  for (const row of wrap(orgNombre, bold, 9, 310)) {
    page.drawText(row, { x: margin, y: orgY, size: 9, font: bold, color: TINTA });
    orgY -= 12;
  }
  page.drawText(folioLabel, {
    x: 612 - margin - bold.widthOfTextAtSize(folioLabel, 9),
    y: 752,
    size: 9,
    font: bold,
    color: TINTA,
  });
  page.drawLine({ start: { x: margin, y: 740 }, end: { x: 612 - margin, y: 740 }, thickness: 1, color: TINTA });
  drawGuillocheBand(page, margin, 731, 612 - 2 * margin, 5, false, TRAMA);
}

function drawGuillocheMotif(page: PDFPage, x: number, y: number, length: number, thickness: number, vertical: boolean, color = TRAMA) {
  const points: { x: number; y: number }[] = [];
  const steps = 32;
  const R = 3, r = 1, d = 2.7;
  for (let i = 0; i <= steps; i++) {
    const t = 2 * Math.PI * i / steps;
    points.push({
      x: (R + r) * Math.cos(t) - d * Math.cos((R / r + 1) * t),
      y: (R + r) * Math.sin(t) - d * Math.sin((R / r + 1) * t),
    });
  }
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  const map = (point: { x: number; y: number }) => vertical
    ? { x: x + (point.y - minY) / (maxY - minY) * thickness, y: y + (point.x - minX) / (maxX - minX) * length }
    : { x: x + (point.x - minX) / (maxX - minX) * length, y: y + (point.y - minY) / (maxY - minY) * thickness };
  for (let i = 1; i < points.length; i++) {
    const start = map(points[i - 1]), end = map(points[i]);
    page.drawLine({ start, end, thickness: 0.35, color });
  }
}

function drawGuillocheBand(page: PDFPage, x: number, y: number, length: number, thickness: number, vertical: boolean, color = TRAMA) {
  const motifLength = 16;
  const count = Math.max(1, Math.floor(length / motifLength));
  const cellLength = length / count;
  for (let i = 0; i < count; i++) {
    if (vertical) drawGuillocheMotif(page, x, y + i * cellLength, cellLength, thickness, true, color);
    else drawGuillocheMotif(page, x + i * cellLength, y, cellLength, thickness, false, color);
  }
}

function drawGuillocheFrame(page: PDFPage, x: number, y: number, width: number, height: number) {
  const inset = 3;
  const thickness = 2.5;
  drawGuillocheBand(page, x + 7, y + height - inset - thickness, width - 14, thickness, false);
  drawGuillocheBand(page, x + 7, y + inset, width - 14, thickness, false);
  drawGuillocheBand(page, x + inset, y + 7, height - 14, thickness, true);
  drawGuillocheBand(page, x + width - inset - thickness, y + 7, height - 14, thickness, true);
}

function drawSeal(page: PDFPage, cx: number, cy: number, regular: PDFFont, bold: PDFFont) {
  const radius = 24;
  const innerRadius = 17.5;
  page.drawCircle({ x: cx, y: cy, size: radius, borderColor: SELLO_VERDE, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: innerRadius, borderColor: SELLO_VERDE, borderWidth: 0.35 });
  // Inscripción en sentido horario desde arriba, con la parte alta de las letras hacia fuera.
  // Cada carácter ocupa un arco proporcional a su ancho; el sobrante se reparte como espaciado.
  const inscription = "PROESA ELECTRÓNICA · REGISTRO CENTRAL DE DOCUMENTOS · ";
  const chars = Array.from(inscription);
  const baseline = innerRadius + 2;
  const circumference = 2 * Math.PI * baseline;
  const naturalWidth = (s: number) => chars.reduce((sum, c) => sum + regular.widthOfTextAtSize(c, s), 0);
  const size = Math.min(3.3, 3.3 * circumference * 0.92 / naturalWidth(3.3));
  const spacing = (circumference - naturalWidth(size)) / chars.length;
  let arc = 0;
  chars.forEach((character) => {
    const charWidth = regular.widthOfTextAtSize(character, size);
    const angle = Math.PI / 2 - (arc + charWidth / 2) / baseline;
    arc += charWidth + spacing;
    const rotation = angle - Math.PI / 2;
    page.drawText(character, {
      x: cx + baseline * Math.cos(angle) - (charWidth / 2) * Math.cos(rotation),
      y: cy + baseline * Math.sin(angle) - (charWidth / 2) * Math.sin(rotation),
      size,
      font: regular,
      color: SELLO_VERDE,
      rotate: degrees(rotation * 180 / Math.PI),
    });
  });
  const center = "PROESA";
  page.drawText(center, {
    x: cx - bold.widthOfTextAtSize(center, 5) / 2,
    y: cy - 2,
    size: 5,
    font: bold,
    color: SELLO_VERDE,
  });
}

async function cargarLogo(pdf: PDFDocument) {
  try {
    const bytes = await Deno.readFile(new URL("./assets/logo.png", import.meta.url));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export function textoPiePagina(folio: string, pagina: number, total: number, dominio: string): string {
  return `Folio ${folio} · Página ${pagina} de ${total} · Verificable en ${dominio}`;
}

export async function generarPdf(data: DatosPdf, credencial: CredencialFirma | null = null): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const courierBold = await pdf.embedFont(StandardFonts.CourierBold);
  pdf.setTitle(data.folio);
  pdf.setAuthor(data.orgNombre);
  pdf.setProducer("PROESA Documentos QR");
  pdf.setCreationDate(new Date(data.emitidoEn));

  const margin = 56;
  const contentWidth = 612 - margin * 2;
  const labelWidth = 150;
  const columnGap = 12;
  const valueWidth = contentWidth - labelWidth - columnGap;
  const bodyBottom = 44;
  const footerY = 22;
  const lineHeight = 15;
  const rowGap = 8;
  let page = pdf.addPage([612, 792]);
  let y = 712;

  const nextPage = () => {
    page = pdf.addPage([612, 792]);
    drawHeader(page, data.orgNombre, data.folio, bold);
    y = 718;
  };

  const logo = await cargarLogo(pdf);
  if (logo) {
    const height = 28;
    const width = Math.min(220, height * logo.width / logo.height);
    page.drawImage(logo, { x: margin, y: 748, width, height });
  } else {
    const orgLines = wrap(data.orgNombre, bold, 14, 330);
    let orgY = 750;
    for (const row of orgLines) {
      page.drawText(row, { x: margin, y: orgY, size: 14, font: bold, color: TINTA });
      orgY -= 18;
    }
  }
  const folioHeader = `Folio: ${seguro(data.folio)}`;
  page.drawText(folioHeader, {
    x: 612 - margin - bold.widthOfTextAtSize(folioHeader, 10),
    y: 750,
    size: 10,
    font: bold,
    color: TINTA,
  });
  page.drawLine({ start: { x: margin, y: 736 }, end: { x: 612 - margin, y: 736 }, thickness: 1.5, color: TINTA });
  drawGuillocheBand(page, margin, 728, contentWidth, 5, false, TRAMA);

  page.drawText("Tipo de documento", { x: margin, y: 710, size: 9, font: bold, color: TINTA_TENUE });
  let titleY = 684;
  for (const row of wrap(data.tipoNombre, bold, 18, contentWidth)) {
    page.drawText(row, {
      x: margin + (contentWidth - bold.widthOfTextAtSize(row, 18)) / 2,
      y: titleY,
      size: 18,
      font: bold,
      color: TINTA,
    });
    titleY -= 22;
  }
  y = titleY - 12;

  const drawRow = (label: string, value: string) => {
    const labels = wrap(label, bold, 9, labelWidth);
    const values = wrap(value || "—", regular, 11, valueWidth);
    const rows = Math.max(labels.length, values.length);
    for (let index = 0; index < rows; index++) {
      if (y < bodyBottom) nextPage();
      if (labels[index]) page.drawText(labels[index], { x: margin, y, size: 9, font: bold, color: TINTA_TENUE });
      if (values[index]) page.drawText(values[index], { x: margin + labelWidth + columnGap, y, size: 11, font: regular, color: TEXTO });
      y -= lineHeight;
    }
    y -= rowGap;
  };

  drawRow("Destinatario", data.destinatario);
  for (const campo of data.campos) {
    const value = data.datos[campo.clave];
    if (value === undefined || value === null || value === "") continue;
    const display = campo.tipo === "fecha" && fechaValida(value) ? fecha(`${value}T12:00:00`) : String(value);
    drawRow(campo.etiqueta, display);
  }
  drawRow("Área emisora", data.areaEmisora?.trim() || "—");
  drawRow("Fecha de emisión", fecha(data.emitidoEn));
  drawRow("Vigencia", data.vigenteHasta ? fecha(`${data.vigenteHasta}T12:00:00`) : "Sin vencimiento");

  const qr = QRCode.create(data.urlVerificacion, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const qrSize = 120;
  const moduleSize = qrSize / (moduleCount + quietZone * 2);
  const blockY = 44;
  const blockHeight = 190;
  if (y < blockY + blockHeight + 20) nextPage();
  page.drawRectangle({ x: margin, y: blockY, width: contentWidth, height: blockHeight, borderWidth: 1, borderColor: BORDE });
  drawGuillocheFrame(page, margin, blockY, contentWidth, blockHeight);
  page.drawText("VERIFICACIÓN DE AUTENTICIDAD", { x: margin + 12, y: blockY + blockHeight - 18, size: 9, font: bold, color: SELLO_VERDE });

  const qx = margin + 12;
  const qy = blockY + 24;
  page.drawRectangle({ x: qx, y: qy, width: qrSize, height: qrSize, color: rgb(1, 1, 1) });
  for (let row = 0; row < moduleCount; row++) for (let col = 0; col < moduleCount; col++) {
    if (qr.modules.get(row, col)) {
      page.drawRectangle({
        x: qx + (col + quietZone) * moduleSize,
        y: qy + (moduleCount + quietZone - row - 1) * moduleSize,
        width: moduleSize + 0.1,
        height: moduleSize + 0.1,
        color: rgb(0, 0, 0),
      });
    }
  }

  const sealCenterX = qx + qrSize + 27;
  drawSeal(page, sealCenterX, qy + qrSize / 2, regular, bold);
  const textX = qx + qrSize + 56;
  const textWidth = contentWidth - qrSize - 68;
  let textY = blockY + blockHeight - 38;
  const verificationLines: [string, PDFFont, number][] = [
    ["Verifique la autenticidad escaneando el código QR o entrando a:", regular, 8.5],
    [`${data.dominioOficial}/verificar`, regular, 8.5],
    [`Folio: ${data.folio}`, bold, 10],
    [`Código: ${data.codigo}`, courierBold, 12],
    [`Este documento solo es válido si la verificación se hace en ${data.dominioOficial}.`, regular, 8.5],
  ];
  if (credencial) {
    verificationLines.push(["Firmado digitalmente por PROESA. Adobe Acrobat Reader avisa si el archivo se modificó.", bold, 7.5]);
  }
  for (const [value, font, size] of verificationLines) {
    for (const row of wrap(value, font, size, textWidth)) {
      page.drawText(row, { x: textX, y: textY, size, font, color: TEXTO });
      textY -= size + 4;
    }
  }

  const pages = pdf.getPages();
  const totalPages = pages.length;
  pages.forEach((pdfPage, index) => {
    const footer = seguro(textoPiePagina(data.folio, index + 1, totalPages, data.dominioOficial));
    const size = 8;
    const securityText = `PROESA ELECTRÓNICA REGISTRO CENTRAL ${data.folio}`;
    let microtext = securityText;
    const separator = " · ";
    while (regular.widthOfTextAtSize(`${microtext}${separator}${securityText}`, 3.25) <= contentWidth) {
      microtext = `${microtext}${separator}${securityText}`;
    }
    pdfPage.drawText(microtext, {
      x: margin + (contentWidth - regular.widthOfTextAtSize(microtext, 3.25)) / 2,
      y: 31,
      size: 3.25,
      font: regular,
      color: TRAMA,
    });
    pdfPage.drawText(footer, {
      x: (612 - regular.widthOfTextAtSize(footer, size)) / 2,
      y: footerY - 6,
      size,
      font: regular,
      color: TINTA_TENUE,
    });
  });

  if (!credencial) return await pdf.save();
  agregarEspacioFirma(pdf, data.orgNombre, data.dominioOficial);
  return await firmarPdf(await pdf.save({ useObjectStreams: false }), credencial);
}
