#!/usr/bin/env node
/**
 * Cross-platform launcher for Python tools that live inside the
 * services/python/.venv venv (ruff, pyright, pytest, ...).
 *
 * Used by lint-staged so that staged *.py files are checked against the
 * project-local venv tools without requiring the developer to activate
 * the venv or install ruff/pyright globally.
 *
 * Usage:
 *   node scripts/run-py-tool.mjs <tool> [args...]
 *
 * The launcher:
 *   1. Resolves <tool> to services/python/.venv/{Scripts,bin}/<tool>{.exe,}
 *   2. Rewrites any path argument that points inside services/python/ to be
 *      relative to that folder, since the venv tools (ruff in particular)
 *      look up pyproject.toml starting from cwd.
 *   3. Spawns the tool with cwd=services/python and forwards stdio + exit code.
 *
 * Exits 1 with a helpful message if the venv is missing — pointing the
 * developer at docs/python-service.md for first-time setup.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const pyServiceDir = resolve(repoRoot, "services", "python");
const venvDir = resolve(pyServiceDir, ".venv");
const binDir = process.platform === "win32" ? "Scripts" : "bin";
const exeSuffix = process.platform === "win32" ? ".exe" : "";

const [, , toolName, ...rawArgs] = process.argv;

if (!toolName) {
  console.error("usage: node scripts/run-py-tool.mjs <tool> [args...]");
  process.exit(2);
}

const toolPath = resolve(venvDir, binDir, `${toolName}${exeSuffix}`);

if (!existsSync(toolPath)) {
  console.error(
    `[run-py-tool] '${toolName}' not found at ${toolPath}.\n` +
      `              Create the venv first — see docs/python-service.md.`,
  );
  process.exit(1);
}

// Lint-staged invokes us from the repo root and passes path arguments either
// absolute (lint-staged default) or as repo-relative strings (manual calls).
// We spawn the tool with cwd=services/python so it picks up pyproject.toml,
// which means every path that points inside the service folder must be
// rewritten to be relative to it (otherwise we'd see e.g.
// services/python/services/python/app/main.py).
const args = rawArgs.map((arg) => {
  // Skip flags / non-path args.
  if (arg.startsWith("-")) return arg;
  const abs = isAbsolute(arg) ? arg : resolve(repoRoot, arg);
  const rel = relative(pyServiceDir, abs);
  if (rel === "" || rel.startsWith("..")) return arg; // outside service folder — leave alone.
  return rel.split("\\").join("/");
});

const result = spawnSync(toolPath, args, {
  cwd: pyServiceDir,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`[run-py-tool] failed to spawn ${toolName}:`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
