import type { ProjectMetadata, ProjectTomlFile, ProjectTreeNode, UploadedProject } from "@/types/deploy";

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

export function getProjectMetadata(files: File[]): ProjectMetadata {
  const firstFile = files[0];

  return {
    name: firstFile?.name ?? "Untitled project",
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0)
  };
}

export async function readProjectArchive(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

function getProjectPath(file: File) {
  return ((file as FileWithRelativePath).webkitRelativePath || file.name).replace(/^\/+/, "");
}

function getRootName(files: File[]) {
  const firstFile = files[0];
  if (!firstFile) {
    return "Untitled project";
  }

  const firstPath = getProjectPath(firstFile);
  const [rootName] = firstPath.split("/");
  return rootName || firstFile.name || "Untitled project";
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

async function readTomlFiles(files: File[]): Promise<ProjectTomlFile[]> {
  const tomlFiles = files.filter((file) => getProjectPath(file).endsWith(".toml"));
  return Promise.all(
    tomlFiles.map(async (file) => {
      const path = getProjectPath(file);
      return {
        path,
        name: file.name,
        content: await file.text(),
        size: file.size
      };
    })
  );
}

export async function analyzeProjectFiles(files: File[]): Promise<UploadedProject> {
  const tree: ProjectTreeNode[] = [];
  const rootName = getRootName(files);
  files.forEach((file) => addPathToTree(tree, getProjectPath(file)));

  return {
    metadata: {
      ...getProjectMetadata(files),
      name: rootName
    },
    files,
    rootName,
    tree: sortTree(tree),
    tomlFiles: await readTomlFiles(files),
    selectedTomlPath: ""
  };
}
