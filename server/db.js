import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/phishing_simulator";

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

function scryptAsync(value, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, key] = storedHash.split(":");
  const derivedKey = await scryptAsync(password, salt);
  const expected = Buffer.from(key, "hex");

  if (expected.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(expected, derivedKey);
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      risk_score INTEGER NOT NULL DEFAULT 0,
      attack_type TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT '',
      outcome_label TEXT NOT NULL DEFAULT '',
      payload JSONB NOT NULL
    );
  `);
}

export function mapUser(row) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    jobTitle: row.job_title,
    avatar: row.avatar,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function mapAttempt(row) {
  return {
    ...row.payload,
    id: Number(row.id),
    userId: Number(row.user_id),
    riskScore: row.risk_score,
    attackType: row.attack_type,
    difficulty: row.difficulty,
    outcomeLabel: row.outcome_label,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

