const devProxyPath = "/__cloud-deploy-proxy";

export function getRequestEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);

    if (import.meta.env.DEV && (url.protocol === "http:" || url.protocol === "https:")) {
      return `${devProxyPath}?target=${encodeURIComponent(url.toString())}`;
    }
  } catch {
    return endpoint;
  }

  return endpoint;
}
