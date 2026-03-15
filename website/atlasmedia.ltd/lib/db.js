import pg from "pg";

const { Pool } = pg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === "false" ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}
