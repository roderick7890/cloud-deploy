import { parseLyquidDeploymentArtifact, type LyquidDeploymentArtifact } from "./lyquid-deployment-artifact";

type FetchImpl = typeof fetch;

type OciLayer = {
  digest?: unknown;
  annotations?: Record<string, unknown>;
};

type OciManifest = {
  config?: {
    digest?: unknown;
  };
  layers?: OciLayer[];
};

export type FetchLyquidDeploymentArtifactFromOciInput = {
  rpcEndpoint: string;
  repository: string;
  reference: string;
  fetchImpl?: FetchImpl;
};

function assertOk(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRepository(repository: string) {
  const normalized = repository.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    throw new Error("Repository is required.");
  }

  return normalized;
}

function normalizeReference(reference: string) {
  const normalized = reference.trim();

  if (!normalized) {
    throw new Error("Reference is required.");
  }

  return normalized;
}

function digestToHex(digest: string) {
  if (!/^sha256:[0-9a-f]{64}$/i.test(digest)) {
    throw new Error("OCI digest must be sha256:<64 hex chars>.");
  }

  return `0x${digest.slice("sha256:".length)}`;
}

function bytesToHex(bytes: ArrayBuffer) {
  return `0x${Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function requireDigest(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is missing.`);
  }

  if (!/^sha256:[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${fieldName} must be a sha256 digest.`);
  }

  return value;
}

function findDeploymentBytecodeLayer(manifest: OciManifest) {
  const layer = manifest.layers?.find((item) => item.annotations?.assetType === "evm-deployment-bytecode");

  if (!layer) {
    throw new Error("OCI manifest is missing evm-deployment-bytecode layer.");
  }

  return requireDigest(layer.digest, "evm-deployment-bytecode digest");
}

function manifestDigestFromResponse(response: Response) {
  const digest = response.headers.get("docker-content-digest");

  if (!digest) {
    throw new Error("OCI manifest response is missing docker-content-digest.");
  }

  return requireDigest(digest, "docker-content-digest");
}

export function getOciBaseUrl(rpcEndpoint: string) {
  const url = new URL(rpcEndpoint);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("RPC endpoint must use http, https, ws, or wss.");
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function getOciRepoHint(rpcEndpoint: string, repository: string, reference: string) {
  const host = new URL(getOciBaseUrl(rpcEndpoint)).host;
  const repo = normalizeRepository(repository);
  const ref = normalizeReference(reference);

  return ref.startsWith("sha256:") ? `${host}/${repo}` : `${host}/${repo}:${ref}`;
}

export async function fetchLyquidDeploymentArtifactFromOci({
  rpcEndpoint,
  repository,
  reference,
  fetchImpl = fetch
}: FetchLyquidDeploymentArtifactFromOciInput): Promise<LyquidDeploymentArtifact> {
  const ociBaseUrl = getOciBaseUrl(rpcEndpoint);
  const repo = normalizeRepository(repository);
  const ref = normalizeReference(reference);
  const manifestResponse = await fetchImpl(`${ociBaseUrl}/v2/${repo}/manifests/${ref}`, {
    headers: { accept: "application/vnd.oci.image.manifest.v1+json" }
  });

  assertOk(manifestResponse, "Fetch OCI manifest");
  const imageDigest = manifestDigestFromResponse(manifestResponse);
  const manifest = (await manifestResponse.json()) as OciManifest;
  const configDigest = requireDigest(manifest.config?.digest, "config digest");
  const bytecodeDigest = findDeploymentBytecodeLayer(manifest);

  const metadataResponse = await fetchImpl(`${ociBaseUrl}/v2/${repo}/blobs/${configDigest}`);
  assertOk(metadataResponse, "Fetch OCI config blob");
  const metadata = await metadataResponse.json();

  if (!isRecord(metadata)) {
    throw new Error("OCI config blob must be a JSON object.");
  }

  const bytecodeResponse = await fetchImpl(`${ociBaseUrl}/v2/${repo}/blobs/${bytecodeDigest}`);
  assertOk(bytecodeResponse, "Fetch EVM deployment bytecode blob");
  const deploymentBytecode = bytesToHex(await bytecodeResponse.arrayBuffer());

  return parseLyquidDeploymentArtifact({
    name: typeof metadata.name === "string" ? metadata.name : repo,
    deploymentBytecode,
    imageHash: digestToHex(imageDigest),
    repoHint: getOciRepoHint(rpcEndpoint, repo, ref),
    abiStr: typeof metadata.abi_str === "string" ? metadata.abi_str : "()",
    contractAbi: metadata.contractAbi ?? metadata.contract_abi ?? metadata.abi,
    osVersion: typeof metadata.os_version === "string" ? metadata.os_version : undefined,
    deps: [],
    manifest,
    metadata,
    configDigest,
    bytecodeDigest,
    manifestDigest: imageDigest,
    manifestUrl: `${ociBaseUrl}/v2/${repo}/manifests/${ref}`,
    configUrl: `${ociBaseUrl}/v2/${repo}/blobs/${configDigest}`,
    bytecodeUrl: `${ociBaseUrl}/v2/${repo}/blobs/${bytecodeDigest}`
  });
}
