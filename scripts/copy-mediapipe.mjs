import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe/wasm";

mkdirSync(to, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm"]) {
  copyFileSync(`${from}/${file}`, `${to}/${file}`);
}
