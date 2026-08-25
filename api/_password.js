const crypto = require("node:crypto");

const ITERATIONS = 180000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("base64url");
    crypto.pbkdf2(String(password || ""), salt, ITERATIONS, KEY_LENGTH, DIGEST, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`pbkdf2$${DIGEST}$${ITERATIONS}$${salt}$${derivedKey.toString("base64url")}`);
    });
  });
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2") return false;
  const [, digest, iterations, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const actual = await new Promise((resolve, reject) => {
    crypto.pbkdf2(String(password || ""), salt, Number(iterations), expected.length, digest, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  hashPassword,
  verifyPassword
};
