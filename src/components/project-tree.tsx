import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, FileText, Folder } from "lucide-react";
import type { ProjectTreeNode } from "@/types/deploy";
import { Button } from "@/components/ui/button";

type ProjectTreeProps = {
  nodes: ProjectTreeNode[];
  selectedTomlPath: string;
  sourceOnly: boolean;
  onSelectPath: (path: string) => void;
  onSelectTarget?: (path: string) => void;
  showTargetSelector?: boolean;
  fileActionLabel?: "Open" | "Select";
  targetFileExtension?: string;
  targetLabel?: string;
};

function isBuildTargetFile(path: string, extension: string) {
  return path.endsWith(extension);
}

function filterBuildTargetTree(nodes: ProjectTreeNode[], extension: string): ProjectTreeNode[] {
  return nodes.flatMap((node) => {
    if (node.type === "file") {
      return isBuildTargetFile(node.path, extension) ? [node] : [];
    }

    const children = filterBuildTargetTree(node.children ?? [], extension);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

function collectDirectoryPaths(nodes: ProjectTreeNode[], extension: string) {
  const paths = new Set<string>();

  const visit = (node: ProjectTreeNode, forceExpand: boolean) => {
    if (node.type === "file") {
      return node.path.endsWith(extension);
    }

    let hasTomlDescendant = false;
    node.children?.forEach((child) => {
      hasTomlDescendant = visit(child, false) || hasTomlDescendant;
    });

    if (forceExpand || hasTomlDescendant) {
      paths.add(node.path);
    }

    return hasTomlDescendant;
  };

  nodes.forEach((node) => visit(node, true));
  return paths;
}

function collectAllDirectoryPaths(nodes: ProjectTreeNode[]) {
  const paths = new Set<string>();

  const visit = (node: ProjectTreeNode) => {
    if (node.type === "directory") {
      paths.add(node.path);
      node.children?.forEach(visit);
    }
  };

  nodes.forEach(visit);
  return paths;
}

function ProjectTreeNodes({
  nodes,
  expandedPaths,
  selectedTomlPath,
  onTogglePath,
  onSelectPath,
  onSelectTarget,
  showTargetSelector,
  fileActionLabel,
  targetFileExtension,
  targetLabel
}: {
  nodes: ProjectTreeNode[];
  expandedPaths: Set<string>;
  selectedTomlPath: string;
  onTogglePath: (path: string) => void;
  onSelectPath: (path: string) => void;
  onSelectTarget: (path: string) => void;
  showTargetSelector: boolean;
  fileActionLabel: "Open" | "Select";
  targetFileExtension: string;
  targetLabel: string;
}) {
  return (
    <div className="space-y-1 h-full">
      {nodes.map((node) => {
        if (node.type === "directory") {
          const isExpanded = expandedPaths.has(node.path);

          return (
            <div key={node.path} className="space-y-1 h-full">
              <Button
                type="button"
                variant="ghost"
                className="h-7 w-full justify-start gap-2 px-2 text-left font-medium text-muted-foreground"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.path}`}
                onClick={() => onTogglePath(node.path)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Folder className="h-4 w-4" />
                <span className="truncate">{node.name}</span>
              </Button>
              {isExpanded && node.children && node.children.length > 0 ? (
                <div className="ml-4 border-l pl-3">
                  <ProjectTreeNodes
                    nodes={node.children}
                    expandedPaths={expandedPaths}
                    selectedTomlPath={selectedTomlPath}
                    onTogglePath={onTogglePath}
                    onSelectPath={onSelectPath}
                    onSelectTarget={onSelectTarget}
                    showTargetSelector={showTargetSelector}
                    fileActionLabel={fileActionLabel}
                    targetFileExtension={targetFileExtension}
                    targetLabel={targetLabel}
                  />
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div key={node.path} className="flex items-center gap-2">
            {showTargetSelector && node.name.endsWith(targetFileExtension) ? (
              <input
                type="radio"
                name="workbench-target"
                className="h-4 w-4 accent-primary"
                aria-label={`Use ${node.path} as ${targetLabel}`}
                checked={selectedTomlPath === node.path}
                onChange={() => onSelectTarget(node.path)}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1 text-left"
              aria-label={`${fileActionLabel} ${node.path}`}
              onClick={() => {
                onSelectPath(node.path);
                if (showTargetSelector && node.name.endsWith(targetFileExtension)) {
                  onSelectTarget(node.path);
                }
              }}
            >
              {node.name.endsWith(".toml") || node.name.endsWith(".json") ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
              <span className="truncate">{node.name}</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectTree({
  nodes,
  selectedTomlPath,
  sourceOnly,
  onSelectPath,
  onSelectTarget = onSelectPath,
  showTargetSelector = false,
  fileActionLabel = "Select",
  targetFileExtension = ".toml",
  targetLabel = "deploy target"
}: ProjectTreeProps) {
  const visibleNodes = useMemo(() => (sourceOnly ? filterBuildTargetTree(nodes, targetFileExtension) : nodes), [nodes, sourceOnly, targetFileExtension]);
  const [expandedPaths, setExpandedPaths] = useState(() =>
    sourceOnly ? collectAllDirectoryPaths(filterBuildTargetTree(nodes, targetFileExtension)) : collectDirectoryPaths(nodes, targetFileExtension)
  );

  const handleTogglePath = (path: string) => {
    setExpandedPaths((currentPaths) => {
      const nextPaths = new Set(currentPaths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  };

  return (
    <div className="space-y-1 h-full">
      <ProjectTreeNodes
        nodes={visibleNodes}
        expandedPaths={expandedPaths}
        selectedTomlPath={selectedTomlPath}
        onTogglePath={handleTogglePath}
        onSelectPath={onSelectPath}
        onSelectTarget={onSelectTarget}
        showTargetSelector={showTargetSelector}
        fileActionLabel={fileActionLabel}
        targetFileExtension={targetFileExtension}
        targetLabel={targetLabel}
      />
    </div>
  );
}
