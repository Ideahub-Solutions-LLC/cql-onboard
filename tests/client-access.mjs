import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { pbkdf2Sync } from 'node:crypto';
import { build } from 'esbuild';
import { clientLoginText, clientLoginUrl, readLoginLink } from '../lib/client-login-details.ts';
import { createAdministratorSession } from '../app/platform-auth.ts';
import { generateStrongPassword } from '../lib/passwords.mjs';

// Exercise the real API handler with an isolated database and private file store.
const sqlite = new DatabaseSync(':memory:');
let failBatch = false;
const db = { prepare(sql) {
  const statement = sqlite.prepare(sql); let values = [];
  return { bind(...args) { values = args; return this; }, async run() { return {meta: {changes: Number(statement.run(...values).changes)}}; }, async first() { return statement.get(...values) ?? null; }, async all() { return {results: statement.all(...values)}; } };
}, async batch(statements) {
  sqlite.exec('BEGIN');
  try {
    const results = [];
    for (const statement of statements) { results.push(await statement.run()); if (failBatch) throw new Error('Synthetic batch failure'); }
    sqlite.exec('COMMIT'); return results;
  } catch (failure) { sqlite.exec('ROLLBACK'); throw failure; }
} };
const files = new Map();
let failFileDeletion = false;
let onFilePut = null;
globalThis.__cqlTestEnv = { DB: db, VAULT_KEY: btoa('01234567890123456789012345678901'), BUCKET: {
  async put(key, bytes) { files.set(key, bytes); if (onFilePut) { const callback = onFilePut; onFilePut = null; callback(); } }, async get(key) { return files.has(key) ? {body: files.get(key)} : null; }, async delete(key) { if (failFileDeletion) throw new Error('Synthetic storage failure'); files.delete(key); },
} };
const compiled = await build({ entryPoints: ['app/api/[...path]/route.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent', plugins: [{name: 'isolated-test-bindings', setup(builder) {
  builder.onResolve({filter: /^cloudflare:workers$/}, () => ({path: 'bindings', namespace: 'test'}));
  builder.onLoad({filter: /.*/, namespace: 'test'}, () => ({contents: 'export const env = globalThis.__cqlTestEnv;'}));
}}] });
const routes = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const base = 'http://client-access.test';
async function api(path, {cookie, body, method = body ? 'POST' : 'GET', origin = base, allowServerError = false} = {}) {
  const headers = {Origin: origin, ...(cookie ? {Cookie: cookie} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {})};
  const request = new Request(base + '/api/' + path, {method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
  const response = await routes[method](request);
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!allowServerError) assert.ok(response.status < 500, `${method} ${path}: ${response.status} ${text}`);
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
const copiedUrl = new URL(loginText.split('\n')[0].slice('Client application: '.length));
assert.equal(copiedUrl.searchParams.get('application'), alpha.data.id);
assert.equal(copiedUrl.searchParams.get('email'), alphaEmail);
assert.equal(copiedUrl.searchParams.get('password'), temporary);
assert.equal(copiedUrl.hash, '');
assert.equal(clientLoginUrl('https://example.test', alpha.data.id, accessForCopy, {email: alphaEmail, password: temporary, version: alpha.data.clientCredentialVersion}), copiedUrl.href, 'Copy client link returns just the URL');
assert.deepEqual(readLoginLink(copiedUrl.href).prefill, {email: alphaEmail, password: temporary});
assert.equal(readLoginLink(copiedUrl.href).cleanUrl, '/?application=' + alpha.data.id);
const complexPassword = 'Temporary + & # ? = / % 😀 password';
const complexText = clientLoginText(base, alpha.data.id, accessForCopy, {email: alphaEmail, password: complexPassword, version: alpha.data.clientCredentialVersion});
assert.equal(readLoginLink(complexText.split('\n')[0].slice('Client application: '.length)).prefill.password, complexPassword);
assert.equal(readLoginLink(base + '/?application=keep#email=invalid&temporaryPassword=secret&section=help').cleanUrl, '/?application=keep#section=help');
assert.deepEqual(readLoginLink(base + '/#email=invalid&temporaryPassword=secret').prefill, {email: '', password: ''});
assert.equal(readLoginLink(base + '/#section=help').hasCredentials, false);
assert.equal(readLoginLink(base + '/#email=alpha%40example.test&temporaryPassword=' + 'x'.repeat(1025)).prefill.password, '');
assert.deepEqual(readLoginLink(base + '/?application=keep&email=alpha%40example.test&password=Query%2Bpassword&view=login#email=old%40example.test&temporaryPassword=old&section=help'), {prefill: {email: alphaEmail, password: 'Query+password'}, cleanUrl: '/?application=keep&view=login#section=help', hasCredentials: true});
assert.deepEqual(readLoginLink(base + '/#email=alpha%40example.test&temporaryPassword=Legacy%2Bpassword').prefill, {email: alphaEmail, password: 'Legacy+password'});
assert.deepEqual(readLoginLink(base + '/?email=invalid&password=secret').prefill, {email: '', password: ''});
assert.throws(() => clientLoginText(base, alpha.data.id, accessForCopy), /Reset the client password/);
assert.throws(() => clientLoginText(base, alpha.data.id, accessForCopy, {email: alphaEmail, password: temporary, version: 'stale'}), /Reset the client password/);
assert.equal((await api('applications', {cookie: admin, body: {assignedEmail: 'missing-password@example.test', data: {legalName: 'Invalid'}}})).status, 400);
assert.equal((await api('applications', {cookie: admin, body: {assignedEmail: 'chito@ideahubsolutionsinc.com', temporaryPassword: temporary, data: {legalName: 'Invalid'}}})).status, 400);
assert.equal((await api('applications', {cookie: admin})).data.length, 2, 'failed account creation rolls back its application');
const weakCreation = await api('applications', {cookie: admin, body: {assignedEmail: 'weak@example.test', temporaryPassword: 'Password123!', data: {legalName: 'Weak password'}}});
assert.equal(weakCreation.status, 400);
assert.match(weakCreation.data.error, /Weak passwords/);
assert.equal((await api('applications', {cookie: admin})).data.length, 2);
assert.equal((await login('weak@example.test', 'Password123!')).status, 401);

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
const permanentText = clientLoginText(base, alpha.data.id, permanentAccess);
assert.deepEqual(readLoginLink(permanentText.split('\n')[0].slice('Client application: '.length)).prefill, {email: alphaEmail, password: ''});
const betaTemporary = await login(betaEmail, temporary);
await api('auth/password', {cookie: betaTemporary.cookie, body: {currentPassword: temporary, newPassword: permanent, confirmPassword: permanent}});
const betaCookie = (await login(betaEmail, permanent)).cookie;
assert.equal((await api('auth/password', {cookie: betaCookie, body: {currentPassword: permanent, newPassword: 'Password123!', confirmPassword: 'Password123!'}})).status, 400);
assert.equal((await login(betaEmail, permanent)).status, 200, 'rejected password change preserves the current password');
assert.equal((await api(`applications/${alpha.data.id}/client-access`, {cookie: admin, method: 'PUT', body: {temporaryPassword: 'Password123!'}})).status, 400);
assert.equal((await api('session', {cookie: alphaCookie})).status, 200, 'rejected weak reset preserves the active session');
assert.equal((await login(alphaEmail, permanent)).status, 200);
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
// Branding uses the same owner checks as existing private files.
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5xkAAAAASUVORK5CYII=', 'base64');
const logoUpload = new FormData(); logoUpload.append('category', 'Logo Square/Portrait'); logoUpload.append('file', new Blob([pngBytes], {type:'image/png'}), 'synthetic-logo.png');
const logo = await api(`applications/${alpha.data.id}/files`, {cookie:alphaCookie,body:logoUpload});
assert.equal(logo.status,201);
const logoPreview = await routes.GET(new Request(base + '/api/files/' + logo.data.id + '?preview=1', {headers:{Cookie:alphaCookie}}));
assert.equal(logoPreview.status,200); assert.equal(logoPreview.headers.get('content-type'),'image/png');
assert.equal(logoPreview.headers.get('content-disposition'),'inline');
assert.deepEqual(Buffer.from(await logoPreview.arrayBuffer()),pngBytes);
assert.equal((await api('files/'+logo.data.id+'?preview=1',{cookie:betaCookie})).status,403);
assert.equal((await api('files/'+logo.data.id+'?preview=1')).status,401);
const fakeLogo = new FormData(); fakeLogo.append('category','Logo Landscape'); fakeLogo.append('file',new Blob(['<script>bad</script>'],{type:'image/png'}),'fake.png');
assert.equal((await api(`applications/${alpha.data.id}/files`,{cookie:alphaCookie,body:fakeLogo})).status,400);
const brandingData={...savedData,alreadyHaveAccount:true,signupDone:true,legalName:'Synthetic brand',contactName:'Test Client',contactPhone:'+15555550100',completedSteps:['0','1'],primaryColor1:'#1677D2',secondaryColor1:'255, 204, 0'};
assert.equal((await api(`applications/${alpha.data.id}`,{cookie:alphaCookie,method:'PUT',body:{data:brandingData,step:4}})).status,200);
assert.equal((await api(`applications/${alpha.data.id}`,{cookie:alphaCookie,method:'PUT',body:{data:brandingData,step:3}})).status,409,'branding must be completed before review');
assert.equal((await api(`applications/${alpha.data.id}`,{cookie:alphaCookie,method:'PUT',body:{data:{...brandingData,primaryColor1:'invalid',completedSteps:['0','1','4']},step:3}})).status,409);
assert.equal((await api(`applications/${alpha.data.id}`,{cookie:alphaCookie,method:'PUT',body:{data:{...brandingData,completedSteps:['0','1','4']},step:3}})).status,200);
const reloadedBranding=await api(`applications/${alpha.data.id}`,{cookie:alphaCookie});
assert.equal(reloadedBranding.data.data.primaryColor1,'#1677D2'); assert.equal(reloadedBranding.data.data.secondaryColor1,'255, 204, 0');
assert.ok(reloadedBranding.data.files.some(file=>file.id===logo.data.id));
assert.equal((await api(`applications/${alpha.data.id}`,{cookie:alphaCookie,method:'PUT',body:{data:savedData,step:0}})).status,200);
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
const resetAccess = (await api(`applications/${alpha.data.id}/client-access`, {cookie: admin})).data;
assert.throws(() => clientLoginText(base, alpha.data.id, resetAccess, {email: alphaEmail, password: temporary, version: alpha.data.clientCredentialVersion}), /Reset the client password/);
assert.equal((await login(alphaEmail, temporary)).status, 401, 'a copied old temporary password cannot survive a reset');
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
const generatedPassword = generateStrongPassword();
assert.equal((await api(`applications/${legacyId}/client-access`, {cookie: admin, method: 'PUT', body: {temporaryPassword: generatedPassword}})).status, 200);
const generatedSession = await login(legacyEmail, generatedPassword);
assert.equal(generatedSession.status, 200);
assert.equal((await api('auth/password', {cookie: generatedSession.cookie, body: {currentPassword: generatedPassword, newPassword: 'RiverCloud82', confirmPassword: 'RiverCloud82'}})).status, 200, 'medium passwords are accepted');
assert.equal((await login(legacyEmail, 'RiverCloud82')).status, 200);
for (const password of [temporary, permanent, resetPassword, changedAgain]) assert.ok(!serialized.includes(password), 'passwords are never stored in plaintext');
assert.equal((await api('auth/login', {origin: 'http://untrusted.test', body: {email: alphaEmail, password: changedAgain}})).status, 403);
sqlite.exec("DELETE FROM settings WHERE id LIKE 'auth:attempt:%'");
for (let i = 0; i < 20; i++) assert.equal((await login(alphaEmail, 'incorrect')).status, 401);
assert.equal((await login(alphaEmail, changedAgain)).status, 429);
assert.equal((await login(betaEmail, permanent)).status, 200, 'client rate limits do not lock other accounts');

// Seed only this disposable database with a known administrator password.
const adminEmail = 'chito@ideahubsolutionsinc.com';
const adminPassword = 'Synthetic administrator password 123!';
const nextAdminPassword = 'Replacement administrator password 456!';
const salt = '0123456789abcdef0123456789abcdef';
sqlite.prepare('INSERT INTO settings (id,value) VALUES (?,?)').run('auth:administrator', JSON.stringify({salt, hash: pbkdf2Sync(adminPassword, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex'), version: 'default'}));
const otherAdmin = (await login(adminEmail, adminPassword)).cookie;
assert.ok(otherAdmin);
assert.equal((await api('auth/password', {cookie: admin, body: {currentPassword: 'wrong', newPassword: nextAdminPassword, confirmPassword: nextAdminPassword}})).status, 400);
assert.equal((await api('auth/password', {cookie: admin, body: {currentPassword: adminPassword, newPassword: 'short', confirmPassword: 'short'}})).status, 400);
assert.equal((await api('auth/password', {cookie: admin, body: {currentPassword: adminPassword, newPassword: nextAdminPassword, confirmPassword: 'mismatch'}})).status, 400);
assert.equal((await api('auth/password', {cookie: admin, body: {currentPassword: adminPassword, newPassword: nextAdminPassword, confirmPassword: nextAdminPassword}})).status, 200);
assert.equal((await api('session', {cookie: admin})).status, 401);
assert.equal((await api('session', {cookie: otherAdmin})).status, 401);
assert.equal((await api('session', {cookie: betaCookie})).status, 200, 'administrator password changes preserve client sessions');
assert.equal((await login(adminEmail, adminPassword)).status, 401);
const changedAdmin = await login(adminEmail, nextAdminPassword);
assert.equal(changedAdmin.status, 200);
assert.equal((await api('session', {cookie: changedAdmin.cookie})).data.admin, true);
assert.ok(!sqlite.prepare("SELECT value FROM settings WHERE id='auth:administrator'").get().value.includes(nextAdminPassword));

// Administrator deletion removes one row and its private data, preserving shared accounts.
const deletionEmail = 'delete-client@example.test';
const createDeletionClient = name => api('applications', {cookie: changedAdmin.cookie, body: {assignedEmail: deletionEmail, temporaryPassword: temporary, data: {legalName: name}}});
const deletionClient = await createDeletionClient('Delete synthetic client');
const sharedClient = await createDeletionClient('Keep shared application');
const deletionLogin = await login(deletionEmail, temporary);
await api('auth/password', {cookie: deletionLogin.cookie, body: {currentPassword: temporary, newPassword: permanent, confirmPassword: permanent}});
const deletionCookie = (await login(deletionEmail, permanent)).cookie;
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: deletionCookie, method: 'DELETE'})).status, 403, 'clients cannot delete their own application');
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: betaCookie, method: 'DELETE'})).status, 403, 'clients cannot delete another account');
assert.equal((await api(`applications/${deletionClient.data.id}`, {method: 'DELETE'})).status, 401);
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE', origin: 'https://untrusted.test'})).status, 403);
const privateUpload = new FormData(); privateUpload.append('file', new Blob(['Delete synthetic file']), 'delete.txt');
const deletionFile = await api(`applications/${deletionClient.data.id}/files`, {cookie: changedAdmin.cookie, body: privateUpload});
assert.equal(deletionFile.status, 201);
const objectKey = sqlite.prepare('SELECT object_key FROM attachments WHERE id=?').get(deletionFile.data.id).object_key;
sqlite.prepare('INSERT INTO secrets (application_id,ciphertext,updated_at) VALUES (?,?,?)').run(deletionClient.data.id, 'Synthetic vault data', new Date().toISOString());
failFileDeletion = true;
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE', allowServerError: true})).status, 503);
assert.equal(sqlite.prepare('SELECT status FROM applications WHERE id=?').get(deletionClient.data.id).status, 'deleting');
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: deletionCookie})).status, 409);
assert.ok(!(await api('applications', {cookie: deletionCookie})).data.some(application => application.id === deletionClient.data.id), 'pending deletions are hidden from client lists');
assert.equal((await api(`files/${deletionFile.data.id}`, {cookie: deletionCookie})).status, 409, 'pending deletion blocks file access');
assert.equal((await api(`applications/${deletionClient.data.id}/team`, {cookie: changedAdmin.cookie, method: 'PUT', body: {status: 'draft'}})).status, 409, 'pending deletion cannot be restored by editing status');
failFileDeletion = false;
failBatch = true;
const originalError = console.error; console.error = () => {};
try { assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE', allowServerError: true})).status, 500); } finally { console.error = originalError; failBatch = false; }
assert.ok(sqlite.prepare('SELECT id FROM attachments WHERE id=?').get(deletionFile.data.id), 'failed batch rolls back metadata deletion');
assert.ok(sqlite.prepare('SELECT ciphertext FROM secrets WHERE application_id=?').get(deletionClient.data.id));
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE'})).status, 200, 'failed deletion is retryable');
assert.equal(files.has(objectKey), false);
assert.equal(sqlite.prepare('SELECT id FROM attachments WHERE application_id=?').get(deletionClient.data.id), undefined);
assert.equal(sqlite.prepare('SELECT ciphertext FROM secrets WHERE application_id=?').get(deletionClient.data.id), undefined);
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie})).status, 404);
assert.equal((await api(`applications/${deletionClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE'})).status, 404);
assert.equal((await api(`files/${deletionFile.data.id}`, {cookie: changedAdmin.cookie})).status, 404);
assert.equal((await api('session', {cookie: deletionCookie})).status, 200, 'shared application keeps its login');
assert.equal((await api(`applications/${sharedClient.data.id}`, {cookie: deletionCookie})).status, 200);
assert.equal((await api(`applications/${sharedClient.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE'})).status, 200);
assert.equal((await api('session', {cookie: deletionCookie})).status, 401, 'deleting the last application revokes client access');
assert.equal((await login(deletionEmail, permanent)).status, 401);
assert.equal((await api('session', {cookie: betaCookie})).status, 200);
assert.equal((await api('session', {cookie: changedAdmin.cookie})).status, 200);
const noLogin = await api('applications', {cookie: changedAdmin.cookie, body: {data: {legalName: 'No client login'}}});
onFilePut = () => sqlite.prepare("UPDATE applications SET status='deleting' WHERE id=?").run(noLogin.data.id);
const fileCountBefore = files.size;
assert.equal((await api(`applications/${noLogin.data.id}/files`, {cookie: changedAdmin.cookie, body: privateUpload})).status, 409, 'an upload racing deletion cannot attach a new file');
assert.equal(files.size, fileCountBefore, 'the rejected in-flight upload is removed from storage');
assert.equal((await api(`applications/${noLogin.data.id}`, {cookie: changedAdmin.cookie, method: 'DELETE'})).status, 200);
sqlite.close(); delete globalThis.__cqlTestEnv;
console.log('PASS account API: provisioning, password change/reset, isolation, private files, draft resume, login limits, copied-link autofill, administrator deletion, shared-account preservation, final-account revocation, storage retry, transaction rollback, and upload races');
