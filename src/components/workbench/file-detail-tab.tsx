import type { ProjectTomlFile } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type FileDetailTabProps = {
  path: string;
  files: File[];
  tomlFiles: ProjectTomlFile[];
};

function getFilePath(file: File) {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/^\/+/, "");
}

export function FileDetailTab({ path, files, tomlFiles }: FileDetailTabProps) {
  const tomlFile = tomlFiles.find((file) => file.path === path);
  const file = files.find((item) => getFilePath(item) === path);

  if (tomlFile) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{tomlFile.path}</h2>
          <Badge variant="outline">TOML</Badge>
        </div>
        <Textarea value={tomlFile.content} readOnly className="min-h-96 font-mono" />
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
