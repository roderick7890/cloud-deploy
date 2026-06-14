import { getAddress, isAddress, type Address } from "viem";
import { getRequestEndpoint } from "./endpoint-utils";

const getLyquidInfoPath = "/lyquor.lyquid.v1.LyquidService/GetLyquidInfo";
const getLyquidByAddressPath = "/lyquor.lyquid.v1.LyquidService/GetLyquidByAddress";

type FetchLyquidContractAddressInput = {
  rpcEndpoint: string;
  lyquidId: string;
  offChainFetch: typeof fetch;
};

type FetchLyquidIdByAddressInput = {
  rpcEndpoint: string;
  contractAddress: string;
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

function getLyquidServiceEndpoint(rpcEndpoint: string, path: string) {
  try {
    const url = new URL(rpcEndpoint);
    url.pathname = path;
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

function getLyquidIdFromAddressResponse(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const response = raw as {
    lyquidId?: { value?: unknown };
    lyquid_id?: { value?: unknown };
  };
  const value = response.lyquidId?.value ?? response.lyquid_id?.value;

  return typeof value === "string" && value.length > 0 ? value : null;
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

  const url = getLyquidServiceEndpoint(rpcEndpoint, getLyquidInfoPath);
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

export async function fetchLyquidIdByAddress({
  rpcEndpoint,
  contractAddress,
  offChainFetch
}: FetchLyquidIdByAddressInput): Promise<string | null> {
  if (!isAddress(contractAddress)) {
    throw new Error("Contract address is invalid.");
  }

  const url = getLyquidServiceEndpoint(rpcEndpoint, getLyquidByAddressPath);
  let response: Response;
  let raw: unknown;

  try {
    response = await offChainFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        address: {
          value: getAddress(contractAddress)
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
    throw new Error(responseMessage ?? "Failed to resolve Lyquid ID by address.");
  }

  return getLyquidIdFromAddressResponse(raw);
}
