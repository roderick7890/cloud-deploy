import { defaultArtifactSources } from "@/config/artifact-workspace-config";
import { hostedNodeDomains } from "@/config/hosted-node-config";
import type { ArtifactSelection, ArtifactSource, ArtifactWorkspace } from "@/types/artifact-workspace";

type WorkspaceEndpoints = Pick<ArtifactWorkspace, "nodeHost" | "rpcEndpoint" | "wsEndpoint">;

function getHostedNodeHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  for (const domain of hostedNodeDomains) {
    const suffix = `.${domain.suffix}`;
    if (!normalizedHostname.endsWith(suffix)) {
      continue;
    }

    const labels = normalizedHostname.slice(0, -suffix.length).split(".").filter(Boolean);
    const nodeId = labels[labels.length - 1];

    return nodeId ? `${nodeId}.${domain.suffix}` : "";
  }

  return "";
}

function getDefaultProtocols(nodeHost: string) {
  const isLocal = nodeHost === "localhost:10087" || nodeHost.startsWith("localhost:") || nodeHost.startsWith("127.0.0.1:");

  return {
    httpProtocol: isLocal ? "http" : "https",
    wsProtocol: isLocal ? "ws" : "wss"
  };
}

export function normalizeNodeHost(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host;
  } catch {
    return trimmed.replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  }
}

export function buildWorkspaceEndpointsFromNodeHost(value: string): WorkspaceEndpoints {
  const nodeHost = normalizeNodeHost(value) || "localhost:10087";
  const { httpProtocol, wsProtocol } = getDefaultProtocols(nodeHost);

  return {
    nodeHost,
    rpcEndpoint: `${httpProtocol}://${nodeHost}/api`,
    wsEndpoint: `${wsProtocol}://${nodeHost}/ws`
  };
}

export function buildWorkspaceEndpointsFromRpcEndpoint(value: string): WorkspaceEndpoints {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const nodeHost = url.host || "localhost:10087";
    const httpProtocol = url.protocol === "http:" ? "http" : "https";
    const wsProtocol = httpProtocol === "http" ? "ws" : "wss";
    const path = url.pathname && url.pathname !== "/" ? url.pathname : "/api";

    return {
      nodeHost,
      rpcEndpoint: `${httpProtocol}://${nodeHost}${path}`,
      wsEndpoint: `${wsProtocol}://${nodeHost}/ws`
    };
  } catch {
    return buildWorkspaceEndpointsFromNodeHost(trimmed);
  }
}

export function buildDefaultArtifactWorkspaces(hostname = globalThis.location?.hostname ?? ""): ArtifactWorkspace[] {
  const endpoints = buildWorkspaceEndpointsFromNodeHost(getHostedNodeHost(hostname) || "localhost:10087");
  const { nodeHost } = endpoints;
  const isLocal = nodeHost === "localhost:10087";
  const id = isLocal ? "local" : nodeHost.endsWith(".devnet-alpha.lyquor.dev") ? "devnet-alpha" : nodeHost;

  return [
    {
      id,
      ...endpoints,
      artifacts: defaultArtifactSources.map((artifact) => ({ ...artifact }))
    }
  ];
}

export function getInitialArtifactSelection(workspaces: ArtifactWorkspace[]): ArtifactSelection {
  return {
    workspaceId: workspaces[0]?.id ?? "",
    artifactId: workspaces[0]?.artifacts[0]?.id ?? ""
  };
}

export function isDigestReference(reference: string) {
  return reference.startsWith("sha256:");
}

export function formatArtifactReference(artifact: Pick<ArtifactSource, "repository" | "reference">) {
  return isDigestReference(artifact.reference) ? `${artifact.repository}@${artifact.reference}` : `${artifact.repository}:${artifact.reference}`;
}

export function parseArtifactReference(value: string, fallback: Pick<ArtifactSource, "repository" | "reference">) {
  const trimmed = value.trim();

  if (!trimmed) {
    return fallback;
  }

  if (trimmed.includes("@")) {
    const [repository, reference] = trimmed.split("@");
    return repository && reference ? { repository, reference } : fallback;
  }

  const separatorIndex = trimmed.lastIndexOf(":");
  if (separatorIndex <= 0) {
    return { repository: trimmed, reference: fallback.reference };
  }

  return {
    repository: trimmed.slice(0, separatorIndex),
    reference: trimmed.slice(separatorIndex + 1)
  };
}

export function buildRegistryReference(workspace: Pick<ArtifactWorkspace, "nodeHost">, artifact: Pick<ArtifactSource, "repository" | "reference">) {
  return `https://${workspace.nodeHost}/${formatArtifactReference(artifact)}`;
}

export function buildShakerPushCommand(workspace: Pick<ArtifactWorkspace, "wsEndpoint" | "nodeHost" | "rpcEndpoint">, artifact: Pick<ArtifactSource, "repository" | "reference">) {
  return [
    "shaker push \\",
    `  --endpoint ${workspace.rpcEndpoint} \\`,
    `  --registry ${buildRegistryReference(workspace, artifact)} \\`,
    "  Cargo.toml"
  ].join("\n");
}
