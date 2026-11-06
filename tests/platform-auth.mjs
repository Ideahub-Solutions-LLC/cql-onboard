import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ensureApplicationSchema } from '../lib/database-schema.ts';
import { allowLoginAttempt, verifyAdministrator, createAdministratorSession, getPlatformUser, endAdministratorSession, changeAdministratorPassword } from '../app/platform-auth.ts';

const sqlite = new DatabaseSync(':memory:');

const db = { prepare(sql) { const statement = sqlite.prepare(sql); let values = []; return { bind(...args) { values = args; return this; }, async run() { return {meta:{changes:Number(statement.run(...values).changes)}}; }, async first() { return statement.get(...values) ?? null; } }; } };
await Promise.all([ensureApplicationSchema(db), ensureApplicationSchema(db)]);
sqlite.exec("INSERT INTO settings (id,value) VALUES ('config','{\"brandName\":\"CQL\"}'),('owner','original-owner')");
const request = (url = 'https://example.test/api/session', cookie = '') => new Request(url, { headers: { cookie } });
assert.equal(await verifyAdministrator('chito@ideahubsolutionsinc.com', 'incorrect', db), null);
assert.equal(await verifyAdministrator(null, {}, db), null);
if (process.env.ADMIN_TEST_PASSWORD) {
  assert.equal(await verifyAdministrator('CHITO@IDEAHUBSOLUTIONSINC.COM', process.env.ADMIN_TEST_PASSWORD, db), 'default');
  assert.equal(await verifyAdministrator('other@example.test', process.env.ADMIN_TEST_PASSWORD, db), null);
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
if (process.env.ADMIN_TEST_PASSWORD) {
  const oldCookie = (await createAdministratorSession(request(), db)).split(';')[0];
  const replacement = 'Synthetic replacement password 123!';
  await assert.rejects(changeAdministratorPassword(db, 'wrong', replacement, replacement), /Current password/);
  await assert.rejects(changeAdministratorPassword(db, process.env.ADMIN_TEST_PASSWORD, 'short', 'short'), /12 to/);
  await assert.rejects(changeAdministratorPassword(db, process.env.ADMIN_TEST_PASSWORD, replacement, 'mismatch'), /do not match/);
  await changeAdministratorPassword(db, process.env.ADMIN_TEST_PASSWORD, replacement, replacement);
  assert.equal(await verifyAdministrator('chito@ideahubsolutionsinc.com', process.env.ADMIN_TEST_PASSWORD, db), null);
  assert.ok(await verifyAdministrator('chito@ideahubsolutionsinc.com', replacement, db));
  assert.equal(await getPlatformUser(request(undefined, oldCookie), db), null);
  await assert.rejects(createAdministratorSession(request(), db, 'default'), /Password changed/);
  const changedCookie = (await createAdministratorSession(request(), db)).split(';')[0];
  assert.ok(await getPlatformUser(request(undefined, changedCookie), db));
  const credential = sqlite.prepare("SELECT value FROM settings WHERE id='auth:administrator'").get().value;
  assert.ok(!credential.includes(replacement));
  await ensureApplicationSchema(db);
  assert.ok(await verifyAdministrator('chito@ideahubsolutionsinc.com', replacement, db));
  assert.equal(sqlite.prepare("SELECT value FROM settings WHERE id='owner'").get().value, 'original-owner');
  console.log('PASS fresh database setup, current-password checks, password change, default password retirement, session revocation, concurrent-login rejection, and credential persistence');
}
sqlite.close();
console.log('PASS platform authentication: credentials, header bypass protection, session cookies, token hashing, tampering, expiration, revocation, and shared rate limits');
