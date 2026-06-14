import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { DeployHistoryPanel } from "@/components/workbench/deploy-history-panel";
import { DeployWorkbench } from "@/components/workbench/deploy-workbench";
import { FileDetailTab } from "@/components/workbench/file-detail-tab";
import { ResourceExplorer } from "@/components/workbench/resource-explorer";
import { RunOutputTab } from "@/components/workbench/run-output-tab";
import { WorkbenchTabs } from "@/components/workbench/workbench-tabs";
import { AppShell } from "@/layout/app-shell";
import { useSettingsStore } from "@/store/settings-store";
import { useWorkbenchStore } from "@/store/workbench-store";
import type { DeployHistoryRecord, WorkbenchEnv, WorkbenchTab } from "@/types/workbench";
import { buildLyquidDeploymentTransaction, type UploadedArtifactBundle } from "@/utils/lyquid-deployment-artifact";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { sendLyquidDeployment } from "@/utils/request/lyquid-deployment-sender";
import { fetchRpcTransaction } from "@/utils/request/rpc-transaction-client";
import { type BrowserWindowWithWallet, type BuildCacheEntry, createRunTitle, getErrorMessage, getTxHash } from "./workbench-page-utils";
import { WorkbenchSettingsDialog } from "./workbench-settings-dialog";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [project, setProject] = useState<UploadedArtifactBundle | null>(null);
  const [selectedArtifactPath, setSelectedArtifactPath] = useState("");
  const [constructorValues, setConstructorValues] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<WorkbenchTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [buildCache, setBuildCache] = useState<BuildCacheEntry | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const settings = useSettingsStore();
  const { layout, setLayout, deployHistory, addDeployHistory, deleteDeployHistory } = useWorkbenchStore();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);
  const currentArtifactFile = useMemo(
    () => project?.artifactFiles.find((file) => file.path === selectedArtifactPath) ?? null,
    [project, selectedArtifactPath]
  );
  const currentArtifact = currentArtifactFile?.artifact ?? null;
  const bartenderAddress = settings.bartenderAddress;

  const getEnv = (): WorkbenchEnv => {
    return {
      rpcEndpoint: settings.rpcEndpoint,
      bartenderAddress,
      walletAddress: account.address,
      artifactName: currentArtifact?.name
    };
  };

  const upsertTab = (tab: WorkbenchTab) => {
    setTabs((current) => [tab, ...current.filter((item) => item.id !== tab.id)]);
    setActiveTabId(tab.id);
  };

  const patchTab = (tabId: string, patch: Partial<WorkbenchTab>) => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)));
  };

  const openFileTab = (path: string) => {
    const now = Date.now();
    upsertTab({
      id: `file:${path}`,
      kind: "file-detail",
      title: path.split("/").pop() || path,
      createdAt: now,
      targetFile: path
    });
  };

  const handleSelectTarget = (path: string) => {
    setSelectedArtifactPath(path);
    setConstructorValues({});
    setBuildCache(null);
    openFileTab(path);
  };

  const closeTab = (tabId: string) => {
    setTabs((current) => {
      const nextTabs = current.filter((tab) => tab.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(nextTabs[0]?.id ?? null);
      }
      return nextTabs;
    });
  };

  const runBuild = async (options?: { silent?: boolean }) => {
    if (!currentArtifact || !selectedArtifactPath) {
      throw new Error("Upload a build artifact folder and select an artifact descriptor before preparing deploy data.");
    }

    if (!bartenderAddress) {
      throw new Error("Configure the network Bartender contract address in Settings before preparing deploy data.");
    }

    const now = Date.now();
    const tabId = `build:${selectedArtifactPath}:${now}`;
    const env = getEnv();
    if (!options?.silent) {
      upsertTab({ id: tabId, kind: "build-run", title: createRunTitle("build", selectedArtifactPath, now), createdAt: now, targetFile: selectedArtifactPath, status: "loading", env });
    }

    try {
      setIsBuilding(true);
      const transaction = buildLyquidDeploymentTransaction({
        artifact: currentArtifact,
        bartenderAddress,
        constructorValues
      });
      const raw = {
        artifact: {
          name: currentArtifact.name,
          imageHash: currentArtifact.imageHash,
          repoHint: currentArtifact.repoHint,
          abiStr: currentArtifact.abiStr,
          osVersion: currentArtifact.osVersion
        },
        transaction: transaction.submittedTransaction,
        parameters: transaction.parameters
      };
      const reviewPayload = { hashes: { artifactHash: currentArtifact.imageHash }, payload: raw };
      if (!options?.silent) {
        setBuildCache({ targetFile: selectedArtifactPath, reviewPayload });
      }
      if (!options?.silent) {
        patchTab(tabId, { status: "success", raw });
      }
      return reviewPayload;
    } catch (error) {
      if (!options?.silent) {
        patchTab(tabId, { status: "error", error: getErrorMessage(error, "Prepare failed.") });
      }
      throw error;
    } finally {
      setIsBuilding(false);
    }
  };

  const runDeploy = async () => {
    const now = Date.now();
    const tabId = `deploy:${selectedArtifactPath || "target"}:${now}`;
    const env = getEnv();
    upsertTab({ id: tabId, kind: "deploy-run", title: createRunTitle("deploy", selectedArtifactPath || "target", now), createdAt: now, targetFile: selectedArtifactPath, status: "loading", env });

    try {
      setIsDeploying(true);
      if (!account.address) {
        throw new Error("Connect wallet before deploying.");
      }

      if (!currentArtifact || !selectedArtifactPath) {
        throw new Error("Upload a build artifact folder and select an artifact descriptor before deploy.");
      }

      if (!bartenderAddress) {
        throw new Error("Configure the network Bartender contract address in Settings before deploy.");
      }

      const reviewPayload = buildCache?.targetFile === selectedArtifactPath ? buildCache.reviewPayload : await runBuild({ silent: true });
      const raw = await sendLyquidDeployment({
        artifact: currentArtifact,
        bartenderAddress,
        constructorValues,
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          accountAddress: account.address,
          walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
          offChainFetch: (input, init) => fetch(input, init)
        }
      });
      const displayRaw = {
        ...raw,
        preparedPayload: reviewPayload.payload,
        contractAbi: currentArtifact.contractAbi
      };
      const txHash = getTxHash(raw);

      patchTab(tabId, { status: "success", raw: displayRaw, transactionRaw: raw.receipt });
      if (txHash) {
        addDeployHistory({ id: `${txHash}:${now}`, txHash: txHash as `0x${string}`, timestamp: now, targetFile: selectedArtifactPath, status: raw.status === "success" ? "success" : "submitted", env });
      }
    } catch (error) {
      patchTab(tabId, { status: "error", error: getErrorMessage(error, "Deploy failed.") });
    } finally {
      setIsDeploying(false);
    }
  };

  const openHistoryRecord = async (record: DeployHistoryRecord) => {
    const tabId = `history:${record.id}`;
    upsertTab({
      id: tabId,
      kind: "deploy-history",
      title: createRunTitle("deploy", record.targetFile, record.timestamp),
      createdAt: Date.now(),
      targetFile: record.targetFile,
      status: "loading",
      env: record.env,
      raw: { transactionHash: record.txHash }
    });

    try {
      const transactionRaw = await fetchRpcTransaction({ rpcEndpoint: record.env.rpcEndpoint, transactionHash: record.txHash, offChainFetch: (input, init) => fetch(input, init) });
      patchTab(tabId, { status: transactionRaw ? "success" : "loading", transactionRaw: transactionRaw ?? undefined });
    } catch (error) {
      patchTab(tabId, { status: "error", error: getErrorMessage(error, "Failed to fetch RPC transaction.") });
    }
  };

  return (
    <>
      <AppShell
        showProgress={false}
        walletLabel={walletLabel}
        walletAddress={account.address}
        onConnectWallet={connectWallet}
        onCopyWalletAddress={copyWalletAddress}
        onDisconnectWallet={disconnect}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        <DeployWorkbench
          layout={layout}
          onLayoutChange={setLayout}
          resourcePane={
            <ResourceExplorer
              project={project}
              selectedArtifactPath={selectedArtifactPath}
              onProjectChange={(nextProject) => {
                setProject(nextProject);
                setSelectedArtifactPath(nextProject.selectedArtifactPath);
                setConstructorValues({});
                setBuildCache(null);
                setTabs([]);
                setActiveTabId(null);
              }}
              onSelectTarget={handleSelectTarget}
              onOpenFile={openFileTab}
            />
          }
          historyPane={<DeployHistoryPanel records={deployHistory} onOpenRecord={(record) => void openHistoryRecord(record)} onDeleteRecord={deleteDeployHistory} />}
          tabsPane={
            <WorkbenchTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onActiveTabChange={setActiveTabId}
              onCloseTab={closeTab}
              renderTabContent={(tab) =>
                tab.kind === "file-detail" && project ? (
                  <FileDetailTab
                    path={tab.targetFile ?? ""}
                    files={project.files}
                    artifactFiles={project.artifactFiles}
                    onBack={() => closeTab(tab.id)}
                    onDeploy={() => void runDeploy()}
                  />
                ) : (
                  <RunOutputTab tab={tab} />
                )
              }
            />
          }
          actionsPane={
            <ActionDeck
              selectedArtifactPath={selectedArtifactPath}
              constructorFields={currentArtifact?.constructorParameters ?? []}
              constructorValues={constructorValues}
              isBuilding={isBuilding}
              isDeploying={isDeploying}
              onConstructorValuesChange={(values) => {
                setConstructorValues(values);
                setBuildCache(null);
              }}
              onBuild={() => void runBuild()}
              onDeploy={() => void runDeploy()}
            />
          }
        />
      </AppShell>
      <WorkbenchSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
