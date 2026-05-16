import { useState, type InputHTMLAttributes } from "react";
import { FolderUp } from "lucide-react";
import { ProjectTree } from "@/components/project-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UploadedProject } from "@/types/deploy";
import { analyzeProjectFiles } from "@/utils/file-utils";

type ResourceExplorerProps = {
  project: UploadedProject | null;
  selectedTomlPath: string;
  onProjectChange: (project: UploadedProject) => void;
  onSelectTarget: (path: string) => void;
  onOpenFile: (path: string) => void;
};

const directoryInputProps = {
  webkitdirectory: "",
  directory: ""
} as InputHTMLAttributes<HTMLInputElement>;

export function ResourceExplorer({ project, selectedTomlPath, onProjectChange, onSelectTarget, onOpenFile }: ResourceExplorerProps) {
  const [tomlOnly, setTomlOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    try {
      const nextProject = await analyzeProjectFiles(files);
      setTomlOnly(false);
      onProjectChange(nextProject);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse project files.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="space-y-2">
        <Label htmlFor="workbench-project-folder">Project folder</Label>
        <Input
          id="workbench-project-folder"
          type="file"
          multiple
          {...directoryInputProps}
          onChange={(event) => {
            void handleFiles(Array.from(event.target.files ?? []));
          }}
        />
      </div>

      {project ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{project.rootName}</p>
              <p className="text-sm text-muted-foreground">
                {project.metadata.fileCount} file(s), {project.metadata.totalSize} bytes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{project.tomlFiles.length} TOML</Badge>
              <Button type="button" variant={tomlOnly ? "secondary" : "outline"} size="sm" onClick={() => setTomlOnly((value) => !value)}>
                Toml only
              </Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 rounded-md border p-2">
            <ProjectTree
              key={`${project.rootName}:${project.metadata.fileCount}:${project.metadata.totalSize}:${tomlOnly}`}
              nodes={project.tree}
              selectedTomlPath={selectedTomlPath}
              sourceOnly={tomlOnly}
              onSelectPath={onOpenFile}
              onSelectTarget={onSelectTarget}
              showTargetSelector
              fileActionLabel="Open"
            />
          </ScrollArea>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <FolderUp className="h-8 w-8" />
          <p>Drop a folder here or choose one above.</p>
        </div>
      )}

      <Dialog open={Boolean(errorMessage)} onOpenChange={(open) => (!open ? setErrorMessage(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Failed to parse upload</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
