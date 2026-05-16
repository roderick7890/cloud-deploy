import type { ProjectMetadata } from "@/types/deploy";

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
