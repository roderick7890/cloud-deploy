import {
  buildLyquidDeploymentTransaction,
  parseLyquidDeploymentArtifact,
  type BuildLyquidDeploymentTransactionInput,
  type LyquidDeploymentArtifact,
  type LyquidDeploymentTransaction
} from "lyquor-sdk/oci";
import type { ProjectMetadata, ProjectTreeNode } from "@/types/deploy";

export {
  buildLyquidDeploymentTransaction,
  parseLyquidDeploymentArtifact,
  type BuildLyquidDeploymentTransactionInput,
  type LyquidDeploymentArtifact,
  type LyquidDeploymentTransaction
};

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

export type ArtifactDescriptorFile = {
  name: string;
  path: string;
  content: string;
  size: number;
  artifact: LyquidDeploymentArtifact;
};

export type UploadedArtifactBundle = {
  metadata: ProjectMetadata;
  files: File[];
  rootName: string;
  tree: ProjectTreeNode[];
  artifactFiles: ArtifactDescriptorFile[];
  selectedArtifactPath: string;
};

function getArtifactPath(file: File) {
  return ((file as FileWithRelativePath).webkitRelativePath || file.name).replace(/^\/+/, "");
}

function getRootName(files: File[]) {
  const firstFile = files[0];

  if (!firstFile) {
    return "Untitled artifact";
  }

  const [rootName] = getArtifactPath(firstFile).split("/");
  return rootName || firstFile.name || "Untitled artifact";
}

function sortTree(nodes: ProjectTreeNode[]) {
  nodes.sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "directory" ? -1 : 1;
    }

    return first.name.localeCompare(second.name);
  });

  nodes.forEach((node) => {
    if (node.children) {
      sortTree(node.children);
    }
  });

  return nodes;
}

function addPathToTree(nodes: ProjectTreeNode[], path: string) {
  const parts = path.split("/").filter(Boolean);
  let currentNodes = nodes;
  let currentPath = "";

  parts.forEach((part, index) => {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const type: ProjectTreeNode["type"] = index === parts.length - 1 ? "file" : "directory";
    let node = currentNodes.find((item) => item.name === part && item.path === currentPath);

    if (!node) {
      node = {
        name: part,
        path: currentPath,
        type,
        children: type === "directory" ? [] : undefined
      };
      currentNodes.push(node);
    }

    if (node.type === "directory") {
      currentNodes = node.children ?? [];
    }
  });
}

export async function analyzeArtifactFiles(files: File[]): Promise<UploadedArtifactBundle> {
  if (files.length === 0) {
    throw new Error("No files were found in the upload.");
  }

  const tree: ProjectTreeNode[] = [];
  const rootName = getRootName(files);
  const artifactFiles: ArtifactDescriptorFile[] = [];

  files.forEach((file) => addPathToTree(tree, getArtifactPath(file)));

  for (const file of files) {
    const path = getArtifactPath(file);

    if (!path.endsWith(".json")) {
      continue;
    }

    const content = await file.text();

    try {
      const artifact = parseLyquidDeploymentArtifact(JSON.parse(content));
      artifactFiles.push({
        name: file.name,
        path,
        content,
        size: file.size,
        artifact
      });
    } catch {
      // Other JSON files can live in a build folder.
    }
  }

  if (artifactFiles.length === 0) {
    throw new Error("No Lyquid deployment artifact descriptor JSON was found.");
  }

  return {
    metadata: {
      name: rootName,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    },
    files,
    rootName,
    tree: sortTree(tree),
    artifactFiles,
    selectedArtifactPath: artifactFiles.length === 1 ? artifactFiles[0].path : ""
  };
}
