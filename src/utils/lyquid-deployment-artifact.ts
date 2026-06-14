import { encodeAbiParameters, getAddress, isAddress, parseAbiParameters, zeroAddress, type AbiParameter, type Address } from "viem";
import type { ProjectMetadata, ProjectTreeNode } from "@/types/deploy";

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

export type LyquidDeploymentArtifact = {
  name: string;
  deploymentBytecode: `0x${string}`;
  imageHash: `0x${string}`;
  repoHint: string;
  abiStr: string;
  constructorParameters: AbiParameter[];
  contractAbi?: unknown;
  osVersion?: string;
  superseded?: Address;
  deps: Address[];
  raw: unknown;
};

export type ArtifactDescriptorFile = {
  name: string;
  path: string;
  content: string;
  size: number;
  artifact: LyquidDeploymentArtifact;
};

export type UploadedArtifactBundle = {
  metadata: ProjectMetadata;
  files: File[];
  rootName: string;
  tree: ProjectTreeNode[];
  artifactFiles: ArtifactDescriptorFile[];
  selectedArtifactPath: string;
};

export type BuildLyquidDeploymentTransactionInput = {
  artifact: LyquidDeploymentArtifact;
  bartenderAddress: string;
  constructorValues?: Record<string, string>;
};

export type LyquidDeploymentTransaction = {
  to: null;
  data: `0x${string}`;
  parameters: AbiParameter[];
  args: unknown[];
  submittedTransaction: {
    to: null;
    calldata: `0x${string}`;
    bartender: Address;
    imageHash: `0x${string}`;
    repoHint: string;
    deps: Address[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function getUnknown(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in raw) {
      return raw[key];
    }
  }

  return undefined;
}

function normalizeHex(value: string, fieldName: string): `0x${string}` {
  const normalized = value.trim();

  if (!/^0x[0-9a-f]*$/i.test(normalized)) {
    throw new Error(`${fieldName} must be 0x-prefixed hex.`);
  }

  return normalized as `0x${string}`;
}

function normalizeBytes32(value: string, fieldName: string): `0x${string}` {
  const normalized = value.startsWith("sha256:") ? `0x${value.slice("sha256:".length)}` : value;
  const hex = normalizeHex(normalized, fieldName);

  if (!/^0x[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(`${fieldName} must be a bytes32 hex value or sha256 digest.`);
  }

  return hex;
}

function normalizeAddress(value: string, fieldName: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${fieldName} must be a valid address.`);
  }

  return getAddress(value);
}

function normalizeAddressArray(value: unknown, fieldName: string): Address[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an address array.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${fieldName}[${index}] must be an address.`);
    }

    return normalizeAddress(item, `${fieldName}[${index}]`);
  });
}

function normalizeAbiStr(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "()") {
    return "";
  }

  return trimmed.startsWith("(") && trimmed.endsWith(")") ? trimmed.slice(1, -1).trim() : trimmed;
}

function parseConstructorParameters(raw: Record<string, unknown>) {
  const constructorAbi = getUnknown(raw, ["constructorParameters", "constructor_parameters", "constructorAbi", "constructor_abi"]);

  if (Array.isArray(constructorAbi)) {
    return constructorAbi.map((param, index) => {
      if (!isRecord(param) || typeof param.type !== "string") {
        throw new Error(`constructor parameter ${index} must include a type.`);
      }

      return {
        ...param,
        name: typeof param.name === "string" && param.name.length > 0 ? param.name : `arg${index}`,
        type: param.type
      } as AbiParameter;
    });
  }

  const constructor = getUnknown(raw, ["constructor"]);
  if (isRecord(constructor) && Array.isArray(constructor.inputs)) {
    return constructor.inputs.map((param, index) => {
      if (!isRecord(param) || typeof param.type !== "string") {
        throw new Error(`constructor input ${index} must include a type.`);
      }

      return {
        ...param,
        name: typeof param.name === "string" && param.name.length > 0 ? param.name : `arg${index}`,
        type: param.type
      } as AbiParameter;
    });
  }

  const abiStr = normalizeAbiStr(getString(raw, ["abiStr", "abi_str", "constructorAbiStr", "constructor_abi_str"]));
  return abiStr ? [...parseAbiParameters(abiStr)] : [];
}

