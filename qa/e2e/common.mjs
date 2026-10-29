import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
export const QA_ROOT = path.resolve(here, '..');
export const OUTPUT = path.join(QA_ROOT, 'salida');

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

function findChrome() {
  if (process.env.QA_CHROME_PATH) return process.env.QA_CHROME_PATH;
  if (process.platform === 'win32') {
    const candidate = process.env.PROGRAMFILES
      ? path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe')
      : undefined;
    return candidate && existsSync(candidate) ? candidate : undefined;
  }
  return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((candidate) => {
    return existsSync(candidate);
  });
}

export async function openBrowser(options = {}) {
  const executablePath = findChrome();
  if (!executablePath) throw new Error('No se encontró Chrome. Define QA_CHROME_PATH con la ruta del ejecutable.');
  const browser = await chromium.launch({ headless: options.headless ?? true, executablePath, args: ['--no-sandbox'] });
  return browser;
}

export async function ensureOutput() {
  await fs.mkdir(path.join(OUTPUT, 'capturas'), { recursive: true });
}

export async function screenshot(page, name) {
  await ensureOutput();
  await page.screenshot({ path: path.join(OUTPUT, 'capturas', name), fullPage: true });
}

export async function runCases(cases, options = {}) {
  const results = [];
  let browser;
  try {
    browser = await openBrowser(options);
    for (const item of cases) {
      const started = Date.now();
      try {
        await item.run(browser);
        results.push({ caso: item.id, resultado: 'OK', ms: Date.now() - started });
      } catch (error) {
        results.push({ caso: item.id, resultado: 'FALLA', ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
      }
    }
  } finally {
    await browser?.close();
  }
  console.log('caso | resultado | ms');
  for (const item of results) console.log(`${item.caso} | ${item.resultado}${item.error ? ` — ${item.error}` : ''} | ${item.ms}`);
  if (results.some((item) => item.resultado === 'FALLA')) process.exitCode = 1;
  return results;
}

export async function iniciarSesion(page, baseUrl, email, password, { esperarSesion = true } = {}) {
  await page.goto(`${baseUrl}/panel/login`);
  await page.getByRole('textbox', { name: /correo electrónico institucional/i }).fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  if (!esperarSesion) return;
  // supabase-js guarda la sesión de forma asíncrona: si la prueba navega con page.goto antes,
  // la recarga no encuentra sesión y el panel regresa al login.
  await page.waitForURL((url) => !url.pathname.endsWith('/panel/login'));
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')));
}
