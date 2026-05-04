import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadSslConfig(): PoolConfig['ssl'] {
  if (process.env.NODE_ENV !== 'production') return undefined;
  const caPath = join(process.cwd(), 'certs', 'rds-global-bundle.pem');
  return { ca: readFileSync(caPath, 'utf8') };
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: loadSslConfig(),
});
export const db = drizzle(pool);
