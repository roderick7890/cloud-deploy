#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "dist");
const lyquidDir = resolve(repoRoot, "lyquid");
const assetsDir = resolve(lyquidDir, "assets");
const manifestPath = resolve(lyquidDir, "Cargo.toml");

function commandExists(command) {
  const result = spawnSync("command", ["-v", command], {
    shell: true,
    stdio: "ignore"
  });

  return result.status === 0 ? command : "";
}

export function resolveShakerCommand({
  env = process.env,
  which = commandExists,
  exists = existsSync,
  home = homedir()
} = {}) {
  if (env.SHAKER_BIN) {
    return env.SHAKER_BIN;
  }

  const pathCommand = which("shaker");
  if (pathCommand) {
    return pathCommand;
  }

  const shakenupCommand = resolve(home, ".shakenup/bin/shaker");
  if (exists(shakenupCommand)) {
    return shakenupCommand;
  }

  return "shaker";
}

export function parseDeployArgs(argv) {
  const options = {
    endpoint: "",
    reference: "",
    update: "",
    debug: false,
    extraArgs: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === "--endpoint") {
      options.endpoint = argv[++index] ?? "";
    } else if (arg === "--reference" || arg === "-r") {
      const nextArg = argv[index + 1] ?? "";
      if (nextArg && !nextArg.startsWith("-")) {
        options.reference = nextArg;
        index += 1;
      } else {
        options.reference = "";
        if (index + 1 < argv.length && !nextArg) {
          index += 1;
        }
      }
    } else if (arg === "--update") {
      options.update = argv[++index] ?? "";
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

export function buildDeployCommand(options, manifest = manifestPath, command = resolveShakerCommand()) {
  const args = ["deploy"];

  if (options.reference) {
    args.push("-r", options.reference);
  }

  args.push("--endpoint", options.endpoint, "--output", "json");

  if (options.debug) {
    args.push("--debug");
  }

  if (options.update) {
    args.push("--update", options.update);
  }

  args.push(...options.extraArgs, manifest);

  return { command, args };
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, LYQUID_BUILD: "true" },
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

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
    console.log(`Running: ${deploy.command} ${deploy.args.map((arg) => JSON.stringify(arg)).join(" ")}`);
    run(deploy.command, deploy.args);
    return;
  }

  throw new Error("Usage: lyquid-workflow.mjs build | deploy --endpoint <ws-url> [--reference <oci-ref>] [--update <lyquid-id>] [--debug]");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
