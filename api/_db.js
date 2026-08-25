const mysql = require("mysql2/promise");

let pool;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MARIADB_URL || "";
}

function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

function getPool() {
  if (pool) return pool;
  const uri = getDatabaseUrl();
  if (!uri) {
    const error = new Error("DATABASE_URL is not configured");
    error.statusCode = 503;
    throw error;
  }
  pool = mysql.createPool({
    uri,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 4),
    namedPlaceholders: true
  });
  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params || {});
  return rows;
}

async function ensureUserSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'staff',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_username_unique (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function findUserByUsername(username) {
  const rows = await query(
    "SELECT id, username, display_name AS displayName, password_hash AS passwordHash, role, is_active AS isActive FROM users WHERE username = :username LIMIT 1",
    { username }
  );
  return rows[0] || null;
}

async function listUsers() {
  return query(
    "SELECT id, username, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY role = 'admin' DESC, username ASC"
  );
}

async function upsertUser(user) {
  await query(
    `INSERT INTO users (username, display_name, password_hash, role, is_active)
     VALUES (:username, :displayName, :passwordHash, :role, :isActive)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       is_active = VALUES(is_active)`,
    user
  );
}

async function updateUser(id, fields) {
  const sets = [];
  const params = { id };
  ["displayName", "passwordHash", "role", "isActive"].forEach((key) => {
    if (fields[key] === undefined) return;
    const column = {
      displayName: "display_name",
      passwordHash: "password_hash",
      role: "role",
      isActive: "is_active"
    }[key];
    sets.push(`${column} = :${key}`);
    params[key] = fields[key];
  });
  if (!sets.length) return;
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = :id`, params);
}

module.exports = {
  ensureUserSchema,
  findUserByUsername,
  hasDatabaseConfig,
  listUsers,
  query,
  updateUser,
  upsertUser
};
