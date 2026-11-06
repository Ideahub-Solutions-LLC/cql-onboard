// Server-only authentication. Never import this module into a client component.
export const administratorEmail = 'chito@ideahubsolutionsinc.com';
const defaultPasswordSalt = 'ce02c740764741bd1a8f511e0f32a631';
const defaultPasswordHash = '941a89420fce7a8f580372399faab54685b32bfbf990ff778cdd688c434f354f';
const lifetime = 8 * 60 * 60;
const encoder = new TextEncoder();

export type AuthDatabase = {
  prepare(sql: string): {
    bind(...values: unknown[]): ReturnType<AuthDatabase['prepare']>;
    first<T>(): Promise<T | null>;
    run(): Promise<{meta?: {changes?: number}}>;
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

type AdministratorCredential = { salt: string; hash: string; version: string };
async function administratorCredential(db: AuthDatabase): Promise<AdministratorCredential> {
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind('auth:administrator').first<{value: string}>();
  if (!row) return { salt: defaultPasswordSalt, hash: defaultPasswordHash, version: 'default' };
  const credential = JSON.parse(row.value) as AdministratorCredential;
  if (!/^[a-f0-9]{32}$/.test(credential.salt) || !/^[a-f0-9]{64}$/.test(credential.hash) || typeof credential.version !== 'string') throw new Error('Administrator credential is invalid.');
  return credential;
}

async function derivePassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: 100000 }, key, 256));
}

export async function verifyAdministrator(email: unknown, password: unknown, db: AuthDatabase) {
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024) return null;
  const credential = await administratorCredential(db);
  const derived = await derivePassword(password, credential.salt);
  let difference = 0;
  for (let i = 0; i < credential.hash.length; i++) difference |= derived.charCodeAt(i) ^ credential.hash.charCodeAt(i);
  return difference === 0 && email.trim().toLowerCase() === administratorEmail ? credential.version : null;
}

export async function changeAdministratorPassword(db: AuthDatabase, currentPassword: unknown, newPassword: unknown, confirmation: unknown) {
  if (!await allowLoginAttempt(db)) throw Object.assign(new Error('Too many password attempts. Try again in 15 minutes.'), { status: 429 });
  if (!await verifyAdministrator(administratorEmail, currentPassword, db)) throw Object.assign(new Error('Current password is incorrect.'), { status: 400 });
  if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 1024) throw Object.assign(new Error('Use a new password with 12 to 1,024 characters.'), { status: 400 });
  if (newPassword !== confirmation) throw Object.assign(new Error('New passwords do not match.'), { status: 400 });
  if (newPassword === currentPassword) throw Object.assign(new Error('Choose a password different from your current password.'), { status: 400 });
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const credential = { salt, hash: await derivePassword(newPassword, salt), version: crypto.randomUUID() };
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('auth:administrator', JSON.stringify(credential)).run();
  // Sessions are also tied to the credential version, closing concurrent login races.
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:session:%'").run();
}

export async function allowLoginAttempt(db: AuthDatabase, now = Date.now()) {
  const key = 'auth:attempt:' + Math.floor(now / 900000);
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:attempt:%' AND id <> ?").bind(key).run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=CAST(CAST(settings.value AS INTEGER)+1 AS TEXT)').bind(key, '1').run();
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(key).first<{value: string}>();
  return Number(row?.value) <= 20;
}

export async function createAdministratorSession(req: Request, db: AuthDatabase, version?: string) {
  const credential = await administratorCredential(db);
  if (version && version !== credential.version) throw Object.assign(new Error('Password changed. Please sign in again.'), {status: 401});
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const id = 'auth:session:' + hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:session:%' AND value <= ?").bind(String(now).padStart(16, '0') + ':').run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?)').bind(id, String(now + lifetime).padStart(16, '0') + ':' + credential.version).run();
  return sessionCookie(req, token, lifetime);
}

export async function getPlatformUser(req: Request, db: AuthDatabase) {
  const id = await sessionId(req);
  if (!id) return null;
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(id).first<{value: string}>();
  if (!row) return null;
  const [expiry, version] = row.value.split(':');
  if (!version || Number(expiry) <= Date.now() / 1000 || version !== (await administratorCredential(db)).version) return null;
  return { userId: 'administrator:' + administratorEmail, email: administratorEmail, displayName: 'Administrator', fullName: 'Administrator', isAnonymous: false };
}

export async function endAdministratorSession(req: Request, db: AuthDatabase) {
  const id = await sessionId(req);
  if (id) await db.prepare('DELETE FROM settings WHERE id=?').bind(id).run();
  return sessionCookie(req, '', 0);
}
