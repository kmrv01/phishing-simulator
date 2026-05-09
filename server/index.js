import http from "node:http";
import { URL } from "node:url";
import {
  hashPassword,
  initDb,
  mapAttempt,
  mapUser,
  pool,
  verifyPassword,
} from "./db.js";

const PORT = Number(process.env.PORT || 4000);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendEmpty(res, status = 204) {
  res.writeHead(status);
  res.end();
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Некорректный JSON в запросе."));
      }
    });
    req.on("error", reject);
  });
}

async function listUsers() {
  const { rows } = await pool.query(`
    SELECT id, name, email, role, department, job_title, avatar, created_at
    FROM users
    ORDER BY id ASC
  `);
  return rows.map(mapUser);
}

async function listAttempts() {
  const { rows } = await pool.query(`
    SELECT id, user_id, created_at, risk_score, attack_type, difficulty, outcome_label, payload
    FROM attempts
    ORDER BY created_at ASC
  `);
  return rows.map(mapAttempt);
}

async function ensureAdminUser() {
  const email = "admin@phishguard.kz";
  const { rows } = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (rows.length > 0) return;

  const passwordHash = await hashPassword("admin123");
  await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role, department, job_title)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    ["Администратор системы", email, passwordHash, "admin", "IT", "Администратор"],
  );
}

async function handleBootstrap(_req, res) {
  await ensureAdminUser();
  const [users, attempts] = await Promise.all([listUsers(), listAttempts()]);
  sendJson(res, 200, { users, attempts });
}

async function handleRegister(req, res) {
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!name || !email || !password) {
    return sendError(res, 400, "Нужно заполнить имя, email и пароль.");
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rows.length > 0) {
    return sendError(res, 409, "Пользователь с таким email уже существует.");
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role, department, job_title, avatar)
      VALUES ($1, $2, $3, 'user', '', '', '')
      RETURNING id, name, email, role, department, job_title, avatar, created_at
    `,
    [name, email, passwordHash],
  );

  sendJson(res, 201, { user: mapUser(rows[0]) });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return sendError(res, 400, "Нужно указать email и пароль.");
  }

  const { rows } = await pool.query(
    `
      SELECT id, name, email, role, department, job_title, avatar, created_at, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const row = rows[0];
  if (!row) {
    return sendError(res, 401, "Неверный email или пароль.");
  }

  const isValid = await verifyPassword(password, row.password_hash);
  if (!isValid) {
    return sendError(res, 401, "Неверный email или пароль.");
  }

  sendJson(res, 200, { user: mapUser(row) });
}

