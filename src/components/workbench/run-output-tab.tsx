import { useState, type ReactNode } from "react";
import { CheckCircle2, Copy, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkbenchTab } from "@/types/workbench";
import { formatStatus } from "@/utils/format-utils";

type RunOutputTabProps = {
  tab: WorkbenchTab;
};

function jsonText(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getTxHash(tab: WorkbenchTab) {
  return stringValue(isRecord(tab.raw) ? tab.raw.transactionHash : undefined) ?? stringValue(isRecord(tab.transactionRaw) ? tab.transactionRaw.hash : undefined);
}

function getDeployAbi(raw: unknown) {
  return isRecord(raw) && raw.deployAbi ? raw.deployAbi : null;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function JsonScroll({ value }: { value: unknown }) {
  return (
    <ScrollArea className="h-64 w-full max-w-full rounded-md border bg-background">
      <div className="w-full max-w-full overflow-x-auto p-4">
        <pre className="w-max min-w-full whitespace-pre text-sm">{jsonText(value)}</pre>
      </div>
    </ScrollArea>
  );
}

export function RunOutputTab({ tab }: RunOutputTabProps) {
  const [envOpen, setEnvOpen] = useState(false);
  const txHash = getTxHash(tab);
  const txFound = Boolean(tab.transactionRaw);
  const txPending = Boolean(txHash && !txFound && tab.status === "loading");
  const abiItem = tab.kind === "deploy-run" ? tab.env?.deployMethodAbiItem : tab.env?.buildMethodAbiItem;
  const deployAbi = getDeployAbi(tab.raw);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tab.status ? <Badge>{formatStatus(tab.status)}</Badge> : null}
          {tab.targetFile ? <Badge variant="outline">{tab.targetFile}</Badge> : null}
          {txHash ? (
            <Badge variant="outline">
              {txFound ? <CheckCircle2 aria-label="Transaction found" className="mr-1 inline h-3 w-3" /> : null}
              {txPending ? <Loader2 aria-label="Transaction lookup pending" className="mr-1 inline h-3 w-3 animate-spin" /> : null}
              {txHash}
            </Badge>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEnvOpen(true)}>
          <Info className="h-4 w-4" />
          Env
        </Button>
      </div>

      {tab.error ? <p className="rounded-md border border-destructive bg-background p-3 text-sm text-destructive">{tab.error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Raw Output"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(jsonText(tab.raw))}>
              <Copy className="h-4 w-4" />
              Copy Raw
            </Button>
          }
        >
          <JsonScroll value={tab.raw} />
        </Section>

        <Section
          title="ABI Item"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(jsonText(abiItem))}>
              <Copy className="h-4 w-4" />
              Copy ABI
            </Button>
          }
        >
          <JsonScroll value={abiItem} />
        </Section>
      </div>

      {tab.transactionRaw ? (
        <Section title="Transaction Details">
          <JsonScroll value={tab.transactionRaw} />
        </Section>
      ) : null}

      {deployAbi ? (
        <Section
          title="Deploy ABI"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(jsonText(deployAbi))}>
              <Copy className="h-4 w-4" />
              Copy Deploy ABI
            </Button>
          }
        >
          <JsonScroll value={deployAbi} />
        </Section>
      ) : null}

      <Dialog open={envOpen} onOpenChange={setEnvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Environment</DialogTitle>
          </DialogHeader>
          <JsonScroll value={tab.env} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
