import type { AbiParameter } from "viem";
import type { NormalizedAbiMethod } from "@/types/abi";
import type { UploadedProject } from "@/types/deploy";
import { hashSource } from "@/utils/hash-utils";

type PrepareBuildMethodArgsInput = {
  method: NormalizedAbiMethod;
  project: UploadedProject;
};

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getProjectPath(file: File) {
  return ((file as FileWithRelativePath).webkitRelativePath || file.name).replace(/^\/+/, "");
}

async function fileToPayload(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  return {
    path: getProjectPath(file),
    name: file.name,
    size: file.size,
    type: file.type,
    contentHex: bytesToHex(bytes)
  };
}

export async function createBuildProjectPayload(project: UploadedProject) {
  const files = await Promise.all(project.files.map(fileToPayload));
  const payload = {
    rootName: project.rootName,
    selectedTomlPath: project.selectedTomlPath,
    metadata: project.metadata,
    files: files.sort((first, second) => first.path.localeCompare(second.path))
  };

  return new TextEncoder().encode(JSON.stringify(payload));
}

function unsupportedInput(input: AbiParameter, index: number) {
  const name = "name" in input && input.name ? input.name : `arg${index}`;
  return new Error(`Build method input ${name}:${input.type} is not supported yet.`);
}

function isNamedLike(input: AbiParameter, pattern: RegExp) {
  return "name" in input && typeof input.name === "string" && pattern.test(input.name.toLowerCase());
}

export async function prepareBuildMethodArgs({ method, project }: PrepareBuildMethodArgsInput) {
  const { args } = await prepareBuildMethodCall({ method, project });
  return args;
}

export async function prepareBuildMethodCall({ method, project }: PrepareBuildMethodArgsInput) {
  const projectBytes = await createBuildProjectPayload(project);
  const projectHex = bytesToHex(projectBytes);
  const sourceHash = await hashSource(projectBytes);
  const inputs = method.abiItem.inputs ?? [];

  const args = inputs.map((input, index) => {
    if (input.type === "bytes") {
      return isNamedLike(input, /constructor/) ? "0x" : projectHex;
    }

    if (input.type === "bytes32") {
      return sourceHash;
    }

    if (input.type === "string") {
      if (isNamedLike(input, /project.*name|name/)) {
        return project.rootName;
      }

      if (isNamedLike(input, /repo|path|toml/)) {
        return project.selectedTomlPath;
      }
    }

    throw unsupportedInput(input, index);
  });

  return { args, sourceHash, projectBytes };
}
