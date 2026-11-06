import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { configureToolEnvironment } from './tool-environment.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
configureToolEnvironment(root);
const config = path.join(mkdtempSync(path.join(tmpdir(), 'cql-local-db-')), 'wrangler.json');
writeFileSync(config, JSON.stringify({ name: 'cql-local-db', compatibility_date: '2026-05-15', d1_databases: [{ binding: 'DB', database_name: 'site-creator-d1', database_id: 'd400f966-8a9d-4e81-b106-f3e168158aaf' }] }));
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--config', config, '--persist-to', path.join(root, '.wrangler/state'), '--file', path.join(root, 'db/migrations/postgres/0001_init.sql')], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
