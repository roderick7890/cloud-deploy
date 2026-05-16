import { useState, type InputHTMLAttributes } from "react";
import { ArrowLeftRight, Filter, FolderUp } from "lucide-react";
import { ProjectTree } from "@/components/project-tree";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UploadedProject } from "@/types/deploy";
import { analyzeProjectFiles } from "@/utils/file-utils";
import { cn } from "@/lib/utils";

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
    <Label htmlFor={id} className={cn("relative overflow-hidden", className)}>
      <Input
        id={id}
        aria-label={label}
        type="file"
        multiple
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        {...directoryInputProps}
        onChange={(event) => onFiles(Array.from(event.target.files ?? []))}
      />
      <span className="pointer-events-none contents">{children}</span>
    </Label>
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
            <div className=" w-full">
              <div className="flex items-center justify-between">
                <p className="truncate font-medium">{project.rootName}</p>

                <div className="flex items-center">
                  <FolderInput
                    id="workbench-change-folder"
                    label="Change folder"
                    onFiles={(files) => void handleFiles(files)}
                    className="inline-flex w-fit h-fit p-1 cursor-pointer items-center justify-center rounded-md hover:text-accent "
                  >
                    <ArrowLeftRight className="size-4" />
                  </FolderInput>
                  <Button
                    className={cn("w-fit h-fit p-1 !bg-transparent hover:text-accent", tomlOnly ? "text-accent" : "")}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Toml only"
                    onClick={() => setTomlOnly((value) => !value)}
                  >
                    <Filter className="size-2.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {project.metadata.fileCount} file(s), {project.metadata.totalSize} bytes, {project.tomlFiles.length} TOML included
              </p>
            </div>
          </div>
          <div className="h-full flex-1 overflow-auto rounded-md">
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
          </div>
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
