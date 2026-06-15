import { getAddress, isAddress, type Address } from "viem";
import { getLyquidByAddress, getLyquidInfo } from "lyquor-sdk/core";
import type { RequestSenderContext } from "./request-types";

type LyquidServiceInput = Pick<RequestSenderContext, "serviceTransport">;

type FetchLyquidContractAddressInput = LyquidServiceInput & {
  lyquidId: string;
};

type FetchLyquidIdByAddressInput = LyquidServiceInput & {
  contractAddress: string;
};

export type NetworkBartenderInfo = {
  lyquidId: string | null;
  contractAddress: Address;
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

function getLyquidIdFromInfo(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const response = raw as {
    lyquidInfo?: { lyquidId?: { value?: unknown }; lyquid_id?: { value?: unknown } };
    lyquid_info?: { lyquidId?: { value?: unknown }; lyquid_id?: { value?: unknown } };
  };
  const value =
    response.lyquidInfo?.lyquidId?.value ??
    response.lyquidInfo?.lyquid_id?.value ??
    response.lyquid_info?.lyquidId?.value ??
    response.lyquid_info?.lyquid_id?.value;

  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchLyquidContractAddress({
  serviceTransport,
  lyquidId,
}: FetchLyquidContractAddressInput): Promise<Address | null> {
  const trimmedLyquidId = lyquidId.trim();

  if (!trimmedLyquidId) {
    return null;
  }

  if (isAddress(trimmedLyquidId)) {
    return getAddress(trimmedLyquidId);
  }

  let raw: unknown;

  try {
    raw = await getLyquidInfo(serviceTransport, { lyquid: trimmedLyquidId });
  } catch (error) {
    throw Object.assign(
      new Error(
        `Network request failed for GetLyquidInfo: ${getNetworkErrorReason(error)}. Check CORS, the target host and port, and whether the RPC node is running.`
      ),
      { cause: error }
    );
  }

  const responseMessage = getResponseMessage(raw);

  if (responseMessage) {
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

export async function fetchNetworkBartenderInfo({
  serviceTransport
}: LyquidServiceInput): Promise<NetworkBartenderInfo | null> {
  let raw: unknown;

  try {
    raw = await getLyquidInfo(serviceTransport);
  } catch (error) {
    throw Object.assign(
      new Error(
        `Network request failed for GetLyquidInfo: ${getNetworkErrorReason(error)}. Check CORS, the target host and port, and whether the RPC node is running.`
      ),
      { cause: error }
    );
  }

  const responseMessage = getResponseMessage(raw);

  if (responseMessage) {
    throw new Error(responseMessage ?? "Failed to resolve network Bartender address.");
  }

  const contractAddress = getContractAddressFromInfo(raw);

  if (!contractAddress) {
    return null;
  }

  if (!isAddress(contractAddress)) {
    throw new Error("Resolved network Bartender address is invalid.");
  }

  return {
    lyquidId: getLyquidIdFromInfo(raw),
    contractAddress: getAddress(contractAddress)
  };
}

export async function fetchLyquidIdByAddress({
  serviceTransport,
  contractAddress
}: FetchLyquidIdByAddressInput): Promise<string | null> {
  if (!isAddress(contractAddress)) {
    throw new Error("Contract address is invalid.");
  }

  let raw: unknown;

  try {
    raw = await getLyquidByAddress(serviceTransport, { address: getAddress(contractAddress) });
  } catch (error) {
    throw Object.assign(
      new Error(
        `Network request failed for GetLyquidByAddress: ${getNetworkErrorReason(error)}. Check CORS, the target host and port, and whether the RPC node is running.`
      ),
      { cause: error }
    );
  }

  const responseMessage = getResponseMessage(raw);

  if (responseMessage) {
    throw new Error(responseMessage ?? "Failed to resolve Lyquid ID by address.");
  }

  return getLyquidIdFromAddressResponse(raw);
}
