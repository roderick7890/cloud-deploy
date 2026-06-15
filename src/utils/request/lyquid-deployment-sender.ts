import { getAddress, isAddress, type Chain } from "viem";
import { buildLyquidDeploymentTransaction, type LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";
import { fetchLyquidIdByAddress } from "./lyquid-info-client";
import { fetchRpcChain } from "./rpc-chain-client";
import { waitForRpcTransactionReceipt } from "./rpc-transaction-client";
import type { RequestSenderContext, WalletTransactionClient } from "./request-types";

type SendLyquidDeploymentInput = {
  artifact: LyquidDeploymentArtifact;
  bartenderAddress: string;
  constructorValues?: Record<string, string>;
  context: RequestSenderContext;
  receiptPollIntervalMs?: number;
  receiptTimeoutMs?: number;
};

type ReceiptWithContractAddress = {
  contractAddress?: unknown;
  status?: unknown;
};

async function switchWalletToChain(walletClient: WalletTransactionClient, chain: Chain) {
  if (!walletClient.switchChain) {
    return;
  }

  try {
    await walletClient.switchChain({ id: chain.id });
  } catch (error) {
    if (!walletClient.addChain) {
      throw error;
    }

    await walletClient.addChain({ chain });
    await walletClient.switchChain({ id: chain.id });
  }
}

function getReceiptContractAddress(receipt: unknown) {
  if (!receipt || typeof receipt !== "object") {
    return null;
  }

  const contractAddress = (receipt as ReceiptWithContractAddress).contractAddress;

  if (typeof contractAddress !== "string" || !isAddress(contractAddress)) {
    return null;
  }

  return getAddress(contractAddress);
}

function getReceiptStatus(receipt: unknown) {
  if (!receipt || typeof receipt !== "object") {
    return "submitted";
  }

  const status = (receipt as ReceiptWithContractAddress).status;

  if (status === "0x1") {
    return "success";
  }

  if (status === "0x0") {
    return "failed";
  }

  return typeof status === "string" && status.length > 0 ? status : "submitted";
}

export async function sendLyquidDeployment({
  artifact,
  bartenderAddress,
  constructorValues,
  context,
  receiptPollIntervalMs,
  receiptTimeoutMs
}: SendLyquidDeploymentInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  if (!context.accountAddress) {
    throw new Error("Connected wallet address is required.");
  }

  if (!context.walletClient) {
    throw new Error("Wallet client is required.");
  }

  const chain = await fetchRpcChain({
    rpcEndpoint: context.rpcEndpoint,
    rpcTransport: context.rpcTransport
  });
  const deploymentTransaction = buildLyquidDeploymentTransaction({
    artifact,
    bartenderAddress,
    constructorValues
  });

  await switchWalletToChain(context.walletClient, chain);

  const transactionHash = await context.walletClient.sendTransaction({
    account: context.accountAddress,
    to: null,
    chain,
    data: deploymentTransaction.data
  });
  const receipt = await waitForRpcTransactionReceipt({
    rpcClient: context.rpcClient,
    transactionHash,
    pollIntervalMs: receiptPollIntervalMs,
    timeoutMs: receiptTimeoutMs
  });
  const contractAddress = getReceiptContractAddress(receipt);

  if (!contractAddress) {
    throw new Error("Deployment receipt did not include a contractAddress.");
  }

  let lyquidId: string | null = null;
  let lyquidIdLookupError: string | undefined;

  try {
    lyquidId = await fetchLyquidIdByAddress({
      serviceTransport: context.serviceTransport,
      contractAddress
    });
  } catch (error) {
    lyquidIdLookupError = error instanceof Error ? error.message : "Failed to resolve Lyquid ID by address.";
  }

  return {
    transactionHash,
    contractAddress,
    lyquidId: lyquidId ?? undefined,
    lyquidIdLookupError,
    chainId: chain.id,
    status: getReceiptStatus(receipt),
    receipt,
    data: deploymentTransaction.data,
    submittedTransaction: deploymentTransaction.submittedTransaction
  };
}