function getAbiStr(raw: Record<string, unknown>, constructorParameters: AbiParameter[]) {
  const explicit = normalizeAbiStr(getString(raw, ["abiStr", "abi_str", "constructorAbiStr", "constructor_abi_str"]));

  if (explicit) {
    return explicit;
  }

  return constructorParameters.map((param) => `${param.type}${param.name ? ` ${param.name}` : ""}`).join(", ");
}

function getContractAbi(raw: Record<string, unknown>) {
  return getUnknown(raw, ["contractAbi", "contract_abi", "abi"]);
}

export function parseLyquidDeploymentArtifact(source: unknown): LyquidDeploymentArtifact {
  if (!isRecord(source)) {
    throw new Error("Artifact descriptor must be a JSON object.");
  }

  const deploymentBytecode = getString(source, ["deploymentBytecode", "deployment_bytecode", "bytecode", "code"]);
  const imageHash = getString(source, ["imageHash", "image_hash", "imageDigest", "image_digest", "manifestDigest", "manifest_digest", "artifactHash", "artifact_hash"]);

  if (!deploymentBytecode) {
    throw new Error("Artifact descriptor is missing deploymentBytecode.");
  }

  if (!imageHash) {
    throw new Error("Artifact descriptor is missing imageHash or imageDigest.");
  }

  const constructorParameters = parseConstructorParameters(source);
  const superseded = getString(source, ["superseded", "supersededAddress", "superseded_address"]);

  return {
    name: getString(source, ["name", "lyquidName", "lyquid_name"]) || "Unnamed Lyquid",
    deploymentBytecode: normalizeHex(deploymentBytecode, "deploymentBytecode"),
    imageHash: normalizeBytes32(imageHash, "imageHash"),
    repoHint: getString(source, ["repoHint", "repo_hint", "repository", "image", "imageRef", "image_ref"]),
    abiStr: getAbiStr(source, constructorParameters),
    constructorParameters,
    contractAbi: getContractAbi(source),
    osVersion: getString(source, ["osVersion", "os_version"]) || undefined,
    superseded: superseded ? normalizeAddress(superseded, "superseded") : undefined,
    deps: normalizeAddressArray(getUnknown(source, ["deps", "dependencies"]), "deps"),
    raw: source
  };
}

function getParamName(param: AbiParameter, index: number) {
  return "name" in param && typeof param.name === "string" && param.name.length > 0 ? param.name : `arg${index}`;
}

