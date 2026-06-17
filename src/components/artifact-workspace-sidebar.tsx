import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ArtifactSource, ArtifactWorkspace } from "@/types/artifact-workspace";
import { formatArtifactReference, parseArtifactReference } from "@/utils/artifact-workspace-utils";

type EditingTarget =
  | { kind: "workspace-host"; workspaceId: string }
  | { kind: "artifact-reference"; workspaceId: string; artifactId: string };

type ArtifactWorkspaceSidebarProps = {
  workspaces: ArtifactWorkspace[];
  selectedWorkspaceId: string;
  selectedArtifactId: string;
  onSelectSource: (workspace: ArtifactWorkspace, artifact: ArtifactSource) => void;
  onAddWorkspace: () => ArtifactWorkspace;
  onAddArtifact: (workspaceId: string) => ArtifactSource | null;
  onWorkspaceHostChange: (workspaceId: string, value: string) => void;
  onRemoveWorkspace: (workspaceId: string) => void;
  onArtifactReferenceChange: (workspaceId: string, artifactId: string, value: Pick<ArtifactSource, "repository" | "reference">) => void;
  onRemoveArtifact: (workspaceId: string, artifactId: string) => void;
};

function isEditing(editing: EditingTarget | null, target: EditingTarget) {
  return JSON.stringify(editing) === JSON.stringify(target);
}

function IconAction({
  label,
  children,
  visible,
  tone = "edit",
  onClick
}: {
  label: string;
  children: ReactNode;
  visible: boolean;
  tone?: "edit" | "delete";
  onClick: () => void;
}) {
  const toneClass = tone === "delete" ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-foreground";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={`h-4 w-4 [&_svg]:size-4! transition-opacity hover:bg-transparent ${toneClass} ${visible ? "opacity-100" : "opacity-0"}`}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function InlineEdit({
  value,
  ariaLabel,
  onCommit,
  onCancel
}: {
  value: string;
  ariaLabel: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Input
        ref={inputRef}
        autoFocus
        aria-label={ariaLabel}
        className="h-6 w-full border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
        value={draft}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit(draft);
          }
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      />
      <Button type="button" variant="ghost" size="icon" aria-label="Save" className="h-5 w-5 text-success hover:bg-transparent hover:text-success" onClick={() => onCommit(draft)}>
        <Check />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Cancel" className="h-5 w-5 text-destructive hover:bg-transparent hover:text-destructive" onClick={onCancel}>
        <X />
      </Button>
    </div>
  );
}

