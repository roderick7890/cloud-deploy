import type { ProjectMetadata } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProjectMetadata } from "@/utils/file-utils";

type UploadStepProps = {
  metadata: ProjectMetadata | null;
  onUpload: (project: { metadata: ProjectMetadata; files: File[] }) => void;
  onContinue: () => void;
};

export function UploadStep({ metadata, onUpload, onContinue }: UploadStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="project-archive">Project archive</Label>
        <Input
          id="project-archive"
          type="file"
          accept=".zip"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              onUpload({ metadata: getProjectMetadata(files), files });
            }
          }}
        />
      </div>
      {metadata ? (
        <div className="rounded-md border bg-card p-4">
          <p className="font-medium">{metadata.name}</p>
          <p className="text-sm text-muted-foreground">
            {metadata.fileCount} file(s), {metadata.totalSize} bytes
          </p>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!metadata} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
