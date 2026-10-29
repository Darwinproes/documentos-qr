import { PDFDocument } from "npm:pdf-lib@1.17.1";
import forge from "npm:node-forge@1.4.2";
import { generarPdf, textoPiePagina, type DatosPdf } from "../functions/_shared/pdf.ts";
import type { CredencialFirma } from "../functions/_shared/firma.ts";
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

// Certificado desechable creado en cada corrida: ninguna llave de prueba vive en el repositorio.
function credencialDePrueba(clave = "clave-de-prueba"): CredencialFirma {
  const llaves = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = llaves.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const nombre = [{ name: "commonName", value: "Prueba PROESA" }];
  cert.setSubject(nombre);
  cert.setIssuer(nombre);
  cert.sign(llaves.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(llaves.privateKey, [cert], clave, { algorithm: "aes256" });
  return { p12: forge.util.binary.raw.decode(forge.asn1.toDer(p12).getBytes()), clave };
}

// Lo mismo que hace Adobe Reader: huella de los rangos firmados contra la firma incrustada.
async function revisarFirma(bytes: Uint8Array) {
  const texto = new TextDecoder("latin1").decode(bytes);
  const rango = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(texto);
  if (!rango) return { firmado: false, huellaCoincide: false, firmaValida: false };
  const [a, b, c, d] = rango.slice(1).map(Number);
  const firmados = new Uint8Array(b + d);
  firmados.set(bytes.subarray(a, a + b));
  firmados.set(bytes.subarray(c, c + d), b);
  const huella = new Uint8Array(await crypto.subtle.digest("SHA-256", firmados));
  const der = forge.util.hexToBytes(texto.slice(a + b + 1, c - 1));
  // deno-lint-ignore no-explicit-any
  const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der, { parseAllBytes: false })) as any;
  const atributos = p7.rawCapture.authenticatedAttributes as forge.asn1.Asn1[];
  const digestFirmado = atributos
    .map((attr) => attr.value as forge.asn1.Asn1[])
    .find((attr) => forge.asn1.derToOid(attr[0].value as string) === forge.pki.oids.messageDigest)!;
  const digest = ((digestFirmado[1].value as forge.asn1.Asn1[])[0].value) as string;
  const huellaCoincide = digest === String.fromCharCode(...huella);
  const conjunto = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, atributos);
  const md = forge.md.sha256.create();
  md.update(forge.asn1.toDer(conjunto).getBytes());
  const publica = p7.certificates[0].publicKey as forge.pki.rsa.PublicKey;
  return { firmado: true, huellaCoincide, firmaValida: publica.verify(md.digest().getBytes(), p7.rawCapture.signature) };
}

Deno.test("firma el PDF y la firma corresponde al contenido", async () => {
  const bytes = await generarPdf(fixture(), credencialDePrueba());
  const revision = await revisarFirma(bytes);
  assert(revision.firmado && revision.huellaCoincide && revision.firmaValida, `Firma inválida: ${JSON.stringify(revision)}`);
  assert((await PDFDocument.load(bytes)).getPageCount() === 1);
  await Deno.mkdir("supabase/tests/salida", { recursive: true });
  await Deno.writeFile("supabase/tests/salida/ejemplo-firmado.pdf", bytes);
});

Deno.test("la firma delata un cambio de un solo byte después de firmar", async () => {
  const bytes = await generarPdf(fixture(), credencialDePrueba());
  const alterado = bytes.slice();
  alterado[200] ^= 0x01;
  const revision = await revisarFirma(alterado);
  assert(revision.firmado && !revision.huellaCoincide, "Un PDF alterado no debe coincidir con su firma");
});

Deno.test("sin credencial el PDF sale sin firma y con contraseña incorrecta la emisión falla", async () => {
  assert(!(await revisarFirma(await generarPdf(fixture()))).firmado);
  const credencial = credencialDePrueba();
  let fallo = false;
  try { await generarPdf(fixture(), { ...credencial, clave: "otra-clave" }); } catch { fallo = true; }
  assert(fallo, "Con la contraseña equivocada no debe generarse un PDF");
});

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
