const devProxyPath = "/__cloud-deploy-proxy";

export function getJsonRpcEndpoint(endpoint: string) {
  const url = new URL(endpoint);

  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = "/api";
  }

  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

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
