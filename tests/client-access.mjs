import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { clientLoginText } from '../lib/client-login-details.ts';
import { createAdministratorSession } from '../app/platform-auth.ts';

// Exercise the real API handler with an isolated database and private file store.
const sqlite = new DatabaseSync(':memory:');
const db = { prepare(sql) {
  const statement = sqlite.prepare(sql); let values = [];
  return { bind(...args) { values = args; return this; }, async run() { return {meta: {changes: Number(statement.run(...values).changes)}}; }, async first() { return statement.get(...values) ?? null; }, async all() { return {results: statement.all(...values)}; } };
} };
const files = new Map();
globalThis.__cqlTestEnv = { DB: db, VAULT_KEY: btoa('01234567890123456789012345678901'), BUCKET: {
  async put(key, bytes) { files.set(key, bytes); }, async get(key) { return files.has(key) ? {body: files.get(key)} : null; }, async delete(key) { files.delete(key); },
} };
const compiled = await build({ entryPoints: ['app/api/[...path]/route.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', plugins: [{name: 'isolated-test-bindings', setup(builder) {
  builder.onResolve({filter: /^cloudflare:workers$/}, () => ({path: 'bindings', namespace: 'test'}));
  builder.onLoad({filter: /.*/, namespace: 'test'}, () => ({contents: 'export const env = globalThis.__cqlTestEnv;'}));
}}] });
const routes = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const base = 'http://client-access.test';
async function api(path, {cookie, body, method = body ? 'POST' : 'GET', origin = base} = {}) {
  const headers = {Origin: origin, ...(cookie ? {Cookie: cookie} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {})};
  const request = new Request(base + '/api/' + path, {method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
  const response = await routes[method](request);
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  assert.ok(response.status < 500, `${method} ${path}: ${response.status} ${text}`);
  return {status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0]};
}
const alphaEmail = 'alpha@example.test', betaEmail = 'beta@example.test';
const temporary = 'Temporary client password 123!';
const permanent = 'Permanent client password 456!';
const login = (email, password) => api('auth/login', {body: {email, password}});
const newClient = (email, name) => api('applications', {cookie: admin, body: {assignedEmail: email, temporaryPassword: temporary, data: {legalName: name}}});
assert.equal((await api('session')).status, 401);
const admin = (await createAdministratorSession(new Request(base), db)).split(';')[0];
const alpha = await newClient(alphaEmail, 'Alpha business');
const beta = await newClient(betaEmail, 'Beta business');
assert.equal(alpha.status, 201); assert.equal(beta.status, 201);
assert.equal(alpha.data.clientAccountCreated, true);
const accessForCopy = (await api(`applications/${alpha.data.id}/client-access`, {cookie: admin})).data;
const loginText = clientLoginText('https://example.test', alpha.data.id, accessForCopy, {email: alphaEmail, password: temporary, version: alpha.data.clientCredentialVersion});
assert.ok(loginText.includes('Temporary password: ' + temporary));
assert.ok(loginText.includes('Email: ' + alphaEmail));
assert.ok(!loginText.split('\n')[0].includes(temporary), 'password is never embedded in the URL');
assert.throws(() => clientLoginText(base, alpha.data.id, accessForCopy), /Reset the client password/);
assert.throws(() => clientLoginText(base, alpha.data.id, accessForCopy, {email: alphaEmail, password: temporary, version: 'stale'}), /Reset the client password/);
assert.equal((await api('applications', {cookie: admin, body: {assignedEmail: 'missing-password@example.test', data: {legalName: 'Invalid'}}})).status, 400);
assert.equal((await api('applications', {cookie: admin, body: {assignedEmail: 'chito@ideahubsolutionsinc.com', temporaryPassword: temporary, data: {legalName: 'Invalid'}}})).status, 400);
assert.equal((await api('applications', {cookie: admin})).data.length, 2, 'failed account creation rolls back its application');

const alphaTemporary = await login(alphaEmail.toUpperCase(), temporary);
assert.equal(alphaTemporary.status, 200);
const firstSession = await api('session', {cookie: alphaTemporary.cookie});
assert.equal(firstSession.data.admin, false); assert.equal(firstSession.data.mustChangePassword, true);
assert.equal(firstSession.data.config.teamEmails, undefined);
assert.equal((await api('applications', {cookie: alphaTemporary.cookie})).data.code, 'PASSWORD_CHANGE_REQUIRED');
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaTemporary.cookie})).status, 403);
assert.equal((await api('auth/password', {cookie: alphaTemporary.cookie, body: {currentPassword: 'wrong', newPassword: permanent, confirmPassword: permanent}})).status, 400);
assert.equal((await api('auth/password', {cookie: alphaTemporary.cookie, body: {currentPassword: temporary, newPassword: permanent, confirmPassword: permanent}})).status, 200);
assert.equal((await api('session', {cookie: alphaTemporary.cookie})).status, 401);
assert.equal((await login(alphaEmail, temporary)).status, 401);
let alphaCookie = (await login(alphaEmail, permanent)).cookie;
assert.ok(alphaCookie);
assert.equal((await api('session', {cookie: alphaCookie})).data.mustChangePassword, false);
const permanentAccess = (await api(`applications/${alpha.data.id}/client-access`, {cookie: admin})).data;
assert.ok(!clientLoginText(base, alpha.data.id, permanentAccess, {email: alphaEmail, password: temporary, version: alpha.data.clientCredentialVersion}).includes(temporary), 'a changed temporary password is never copied again');
const betaTemporary = await login(betaEmail, temporary);
await api('auth/password', {cookie: betaTemporary.cookie, body: {currentPassword: temporary, newPassword: permanent, confirmPassword: permanent}});
const betaCookie = (await login(betaEmail, permanent)).cookie;
assert.deepEqual((await api('applications', {cookie: alphaCookie})).data.map(a => a.id), [alpha.data.id]);

