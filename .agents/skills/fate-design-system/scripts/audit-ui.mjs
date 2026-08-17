#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const command = args.shift();

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function filesOption() {
  const index = args.indexOf("--files");
  if (index === -1) return [];
  return args.slice(index + 1).filter((value) => !value.startsWith("--"));
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

async function contents(paths) {
  const entries = {};
  for (const path of paths) {
    const absolute = resolve(path);
    try {
      entries[path] = await readFile(absolute, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      entries[path] = null;
    }
  }
  return entries;
}

function changedLines(before, after) {
  if (before === null) return after.split("\n").map((line, index) => ({ line, number: index + 1 }));
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const counts = new Map();
  for (const line of oldLines) counts.set(line, (counts.get(line) || 0) + 1);
  return newLines.flatMap((line, index) => {
    const remaining = counts.get(line) || 0;
    if (remaining) {
      counts.set(line, remaining - 1);
      return [];
    }
    return [{ line, number: index + 1 }];
  });
}

const rawColor = /(?:#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\()/i;
const numericZ = /z-index\s*:\s*(?!var\()[0-9-]+/i;
const unapprovedBreakpoint = /@media[^\n]*(?:max|min)-width\s*:\s*(\d+)px/i;
const duplicatePattern = /(?:class|name|id)[^\n]*(?:snackbar|toast|loader|loading|bottom-sheet|modal|dialog)/i;
const tokenFile = /assets\/css\/main\.css$/;

function audit(path, before, after) {
  const errors = [];
  const warnings = [];
  const additions = changedLines(before, after);
  const rootLines = new Set();
  let rootDepth = 0;
  let inRoot = false;
  after.split("\n").forEach((line, index) => {
    if (/:root\s*\{/.test(line)) inRoot = true;
    if (!inRoot) return;
    rootLines.add(index + 1);
    rootDepth += (line.match(/\{/g) || []).length;
    rootDepth -= (line.match(/\}/g) || []).length;
    if (rootDepth <= 0 && /}/.test(line)) inRoot = false;
  });

  for (const { line, number } of additions) {
    const location = `${path}:${number}`;
    const isTokenDeclaration = tokenFile.test(path) && rootLines.has(number);
    if (rawColor.test(line) && !isTokenDeclaration) errors.push(`${location} raw color; use a semantic token`);
    if (numericZ.test(line) && !isTokenDeclaration) errors.push(`${location} numeric z-index; use a layer token`);
    const breakpoint = line.match(unapprovedBreakpoint)?.[1];
    if (breakpoint && !["430", "760", "1024"].includes(breakpoint)) errors.push(`${location} unapproved breakpoint ${breakpoint}px`);
    if (duplicatePattern.test(line) && !/components\/(?:AppLoading|AppSnackbarHost|AppBottomSheet)\.vue$/.test(path)) {
      warnings.push(`${location} may duplicate a shared feedback or overlay component`);
    }
  }
  return { errors, warnings };
}

async function snapshot() {
  const output = option("--output");
  const files = filesOption();
  if (!output || !files.length) return fail("Usage: audit-ui.mjs snapshot --output <file> --files <files...>");
  await writeFile(resolve(output), JSON.stringify({ version: 1, files: await contents(files) }, null, 2));
  process.stdout.write(`Saved Fate UI baseline for ${files.length} file(s).\n`);
}

async function check() {
  const baselinePath = option("--baseline");
  const files = filesOption();
  if (!baselinePath || !files.length) return fail("Usage: audit-ui.mjs check --baseline <file> --files <files...>");
  const baseline = JSON.parse(await readFile(resolve(baselinePath), "utf8"));
  const current = await contents(files);
  const errors = [];
  const warnings = [];
  for (const path of files) {
    if (current[path] === null) continue;
    const result = audit(path, baseline.files?.[path] ?? null, current[path]);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`);
  for (const error of errors) process.stderr.write(`error: ${error}\n`);
  if (errors.length) {
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Fate UI audit passed for ${files.length} file(s)${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.\n`);
}

async function selfTest() {
  const clean = audit("components/Test.vue", "", ".x { color: var(--color-text-primary); z-index: var(--layer-overlay); }");
  const bad = audit("components/Test.vue", "", ".x { color: #fff; z-index: 99; }\n@media (max-width: 700px) {}");
  if (clean.errors.length || bad.errors.length !== 3) return fail("audit-ui self-test failed");
  process.stdout.write("Fate UI audit self-test passed.\n");
}

if (command === "snapshot") await snapshot();
else if (command === "check") await check();
else if (command === "--self-test" || command === "self-test") await selfTest();
else fail("Use snapshot, check, or self-test.");
