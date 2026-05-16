import { Clock3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeployHistoryRecord } from "@/types/workbench";
import { shortHash } from "@/utils/format-utils";

type DeployHistoryPanelProps = {
  records: DeployHistoryRecord[];
  onOpenRecord: (record: DeployHistoryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
};

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function DeployHistoryPanel({ records, onOpenRecord, onDeleteRecord }: DeployHistoryPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div>
        <h2 className="font-medium">Latest 10 deploys</h2>
      </div>

      {records.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <p>No deploy history yet.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <div className="space-y-2">
            {records.map((record) => (
              <div key={record.id} className="flex items-center gap-2 rounded-md">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-w-0 flex-1 justify-start p-1 text-left"
                  aria-label={`Open deploy history ${record.txHash}`}
                  onClick={() => onOpenRecord(record)}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{shortHash(record.txHash)}</span>
                    </div>
                    {/* <p className="truncate text-sm font-medium">{record.targetFile}</p> */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      <span>{formatTimestamp(record.timestamp)}</span>
                    </div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete deploy history ${record.txHash}`}
                  onClick={() => onDeleteRecord(record.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
