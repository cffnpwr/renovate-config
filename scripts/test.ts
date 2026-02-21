import { execSync } from "node:child_process";
import { glob, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type } from "arktype";

const renovateConfigSchema = "https://docs.renovatebot.com/renovate-schema.json";
const renovateConfigType = type("string.json.parse").to({
  $schema: "string",
});

const isRenovateConfigFile = async (path: string): Promise<boolean> => {
  if (path.includes("/node_modules/")) return false;
  if (!path.endsWith(".json")) return false;

  const content = await readFile(path, { encoding: "utf-8" });
  const parseResult = renovateConfigType(content);
  if (parseResult instanceof type.errors) {
    return false;
  }

  if (parseResult.$schema !== renovateConfigSchema) {
    return false;
  }
  return true;
};

const main = async () => {
  const pjRoot = fileURLToPath(new URL("../", import.meta.url));
  const files = glob(["./**/*.json", "!**/node_modules/**"], { cwd: pjRoot });

  const targetFiles: string[] = [];
  for await (const file of files) {
    const path = resolve(pjRoot, file);
    if (await isRenovateConfigFile(path)) {
      targetFiles.push(path);
    }
  }

  execSync(`pnpm exec renovate-config-validator --strict ${targetFiles.join(" ")}`, {
    stdio: "inherit",
  });
};

await main();
