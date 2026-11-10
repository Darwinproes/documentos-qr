import fs from 'node:fs/promises';
import path from 'node:path';
import { iniciarSesion, OUTPUT, requiredEnv, runCases, screenshot } from './common.mjs';

const baseUrl = process.env.QA_PANEL_URL || 'http://127.0.0.1:4173';
const password = requiredEnv('QA_CLAVE');
const token = process.env.QA_TOKEN || 'Qm9EjemploTokenValidoDe43CaracteresExactos1';
const viewports = [360, 768, 1440];
const screens = [
  { name: 'verificar', path: '/verificar' },
  { name: 'token', path: `/v/${token}` },
  { name: 'panel-documentos', path: '/panel' },
  { name: 'panel-emision', path: '/panel/emitir' },
  { name: 'panel-detalle', path: '/panel/documentos/00000000-0000-4000-8000-000000000101' },
  { name: 'panel-tipos', path: '/panel/tipos' },
  { name: 'panel-usuarios', path: '/panel/usuarios' },
];
const results = [];

const cases = viewports.map((width) => ({
  id: `Auditoría ${width}px`,
  run: async (browser) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
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
          const controlsUnder44 = controls.flatMap((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44
              ? [{ tag: element.tagName.toLowerCase(), name: element.getAttribute('aria-label') || element.innerText?.trim() || element.getAttribute('placeholder') || '', width: Math.round(rect.width), height: Math.round(rect.height) }]
              : [];
          });
          const buttonsWithoutName = controls.flatMap((element) => {
            const name = element.labels?.[0]?.innerText?.trim() || element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title') || element.innerText?.trim() || element.getAttribute('alt') || element.getAttribute('placeholder');
            return name ? [] : [{ tag: element.tagName.toLowerCase(), role: element.getAttribute('role') }];
          });
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const textUnder12 = [];
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!node.textContent?.trim()) continue;
            const parent = node.parentElement;
            if (!parent || !visible(parent) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
            const fontSize = parseFloat(getComputedStyle(parent).fontSize);
            if (fontSize < 12) textUnder12.push({ text: node.textContent.trim().slice(0, 70), fontSize });
          }
          const bodyText = document.body.innerText || '';
          const tableContainers = [...document.querySelectorAll('table, [role="table"]')].flatMap((table) => [table, table.parentElement].filter(Boolean));
          const internalHorizontalScroll = [...new Set(tableContainers)].filter(visible).flatMap((element) => element.scrollWidth > element.clientWidth + 1
            ? [{ tag: element.tagName.toLowerCase(), className: String(element.className || '').slice(0, 80), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }]
            : []);
          const identifiersSplit = [...document.querySelectorAll('body *')].filter((element) => {
            if (!visible(element) || element.children.length) return false;
            const text = element.textContent?.trim() || '';
            if (!/^(?:[A-Z0-9]{2,10}-\d{4}-\d{6}|[A-Z0-9]{5}-[A-Z0-9]{5})$/.test(text)) return false;
            const range = document.createRange();
            range.selectNodeContents(element);
            return range.getClientRects().length > 1;
          }).map((element) => element.textContent.trim());
          const visiblePanelText = [...document.querySelectorAll('body *')].filter((element) => visible(element) && !element.children.length).map((element) => element.textContent || '').join(' ');
          const isoDates = [...new Set(visiblePanelText.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])];
          const oversizedSelectionControls = [...document.querySelectorAll('input[type="checkbox"], input[type="radio"]')].filter(visible).flatMap((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 28 || rect.height > 28 ? [{ type: element.type, width: Math.round(rect.width), height: Math.round(rect.height) }] : [];
          });
          return {
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            controlsUnder44,
            buttonsWithoutName,
            textUnder12,
            emoji: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(bodyText),
            sourceSans3Loaded: document.fonts.check('16px "Source Sans 3"'),
            sourceSerif4Loaded: document.fonts.check('16px "Source Serif 4"'),
            internalHorizontalScroll,
            identifiersSplit,
            isoDates,
            oversizedSelectionControls,
          };
        });
        await screenshot(page, `${screen.name}-${width}.png`);
        results.push({ pantalla: screen.name, ancho: width, ...metrics, erroresConsola: [...consoleErrors], respuestasHttpError: [...httpErrors] });
      };

      await auditScreen({ name: 'panel-login', path: '/panel/login' });
      await iniciarSesion(page, baseUrl, 'admin@proesa.test', password);
      await page.getByRole('heading', { name: /documentos emitidos/i }).waitFor();
      for (const screen of screens) await auditScreen(screen);
    } finally {
      await context.close();
    }
  },
}));

await runCases(cases, {
  onFinish: async () => {
    await fs.mkdir(OUTPUT, { recursive: true });
    const reportPath = path.join(OUTPUT, 'reporte.json');
    await fs.writeFile(reportPath, `${JSON.stringify({ generado_en: new Date().toISOString(), resultados: results }, null, 2)}\n`, 'utf8');
    console.log('pantalla | ancho | scroll | overflow interno | controles <44 | sin nombre | texto <12 | ISO | folios/códigos partidos | selección >28 | Source Sans 3 | Source Serif 4 | errores consola | HTTP >=400');
    for (const row of results) console.log(`${row.pantalla} | ${row.ancho} | ${row.scrollWidth > row.viewportWidth ? 'SÍ' : 'no'} | ${row.internalHorizontalScroll.length} | ${row.controlsUnder44.length} | ${row.buttonsWithoutName.length} | ${row.textUnder12.length} | ${row.isoDates.length} | ${row.identifiersSplit.length} | ${row.oversizedSelectionControls.length} | ${row.sourceSans3Loaded ? 'sí' : 'no'} | ${row.sourceSerif4Loaded ? 'sí' : 'no'} | ${row.erroresConsola.length} | ${row.respuestasHttpError.length}`);
    console.log(`Reporte: ${reportPath}`);
  },
});
