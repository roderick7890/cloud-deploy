import { useState, type InputHTMLAttributes } from "react";
import type { ProjectTomlFile, UploadedProject } from "@/types/deploy";
import { ProjectTree } from "@/components/project-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { analyzeProjectFiles } from "@/utils/file-utils";

type UploadStepProps = {
  project: UploadedProject | null;
  onUpload: (project: UploadedProject) => void;
  onContinue: () => void;
};

const directoryInputProps = {
  webkitdirectory: "",
  directory: ""
} as InputHTMLAttributes<HTMLInputElement>;

function findToml(tomlFiles: ProjectTomlFile[], path: string | null) {
  return tomlFiles.find((file) => file.path === path);
}

function findFile(files: File[], path: string | null) {
  return files.find((file) => ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name) === path);
}

export function UploadStep({ project, onUpload, onContinue }: UploadStepProps) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [sourceOnly, setSourceOnly] = useState(false);
  const activePreviewPath = previewPath ?? project?.selectedTomlPath ?? null;
  const selectedToml = findToml(project?.tomlFiles ?? [], activePreviewPath);
  const selectedFile = findFile(project?.files ?? [], activePreviewPath);

  const handleSelectPath = (path: string) => {
    setPreviewPath(path);
    if (project && findToml(project.tomlFiles, path)) {
      onUpload({ ...project, selectedTomlPath: path });
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="project-folder">Project folder</Label>
        <p className="text-sm text-muted-foreground">
          Choose a target Lyquid project folder. Cloud Deploy scans paths and TOML files, then uses your selected TOML as the build target.
        </p>
        <Input
          id="project-folder"
          type="file"
          multiple
          {...directoryInputProps}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              const nextProject = await analyzeProjectFiles(files);
              setPreviewPath(null);
              setSourceOnly(false);
              onUpload(nextProject);
            }
          }}
        />
      </div>

      {project ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{project.rootName}</p>
                <Badge variant="outline">{project.tomlFiles.length} TOML</Badge>
              </div>
              <Button type="button" variant={sourceOnly ? "secondary" : "outline"} size="sm" onClick={() => setSourceOnly((value) => !value)}>
                Source only
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.metadata.fileCount} file(s), {project.metadata.totalSize} bytes
            </p>
            <ScrollArea className="mt-4 h-80 rounded-md border p-2">
              <ProjectTree
                key={`${project.rootName}:${project.metadata.fileCount}:${project.metadata.totalSize}:${sourceOnly}`}
                nodes={project.tree}
                selectedTomlPath={project.selectedTomlPath}
                sourceOnly={sourceOnly}
                onSelectPath={handleSelectPath}
              />
            </ScrollArea>
          </div>

          <div className="rounded-md border bg-card p-4">
            {selectedToml ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{selectedToml.path}</p>
                  <p className="text-sm text-muted-foreground">Readonly TOML preview. This file will be used as the build target.</p>
                </div>
                <Textarea value={selectedToml.content} readOnly className="min-h-80 font-mono" />
              </div>
            ) : selectedFile ? (
              <div className="space-y-2">
                <p className="font-medium">{activePreviewPath}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.size} bytes. Only TOML files are previewed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Select a TOML file</p>
                <p className="text-sm text-muted-foreground">Click a TOML file in the tree to preview it and choose the build target.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" disabled={!project?.selectedTomlPath} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
