import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';
async function api(path, { cookie, body, origin = base, headers = {} } = {}) {
  const response = await fetch(base + '/api/' + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, Connection: 'close', ...headers, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  if (response.status >= 500) throw new Error(path + ': HTTP ' + response.status + ' ' + text);
  return new Response(text, { status: response.status, headers: response.headers });
}
assert.equal((await api('auth/password', { body: { currentPassword: 'wrong', newPassword: 'test', confirmPassword: 'test' } })).status, 401);
assert.equal((await api('auth/login', { body: {} })).status, 401);
for (const path of ['session', 'applications', 'applications/private', 'files/private', 'price-lists/private']) assert.equal((await api(path)).status, 401, path + ' requires sign-in');
assert.equal((await api('session', { headers: { 'oai-authenticated-user-id': 'local_seedy', 'oai-authenticated-user-email': 'chito@ideahubsolutionsinc.com' } })).status, 401);
assert.equal((await api('auth/login', { body: { email: 'chito@ideahubsolutionsinc.com', password: 'incorrect' } })).status, 401);
assert.equal((await api('auth/login', { origin: 'https://untrusted.example', body: { email: 'test', password: 'test' } })).status, 403);
console.log('PASS protected APIs, hosting-header bypass rejection, incorrect credentials, and cross-origin login rejection');
if (process.env.ADMIN_TEST_PASSWORD) {
  const response = await api('auth/login', { body: { email: 'chito@ideahubsolutionsinc.com', password: process.env.ADMIN_TEST_PASSWORD } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const session = await (await api('session', { cookie })).json();
  assert.equal(session.admin, true);
  assert.equal(session.user.email, 'chito@ideahubsolutionsinc.com');
  assert.equal((await api('applications', { cookie })).status, 200);
  assert.equal((await api('session', { cookie: cookie + 'a' })).status, 401);
  assert.equal((await api('auth/password', { cookie, body: { currentPassword: 'wrong', newPassword: 'Synthetic replacement 123!', confirmPassword: 'Synthetic replacement 123!' } })).status, 400);
  assert.equal((await api('session', { cookie })).status, 200);
  if (process.env.ALLOW_PASSWORD_CHANGE_TEST === '1') {
    const replacement = 'Synthetic API replacement ' + crypto.randomUUID();
    assert.equal((await api('auth/password', { cookie, body: { currentPassword: process.env.ADMIN_TEST_PASSWORD, newPassword: replacement, confirmPassword: 'mismatch' } })).status, 400);
    assert.equal((await api('auth/password', { cookie, body: { currentPassword: process.env.ADMIN_TEST_PASSWORD, newPassword: replacement, confirmPassword: replacement } })).status, 200);
    assert.equal((await api('session', { cookie })).status, 401);
    assert.equal((await api('auth/login', { body: { email: 'chito@ideahubsolutionsinc.com', password: process.env.ADMIN_TEST_PASSWORD } })).status, 401);
    const changedLogin = await api('auth/login', { body: { email: 'chito@ideahubsolutionsinc.com', password: replacement } });
    assert.equal(changedLogin.status, 200);
    const changedCookie = changedLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api('session', { cookie: changedCookie })).status, 200);
    await api('auth/logout', { cookie: changedCookie, body: {} });
    console.log('PASS password change, default credential retirement, session invalidation, and new credential login');
  }
  assert.equal((await api('auth/logout', { cookie, body: {} })).status, 200);
  assert.equal((await api('session', { cookie })).status, 401);
  console.log('PASS administrator sign-in, dashboard data access, tampered cookies, sign-out, and replay rejection');
} else console.log('SKIP successful sign-in checks: provide ADMIN_TEST_PASSWORD');
