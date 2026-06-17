import type { DeploymentHashes } from "@/types/deploy";

type PayloadReviewPanelProps = {
  hashes: DeploymentHashes;
  payload: unknown;
  onCopy: () => void;
  onDownload: () => void;
};

const hashLabels: Array<[keyof DeploymentHashes, string]> = [
  ["sourceHash", "sourceHash"],
  ["artifactHash", "artifactHash"],
  ["constructorInputHash", "constructorInputHash"],
  ["signedPayloadHash", "signedPayloadHash"]
];

export function PayloadReviewPanel({ hashes, payload, onCopy, onDownload }: PayloadReviewPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {hashLabels
          .filter(([key]) => hashes[key])
          .map(([key, label]) => (
            // <div key={key} className="min-w-0 flex-1 basis-72 rounded-md border bg-card p-3">
            //   <p className="text-caption text-muted-foreground">{label}</p>
            //   <p className="font-mono text-sm">{shortHash(hashes[key])}</p>
            // </div>

            <div key={key} className="flex flex-col flex-1">
              <p className="font-medium text-sm text-muted-foreground/80 mb-1">{label}</p>
              <p className="">{(hashes[key])}</p>
            </div>
          ))}
      </div>
      <div className="max-h-64 w-full max-w-full overflow-auto rounded-md border bg-card">
        <div data-json-scroll-content="true" className="w-full max-w-full p-4">
          <pre className="w-max min-w-full whitespace-pre text-sm">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
      {/* <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCopy}>
          Copy JSON
        </Button>
        <Button type="button" onClick={onDownload}>
          Download JSON
        </Button>
      </div> */}
    </div>
  );
}
