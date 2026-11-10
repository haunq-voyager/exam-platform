// Serve the MediaPipe WASM runtime from our own origin. It is copied from node_modules so its version
// always matches the installed @mediapipe/tasks-vision JS API (a mismatch breaks face detection).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe", "wasm");

if (!existsSync(source)) {
  console.error(`MediaPipe WASM not found at ${source}. Run "npm install" first.`);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
console.log("Copied MediaPipe WASM to public/mediapipe/wasm");
