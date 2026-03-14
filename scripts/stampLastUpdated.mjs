import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const conflictPath = resolve(root, "public/conflict_data.json");

const conflictData = JSON.parse(readFileSync(conflictPath, "utf8"));

if (!Array.isArray(conflictData) || conflictData.length === 0) {
  throw new Error("public/conflict_data.json is empty or invalid.");
}

const timestamp = new Date().toISOString();
let changed = false;

const stamped = conflictData.map((conflict) => {
  if (conflict.last_updated === timestamp) {
    return conflict;
  }

  changed = true;
  return {
    ...conflict,
    last_updated: timestamp,
  };
});

if (changed) {
  writeFileSync(conflictPath, `${JSON.stringify(stamped, null, 2)}\n`);
}

console.log(`Stamped conflict_data.json with ${timestamp}`);
