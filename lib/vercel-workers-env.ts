import { neon } from "@neondatabase/serverless";
import { del, get, put } from "@vercel/blob";

type QueryRows = Record<string, unknown>[];

function createNeonDatabase(connectionString: string) {
  const sql = neon(connectionString);

  const execute = async (statement: string, parameters: unknown[] = []) => {
    const { text, values, returnsRows } = toPostgres(statement, parameters);
    const rows = (await sql.query(text, values)) as QueryRows;
    return { rows, changes: returnsRows ? rows.length : 0 };
  };

  return {
    prepare(statement: string) {
      let parameters: unknown[] = [];
      const bound = {
        bind(...values: unknown[]) {
          parameters = values;
          return bound;
        },
        async first<T = Record<string, unknown>>() {
          const result = await execute(statement, parameters);
          return (result.rows[0] as T | undefined) ?? null;
        },
        async all<T = Record<string, unknown>>() {
          const result = await execute(statement, parameters);
          return { results: result.rows as T[] };
        },
        async run() {
          const result = await execute(statement, parameters);
          return { success: true, meta: { changes: result.changes } };
        },
      };
      return bound;
    },
  };
}

function toPostgres(statement: string, parameters: unknown[]) {
  let sql = statement.trim().replace(/;\s*$/, "");
  sql = sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO");
  sql = sql.replace(
    /json_extract\(pricing_snapshot,\s*'\$\.priceList\.id'\)/g,
    "(pricing_snapshot::jsonb #>> '{priceList,id}')",
  );

  let index = 0;
  sql = sql.replace(/\?/g, () => `$${++index}`);
  const ignoredConflict = /^INSERT\s+OR\s+IGNORE/i.test(statement.trim());
  if (ignoredConflict) sql += " ON CONFLICT DO NOTHING";

  const returnsRows = /^(INSERT|UPDATE|DELETE)\b/i.test(sql);
  if (returnsRows) sql += " RETURNING 1 AS changed";
  return { text: sql, values: parameters, returnsRows };
}

const database = process.env.DATABASE_URL
  ? createNeonDatabase(process.env.DATABASE_URL)
  : undefined;

const bucket = {
  async put(
    key: string,
    body: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ) {
    return put(key, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: options?.httpMetadata?.contentType ?? "application/octet-stream",
      allowOverwrite: false,
    });
  },
  async get(key: string) {
    const result = await get(key, { access: "private" });
    return result?.statusCode === 200 && result.stream
      ? { body: result.stream }
      : null;
  },
  async delete(key: string) {
    return del(key);
  },
};

export const env = {
  DB: database,
  BUCKET: process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.BLOB_READ_WRITE_TOKEN
    ? bucket
    : undefined,
  VAULT_KEY: process.env.VAULT_KEY,
};
