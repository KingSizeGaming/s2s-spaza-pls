import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

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

  const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION ?? "af-south-1",
  });

  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: "spaza/POSTGRES_URL" })
  );

  cachedPool = new Pool({
    connectionString: secret.SecretString!,
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
