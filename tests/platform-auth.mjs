import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { allowLoginAttempt, verifyAdministrator, createAdministratorSession, getPlatformUser, endAdministratorSession } from '../app/platform-auth.ts';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE settings (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
const db = { prepare(sql) { const statement = sqlite.prepare(sql); let values = []; return { bind(...args) { values = args; return this; }, async run() { return statement.run(...values); }, async first() { return statement.get(...values) ?? null; } }; } };
const request = (url = 'https://example.test/api/session', cookie = '') => new Request(url, { headers: { cookie } });
assert.equal(await verifyAdministrator('chito@ideahubsolutionsinc.com', 'incorrect'), false);
assert.equal(await verifyAdministrator(null, {}), false);
if (process.env.ADMIN_TEST_PASSWORD) {
  assert.equal(await verifyAdministrator('CHITO@IDEAHUBSOLUTIONSINC.COM', process.env.ADMIN_TEST_PASSWORD), true);
  assert.equal(await verifyAdministrator('other@example.test', process.env.ADMIN_TEST_PASSWORD), false);
}
assert.equal(await getPlatformUser(new Request('https://example.test', { headers: { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'chito@ideahubsolutionsinc.com' } }), db), null);
const cookie = await createAdministratorSession(request(), db);
assert.match(cookie, /^__Host-cql-session=/);
assert.match(cookie, /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
const cookieHeader = cookie.split(';')[0];
assert.equal((await getPlatformUser(request(undefined, cookieHeader), db)).email, 'chito@ideahubsolutionsinc.com');
assert.equal(await getPlatformUser(request(undefined, cookieHeader + 'a'), db), null);
const stored = sqlite.prepare("SELECT id FROM settings WHERE id LIKE 'auth:session:%'").get();
assert.ok(!stored.id.includes(cookieHeader.split('=')[1]));
await endAdministratorSession(request(undefined, cookieHeader), db);
assert.equal(await getPlatformUser(request(undefined, cookieHeader), db), null);
const expired = await createAdministratorSession(request(), db);
sqlite.exec("UPDATE settings SET value='0' WHERE id LIKE 'auth:session:%'");
assert.equal(await getPlatformUser(request(undefined, expired.split(';')[0]), db), null);
assert.match(await createAdministratorSession(request('http://localhost/api/session'), db), /^cql_session=/);
for (let i = 0; i < 20; i++) assert.equal(await allowLoginAttempt(db, 1800000), true);
assert.equal(await allowLoginAttempt(db, 1800000), false);
assert.equal(await allowLoginAttempt(db, 2700000), true);
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM settings WHERE id LIKE 'auth:attempt:%'").get().n, 1);
sqlite.close();
console.log('PASS platform authentication: credentials, header bypass protection, session cookies, token hashing, tampering, expiration, revocation, and shared rate limits');
