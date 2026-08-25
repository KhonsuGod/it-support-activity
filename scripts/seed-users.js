const { ensureUserSchema, upsertUser } = require("../api/_db");
const { hashPassword } = require("../api/_password");

const seedJson = process.env.SEED_USERS_JSON;

if (!seedJson) {
  console.error("SEED_USERS_JSON is required");
  process.exit(1);
}

(async () => {
  const users = JSON.parse(seedJson);
  await ensureUserSchema();
  for (const user of users) {
    await upsertUser({
      username: String(user.username || "").trim().toLowerCase(),
      displayName: String(user.displayName || user.username || "").trim(),
      passwordHash: await hashPassword(user.password),
      role: String(user.role || "staff").trim().toLowerCase(),
      isActive: user.isActive === false ? 0 : 1
    });
  }
  console.log(`Seeded ${users.length} users`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