export function ArtifactWorkspaceSidebar({
  workspaces,
  selectedWorkspaceId,
  selectedArtifactId,
  onSelectSource,
  onAddWorkspace,
  onAddArtifact,
  onWorkspaceHostChange,
  onRemoveWorkspace,
  onArtifactReferenceChange,
  onRemoveArtifact
}: ArtifactWorkspaceSidebarProps) {
  const [collapsedWorkspaceIds, setCollapsedWorkspaceIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [hoverTarget, setHoverTarget] = useState("");

  const toggleWorkspace = (workspaceId: string) => {
    setCollapsedWorkspaceIds((current) => {
      const next = new Set(current);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const stopEditing = () => setEditing(null);
  const workspaceHover = (workspaceId: string) => `workspace:${workspaceId}`;
  const artifactHover = (workspaceId: string, artifactId: string) => `artifact:${workspaceId}:${artifactId}`;
  const expandWorkspace = (workspaceId: string) => {
    setCollapsedWorkspaceIds((current) => {
      const next = new Set(current);
      next.delete(workspaceId);
      return next;
    });
  };
  const addWorkspace = () => {
    const workspace = onAddWorkspace();
    expandWorkspace(workspace.id);
    setEditing({ kind: "workspace-host", workspaceId: workspace.id });
  };
  const addArtifact = (workspaceId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) {
      return;
    }

    expandWorkspace(workspace.id);

    const artifact = onAddArtifact(workspace.id);
    if (artifact) {
      setEditing({ kind: "artifact-reference", workspaceId: workspace.id, artifactId: artifact.id });
    }
  };

  return (
    <TooltipProvider>
      <aside className="flex w-artifact-sidebar shrink-0 flex-col overflow-auto p-4">
        <div className="mb-1 flex h-7 items-center justify-between px-2">
          <h2 className="text-sm font-semibold">Artifacts</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Add workspace"
                className="h-5 w-5 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={addWorkspace}
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add workspace</TooltipContent>
          </Tooltip>
        </div>
        {workspaces.map((workspace) => {
          const collapsed = collapsedWorkspaceIds.has(workspace.id);
          const workspaceTarget: EditingTarget = { kind: "workspace-host", workspaceId: workspace.id };
          const workspaceEditing = isEditing(editing, workspaceTarget);
          const workspaceVisible = hoverTarget === workspaceHover(workspace.id);

          return (
            <div key={workspace.id}>
              <div
                className={workspaceEditing ? "flex h-7 min-w-0 items-center rounded-sm bg-accent px-1" : "flex h-7 min-w-0 items-center rounded-sm px-1 hover:bg-accent/50"}
                onMouseEnter={() => setHoverTarget(workspaceHover(workspace.id))}
                onMouseLeave={() => setHoverTarget("")}
                onFocus={() => setHoverTarget(workspaceHover(workspace.id))}
                onBlur={() => setHoverTarget("")}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={collapsed ? "Expand workspace" : "Collapse workspace"}
                  className="h-5 w-5 shrink-0 rounded-sm hover:bg-transparent"
                  onClick={() => toggleWorkspace(workspace.id)}
                >
                  {collapsed ? <ChevronRight /> : <ChevronDown />}
                </Button>
                {workspaceEditing ? (
                  <InlineEdit
                    value={workspace.rpcEndpoint}
                    ariaLabel="Workspace node host"
                    onCommit={(value) => {
                      onWorkspaceHostChange(workspace.id, value);
                      stopEditing();
                    }}
                    onCancel={stopEditing}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start px-1 py-0 text-left text-sm font-normal leading-normal hover:bg-transparent"
                    onClick={() => toggleWorkspace(workspace.id)}
                  >
                    <span className="block min-w-0 truncate">{workspace.rpcEndpoint}</span>
                  </Button>
                )}
                {!workspaceEditing ? (
                  <div className={workspaceVisible ? "flex shrink-0 items-center gap-1" : "flex w-0 shrink-0 items-center gap-1 overflow-hidden"}>
                    <IconAction label="Add repository" visible={workspaceVisible} onClick={() => addArtifact(workspace.id)}>
                      <Plus />
                    </IconAction>
                    <IconAction label="Edit node host" visible={workspaceVisible} onClick={() => setEditing(workspaceTarget)}>
                      <Pencil strokeWidth={2} />
                    </IconAction>
                    <IconAction label="Remove workspace" visible={workspaceVisible} tone="delete" onClick={() => onRemoveWorkspace(workspace.id)}>
                      <Trash2 strokeWidth={2} />
                    </IconAction>
                  </div>
                ) : null}
              </div>

              {!collapsed ? (
                <div className="ml-5">
                  {workspace.artifacts.map((artifact) => {
                    const selected = workspace.id === selectedWorkspaceId && artifact.id === selectedArtifactId;
                    const artifactTarget: EditingTarget = { kind: "artifact-reference", workspaceId: workspace.id, artifactId: artifact.id };
                    const artifactEditing = isEditing(editing, artifactTarget);
                    const artifactVisible = hoverTarget === artifactHover(workspace.id, artifact.id);

                    return (
                      <div
                        key={artifact.id}
                        className={selected || artifactEditing ? "flex h-7 items-center rounded-sm bg-accent px-2" : "flex h-7 items-center rounded-sm px-2 hover:bg-accent/50"}
                        onMouseEnter={() => setHoverTarget(artifactHover(workspace.id, artifact.id))}
                        onMouseLeave={() => setHoverTarget("")}
                        onFocus={() => setHoverTarget(artifactHover(workspace.id, artifact.id))}
                        onBlur={() => setHoverTarget("")}
                      >
                        {artifactEditing ? (
                          <InlineEdit
                            value={formatArtifactReference(artifact)}
                            ariaLabel="Artifact reference"
                            onCommit={(value) => {
                              onArtifactReferenceChange(workspace.id, artifact.id, parseArtifactReference(value, artifact));
                              stopEditing();
                            }}
                            onCancel={stopEditing}
                          />
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto min-w-0 flex-1 justify-start px-0 py-0 text-left text-sm font-normal leading-normal hover:bg-transparent"
                            onClick={() => onSelectSource(workspace, artifact)}
                          >
                            <span className="block min-w-0 truncate">{formatArtifactReference(artifact)}</span>
                          </Button>
                        )}
                        {!artifactEditing ? (
                          <div className={artifactVisible ? "flex shrink-0 items-center gap-1" : "flex w-0 shrink-0 items-center gap-1 overflow-hidden"}>
                            <IconAction label="Edit artifact reference" visible={artifactVisible} onClick={() => setEditing(artifactTarget)}>
                              <Pencil strokeWidth={2} />
                            </IconAction>
                            <IconAction label="Remove artifact" visible={artifactVisible} tone="delete" onClick={() => onRemoveArtifact(workspace.id, artifact.id)}>
                              <Trash2 strokeWidth={2} />
                            </IconAction>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
