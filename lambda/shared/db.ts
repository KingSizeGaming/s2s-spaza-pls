import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import rdsCa from "../../certs/rds-global-bundle.pem";

let cachedDb: ReturnType<typeof drizzle> | null = null;
let cachedPool: Pool | null = null;

/**
 * Returns a cached Drizzle DB instance, fetching POSTGRES_URL from Secrets Manager
 * on the first cold-start invocation. Subsequent calls in the same execution
 * environment reuse the cached connection pool.
 *
 * Pool size is capped at 2 — Lambda functions run concurrently and each instance
 * maintains its own pool, so a large pool size would exhaust RDS connections.
 *
 * @returns A Drizzle ORM instance connected to RDS
 */
export async function getDb() {
  if (cachedDb) return cachedDb;

  let connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    const secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION ?? "af-south-1",
    });
    const secret = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: "spaza/POSTGRES_URL" })
    );
    connectionString = secret.SecretString!;
  }

  cachedPool = new Pool({
    connectionString,
    ssl: { ca: rdsCa, rejectUnauthorized: true },
    max: 2,
  });

  cachedDb = drizzle(cachedPool);
  return cachedDb;
}

/**
 * Closes the connection pool and clears the cache. Call at the end of
 * infrequently-invoked handlers (e.g. prize-draw) to free RDS connections.
 */
export async function closeDb() {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
    cachedDb = null;
  }
}
