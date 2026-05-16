import type { ReviewPayload } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { PayloadReviewPanel } from "@/components/shared/payload-review-panel";

type ReviewStepProps = {
  reviewPayload: ReviewPayload | null;
  onCopy: () => void;
  onDownload: () => void;
  onContinue: () => void;
};

export function ReviewStep({ reviewPayload, onCopy, onDownload, onContinue }: ReviewStepProps) {
  if (!reviewPayload) {
    return <p className="text-sm text-muted-foreground">Build output is required before review.</p>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PayloadReviewPanel hashes={reviewPayload.hashes} payload={reviewPayload.payload} onCopy={onCopy} onDownload={onDownload} />
      <div className="flex justify-end">
        <Button type="button" onClick={onContinue}>
          Proceed to Deploy
        </Button>
      </div>
    </div>
  );
}
