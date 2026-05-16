import path from "node:path";
import type { IncomingMessage } from "node:http";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const devProxyPath = "/__cloud-deploy-proxy";
const skippedResponseHeaders = new Set(["connection", "content-encoding", "content-length", "transfer-encoding"]);

function readBody(request: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function getProxyTarget(requestUrl: string | undefined) {
  const url = new URL(requestUrl ?? "/", "http://localhost");
  const target = url.searchParams.get("target");

  if (!target) {
    throw new Error("Missing proxy target.");
  }

  const targetUrl = new URL(target);

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    throw new Error("Proxy target must use http or https.");
  }

  return targetUrl.toString();
}

function getForwardHeaders(request: IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (!value || key === "host" || key === "connection" || key === "content-length") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, value);
    }
  }

  return headers;
}

function getProxyErrorReason(error: unknown): string {
  if (error instanceof Error) {
    const cause = "cause" in error ? getProxyErrorReason(error.cause) : "";
    return cause ? `${error.message}: ${cause}` : error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown proxy error";
}

function cloudDeployDevProxy(): Plugin {
  return {
    name: "cloud-deploy-dev-proxy",
    configureServer(server) {
      server.middlewares.use(devProxyPath, async (request, response) => {
        let target = "unknown target";
        try {
          target = getProxyTarget(request.url);
          const method = request.method ?? "GET";
          const body = method === "GET" || method === "HEAD" ? undefined : new Uint8Array(await readBody(request));
          const proxyResponse = await fetch(target, {
            method,
            headers: getForwardHeaders(request),
            body,
            redirect: "manual"
          });
          const proxyBody = Buffer.from(await proxyResponse.arrayBuffer());

          response.statusCode = proxyResponse.status;
          proxyResponse.headers.forEach((value, key) => {
            if (!skippedResponseHeaders.has(key.toLowerCase())) {
              response.setHeader(key, value);
            }
          });
          response.end(proxyBody);
        } catch (error) {
          response.statusCode = 502;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              message: `Dev proxy request failed for ${target}: ${getProxyErrorReason(error)}`
            })
          );
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudDeployDevProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
