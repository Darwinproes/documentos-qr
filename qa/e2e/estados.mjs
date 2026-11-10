import fs from 'node:fs/promises';
import path from 'node:path';
import { iniciarSesion, openBrowser, OUTPUT, requiredEnv } from './common.mjs';

const baseUrl = process.env.QA_PANEL_URL || 'http://127.0.0.1:4173';
const password = requiredEnv('QA_CLAVE');
const widths = [1440, 360];
const outRoot = path.join(OUTPUT, 'estados');
const browser = await openBrowser();

async function capture(page, width, name) {
  const directory = path.join(outRoot, String(width));
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
}

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/panel/login`);
    await capture(page, width, 'login-vacio');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await capture(page, width, 'login-con-error');
    await iniciarSesion(page, baseUrl, 'admin@proesa.test', password);

    await page.goto(`${baseUrl}/panel`);
    await page.getByRole('heading', { name: /documentos emitidos/i }).waitFor();
    await capture(page, width, 'lista-normal');
    await page.getByRole('searchbox', { name: /buscar por folio o destinatario/i }).fill('zzzz-sin-resultados');
    await page.getByRole('button', { name: /^buscar$/i }).click();
    await page.getByText(/zzzz-sin-resultados/i).waitFor();
    await capture(page, width, 'lista-vacia');

    await page.goto(`${baseUrl}/panel/documentos/00000000-0000-4000-8000-000000000102`);
    await page.getByRole('heading', { name: /CONST-2026-000002/i }).waitFor();
    await capture(page, width, 'detalle');
    await page.getByRole('button', { name: /cancelar documento/i }).click();
    await capture(page, width, 'modal-cancelar');
    await page.getByRole('button', { name: /confirmar cancelación/i }).click();
    await capture(page, width, 'modal-cancelar-error');
    await page.keyboard.press('Escape');

    await page.goto(`${baseUrl}/panel/emitir`);
    await capture(page, width, 'emitir-paso-1');
    await page.getByRole('button', { name: /continuar a captura de datos/i }).click();
    await capture(page, width, 'emitir-paso-2');
    await page.getByRole('button', { name: /revisar y confirmar/i }).click();
    await capture(page, width, 'emitir-paso-2-errores');
    await page.getByRole('textbox', { name: /destinatario/i }).fill('Persona de prueba QA');
    await page.getByRole('textbox', { name: /concepto/i }).fill('Captura automatizada');
    await page.getByRole('button', { name: /revisar y confirmar/i }).click();
    await capture(page, width, 'emitir-paso-3');
    await page.getByRole('button', { name: /^emitir$/i }).click();
    await page.getByText(/documento emitido correctamente/i).waitFor();
    await capture(page, width, 'emitir-paso-4');

    await page.goto(`${baseUrl}/panel/tipos`);
    await capture(page, width, 'tipos-lista');
    await page.getByRole('button', { name: /nuevo tipo de documento/i }).click();
    await capture(page, width, 'tipos-nuevo');
    await page.getByLabel(/clave única/i).fill('clave inválida');
    await page.getByRole('button', { name: /guardar tipo de documento/i }).click();
    await capture(page, width, 'tipos-nuevo-error');

    await page.goto(`${baseUrl}/panel/usuarios`);
    await capture(page, width, 'usuarios-normal');
    await page.getByRole('combobox', { name: /rol de emilio emisor/i }).selectOption('admin');
    await capture(page, width, 'usuarios-sin-guardar');

    if (width < 768) {
      await page.getByRole('button', { name: /menú/i }).click();
      await capture(page, width, 'menu-movil-abierto');
    }
    await context.close();

    const consulta = await browser.newPage({ viewport: { width, height: 900 } });
    await iniciarSesion(consulta, baseUrl, 'consulta@proesa.test', password);
    await consulta.goto(`${baseUrl}/panel`);
    await consulta.getByRole('heading', { name: /documentos emitidos/i }).waitFor();
    await capture(consulta, width, 'rol-consulta');
    await consulta.close();
  }
} finally {
  await browser.close();
}
console.log(`Capturas de estados guardadas en ${outRoot}`);
