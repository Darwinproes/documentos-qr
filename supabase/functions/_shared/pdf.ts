import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { fechaValida } from "./validacion.ts";
import { agregarEspacioFirma, firmarPdf, type CredencialFirma } from "./firma.ts";
import { EMBLEMA_PNG_BASE64 } from "./emblema.ts";

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

const TINTA = rgb(9 / 255, 30 / 255, 62 / 255);
const TEXTO = rgb(31 / 255, 41 / 255, 51 / 255);
const TINTA_TENUE = rgb(82 / 255, 96 / 255, 109 / 255);
const MICRO = rgb(154 / 255, 165 / 255, 177 / 255);

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

function dibujarEncabezado(
  page: PDFPage,
  data: Pick<DatosPdf, "orgNombre" | "folio">,
  fuentes: { bold: PDFFont; regular: PDFFont },
  logo: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  opciones: { principal: boolean },
) {
  const margin = 56;
  const { bold, regular } = fuentes;
  const principal = opciones.principal;
  const logoWidth = principal ? 30 : 23;
  const logoHeight = principal ? 47 : 36;
  const textX = margin + (principal ? 39 : 31);
  const titleY = principal ? 767 : 762;
  const titleSize = principal ? 14 : 11;
  const subtitleY = principal ? 750 : 748;
  const subtitleSize = principal ? 9 : 8;
  const folioSize = principal ? 10 : 9;
  const folioY = principal ? 750 : 752;
  const lineY = principal ? 737 : 738;
  const folioLabel = `Folio: ${seguro(data.folio)}`;
  page.drawImage(logo, { x: margin, y: principal ? 741 : 744, width: logoWidth, height: logoHeight });
  page.drawText("PROESA Electrónica", { x: textX, y: titleY, size: titleSize, font: bold, color: TINTA });
  page.drawText("Registro de documentos oficiales", { x: textX, y: subtitleY, size: subtitleSize, font: regular, color: TINTA_TENUE });
  page.drawText(folioLabel, {
    x: 612 - margin - bold.widthOfTextAtSize(folioLabel, folioSize),
    y: folioY,
    size: folioSize,
    font: bold,
    color: TINTA,
  });
  page.drawLine({ start: { x: margin, y: lineY }, end: { x: 612 - margin, y: lineY }, thickness: 0.75, color: TINTA });
  page.drawLine({ start: { x: margin, y: lineY - 3 }, end: { x: 612 - margin, y: lineY - 3 }, thickness: 0.75, color: TINTA });
}

async function cargarLogo(pdf: PDFDocument) {
  const binary = atob(EMBLEMA_PNG_BASE64);
  return await pdf.embedPng(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

export function textoPiePagina(folio: string, pagina: number, total: number, dominio: string): string {
  return `Folio ${folio} · Página ${pagina} de ${total} · Verificable en ${dominio}`;
}

export async function generarPdf(data: DatosPdf, credencial: CredencialFirma | null = null): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);
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
  const logo = await cargarLogo(pdf);

  const nextPage = () => {
    page = pdf.addPage([612, 792]);
    dibujarEncabezado(page, data, { bold, regular }, logo, { principal: false });
    y = 718;
  };

  dibujarEncabezado(page, data, { bold, regular }, logo, { principal: true });

  page.drawText("Tipo de documento", { x: margin, y: 710, size: 9, font: bold, color: TINTA_TENUE });
  let titleY = 684;
  for (const row of wrap(data.tipoNombre, titleFont, 18, contentWidth)) {
    page.drawText(row, {
      x: margin + (contentWidth - titleFont.widthOfTextAtSize(row, 18)) / 2,
      y: titleY,
      size: 18,
      font: titleFont,
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
  page.drawRectangle({ x: margin, y: blockY, width: contentWidth, height: blockHeight, borderWidth: 1, borderColor: TINTA });
  page.drawText("Verificación de autenticidad", { x: margin + 12, y: blockY + blockHeight - 24, size: 13, font: titleFont, color: TINTA });

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

  const textX = qx + qrSize + 16;
  const textWidth = contentWidth - qrSize - 40;
  let textY = blockY + blockHeight - 38;
  const verificationLines: [string, PDFFont, number][] = [
    ["Verifique escaneando el código QR o entrando a:", regular, 8.5],
    [`${data.dominioOficial}/verificar`, courierBold, 8.5],
    [`Folio: ${data.folio}`, courierBold, 9],
    [`Código: ${data.codigo}`, courierBold, 11],
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
      color: MICRO,
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
