import type { ReviewPayload } from "@/types/deploy";
import type { WorkbenchTab } from "@/types/workbench";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";

export type BrowserWindowWithWallet = Window & {
  ethereum?: Parameters<typeof createBrowserWalletTransactionClient>[0];
};

export type BuildCacheEntry = {
  targetFile: string;
  reviewPayload: ReviewPayload;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getTxHash(raw: unknown) {
  return isRecord(raw) && typeof raw.transactionHash === "string" && raw.transactionHash.startsWith("0x") ? raw.transactionHash : undefined;
}

export function createRunTitle(action: "build" | "deploy" | "history", targetFile: string, timestamp: number) {
  const fileName = targetFile.split("/").pop() || "target";
  return `${action}_${fileName}_${timestamp}`;
}

export function findPendingTransactionTabs(tabs: WorkbenchTab[]) {
  return tabs.flatMap((tab) => {
    if (tab.kind === "file-detail" || tab.transactionRaw || !tab.env?.rpcEndpoint) {
      return [];
    }

    const transactionHash = getTxHash(tab.raw);
    return transactionHash && tab.status === "loading" ? [{ tabId: tab.id, transactionHash, rpcEndpoint: tab.env.rpcEndpoint }] : [];
  });
}