await api(`applications/${alpha.data.id}/team`, {cookie: admin, method: 'PUT', body: {status: 'draft', checklist: {}, notes: 'PRIVATE TEAM NOTES'}});
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaCookie})).data.notes, undefined);
for (const [path, method, body] of [
  ['applications/' + beta.data.id, 'GET'],
  ['applications/' + beta.data.id, 'PUT', {data: {}}],
  [`applications/${beta.data.id}/secret`, 'GET'],
  [`applications/${alpha.data.id}/team`, 'PUT', {status: 'draft'}],
  [`applications/${alpha.data.id}/client-access`, 'GET'],
  [`applications/${beta.data.id}/client-access`, 'PUT', {temporaryPassword: temporary}],
  ['config', 'PUT', {brandName: 'Unauthorized'}],
  ['applications', 'POST', {data: {}}],
]) assert.equal((await api(path, {cookie: alphaCookie, method, body})).status, 403, path + ' is protected');

const savedData = {...alpha.data.data, legalName: 'Alpha saved progress', contactEmail: betaEmail, services: 'My services'};
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaCookie, method: 'PUT', body: {data: savedData, step: 0}})).status, 200);
await api('auth/logout', {cookie: alphaCookie, body: {}});
assert.equal((await api('session', {cookie: alphaCookie})).status, 401);
alphaCookie = (await login(alphaEmail, permanent)).cookie;
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaCookie})).data.data.legalName, 'Alpha saved progress');
assert.equal((await api('applications/' + beta.data.id, {cookie: alphaCookie})).status, 403, 'editing a contact email cannot change login identity');
const upload = new FormData(); upload.append('file', new Blob(['Synthetic private document']), 'private.txt');
const betaFile = await api(`applications/${beta.data.id}/files`, {cookie: admin, body: upload});
assert.equal(betaFile.status, 201);
assert.equal((await api('files/' + betaFile.data.id, {cookie: alphaCookie})).status, 403);
assert.equal((await api('files/' + betaFile.data.id, {cookie: alphaCookie, method: 'DELETE'})).status, 403);
assert.equal((await api('files/' + betaFile.data.id, {cookie: betaCookie})).status, 200);

