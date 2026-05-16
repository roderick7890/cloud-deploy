import { getAddress, isAddress, type Address } from "viem";
import { getRequestEndpoint } from "./endpoint-utils";

const getLyquidInfoPath = "/lyquor.lyquid.v1.LyquidService/GetLyquidInfo";

type FetchLyquidContractAddressInput = {
  rpcEndpoint: string;
  lyquidId: string;
  offChainFetch: typeof fetch;
};

function getResponseMessage(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  if ("error" in raw) {
    const error = (raw as { error?: unknown }).error;

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;

      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }

  if ("message" in raw) {
    const message = (raw as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return null;
}

function getNetworkErrorReason(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unknown network error";
}

function getLyquidInfoEndpoint(rpcEndpoint: string) {
  try {
    const url = new URL(rpcEndpoint);
    url.pathname = getLyquidInfoPath;
    url.search = "";
    url.hash = "";
    return getRequestEndpoint(url.toString());
  } catch {
    throw new Error("RPC endpoint must be an absolute URL.");
  }
}

function getContractAddressFromInfo(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const response = raw as {
    lyquidInfo?: { contract?: { value?: unknown } };
    lyquid_info?: { contract?: { value?: unknown } };
  };
  const value = response.lyquidInfo?.contract?.value ?? response.lyquid_info?.contract?.value;

  return typeof value === "string" ? value : null;
}

export async function fetchLyquidContractAddress({
  rpcEndpoint,
  lyquidId,
  offChainFetch
}: FetchLyquidContractAddressInput): Promise<Address | null> {
  const trimmedLyquidId = lyquidId.trim();

  if (!trimmedLyquidId) {
    return null;
  }

  if (isAddress(trimmedLyquidId)) {
    return getAddress(trimmedLyquidId);
  }

  const url = getLyquidInfoEndpoint(rpcEndpoint);
  let response: Response;
  let raw: unknown;

  try {
    response = await offChainFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        lyquidId: {
          value: trimmedLyquidId
        }
      })
    });
    raw = await response.json();
  } catch (error) {
    throw Object.assign(
      new Error(
        `Network request failed for ${url}: ${getNetworkErrorReason(error)}. Check CORS, the target host and port, and whether the RPC node is running.`
      ),
      { cause: error }
    );
  }

  const responseMessage = getResponseMessage(raw);

  if (!response.ok || responseMessage) {
    throw new Error(responseMessage ?? "Failed to resolve Lyquid contract address.");
  }

  const contractAddress = getContractAddressFromInfo(raw);

  if (!contractAddress) {
    return null;
  }

  if (!isAddress(contractAddress)) {
    throw new Error("Resolved Lyquid contract address is invalid.");
  }

  return getAddress(contractAddress);
}
