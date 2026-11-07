import assert from 'node:assert/strict';
import { neonConfig } from '@neondatabase/serverless';
import { createNeonDatabase } from '../lib/vercel-workers-env.ts';

// Exercise the real Neon driver without contacting a database or external service.
const originalFetch = neonConfig.fetchFunction;
const requests = [];
try {
  neonConfig.fetchFunction = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    return new Response(JSON.stringify({results: request.queries.map(() => ({fields: [{name: 'changed', dataTypeID: 23}], rows: [[1]], rowCount: 1, command: 'DELETE'}))}), {status: 200});
  };
  const db = createNeonDatabase('postgresql://synthetic:synthetic@database.example.test/synthetic');
  const results = await db.batch([
    db.prepare('DELETE FROM attachments WHERE application_id=?').bind('synthetic-application'),
    db.prepare('DELETE FROM secrets WHERE application_id=?').bind('synthetic-application'),
    db.prepare('DELETE FROM applications WHERE id=?').bind('synthetic-application'),
  ]);
  assert.equal(requests.length, 1, 'all deletes use one transaction request');
  assert.equal(requests[0].queries.length, 3);
  for (const query of requests[0].queries) {
    assert.match(query.query, /\$1/);
    assert.match(query.query, /RETURNING 1 AS changed$/);
    assert.deepEqual(query.params, ['synthetic-application']);
  }
  assert.deepEqual(results.map(result => result.meta.changes), [1, 1, 1]);
  neonConfig.fetchFunction = async () => new Response(JSON.stringify({message: 'Synthetic transaction failure', code: 'XX000'}), {status: 400});
  await assert.rejects(db.batch([db.prepare('DELETE FROM applications WHERE id=?').bind('synthetic-application')]), /Synthetic transaction failure/);
} finally { neonConfig.fetchFunction = originalFetch; }
console.log('PASS Postgres adapter: atomic batch request, parameter binding, change counts, and transaction failures');
