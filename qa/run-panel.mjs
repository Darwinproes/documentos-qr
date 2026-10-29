import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(qaRoot, '..');
const webRoot = path.join(root, 'web');
const outputRoot = path.join(qaRoot, 'salida');
const dist = path.join(outputRoot, 'dist');
const supabaseUrl = 'http://127.0.0.1:54399';
const webPort = Number(process.env.QA_WEB_PORT || 4173);
const qaPort = Number(process.env.QA_PORT || 54399);
if (!process.env.QA_CLAVE) throw new Error('Define QA_CLAVE en el entorno; no la escribas en archivos del repositorio.');
if (!path.resolve(dist).startsWith(path.resolve(outputRoot) + path.sep)) throw new Error('Ruta de salida QA inválida.');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const buildEnv = { ...process.env, VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_PUBLISHABLE_KEY: 'qa-publishable-key', VITE_ORG_NOMBRE: 'PROESA Electrónica' };
const build = spawnSync(npmCommand, ['run', 'build'], { cwd: webRoot, env: buildEnv, stdio: 'inherit', shell: process.platform === 'win32' });
if (build.status !== 0) process.exit(build.status ?? 1);

await fs.mkdir(outputRoot, { recursive: true });
await fs.rm(dist, { recursive: true, force: true });
await fs.cp(path.join(webRoot, 'dist'), dist, { recursive: true });

const children = [];
let stopping = false;
function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.push(child);
  child.on('error', (error) => { console.error(error); void stop(1); });
  child.on('exit', (code, signal) => {
    if (!stopping && code !== 0) { console.error(`${command} terminó con ${code ?? signal}`); void stop(code ?? 1); }
  });
  return child;
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) if (child.exitCode === null) child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 300));
  process.exit(code);
}
process.on('SIGINT', () => void stop(130));
process.on('SIGTERM', () => void stop(143));

const node = process.execPath;
const mock = start(node, [path.join(qaRoot, 'mock-supabase.mjs')], { cwd: root, env: { ...process.env, QA_PORT: String(qaPort) } });
const viteBin = path.join(webRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = start(node, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort', '--outDir', path.relative(webRoot, dist)], { cwd: webRoot, env: buildEnv });

async function waitFor(url, child) {
  const limit = Date.now() + 30000;
  while (Date.now() < limit) {
    if (child.exitCode !== null) throw new Error(`El proceso terminó antes de iniciar: ${url}`);
    try { const response = await fetch(url); if (response.ok) return; } catch { /* servidor aún inicia */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Tiempo agotado esperando ${url}`);
}

try {
  await Promise.all([waitFor(`${supabaseUrl}/healthz`, mock), waitFor(`http://127.0.0.1:${webPort}/panel/login`, vite)]);
  const panel = spawnSync(node, [path.join(qaRoot, 'e2e', 'panel.mjs')], { cwd: root, env: { ...process.env, QA_PANEL_URL: `http://127.0.0.1:${webPort}` }, stdio: 'inherit' });
  const audit = panel.status === 0
    ? spawnSync(node, [path.join(qaRoot, 'e2e', 'auditoria.mjs')], { cwd: root, env: { ...process.env, QA_PANEL_URL: `http://127.0.0.1:${webPort}` }, stdio: 'inherit' })
    : null;
  await stop(panel.status === 0 ? audit?.status ?? 1 : panel.status ?? 1);
} catch (error) {
  console.error(error);
  await stop(1);
}
