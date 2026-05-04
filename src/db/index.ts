import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function stripSslmode(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*&?/gi, '$1')
    .replace(/[?&]$/, '');
}

function buildConfig(): PoolConfig {
  const url = process.env.POSTGRES_URL;
  if (process.env.NODE_ENV !== 'production') {
    return { connectionString: url };
  }
  const caPath = join(process.cwd(), 'certs', 'rds-global-bundle.pem');
  const ca = readFileSync(caPath, 'utf8');
  console.log(`[db] loaded RDS CA bundle (${ca.length} bytes) from ${caPath}`);
  return {
    connectionString: url ? stripSslmode(url) : undefined,
    ssl: { ca, rejectUnauthorized: true },
  };
}

const pool = new Pool(buildConfig());
export const db = drizzle(pool);