function parseJsonValue(value: string, fieldName: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldName} must be valid JSON for this ABI type.`);
  }
}

function coerceConstructorValue(param: AbiParameter, index: number, values: Record<string, string>) {
  const name = getParamName(param, index);
  const rawValue = values[name] ?? "";

  if (param.type === "string") {
    return rawValue;
  }

  if (param.type === "bool") {
    if (rawValue === "true") {
      return true;
    }

    if (rawValue === "false") {
      return false;
    }

    throw new Error(`${name} must be true or false.`);
  }

  if (/^u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/.test(param.type)) {
    if (!/^-?\d+$/.test(rawValue)) {
      throw new Error(`${name} must be an integer.`);
    }

    return BigInt(rawValue);
  }

  if (param.type === "address") {
    return normalizeAddress(rawValue, name);
  }

  if (param.type === "bytes" || /^bytes([1-9]|[12][0-9]|3[0-2])$/.test(param.type)) {
    return normalizeHex(rawValue, name);
  }

  if (param.type.endsWith("]") || param.type === "tuple" || param.type.startsWith("tuple(")) {
    return parseJsonValue(rawValue, name);
  }

  return rawValue;
}

export function buildLyquidDeploymentTransaction({
  artifact,
  bartenderAddress,
  constructorValues = {}
}: BuildLyquidDeploymentTransactionInput): LyquidDeploymentTransaction {
  const bartender = normalizeAddress(bartenderAddress, "bartenderAddress");
  const prefixParameters: AbiParameter[] = [
    { name: "bartender", type: "address" },
    { name: "superseded", type: "address" },
    { name: "image_hash", type: "bytes32" },
    { name: "repo_hint", type: "string" },
    { name: "deps", type: "address[]" }
  ];
  const parameters = [...prefixParameters, ...artifact.constructorParameters];
  const args = [
    bartender,
    artifact.superseded ?? zeroAddress,
    artifact.imageHash,
    artifact.repoHint,
    artifact.deps,
    ...artifact.constructorParameters.map((param, index) => coerceConstructorValue(param, index, constructorValues))
  ];
  const encodedArgs = encodeAbiParameters(parameters, args);
  const data = `${artifact.deploymentBytecode}${encodedArgs.slice(2)}` as `0x${string}`;

  return {
    to: null,
    data,
    parameters,
    args,
    submittedTransaction: {
      to: null,
      calldata: data,
      bartender,
      imageHash: artifact.imageHash,
      repoHint: artifact.repoHint,
      deps: artifact.deps
    }
  };
}

function getArtifactPath(file: File) {
  return ((file as FileWithRelativePath).webkitRelativePath || file.name).replace(/^\/+/, "");
}

function getRootName(files: File[]) {
  const firstFile = files[0];

  if (!firstFile) {
    return "Untitled artifact";
  }

  const [rootName] = getArtifactPath(firstFile).split("/");
  return rootName || firstFile.name || "Untitled artifact";
}

function sortTree(nodes: ProjectTreeNode[]) {
  nodes.sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "directory" ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });

  nodes.forEach((node) => {
    if (node.children) {
      sortTree(node.children);
    }
  });

  return nodes;
}

function addPathToTree(nodes: ProjectTreeNode[], path: string) {
  const parts = path.split("/").filter(Boolean);
  let currentNodes = nodes;
  let currentPath = "";

  parts.forEach((part, index) => {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const type: ProjectTreeNode["type"] = index === parts.length - 1 ? "file" : "directory";
    let node = currentNodes.find((item) => item.name === part && item.path === currentPath);

    if (!node) {
      node = {
        name: part,
        path: currentPath,
        type,
        children: type === "directory" ? [] : undefined
      };
      currentNodes.push(node);
    }

    if (node.type === "directory") {
      currentNodes = node.children ?? [];
    }
  });
}

export async function analyzeArtifactFiles(files: File[]): Promise<UploadedArtifactBundle> {
  if (files.length === 0) {
    throw new Error("No files were found in the upload.");
  }

  const tree: ProjectTreeNode[] = [];
  const rootName = getRootName(files);
  const artifactFiles: ArtifactDescriptorFile[] = [];

  files.forEach((file) => addPathToTree(tree, getArtifactPath(file)));

  for (const file of files) {
    const path = getArtifactPath(file);

    if (!path.endsWith(".json")) {
      continue;
    }

    const content = await file.text();

    try {
      const artifact = parseLyquidDeploymentArtifact(JSON.parse(content));
      artifactFiles.push({
        name: file.name,
        path,
        content,
        size: file.size,
        artifact
      });
    } catch {
      // Other JSON files can live in a build folder.
    }
  }

  if (artifactFiles.length === 0) {
    throw new Error("No Lyquid deployment artifact descriptor JSON was found.");
  }

  return {
    metadata: {
      name: rootName,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    },
    files,
    rootName,
    tree: sortTree(tree),
    artifactFiles,
    selectedArtifactPath: artifactFiles.length === 1 ? artifactFiles[0].path : ""
  };
}
