// Server-only authentication. Never import this module into a client component.
export const administratorEmail = 'chito@ideahubsolutionsinc.com';
const defaultPasswordSalt = 'ce02c740764741bd1a8f511e0f32a631';
const defaultPasswordHash = '941a89420fce7a8f580372399faab54685b32bfbf990ff778cdd688c434f354f';
const lifetime = 8 * 60 * 60;
const encoder = new TextEncoder();
export type AuthDatabase = { prepare(sql: string): {
  bind(...values: unknown[]): ReturnType<AuthDatabase['prepare']>;
  first<T>(): Promise<T | null>;
  run(): Promise<{meta?: {changes?: number}}>;
} };
export type PlatformUser = { userId: string; email: string; displayName: string; fullName: string; isAnonymous: false; role: 'admin' | 'client'; mustChangePassword: boolean };
type Credential = { salt: string; hash: string; version: string; email: string; name: string; userId: string; mustChangePassword: boolean };
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/../g)!, x => parseInt(x, 16));
const digest = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const authError = (message: string, status = 400) => Object.assign(new Error(message), { status });
const secureRequest = (req: Request) => new URL(req.url).protocol === 'https:';
const cookieName = (req: Request) => secureRequest(req) ? '__Host-cql-session' : 'cql_session';
const sessionCookie = (req: Request, token: string, age: number) => `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureRequest(req) ? '; Secure' : ''}`;
const credentialKey = async (email: string) => email === administratorEmail ? 'auth:administrator' : 'auth:client:' + await digest(email);

