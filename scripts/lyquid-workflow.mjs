#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "dist");
const lyquidDir = resolve(repoRoot, "lyquid");
const assetsDir = resolve(lyquidDir, "assets");
const manifestPath = resolve(lyquidDir, "Cargo.toml");

export function parseDeployArgs(argv) {
  const options = {
    endpoint: "",
    reference: "",
    debug: false,
    extraArgs: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--endpoint") {
      options.endpoint = argv[++index] ?? "";
    } else if (arg === "--reference" || arg === "-r") {
      options.reference = argv[++index] ?? "";
    } else if (arg === "--debug") {
      options.debug = true;
    } else {
      options.extraArgs.push(arg);
    }
  }

  if (!options.endpoint) {
    throw new Error("Missing required --endpoint <ws-url>.");
  }

  return options;
}

export function buildDeployCommand(options, manifest = manifestPath) {
  const args = ["deploy"];

  if (options.reference) {
    args.push("-r", options.reference);
  }

  args.push("--endpoint", options.endpoint, "--output", "json");

  if (options.debug) {
    args.push("--debug");
  }

  args.push(...options.extraArgs, manifest);

  return { command: "shaker", args };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, LYQUID_BUILD: "true" },
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export async function syncLyquidAssets() {
  run("npm", ["run", "build"]);
  await rm(assetsDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await cp(distDir, assetsDir, { recursive: true });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "build") {
    await syncLyquidAssets();
    return;
  }

  if (command === "deploy") {
    await syncLyquidAssets();
    const deploy = buildDeployCommand(parseDeployArgs(args));
    run(deploy.command, deploy.args);
    return;
  }

  throw new Error("Usage: lyquid-workflow.mjs build | deploy --endpoint <ws-url> [--reference <oci-ref>] [--debug]");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
