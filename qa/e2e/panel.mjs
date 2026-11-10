import assert from 'node:assert/strict';
import { iniciarSesion, requiredEnv, runCases } from './common.mjs';

const baseUrl = process.env.QA_PANEL_URL || 'http://127.0.0.1:4173';
const password = requiredEnv('QA_CLAVE');
const accounts = {
  admin: 'admin@proesa.test',
  emisor: 'emisor@proesa.test',
  consulta: 'consulta@proesa.test',
  inactivo: 'inactivo@proesa.test',
};
const cases = [];
const test = (name, run) => cases.push({ id: name, run });
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

test('login vacío marca ambos campos y enlaza los errores', async (browser) => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/panel/login`);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  for (const id of ['login-correo', 'login-contrasena']) {
    const field = page.locator(`#${id}`);
    assert.equal(await field.getAttribute('aria-invalid'), 'true');
    assert.ok(await field.getAttribute('aria-describedby'));
  }
  assert.equal(await page.locator('#login-error-summary').evaluate((element) => element === document.activeElement), true);
});

test('emisión vacía resume todos los campos requeridos y enfoca el resumen', async (browser) => {
  const page = await adminPage(browser, '/panel/emitir');
  await page.getByRole('button', { name: /continuar a captura de datos/i }).click();
  await page.getByRole('button', { name: /revisar y confirmar/i }).click();
  const summary = page.locator('.error-summary');
  await summary.waitFor();
  assert.match(await summary.innerText(), /destinatario/i);
  assert.match(await summary.innerText(), /concepto/i);
  assert.equal(await summary.evaluate((element) => element === document.activeElement), true);
});

test('clave inválida de tipo muestra error junto al campo', async (browser) => {
  const page = await adminPage(browser, '/panel/tipos');
  await page.getByRole('button', { name: /nuevo tipo de documento/i }).click();
  await page.getByLabel(/clave única/i).fill('A');
  await page.getByRole('button', { name: /guardar tipo de documento/i }).click();
  const key = page.locator('#tipo-clave');
  assert.equal(await key.getAttribute('aria-invalid'), 'true');
  assert.ok(await key.getAttribute('aria-describedby'));
});

test('modal de cancelación marca la confirmación cuando falta', async (browser) => {
  const page = await adminPage(browser, '/panel/documentos/00000000-0000-4000-8000-000000000101');
  await page.getByRole('button', { name: /cancelar documento/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /motivo de la cancelación/i }).fill('Motivo válido para la prueba.');
  await dialog.getByRole('button', { name: /confirmar cancelación/i }).click();
  const checkbox = dialog.getByRole('checkbox');
  assert.equal(await checkbox.getAttribute('aria-invalid'), 'true');
  assert.ok(await checkbox.getAttribute('aria-describedby'));
});

test('tipos en 360 px muestran tarjetas y acciones dentro de pantalla', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await iniciarSesion(page, baseUrl, accounts.admin, password);
  await page.goto(`${baseUrl}/panel/tipos`);
  await page.locator('.mobile-tipo-card').first().waitFor();
  assert.ok(await page.locator('.mobile-tipo-card').count() >= 5);
  const outside = await page.locator('.mobile-tipo-card button').evaluateAll((buttons) => buttons.filter((button) => button.getBoundingClientRect().right > 360).length);
  assert.equal(outside, 0, 'Editar y Desactivar deben caber en 360 px');
});

test('filtros móviles se pliegan y el primer documento aparece pronto', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
  await iniciarSesion(page, baseUrl, accounts.admin, password);
  await page.goto(`${baseUrl}/panel`);
  const firstDocument = page.locator('a[href^="/panel/documentos/"]').first();
  assert.ok((await firstDocument.boundingBox()).y < 780);
  const toggle = page.getByRole('button', { name: /^filtros/i });
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  await page.getByLabel('Estado').waitFor();
  await page.getByLabel(/tipo de documento/i).waitFor();
});

test('placeholders del panel empiezan con Ej. o están vacíos', async (browser) => {
  const page = await adminPage(browser, '/panel/tipos');
  await page.getByRole('button', { name: /nuevo tipo de documento/i }).click();
  const invalid = await page.locator('input[placeholder], textarea[placeholder]').evaluateAll((fields) => fields.map((field) => field.getAttribute('placeholder')).filter((placeholder) => placeholder && !placeholder.startsWith('Ej.')));
  assert.deepEqual(invalid, []);
});

test('tipo activo usa un interruptor accesible', async (browser) => {
  const page = await adminPage(browser, '/panel/tipos');
  await page.getByRole('button', { name: /nuevo tipo de documento/i }).click();
  await page.getByRole('switch', { name: /disponibilidad/i }).waitFor();
});

test('lista vacía ofrece una sola acción y repite la búsqueda', async (browser) => {
  const page = await adminPage(browser);
  await page.getByRole('searchbox', { name: /buscar por folio o destinatario/i }).fill('zzzz-sin-resultados');
  await page.getByRole('button', { name: /^buscar$/i }).click();
  await page.getByText(/zzzz-sin-resultados/i).waitFor();
  assert.equal(await page.getByRole('button', { name: /limpiar filtros|restablecer búsqueda/i }).count(), 1);
});

test('emblema y resultado público identifican al destinatario sin canvas', async (browser) => {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/`);
  assert.ok(await page.locator('img[src*="emblema-proesa"]').count());
  await page.goto(`${baseUrl}/v/Qm9EjemploTokenValidoDe43CaracteresExactos1`);
  await page.getByText(/a nombre de/i).waitFor();
  await page.getByText(/María Fernanda Gómez Hernández/i).first().waitFor();
  assert.equal(await page.locator('canvas').count(), 0);
});

test('admin busca, filtra y pagina documentos', async (browser) => {
  const page = await adminPage(browser);
  const search = page.getByRole('searchbox', { name: /buscar por folio o destinatario/i });
  await search.fill('María');
  await page.getByRole('button', { name: /^buscar$/i }).click();
  await page.getByText(/María Fernanda Gómez Hernández/i).first().waitFor();
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
  await page.getByRole('heading', { name: /^panel interno/i }).waitFor();
});

await runCases(cases);
