import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { ProjectTomlFile, UploadedProject } from "@/types/deploy";
import type { AbiParameter } from "viem";
import { ProjectTree } from "@/components/project-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analyzeArtifactFiles, type UploadedArtifactBundle } from "@/utils/lyquid-deployment-artifact";
import { analyzeProjectFiles } from "@/utils/file-utils";

type UploadStepProps = {
  project: UploadedProject | null;
  onUpload: (project: UploadedProject) => void;
  onContinue?: () => void;
  actions?: ReactNode;
};

type ArtifactUploadStepProps = {
  project: UploadedArtifactBundle | null;
  onUpload: (project: UploadedArtifactBundle) => void;
  constructorValues?: Record<string, string>;
  onConstructorValuesChange?: (values: Record<string, string>) => void;
  actions?: ReactNode;
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

function getFieldName(field: AbiParameter, index: number) {
  return "name" in field && typeof field.name === "string" && field.name.length > 0 ? field.name : `arg${index}`;
}

export function UploadStep({ project, onUpload, onContinue, actions }: UploadStepProps) {
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
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="project-folder">Project folder</Label>
        <p className="text-sm text-muted-foreground">
          Choose a target Lyquid project folder. Cloud Deploy scans paths and TOML files, then uses your selected TOML as the build target.
        </p>
        <Input
          id="project-folder"
          type="file"
          multiple
          className="w-full"
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
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col rounded-md border bg-card p-4">
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
            <div className="mt-4 max-h-80 overflow-auto rounded-md border p-2">
              <ProjectTree
                key={`${project.rootName}:${project.metadata.fileCount}:${project.metadata.totalSize}:${sourceOnly}`}
                nodes={project.tree}
                selectedTomlPath={project.selectedTomlPath}
                sourceOnly={sourceOnly}
                onSelectPath={handleSelectPath}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-md border bg-card p-4">
            {selectedToml ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{selectedToml.path}</p>
                  <p className="text-sm text-muted-foreground">Readonly TOML preview. This file will be used as the build target.</p>
                </div>
                <Textarea value={selectedToml.content} readOnly rows={14} className="font-mono w-full" />
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

      {actions ?? (
        <div className="flex justify-end">
          <Button type="button" disabled={!project?.selectedTomlPath} onClick={onContinue}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

export function ArtifactUploadStep({ project, onUpload, constructorValues = {}, onConstructorValuesChange, actions }: ArtifactUploadStepProps) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [artifactOnly, setArtifactOnly] = useState(false);
  const activePreviewPath = previewPath ?? project?.selectedArtifactPath ?? null;
  const selectedArtifact = project?.artifactFiles.find((file) => file.path === activePreviewPath);
  const selectedFile = project?.files.find((file) => ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name) === activePreviewPath);
  const contractAbi = selectedArtifact?.artifact.contractAbi ? JSON.stringify(selectedArtifact.artifact.contractAbi, null, 2) : "";

  const handleSelectPath = (path: string) => {
    setPreviewPath(path);
    if (project?.artifactFiles.some((file) => file.path === path)) {
      onUpload({ ...project, selectedArtifactPath: path });
    }
  };

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="artifact-folder">Build artifact folder</Label>
        <p className="text-sm text-muted-foreground">
          Choose a folder containing a Lyquid deployment artifact JSON. Cloud Deploy uses that artifact to request a wallet-signed contract creation transaction.
        </p>
        <Input
          id="artifact-folder"
          type="file"
          multiple
          className="w-full"
          {...directoryInputProps}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              const nextProject = await analyzeArtifactFiles(files);
              setPreviewPath(null);
              setArtifactOnly(false);
              onUpload(nextProject);
            }
          }}
        />
      </div>

      {project ? (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{project.rootName}</p>
                <Badge variant="outline">{project.artifactFiles.length} artifact JSON</Badge>
              </div>
              <Button type="button" variant={artifactOnly ? "secondary" : "outline"} size="sm" onClick={() => setArtifactOnly((value) => !value)}>
                Artifact JSON only
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.metadata.fileCount} file(s), {project.metadata.totalSize} bytes
            </p>
            <div className="mt-4 max-h-80 overflow-auto rounded-md border p-2">
              <ProjectTree
                key={`${project.rootName}:${project.metadata.fileCount}:${project.metadata.totalSize}:${artifactOnly}`}
                nodes={project.tree}
                selectedTomlPath={project.selectedArtifactPath}
                sourceOnly={artifactOnly}
                onSelectPath={handleSelectPath}
                targetFileExtension=".json"
                targetLabel="deployment artifact"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col rounded-md border bg-card p-4">
            {selectedArtifact ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">{selectedArtifact.path}</p>
                  <p className="text-sm text-muted-foreground">Readonly deployment artifact preview. This file will be used for deploy.</p>
                </div>
                <Textarea value={selectedArtifact.content} readOnly rows={14} className="font-mono w-full" />
                {contractAbi ? (
                  <div className="space-y-2">
                    <Label htmlFor="legacy-contract-abi">Contract ABI</Label>
                    <Textarea id="legacy-contract-abi" value={contractAbi} readOnly rows={8} className="font-mono w-full" />
                  </div>
                ) : null}
                {selectedArtifact.artifact.constructorParameters.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-medium">Constructor</p>
                    {selectedArtifact.artifact.constructorParameters.map((field, index) => {
                      const name = getFieldName(field, index);

                      return (
                        <div key={`${name}:${field.type}`} className="space-y-1">
                          <Label htmlFor={`legacy-constructor-${name}`}>{name}</Label>
                          <Input
                            id={`legacy-constructor-${name}`}
                            value={constructorValues[name] ?? ""}
                            placeholder={field.type}
                            onChange={(event) => onConstructorValuesChange?.({ ...constructorValues, [name]: event.target.value })}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : selectedFile ? (
              <div className="space-y-2">
                <p className="font-medium">{activePreviewPath}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.size} bytes. Only artifact descriptor JSON files are previewed.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium">Select an artifact JSON</p>
                <p className="text-sm text-muted-foreground">Click an artifact JSON in the tree to preview it and choose the deployment target.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {actions}
    </div>
  );
}
