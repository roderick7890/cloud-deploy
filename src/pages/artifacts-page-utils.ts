import type { BuildResult } from "@/types/deploy";
import { buildLyquidDeploymentTransaction, type LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";

export function getTransactionHash(raw: unknown) {
  return raw && typeof raw === "object" && "transactionHash" in raw && typeof raw.transactionHash === "string" ? raw.transactionHash : undefined;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function createDeploymentBuildResult({
  artifact,
  bartenderAddress,
  constructorValues
}: {
  artifact: LyquidDeploymentArtifact;
  bartenderAddress: string;
  constructorValues: Record<string, string>;
}): BuildResult {
  const transaction = buildLyquidDeploymentTransaction({
    artifact,
    bartenderAddress,
    constructorValues
  });
  const raw = {
    artifact: {
      name: artifact.name,
      imageHash: artifact.imageHash,
      repoHint: artifact.repoHint,
      abiStr: artifact.abiStr,
      osVersion: artifact.osVersion,
      raw: artifact.raw
    },
    transaction: transaction.submittedTransaction,
    parameters: transaction.parameters
  };

  return {
    hashes: { artifactHash: artifact.imageHash },
    logs: [],
    payload: raw,
    raw,
    contractAbi: artifact.contractAbi
  };
}