async function handleUserUpdate(req, res, userId) {
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const department = String(body.department || "").trim();
  const jobTitle = String(body.jobTitle || "").trim();
  const avatar = typeof body.avatar === "string" ? body.avatar : "";
  const oldPassword = String(body.oldPassword || "").trim();
  const password = String(body.password || "").trim();

  const { rows } = await pool.query(
    `
      SELECT id, name, email, role, department, job_title, avatar, created_at, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  const existingUser = rows[0];
  if (!existingUser) {
    return sendError(res, 404, "Пользователь не найден.");
  }

  const emailOwner = await pool.query("SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1", [email, userId]);
  if (emailOwner.rows.length > 0) {
    return sendError(res, 409, "Пользователь с таким email уже существует.");
  }

  let passwordHash = existingUser.password_hash;
  if (password) {
    const validOldPassword = await verifyPassword(oldPassword, existingUser.password_hash);
    if (!validOldPassword) {
      return sendError(res, 400, "Старый пароль указан неверно.");
    }
    passwordHash = await hashPassword(password);
  }

  const { rows: updatedRows } = await pool.query(
    `
      UPDATE users
      SET name = $2,
          email = $3,
          department = $4,
          job_title = $5,
          avatar = $6,
          password_hash = $7
      WHERE id = $1
      RETURNING id, name, email, role, department, job_title, avatar, created_at
    `,
    [userId, name, email, department, jobTitle, avatar, passwordHash],
  );

  sendJson(res, 200, { user: mapUser(updatedRows[0]) });
}

async function handleUserDelete(_req, res, userId) {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  sendEmpty(res, 204);
}

async function handleAttemptCreate(req, res) {
  const body = await readBody(req);
  const attempt = body.attempt;

  if (!attempt || !attempt.userId || !attempt.id) {
    return sendError(res, 400, "Некорректные данные попытки.");
  }

  const { rows } = await pool.query(
    `
      INSERT INTO attempts (id, user_id, created_at, risk_score, attack_type, difficulty, outcome_label, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET payload = EXCLUDED.payload,
          risk_score = EXCLUDED.risk_score,
          attack_type = EXCLUDED.attack_type,
          difficulty = EXCLUDED.difficulty,
          outcome_label = EXCLUDED.outcome_label,
          created_at = EXCLUDED.created_at
      RETURNING id, user_id, created_at, risk_score, attack_type, difficulty, outcome_label, payload
    `,
    [
      attempt.id,
      attempt.userId,
      attempt.createdAt || new Date().toISOString(),
      Number(attempt.riskScore || 0),
      String(attempt.attackType || ""),
      String(attempt.difficulty || ""),
      String(attempt.outcomeLabel || ""),
      JSON.stringify(attempt),
    ],
  );

  sendJson(res, 201, { attempt: mapAttempt(rows[0]) });
}

async function handleLegacyMigrate(req, res) {
  const body = await readBody(req);
  const users = Array.isArray(body.users) ? body.users : [];
  const attempts = Array.isArray(body.attempts) ? body.attempts : [];

  for (const user of users) {
    const email = String(user.email || "").trim().toLowerCase();
    const name = String(user.name || "").trim();
    const password = String(user.password || "").trim();
    if (!email || !name || !password) continue;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
    if (existing.rows.length > 0) continue;

    const passwordHash = await hashPassword(password);
    await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role, department, job_title, avatar, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        name,
        email,
        passwordHash,
        user.role || "user",
        user.department || "",
        user.jobTitle || "",
        user.avatar || "",
        user.createdAt || new Date().toISOString(),
      ],
    );
  }

  const emailMapRows = await pool.query("SELECT id, email FROM users");
  const userIdByEmail = new Map(emailMapRows.rows.map((row) => [row.email, Number(row.id)]));

  for (const attempt of attempts) {
    const legacyUser = users.find((item) => Number(item.id) === Number(attempt.userId));
    const mappedUserId = legacyUser ? userIdByEmail.get(String(legacyUser.email || "").trim().toLowerCase()) : null;
    if (!mappedUserId || !attempt?.id) continue;

    await pool.query(
      `
        INSERT INTO attempts (id, user_id, created_at, risk_score, attack_type, difficulty, outcome_label, payload)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        attempt.id,
        mappedUserId,
        attempt.createdAt || new Date().toISOString(),
        Number(attempt.riskScore || 0),
        String(attempt.attackType || ""),
        String(attempt.difficulty || ""),
        String(attempt.outcomeLabel || ""),
        JSON.stringify({ ...attempt, userId: mappedUserId }),
      ],
    );
  }

  const [serverUsers, serverAttempts] = await Promise.all([listUsers(), listAttempts()]);
  sendJson(res, 200, { users: serverUsers, attempts: serverAttempts });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return sendEmpty(res);
  }

  try {
    if (req.method === "GET" && url.pathname === "/db-api/health") {
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/db-api/bootstrap") {
      return await handleBootstrap(req, res);
    }
    if (req.method === "POST" && url.pathname === "/db-api/migrate") {
      return await handleLegacyMigrate(req, res);
    }
    if (req.method === "POST" && url.pathname === "/db-api/auth/register") {
      return await handleRegister(req, res);
    }
    if (req.method === "POST" && url.pathname === "/db-api/auth/login") {
      return await handleLogin(req, res);
    }
    if (req.method === "POST" && url.pathname === "/db-api/attempts") {
      return await handleAttemptCreate(req, res);
    }

    const userMatch = url.pathname.match(/^\/db-api\/users\/(\d+)$/);
    if (userMatch && req.method === "PUT") {
      return await handleUserUpdate(req, res, Number(userMatch[1]));
    }
    if (userMatch && req.method === "DELETE") {
      return await handleUserDelete(req, res, Number(userMatch[1]));
    }

    return sendError(res, 404, "Маршрут не найден.");
  } catch (error) {
    return sendError(res, 500, error instanceof Error ? error.message : "Внутренняя ошибка сервера.");
  }
});

initDb()
  .then(ensureAdminUser)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`PostgreSQL API server started on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start PostgreSQL API server:", error);
    process.exit(1);
  });

