// Server-only authentication. Never import this module into a client component.
export const administratorEmail = 'chito@ideahubsolutionsinc.com';
const passwordSalt = 'ce02c740764741bd1a8f511e0f32a631';
const passwordHash = '941a89420fce7a8f580372399faab54685b32bfbf990ff778cdd688c434f354f';
const lifetime = 8 * 60 * 60;
const encoder = new TextEncoder();

export type AuthDatabase = {
  prepare(sql: string): {
    bind(...values: unknown[]): ReturnType<AuthDatabase['prepare']>;
    first<T>(): Promise<T | null>;
    run(): Promise<unknown>;
  };
};

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/../g)!, x => parseInt(x, 16));
const secureRequest = (req: Request) => new URL(req.url).protocol === 'https:';
const cookieName = (req: Request) => secureRequest(req) ? '__Host-cql-session' : 'cql_session';
const sessionCookie = (req: Request, token: string, age: number) =>
  `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureRequest(req) ? '; Secure' : ''}`;

async function sessionId(req: Request) {
  const token = req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName(req) + '='))?.split('=')[1];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return 'auth:session:' + hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

export async function verifyAdministrator(email: unknown, password: unknown) {
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  // Keep the verifier compatible with the Workers runtime.
  const derived = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(passwordSalt), iterations: 100000 }, key, 256));
  let difference = 0;
  for (let i = 0; i < passwordHash.length; i++) difference |= derived.charCodeAt(i) ^ passwordHash.charCodeAt(i);
  return difference === 0 && email.trim().toLowerCase() === administratorEmail;
}

export async function allowLoginAttempt(db: AuthDatabase, now = Date.now()) {
  const key = 'auth:attempt:' + Math.floor(now / 900000);
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:attempt:%' AND id <> ?").bind(key).run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=CAST(CAST(settings.value AS INTEGER)+1 AS TEXT)').bind(key, '1').run();
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(key).first<{value: string}>();
  return Number(row?.value) <= 20;
}

export async function createAdministratorSession(req: Request, db: AuthDatabase) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const id = 'auth:session:' + hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:session:%' AND CAST(value AS INTEGER) <= ?").bind(now).run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?)').bind(id, String(now + lifetime)).run();
  return sessionCookie(req, token, lifetime);
}

export async function getPlatformUser(req: Request, db: AuthDatabase) {
  const id = await sessionId(req);
  if (!id) return null;
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(id).first<{value: string}>();
  if (!row || Number(row.value) <= Date.now() / 1000) return null;
  return { userId: 'administrator:' + administratorEmail, email: administratorEmail, displayName: 'Administrator', fullName: 'Administrator', isAnonymous: false };
}

export async function endAdministratorSession(req: Request, db: AuthDatabase) {
  const id = await sessionId(req);
  if (id) await db.prepare('DELETE FROM settings WHERE id=?').bind(id).run();
  return sessionCookie(req, '', 0);
}
