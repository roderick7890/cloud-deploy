import type { DeployResult } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatStatus, shortHash } from "@/utils/format-utils";

type ResultSummaryProps = {
  result: DeployResult | null;
};

export function ResultSummary({ result }: ResultSummaryProps) {
  if (!result) {
    return <p className="text-sm text-muted-foreground">No deployment result yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{formatStatus(result.status)}</Badge>
        {result.transactionHash ? <Badge variant="outline">{shortHash(result.transactionHash)}</Badge> : null}
        {result.lyquidId ? <Badge variant="outline">{result.lyquidId}</Badge> : null}
        {result.signedPayloadHash ? <Badge variant="outline">{shortHash(result.signedPayloadHash)}</Badge> : null}
      </div>
      <ScrollArea className="h-48 w-full max-w-full rounded-md border bg-card">
        <div data-json-scroll-content="true" className="w-full max-w-full overflow-x-auto p-4">
          <pre className="w-max min-w-full whitespace-pre text-sm">{JSON.stringify(result.raw, null, 2)}</pre>
        </div>
      </ScrollArea>
    </div>
  );
}