async function loadCredential(db: AuthDatabase, email: string) {
  const key = await credentialKey(email);
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(key).first<{value: string}>();
  if (!row) return { key, raw: null, credential: email === administratorEmail ? { salt: defaultPasswordSalt, hash: defaultPasswordHash, version: 'default', email, name: 'Administrator', userId: 'administrator:' + email, mustChangePassword: false } as Credential : null };
  const stored = JSON.parse(row.value);
  if (!/^[a-f0-9]{32}$/.test(stored.salt) || !/^[a-f0-9]{64}$/.test(stored.hash) || typeof stored.version !== 'string' || !stored.version || stored.version.includes(':')) throw new Error('Account credential is invalid.');
  const credential: Credential = email === administratorEmail ? { ...stored, email, name: 'Administrator', userId: 'administrator:' + email, mustChangePassword: false } : stored;
  if (credential.email !== email || typeof credential.userId !== 'string' || !credential.userId.startsWith(email === administratorEmail ? 'administrator:' : 'client:')) throw new Error('Account identity is invalid.');
  return { key, raw: row.value, credential };
}
async function derivePassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: 100000 }, key, 256));
}
async function passwordMatches(password: string, credential: Pick<Credential, 'salt' | 'hash'>) {
  const derived = await derivePassword(password, credential.salt);
  let difference = 0;
  for (let i = 0; i < credential.hash.length; i++) difference |= derived.charCodeAt(i) ^ credential.hash.charCodeAt(i);
  return difference === 0;
}
function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw authError('Use a password with 12 to 1,024 characters.');
}
export async function verifyPlatformCredentials(email: unknown, password: unknown, db: AuthDatabase) {
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 1024 || email.length > 254) return null;
  const normalized = normalizeEmail(email);
  const { credential } = await loadCredential(db, normalized);
  // An unknown account performs the same password derivation, with a generic error.
  const matches = await passwordMatches(password, credential || { salt: defaultPasswordSalt, hash: defaultPasswordHash });
  return credential && matches ? { email: normalized, version: credential.version } : null;
}
export async function verifyAdministrator(email: unknown, password: unknown, db: AuthDatabase) {
  const verified = await verifyPlatformCredentials(email, password, db);
  return verified?.email === administratorEmail ? verified.version : null;
}
export async function allowLoginAttempt(db: AuthDatabase, now = Date.now(), email = administratorEmail) {
  const prefix = 'auth:attempt:' + await digest(normalizeEmail(email)) + ':';
  const key = prefix + Math.floor(now / 900000);
  await db.prepare('DELETE FROM settings WHERE id LIKE ? AND id <> ?').bind(prefix + '%', key).run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET value=CAST(CAST(settings.value AS INTEGER)+1 AS TEXT)').bind(key, '1').run();
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(key).first<{value: string}>();
  return Number(row?.value) <= 20;
}
export async function provisionClientAccount(db: AuthDatabase, email: string, name: string, temporaryPassword: unknown, options: {reset?: boolean; allowExisting?: boolean} = {}) {
  email = normalizeEmail(email);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === administratorEmail) throw authError('Use a valid client email different from the administrator email.');
  const current = await loadCredential(db, email);
  if (current.credential && !options.reset) {
    if (options.allowExisting) return false;
    throw authError('This client already has a login. Use Reset password to replace it.', 409);
  }
  if (!current.credential && options.reset) throw authError('Create a client login first.', 404);
  validatePassword(temporaryPassword);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const credential: Credential = { email, name: String(name || 'Client').slice(0, 120), userId: current.credential?.userId || 'client:' + crypto.randomUUID(), salt, hash: await derivePassword(temporaryPassword, salt), version: crypto.randomUUID(), mustChangePassword: true };
  const value = JSON.stringify(credential);
  const result = current.raw === null
    ? await db.prepare('INSERT OR IGNORE INTO settings (id,value) VALUES (?,?)').bind(current.key, value).run()
    : await db.prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(value, current.key, current.raw).run();
  if (!result.meta?.changes) throw authError('Client access changed in another request. Reload and try again.', 409);
  return {created: !current.credential, version: credential.version};
}
export async function getClientAccess(db: AuthDatabase, email: string) {
  const { credential } = await loadCredential(db, normalizeEmail(email));
  return { hasAccount: !!credential, mustChangePassword: !!credential?.mustChangePassword, credentialVersion: credential?.version };
}
export async function changePlatformPassword(db: AuthDatabase, email: string, currentPassword: unknown, newPassword: unknown, confirmation: unknown) {
  email = normalizeEmail(email);
  if (!await allowLoginAttempt(db, Date.now(), email)) throw authError('Too many password attempts. Try again in 15 minutes.', 429);
  const current = await loadCredential(db, email);
  if (typeof currentPassword !== 'string' || currentPassword.length > 1024 || !current.credential || !await passwordMatches(currentPassword, current.credential)) throw authError('Current password is incorrect.');
  validatePassword(newPassword);
  if (newPassword !== confirmation) throw authError('New passwords do not match.');
  if (newPassword === currentPassword) throw authError('Choose a password different from your current password.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const value = JSON.stringify({ ...current.credential, salt, hash: await derivePassword(newPassword, salt), version: crypto.randomUUID(), mustChangePassword: false });
  const result = current.raw === null
    ? await db.prepare('INSERT OR IGNORE INTO settings (id,value) VALUES (?,?)').bind(current.key, value).run()
    : await db.prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(value, current.key, current.raw).run();
  if (!result.meta?.changes) throw authError('Your password changed in another request. Please sign in again.', 409);
  // The new credential version invalidates only this account's existing sessions.
}
export const changeAdministratorPassword = (db: AuthDatabase, current: unknown, next: unknown, confirmation: unknown) => changePlatformPassword(db, administratorEmail, current, next, confirmation);

async function sessionId(req: Request) {
  const token = req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName(req) + '='))?.split('=')[1];
  return token && /^[a-f0-9]{64}$/.test(token) ? 'auth:session:' + await digest(token) : null;
}
export async function createPlatformSession(req: Request, db: AuthDatabase, email: string, version?: string) {
  email = normalizeEmail(email);
  const { credential } = await loadCredential(db, email);
  if (!credential || (version && version !== credential.version)) throw authError('Password changed. Please sign in again.', 401);
  const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM settings WHERE id LIKE 'auth:session:%' AND value <= ?").bind(String(now).padStart(16, '0') + ':').run();
  await db.prepare('INSERT INTO settings (id,value) VALUES (?,?)').bind('auth:session:' + await digest(token), String(now + lifetime).padStart(16, '0') + ':' + credential.version + ':' + encodeURIComponent(email)).run();
  return sessionCookie(req, token, lifetime);
}
export const createAdministratorSession = (req: Request, db: AuthDatabase, version?: string) => createPlatformSession(req, db, administratorEmail, version);
export async function getPlatformUser(req: Request, db: AuthDatabase): Promise<PlatformUser | null> {
  const id = await sessionId(req);
  if (!id) return null;
  const row = await db.prepare('SELECT value FROM settings WHERE id=?').bind(id).first<{value: string}>();
  if (!row) return null;
  const [expiry, version, encodedEmail] = row.value.split(':');
  if (!/^\d{16}$/.test(expiry) || !version || Number(expiry) <= Date.now() / 1000) return null;
  let email: string;
  try { email = encodedEmail ? decodeURIComponent(encodedEmail) : administratorEmail; } catch { return null; }
  const { credential } = await loadCredential(db, email);
  if (!credential || version !== credential.version) return null;
  return { userId: credential.userId, email, displayName: credential.name, fullName: credential.name, isAnonymous: false, role: email === administratorEmail ? 'admin' : 'client', mustChangePassword: credential.mustChangePassword };
}
export async function endAdministratorSession(req: Request, db: AuthDatabase) {
  const id = await sessionId(req);
  if (id) await db.prepare('DELETE FROM settings WHERE id=?').bind(id).run();
  return sessionCookie(req, '', 0);
}
