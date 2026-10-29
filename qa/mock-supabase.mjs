import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

const PORT = Number(process.env.QA_PORT || 54399);
const CLAVE = process.env.QA_CLAVE;
if (!CLAVE) throw new Error('Falta QA_CLAVE; defínela solo como variable de entorno.');

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const users = [
  { id: id(1), email: 'admin@proesa.test', nombre: 'Ana Sistemas', area: 'Sistemas', rol: 'admin', activo: true },
  { id: id(2), email: 'emisor@proesa.test', nombre: 'Emilio Emisor', area: 'Recursos Humanos', rol: 'emisor', activo: true },
  { id: id(3), email: 'consulta@proesa.test', nombre: 'Clara Consulta', area: 'Calidad', rol: 'consulta', activo: true },
  { id: id(4), email: 'inactivo@proesa.test', nombre: 'Iván Inactivo', area: 'Producción', rol: 'consulta', activo: false },
].map((user, index) => ({ ...user, creado_en: `2026-01-0${index + 1}T12:00:00.000Z` }));
const sessions = new Map();
const now = new Date();
const isoDays = (delta) => new Date(now.getTime() + delta * 86400000).toISOString().slice(0, 10);
const typeRows = [
  {
    id: 1, clave: 'CONST', nombre: 'Constancia de capacitación', descripcion: 'Formato de prueba con acentos.',
    prefijo_folio: 'CONST', vigencia_dias: 365, activo: true, creado_en: '2026-01-01T12:00:00.000Z',
    campos: [
      { clave: 'concepto', etiqueta: 'Concepto', tipo: 'texto', requerido: true, publico: true },
      { clave: 'fecha_evento', etiqueta: 'Fecha del evento', tipo: 'fecha', requerido: false, publico: true },
      { clave: 'observaciones', etiqueta: 'Observaciones internas', tipo: 'texto_largo', requerido: false, publico: false },
    ],
  },
  {
    id: 2, clave: 'CERT', nombre: 'Certificado de calidad', descripcion: 'Segundo tipo de ejemplo.',
    prefijo_folio: 'CERT', vigencia_dias: null, activo: true, creado_en: '2026-01-02T12:00:00.000Z',
    campos: [{ clave: 'lote', etiqueta: 'Número de lote', tipo: 'texto', requerido: true, publico: true }],
  },
];
const nombres = [
  'María Fernanda Gómez Hernández', 'José Muñoz Peña', 'Roberto Sánchez Ruiz', 'Lucía García Núñez',
  'Ángel de la Cruz', 'Sofía Hernández López', 'Raúl Martínez Ochoa', 'Ximena Castañeda Díaz',
  'Óscar Ramírez Solís', 'Mónica del Río', 'Héctor Núñez Flores', 'Valentina Pérez Gómez',
  'Diego Sánchez Muñoz', 'Elena Ruiz Cárdenas', 'Andrés Peña López', 'Camila Fernández Ortiz',
  'Miguel Ángel Torres', 'Isabel Gómez Silva', 'Francisco Javier Domínguez', 'Daniela Vázquez León',
  'Pablo Herrera Cruz', 'Teresa Medina Rojas', 'Emiliano Vargas Luna', 'Paola Cabrera Soto',
  'Arturo Salinas Mora', 'Renata Espinoza Gil', 'Jorge Luis Navarro', 'Natalia Acosta Reyes',
  'Sebastián Flores Vega', 'Carmen Orozco Márquez',
];
const docs = nombres.map((destinatario, i) => {
  const num = i + 1;
  const estado = num % 10 === 0 ? 'pendiente' : num % 9 === 0 ? 'cancelado' : 'vigente';
  const tipo = num % 4 === 0 ? typeRows[1] : typeRows[0];
  const folio = `${tipo.prefijo_folio}-2026-${String(num).padStart(6, '0')}`;
  const expired = num % 5 === 0;
  return {
    id: id(100 + num), tipo_id: tipo.id, folio, estado, destinatario,
    emitido_por: num % 2 ? id(2) : id(1), emitido_en: new Date(Date.now() - num * 86400000).toISOString(),
    vigente_hasta: expired ? isoDays(-num) : isoDays(120 + num),
    datos: tipo.clave === 'CONST'
      ? { concepto: `Capacitación técnica ${num}`, fecha_evento: '2026-10-20', observaciones: 'Dato interno de prueba.' }
      : { lote: `LOTE-${String(num).padStart(4, '0')}` },
    pdf_path: estado === 'pendiente' ? null : `${tipo.clave}/2026/${folio}.pdf`,
    pdf_sha256: estado === 'pendiente' ? null : String(num).padStart(64, '0'),
    confirmado_en: estado === 'pendiente' ? null : new Date(Date.now() - num * 86400000 + 120000).toISOString(),
    cancelado_por: estado === 'cancelado' ? id(1) : null,
    cancelado_en: estado === 'cancelado' ? new Date().toISOString() : null,
    motivo_cancelacion: estado === 'cancelado' ? 'Registro ficticio para pruebas.' : null,
  };
});
const bitacora = docs.flatMap((doc) => doc.estado === 'pendiente' ? [] : [{
  id: docs.indexOf(doc) + 1, documento_id: doc.id, accion: 'emitido', actor: doc.emitido_por,
  detalle: { folio: doc.folio }, creado_en: doc.emitido_en,
}]);
let nextTypeId = 3;
let nextDocNumber = 31;

