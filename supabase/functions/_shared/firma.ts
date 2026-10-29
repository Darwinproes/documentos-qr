import { Buffer } from "node:buffer";
import { SignPdf } from "npm:@signpdf/signpdf@3.3.0";
import { P12Signer } from "npm:@signpdf/signer-p12@3.3.0";
import { pdflibAddPlaceholder } from "npm:@signpdf/placeholder-pdf-lib@3.3.0";
import type { PDFDocument } from "npm:pdf-lib@1.17.1";

// Firma institucional (PAdES, adbe.pkcs7.detached): la hace el servidor en cada emisión.
// Adobe Reader recalcula la huella al abrir el PDF y avisa si se modificó después de firmarse.
export interface CredencialFirma {
  p12: Uint8Array;
  clave: string;
}

// Sin FIRMA_P12_BASE64 el PDF sale sin firma (pruebas locales). Si el secreto existe y la firma
// falla, la emisión falla: nunca se entrega en silencio un documento sin firmar.
export function cargarCredencialFirma(): CredencialFirma | null {
  // Los secretos se pegan desde archivos de texto: se descartan espacios y saltos de línea copiados de más.
  const base64 = Deno.env.get("FIRMA_P12_BASE64")?.replace(/\s+/g, "");
  if (!base64) return null;
  const binario = atob(base64);
  const p12 = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) p12[i] = binario.charCodeAt(i);
  return { p12, clave: (Deno.env.get("FIRMA_P12_CLAVE") ?? "").trim() };
}

export function agregarEspacioFirma(pdf: PDFDocument, orgNombre: string, dominioOficial: string) {
  pdflibAddPlaceholder({
    pdfDoc: pdf,
    reason: "Documento oficial emitido por el registro central",
    contactInfo: `https://${dominioOficial}/verificar`,
    name: orgNombre,
    location: "México",
  });
}

export async function firmarPdf(bytes: Uint8Array, credencial: CredencialFirma): Promise<Uint8Array> {
  const signer = new P12Signer(Buffer.from(credencial.p12), { passphrase: credencial.clave });
  const firmado = await new SignPdf().sign(Buffer.from(bytes), signer);
  return new Uint8Array(firmado);
}
