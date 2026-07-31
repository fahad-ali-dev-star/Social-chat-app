import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "middleware/auth.js",
  "middleware/validation.js",
  "middleware/errorHandler.js",
  "config/cloudinary.js",
  "routes/uploadRoutes.js",
  "server.js",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Missing ${relative}`);
}

const source = fs.readFileSync(path.join(root, "server.js"), "utf8");
for (const marker of ["X-Content-Type-Options", "Strict-Transport-Security", "authLimiter", "uploadLimiter", "errorHandler"]) {
  if (!source.includes(marker)) throw new Error(`Missing security marker: ${marker}`);
}
console.log("Phase 5 static verification passed.");
