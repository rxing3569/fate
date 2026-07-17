import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(
  scriptDir,
  "../../lib/views/ziwei_encyclopedia_view.dart",
);
const outputPath = resolve(scriptDir, "../data/star-course-data.json");
const source = await readFile(sourcePath, "utf8");

class DartLiteralParser {
  constructor(input) {
    this.input = input;
    this.index = 0;
  }

  parse() {
    const value = this.parseValue();
    this.skipIgnored();
    return value;
  }

  skipIgnored() {
    while (this.index < this.input.length) {
      if (/\s/.test(this.input[this.index])) {
        this.index += 1;
        continue;
      }
      if (this.input.startsWith("//", this.index)) {
        const newline = this.input.indexOf("\n", this.index + 2);
        this.index = newline < 0 ? this.input.length : newline + 1;
        continue;
      }
      if (this.input.startsWith("/*", this.index)) {
        const end = this.input.indexOf("*/", this.index + 2);
        this.index = end < 0 ? this.input.length : end + 2;
        continue;
      }
      break;
    }
  }

  parseValue() {
    this.skipIgnored();
    const character = this.input[this.index];
    if (character === "{") return this.parseMap();
    if (character === "[") return this.parseList();
    if (character === "'" || character === '"') {
      let value = this.parseString();
      this.skipIgnored();
      while (this.input[this.index] === "'" || this.input[this.index] === '"') {
        value += this.parseString();
        this.skipIgnored();
      }
      return value;
    }
    if (this.input.startsWith("null", this.index)) {
      this.index += 4;
      return null;
    }
    throw new Error(
      `Unsupported Dart literal at ${this.index}: ${this.input.slice(this.index, this.index + 30)}`,
    );
  }

  parseString() {
    const quote = this.input[this.index];
    this.index += 1;
    let value = "";
    while (this.index < this.input.length) {
      const character = this.input[this.index];
      this.index += 1;
      if (character === quote) return value;
      if (character !== "\\") {
        value += character;
        continue;
      }
      const escaped = this.input[this.index];
      this.index += 1;
      value +=
        escaped === "n"
          ? "\n"
          : escaped === "r"
            ? "\r"
            : escaped === "t"
              ? "\t"
              : escaped;
    }
    throw new Error("Unterminated Dart string literal");
  }

  parseMap() {
    this.index += 1;
    const result = {};
    while (this.index < this.input.length) {
      this.skipIgnored();
      if (this.input[this.index] === "}") {
        this.index += 1;
        return result;
      }
      const key = this.parseValue();
      this.skipIgnored();
      if (this.input[this.index] !== ":") throw new Error("Expected map colon");
      this.index += 1;
      result[key] = this.parseValue();
      this.skipIgnored();
      if (this.input[this.index] === ",") this.index += 1;
    }
    throw new Error("Unterminated Dart map literal");
  }

  parseList() {
    this.index += 1;
    const result = [];
    while (this.index < this.input.length) {
      this.skipIgnored();
      if (this.input[this.index] === "]") {
        this.index += 1;
        return result;
      }
      result.push(this.parseValue());
      this.skipIgnored();
      if (this.input[this.index] === ",") this.index += 1;
    }
    throw new Error("Unterminated Dart list literal");
  }
}

function extractLiteral(name) {
  const marker = new RegExp(
    `(?:const|final)\\s+(?:Map|List)<[^;=]+>\\s+${name}\\s*=`,
  );
  const match = marker.exec(source);
  if (!match) throw new Error(`Unable to find ${name} in original App source`);
  const start = source.slice(match.index + match[0].length).search(/[\[{]/);
  if (start < 0) throw new Error(`Unable to find literal body for ${name}`);
  return new DartLiteralParser(
    source.slice(match.index + match[0].length + start),
  ).parse();
}

const names = [
  "_palaceNames",
  "_palaceFocus",
  "_majorStarHighlights",
  "_supportStarHighlights",
  "_supportStarPalaceEffects",
  "_luckyStarPalaceEffects",
  "_maleficStarPalaceEffects",
  "_miscStarPalaceEffects",
  "_changShengGodPalaceEffects",
  "_boShiGodPalaceEffects",
  "_suiJianGodPalaceEffects",
  "_jiangQianGodPalaceEffects",
];

const output = Object.fromEntries(
  names.map((name) => [name.replace(/^_/, ""), extractLiteral(name)]),
);

const expectedCounts = {
  palaceNames: 12,
  majorStarHighlights: 14,
  supportStarHighlights: 14,
  luckyStarPalaceEffects: 8,
  maleficStarPalaceEffects: 6,
  miscStarPalaceEffects: 34,
  changShengGodPalaceEffects: 12,
  boShiGodPalaceEffects: 12,
  suiJianGodPalaceEffects: 12,
  jiangQianGodPalaceEffects: 12,
};
for (const [key, expected] of Object.entries(expectedCounts)) {
  const actual = Array.isArray(output[key])
    ? output[key].length
    : Object.keys(output[key] || {}).length;
  if (actual !== expected)
    throw new Error(`${key} expected ${expected} entries, received ${actual}`);
}
for (const key of [
  "luckyStarPalaceEffects",
  "maleficStarPalaceEffects",
]) {
  for (const [name, effects] of Object.entries(output[key])) {
    if (Object.keys(effects).length !== 12)
      throw new Error(`${key}.${name} does not contain all 12 palaces`);
  }
}
for (const key of [
  "miscStarPalaceEffects",
  "changShengGodPalaceEffects",
  "boShiGodPalaceEffects",
  "suiJianGodPalaceEffects",
  "jiangQianGodPalaceEffects",
]) {
  for (const [name, effects] of Object.entries(output[key])) {
    if (effects.length !== 12)
      throw new Error(`${key}.${name} does not contain all 12 palaces`);
  }
}

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Generated ${outputPath} from ${sourcePath}`);
