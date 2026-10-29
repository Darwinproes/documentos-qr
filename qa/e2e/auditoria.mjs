import fs from 'node:fs/promises';
import path from 'node:path';
import { iniciarSesion, openBrowser, OUTPUT, requiredEnv, screenshot } from './common.mjs';

const baseUrl = process.env.QA_PANEL_URL || 'http://127.0.0.1:4173';
const password = requiredEnv('QA_CLAVE');
const token = process.env.QA_TOKEN || 'Qm9EjemploTokenValidoDe43CaracteresExactos1';
const viewports = [360, 768, 1440];
const screens = [
  { name: 'verificar', path: '/verificar', public: true },
  { name: 'token', path: `/v/${token}`, public: true },
  { name: 'panel-documentos', path: '/panel' },
  { name: 'panel-emision', path: '/panel/emitir' },
  { name: 'panel-detalle', path: '/panel/documentos/00000000-0000-4000-8000-000000000101' },
  { name: 'panel-tipos', path: '/panel/tipos' },
  { name: 'panel-usuarios', path: '/panel/usuarios' },
];
const browser = await openBrowser();
const results = [];

try {
  for (const width of viewports) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    let consoleErrors = [];
    let httpErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 400) httpErrors.push({ status: response.status(), url: response.url() }); });

    const auditScreen = async (screen) => {
      consoleErrors = [];
      httpErrors = [];
      await page.goto(`${baseUrl}${screen.path}`);
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);
      const metrics = await page.evaluate(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')].filter(visible);
        const smallTargets = controls.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44
            ? [{ tag: element.tagName.toLowerCase(), name: element.getAttribute('aria-label') || element.innerText?.trim() || element.getAttribute('placeholder') || '', width: Math.round(rect.width), height: Math.round(rect.height) }]
            : [];
        });
        const unnamed = controls.flatMap((element) => {
          const name = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title') || element.innerText?.trim() || element.getAttribute('alt') || element.getAttribute('placeholder');
          return name ? [] : [{ tag: element.tagName.toLowerCase(), role: element.getAttribute('role') }];
        });
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const smallText = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent?.trim()) continue;
          const parent = node.parentElement;
          if (!parent || !visible(parent) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
          const fontSize = parseFloat(getComputedStyle(parent).fontSize);
          if (fontSize < 12) smallText.push({ text: node.textContent.trim().slice(0, 70), fontSize });
        }
        const bodyText = document.body.innerText || '';
        return {
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          controlsUnder44: smallTargets,
          buttonsWithoutName: unnamed,
          textUnder12: smallText,
          emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(bodyText),
          atkinsonLoaded: document.fonts.check('16px "Atkinson Hyperlegible"'),
        };
      });
      const filename = `${screen.name}-${width}.png`;
      await screenshot(page, filename);
      results.push({ pantalla: screen.name, ancho: width, ...metrics, erroresConsola: [...consoleErrors], respuestasHttpError: [...httpErrors] });
    };

    await auditScreen({ name: 'panel-login', path: '/panel/login' });
    await iniciarSesion(page, baseUrl, 'admin@proesa.test', password);
    await page.getByRole('heading', { name: /documentos emitidos/i }).waitFor();
    for (const screen of screens) await auditScreen(screen);
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.mkdir(OUTPUT, { recursive: true });
const reportPath = path.join(OUTPUT, 'reporte.json');
await fs.writeFile(reportPath, `${JSON.stringify({ generado_en: new Date().toISOString(), resultados: results }, null, 2)}\n`, 'utf8');
console.log('pantalla | ancho | scroll | controles <44 | sin nombre | texto <12 | emoji | Atkinson | errores consola | HTTP >=400');
for (const row of results) console.log(`${row.pantalla} | ${row.ancho} | ${row.scrollWidth > row.viewportWidth ? 'SÍ' : 'no'} | ${row.controlsUnder44.length} | ${row.buttonsWithoutName.length} | ${row.textUnder12.length} | ${row.emoji ? 'sí' : 'no'} | ${row.atkinsonLoaded ? 'sí' : 'no'} | ${row.erroresConsola.length} | ${row.respuestasHttpError.length}`);
console.log(`Reporte: ${reportPath}`);