// Toda respuesta lleva CORS; sin esto el navegador bloquea la lectura aunque el cambio sí se aplicó.
const CORS = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range, content-profile' };

const json = (res, status, value, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...CORS, ...headers });
  res.end(value === undefined ? '' : JSON.stringify(value));
};
const restError = (res, status, code, message, details = '') => json(res, status, { code, message, details, hint: null });
const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
};
function actor(req) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return token ? sessions.get(token) ?? null : null;
}
function activeActor(req) {
  const user = actor(req);
  return user && user.activo ? user : null;
}
function requireActor(req, res, admin = false) {
  const user = activeActor(req);
  if (!user) { restError(res, 401, 'PGRST301', 'Sesión requerida'); return null; }
  if (admin && user.rol !== 'admin') { restError(res, 403, '42501', 'No tiene permiso para realizar esta acción'); return null; }
  return user;
}
function perfilPublico(user) {
  const { id: userId, nombre, area, rol, activo, creado_en } = user;
  return { id: userId, nombre, area, rol, activo, creado_en };
}
function authUser(user) {
  return { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { nombre: user.nombre }, created_at: user.creado_en };
}
function sessionFor(user) {
  const token = `qa.${Buffer.from(JSON.stringify({ sub: user.id, role: user.rol })).toString('base64url')}.session`;
  sessions.set(token, user);
  return { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `refresh-${user.id}`, user: authUser(user) };
}
function relation(doc, select) {
  const type = typeRows.find((item) => item.id === doc.tipo_id);
  const wantsFields = /tipos_documento\([^)]*campos/.test(select);
  return { ...doc, tipos_documento: type ? { clave: type.clave, nombre: type.nombre, ...(wantsFields ? { campos: type.campos } : {}) } : null };
}
function parseRange(req, url) {
  const range = req.headers.range?.match(/(\d+)-(\d+)/);
  const offset = Number(url.searchParams.get('offset') ?? range?.[1] ?? 0);
  const defaultLimit = 1000;
  const limit = Number(url.searchParams.get('limit') ?? (range ? Number(range[2]) - Number(range[1]) + 1 : defaultLimit));
  return { offset, limit: Math.max(0, limit) };
}
function filterRows(rows, params) {
  let result = [...rows];
  for (const [key, value] of params) {
    if (['select', 'order', 'offset', 'limit', 'or', 'on_conflict'].includes(key) || key.startsWith('columns')) continue;
    const match = value.match(/^(eq|neq|lt|lte|gt|gte|is|ilike)\.(.*)$/);
    if (!match) continue;
    const [, op, raw] = match;
    const expected = raw.replace(/^"|"$/g, '');
    result = result.filter((row) => {
      const actual = row[key];
      if (op === 'eq') return String(actual) === expected;
      if (op === 'neq') return String(actual) !== expected;
      if (op === 'is') return expected === 'null' ? actual == null : String(actual) === expected;
      if (op === 'lt') return String(actual ?? '') < expected;
      if (op === 'lte') return String(actual ?? '') <= expected;
      if (op === 'gt') return String(actual ?? '') > expected;
      if (op === 'gte') return String(actual ?? '') >= expected;
      if (op === 'ilike') {
        const pattern = expected.replaceAll('%', '.*').replaceAll('_', '.');
        return new RegExp(`^${pattern}$`, 'i').test(String(actual ?? ''));
      }
      return true;
    });
  }
  const orValue = params.get('or');
  if (orValue) {
    const tests = [...orValue.matchAll(/([\w]+)\.ilike\.%([^%,)]+)%/g)].map((m) => [m[1], m[2].toLowerCase()]);
    if (tests.length) result = result.filter((row) => tests.some(([key, value]) => String(row[key] ?? '').toLowerCase().includes(value)));
  }
  const order = params.get('order');
  if (order) {
    const [field, direction] = order.split('.');
    result.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (direction === 'desc' ? -1 : 1));
  }
  return result;
}
function sendRows(req, res, url, rows) {
  const filtered = filterRows(rows, url.searchParams);
  const { offset, limit } = parseRange(req, url);
  const page = filtered.slice(offset, offset + limit);
  const selected = url.searchParams.get('select') ?? '*';
  const output = page.map((row) => url.pathname.endsWith('/documentos') ? relation(row, selected) : row);
  const accept = req.headers.accept ?? '';
  if (accept.includes('application/vnd.pgrst.object+json')) {
    if (output.length !== 1) return restError(res, 406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned');
    return json(res, 200, output[0], { 'content-profile': 'public' });
  }
  const countRequested = req.headers.prefer?.includes('count=exact');
  const end = output.length ? offset + output.length - 1 : offset;
  return json(res, 200, output, { 'content-profile': 'public', ...(countRequested ? { 'content-range': output.length ? `${offset}-${end}/${filtered.length}` : `*/${filtered.length}` } : {}) });
}
function typeFieldsFromSelect(select) {
  return /campos/.test(select) ? ['clave', 'nombre', 'campos'] : ['clave', 'nombre'];
}
function documentRowsForUser(user) {
  if (!user?.activo) return [];
  return docs;
}
function summary() {
  const active = docs.filter((doc) => doc.estado !== 'pendiente');
  return {
    vigentes: active.filter((doc) => doc.estado === 'vigente' && (!doc.vigente_hasta || doc.vigente_hasta >= isoDays(0))).length,
    por_vencer: active.filter((doc) => doc.estado === 'vigente' && doc.vigente_hasta >= isoDays(0) && doc.vigente_hasta <= isoDays(30)).length,
    vencidos: active.filter((doc) => doc.estado === 'vigente' && doc.vigente_hasta && doc.vigente_hasta < isoDays(0)).length,
    cancelados: active.filter((doc) => doc.estado === 'cancelado').length,
    total: active.length,
  };
}
const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF', 'ascii');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (req.method === 'OPTIONS') { // Igual que Supabase: el preflight acepta las cabeceras que pida el cliente (supabase-js agrega x-supabase-api-version, accept-profile, etc.).
    res.writeHead(204, { 'access-control-allow-origin': req.headers.origin ?? '*', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': req.headers['access-control-request-headers'] ?? 'authorization, apikey, content-type, x-client-info, prefer, range, range-unit', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'access-control-max-age': '600' }); return res.end(); }
  if (url.pathname === '/healthz') return json(res, 200, { ok: true });

  if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
    const body = await readBody(req);
    const user = users.find((item) => item.email.toLowerCase() === String(body.email ?? '').toLowerCase());
    if (!user || body.password !== CLAVE) return json(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    return json(res, 200, sessionFor(user));
  }
  if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
    const user = actor(req);
    return user ? json(res, 200, authUser(user)) : json(res, 401, { message: 'Invalid JWT' });
  }
  if (url.pathname === '/auth/v1/logout' && req.method === 'POST') {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) sessions.delete(token);
    res.writeHead(204, CORS); return res.end();
  }

  if (url.pathname.startsWith('/storage/v1/object/sign/documentos/') && req.method === 'POST') {
    const signedURL = `${url.pathname}?token=qa-signed-download`;
    return json(res, 200, { signedURL, signedUrl: `http://${req.headers.host}${signedURL}`, path: url.pathname.split('/').slice(6).join('/') });
  }
  if (url.pathname.startsWith('/storage/v1/object/sign/documentos/') && req.method === 'GET') {
    res.writeHead(200, { ...CORS, 'content-type': 'application/pdf', 'content-length': minimalPdf.length }); return res.end(minimalPdf);
  }

  if (url.pathname === '/functions/v1/emitir-documento' && req.method === 'POST') {
    const user = requireActor(req, res);
    if (!user) return;
    if (!['admin', 'emisor'].includes(user.rol)) return json(res, 403, { error: { codigo: 'SIN_PERMISO', mensaje: 'No tiene permiso para emitir documentos' } });
    const body = await readBody(req);
    const type = typeRows.find((row) => row.clave === String(body.tipo_clave).toUpperCase());
    if (!type) return json(res, 400, { error: { codigo: 'VALIDACION', mensaje: 'Tipo de documento no válido' } });
    const required = type.campos.find((field) => field.requerido && !String(body.datos?.[field.clave] ?? '').trim());
    if (required) return json(res, 400, { error: { codigo: 'VALIDACION', mensaje: `Falta el campo requerido: ${required.etiqueta}` } });
    const number = String(nextDocNumber++).padStart(6, '0');
    const folio = `${type.prefijo_folio}-2026-${number}`;
    const documentId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const code = '7KQ2M-XA9PD';
    const sha = 'a'.repeat(64);
    const path = `${type.clave}/2026/${folio}.pdf`;
    docs.unshift({ id: documentId, tipo_id: type.id, folio, estado: 'vigente', destinatario: body.destinatario, emitido_por: user.id, emitido_en: new Date().toISOString(), vigente_hasta: body.sin_vencimiento ? null : body.vigente_hasta ?? isoDays(365), datos: body.datos ?? {}, pdf_path: path, pdf_sha256: sha, confirmado_en: new Date().toISOString(), cancelado_por: null, cancelado_en: null, motivo_cancelacion: null });
    bitacora.push({ id: bitacora.length + 1, documento_id: documentId, accion: 'emitido', actor: user.id, detalle: { folio }, creado_en: new Date().toISOString() });
    return json(res, 200, { documento_id: documentId, folio, url_verificacion: `http://${req.headers.host}/v/${token}`, codigo_verificacion: code, vigente_hasta: body.sin_vencimiento ? null : body.vigente_hasta ?? isoDays(365), pdf_sha256: sha, pdf_url: `http://${req.headers.host}/storage/v1/object/sign/documentos/${path}?token=qa-signed-download` });
  }
  if (url.pathname === '/functions/v1/verificar' && req.method === 'POST') {
    const body = await readBody(req);
    let found = null;
    if (body.metodo === 'manual') found = docs.find((doc) => doc.folio === String(body.folio).toUpperCase() && body.codigo === '7KQ2M-XA9PD');
    if (body.metodo === 'archivo') found = docs.find((doc) => doc.pdf_sha256 === body.pdf_sha256);
    const result = found && found.estado !== 'pendiente' ? 'valido' : 'no_encontrado';
    return json(res, 200, { resultado: result, documento: result === 'valido' ? { folio: found.folio, tipo: typeRows.find((t) => t.id === found.tipo_id)?.nombre, destinatario: found.destinatario, area_emisora: 'Recursos Humanos', emitido_en: found.emitido_en, vigente_hasta: found.vigente_hasta, cancelado_en: found.cancelado_en, campos: [] } : null, verificado_en: new Date().toISOString() });
  }

  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const user = requireActor(req, res);
    if (!user) return;
    const name = url.pathname.split('/').at(-1);
    const body = await readBody(req);
    if (name === 'rol_actual') return json(res, 200, user.rol);
    if (name === 'resumen_documentos') return json(res, 200, summary());
    if (name === 'bitacora_documento') {
      const rows = bitacora.filter((row) => row.documento_id === body.p_documento_id).map((row) => {
        const actorUser = users.find((item) => item.id === row.actor);
        return { id: row.id, accion: row.accion, actor_nombre: actorUser?.nombre ?? 'Usuario interno', actor_area: actorUser?.area ?? null, detalle: row.detalle, creado_en: row.creado_en };
      });
      return json(res, 200, rows);
    }
    if (name === 'cancelar_documento') {
      if (user.rol !== 'admin') return restError(res, 403, '42501', 'Solo un administrador puede cancelar documentos');
      if (String(body.p_motivo ?? '').trim().length < 5) return restError(res, 400, '22023', 'Indique el motivo de la cancelación (mínimo 5 caracteres)');
      const doc = docs.find((row) => row.id === body.p_documento_id);
      if (!doc || doc.estado !== 'vigente') return restError(res, 400, '22023', 'Solo se pueden cancelar documentos vigentes');
      doc.estado = 'cancelado'; doc.cancelado_por = user.id; doc.cancelado_en = new Date().toISOString(); doc.motivo_cancelacion = String(body.p_motivo).trim();
      bitacora.push({ id: bitacora.length + 1, documento_id: doc.id, accion: 'cancelado', actor: user.id, detalle: { motivo: doc.motivo_cancelacion }, creado_en: doc.cancelado_en });
      return json(res, 200, { documento_id: doc.id, folio: doc.folio, estado: 'cancelado' });
    }
    return restError(res, 404, 'PGRST202', `RPC ${name} no encontrada`);
  }

  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.slice('/rest/v1/'.length);
    const user = requireActor(req, res);
    if (!user) return;
    if (table === 'perfiles') {
      if (req.method === 'GET') {
        const rows = user.rol === 'admin' ? users.map(perfilPublico) : users.filter((item) => item.id === user.id).map(perfilPublico);
        return sendRows(req, res, url, rows);
      }
      if (req.method === 'PATCH') {
        if (user.rol !== 'admin') return restError(res, 403, '42501', 'Solo un administrador puede modificar perfiles');
        const body = await readBody(req);
        const target = users.find((item) => item.id === url.searchParams.get('id')?.slice(3));
        if (target) Object.assign(target, body);
        res.writeHead(204, CORS); return res.end();
      }
    }
    if (table === 'tipos_documento') {
      if (req.method === 'GET') return sendRows(req, res, url, typeRows);
      if (req.method === 'POST') {
        if (user.rol !== 'admin') return restError(res, 403, '42501', 'Solo un administrador puede crear tipos');
        const body = await readBody(req);
        if (typeRows.some((row) => row.clave === body.clave)) return restError(res, 409, '23505', 'La clave ya existe');
        typeRows.push({ ...body, id: nextTypeId++, creado_en: new Date().toISOString() });
        res.writeHead(201, { ...CORS, 'content-profile': 'public' }); return res.end();
      }
      if (req.method === 'PATCH') {
        if (user.rol !== 'admin') return restError(res, 403, '42501', 'Solo un administrador puede editar tipos');
        const body = await readBody(req);
        const target = typeRows.find((row) => row.id === Number(url.searchParams.get('id')?.slice(3)));
        if (target) Object.assign(target, body);
        res.writeHead(204, CORS); return res.end();
      }
    }
    if (table === 'documentos' && req.method === 'GET') {
      if (url.searchParams.get('select')?.includes('token_hash')) return restError(res, 403, '42501', 'permission denied for column token_hash');
      return sendRows(req, res, url, documentRowsForUser(user));
    }
    if (table === 'bitacora' && req.method === 'GET') {
      const rows = bitacora.filter((row) => row.documento_id === url.searchParams.get('documento_id')?.slice(3));
      return sendRows(req, res, url, rows);
    }
    if (table === 'verificaciones' && req.method === 'GET') {
      if (user.rol !== 'admin') return restError(res, 403, '42501', 'Solo administradores pueden consultar verificaciones');
      return sendRows(req, res, url, []);
    }
    return restError(res, 404, 'PGRST205', `La relación public.${table} no existe`);
  }
  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`Supabase QA simulado disponible en http://127.0.0.1:${PORT}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
