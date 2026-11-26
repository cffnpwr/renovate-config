import { execSync } from "node:child_process";
import { glob, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { dirname, join, normalize } from "node:path/posix";
import { fileURLToPath } from "node:url";

import { type } from "arktype";

const renovateConfigSchema = "https://docs.renovatebot.com/renovate-schema.json";
const entryPointPatterns = ["default.json", "renovate.json", "presets/*.json"];
const presetFileExtensionPattern = /\.json[5c]?$/;

const renovateConfigType = type("string").pipe.try(
  (content) => Bun.JSONC.parse(content),
  type({ $schema: type.unit(renovateConfigSchema) }),
);
const jsonArrayType = type("unknown[]");
const jsonObjectType = type("Record<string, unknown>");
const presetReferencesType = type("string[]");

// extendsは任意の階層（packageRulesの要素等）に出現するため再帰的に収集
const collectExtends = (value: unknown): string[] => {
  if (jsonArrayType.allows(value)) return value.flatMap(collectExtends);
  if (!jsonObjectType.allows(value)) return [];

  return Object.entries(value).flatMap(([key, child]) => (key === "extends" && presetReferencesType.allows(child)
    ? child
    : collectExtends(child)));
};

const isRelativePresetReference = (reference: string): boolean => reference.startsWith("./") || reference.startsWith("../") || reference.startsWith("/");

const resolvePresetPath = (reference: string, referencedFrom: string): string => {
  // 末尾の括弧内はプリセットのパラメータ
  const presetName = reference.includes("(") ? reference.slice(0, reference.indexOf("(")) : reference;

  // 「/」始まりはリポジトリのルート、それ以外は参照元のディレクトリが基準
  return presetName.startsWith("/")
    ? normalize(presetName.slice(1))
    : normalize(join(dirname(referencedFrom), presetName));
};

const isOutsideRepository = (presetPath: string): boolean => presetPath === ".." || presetPath.startsWith("../");

// 拡張子を省略した参照はRenovateが「.json」を補完
const toPresetFilePath = (presetPath: string): string => (presetFileExtensionPattern.test(presetPath) ? presetPath : `${presetPath}.json`);

const main = async () => {
  const pjRoot = fileURLToPath(new URL("../", import.meta.url));

  const renovateConfigFiles = new Set<string>();
  const errors: string[] = [];
  const unvisitedFiles = await Array.fromAsync(glob(entryPointPatterns, { cwd: pjRoot }));
  for (let file = unvisitedFiles.shift(); file !== undefined; file = unvisitedFiles.shift()) {
    if (renovateConfigFiles.has(file)) continue;
    renovateConfigFiles.add(file);

    let content: string;
    try {
      content = await readFile(resolve(pjRoot, file), { encoding: "utf-8" });
    } catch (error) {
      errors.push(`${file}: ${String(error)}`);
      continue;
    }

    const config = renovateConfigType(content);
    if (config instanceof type.errors) {
      errors.push(`${file}: ${config.summary}`);
      continue;
    }

    for (const reference of collectExtends(config).filter(isRelativePresetReference)) {
      const presetPath = resolvePresetPath(reference, file);
      if (isOutsideRepository(presetPath)) {
        errors.push(`${file}: preset reference "${reference}" points outside the repository`);
        continue;
      }

      unvisitedFiles.push(toPresetFilePath(presetPath));
    }
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  const renovateConfigPaths = [...renovateConfigFiles].map((file) => resolve(pjRoot, file));
  execSync(`bunx --bun renovate-config-validator --strict ${renovateConfigPaths.join(" ")}`, {
    stdio: "inherit",
  });
};

await main();
