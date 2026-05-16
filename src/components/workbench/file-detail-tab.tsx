import type { ProjectTomlFile } from "@/types/deploy";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

type FileDetailTabProps = {
  path: string;
  files: File[];
  tomlFiles: ProjectTomlFile[];
  onDeploy: () => void;
};

function getFilePath(file: File) {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/^\/+/, "");
}

export function FileDetailTab({ path, files, tomlFiles, onDeploy }: FileDetailTabProps) {
  const tomlFile = tomlFiles.find((file) => file.path === path);
  const file = files.find((item) => getFilePath(item) === path);

  if (tomlFile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h2 className="font-medium">{tomlFile.path}</h2>

          <Button type="button" variant="outline" size="sm" onClick={onDeploy} >
            <Rocket className="h-4 w-4" />
            Deploy
          </Button>
        </div>
        <Textarea value={tomlFile.content} readOnly className="min-h-96 font-mono border-none shadow-none" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-medium">{path}</h2>
      <p className="text-sm text-muted-foreground">{file ? `${file.size} bytes.` : "File metadata unavailable."}</p>
      <p className="text-sm text-muted-foreground">Only TOML files are previewed.</p>
    </div>
  );
}
