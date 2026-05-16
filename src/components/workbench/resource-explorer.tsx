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

function FolderInput({
  id,
  label,
  onFiles,
  className,
  children
}: {
  id: string;
  label: string;
  onFiles: (files: File[]) => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Input
        id={id}
        aria-label={label}
        type="file"
        multiple
        className="sr-only"
        {...directoryInputProps}
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))}
      />
      <Label htmlFor={id} className={className}>
        {children}
      </Label>
    </>
  );
}

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
              <FolderInput
                id="workbench-change-folder"
                label="Change folder"
                onFiles={(files) => void handleFiles(files)}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
              >
                Change folder
              </FolderInput>
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
        <FolderInput
          id="workbench-project-folder"
          label="Drop a folder here or choose one."
          onFiles={(files) => void handleFiles(files)}
          className="flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <FolderUp className="h-8 w-8" />
          <span>Drop a folder here or choose one.</span>
        </FolderInput>
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