const ownUpload = new FormData(); ownUpload.append('file', new Blob(['Alpha private document']), 'alpha.txt');
const alphaFile = await api(`applications/${alpha.data.id}/files`, {cookie: alphaCookie, body: ownUpload});
assert.equal(alphaFile.status, 201);
assert.equal((await api('files/' + alphaFile.data.id, {cookie: alphaCookie})).status, 200);
assert.equal((await api('files/' + alphaFile.data.id, {cookie: betaCookie})).status, 403);
assert.equal((await api(`applications/${alpha.data.id}/secret`, {cookie: alphaCookie})).status, 403);
assert.equal((await api('price-lists', {cookie: alphaCookie, body: ownUpload})).status, 403);
await api(`applications/${alpha.data.id}/team`, {cookie: admin, method: 'PUT', body: {status: 'submitted', checklist: {}}});
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaCookie, method: 'PUT', body: {data: savedData, step: 0}})).status, 409);
await api(`applications/${alpha.data.id}/team`, {cookie: admin, method: 'PUT', body: {status: 'changes_requested', checklist: {}}});
assert.equal((await api('applications/' + alpha.data.id, {cookie: alphaCookie, method: 'PUT', body: {data: savedData, step: 0}})).status, 200);

const resetPassword = 'Reset temporary password 789!';
assert.equal((await api(`applications/${alpha.data.id}/client-access`, {cookie: admin, method: 'PUT', body: {temporaryPassword: resetPassword}})).status, 200);
assert.equal((await api('session', {cookie: alphaCookie})).status, 401);
assert.equal((await api('session', {cookie: betaCookie})).status, 200, 'one client reset does not invalidate another account');
assert.equal((await api('session', {cookie: admin})).status, 200);
assert.equal((await login(alphaEmail, permanent)).status, 401);
const resetSession = await login(alphaEmail, resetPassword);
assert.equal((await api('session', {cookie: resetSession.cookie})).data.mustChangePassword, true);
assert.equal((await api(`applications/${alpha.data.id}`, {cookie: resetSession.cookie})).status, 403);
const changedAgain = 'Client replacement password 987!';
await api('auth/password', {cookie: resetSession.cookie, body: {currentPassword: resetPassword, newPassword: changedAgain, confirmPassword: changedAgain}});
alphaCookie = (await login(alphaEmail, changedAgain)).cookie;
assert.equal((await api(`applications/${alpha.data.id}`, {cookie: alphaCookie})).data.data.legalName, 'Alpha saved progress');
const extra = await api('applications', {cookie: admin, body: {assignedEmail: alphaEmail, data: {legalName: 'Another Alpha application'}}});
assert.equal(extra.status, 201); assert.equal(extra.data.clientAccountCreated, false);
assert.equal((await login(alphaEmail, changedAgain)).status, 200, 'additional applications never reset an existing password');
assert.equal((await api('applications', {cookie: alphaCookie})).data.length, 2);

// Existing applications can receive a login without recreating the application.
const legacyEmail = 'legacy@example.test', legacyId = crypto.randomUUID();
sqlite.prepare('INSERT INTO applications (id,owner_id,assigned_email,data,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(legacyId, 'old-admin', legacyEmail, JSON.stringify(alpha.data.data), new Date().toISOString(), new Date().toISOString());
assert.equal((await api(`applications/${legacyId}/client-access`, {cookie: admin})).data.hasAccount, false);
assert.equal((await api(`applications/${legacyId}/client-access`, {cookie: admin, body: {temporaryPassword: temporary}})).status, 200);
assert.equal((await login(legacyEmail, temporary)).status, 200);
const serialized = sqlite.prepare("SELECT value FROM settings WHERE id LIKE 'auth:client:%'").all().map(row => row.value).join();
for (const password of [temporary, permanent, resetPassword, changedAgain]) assert.ok(!serialized.includes(password), 'passwords are never stored in plaintext');
assert.equal((await api('auth/login', {origin: 'http://untrusted.test', body: {email: alphaEmail, password: changedAgain}})).status, 403);
sqlite.exec("DELETE FROM settings WHERE id LIKE 'auth:attempt:%'");
for (let i = 0; i < 20; i++) assert.equal((await login(alphaEmail, 'incorrect')).status, 401);
assert.equal((await login(alphaEmail, changedAgain)).status, 429);
assert.equal((await login(betaEmail, permanent)).status, 200, 'client rate limits do not lock other accounts');
sqlite.close(); delete globalThis.__cqlTestEnv;
console.log('PASS client API: provisioning, first-login gate, password change/reset, account isolation, private files/notes, draft resume, existing applications, credential hashing, CSRF, and separate login limits');
