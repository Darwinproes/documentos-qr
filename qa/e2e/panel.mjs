import assert from 'node:assert/strict';
import { iniciarSesion, openBrowser, requiredEnv } from './common.mjs';

const baseUrl = process.env.QA_PANEL_URL || 'http://127.0.0.1:4173';
const password = requiredEnv('QA_CLAVE');
const accounts = {
  admin: 'admin@proesa.test',
  emisor: 'emisor@proesa.test',
  consulta: 'consulta@proesa.test',
  inactivo: 'inactivo@proesa.test',
};
const cases = [];
const test = (name, run) => cases.push({ name, run });
async function adminPage(browser, path = '/panel') {
  const page = await browser.newPage();
  await iniciarSesion(page, baseUrl, accounts.admin, password);
  await page.waitForURL('**/panel');
  if (path !== '/panel') await page.goto(`${baseUrl}${path}`);
  return page;
}

test('login correcto de administrador', async (browser) => {
  const page = await browser.newPage();
  await iniciarSesion(page, baseUrl, accounts.admin, password);
  await page.getByRole('heading', { name: /documentos emitidos/i }).waitFor();
});

test('login incorrecto muestra un error accesible', async (browser) => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/panel/login`);
  await page.getByRole('textbox', { name: /correo electrónico institucional/i }).fill(accounts.admin);
  await page.getByLabel('Contraseña').fill(`${password}-incorrecta`);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.getByRole('alert').getByText(/correo electrónico o contraseña incorrectos/i).waitFor();
});

test('admin busca, filtra y pagina documentos', async (browser) => {
  const page = await adminPage(browser);
  const search = page.getByRole('searchbox', { name: /buscar por folio o destinatario/i });
  await search.fill('María');
  await page.getByRole('button', { name: /^buscar$/i }).click();
  await page.getByText(/María Fernanda Gómez Hernández/i).waitFor();
  await page.getByLabel('Estado').selectOption('cancelado');
  await page.getByText(/cancelado/i).first().waitFor();
  await page.getByLabel('Estado').selectOption('');
  // La búsqueda «María» deja una sola página; se limpia antes de paginar los 30 documentos.
  await page.getByRole('button', { name: /limpiar filtros/i }).first().click();
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByText(/página 2/i).waitFor();
});

test('detalle y descarga de PDF firmado', async (browser) => {
  const page = await adminPage(browser);
  await page.locator('a[href^="/panel/documentos/"]').first().click();
  await page.getByRole('heading', { name: /CONST-(2026|2025)-\d{6}/i }).waitFor();
  await page.getByRole('heading', { name: /bitácora de auditoría/i }).waitFor();
  const [downloadPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: /descargar pdf/i }).click(),
  ]);
  // La pestaña nace en about:blank y luego navega al enlace firmado.
  await downloadPage.waitForURL(/storage\/v1\/object\/sign\/documentos/);
});

test('modal de cancelación accesible y validación de motivo', async (browser) => {
  const page = await adminPage(browser);
  await page.goto(`${baseUrl}/panel/documentos/00000000-0000-4000-8000-000000000101`);
  await page.getByRole('button', { name: /cancelar documento/i }).click();
  let dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const reason = dialog.getByRole('textbox', { name: /motivo de la cancelación/i });
  await reason.focus();
  await page.keyboard.press('Shift+Tab');
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  assert.match(focused, /confirmar cancelación/i, 'Shift+Tab debe permanecer dentro del modal');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /cancelar documento/i }).click();
  dialog = page.getByRole('dialog');
  const reasonAgain = dialog.getByRole('textbox', { name: /motivo de la cancelación/i });
  await reasonAgain.fill('abc');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: /confirmar cancelación/i }).click();
  await dialog.waitFor();
  await reasonAgain.fill('Error en el destinatario durante la captura.');
  await dialog.getByRole('button', { name: /confirmar cancelación/i }).click();
  await page.getByText(/cancelado/i).first().waitFor();
});

test('flujo de emisión de cuatro pasos y controles Copiar', async (browser) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await iniciarSesion(page, baseUrl, accounts.admin, password);
  await page.goto(`${baseUrl}/panel/emitir`);
  await page.getByRole('button', { name: /continuar a captura de datos/i }).click();
  await page.getByRole('textbox', { name: /destinatario/i }).fill('José Muñoz Peña de prueba');
  await page.getByRole('textbox', { name: /concepto/i }).fill('Evaluación automatizada');
  await page.getByRole('button', { name: /revisar y confirmar/i }).click();
  await page.getByRole('button', { name: /^emitir$/i }).click();
  await page.getByText(/documento emitido correctamente/i).waitFor();
  const copyButtons = page.getByRole('button', { name: /^copiar$/i });
  await copyButtons.first().click();
  await copyButtons.nth(1).click();
  await page.getByRole('button', { name: /copiar enlace/i }).click();
  assert.match(await page.locator('.credentials-highlight-grid').innerText(), /QA|CONST-2026/);
  await context.close();
});

test('admin crea un tipo nuevo y agrega un campo', async (browser) => {
  const page = await adminPage(browser, '/panel/tipos');
  await page.getByRole('button', { name: /nuevo tipo de documento/i }).click();
  await page.getByLabel(/clave única/i).fill('QA01');
  await page.getByLabel(/nombre del tipo de documento/i).fill('Tipo de QA automatizada');
  await page.getByRole('button', { name: /agregar campo/i }).click();
  await page.getByLabel('Clave *').fill('campo_qa');
  await page.getByLabel(/etiqueta visible/i).fill('Dato de prueba');
  await page.getByRole('button', { name: /guardar tipo de documento/i }).click();
  await page.getByText(/Tipo de documento "QA01" creado correctamente/i).waitFor();
  await page.getByRole('cell', { name: /Tipo de QA automatizada/i }).waitFor();
});

test('admin actualiza el usuario emisor', async (browser) => {
  const page = await adminPage(browser, '/panel/usuarios');
  const role = page.getByRole('combobox', { name: /rol de emilio emisor/i });
  await role.selectOption('admin');
  await page.getByRole('row', { name: /Emilio Emisor/i }).getByRole('button', { name: /guardar/i }).click();
  await page.getByRole('status').getByText(/actualizado correctamente/i).waitFor();
  await role.selectOption('emisor');
  await page.getByRole('row', { name: /Emilio Emisor/i }).getByRole('button', { name: /guardar/i }).click();
  await page.getByRole('status').getByText(/actualizado correctamente/i).waitFor();
});

test('emisor puede emitir pero no administrar tipos', async (browser) => {
  const page = await browser.newPage();
  await iniciarSesion(page, baseUrl, accounts.emisor, password);
  await page.goto(`${baseUrl}/panel`);
  await page.getByRole('link', { name: /emitir documento/i }).waitFor();
  await page.goto(`${baseUrl}/panel/tipos`);
  await page.getByRole('heading', { name: /acceso restringido/i }).waitFor();
});

test('consulta no puede emitir', async (browser) => {
  const page = await browser.newPage();
  await iniciarSesion(page, baseUrl, accounts.consulta, password);
  await page.goto(`${baseUrl}/panel`);
  assert.equal(await page.getByRole('link', { name: /emitir documento/i }).count(), 0);
  await page.goto(`${baseUrl}/panel/emitir`);
  await page.getByRole('heading', { name: /acceso restringido/i }).waitFor();
});

test('usuario inactivo no entra al panel', async (browser) => {
  const page = await browser.newPage();
  await iniciarSesion(page, baseUrl, accounts.inactivo, password, { esperarSesion: false });
  await page.getByRole('alert').getByText(/usuario no está habilitado/i).waitFor();
});

test('cerrar sesión regresa al login', async (browser) => {
  const page = await adminPage(browser);
  await page.getByRole('button', { name: /cerrar sesión/i }).click();
  await page.getByRole('heading', { name: /panel interno de documentos/i }).waitFor();
});

const browser = await openBrowser();
const results = [];
try {
  for (const item of cases) {
    const started = Date.now();
    try { await item.run(browser); results.push({ caso: item.name, estado: 'OK', ms: Date.now() - started }); }
    catch (error) { results.push({ caso: item.name, estado: 'FALLA', ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) }); }
  }
} finally { await browser.close(); }
console.log('caso | resultado | ms');
for (const row of results) console.log(`${row.caso} | ${row.estado}${row.error ? ` — ${row.error}` : ''} | ${row.ms}`);
if (results.some((row) => row.estado === 'FALLA')) process.exitCode = 1;
