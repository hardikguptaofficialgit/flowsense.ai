import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = __dirname;
const rootDir = path.resolve(backendDir, "..");

const envFiles = [
  path.join(rootDir, ".env"),
  path.join(backendDir, ".env"),
];

for (const envFile of envFiles) {
  dotenv.config({ path: envFile, override: false, quiet: true });
}

export function getBackendPort() {
  return Number(process.env.PORT || process.env.BACKEND_PORT) || 5000;
}
