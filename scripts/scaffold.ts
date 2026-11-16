// Creates apps/<name> from starters/<kind>.
//   bun scripts/scaffold.ts <name> <kind>          one service (kind: web | admin)
//   bun scripts/scaffold.ts --from .platform/services   every "<name> <kind>" line not created yet
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const NAME = /^[a-z][a-z0-9-]{0,20}$/;

export function parseServices(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const [name, kind] = line.split(/\s+/);
      return { name: name!, kind: kind ?? "web" };
    });
}

function nextPort() {
  const appsDir = path.join(root, "apps");
  const used = readdirSync(appsDir)
    .map((dir) => path.join(appsDir, dir, "package.json"))
    .filter(existsSync)
    .map((file) => Number(/--port (\d+)/.exec(readFileSync(file, "utf8"))?.[1] ?? 0));
  return Math.max(2999, ...used) + 1;
}

function replaceInTree(dir: string, values: Record<string, string>) {
  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry);
    if (statSync(file).isDirectory()) {
      replaceInTree(file, values);
      continue;
    }
    const text = readFileSync(file, "utf8");
    let next = text;
    for (const [key, value] of Object.entries(values)) next = next.replaceAll(key, value);
    if (next !== text) writeFileSync(file, next);
  }
}

export function scaffold(name: string, kind: string) {
  if (!NAME.test(name)) throw new Error(`Invalid service name "${name}" (lowercase, 1-21 chars).`);
  const starter = path.join(root, "starters", kind);
  if (!existsSync(starter)) throw new Error(`Unknown kind "${kind}". Use one of: ${readdirSync(path.join(root, "starters")).join(", ")}`);
  const target = path.join(root, "apps", name);
  if (existsSync(target)) return false;

  const port = String(nextPort());
  cpSync(starter, target, { recursive: true });
  replaceInTree(target, { __SERVICE__: name, __PORT__: port });
  console.log(`created apps/${name} (${kind}, dev port ${port})`);
  return true;
}

if (import.meta.main) {
  const [first, second] = process.argv.slice(2);
  if (first === "--from") {
    const created = parseServices(readFileSync(path.resolve(second!), "utf8")).filter((s) =>
      scaffold(s.name, s.kind),
    );
    if (created.length === 0) console.log("nothing to create");
  } else if (first && second) {
    if (!scaffold(first, second)) console.log(`apps/${first} already exists`);
  } else {
    console.error("usage: bun scripts/scaffold.ts <name> <web|admin> | --from <file>");
    process.exit(1);
  }
}
