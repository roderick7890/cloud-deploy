import { hostedNodeDomains } from "@/config/hosted-node-config";

export function getHostedNodeEndpoint(hostname = globalThis.location?.hostname ?? "") {
  const normalizedHostname = hostname.toLowerCase();

  for (const domain of hostedNodeDomains) {
    const suffix = `.${domain.suffix}`;
    if (!normalizedHostname.endsWith(suffix)) {
      continue;
    }

    const labels = normalizedHostname.slice(0, -suffix.length).split(".").filter(Boolean);
    const nodeId = labels[labels.length - 1];

    if (!nodeId) {
      return "";
    }

    return `${domain.protocol}//${nodeId}.${domain.suffix}/api`;
  }

  return "";
}
