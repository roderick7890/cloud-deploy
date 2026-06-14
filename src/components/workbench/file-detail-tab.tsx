import type { ReactNode } from "react";
import { ArrowLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ArtifactDescriptorFile } from "@/utils/lyquid-deployment-artifact";

type FileDetailTabProps = {
  path: string;
  files: File[];
  artifactFiles: ArtifactDescriptorFile[];
  onBack?: () => void;
  onDeploy: () => void;
};

function getFilePath(file: File) {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/^\/+/, "");
}

function PreviewHeader({ title, actions, onBack }: { title: string; actions?: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <h2 className="truncate font-medium">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

export function FileDetailTab({ path, files, artifactFiles, onBack, onDeploy }: FileDetailTabProps) {
  const artifactFile = artifactFiles.find((file) => file.path === path);
  const file = files.find((item) => getFilePath(item) === path);

  if (artifactFile) {
    return (
      <div className="space-y-3">
        <PreviewHeader
          title={artifactFile.path}
          onBack={onBack}
          actions={(
            <Button type="button" variant="outline" size="sm" onClick={onDeploy}>
              <Rocket className="size-4" />
              Deploy
            </Button>
          )}
        />
        <Textarea value={artifactFile.content} readOnly className="min-h-96 w-full font-mono border-none shadow-none" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PreviewHeader title={path} onBack={onBack} />
      <p className="text-sm text-muted-foreground">{file ? `${file.size} bytes.` : "File metadata unavailable."}</p>
      <p className="text-sm text-muted-foreground">Only artifact descriptor JSON files are previewed.</p>
    </div>
  );
}
